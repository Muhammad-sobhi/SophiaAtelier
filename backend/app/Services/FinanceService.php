<?php

namespace App\Services;

use App\Models\Dress;
use App\Models\DressPurchase;
use App\Models\Expense;
use App\Models\ManufacturingOrder;
use App\Models\Material;
use App\Models\MaterialMovement;
use App\Models\Revenue;
use App\Models\Supplier;
use App\Models\Worker;
use Illuminate\Support\Facades\DB;

/**
 * The shop's numbers, all computed here (the dashboard only shows them).
 *
 * Every expense is one of:
 * - operating: running the shop (salaries, cleaning, rent, workshop salaries...) → reduces the operating profit
 * - capital:   buying things the shop keeps (dresses, materials stock, the piece pay that builds a dress)
 *              → leaves the cash box and becomes an asset, it does not reduce the profit
 * - financing: owner withdrawals and transfers between cash boxes → neither profit nor asset
 * - unclassified: old "purchase" entries waiting for the admin to choose operating or dress purchase;
 *              kept out of the profit as they always were, and reported so they get classified
 * Materials taken from stock for dress maintenance, stock count losses and materials of cancelled
 * manufacturing orders are operating costs too (their money was spent as capital when bought).
 */
class FinanceService
{
    public const CAPITAL_CATEGORIES = [DressPurchaseService::EXPENSE_CATEGORY, 'materials', 'supplier_payment', 'manufacturing_piece'];
    public const FINANCING_CATEGORIES = ['owner_withdrawal', 'transfer_out'];
    public const UNCLASSIFIED_CATEGORIES = ['purchase'];

    /** Revenue types that are not shop income: insurance is held money, transfers/deposits move money in */
    public const NON_INCOME_REVENUE_TYPES = ['insurance', 'security_deposit', 'insurance_refund', 'transfer_in', 'capital_deposit'];
    public const INSURANCE_REVENUE_TYPES = ['insurance', 'security_deposit', 'insurance_refund'];

    public static function expenseClass(?string $category): string
    {
        return match (true) {
            in_array($category, self::CAPITAL_CATEGORIES, true) => 'capital',
            in_array($category, self::FINANCING_CATEGORIES, true) => 'financing',
            in_array($category, self::UNCLASSIFIED_CATEGORIES, true) => 'unclassified',
            default => 'operating',
        };
    }

    public static function revenueClass(?string $type): string
    {
        return match (true) {
            in_array($type, self::INSURANCE_REVENUE_TYPES, true) => 'insurance',
            in_array($type, self::NON_INCOME_REVENUE_TYPES, true) => 'financing',
            default => 'income',
        };
    }

    /** Narrow an expense query to one class */
    public static function whereExpenseClass($query, string $class)
    {
        $nonOperating = array_merge(self::CAPITAL_CATEGORIES, self::FINANCING_CATEGORIES, self::UNCLASSIFIED_CATEGORIES);

        return match ($class) {
            'capital' => $query->whereIn('category', self::CAPITAL_CATEGORIES),
            'financing' => $query->whereIn('category', self::FINANCING_CATEGORIES),
            'unclassified' => $query->whereIn('category', self::UNCLASSIFIED_CATEGORIES),
            default => $query->where(fn ($q) => $q->whereNull('category')->orWhereNotIn('category', $nonOperating)),
        };
    }

    /** Narrow a revenue query to one class */
    public static function whereRevenueClass($query, string $class)
    {
        return match ($class) {
            'insurance' => $query->whereIn('type', self::INSURANCE_REVENUE_TYPES),
            'financing' => $query->whereIn('type', array_diff(self::NON_INCOME_REVENUE_TYPES, self::INSURANCE_REVENUE_TYPES)),
            default => $query->where(fn ($q) => $q->whereNull('type')->orWhereNotIn('type', self::NON_INCOME_REVENUE_TYPES)),
        };
    }

