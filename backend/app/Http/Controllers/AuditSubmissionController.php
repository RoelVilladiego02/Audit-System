<?php

namespace App\Http\Controllers;

use App\Models\AuditSubmission;
use App\Models\AuditAnswer;
use App\Models\AuditQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuditSubmissionController extends Controller
{
    /**
     * Store a new audit submission.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'answers' => 'required|array|min:1',
                'answers.*.audit_question_id' => 'required|exists:audit_questions,id',
                'answers.*.answer' => 'required|string',
            ]);

            return DB::transaction(function () use ($validated, $request) {
                // Create submission with initial status
                $submission = AuditSubmission::create([
                    'user_id' => $request->user()->id,
                    'title' => $validated['title'],
                    'status' => 'submitted',
                ]);

                // Process each answer
                foreach ($validated['answers'] as $answerData) {
                    $question = AuditQuestion::find($answerData['audit_question_id']);
                    
                    // Validate answer is in possible answers
                    if (!$question->isValidAnswer($answerData['answer'])) {
                        throw ValidationException::withMessages([
                            'answers' => "Invalid answer '{$answerData['answer']}' for question ID {$question->id}"
                        ]);
                    }
                    
                    // Create answer with system risk assessment
                    $answer = AuditAnswer::create([
                        'audit_submission_id' => $submission->id,
                        'audit_question_id' => $answerData['audit_question_id'],
                        'answer' => $answerData['answer'],
                        'status' => 'pending',
                    ]);
                    
                    // Calculate and set system risk level
                    $systemRiskLevel = $answer->calculateSystemRiskLevel();
                    $answer->update([
                        'system_risk_level' => $systemRiskLevel,
                        'recommendation' => $this->generateRecommendation($systemRiskLevel, $question),
                    ]);
                }

                // Calculate system overall risk
                $systemOverallRisk = $submission->calculateSystemOverallRisk();
                $submission->update(['system_overall_risk' => $systemOverallRisk]);

                return response()->json([
                    'submission' => $submission->load('answers.question'),
                    'message' => 'Audit submitted successfully. Pending admin review.',
                    'status' => $submission->status,
                    'system_overall_risk' => $systemOverallRisk
                ], 201);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create audit submission.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get audit submissions list.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AuditSubmission::with(['user', 'reviewer'])
                ->withCount([
                    'answers',
                    'answers as reviewed_answers_count' => function ($q) {
                        $q->reviewed();
                    }
                ]);
            
            // Filter based on user role
            if (!$request->user()->isAdmin()) {
                $query->where('user_id', $request->user()->id);
            }
            
            // Apply filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            
            if ($request->has('risk_level')) {
                $query->where(function($q) use ($request) {
                    $q->where('admin_overall_risk', $request->risk_level)
                      ->orWhere(function($subQ) use ($request) {
                          $subQ->whereNull('admin_overall_risk')
                               ->where('system_overall_risk', $request->risk_level);
                      });
                });
            }
            
            $submissions = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($submission) {
                    return [
                        'id' => $submission->id,
                        'title' => $submission->title,
                        'user' => $submission->user->name,
                        'status' => $submission->status,
                        'system_overall_risk' => $submission->system_overall_risk,
                        'admin_overall_risk' => $submission->admin_overall_risk,
                        'effective_overall_risk' => $submission->effective_overall_risk,
                        'review_progress' => $submission->review_progress,
                        'reviewer' => $submission->reviewer?->name,
                        'created_at' => $submission->created_at,
                        'reviewed_at' => $submission->reviewed_at,
                        'answers_count' => $submission->answers_count,
                        'reviewed_answers_count' => $submission->reviewed_answers_count,
                    ];
                });
            
            return response()->json($submissions);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve submissions.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific audit submission.
     */
    public function show(AuditSubmission $submission): JsonResponse
    {
        try {
            // Authorization check
            if (!auth()->user()->isAdmin() && $submission->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $data = $submission->load([
                'answers.question',
                'answers.reviewer',
                'user',
                'reviewer'
            ]);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve submission.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin review individual answer.
     */
    public function reviewAnswer(Request $request, AuditAnswer $answer): JsonResponse
    {
        try {
            if (!auth()->user()->isAdmin()) {
                return response()->json(['message' => 'Only admins can review answers'], 403);
            }

            $validated = $request->validate([
                'admin_risk_level' => 'required|in:low,medium,high',
                'admin_notes' => 'nullable|string|max:1000',
                'recommendation' => 'nullable|string|max:1000',
            ]);

            $answer->reviewByAdmin(
                auth()->user(),
                $validated['admin_risk_level'],
                $validated['admin_notes'] ?? null,
                $validated['recommendation'] ?? null
            );

            return response()->json([
                'message' => 'Answer reviewed successfully.',
                'answer' => $answer->fresh(['question', 'reviewer']),
                'submission_status' => $answer->auditSubmission->status,
                'submission_progress' => $answer->auditSubmission->review_progress
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to review answer.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Admin completes overall submission review.
     */
    public function completeReview(Request $request, AuditSubmission $submission): JsonResponse
    {
        try {
            if (!auth()->user()->isAdmin()) {
                return response()->json(['message' => 'Only admins can complete reviews'], 403);
            }

            if (!$submission->isFullyReviewed()) {
                return response()->json([
                    'message' => 'Cannot complete review. Some answers are still pending.',
                    'pending_count' => $submission->pendingAnswers()->count()
                ], 400);
            }

            $validated = $request->validate([
                'admin_overall_risk' => 'required|in:low,medium,high',
                'admin_summary' => 'nullable|string|max:2000',
            ]);

            $submission->update([
                'admin_overall_risk' => $validated['admin_overall_risk'],
                'admin_summary' => $validated['admin_summary'] ?? null,
                'status' => 'completed',
                'reviewed_by' => auth()->id(),
                'reviewed_at' => now(),
            ]);

            return response()->json([
                'message' => 'Audit review completed successfully.',
                'submission' => $submission->fresh(['user', 'reviewer'])
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to complete review.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get admin dashboard data.
     */
    public function adminDashboard(): JsonResponse
    {
        try {
            if (!auth()->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $dashboard = [
                'pending_reviews' => AuditSubmission::pendingReview()->count(),
                'under_review' => AuditSubmission::underReview()->count(),
                'completed_today' => AuditSubmission::completed()
                    ->whereDate('reviewed_at', today())
                    ->count(),
                'high_risk_submissions' => AuditSubmission::whereIn('status', ['submitted', 'under_review'])
                    ->where(function($q) {
                        $q->where('admin_overall_risk', 'high')
                          ->orWhere(function($subQ) {
                              $subQ->whereNull('admin_overall_risk')
                                   ->where('system_overall_risk', 'high');
                          });
                    })
                    ->count(),
                'pending_answers' => AuditAnswer::pendingReview()->count(),
                'recent_submissions' => AuditSubmission::with('user')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get()
                    ->map(function($sub) {
                        return [
                            'id' => $sub->id,
                            'title' => $sub->title,
                            'user' => $sub->user->name,
                            'status' => $sub->status,
                            'effective_overall_risk' => $sub->effective_overall_risk,
                            'review_progress' => $sub->review_progress,
                            'created_at' => $sub->created_at
                        ];
                    })
            ];

            return response()->json($dashboard);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to load dashboard.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get comprehensive analytics.
     */
    public function analytics(Request $request): JsonResponse
    {
        try {
            if (!auth()->user()->isAdmin()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $dateRange = $request->get('days', 30);
            $startDate = now()->subDays($dateRange);

            $analytics = [
                'summary' => [
                    'total_submissions' => AuditSubmission::count(),
                    'completed_reviews' => AuditSubmission::completed()->count(),
                    'pending_reviews' => AuditSubmission::pendingReview()->count(),
                    'average_review_time' => $this->getAverageReviewTime(),
                ],
                'risk_distribution' => [
                    'system' => AuditSubmission::select('system_overall_risk as risk', DB::raw('count(*) as count'))
                        ->whereNotNull('system_overall_risk')
                        ->groupBy('system_overall_risk')
                        ->pluck('count', 'risk')
                        ->toArray(),
                    'admin' => AuditSubmission::select('admin_overall_risk as risk', DB::raw('count(*) as count'))
                        ->whereNotNull('admin_overall_risk')
                        ->groupBy('admin_overall_risk')
                        ->pluck('count', 'risk')
                        ->toArray(),
                ],
                'trends' => AuditSubmission::where('created_at', '>=', $startDate)
                    ->select(
                        DB::raw('DATE(created_at) as date'),
                        DB::raw('count(*) as submissions'),
                        DB::raw('sum(case when status = "completed" then 1 else 0 end) as completed')
                    )
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get(),
                'question_insights' => AuditAnswer::join('audit_questions', 'audit_answers.audit_question_id', '=', 'audit_questions.id')
                    ->select(
                        'audit_questions.question',
                        DB::raw('count(*) as total_answers'),
                        DB::raw('sum(case when COALESCE(admin_risk_level, system_risk_level) = "high" then 1 else 0 end) as high_risk_count'),
                        DB::raw('ROUND(sum(case when COALESCE(admin_risk_level, system_risk_level) = "high" then 1 else 0 end) * 100.0 / count(*), 2) as high_risk_percentage')
                    )
                    ->groupBy('audit_questions.id', 'audit_questions.question')
                    ->having('total_answers', '>=', 5)
                    ->orderBy('high_risk_percentage', 'desc')
                    ->limit(10)
                    ->get(),
            ];

            return response()->json($analytics);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate analytics.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate recommendation based on risk level and question.
     */
    private function generateRecommendation(string $riskLevel, AuditQuestion $question): string
    {
        $recommendations = [
            'high' => 'Immediate action required. This poses significant security risks and should be addressed within 24-48 hours.',
            'medium' => 'Action recommended within 1-2 weeks. Monitor closely and plan remediation.',
            'low' => 'Consider improvements when possible. Include in next security review cycle.'
        ];

        return $recommendations[$riskLevel] ?? $recommendations['low'];
    }

    /**
     * Calculate average review time in hours.
     */
    private function getAverageReviewTime(): float
    {
        $completed = AuditSubmission::completed()
            ->whereNotNull('reviewed_at')
            ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, created_at, reviewed_at)) as avg_hours'))
            ->first();

        return round($completed->avg_hours ?? 0, 2);
    }
}