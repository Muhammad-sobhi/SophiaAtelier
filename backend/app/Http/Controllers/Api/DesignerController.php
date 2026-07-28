<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Designer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DesignerController extends Controller
{
    public function index()
    {
        return response()->json(Designer::withCount('dresses')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'notes' => 'nullable|string',
        ]);

        $designer = Designer::create($validated);

        return response()->json($designer, 201);
    }

    public function show(Designer $designer)
    {
        $designer->load('dresses');

        return response()->json($designer);
    }

    public function update(Request $request, Designer $designer): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email',
            'notes' => 'nullable|string',
        ]);

        $designer->update($validated);

        return response()->json($designer);
    }

    public function destroy(Designer $designer): JsonResponse
    {
        $designer->delete();

        return response()->json(['message' => 'Designer deleted']);
    }
}
