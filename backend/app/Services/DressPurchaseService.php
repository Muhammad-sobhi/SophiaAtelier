<?php

namespace App\Services;

use App\Models\Dress;
use App\Models\DressPurchase;
use App\Models\DressPurchasePayment;
use App\Models\Expense;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Money rules of dress purchases.
 * - amount (what the shop owes for the dress: the whole price, or our share when shared with a bride)
 *   = prior_paid + the scheduled payments, so the remaining balance and its due dates are always complete.
 * - Each paid installment is a "dress_purchase" expense (cash out, an asset purchase: not an operating expense).
 *   prior_paid was paid before the purchase was recorded here, so it writes no expense.
 * - The dress's purchase_price / purchase_date follow the purchase.
 */
class DressPurchaseService
{
    public const EXPENSE_CATEGORY = 'dress_purchase';

    public function save(?DressPurchase $purchase, array $data, ?int $userId): DressPurchase
    {
        return DB::transaction(function () use ($purchase, $data, $userId) {
            $this->checkTotals($data);

            $dress = Dress::withTrashed()->lockForUpdate()->findOrFail($data['dress_id']);
            $taken = DressPurchase::where('dress_id', $dress->id)->when($purchase, fn ($q) => $q->whereKeyNot($purchase->id))->exists();
            if ($taken) {
                throw ValidationException::withMessages(['dress_id' => 'هذا الفستان له بيانات شراء مسجلة بالفعل']);
            }

            $shared = $data['type'] === 'shared';
            $fields = [
                'dress_id' => $dress->id,
                'supplier_id' => $data['supplier_id'] ?? null,
                'type' => $data['type'],
                'partner_name' => $shared ? $data['partner_name'] : null,
                'dress_total_price' => $shared ? $data['dress_total_price'] : null,
                'amount' => $data['amount'],
                'prior_paid' => $data['prior_paid'] ?? 0,
                'purchase_date' => $data['purchase_date'],
                'notes' => $data['notes'] ?? null,
            ];
            if ($receipt = ReceiptStorage::saveData($data['receipt'] ?? null)) {
                $fields['receipt_path'] = $receipt;
            } elseif (!empty($data['remove_receipt'])) {
                $fields['receipt_path'] = null;
            }

            if ($purchase) {
                $purchase->update($fields);
            } else {
                $purchase = DressPurchase::create($fields + ['user_id' => $userId]);
            }

            $this->syncPayments($purchase, $data['payments'] ?? []);
            $dress->update(['purchase_price' => $purchase->amount, 'purchase_date' => $purchase->purchase_date]);

            return $this->load($purchase);
        });
    }

