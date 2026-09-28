<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaterialPurchase;
use App\Services\ManufacturingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialPurchaseController extends Controller
{
    public function __construct(private ManufacturingService $manufacturing) {}

    public function index(Request $request): JsonResponse
    {
        $purchases = MaterialPurchase::with('supplier:id,name', 'items.material:id,name,unit', 'payments:id,material_purchase_id,payment_method', 'expense:id,payment_method')
            ->withSum('payments as paid_amount', 'amount')
            ->when($request->input('supplier_id'), fn ($q, $id) => $q->where('supplier_id', $id))
            ->latest('purchase_date')->latest('id')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json($purchases);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($this->manufacturing->createPurchase($this->validated($request), $request->user()?->id), 201);
    }

    /** The old invoice is undone completely and replaced by the new data */
    public function update(Request $request, MaterialPurchase $materialPurchase): JsonResponse
    {
        return response()->json($this->manufacturing->updatePurchase($materialPurchase, $this->validated($request), $request->user()?->id));
    }

    public function destroy(MaterialPurchase $materialPurchase): JsonResponse
    {
        $this->manufacturing->deletePurchase($materialPurchase);
        return response()->json(['message' => 'Purchase deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'purchase_date' => 'required|date',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|max:50',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);
    }
}
