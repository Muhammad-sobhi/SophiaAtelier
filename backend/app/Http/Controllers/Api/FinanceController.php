<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Expense;
use App\Models\FinanceTransaction;
use App\Models\Revenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    // Finance page tabs: backend type/category values per tab; unlisted values fall into the default tab.
    private const REVENUE_TABS = ['transfers' => ['transfer_in', 'capital_deposit']];
    private const REVENUE_DEFAULT_TAB = 'shop';
    private const EXPENSE_TABS = [
        'operational' => ['salary', 'purchase'],
        'utilities' => ['cleaning', 'maintenance'],
        'transfers' => ['transfer_out', 'owner_withdrawal'],
    ];
    private const EXPENSE_DEFAULT_TAB = 'other';

    private const TAB_LABELS = [
        'shop' => 'مبيعات وحجوزات المحل',
        'operational' => 'المشتريات والرواتب',
        'utilities' => 'المرافق والخدمات العامة',
        'transfers' => 'مناقلات وسحب وإيداع',
        'other' => 'مصروفات أخرى',
    ];

    private const PAYMENT_METHOD_LABELS = [
        'instapay' => 'إنستاباي',
        'vodafone_cash' => 'فودافون كاش',
        'bank_transfer' => 'تحويل بنكي',
        'credit_card' => 'فيزا / كارت',
        'cash' => 'نقدي (كاش)',
    ];

    // Payment method as the dashboard sees it: lowercased, spaces -> underscores, empty -> cash.
    private const NORMALIZED_METHOD_SQL = "LOWER(REPLACE(COALESCE(NULLIF(payment_method, ''), 'cash'), ' ', '_'))";

    /**
     * Combined, filtered and paginated list of revenues and expenses for the finance page.
     */
    public function transactions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'tab' => 'nullable|string|in:all,shop,operational,utilities,transfers,other',
            'payment_method' => 'nullable|string|max:50',
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $tab = $validated['tab'] ?? 'all';
        $method = $validated['payment_method'] ?? null;
        $search = trim($validated['search'] ?? '');

        $revenues = Revenue::query()->selectRaw("'revenue' as kind, id, payment_date as tx_date");
        $expenses = Expense::query()->selectRaw("'expense' as kind, id, date as tx_date");

        foreach ([[$revenues, 'payment_date'], [$expenses, 'date']] as [$query, $dateColumn]) {
            if (!empty($validated['start_date'])) {
                $query->where($dateColumn, '>=', $validated['start_date']);
            }
            if (!empty($validated['end_date'])) {
                $query->where($dateColumn, '<=', $validated['end_date']);
            }
            if ($method) {
                $query->whereRaw(self::NORMALIZED_METHOD_SQL . ' = ?', [$method]);
            }
        }

        if ($tab !== 'all') {
            $this->whereTab($revenues, 'type', self::REVENUE_TABS, self::REVENUE_DEFAULT_TAB, $tab);
            $this->whereTab($expenses, 'category', self::EXPENSE_TABS, self::EXPENSE_DEFAULT_TAB, $tab);
        }

        if ($search !== '') {
            $this->whereSearch($revenues, $search, 'notes', 'payment_date', 'type', self::REVENUE_TABS, self::REVENUE_DEFAULT_TAB, true);
            $this->whereSearch($expenses, $search, 'description', 'date', 'category', self::EXPENSE_TABS, self::EXPENSE_DEFAULT_TAB, false);
        }

        $page = DB::query()
            ->fromSub($revenues->toBase()->unionAll($expenses->toBase()), 'tx')
            ->orderByDesc('tx_date')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 20);

        // Hydrate only the rows of the current page.
        $rows = collect($page->items());
        $revenueModels = Revenue::with('booking:id,client_id', 'booking.client:id,name')
            ->whereIn('id', $rows->where('kind', 'revenue')->pluck('id'))
            ->get()->keyBy('id');
        $expenseModels = Expense::whereIn('id', $rows->where('kind', 'expense')->pluck('id'))
            ->get()->keyBy('id');

        $data = $rows->map(function ($row) use ($revenueModels, $expenseModels) {
            if ($row->kind === 'revenue') {
                $revenue = $revenueModels->get($row->id);
                if (!$revenue) return null;
                return array_merge($revenue->withoutRelations()->toArray(), [
                    'kind' => 'revenue',
                    'client_name' => $revenue->booking?->client?->name,
                ]);
            }
            $expense = $expenseModels->get($row->id);
            return $expense ? array_merge($expense->toArray(), ['kind' => 'expense']) : null;
        })->filter()->values();

        return response()->json([
            'data' => $data,
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
        ]);
    }

    private function whereTab($query, string $column, array $map, string $defaultTab, string $tab): void
    {
        if (isset($map[$tab])) {
            $query->whereIn($column, $map[$tab]);
        } elseif ($tab === $defaultTab) {
            $query->where(fn ($q) => $q->whereNull($column)->orWhereNotIn($column, array_merge(...array_values($map))));
        } else {
            $query->whereRaw('1 = 0');
        }
    }

    private function whereSearch($query, string $search, string $textColumn, string $dateColumn, string $typeColumn, array $tabMap, string $defaultTab, bool $withClient): void
    {
        $like = '%' . addcslashes($search, '%_\\') . '%';
        $needle = mb_strtolower($search);
        $labelMatches = fn (array $labels) => array_keys(array_filter($labels, fn ($label) => str_contains(mb_strtolower($label), $needle)));

        $query->where(function ($q) use ($search, $like, $textColumn, $dateColumn, $typeColumn, $tabMap, $defaultTab, $withClient, $labelMatches) {
            $q->where($textColumn, 'like', $like);

            if ($withClient) {
                // Find matching clients once, then use the booking_id / client_id indexes (instead of a per-row EXISTS).
                $q->orWhereIn('booking_id', Booking::select('id')->whereIn(
                    'client_id',
                    Client::select('id')->where('name', 'like', $like)
                ));
            }

            foreach ($labelMatches(self::TAB_LABELS) as $tab) {
                $q->orWhere(fn ($t) => $this->whereTab($t, $typeColumn, $tabMap, $defaultTab, $tab));
            }

            if ($methods = $labelMatches(self::PAYMENT_METHOD_LABELS)) {
                $q->orWhereIn(DB::raw(self::NORMALIZED_METHOD_SQL), $methods);
            }

            $amount = str_replace([',', '+', ' '], '', $search);
            if (preg_match('/^-?\d+(\.\d+)?$/', $amount)) {
                $q->orWhereRaw('CAST(ABS(amount) AS CHAR) LIKE ?', ['%' . ltrim($amount, '-') . '%']);
            }

            // Dates are displayed as DD-MM-YYYY on the dashboard.
            if (preg_match('/^[\d\-]+$/', $search)) {
                $q->orWhereRaw("DATE_FORMAT({$dateColumn}, '%d-%m-%Y') LIKE ?", [$like]);
            }
        });
    }

    public function ledger(Request $request)
    {
        $query = FinanceTransaction::query();

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        if ($startDate = $request->input('start_date')) {
            $query->where('transaction_date', '>=', $startDate);
        }

        if ($endDate = $request->input('end_date')) {
            $query->where('transaction_date', '<=', $endDate);
        }

        return response()->json($query->orderByDesc('transaction_date')->paginate($request->input('per_page', 30)));
    }

    public function transfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_method' => 'required|string|max:100',
            'to_method' => 'required|string|max:100|different:from_method',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');

        $methodLabels = [
            'instapay' => 'إنستاباي',
            'vodafone_cash' => 'فودافون كاش',
            'cash' => 'كاش (نقدي)',
            'credit_card' => 'فيزا / كارت',
            'bank_transfer' => 'تحويل بنكي',
        ];

        $fromLabel = $methodLabels[$validated['from_method']] ?? $validated['from_method'];
        $toLabel = $methodLabels[$validated['to_method']] ?? $validated['to_method'];
        $notes = !empty($validated['notes']) ? " ({$validated['notes']})" : '';

        return DB::transaction(function () use ($validated, $receiptPath, $fromLabel, $toLabel, $notes) {
            $outDesc = "مناقلة مالية: تحويل إلى {$toLabel}{$notes}";
            $inDesc = "مناقلة مالية: وارد من {$fromLabel}{$notes}";

            $expense = Expense::create([
                'category' => 'transfer_out',
                'amount' => $validated['amount'],
                'payment_method' => $validated['from_method'],
                'description' => $outDesc,
                'date' => $validated['date'],
                'receipt_path' => $receiptPath,
            ]);

            $revenue = Revenue::create([
                'type' => 'transfer_in',
                'amount' => $validated['amount'],
                'payment_method' => $validated['to_method'],
                'notes' => $inDesc,
                'payment_date' => $validated['date'],
                'receipt_path' => $receiptPath,
            ]);

            \App\Services\ActivityLogger::log('مناقلة مالية بين الخزائن', 'Finance', null, [
                'amount' => $validated['amount'],
                'from' => $validated['from_method'],
                'to' => $validated['to_method'],
            ]);

            return response()->json([
                'message' => 'تم التحويل بين الخزائن بنجاح',
                'expense' => $expense,
                'revenue' => $revenue,
            ], 201);
        });
    }

    public function deposit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        $desc = "إيداع رصيد / تغذية خزينة" . (!empty($validated['notes']) ? ": {$validated['notes']}" : '');

        $revenue = Revenue::create([
            'type' => 'capital_deposit',
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'notes' => $desc,
            'payment_date' => $validated['date'],
            'receipt_path' => $receiptPath,
        ]);

        \App\Services\ActivityLogger::log('إيداع رصيد بالخزينة', 'Finance', $revenue->id, [
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
        ]);

        return response()->json([
            'message' => 'تم تسجيل الإيداع بنجاح',
            'revenue' => $revenue,
        ], 201);
    }

    public function withdraw(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_method' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'receipt' => 'nullable',
            'receipt_image' => 'nullable',
        ]);

        $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
        $desc = "مسحوبات / سحب رصيد" . (!empty($validated['notes']) ? ": {$validated['notes']}" : '');

        $expense = Expense::create([
            'category' => 'owner_withdrawal',
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
            'description' => $desc,
            'date' => $validated['date'],
            'receipt_path' => $receiptPath,
        ]);

        \App\Services\ActivityLogger::log('سحب رصيد / مصروفات إدارية', 'Finance', $expense->id, [
            'amount' => $validated['amount'],
            'payment_method' => $validated['payment_method'],
        ]);

        return response()->json([
            'message' => 'تم تسجيل السحب بنجاح',
            'expense' => $expense,
        ], 201);
    }

    public function summary(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        // Insurance is held money, not income: its refunds reduce the held amount instead of revenue
        $revQuery = Revenue::whereNotIn('type', ['insurance', 'security_deposit', 'insurance_refund', 'transfer_in', 'capital_deposit']);
        $expQuery = Expense::whereNotIn('category', ['owner_withdrawal', 'transfer_out', 'purchase']);
        $insQuery = Revenue::whereIn('type', ['insurance', 'security_deposit', 'insurance_refund']);

        if ($startDate) {
            $revQuery->where('payment_date', '>=', $startDate);
            $expQuery->where('date', '>=', $startDate);
            $insQuery->where('payment_date', '>=', $startDate);
        }

        if ($endDate) {
            $revQuery->where('payment_date', '<=', $endDate);
            $expQuery->where('date', '<=', $endDate);
            $insQuery->where('payment_date', '<=', $endDate);
        }

        $netRevenue = $revQuery->sum('amount');
        $netExpense = $expQuery->sum('amount');
        $heldInsurances = $insQuery->sum('amount');
        $totalAssets = \App\Models\Dress::sum('purchase_price');
        $netProfit = $netRevenue - $netExpense;

        // Per payment method totals over all revenues/expenses in the period.
        $byMethod = function ($query, string $dateColumn) use ($startDate, $endDate) {
            if ($startDate) $query->where($dateColumn, '>=', $startDate);
            if ($endDate) $query->where($dateColumn, '<=', $endDate);
            return $query->selectRaw(self::NORMALIZED_METHOD_SQL . ' as method, SUM(amount) as total, COUNT(*) as count')
                ->groupBy('method')->get()->keyBy('method');
        };
        $revenueByMethod = $byMethod(Revenue::query(), 'payment_date');
        $expenseByMethod = $byMethod(Expense::query(), 'date');

        $paymentBreakdown = [];
        foreach ($revenueByMethod->keys()->merge($expenseByMethod->keys())->unique() as $method) {
            $paymentBreakdown[$method] = [
                'income' => round((float) ($revenueByMethod[$method]->total ?? 0), 2),
                'outcome' => round((float) ($expenseByMethod[$method]->total ?? 0), 2),
                'count' => (int) ($revenueByMethod[$method]->count ?? 0) + (int) ($expenseByMethod[$method]->count ?? 0),
            ];
        }

        return response()->json([
            'payment_breakdown' => $paymentBreakdown,
            'net_revenue' => round($netRevenue, 2),
            'net_expense' => round($netExpense, 2),
            'net_profit' => round($netProfit, 2),
            'held_insurances' => round($heldInsurances, 2),
            'total_assets' => round($totalAssets, 2),
        ]);
    }
}