    public function delete(DressPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            foreach ($purchase->payments as $payment) {
                $this->removeExpense($payment);
            }
            $purchase->delete();
        });
    }

    /** Record an installment as paid: its expense is written on the paid date */
    public function pay(DressPurchasePayment $payment, array $data): DressPurchase
    {
        return DB::transaction(function () use ($payment, $data) {
            $payment = DressPurchasePayment::lockForUpdate()->findOrFail($payment->id);
            if ($payment->paid_date) {
                throw ValidationException::withMessages(['payment' => 'هذه الدفعة مسجلة كمدفوعة بالفعل']);
            }
            $payment->fill([
                'paid_date' => $data['paid_date'],
                'payment_method' => $data['payment_method'],
                'notes' => $data['notes'] ?? $payment->notes,
            ]);
            if ($receipt = ReceiptStorage::saveData($data['receipt'] ?? null)) {
                $payment->receipt_path = $receipt;
            }
            $payment->save();
            $this->writeExpense($payment);

            return $this->load($payment->purchase);
        });
    }

    /** Undo a payment: back to unpaid and its expense is removed */
    public function unpay(DressPurchasePayment $payment): DressPurchase
    {
        return DB::transaction(function () use ($payment) {
            $this->removeExpense($payment);
            $payment->update(['paid_date' => null, 'payment_method' => null]);

            return $this->load($payment->purchase);
        });
    }

    public function load(DressPurchase $purchase): DressPurchase
    {
        return $purchase->fresh(['dress:id,code,name,deleted_at', 'supplier:id,name', 'payments'])
            ->append(['paid_total', 'remaining', 'payment_status', 'next_due_date']);
    }

    public static function ownsExpense(Expense $expense): bool
    {
        return DressPurchasePayment::where('expense_id', $expense->id)->exists();
    }

    private function checkTotals(array $data): void
    {
        $amount = round((float) $data['amount'], 2);
        $prior = round((float) ($data['prior_paid'] ?? 0), 2);
        $scheduled = round(collect($data['payments'] ?? [])->sum(fn ($p) => (float) $p['amount']), 2);

        if ($prior > $amount) {
            throw ValidationException::withMessages(['prior_paid' => 'المدفوع سابقاً أكبر من المبلغ المطلوب']);
        }
        if (round($prior + $scheduled, 2) !== $amount) {
            $missing = round($amount - $prior - $scheduled, 2);
            throw ValidationException::withMessages(['payments' => $missing > 0
                ? "مجموع الدفعات أقل من المبلغ المطلوب بـ {$missing} ج.م — أضف دفعة بالباقي وتاريخ استحقاقها"
                : 'مجموع الدفعات أكبر من المبلغ المطلوب بـ ' . abs($missing) . ' ج.م']);
        }
        if ($data['type'] === 'shared' && (float) $data['dress_total_price'] < $amount) {
            throw ValidationException::withMessages(['dress_total_price' => 'إجمالي سعر الفستان لا يمكن أن يكون أقل من نصيبنا']);
        }
    }

    /** Rows with an id are updated (keeping their receipt), new rows created, missing rows removed with their expense */
    private function syncPayments(DressPurchase $purchase, array $rows): void
    {
        $existing = $purchase->payments()->get()->keyBy('id');
        $kept = [];

        foreach ($rows as $row) {
            $payment = null;
            if (!empty($row['id'])) {
                $payment = $existing->get($row['id']);
                if (!$payment) {
                    throw ValidationException::withMessages(['payments' => 'دفعة غير موجودة في هذه الفاتورة']);
                }
            }
            $payment ??= new DressPurchasePayment(['dress_purchase_id' => $purchase->id]);

            $paid = !empty($row['paid']);
            $payment->fill([
                'amount' => $row['amount'],
                'due_date' => $row['due_date'],
                'paid_date' => $paid ? $row['paid_date'] : null,
                'payment_method' => $paid ? $row['payment_method'] : null,
                'notes' => $row['notes'] ?? null,
            ]);
            if ($receipt = ReceiptStorage::saveData($row['receipt'] ?? null)) {
                $payment->receipt_path = $receipt;
            } elseif (!empty($row['remove_receipt'])) {
                $payment->receipt_path = null;
            }
            $payment->save();
            $payment->setRelation('purchase', $purchase);

            $paid ? $this->writeExpense($payment) : $this->removeExpense($payment);
            $kept[] = $payment->id;
        }

        foreach ($existing->except($kept) as $payment) {
            $this->removeExpense($payment);
            $payment->delete();
        }
    }

    private function writeExpense(DressPurchasePayment $payment): void
    {
        $purchase = $payment->purchase;
        $dressName = $purchase->dress()->value('name');
        $label = $purchase->type === 'shared'
            ? "مشاركة فستان مع العروسة {$purchase->partner_name}: {$dressName}"
            : "شراء فستان: {$dressName}";
        $supplier = $purchase->supplier()->value('name');

        $fields = [
            'category' => self::EXPENSE_CATEGORY,
            'amount' => $payment->amount,
            'payment_method' => $payment->payment_method,
            'date' => $payment->paid_date,
            'receipt_path' => $payment->receipt_path ?? $purchase->receipt_path,
            'description' => $label
                . ((float) $payment->amount < (float) $purchase->amount ? ' (دفعة جزئية)' : '')
                . ($supplier ? " — المورد: {$supplier}" : ''),
        ];

        $expense = $payment->expense_id ? Expense::find($payment->expense_id) : null;
        if ($expense) {
            $expense->update($fields);
        } else {
            $payment->update(['expense_id' => Expense::create($fields)->id]);
        }
    }

    private function removeExpense(DressPurchasePayment $payment): void
    {
        if ($expenseId = $payment->expense_id) {
            $payment->update(['expense_id' => null]);
            Expense::whereKey($expenseId)->delete();
        }
    }
}
