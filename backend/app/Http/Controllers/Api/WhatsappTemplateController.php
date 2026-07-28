<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsappTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsappTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(WhatsappTemplate::all());
    }

    public function show(WhatsappTemplate $whatsappTemplate): JsonResponse
    {
        return response()->json($whatsappTemplate);
    }

    public function update(Request $request, $idOrKey): JsonResponse
    {
        $template = is_numeric($idOrKey)
            ? WhatsappTemplate::findOrFail($idOrKey)
            : WhatsappTemplate::where('key', $idOrKey)->firstOrFail();

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'body' => 'required|string',
        ]);

        $template->update($validated);

        return response()->json($template);
    }
}
