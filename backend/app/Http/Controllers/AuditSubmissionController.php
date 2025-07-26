<?php

namespace App\Http\Controllers;

use App\Models\AuditSubmission;
use App\Models\AuditAnswer;
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
                $question = \App\Models\AuditQuestion::find($answerData['audit_question_id']);
                $riskLevel = $this->evaluateRisk($question->risk_criteria, $answerData['answer']);
                
                // Create answer with risk assessment
                $answer = new AuditAnswer([
                    'audit_question_id' => $answerData['audit_question_id'],
                    'answer' => $answerData['answer'],
                    'risk_level' => $riskLevel,
                    'recommendation' => $this->generateRecommendation($riskLevel, $question),
                ]);
                
                $submission->answers()->save($answer);

                // Count risk levels
                if ($riskLevel === 'high') $highRiskCount++;
                if ($riskLevel === 'medium') $mediumRiskCount++;
            }

            // Update overall risk
            $overallRisk = $this->calculateOverallRisk($highRiskCount, $mediumRiskCount, count($validated['answers']));
            $submission->update(['overall_risk' => $overallRisk]);

            return response()->json([
                'submission' => $submission->load('answers'),
                'message' => 'Audit submitted successfully'
            ], 201);
        });
    }

    private function evaluateRisk(array $riskCriteria, string $answer): string
    {
        foreach ($riskCriteria as $criteria) {
            if (preg_match($criteria['pattern'], $answer)) {
                return $criteria['risk_level'];
            }
        }
        return 'low';
    }

    private function generateRecommendation(string $riskLevel, $question): string
    {
        $recommendations = [
            'high' => 'Immediate action required. ',
            'medium' => 'Action recommended within 30 days. ',
            'low' => 'Monitor and review periodically. '
        ];

        return $recommendations[$riskLevel] . ($question->recommendations[$riskLevel] ?? '');
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
        $submissions = AuditSubmission::with('answers.question')
            ->where('user_id', $request->user()->id)
            ->get();
        return response()->json($submissions);
    }

    public function show(AuditSubmission $submission): JsonResponse
    {
        // Check if the user owns this submission or is an admin
        if ($submission->user_id !== auth()->id() && !auth()->user()->isAdmin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($submission->load('answers.question'));
    }

    public function analytics(): JsonResponse
    {
        $analytics = [
            'total_audits' => AuditSubmission::count(),
            'risk_distribution' => AuditSubmission::select('overall_risk', DB::raw('count(*) as count'))
                ->groupBy('overall_risk')
                ->get(),
            'most_common_high_risks' => AuditAnswer::where('risk_level', 'high')
                ->select('audit_question_id', DB::raw('count(*) as count'))
                ->groupBy('audit_question_id')
                ->with('question')
                ->orderBy('count', 'desc')
                ->limit(5)
                ->get(),
            'average_risk_score' => AuditSubmission::whereNotNull('overall_risk')
                ->select(DB::raw("
                    AVG(CASE 
                        WHEN overall_risk = 'high' THEN 3 
                        WHEN overall_risk = 'medium' THEN 2 
                        WHEN overall_risk = 'low' THEN 1 
                    END) as avg_score
                "))
                ->first()
                ->avg_score
        ];

        return response()->json($analytics);
    }
}
