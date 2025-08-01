<?php

namespace App\Http\Controllers;

use App\Models\VulnerabilitySubmission;
use App\Models\AuditSubmission;
use App\Models\Vulnerability;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends Controller
{
    /**
     * Get analytics data for vulnerabilities and/or audits.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $timeRange = $request->input('timeRange', 'week');
            $userId = $request->input('userId');
            $type = $request->input('type', 'all');
            $startDateInput = $request->input('startDate');
            $endDateInput = $request->input('endDate');

            $startDate = $this->getStartDate($timeRange, $startDateInput, $endDateInput);

            Log::info('Analytics Request', [
                'timeRange' => $timeRange,
                'userId' => $userId,
                'type' => $type,
                'startDate' => $startDate->toDateTimeString()
            ]);

            // Authorization checks
            if ($userId && !$request->user()->isAdmin() && $userId != $request->user()->id) {
                return response()->json(['message' => 'Unauthorized to access other users\' analytics'], 403);
            }
            // Restrict non-admins from accessing global analytics (no userId)
            // Current logic might be preventing admin access
            if (!$userId && !$request->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized: Non-admin users can only access their own analytics'], 403);
            }

            // Get data based on type
            if ($type === 'vulnerability') {
                $data = $this->getVulnerabilityAnalytics($startDate, $userId);
            } elseif ($type === 'audit') {
                $data = $this->getAuditAnalytics($startDate, $userId);
            } else {
                $data = $this->getCombinedAnalytics($startDate, $userId);
            }

            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('Failed to generate analytics: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to generate analytics.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Calculate start date based on time range or custom dates.
     */
    private function getStartDate(string $timeRange, ?string $startDateInput = null, ?string $endDateInput = null): Carbon
    {
        if ($timeRange === 'custom' && $startDateInput) {
            try {
                $startDate = Carbon::parse($startDateInput);
                if ($endDateInput) {
                    $endDate = Carbon::parse($endDateInput);
                    if ($endDate->isBefore($startDate)) {
                        throw new \Exception('End date must be after start date');
                    }
                }
                return $startDate;
            } catch (\Exception $e) {
                Log::warning('Invalid custom date range', ['error' => $e->getMessage()]);
                return Carbon::now()->subWeek();
            }
        }

        return match($timeRange) {
            'week' => Carbon::now()->subWeek(),
            'year' => Carbon::now()->subYear(),
            'quarter' => Carbon::now()->subMonths(3),
            'month' => Carbon::now()->subMonth(),
            'all' => Carbon::createFromTimestamp(0),
            default => Carbon::now()->subWeek(),
        };
    }

    /**
     * Get vulnerability analytics data.
     */
    private function getVulnerabilityAnalytics(Carbon $startDate, ?int $userId = null): array
    {
        $query = VulnerabilitySubmission::query()
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', (int) $userId);
            })
            ->where('created_at', '>=', $startDate);

        return [
            'type' => 'vulnerability',
            'totalSubmissions' => (int) $query->count(),
            'riskDistribution' => $this->getVulnerabilityRiskDistribution($query->clone()),
            'averageRiskScore' => $this->getAverageRiskScore($query->clone()),
            'statusDistribution' => $this->getStatusDistribution($query->clone()),
            'assignmentStats' => $this->getAssignmentStats($query->clone()),
            'submissionTrends' => $this->getVulnerabilityTrends($query->clone()),
            'commonVulnerabilities' => $this->getCommonVulnerabilities($query->clone()),
            'severityDistribution' => $this->getVulnerabilitySeverityDistribution($query->clone()),
        ];
    }

    /**
     * Get audit analytics data.
     */
    private function getAuditAnalytics(Carbon $startDate, ?int $userId = null): array
    {
        $query = AuditSubmission::query()
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', (int) $userId);
            })
            ->where('created_at', '>=', $startDate);

        return [
            'type' => 'audit',
            'totalSubmissions' => (int) $query->count(),
            'riskDistribution' => $this->getAuditRiskDistribution($query->clone()),
            'averageRiskScore' => $this->getAuditAverageRiskScore($query->clone()),
            'submissionTrends' => $this->getAuditTrends($query->clone()),
            'commonHighRisks' => $this->getCommonHighRiskAudits($query->clone()),
        ];
    }

    /**
     * Get combined vulnerability and audit analytics.
     */
    private function getCombinedAnalytics(Carbon $startDate, ?int $userId = null): array
    {
        $vulnData = $this->getVulnerabilityAnalytics($startDate, $userId);
        $auditData = $this->getAuditAnalytics($startDate, $userId);

        return [
            'type' => 'combined',
            'vulnerability' => $vulnData,
            'audit' => $auditData,
            'summary' => [
                'totalSubmissions' => $vulnData['totalSubmissions'] + $auditData['totalSubmissions'],
                'vulnerabilitySubmissions' => $vulnData['totalSubmissions'],
                'auditSubmissions' => $auditData['totalSubmissions'],
            ]
        ];
    }

    /**
     * Get vulnerability risk distribution.
     */
    private function getVulnerabilityRiskDistribution($query): array
    {
        $distribution = $query->groupBy('risk_level')
            ->select('risk_level', DB::raw('count(*) as count'))
            ->pluck('count', 'risk_level')
            ->toArray();

        return [
            'high' => (int) ($distribution['high'] ?? 0),
            'medium' => (int) ($distribution['medium'] ?? 0),
            'low' => (int) ($distribution['low'] ?? 0)
        ];
    }

    /**
     * Get audit risk distribution.
     */
    private function getAuditRiskDistribution($query): array
    {
        $distribution = $query->groupBy('system_overall_risk')
            ->select('system_overall_risk as risk', DB::raw('count(*) as count'))
            ->pluck('count', 'risk')
            ->toArray();

        return [
            'high' => (int) ($distribution['high'] ?? 0),
            'medium' => (int) ($distribution['medium'] ?? 0),
            'low' => (int) ($distribution['low'] ?? 0)
        ];
    }

    /**
     * Calculate average risk score for vulnerabilities.
     */
    private function getAverageRiskScore($query): float
    {
        return round((float) ($query->avg('risk_score') ?? 0), 1);
    }

    /**
     * Calculate average risk score for audits.
     */
    private function getAuditAverageRiskScore($query): float
    {
        $avg = $query->select(DB::raw("
            AVG(CASE 
                WHEN system_overall_risk = 'high' THEN 3 
                WHEN system_overall_risk = 'medium' THEN 2 
                WHEN system_overall_risk = 'low' THEN 1 
                ELSE 0
            END) as avg_score
        "))->first()->avg_score;

        return round((float) ($avg ?? 0), 1);
    }

    /**
     * Get status distribution for vulnerabilities.
     */
    private function getStatusDistribution($query): array
    {
        $distribution = $query->groupBy('status')
            ->select('status', DB::raw('count(*) as count'))
            ->pluck('count', 'status')
            ->toArray();

        return [
            'open' => (int) ($distribution['open'] ?? 0),
            'in_progress' => (int) ($distribution['in_progress'] ?? 0),
            'resolved' => (int) ($distribution['resolved'] ?? 0),
            'closed' => (int) ($distribution['closed'] ?? 0)
        ];
    }

    /**
     * Get assignment statistics for vulnerabilities.
     */
    private function getAssignmentStats($query): array
    {
        $total = $query->count();
        $assigned = $query->whereNotNull('assigned_to')->count();
        $unassigned = $total - $assigned;

        return [
            'assigned' => (int) $assigned,
            'unassigned' => (int) $unassigned,
            'assignmentRate' => $total > 0 ? round(($assigned / $total) * 100, 1) : 0
        ];
    }

    /**
     * Get vulnerability severity distribution.
     */
    private function getVulnerabilitySeverityDistribution($query): array
    {
        $submissionIds = $query->pluck('id');

        if ($submissionIds->isEmpty()) {
            return [
                'low' => 0,
                'medium' => 0,
                'high' => 0
            ];
        }

        $distribution = Vulnerability::whereIn('vulnerability_submission_id', $submissionIds)
            ->groupBy('severity')
            ->select('severity', DB::raw('count(*) as count'))
            ->pluck('count', 'severity')
            ->toArray();

        return [
            'low' => (int) ($distribution['low'] ?? 0),
            'medium' => (int) ($distribution['medium'] ?? 0),
            'high' => (int) ($distribution['high'] ?? 0)
        ];
    }

    /**
     * Get vulnerability submission trends.
     */
    private function getVulnerabilityTrends($query): array
    {
        return $query->select(
            DB::raw("DATE(created_at) as date"),
            DB::raw('count(*) as count')
        )
        ->groupBy('date')
        ->orderBy('date')
        ->get()
        ->map(function($trend) {
            return [
                'date' => Carbon::parse($trend->date)->format('M d'),
                'count' => (int) $trend->count
            ];
        })->toArray();
    }

    /**
     * Get audit submission trends.
     */
    private function getAuditTrends($query): array
    {
        return $query->select(
            DB::raw("DATE(created_at) as date"),
            DB::raw('count(*) as count')
        )
        ->groupBy('date')
        ->orderBy('date')
        ->get()
        ->map(function($trend) {
            return [
                'date' => Carbon::parse($trend->date)->format('M d'),
                'count' => (int) $trend->count
            ];
        })->toArray();
    }

    /**
     * Get common vulnerabilities.
     */
    private function getCommonVulnerabilities($query): array
    {
        $submissionIds = $query->pluck('id');

        if ($submissionIds->isEmpty()) {
            return [];
        }

        return Vulnerability::whereIn('vulnerability_submission_id', $submissionIds)
            ->groupBy('category')
            ->select(
                'category',
                DB::raw('count(*) as total_count'),
                DB::raw('COUNT(CASE WHEN is_resolved = 1 THEN 1 END) as resolved_count')
            )
            ->orderByDesc('total_count')
            ->limit(5)
            ->get()
            ->map(function($vuln) {
                return [
                    'category' => (string) $vuln->category,
                    'count' => (int) $vuln->total_count,
                    'resolvedCount' => (int) $vuln->resolved_count,
                    'resolutionRate' => round(($vuln->resolved_count / $vuln->total_count) * 100, 1)
                ];
            })->toArray();
    }

    /**
     * Get common high-risk audit questions.
     */
    private function getCommonHighRiskAudits($query): array
    {
        $submissionIds = $query->where('system_overall_risk', 'high')->pluck('id');

        if ($submissionIds->isEmpty()) {
            return [];
        }

        return DB::table('audit_answers')
            ->join('audit_questions', 'audit_answers.audit_question_id', '=', 'audit_questions.id')
            ->whereIn('audit_answers.audit_submission_id', $submissionIds)
            ->where('audit_answers.system_risk_level', 'high')
            ->groupBy('audit_questions.question')
            ->select(
                'audit_questions.question',
                DB::raw('count(*) as count')
            )
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(function($item) {
                return [
                    'question' => (string) $item->question,
                    'count' => (int) $item->count
                ];
            })->toArray();
    }
}