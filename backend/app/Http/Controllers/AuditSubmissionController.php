<?php

namespace App\Http\Controllers;

use App\Models\AuditSubmission;
use App\Models\AuditAnswer;
use App\Models\AuditQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AuditSubmissionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'answers' => 'required|array',
            'answers.*.audit_question_id' => 'required|exists:audit_questions,id',
            'answers.*.answer' => 'required|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            // Create submission
            $submission = AuditSubmission::create([
                'user_id' => $request->user()->id,
                'title' => $validated['title'],
                'overall_risk' => 'low', // Will be updated after processing answers
            ]);

            $highRiskCount = 0;
            $mediumRiskCount = 0;

            // Process each answer
            foreach ($validated['answers'] as $answerData) {
                $question = AuditQuestion::find($answerData['audit_question_id']);
                $riskLevel = $this->evaluateRisk($question->risk_criteria, $answerData['answer']);
                
                // Create answer with risk assessment
                AuditAnswer::create([
                    'audit_submission_id' => $submission->id,
                    'audit_question_id' => $answerData['audit_question_id'],
                    'answer' => $answerData['answer'],
                    'risk_level' => $riskLevel,
                    'recommendation' => $this->generateRecommendation($riskLevel, $question),
                ]);

                // Count risk levels
                if ($riskLevel === 'high') $highRiskCount++;
                if ($riskLevel === 'medium') $mediumRiskCount++;
            }

            // Update overall risk
            $overallRisk = $this->calculateOverallRisk($highRiskCount, $mediumRiskCount, count($validated['answers']));
            $submission->update(['overall_risk' => $overallRisk]);

            return response()->json([
                'submission' => $submission->load('answers.question'),
                'message' => 'Audit submitted successfully'
            ], 201);
        });
    }

    private function evaluateRisk(array $riskCriteria, string $answer): string
    {
        // If risk criteria is structured as answer => risk_level
        if (isset($riskCriteria[$answer])) {
            return $riskCriteria[$answer];
        }

        // If risk criteria has patterns (legacy support)
        foreach ($riskCriteria as $criteria) {
            if (is_array($criteria) && isset($criteria['pattern']) && preg_match($criteria['pattern'], $answer)) {
                return $criteria['risk_level'];
            }
        }
        
        return 'low';
    }

    private function generateRecommendation(string $riskLevel, AuditQuestion $question): string
    {
        $recommendations = [
            'high' => 'Immediate action required. This issue poses significant security risks.',
            'medium' => 'Action recommended within 30 days. Monitor closely.',
            'low' => 'Monitor and review periodically. Consider improvements when possible.'
        ];

        return $recommendations[$riskLevel];
    }

    private function calculateOverallRisk(int $highCount, int $mediumCount, int $total): string
    {
        $highPercentage = ($highCount / $total) * 100;
        $mediumPercentage = ($mediumCount / $total) * 100;

        if ($highPercentage >= 20 || $highCount >= 2) {
            return 'high';
        } elseif ($mediumPercentage >= 30 || $mediumCount >= 3) {
            return 'medium';
        }
        return 'low';
    }

    public function index(Request $request): JsonResponse
    {
        $query = AuditSubmission::with('answers.question');
        
        // If user is not admin, only show their own submissions
        if ($request->user()->role !== 'admin') {
            $query->where('user_id', $request->user()->id);
        }
        
        $submissions = $query->orderBy('created_at', 'desc')->get();
        return response()->json($submissions);
    }

    public function show(AuditSubmission $submission): JsonResponse
    {
        // Check if the user owns this submission or is an admin
        if ($submission->user_id !== auth()->id() && auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($submission->load('answers.question', 'user'));
    }

    public function analytics(): JsonResponse
    {
        $analytics = [
            'total_audits' => AuditSubmission::count(),
            'risk_distribution' => AuditSubmission::select('overall_risk', DB::raw('count(*) as count'))
                ->groupBy('overall_risk')
                ->pluck('count', 'overall_risk')
                ->toArray(),
            'most_common_high_risks' => DB::table('audit_answers')
                ->join('audit_questions', 'audit_answers.audit_question_id', '=', 'audit_questions.id')
                ->where('audit_answers.risk_level', 'high')
                ->select('audit_questions.question', DB::raw('count(*) as count'))
                ->groupBy('audit_questions.question')
                ->orderBy('count', 'desc')
                ->limit(5)
                ->get(),
            'average_risk_score' => AuditSubmission::select(DB::raw("
                AVG(CASE 
                    WHEN overall_risk = 'high' THEN 3 
                    WHEN overall_risk = 'medium' THEN 2 
                    WHEN overall_risk = 'low' THEN 1 
                    ELSE 0
                END) as avg_score
            "))->first()->avg_score ?? 0
        ];

        return response()->json($analytics);
    }
}