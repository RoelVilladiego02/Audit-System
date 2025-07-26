<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Department::all();
        return response()->json($departments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments',
        ]);

        $department = Department::create($validated);
        return response()->json($department, 201);
    }

    public function show(Department $department): JsonResponse
    {
        return response()->json($department);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,' . $department->id,
        ]);

        $department->update($validated);
        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        if ($department->submissions()->exists()) {
            return response()->json(['message' => 'Cannot delete department with existing submissions'], 422);
        }

        $department->delete();
        return response()->json(['message' => 'Department deleted successfully']);
    }
}
