<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Worker;
use App\Models\WorkerPayment;
use App\Services\ManufacturingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkerController extends Controller
{
    public function __construct(private ManufacturingService $manufacturing) {}

    /**
     * Workers with their pay status for a month (default: current):
     * salary paid that month, piece fees earned on finished orders vs piece pay received (all time).
     */
    public function index(Request $request): JsonResponse
    {
        $month = $request->input('month', now()->format('Y-m'));
        abort_unless(preg_match('/^\d{4}-\d{2}$/', $month), 422, 'Invalid month');

        $workers = Worker::query()
            ->withSum(['orders as piece_earned' => fn ($q) => $q->whereIn('status', ['completed', 'approved'])], 'worker_fee')
            ->withSum(['payments as piece_paid' => fn ($q) => $q->where('type', 'piece')], 'amount')
            ->withSum(['payments as salary_paid' => fn ($q) => $q->where('type', 'salary')->where('period', $month)], 'amount')
            ->withSum(['payments as advances' => fn ($q) => $q->where('type', 'advance')->where('period', $month)], 'amount')
            ->withCount(['orders as active_orders' => fn ($q) => $q->whereIn('status', ['planned', 'in_progress'])])
            ->orderByDesc('is_active')->orderBy('name')
            ->get()
            ->each(function ($w) {
                $w->piece_due = round((float) $w->piece_earned - (float) $w->piece_paid, 2);
                $w->salary_due = in_array($w->pay_type, ['monthly', 'both'])
                    ? round((float) $w->monthly_salary - (float) $w->salary_paid - (float) $w->advances, 2)
                    : 0;
            });

        return response()->json(['data' => $workers, 'month' => $month]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Worker::create($this->validated($request)), 201);
    }

    public function show(Worker $worker): JsonResponse
    {
        return response()->json([
            'worker' => $worker,
            'payments' => $worker->payments()->with('manufacturingOrder:id,title')->latest('payment_date')->latest('id')->get(),
            'orders' => $worker->orders()->latest('id')->get(['id', 'title', 'status', 'worker_fee', 'completed_date']),
        ]);
    }

    public function update(Request $request, Worker $worker): JsonResponse
    {
        $worker->update($this->validated($request));
        return response()->json($worker);
    }

    public function destroy(Worker $worker): JsonResponse
    {
        if ($worker->payments()->exists() || $worker->orders()->exists()) {
            return response()->json(['message' => 'لا يمكن حذف عامل له أوامر تصنيع أو مدفوعات — يمكنك إيقافه بدلاً من ذلك'], 422);
        }
        $worker->delete();
        return response()->json(['message' => 'Worker deleted']);
    }

    public function storePayment(Request $request, Worker $worker): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(WorkerPayment::TYPES))],
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'payment_date' => 'required|date',
            'period' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
            'manufacturing_order_id' => ['nullable', Rule::exists('manufacturing_orders', 'id')->where('worker_id', $worker->id)],
            'notes' => 'nullable|string|max:1000',
        ]);
        // Salary and advances belong to a month; default to the payment's month
        if (in_array($data['type'], ['salary', 'advance']) && empty($data['period'])) {
            $data['period'] = substr($data['payment_date'], 0, 7);
        }

        return response()->json($this->manufacturing->payWorker($worker, $data), 201);
    }

    public function destroyPayment(Worker $worker, WorkerPayment $payment): JsonResponse
    {
        abort_unless($payment->worker_id === $worker->id, 404);
        $this->manufacturing->deleteWorkerPayment($payment);
        return response()->json(['message' => 'Payment deleted']);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'specialty' => 'nullable|string|max:255',
            'pay_type' => ['required', Rule::in(Worker::PAY_TYPES)],
            'monthly_salary' => 'nullable|numeric|min:0',
            'piece_rate' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'notes' => 'nullable|string|max:2000',
        ]);
        $data['monthly_salary'] ??= 0;
        $data['piece_rate'] ??= 0;

        return $data;
    }
}
