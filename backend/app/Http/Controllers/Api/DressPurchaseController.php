<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveDressPurchaseRequest;
use App\Models\Dress;
use App\Models\DressPurchase;
use App\Models\DressPurchasePayment;
use App\Models\ManufacturingOrder;
use App\Services\DressPurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DressPurchaseController extends Controller
{
    /** Unpaid balance of a purchase in SQL: amount - prior_paid - its paid installments */
    private const REMAINING_SQL = 'dress_purchases.amount - dress_purchases.prior_paid - (SELECT COALESCE(SUM(p.amount), 0) FROM dress_purchase_payments p WHERE p.dress_purchase_id = dress_purchases.id AND p.paid_date IS NOT NULL)';

    public function __construct(private DressPurchaseService $purchases) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:all,open,paid',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $page = DressPurchase::with('dress:id,code,name,deleted_at', 'supplier:id,name', 'payments')
            ->when(($validated['status'] ?? 'all') === 'open', fn ($q) => $q->whereRaw(self::REMAINING_SQL . ' > 0'))
            ->when(($validated['status'] ?? 'all') === 'paid', fn ($q) => $q->whereRaw(self::REMAINING_SQL . ' <= 0'))
            ->when(trim($validated['search'] ?? '') !== '', function ($q) use ($validated) {
                $like = '%' . addcslashes(trim($validated['search']), '%_\\') . '%';
                $q->where(fn ($w) => $w->where('partner_name', 'like', $like)
                    ->orWhereHas('dress', fn ($d) => $d->withTrashed()->where('name', 'like', $like)->orWhere('code', 'like', $like))
                    ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', $like)));
            })
            ->latest('purchase_date')->latest('id')
            ->paginate($validated['per_page'] ?? 20);

        $page->getCollection()->each->append(['paid_total', 'remaining', 'payment_status', 'next_due_date']);

        return response()->json($page);
    }

    public function show(DressPurchase $dressPurchase): JsonResponse
    {
        return response()->json($this->purchases->load($dressPurchase));
    }

    public function store(SaveDressPurchaseRequest $request): JsonResponse
    {
        return response()->json($this->purchases->save(null, $request->validated(), $request->user()?->id), 201);
    }

    public function update(SaveDressPurchaseRequest $request, DressPurchase $dressPurchase): JsonResponse
    {
        return response()->json($this->purchases->save($dressPurchase, $request->validated(), $request->user()?->id));
    }

    public function destroy(DressPurchase $dressPurchase): JsonResponse
    {
        $this->purchases->delete($dressPurchase);
        return response()->json(['message' => 'Dress purchase deleted']);
    }

    public function pay(Request $request, DressPurchasePayment $payment): JsonResponse
    {
        $data = $request->validate([
            'paid_date' => 'required|date',
            'payment_method' => 'required|string|max:50',
            'receipt' => 'nullable|string',
            'notes' => 'nullable|string|max:1000',
        ]);
        return response()->json($this->purchases->pay($payment, $data));
    }

    public function unpay(DressPurchasePayment $payment): JsonResponse
    {
        abort_unless($payment->paid_date, 422, 'هذه الدفعة غير مدفوعة');
        return response()->json($this->purchases->unpay($payment));
    }

    /** Unpaid installments due within the next days (and every overdue one), soonest first */
    public function duePayments(Request $request): JsonResponse
    {
        $days = (int) ($request->validate(['days' => 'nullable|integer|min:0|max:365'])['days'] ?? 7);
        $today = now()->toDateString();

        $payments = DressPurchasePayment::with('purchase:id,dress_id,type,partner_name,supplier_id', 'purchase.dress:id,code,name,deleted_at', 'purchase.supplier:id,name')
            ->whereNull('paid_date')
            ->where('due_date', '<=', now()->addDays($days)->toDateString())
            ->orderBy('due_date')->orderBy('id')
            ->get()
            ->each(fn ($p) => $p->setAttribute('is_overdue', $p->due_date->toDateString() < $today));

        return response()->json([
            'data' => $payments,
            'total' => round($payments->sum(fn ($p) => (float) $p->amount), 2),
            'overdue_total' => round($payments->where('is_overdue', true)->sum(fn ($p) => (float) $p->amount), 2),
        ]);
    }

    /**
     * Shop dresses whose purchase was never recorded (dresses made by the workshop take their cost from the
     * manufacturing order, so they are left out). The admin completes each one: paid in full before, or still owed.
     */
    public function pendingDresses(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Dress::query()
            ->whereDoesntHave('purchase')
            ->whereNotIn('id', ManufacturingOrder::whereNotNull('dress_id')->select('dress_id'))
            ->when(trim($validated['search'] ?? '') !== '', function ($q) use ($validated) {
                $like = '%' . addcslashes(trim($validated['search']), '%_\\') . '%';
                $q->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('code', 'like', $like));
            });

        $totals = (clone $query)->selectRaw('COUNT(*) as count, COALESCE(SUM(purchase_price), 0) as cost')->first();
        $page = $query->orderByDesc('purchase_date')->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20, ['id', 'code', 'name', 'purchase_price', 'purchase_date']);

        return response()->json(array_merge($page->toArray(), [
            'pending_count' => (int) $totals->count,
            'pending_cost' => round((float) $totals->cost, 2),
        ]));
    }
}