    /**
     * Period figures follow the date range (empty = all time); assets and what the shop owes are as of today.
     */
    public function summary(?string $startDate, ?string $endDate): array
    {
        $inRange = function ($query, string $column) use ($startDate, $endDate) {
            return $query->when($startDate, fn ($q) => $q->where($column, '>=', $startDate))
                ->when($endDate, fn ($q) => $q->where($column, '<=', $endDate));
        };
        $revenues = fn () => $inRange(Revenue::query(), 'payment_date');
        $expenses = fn () => $inRange(Expense::query(), 'date');

        // Operating profit
        $income = (float) self::whereRevenueClass($revenues(), 'income')->sum('amount');
        $operatingCash = (float) self::whereExpenseClass($expenses(), 'operating')->sum('amount');
        $stockUsage = $this->stockUsage($startDate, $endDate);
        $operatingExpense = $operatingCash + $stockUsage['total'];

        // Asset purchases by kind
        $capital = self::whereExpenseClass($expenses(), 'capital')
            ->selectRaw('category, SUM(amount) as total')->groupBy('category')->pluck('total', 'category');
        $capitalTotal = (float) $capital->sum();

        $unclassified = self::whereExpenseClass($expenses(), 'unclassified')->selectRaw('COUNT(*) as count, COALESCE(SUM(amount), 0) as total')->first();

        // Cash box: every movement in and out (transfers between boxes cancel out)
        $cashIn = (float) $revenues()->sum('amount');
        $cashOut = (float) $expenses()->sum('amount');

        $heldInsurances = (float) self::whereRevenueClass($revenues(), 'insurance')->sum('amount');

        $assets = $this->assets();
        $payables = $this->payables();

        return [
            // Operating profit (period)
            'net_revenue' => self::money($income),
            'net_expense' => self::money($operatingExpense),
            'net_profit' => self::money($income - $operatingExpense),
            'operating_expense_breakdown' => [
                'cash' => self::money($operatingCash),
                'stock_maintenance' => $stockUsage['maintenance'],
                'stock_adjustments' => $stockUsage['adjustment'],
                'stock_cancelled_orders' => $stockUsage['cancelled_orders'],
            ],

            // Asset purchases (period): cash out, not a loss
            'capital_spending' => self::money($capitalTotal),
            'capital_breakdown' => [
                'dresses' => self::money((float) ($capital[DressPurchaseService::EXPENSE_CATEGORY] ?? 0)),
                'materials' => self::money((float) ($capital['materials'] ?? 0) + (float) ($capital['supplier_payment'] ?? 0)),
                'manufacturing_piece' => self::money((float) ($capital['manufacturing_piece'] ?? 0)),
            ],
            'unclassified_purchases' => [
                'count' => (int) $unclassified->count,
                'total' => self::money((float) $unclassified->total),
            ],

            // Cash box (period)
            'cash_in' => self::money($cashIn),
            'cash_out' => self::money($cashOut),
            'net_cash_flow' => self::money($cashIn - $cashOut),
            'held_insurances' => self::money($heldInsurances),

            // As of today
            'total_assets' => $assets['dresses'],
            'assets' => $assets,
            'payables' => $payables,
        ];
    }

    /**
     * Value taken out of the materials stock as an operating cost in the period (quantity is negative on
     * the way out, so value = -quantity × unit cost; a stock count surplus lowers it).
     */
    private function stockUsage(?string $startDate, ?string $endDate): array
    {
        $value = fn ($query) => (float) $query
            ->when($startDate, fn ($q) => $q->where('movement_date', '>=', $startDate))
            ->when($endDate, fn ($q) => $q->where('movement_date', '<=', $endDate))
            ->sum(DB::raw('-quantity * unit_cost'));

        $maintenance = $value(MaterialMovement::where('type', 'maintenance'));
        $adjustment = $value(MaterialMovement::where('type', 'adjustment'));
        $cancelled = $value(MaterialMovement::where('type', 'manufacturing')
            ->whereIn('manufacturing_order_id', ManufacturingOrder::where('status', 'cancelled')->select('id')));

        return [
            'maintenance' => self::money($maintenance),
            'adjustment' => self::money($adjustment),
            'cancelled_orders' => self::money($cancelled),
            'total' => round($maintenance + $adjustment + $cancelled, 2),
        ];
    }

    /** What the shop owns, at cost */
    public function assets(): array
    {
        $dresses = (float) Dress::sum('purchase_price');
        $materials = (float) Material::sum(DB::raw('quantity * avg_cost'));

        // Pieces still in the workshop (not cancelled, no shop dress yet): materials used so far + the earned worker fee
        $openOrders = ManufacturingOrder::whereNull('dress_id')->where('status', '!=', 'cancelled');
        $wipMaterials = (float) MaterialMovement::where('type', 'manufacturing')
            ->whereIn('manufacturing_order_id', (clone $openOrders)->select('id'))
            ->sum(DB::raw('-quantity * unit_cost'));
        $wipFees = (float) (clone $openOrders)->whereIn('status', ['completed', 'approved'])->sum('worker_fee');
        $wip = $wipMaterials + $wipFees;

        return [
            'dresses' => self::money($dresses),
            'materials_stock' => self::money($materials),
            'work_in_progress' => self::money($wip),
            'total' => self::money($dresses + $materials + $wip),
        ];
    }

    /** What the shop still owes, as of today */
    public function payables(): array
    {
        // Material suppliers: invoices minus payments, per supplier (an overpaid supplier does not lower another's debt)
        $suppliers = Supplier::withBalance()->get()->sum(fn ($s) => max(0, -$s->balance));

        $dressPurchases = DressPurchase::with('payments:id,dress_purchase_id,amount,paid_date')->get()
            ->sum(fn ($p) => max(0, $p->remaining));

        // Workshop workers: piece fees earned on finished orders minus piece pay received
        $workers = Worker::withSum(['orders as piece_earned' => fn ($q) => $q->whereIn('status', ['completed', 'approved'])], 'worker_fee')
            ->withSum(['payments as piece_paid' => fn ($q) => $q->where('type', 'piece')], 'amount')
            ->get()
            ->sum(fn ($w) => max(0, (float) $w->piece_earned - (float) $w->piece_paid));

        return [
            'suppliers' => self::money($suppliers),
            'dress_purchases' => self::money($dressPurchases),
            'workers' => self::money($workers),
            'total' => self::money($suppliers + $dressPurchases + $workers),
        ];
    }

    private static function money(float $value): float
    {
        return round($value, 2) + 0.0;
    }
}
