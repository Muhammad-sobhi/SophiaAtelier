<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\ManufacturingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function __construct(private ManufacturingService $manufacturing) {}

    /** Suppliers with their balance (negative = the shop owes them, positive = overpaid) */
    public function index(): JsonResponse
    {
        $suppliers = Supplier::withBalance()->orderBy('name')->get()
            ->each(fn ($s) => $s->append('balance'));

        return response()->json([
            'data' => $suppliers,
            'total_balance' => round($suppliers->sum('balance'), 2),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $supplier = Supplier::create($this->validated($request));
        return response()->json($supplier->append('balance'), 201);
    }

    /** Supplier statement: purchases and payments, newest first */
    public function show(Supplier $supplier): JsonResponse
    {
        $supplier->loadSum('purchases as purchases_total', 'total_amount')
            ->loadSum('payments as payments_total', 'amount')
            ->append('balance');

        return response()->json([
            'supplier' => $supplier,
            'purchases' => $supplier->purchases()->with('items.material:id,name,unit')->latest('purchase_date')->latest('id')->get(),
            'payments' => $supplier->payments()->latest('payment_date')->latest('id')->get(),
        ]);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($this->validated($request));
        return response()->json($supplier->append('balance'));
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->purchases()->exists() || $supplier->payments()->exists()) {
            return response()->json(['message' => 'لا يمكن حذف مورد له فواتير أو دفعات مسجلة'], 422);
        }
        $supplier->delete();
        return response()->json(['message' => 'Supplier deleted']);
    }

    public function storePayment(Request $request, Supplier $supplier): JsonResponse
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        return response()->json($this->manufacturing->paySupplier($supplier, $data), 201);
    }

    public function destroyPayment(Supplier $supplier, SupplierPayment $payment): JsonResponse
    {
        abort_unless($payment->supplier_id === $supplier->id, 404);
        $this->manufacturing->deleteSupplierPayment($payment);
        return response()->json(['message' => 'Payment deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);
    }
}
