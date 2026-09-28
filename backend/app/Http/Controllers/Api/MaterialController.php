<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialMovement;
use App\Services\ManufacturingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MaterialController extends Controller
{
    public function __construct(private ManufacturingService $manufacturing) {}

    public function index(Request $request): JsonResponse
    {
        $materials = Material::with('supplier:id,name')
            ->when($request->input('category'), fn ($q, $c) => $q->where('category', $c))
            ->when(trim((string) $request->input('search')), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $materials,
            'stock_value' => round($materials->sum(fn ($m) => (float) $m->quantity * (float) $m->avg_cost), 2),
            'categories' => Material::CATEGORIES,
            'units' => Material::UNITS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Material::create($this->validated($request)), 201);
    }

    public function update(Request $request, Material $material): JsonResponse
    {
        $material->update($this->validated($request));
        return response()->json($material);
    }

    public function destroy(Material $material): JsonResponse
    {
        if ($material->movements()->exists()) {
            return response()->json(['message' => 'لا يمكن حذف خامة لها حركات مخزن (شراء أو استخدام)'], 422);
        }
        $material->delete();
        return response()->json(['message' => 'Material deleted']);
    }

    /** Stock movements, optionally for one material / type / dress */
    public function movements(Request $request): JsonResponse
    {
        $movements = MaterialMovement::with('material:id,name,unit', 'dress:id,code,name', 'manufacturingOrder:id,title', 'user:id,name')
            ->when($request->input('material_id'), fn ($q, $id) => $q->where('material_id', $id))
            ->when($request->input('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->input('dress_id'), fn ($q, $id) => $q->where('dress_id', $id))
            ->latest('movement_date')->latest('id')
            ->paginate(min((int) $request->input('per_page', 30), 100));

        return response()->json($movements);
    }

    /** Use material from stock for a dress maintenance (manufacturing use goes through the order) */
    public function useForMaintenance(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dress_id' => 'required|exists:dresses,id',
            'movement_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $movements = \Illuminate\Support\Facades\DB::transaction(fn () => collect($data['items'])->map(
            fn ($item) => $this->manufacturing->consume(
                Material::findOrFail($item['material_id']), (float) $item['quantity'], 'maintenance',
                $data['movement_date'], ['dress_id' => $data['dress_id']], $request->user()?->id, $data['notes'] ?? null
            )
        ));

        return response()->json($movements, 201);
    }

    public function adjust(Request $request, Material $material): JsonResponse
    {
        $data = $request->validate([
            'counted_quantity' => 'required|numeric|min:0',
            'movement_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $movement = $this->manufacturing->adjust($material, (float) $data['counted_quantity'], $data['movement_date'], $request->user()?->id, $data['notes'] ?? null);
        return response()->json(['movement' => $movement, 'material' => $material->fresh()]);
    }

    public function destroyMovement(MaterialMovement $movement): JsonResponse
    {
        $this->manufacturing->deleteMovement($movement);
        return response()->json(['message' => 'Movement deleted']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category' => ['required', Rule::in(array_keys(Material::CATEGORIES))],
            'unit' => ['required', Rule::in(array_keys(Material::UNITS))],
            'color' => 'nullable|string|max:100',
            'min_quantity' => 'nullable|numeric|min:0',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'notes' => 'nullable|string|max:2000',
        ]);
        $data['min_quantity'] ??= 0;

        return $data;
    }
}
