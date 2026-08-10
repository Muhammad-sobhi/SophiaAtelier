<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientGallery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientGalleryController extends Controller
{
    public function index()
    {
        $gallery = ClientGallery::orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($gallery);
    }

    public function publicIndex()
    {
        $gallery = ClientGallery::where('is_published', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($gallery);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:255',
            'image' => 'required|file|mimes:jpeg,png,jpg,webp,mp4,mov,webm,avi|max:51200',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        // Ensure directory exists
        $storagePath = storage_path('app/public/client-gallery');
        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        $path = $request->file('image')->store('client-gallery', 'public');

        // Ensure file is readable
        $fullPath = storage_path('app/public/' . $path);
        if (file_exists($fullPath)) {
            @chmod($fullPath, 0644);
        }

        $item = ClientGallery::create([
            'client_name' => $validated['client_name'],
            'image_path' => $path,
            'is_published' => $validated['is_published'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json($item, 201);
    }

    public function update(Request $request, ClientGallery $clientGallery): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'sometimes|required|string|max:255',
            'is_published' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
            'image' => 'nullable|file|mimes:jpeg,png,jpg,webp,mp4,mov,webm,avi|max:51200',
        ]);

        // Remove file object from validated data
        unset($validated['image']);

        if ($request->hasFile('image')) {
            if ($clientGallery->image_path) {
                Storage::disk('public')->delete($clientGallery->image_path);
            }

            $storagePath = storage_path('app/public/client-gallery');
            if (!is_dir($storagePath)) {
                mkdir($storagePath, 0755, true);
            }

            $validated['image_path'] = $request->file('image')->store('client-gallery', 'public');

            $fullPath = storage_path('app/public/' . $validated['image_path']);
            if (file_exists($fullPath)) {
                @chmod($fullPath, 0644);
            }
        }

        $clientGallery->update($validated);

        return response()->json($clientGallery);
    }

    public function destroy(ClientGallery $clientGallery): JsonResponse
    {
        if ($clientGallery->image_path) {
            Storage::disk('public')->delete($clientGallery->image_path);
        }
        $clientGallery->delete();

        return response()->json(['message' => 'Gallery image deleted']);
    }
}
