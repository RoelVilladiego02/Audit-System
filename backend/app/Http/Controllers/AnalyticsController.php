<?php

namespace App\Http\Controllers;

use App\Models\Submission;
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
        
        $startDate = $this->getStartDate($timeRange);
        
        // Debug: Log the parameters
        Log::info('Analytics Request', [
            'timeRange' => $timeRange,
            'userId' => $userId,
            'startDate' => $startDate
        ]);
        
        $query = Submission::query()
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', $userId);
            })
            ->where('created_at', '>=', $startDate);

        // Debug: Check if we have any submissions at all
        $totalSubmissionsCount = Submission::count();
        $filteredSubmissionsCount = $query->count();
        
        Log::info('Submission Counts', [
            'total_submissions_in_db' => $totalSubmissionsCount,
            'filtered_submissions' => $filteredSubmissionsCount,
            'start_date' => $startDate->toDateString()
        ]);

        $riskDistribution = $this->getRiskDistribution($query->clone());

        $result = [
            'totalSubmissions' => $this->getTotalSubmissions($query->clone()),
            'riskDistribution' => $riskDistribution,
            'averageRiskScore' => $this->getAverageRiskScore($query->clone()),
            'resolvedIssues' => $this->getResolvedIssues($query->clone()),
            'highRiskFindings' => $riskDistribution['high'] ?? 0,
            'completionRate' => $this->getCompletionRate($query->clone()),
            'submissionTrends' => $this->getSubmissionTrends($query->clone(), $timeRange),
            'commonVulnerabilities' => $this->getCommonVulnerabilities($query->clone()),
            'departmentAnalysis' => $this->getDepartmentAnalysis($startDate),
            // Debug info
            'debug' => [
                'total_in_db' => $totalSubmissionsCount,
                'start_date' => $startDate->toDateString(),
                'time_range' => $timeRange,
                'user_id' => $userId
            ]
        ];

        Log::info('Analytics Result', $result);
        
        return response()->json($result);
    }

    private function getStartDate($timeRange)
    {
        return match($timeRange) {
            'year' => Carbon::now()->subYear(),
            'quarter' => Carbon::now()->subMonths(3),
            default => Carbon::now()->subMonth(),
        };
    }

    private function getTotalSubmissions($query)
    {
        return $query->count();
    }

    private function getRiskDistribution($query)
    {
        $distribution = $query->groupBy('risk_level')
            ->select('risk_level', DB::raw('count(*) as count'))
            ->pluck('count', 'risk_level')
            ->toArray();

        Log::info('Risk Distribution Raw', $distribution);

        // Transform to match frontend format
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

    private function getSubmissionTrends($query, $timeRange)
    {
        $groupFormat = match($timeRange) {
            'year' => '%Y-%m',
            'quarter' => '%Y-%m-%d',
            default => '%Y-%m-%d',
        };

        $trends = $query->select(
            DB::raw("DATE_FORMAT(created_at, '{$groupFormat}') as date"),
            DB::raw('count(*) as count')
        )
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        Log::info('Submission Trends Raw', $trends->toArray());

        // Format dates for frontend
        return [
            'labels' => $trends->map(function($trend) use ($timeRange) {
                $date = Carbon::parse($trend->date);
                return match($timeRange) {
                    'year' => $date->format('M Y'),
                    'quarter', 'month' => $date->format('M d'),
                };
            })->values(),
            'data' => $trends->pluck('count')->values()
        ];
    }

    private function getCommonVulnerabilities($query)
    {
        $submissionIds = $query->pluck('id');
        
        if ($submissionIds->isEmpty()) {
            return collect([]);
        }

        return Vulnerability::whereIn('submission_id', $submissionIds)
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

    private function getDepartmentAnalysis($startDate)
    {
        return Department::select(
            'departments.name',
            DB::raw('COALESCE(AVG(submissions.risk_score), 0) as averageRiskScore'),
            DB::raw('COALESCE((COUNT(CASE WHEN submissions.is_resolved = 1 THEN 1 END) * 100.0 / NULLIF(COUNT(submissions.id), 0)), 0) as completionRate')
        )
        ->leftJoin('submissions', function($join) use ($startDate) {
            $join->on('departments.id', '=', 'submissions.department_id')
                ->where('submissions.created_at', '>=', $startDate);
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