<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Material;
use App\Models\MaterialMovement;
use App\Models\MaterialPurchase;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Models\Worker;
use App\Models\WorkerPayment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Stock and money rules of the manufacturing department.
 * - Stock changes only through material_movements; materials.quantity is kept in sync here.
 * - Money that leaves the shop is written as an Expense (shown in the finance page) and linked
 *   back through expense_id, so deleting the source row also removes its finance entry.
 */
class ManufacturingService
{
    /** Expense categories written by this department (finance "manufacturing" tab) */
    public const EXPENSE_CATEGORIES = ['materials', 'supplier_payment', 'manufacturing_wages'];

    /**
     * @param array{supplier_id: ?int, purchase_date: string, items: array, paid_amount?: float, payment_method?: string, notes?: ?string} $data
     */
    public function createPurchase(array $data, ?int $userId): MaterialPurchase
    {
        return DB::transaction(function () use ($data, $userId) {
            $total = round(collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']), 2);
            $supplier = !empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
            $method = $data['payment_method'] ?? 'cash';

            $purchase = MaterialPurchase::create([
                'supplier_id' => $supplier?->id,
                'purchase_date' => $data['purchase_date'],
                'total_amount' => $total,
                'notes' => $data['notes'] ?? null,
            ]);

            $names = [];
            foreach ($data['items'] as $item) {
                $material = Material::lockForUpdate()->findOrFail($item['material_id']);
                $purchase->items()->create($item);
                $this->addStock($material, (float) $item['quantity'], (float) $item['unit_price']);
                MaterialMovement::create([
                    'material_id' => $material->id,
                    'type' => 'purchase',
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_price'],
                    'movement_date' => $data['purchase_date'],
                    'material_purchase_id' => $purchase->id,
                    'user_id' => $userId,
                ]);
                $names[] = $material->name;
            }
            $description = 'شراء خامات: ' . implode('، ', array_unique($names));

            if ($supplier) {
                // Bought on credit: only what was paid now leaves the cash box
                $paid = round((float) ($data['paid_amount'] ?? 0), 2);
                if ($paid > 0) {
                    $this->paySupplier($supplier, [
                        'amount' => $paid,
                        'payment_method' => $method,
                        'payment_date' => $data['purchase_date'],
                        'notes' => $description,
                        'material_purchase_id' => $purchase->id,
                    ]);
                }
            } else {
                // No supplier = bought for cash on the spot
                $expense = Expense::create([
                    'category' => 'materials',
                    'amount' => $total,
                    'payment_method' => $method,
                    'date' => $data['purchase_date'],
                    'description' => $description,
                ]);
                $purchase->update(['expense_id' => $expense->id]);
            }

            return $purchase->load('items.material', 'supplier');
        });
    }

    public function deletePurchase(MaterialPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $item) {
                $material = Material::lockForUpdate()->find($item->material_id);
                if ($material && (float) $material->quantity < (float) $item->quantity) {
                    throw ValidationException::withMessages([
                        'purchase' => "لا يمكن حذف الفاتورة: تم استخدام جزء من خامة \"{$material->name}\" بالفعل",
                    ]);
                }
                $material?->decrement('quantity', $item->quantity);
            }

            foreach ($purchase->payments as $payment) {
                $this->deleteSupplierPayment($payment);
            }
            $expenseId = $purchase->expense_id;
            $purchase->delete(); // items + purchase movements cascade
            if ($expenseId) {
                Expense::whereKey($expenseId)->delete();
            }
        });
    }

    /** Take material out of stock for a manufacturing order or a dress maintenance */
    public function consume(Material $material, float $quantity, string $type, string $date, array $refs, ?int $userId, ?string $notes = null): MaterialMovement
    {
        return DB::transaction(function () use ($material, $quantity, $type, $date, $refs, $userId, $notes) {
            $material = Material::lockForUpdate()->findOrFail($material->id);
            if ($quantity > (float) $material->quantity) {
                $unit = Material::UNITS[$material->unit] ?? $material->unit;
                throw ValidationException::withMessages([
                    'quantity' => "الكمية المتاحة من \"{$material->name}\" هي {$material->quantity} {$unit} فقط",
                ]);
            }

            $material->decrement('quantity', $quantity);

            return MaterialMovement::create([
                'material_id' => $material->id,
                'type' => $type,
                'quantity' => -$quantity,
                'unit_cost' => $material->avg_cost,
                'movement_date' => $date,
                'manufacturing_order_id' => $refs['manufacturing_order_id'] ?? null,
                'dress_id' => $refs['dress_id'] ?? null,
                'user_id' => $userId,
                'notes' => $notes,
            ]);
        });
    }

    /** Undo a consumption / adjustment: the quantity goes back to (or out of) stock */
    public function deleteMovement(MaterialMovement $movement): void
    {
        if ($movement->type === 'purchase') {
            throw ValidationException::withMessages(['movement' => 'حركة الشراء تُحذف من فاتورة الشراء نفسها']);
        }
        if ($movement->manufacturingOrder?->status === 'approved') {
            throw ValidationException::withMessages(['movement' => 'لا يمكن تعديل خامات أمر تصنيع معتمد']);
        }
        DB::transaction(function () use ($movement) {
            $material = Material::lockForUpdate()->findOrFail($movement->material_id);
            if ((float) $material->quantity - (float) $movement->quantity < 0) {
                throw ValidationException::withMessages(['movement' => 'لا يمكن التراجع: الكمية في المخزن لا تكفي']);
            }
            $material->decrement('quantity', $movement->quantity);
            $movement->delete();
        });
    }

    /** Stock count: record the difference between the counted and the system quantity */
    public function adjust(Material $material, float $countedQuantity, string $date, ?int $userId, ?string $notes): ?MaterialMovement
    {
        return DB::transaction(function () use ($material, $countedQuantity, $date, $userId, $notes) {
            $material = Material::lockForUpdate()->findOrFail($material->id);
            $diff = round($countedQuantity - (float) $material->quantity, 2);
            if ($diff == 0) {
                return null;
            }
            $material->update(['quantity' => $countedQuantity]);

            return MaterialMovement::create([
                'material_id' => $material->id,
                'type' => 'adjustment',
                'quantity' => $diff,
                'unit_cost' => $material->avg_cost,
                'movement_date' => $date,
                'user_id' => $userId,
                'notes' => $notes,
            ]);
        });
    }

    public function paySupplier(Supplier $supplier, array $data): SupplierPayment
    {
        return DB::transaction(function () use ($supplier, $data) {
            $expense = Expense::create([
                'category' => 'supplier_payment',
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'date' => $data['payment_date'],
                'description' => 'دفعة للمورد: ' . $supplier->name . (!empty($data['notes']) ? ' - ' . $data['notes'] : ''),
            ]);

            return $supplier->payments()->create([
                'material_purchase_id' => $data['material_purchase_id'] ?? null,
                'expense_id' => $expense->id,
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'payment_date' => $data['payment_date'],
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    public function deleteSupplierPayment(SupplierPayment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $expenseId = $payment->expense_id;
            $payment->delete();
            if ($expenseId) {
                Expense::whereKey($expenseId)->delete();
            }
        });
    }

    public function payWorker(Worker $worker, array $data): WorkerPayment
    {
        return DB::transaction(function () use ($worker, $data) {
            $label = WorkerPayment::TYPES[$data['type']] ?? $data['type'];
            $expense = Expense::create([
                'category' => 'manufacturing_wages',
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'date' => $data['payment_date'],
                'description' => "{$label} - {$worker->name}" . (!empty($data['period']) ? " ({$data['period']})" : '') . (!empty($data['notes']) ? ' - ' . $data['notes'] : ''),
            ]);

            return $worker->payments()->create($data + ['expense_id' => $expense->id]);
        });
    }

    public function deleteWorkerPayment(WorkerPayment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $expenseId = $payment->expense_id;
            $payment->delete();
            if ($expenseId) {
                Expense::whereKey($expenseId)->delete();
            }
        });
    }

    /** Is this expense row owned by the manufacturing department (edited/deleted from there only)? */
    public static function ownsExpense(Expense $expense): bool
    {
        return SupplierPayment::where('expense_id', $expense->id)->exists()
            || WorkerPayment::where('expense_id', $expense->id)->exists()
            || MaterialPurchase::where('expense_id', $expense->id)->exists();
    }

    /** Weighted average cost keeps the value of what's already in stock */
    private function addStock(Material $material, float $quantity, float $unitPrice): void
    {
        $current = max(0, (float) $material->quantity);
        $newQuantity = $current + $quantity;
        $avg = $newQuantity > 0
            ? (($current * (float) $material->avg_cost) + ($quantity * $unitPrice)) / $newQuantity
            : $unitPrice;
        $material->update(['quantity' => (float) $material->quantity + $quantity, 'avg_cost' => round($avg, 2)]);
    }
}
