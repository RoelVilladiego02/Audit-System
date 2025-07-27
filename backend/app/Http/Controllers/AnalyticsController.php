<?php

namespace App\Http\Controllers;

use App\Models\VulnerabilitySubmission;
use App\Models\AuditSubmission;
use App\Models\Vulnerability;
use App\Models\Department;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $timeRange = $request->input('timeRange', 'month');
        $userId = $request->input('userId');
        $type = $request->input('type', 'all'); // 'vulnerability', 'audit', or 'all'
        
        $startDate = $this->getStartDate($timeRange);
        
        Log::info('Analytics Request', [
            'timeRange' => $timeRange,
            'userId' => $userId,
            'type' => $type,
            'startDate' => $startDate
        ]);
        
        // Get data based on type
        if ($type === 'vulnerability') {
            $data = $this->getVulnerabilityAnalytics($startDate, $userId);
        } elseif ($type === 'audit') {
            $data = $this->getAuditAnalytics($startDate, $userId);
        } else {
            $data = $this->getCombinedAnalytics($startDate, $userId);
        }

        return response()->json($data);
    }

    private function getVulnerabilityAnalytics($startDate, $userId = null)
    {
        $query = VulnerabilitySubmission::query()
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', $userId);
            })
            ->where('created_at', '>=', $startDate);

        $totalSubmissions = $query->count();
        
        return [
            'type' => 'vulnerability',
            'totalSubmissions' => $totalSubmissions,
            'riskDistribution' => $this->getVulnerabilityRiskDistribution($query->clone()),
            'averageRiskScore' => $this->getAverageRiskScore($query->clone()),
            'resolvedIssues' => $this->getResolvedIssues($query->clone()),
            'completionRate' => $this->getCompletionRate($query->clone()),
            'submissionTrends' => $this->getVulnerabilityTrends($query->clone()),
            'commonVulnerabilities' => $this->getCommonVulnerabilities($query->clone()),
            'departmentAnalysis' => $this->getDepartmentAnalysis($startDate),
        ];
    }

    private function getAuditAnalytics($startDate, $userId = null)
    {
        $query = AuditSubmission::query()
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', $userId);
            })
            ->where('created_at', '>=', $startDate);

        return [
            'type' => 'audit',
            'totalSubmissions' => $query->count(),
            'riskDistribution' => $this->getAuditRiskDistribution($query->clone()),
            'averageRiskScore' => $this->getAuditAverageRiskScore($query->clone()),
            'submissionTrends' => $this->getAuditTrends($query->clone()),
            'commonHighRisks' => $this->getCommonHighRiskAudits($query->clone()),
        ];
    }

    private function getCombinedAnalytics($startDate, $userId = null)
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

    private function getStartDate($timeRange)
    {
        return match($timeRange) {
            'year' => Carbon::now()->subYear(),
            'quarter' => Carbon::now()->subMonths(3),
            default => Carbon::now()->subMonth(),
        };
    }

    private function getVulnerabilityRiskDistribution($query)
    {
        $distribution = $query->groupBy('risk_level')
            ->select('risk_level', DB::raw('count(*) as count'))
            ->pluck('count', 'risk_level')
            ->toArray();

        return [
            'high' => $distribution['high'] ?? 0,
            'medium' => $distribution['medium'] ?? 0,
            'low' => $distribution['low'] ?? 0
        ];
    }

    private function getAuditRiskDistribution($query)
    {
        $distribution = $query->groupBy('overall_risk')
            ->select('overall_risk', DB::raw('count(*) as count'))
            ->pluck('count', 'overall_risk')
            ->toArray();

        return [
            'high' => $distribution['high'] ?? 0,
            'medium' => $distribution['medium'] ?? 0,
            'low' => $distribution['low'] ?? 0
        ];
    }

    private function getAverageRiskScore($query)
    {
        return round($query->avg('risk_score') ?? 0, 1);
    }

    private function getAuditAverageRiskScore($query)
    {
        $avg = $query->select(DB::raw("
            AVG(CASE 
                WHEN overall_risk = 'high' THEN 3 
                WHEN overall_risk = 'medium' THEN 2 
                WHEN overall_risk = 'low' THEN 1 
                ELSE 0
            END) as avg_score
        "))->first()->avg_score;

        return round($avg ?? 0, 1);
    }

    private function getResolvedIssues($query)
    {
        return $query->where('is_resolved', true)->count();
    }

    private function getCompletionRate($query)
    {
        $total = $query->count();
        if ($total === 0) return 0;
        
        $resolved = $query->where('is_resolved', true)->count();
        return round(($resolved / $total) * 100, 1);
    }

    private function getVulnerabilityTrends($query)
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
                'count' => $trend->count
            ];
        });
    }

    private function getAuditTrends($query)
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
                'count' => $trend->count
            ];
        });
    }

    private function getCommonVulnerabilities($query)
    {
        $submissionIds = $query->pluck('id');
        
        if ($submissionIds->isEmpty()) {
            return collect([]);
        }

        return Vulnerability::whereIn('vulnerability_submission_id', $submissionIds)
            ->groupBy('category')
            ->select(
                'category',
                DB::raw('count(*) as count')
            )
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(function($vuln) {
                return [
                    'category' => $vuln->category,
                    'count' => $vuln->count
                ];
            });
    }

    private function getCommonHighRiskAudits($query)
    {
        $submissionIds = $query->where('overall_risk', 'high')->pluck('id');
        
        if ($submissionIds->isEmpty()) {
            return collect([]);
        }

        return DB::table('audit_answers')
            ->join('audit_questions', 'audit_answers.audit_question_id', '=', 'audit_questions.id')
            ->whereIn('audit_answers.audit_submission_id', $submissionIds)
            ->where('audit_answers.risk_level', 'high')
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
                    'question' => $item->question,
                    'count' => $item->count
                ];
            });
    }

    private function getDepartmentAnalysis($startDate)
    {
        return Department::select(
            'departments.name',
            DB::raw('COALESCE(AVG(vulnerability_submissions.risk_score), 0) as averageRiskScore'),
            DB::raw('COALESCE((COUNT(CASE WHEN vulnerability_submissions.is_resolved = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(vulnerability_submissions.id), 0)), 0) as completionRate')
        )
        ->leftJoin('vulnerability_submissions', function($join) use ($startDate) {
            $join->on('departments.id', '=', 'vulnerability_submissions.department_id')
                ->where('vulnerability_submissions.created_at', '>=', $startDate);
        })
        ->groupBy('departments.id', 'departments.name')
        ->get()
        ->map(function ($dept) {
            return [
                'name' => $dept->name,
                'averageRiskScore' => round($dept->averageRiskScore, 1),
                'completionRate' => round($dept->completionRate, 1)
            ];
        });
    }
}