<?php

namespace App\Services;

use App\Models\DressPurchasePayment;
use App\Models\Notification;

/**
 * Notifications for unpaid dress purchase installments: once the day before, once on the due date,
 * and every day while overdue. Only employees with the finance page see them (NotificationController).
 */
class DuePaymentReminders
{
    public const TYPES = ['dress_payment_due_soon', 'dress_payment_due', 'dress_payment_overdue'];
    public const RELATED_TYPE = 'dress_purchase_payment';
    /** Due dates are Cairo days: "today" / "tomorrow" / overdue follow the shop's clock, not the app's UTC */
    public const TIMEZONE = 'Africa/Cairo';

    public static function today(): string
    {
        return now(self::TIMEZONE)->toDateString();
    }

    public function generate(): int
    {
        $today = self::today();
        $tomorrow = now(self::TIMEZONE)->addDay()->toDateString();
        $created = 0;

        $payments = DressPurchasePayment::with('purchase:id,dress_id,type,partner_name,supplier_id', 'purchase.dress:id,name,deleted_at', 'purchase.supplier:id,name')
            ->whereNull('paid_date')
            ->where('due_date', '<=', $tomorrow)
            ->get();

        foreach ($payments as $payment) {
            $due = $payment->due_date->toDateString();
            [$type, $when, $oncePerDay] = match (true) {
                $due === $tomorrow => ['dress_payment_due_soon', 'غداً', false],
                $due === $today => ['dress_payment_due', 'اليوم', false],
                default => ['dress_payment_overdue', "متأخرة منذ {$due}", true],
            };

            $exists = Notification::withTrashed()
                ->where('type', $type)
                ->where('related_type', self::RELATED_TYPE)
                ->where('related_id', $payment->id)
                ->when($oncePerDay, fn ($q) => $q->where('created_at', '>=', now(self::TIMEZONE)->startOfDay()->utc()))
                ->exists();
            if ($exists) {
                continue;
            }

            $purchase = $payment->purchase;
            $what = $purchase->type === 'shared'
                ? "نصيبنا في مشاركة فستان ({$purchase->dress?->name}) مع العروسة {$purchase->partner_name}"
                : "شراء فستان ({$purchase->dress?->name})";
            $supplier = $purchase->supplier?->name ? " — المورد: {$purchase->supplier->name}" : '';

            Notification::create([
                'type' => $type,
                'title' => "دفعة مستحقة {$when}: " . number_format((float) $payment->amount, 2) . ' ج.م',
                'message' => "دفعة {$what} بمبلغ " . number_format((float) $payment->amount, 2) . " ج.م، تاريخ الاستحقاق {$due}{$supplier}",
                'related_type' => self::RELATED_TYPE,
                'related_id' => $payment->id,
            ]);
            $created++;
        }

        return $created;
    }
}
