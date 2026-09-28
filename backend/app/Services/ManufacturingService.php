<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Designer;
use App\Models\Dress;
use App\Models\Expense;
use App\Models\ManufacturingOrder;
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
            $purchase = MaterialPurchase::create(['purchase_date' => $data['purchase_date'], 'total_amount' => 0]);
            $this->applyPurchase($purchase, $data, $userId);
            $this->recalculateMaterials(collect($data['items'])->pluck('material_id'));

            return $purchase->load('items.material', 'supplier');
        });
    }

    /**
     * Editing = the old invoice is fully undone (stock, average cost, finance entries, supplier balance)
     * and the new data is applied, as if the old version was never entered.
     */
    public function updatePurchase(MaterialPurchase $purchase, array $data, ?int $userId): MaterialPurchase
    {
        return DB::transaction(function () use ($purchase, $data, $userId) {
            $materialIds = $purchase->items()->pluck('material_id')->merge(collect($data['items'])->pluck('material_id'))->unique();
            $this->reversePurchase($purchase);
            $this->applyPurchase($purchase, $data, $userId);
            $this->recalculateMaterials($materialIds, 'لا يمكن حفظ التعديل: الكمية المستخدمة من خامة "%s" أكبر من الكمية الجديدة');

            return $purchase->load('items.material', 'supplier');
        });
    }

    public function deletePurchase(MaterialPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            $materialIds = $purchase->items()->pluck('material_id');
            $this->reversePurchase($purchase);
            $purchase->delete();
            $this->recalculateMaterials($materialIds, 'لا يمكن حذف الفاتورة: تم استخدام جزء من خامة "%s" بالفعل');
        });
    }

    /** Write the invoice lines, stock movements and the money side (supplier payment or cash expense) */
    private function applyPurchase(MaterialPurchase $purchase, array $data, ?int $userId): void
    {
        $total = round(collect($data['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_price']), 2);
        $supplier = !empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
        $method = $data['payment_method'] ?? 'cash';

        $purchase->update([
            'supplier_id' => $supplier?->id,
            'purchase_date' => $data['purchase_date'],
            'total_amount' => $total,
            'notes' => $data['notes'] ?? null,
        ]);

        $names = [];
        foreach ($data['items'] as $item) {
            $material = Material::findOrFail($item['material_id']);
            $purchase->items()->create([
                'material_id' => $material->id,
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
            ]);
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
            if ($paid > $total) {
                throw ValidationException::withMessages(['paid_amount' => 'المدفوع أكبر من إجمالي الفاتورة']);
            }
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
    }

    /** Remove everything an invoice wrote; the caller recalculates the affected materials */
    private function reversePurchase(MaterialPurchase $purchase): void
    {
        foreach ($purchase->payments()->get() as $payment) {
            $this->deleteSupplierPayment($payment);
        }
        $expenseId = $purchase->expense_id;
        if ($expenseId) {
            $purchase->update(['expense_id' => null]);
            Expense::whereKey($expenseId)->delete();
        }
        MaterialMovement::where('material_purchase_id', $purchase->id)->delete();
        $purchase->items()->delete();
    }

    /**
     * Rebuild quantity and weighted average cost of materials by replaying their movements in date order,
     * so an edited or deleted entry leaves no trace. Usage lines of orders not yet approved are re-costed too.
     */
    public function recalculateMaterials(iterable $materialIds, string $shortageMessage = 'الكمية في المخزن من خامة "%s" لا تكفي'): void
    {
        $materials = Material::whereIn('id', collect($materialIds)->unique()->values())->lockForUpdate()->get();
        foreach ($materials as $material) {
            $running = 0.0;
            $avg = 0.0;
            $movements = $material->movements()->with('manufacturingOrder:id,status')
                ->orderBy('movement_date')->orderBy('id')->get();

            foreach ($movements as $movement) {
                $quantity = (float) $movement->quantity;
                if ($movement->type === 'purchase') {
                    $base = max(0, $running);
                    $avg = ($base * $avg + $quantity * (float) $movement->unit_cost) / ($base + $quantity);
                } elseif ($quantity < 0 && $avg > 0 && $movement->manufacturingOrder?->status !== 'approved'
                    && round($avg, 2) != (float) $movement->unit_cost) {
                    $movement->update(['unit_cost' => round($avg, 2)]);
                }
                $running += $quantity;
            }

            if (round($running, 2) < 0) {
                throw ValidationException::withMessages(['quantity' => sprintf($shortageMessage, $material->name)]);
            }
            $material->update(['quantity' => round($running, 2), 'avg_cost' => round($avg, 2)]);
        }
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
            $materialId = $movement->material_id;
            $movement->delete();
            $this->recalculateMaterials([$materialId], 'لا يمكن التراجع: الكمية في المخزن من خامة "%s" لا تكفي');
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

    /**
     * Create the shop dress for an approved piece, pre-filled from the order, and link it.
     * It stays hidden from the website until staff complete its data in the dresses page.
     */
    public function createDressFromOrder(ManufacturingOrder $order): Dress
    {
        return DB::transaction(function () use ($order) {
            $order = ManufacturingOrder::lockForUpdate()->findOrFail($order->id);
            if ($order->dress_id && $order->dress) {
                return $order->dress;
            }

            $categoryId = Category::orderBy('id')->value('id');
            if (!$categoryId) {
                throw ValidationException::withMessages(['dress' => 'أضف تصنيفاً واحداً على الأقل في صفحة الفساتين أولاً']);
            }
            // Same default designer the dresses form uses for the shop's own pieces
            $designer = Designer::firstOrCreate(['name' => 'Esraa El Qsas'], ['name_ar' => 'اسراء القصاص']);

            $materials = $order->materialMovements()->with('material:id,name')->get();
            $materialsCost = $materials->sum(fn ($m) => -(float) $m->quantity * (float) $m->unit_cost);
            $materialNames = $materials->pluck('material.name')->filter()->unique()->implode('، ');

            $dress = Dress::create([
                'name' => $order->title,
                'name_ar' => $order->title,
                'category_id' => $categoryId,
                'designer_id' => $designer->id,
                'purchase_price' => (string) round($materialsCost + (float) $order->worker_fee, 2),
                'purchase_date' => $order->completed_date ?? now()->toDateString(),
                'status' => 'available',
                'is_website_visible' => false,
                'notes' => trim("تصنيع داخلي — أمر تصنيع #{$order->id}"
                    . ($materialNames ? "\nالخامات: {$materialNames}" : '')
                    . ($order->notes ? "\n{$order->notes}" : '')),
            ]);
            $order->update(['dress_id' => $dress->id, 'dress_auto_created' => true]);

            return $dress;
        });
    }

    /**
     * Delete an order that was not approved yet, as if it never existed: its materials go back to stock
     * and the worker payments recorded against it are removed with their finance entries.
     */
    public function deleteOrder(ManufacturingOrder $order): void
    {
        if ($order->status === 'approved') {
            throw ValidationException::withMessages(['order' => 'ألغِ الموافقة أولاً قبل حذف أمر التصنيع']);
        }
        DB::transaction(function () use ($order) {
            foreach ($order->workerPayments()->get() as $payment) {
                $this->deleteWorkerPayment($payment);
            }
            $materialIds = $order->materialMovements()->pluck('material_id');
            $order->materialMovements()->delete();
            $order->delete();
            $this->recalculateMaterials($materialIds);
        });
    }

    /** Undo an approval: back to "completed" and the dress created by the approval is removed */
    public function unapproveOrder(ManufacturingOrder $order): ManufacturingOrder
    {
        if ($order->status !== 'approved') {
            throw ValidationException::withMessages(['order' => 'أمر التصنيع غير معتمد']);
        }

        return DB::transaction(function () use ($order) {
            $dress = $order->dress;
            if ($dress && $order->dress_auto_created) {
                $isBooked = $dress->bookings()->exists() || $dress->secondBookings()->exists() || $dress->thirdBookings()->exists();
                if ($isBooked) {
                    throw ValidationException::withMessages(['order' => "لا يمكن إلغاء الموافقة: الفستان \"{$dress->name}\" عليه حجوزات"]);
                }
                $dress->update(['code' => null]);
                $dress->delete();
            }
            $order->update([
                'status' => 'completed',
                'approved_by' => null,
                'approved_at' => null,
                'dress_id' => null,
                'dress_auto_created' => false,
            ]);

            return $order;
        });
    }

    /** Is this expense row owned by the manufacturing department (edited/deleted from there only)? */
    public static function ownsExpense(Expense $expense): bool
    {
        return SupplierPayment::where('expense_id', $expense->id)->exists()
            || WorkerPayment::where('expense_id', $expense->id)->exists()
            || MaterialPurchase::where('expense_id', $expense->id)->exists();
    }
}
