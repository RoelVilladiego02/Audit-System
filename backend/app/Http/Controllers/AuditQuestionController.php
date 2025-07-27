<?php

namespace App\Http\Controllers;

use App\Models\AuditQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AuditQuestionController extends Controller
{
    /**
     * Display a listing of audit questions.
     */
    public function index(): JsonResponse
    {
        try {
            $questions = AuditQuestion::orderBy('created_at', 'desc')->get();
            return response()->json($questions);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve questions.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created audit question.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'question' => 'required|string|max:1000',
                'description' => 'nullable|string|max:2000',
                'possible_answers' => 'required|array|min:1',
                'possible_answers.*' => 'required|string|max:255',
                'risk_criteria' => 'required|array',
                'risk_criteria.high' => 'nullable|string|max:500',
                'risk_criteria.medium' => 'nullable|string|max:500',
                'risk_criteria.low' => 'nullable|string|max:500',
            ]);

            // Ensure unique possible answers
            $validated['possible_answers'] = array_unique($validated['possible_answers']);

            $question = AuditQuestion::create($validated);
            
            return response()->json([
                'message' => 'Question created successfully.',
                'data' => $question
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create question.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified audit question.
     */
    public function show(AuditQuestion $auditQuestion): JsonResponse
    {
        try {
            return response()->json($auditQuestion);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Question not found.',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified audit question.
     */
    public function update(Request $request, AuditQuestion $auditQuestion): JsonResponse
    {
        try {
            $validated = $request->validate([
                'question' => 'required|string|max:1000',
                'description' => 'nullable|string|max:2000',
                'possible_answers' => 'required|array|min:1',
                'possible_answers.*' => 'required|string|max:255',
                'risk_criteria' => 'required|array',
                'risk_criteria.high' => 'nullable|string|max:500',
                'risk_criteria.medium' => 'nullable|string|max:500',
                'risk_criteria.low' => 'nullable|string|max:500',
            ]);

            // Ensure unique possible answers
            $validated['possible_answers'] = array_unique($validated['possible_answers']);

            $auditQuestion->update($validated);
            
            return response()->json([
                'message' => 'Question updated successfully.',
                'data' => $auditQuestion->fresh()
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update question.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified audit question.
     */
    public function destroy(AuditQuestion $auditQuestion): JsonResponse
    {
        try {
            // Check if question is being used in any answers
            if ($auditQuestion->answers()->exists()) {
                return response()->json([
                    'message' => 'Cannot delete question that is referenced in existing audit answers.',
                    'suggestion' => 'Consider archiving the question instead of deleting it.'
                ], 409);
            }

            $auditQuestion->delete();
            
            return response()->json([
                'message' => 'Question deleted successfully.'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete question.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get questions with statistics (admin only).
     */
    public function statistics(): JsonResponse
    {
        try {
            $questions = AuditQuestion::withCount('answers')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($question) {
                    return [
                        'id' => $question->id,
                        'question' => $question->question,
                        'description' => $question->description,
                        'answers_count' => $question->answers_count,
                        'created_at' => $question->created_at,
                        'updated_at' => $question->updated_at,
                    ];
                });

            return response()->json($questions);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to retrieve question statistics.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}