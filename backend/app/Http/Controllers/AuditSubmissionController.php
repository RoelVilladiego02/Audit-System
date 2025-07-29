<?php

namespace App\Http\Controllers;

use App\Models\AuditSubmission;
use App\Models\AuditAnswer;
use App\Models\AuditQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
                'answers.*.audit_question_id' => 'required|integer|exists:audit_questions,id',
                'answers.*.answer' => 'required|string',
            ]);

            return DB::transaction(function () use ($validated, $request) {
                // Create submission with initial status
                $submission = AuditSubmission::create([
                    'user_id' => (int) $request->user()->id,
                    'title' => $validated['title'],
                    'status' => 'submitted',
                ]);

                // Process each answer
                foreach ($validated['answers'] as $answerData) {
                    $questionId = (int) $answerData['audit_question_id'];
                    $question = AuditQuestion::find($questionId);
                    
                    if (!$question) {
                        throw ValidationException::withMessages([
                            'answers' => "Question with ID {$questionId} not found"
                        ]);
                    }
                    
                    // Validate answer is in possible answers
                    if (!$question->isValidAnswer($answerData['answer'])) {
                        throw ValidationException::withMessages([
                            'answers' => "Invalid answer '{$answerData['answer']}' for question ID {$questionId}"
                        ]);
                    }
                    
                    // Create answer with system risk assessment
                    $answer = AuditAnswer::create([
                        'audit_submission_id' => $submission->id,
                        'audit_question_id' => $questionId,
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
            Log::error('Audit submission creation failed: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to create audit submission.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get audit submissions list.
     * Users can only see their own submissions, while admins can see all.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AuditSubmission::with(['user:id,name,email', 'reviewer:id,name,email'])
                ->withCount([
                    'answers',
                    'answers as reviewed_answers_count' => function ($q) {
                        $q->whereNotNull('reviewed_by');
                    }
                ]);
            
            // Filter based on user role
            if (!$request->user()->isAdmin()) {
                $query->where('user_id', $request->user()->id);
            }
            
            $submissions = $query->orderBy('created_at', 'desc')->get();

            // Transform the data with proper type casting
            $transformedSubmissions = $submissions->map(function ($submission) {
                return [
                    'id' => (int) $submission->id,
                    'title' => (string) $submission->title,
                    'user' => $submission->user ? [
                        'id' => (int) $submission->user->id,
                        'name' => (string) $submission->user->name,
                        'email' => (string) $submission->user->email,
                    ] : null,
                    'status' => (string) $submission->status,
                    'system_overall_risk' => $submission->system_overall_risk,
                    'admin_overall_risk' => $submission->admin_overall_risk,
                    'effective_overall_risk' => $submission->admin_overall_risk ?? $submission->system_overall_risk ?? 'pending',
                    'review_progress' => $this->calculateReviewProgress($submission),
                    'reviewer' => $submission->reviewer ? [
                        'id' => (int) $submission->reviewer->id,
                        'name' => (string) $submission->reviewer->name,
                        'email' => (string) $submission->reviewer->email,
                    ] : null,
                    'created_at' => $submission->created_at,
                    'reviewed_at' => $submission->reviewed_at,
                    'answers_count' => (int) $submission->answers_count,
                    'reviewed_answers_count' => (int) $submission->reviewed_answers_count,
                ];
            });
            
            return response()->json($transformedSubmissions);
        } catch (\Exception $e) {
            Log::error('Failed to retrieve submissions: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to retrieve submissions.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get specific audit submission.
     */
public function show(AuditSubmission $submission): JsonResponse
{
    try {
        // Authorization check - users can only view their own submissions, admins can view all
        if ($submission->user_id !== auth()->id() && auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Load relationships
        $submission->load([
            'answers' => function ($query) {
                $query->orderBy('id');
            },
            'answers.question:id,question,description,possible_answers,risk_criteria',
            'answers.reviewer:id,name,email',
            'user:id,name,email',
        ]);

        // Log raw data for debugging
        Log::info('Submission Show - Raw Data', [
            'reviewed_by' => gettype($submission->reviewed_by) . ': ' . json_encode($submission->reviewed_by),
            'reviewer' => gettype($submission->reviewer) . ': ' . json_encode($submission->reviewer)
        ]);

        // Transform data with validation
        $data = [
            'id' => (int) $submission->id,
            'title' => (string) $submission->title,
            'status' => (string) $submission->status,
            'system_overall_risk' => $submission->system_overall_risk,
            'admin_overall_risk' => $submission->admin_overall_risk,
            'effective_overall_risk' => $submission->admin_overall_risk ?? $submission->system_overall_risk ?? 'pending',
            'admin_summary' => $submission->admin_summary,
            'created_at' => $submission->created_at,
            'reviewed_at' => $submission->reviewed_at,
            'user' => $submission->user instanceof \App\Models\User ? [
                'id' => (int) $submission->user->id,
                'name' => (string) $submission->user->name,
                'email' => (string) $submission->user->email,
            ] : null,
            'reviewer' => $submission->reviewed_by ? (
                $submission->reviewer instanceof \App\Models\User && $submission->reviewer->role === 'admin' ? [
                    'id' => (int) $submission->reviewer->id,
                    'name' => (string) $submission->reviewer->name,
                    'email' => (string) $submission->reviewer->email,
                ] : null
            ) : null,
            'answers' => $submission->answers->map(function ($answer) {
                Log::info('Answer Raw Data', [
                    'reviewed_by' => gettype($answer->reviewed_by) . ': ' . json_encode($answer->reviewed_by),
                    'reviewer' => gettype($answer->reviewer) . ': ' . json_encode($answer->reviewer)
                ]);
                return [
                    'id' => (int) $answer->id,
                    'audit_submission_id' => (int) $answer->audit_submission_id,
                    'audit_question_id' => (int) $answer->audit_question_id,
                    'answer' => (string) $answer->answer,
                    'system_risk_level' => $answer->system_risk_level,
                    'admin_risk_level' => $answer->admin_risk_level,
                    'status' => (string) $answer->status,
                    'admin_notes' => $answer->admin_notes,
                    'recommendation' => $answer->recommendation,
                    'reviewed_by' => $answer->reviewed_by ? (int) $answer->reviewed_by : null,
                    'reviewed_at' => $answer->reviewed_at,
                    'question' => $answer->question instanceof \App\Models\AuditQuestion ? [
                        'id' => (int) $answer->question->id,
                        'question' => (string) $answer->question->question,
                        'description' => $answer->question->description,
                        'possible_answers' => $answer->question->possible_answers,
                        'risk_criteria' => $answer->question->risk_criteria,
                    ] : null,
                    'reviewer' => $answer->reviewed_by ? (
                        $answer->reviewer instanceof \App\Models\User && $answer->reviewer->role === 'admin' ? [
                            'id' => (int) $answer->reviewer->id,
                            'name' => (string) $answer->reviewer->name,
                            'email' => (string) $answer->reviewer->email,
                        ] : null
                    ) : null,
                ];
            }),
            'review_progress' => $this->calculateReviewProgress($submission),
        ];

        return response()->json($data);
    } catch (\Exception $e) {
        Log::error('Failed to retrieve submission: ' . $e->getMessage(), [
            'submission_id' => $submission->id ?? null,
            'user_id' => auth()->id(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'message' => 'Failed to retrieve submission.',
            'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
        ], 500);
    }
}

    /**
     * Admin review individual answer.
     */
    public function reviewAnswer(Request $request, AuditSubmission $submission, AuditAnswer $answer): JsonResponse
{
    try {
        if (auth()->user()->role !== 'admin') {
            return response()->json(['message' => 'Only admins can review answers'], 403);
        }

        // Add logging for debugging
        Log::info('Review Answer Request', [
            'submission_id' => $submission->id,
            'answer_id' => $answer->id,
            'admin_id' => auth()->id()
        ]);
        
        if (!$answer) {
            return response()->json([
                'message' => 'Answer not found or does not belong to this submission'
            ], 404);
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
                'submission_status' => $submission->fresh()->status,
                'submission_progress' => $this->calculateReviewProgress($submission->fresh())
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to review answer: ' . $e->getMessage(), [
                'submission_id' => $submission->id ?? null,
                'answer_id' => $answerId ?? null,
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to review answer.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
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
                'reviewed_by' => (int) auth()->id(), // Ensure integer
                'reviewed_at' => now(),
            ]);

            return response()->json([
                'message' => 'Audit review completed successfully.',
                'submission' => $submission->fresh(['user'])
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to complete review: ' . $e->getMessage(), [
                'submission_id' => $submission->id ?? null,
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to complete review.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
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
                'recent_submissions' => AuditSubmission::with('user:id,name,email')
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get()
                    ->map(function($sub) {
                        return [
                            'id' => (int) $sub->id,
                            'title' => (string) $sub->title,
                            'user' => $sub->user ? (string) $sub->user->name : 'Unknown',
                            'status' => (string) $sub->status,
                            'effective_overall_risk' => $sub->admin_overall_risk ?? $sub->system_overall_risk ?? 'pending',
                            'review_progress' => $this->calculateReviewProgress($sub),
                            'created_at' => $sub->created_at
                        ];
                    })
            ];

            return response()->json($dashboard);
        } catch (\Exception $e) {
            Log::error('Failed to load dashboard: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to load dashboard.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
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

            $dateRange = (int) $request->get('days', 30);
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
            Log::error('Failed to generate analytics: ' . $e->getMessage(), [
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to generate analytics.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
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

        return round((float) ($completed->avg_hours ?? 0), 2);
    }

    /**
     * Calculate review progress for a submission
     */
    private function calculateReviewProgress(AuditSubmission $submission): float
    {
        $totalAnswers = $submission->answers()->count();
        if ($totalAnswers === 0) {
            return 0.0;
        }
        
        $reviewedAnswers = $submission->answers()->whereNotNull('reviewed_by')->count();
        return round(($reviewedAnswers / $totalAnswers) * 100, 2);
    }

    

}