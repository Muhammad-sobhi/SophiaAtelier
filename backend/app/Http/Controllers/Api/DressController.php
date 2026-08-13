<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dress;
use App\Models\DressImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DressController extends Controller
{
    public function index(Request $request)
    {
        $query = Dress::with(['category', 'collection', 'designer', 'images', 'accessories'])->withCount('bookings');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($collectionId = $request->input('collection_id')) {
            $query->where('collection_id', $collectionId);
        }

        if ($search = $request->input('search')) {
            $cleanSearch = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where(function ($q) use ($cleanSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                  ->orWhere('name_ar', 'like', "%{$cleanSearch}%")
                  ->orWhere('code', 'like', "%{$cleanSearch}%")
                  ->orWhereHas('designer', function ($dq) use ($cleanSearch) {
                      $dq->where('name', 'like', "%{$cleanSearch}%")
                         ->orWhere('name_ar', 'like', "%{$cleanSearch}%");
                  });
            });
        }

        if ($request->has('is_website_visible')) {
            $query->where('is_website_visible', filter_var($request->input('is_website_visible'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->input('per_page') === 'all') {
            return response()->json($query->latest()->get());
        }

        $perPage = (int) $request->input('per_page', 15);
        return response()->json($query->latest()->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        if ($code = $request->input('code')) {
            $cleanCode = trim((string)$code);
            if ($cleanCode !== '') {
                // Clear code from any soft-deleted dresses
                \Illuminate\Support\Facades\DB::table('dresses')
                    ->whereNotNull('deleted_at')
                    ->where(function($q) use ($cleanCode) {
                        $q->where('code', $cleanCode)
                          ->orWhereRaw('TRIM(code) = ?', [$cleanCode]);
                    })
                    ->update(['code' => null]);
            }
        }

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('dresses', 'code')->whereNull('deleted_at')],
            'name' => 'required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'collection_id' => 'nullable|exists:collections,id',
            'designer_id' => 'required|exists:designers,id',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'rental_price' => 'nullable|numeric|min:0',
            'trying_fee' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:available,out,maintenance,cleaning',
            'size' => 'nullable|string|max:50',
            'weight_from' => 'nullable|integer|min:0',
            'weight_to' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:50',
            'color_ar' => 'nullable|string|max:50',
            'fabric' => 'nullable|string|max:100',
            'fabric_ar' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'accessories' => 'nullable|array',
            'new_collection' => 'nullable|boolean',
            'is_website_visible' => 'nullable|boolean',
        ]);

        $dress = Dress::create($validated);

        if ($request->has('accessories')) {
            foreach ($request->input('accessories') as $accName) {
                if (trim($accName)) {
                    $dress->accessories()->create([
                        'name' => trim($accName),
                        'quantity' => 1
                    ]);
                }
            }
        }

        // Auto-create an expense record for the dress purchase price
        if (!empty($validated['purchase_price']) && $validated['purchase_price'] > 0) {
            \App\Models\Expense::create([
                'category'    => 'purchase',
                'amount'      => $validated['purchase_price'],
                'description' => 'شراء فستان: ' . $dress->name,
                'date'        => !empty($validated['purchase_date']) ? $validated['purchase_date'] : now()->toDateString(),
            ]);
        }

        return response()->json($dress->load(['category', 'collection', 'designer', 'images', 'accessories']), 201);
    }

    public function show(Dress $dress)
    {
        $dress->load([
            'category', 
            'collection',
            'designer', 
            'images', 
            'accessories', 
            'bookings' => function($q) {
                $q->where('status', '!=', 'cancelled')->with('client');
            }
        ]);

        return response()->json($dress);
    }

    public function update(Request $request, Dress $dress): JsonResponse
    {
        if ($code = $request->input('code')) {
            $cleanCode = trim((string)$code);
            if ($cleanCode !== '') {
                // Clear code from any soft-deleted dresses
                \Illuminate\Support\Facades\DB::table('dresses')
                    ->whereNotNull('deleted_at')
                    ->where('id', '!=', $dress->id)
                    ->where(function($q) use ($cleanCode) {
                        $q->where('code', $cleanCode)
                          ->orWhereRaw('TRIM(code) = ?', [$cleanCode]);
                    })
                    ->update(['code' => null]);
            }
        }

        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50', Rule::unique('dresses', 'code')->whereNull('deleted_at')->ignore($dress->id)],
            'name' => 'sometimes|required|string|max:255',
            'name_ar' => 'nullable|string|max:255',
            'category_id' => 'sometimes|required|exists:categories,id',
            'collection_id' => 'nullable|exists:collections,id',
            'designer_id' => 'sometimes|required|exists:designers,id',
            'description' => 'nullable|string',
            'description_ar' => 'nullable|string',
            'purchase_price' => 'nullable|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'rental_price' => 'nullable|numeric|min:0',
            'trying_fee' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:available,out,maintenance,cleaning',
            'size' => 'nullable|string|max:50',
            'weight_from' => 'nullable|integer|min:0',
            'weight_to' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:50',
            'color_ar' => 'nullable|string|max:50',
            'fabric' => 'nullable|string|max:100',
            'fabric_ar' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'accessories' => 'nullable|array',
            'new_collection' => 'nullable|boolean',
            'is_website_visible' => 'nullable|boolean',
        ]);

        $dress->update($validated);

        if (array_key_exists('purchase_price', $validated) && $validated['purchase_price'] > 0) {
            $expense = \App\Models\Expense::where('category', 'purchase')
                ->where('description', 'LIKE', '%' . $dress->name . '%')
                ->first();

            $expenseDate = !empty($validated['purchase_date']) ? $validated['purchase_date'] : now()->toDateString();

            if ($expense) {
                $expense->update([
                    'amount' => $validated['purchase_price'],
                    'date'   => $expenseDate,
                ]);
            } else {
                \App\Models\Expense::create([
                    'category'    => 'purchase',
                    'amount'      => $validated['purchase_price'],
                    'description' => 'شراء فستان: ' . $dress->name,
                    'date'        => $expenseDate,
                ]);
            }
        }

        if ($request->has('accessories')) {
            $dress->accessories()->delete();
            foreach ($request->input('accessories') as $accName) {
                if (trim($accName)) {
                    $dress->accessories()->create([
                        'name' => trim($accName),
                        'quantity' => 1
                    ]);
                }
            }
        }

        return response()->json($dress->load(['category', 'collection', 'designer', 'accessories']));
    }

    public function destroy(Dress $dress): JsonResponse
    {
        $dress->code = null;
        $dress->save();
        $dress->delete();

        return response()->json(['message' => 'Dress deleted']);
    }

    /**
     * Upload up to 4 images/videos for a dress.
     * POST /api/dresses/{dress}/images
     * Body: multipart/form-data with field "images[]"
     */
    public function uploadImages(Request $request, Dress $dress): JsonResponse
    {
        $request->validate([
            'images' => 'required|array|max:4',
            'images.*' => 'required|file|mimes:jpeg,png,jpg,webp,mp4,mov,webm,avi|max:51200',
        ]);

        $existing = $dress->images()->count();
        if ($existing >= 4) {
            return response()->json(['message' => 'الحد الأقصى للوسائط هو 4 لكل فستان'], 422);
        }

        // Ensure storage directory exists
        $storagePath = storage_path('app/public/dresses');
        if (!is_dir($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        $uploaded = [];
        $isFirst = $existing === 0;

        foreach ($request->file('images') as $index => $file) {
            if ($existing + $index >= 4) break;

            $path = $file->store('dresses', 'public');

            // Ensure the file is readable
            $fullPath = storage_path('app/public/' . $path);
            if (file_exists($fullPath)) {
                @chmod($fullPath, 0644);
            }

            $image = $dress->images()->create([
                'image_path' => $path,
                'is_primary' => ($isFirst && $index === 0),
            ]);

            $uploaded[] = [
                'id' => $image->id,
                'url' => Storage::disk('public')->url($path),
                'is_primary' => $image->is_primary,
            ];
        }

        return response()->json(['images' => $uploaded], 201);
    }

    /**
     * Delete a single dress image or video.
     * DELETE /api/dresses/{dress}/images/{image}
     */
    public function deleteImage(Dress $dress, DressImage $image): JsonResponse
    {
        if ($image->dress_id !== $dress->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        Storage::disk('public')->delete($image->image_path);
        $image->delete();

        return response()->json(['message' => 'Image deleted']);
    }

    /**
     * PUT /api/dresses/{dress}/stage-action
     * Perform a dress lifecycle action: mark_booked, mark_dry_clean, mark_ready, cancel_booking
     */
    public function stageAction(Request $request, Dress $dress): JsonResponse
    {
        $action = $request->input('action');

        switch ($action) {
            case 'mark_booked':
                $dress->update(['status' => 'booked']);
                break;

            case 'mark_out':
                $dress->update(['status' => 'out']);
                break;

            case 'mark_dry_clean':
                $dress->update(['status' => 'dry_clean']);
                break;

            case 'mark_ready':
                $dress->update(['status' => 'available']);
                break;

            case 'cancel_booking':
                $dress->update(['status' => 'available']);
                break;

            default:
                return response()->json(['message' => 'Unknown action'], 400);
        }

        // Compute lifecycle stage
        $stage = 'ready';
        if (in_array($dress->status, ['cleaning', 'dry_clean'])) {
            $stage = 'dry_clean';
        } elseif (in_array($dress->status, ['booked', 'out'])) {
            $stage = 'booked';
        } elseif ($dress->status === 'maintenance') {
            $stage = 'dry_clean';
        }

        return response()->json([
            'message' => 'Action completed',
            'current_stage' => $stage,
            'status' => $dress->status,
        ]);
    }

    /**
     * Release a dress code from any soft-deleted dresses or clear conflicts.
     * GET /api/dresses/release-code/{code}
     */
    public function releaseCode(string $code): JsonResponse
    {
        $cleanCode = trim($code);
        if ($cleanCode === '') {
            return response()->json(['message' => 'Invalid code'], 400);
        }

        // 1. Clear code on soft-deleted dresses
        $deletedCount = \Illuminate\Support\Facades\DB::table('dresses')
            ->whereNotNull('deleted_at')
            ->where('code', $cleanCode)
            ->update(['code' => null]);

        // 2. Check if an active dress uses this code
        $activeCount = \Illuminate\Support\Facades\DB::table('dresses')
            ->whereNull('deleted_at')
            ->where('code', $cleanCode)
            ->count();

        if (function_exists('opcache_reset')) {
            @opcache_reset();
        }

        return response()->json([
            'message' => "تمت معالجة كود الفستان {$cleanCode} بنجاح",
            'clean_code' => $cleanCode,
            'cleared_soft_deleted_count' => $deletedCount,
            'active_dresses_count' => $activeCount,
        ]);
    }
}
