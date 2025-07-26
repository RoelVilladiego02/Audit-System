<?php

namespace App\Http\Controllers;

use App\Models\AuditQuestion;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditQuestionController extends Controller
{
    public function index(): JsonResponse
    {
        $questions = AuditQuestion::all();
        return response()->json($questions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:255',
            'description' => 'nullable|string',
            'possible_answers' => 'required|array',
            'risk_criteria' => 'required|array',
        ]);

        $question = AuditQuestion::create($validated);
        return response()->json($question, 201);
    }

    public function show(AuditQuestion $question): JsonResponse
    {
        return response()->json($question);
    }

    public function update(Request $request, AuditQuestion $question): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:255',
            'description' => 'nullable|string',
            'possible_answers' => 'required|array',
            'risk_criteria' => 'required|array',
        ]);

        $question->update($validated);
        return response()->json($question);
    }

    public function destroy(AuditQuestion $question): JsonResponse
    {
        $question->delete();
        return response()->json(null, 204);
    }
}
