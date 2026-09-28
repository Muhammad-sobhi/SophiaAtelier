<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\ManufacturingOrder;
use App\Models\MaterialMovement;
use App\Services\ManufacturingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManufacturingOrderController extends Controller
{
    /** Statuses staff can set; 'approved' is set only through approve() */
    private const EDITABLE_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'];

    public function __construct(private ManufacturingService $manufacturing) {}

    public function index(Request $request): JsonResponse
    {
        $orders = ManufacturingOrder::with('worker:id,name', 'dress:id,code,name')
            ->addSelect(['materials_cost' => MaterialMovement::selectRaw('COALESCE(SUM(-quantity * unit_cost), 0)')
                ->whereColumn('manufacturing_order_id', 'manufacturing_orders.id')])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('worker_id'), fn ($q, $id) => $q->where('worker_id', $id))
            ->latest('id')
            ->paginate(min((int) $request->input('per_page', 20), 100));

        $orders->getCollection()->each(function ($o) {
            $o->materials_cost = round((float) $o->materials_cost, 2);
            $o->total_cost = round($o->materials_cost + (float) $o->worker_fee, 2);
        });

        return response()->json($orders);
    }

    public function show(ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        $manufacturingOrder->load('worker:id,name,piece_rate', 'dress:id,code,name', 'approver:id,name', 'materialMovements.material:id,name,unit', 'workerPayments');
        $materialsCost = round($manufacturingOrder->materialMovements->sum(fn ($m) => -(float) $m->quantity * (float) $m->unit_cost), 2);

        return response()->json($manufacturingOrder->toArray() + [
            'materials_cost' => $materialsCost,
            'total_cost' => round($materialsCost + (float) $manufacturingOrder->worker_fee, 2),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request) + ['status' => 'planned'];
        $order = ManufacturingOrder::create($data);

        return response()->json($order->load('worker:id,name'), 201);
    }

    public function update(Request $request, ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if ($manufacturingOrder->status === 'approved') {
            return response()->json(['message' => 'لا يمكن تعديل أمر تصنيع تمت الموافقة عليه'], 422);
        }
        $data = $this->validated($request);
        if (($data['status'] ?? null) === 'completed' && empty($data['completed_date']) && !$manufacturingOrder->completed_date) {
            $data['completed_date'] = now()->toDateString();
        }
        $manufacturingOrder->update($data);

        return response()->json($manufacturingOrder->load('worker:id,name'));
    }

    /** Move an order along its workflow (planned → in progress → waiting for approval) without re-sending the whole form */
    public function updateStatus(Request $request, ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if ($manufacturingOrder->status === 'approved') {
            return response()->json(['message' => 'ألغِ الموافقة أولاً لتغيير حالة الأمر'], 422);
        }
        $data = $request->validate(['status' => ['required', Rule::in(self::EDITABLE_STATUSES)]]);
        if ($data['status'] === 'completed' && !$manufacturingOrder->completed_date) {
            $data['completed_date'] = now()->toDateString();
        }
        $manufacturingOrder->update($data);

        return response()->json($manufacturingOrder);
    }

    /** Any order not approved yet can be deleted; everything it recorded is undone */
    public function destroy(ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        $this->manufacturing->deleteOrder($manufacturingOrder);

        return response()->json(['message' => 'Order deleted']);
    }

    /** Take materials from stock for this order */
    public function addMaterials(Request $request, ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if (in_array($manufacturingOrder->status, ['approved', 'cancelled'])) {
            return response()->json(['message' => 'لا يمكن صرف خامات لأمر تصنيع معتمد أو ملغي'], 422);
        }
        $data = $request->validate([
            'movement_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
        ]);

        $movements = DB::transaction(fn () => collect($data['items'])->map(
            fn ($item) => $this->manufacturing->consume(
                Material::findOrFail($item['material_id']), (float) $item['quantity'], 'manufacturing',
                $data['movement_date'], ['manufacturing_order_id' => $manufacturingOrder->id], $request->user()?->id, $data['notes'] ?? null
            )
        ));

        return response()->json($movements, 201);
    }

    /** Return one material line of this order to stock */
    public function removeMaterial(ManufacturingOrder $manufacturingOrder, MaterialMovement $movement): JsonResponse
    {
        abort_unless($movement->manufacturing_order_id === $manufacturingOrder->id, 404);
        if ($manufacturingOrder->status === 'approved') {
            return response()->json(['message' => 'لا يمكن تعديل خامات أمر تصنيع معتمد'], 422);
        }
        $this->manufacturing->deleteMovement($movement);

        return response()->json(['message' => 'Material returned to stock']);
    }

    /** Admin approval of a finished piece (before it may be added to the shop's dresses) */
    public function approve(Request $request, ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if ($manufacturingOrder->status !== 'completed') {
            return response()->json(['message' => 'الموافقة تكون فقط على أمر تصنيع انتهى تصنيعه'], 422);
        }
        DB::transaction(function () use ($request, $manufacturingOrder) {
            $manufacturingOrder->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);
            $this->manufacturing->createDressFromOrder($manufacturingOrder);
        });

        return response()->json($manufacturingOrder->fresh()->load('dress:id,code,name'));
    }

    /** Create the dress for an order approved before dresses were created automatically */
    public function createDress(ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if ($manufacturingOrder->status !== 'approved') {
            return response()->json(['message' => 'يجب الموافقة على أمر التصنيع قبل إنشاء الفستان'], 422);
        }
        $this->manufacturing->createDressFromOrder($manufacturingOrder);

        return response()->json($manufacturingOrder->fresh()->load('dress:id,code,name'), 201);
    }

    /** Cancel the approval so the order can be edited or deleted again */
    public function unapprove(ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        return response()->json($this->manufacturing->unapproveOrder($manufacturingOrder));
    }

    /** Link an approved piece to the dress created for it in the dresses page */
    public function linkDress(Request $request, ManufacturingOrder $manufacturingOrder): JsonResponse
    {
        if ($manufacturingOrder->status !== 'approved') {
            return response()->json(['message' => 'يجب الموافقة على أمر التصنيع قبل ربطه بفستان'], 422);
        }
        $data = $request->validate([
            'dress_id' => ['required', 'exists:dresses,id', Rule::unique('manufacturing_orders', 'dress_id')->ignore($manufacturingOrder->id)],
        ]);
        $manufacturingOrder->update($data + ['dress_auto_created' => false]);

        return response()->json($manufacturingOrder->load('dress:id,code,name'));
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'worker_id' => 'nullable|exists:workers,id',
            'status' => ['nullable', Rule::in(self::EDITABLE_STATUSES)],
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'completed_date' => 'nullable|date',
            'worker_fee' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);
        $data['worker_fee'] ??= 0;
        if (empty($data['status'])) {
            unset($data['status']);
        }

        return $data;
    }
}
