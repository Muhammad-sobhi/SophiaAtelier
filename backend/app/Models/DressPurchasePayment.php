<?php

namespace App\Models;

use App\Services\ReceiptStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One installment of a dress purchase; paid once paid_date is set (its expense is expense_id) */
class DressPurchasePayment extends Model
{
    protected $fillable = ['dress_purchase_id', 'amount', 'due_date', 'paid_date', 'payment_method', 'receipt_path', 'expense_id', 'notes'];

    protected $appends = ['receipt_url'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_date' => 'date:Y-m-d',
            'paid_date' => 'date:Y-m-d',
        ];
    }

    public function getReceiptUrlAttribute(): ?string
    {
        return ReceiptStorage::url($this->receipt_path);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(DressPurchase::class, 'dress_purchase_id');
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
