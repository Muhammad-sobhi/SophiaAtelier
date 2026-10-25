<?php

namespace App\Models;

use App\Services\ReceiptStorage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * What the shop pays for a dress: the whole price (purchase) or our share of a dress bought with a bride (shared).
 * amount = prior_paid + the scheduled payments; the dress's purchase_price follows amount.
 */
class DressPurchase extends Model
{
    public const TYPES = ['purchase' => 'شراء فستان', 'shared' => 'مشاركة فستان مع عروسة'];

    protected $fillable = [
        'dress_id', 'supplier_id', 'type', 'partner_name', 'dress_total_price', 'amount', 'prior_paid',
        'purchase_date', 'receipt_path', 'notes', 'user_id',
    ];

    protected $appends = ['receipt_url'];

    protected function casts(): array
    {
        return [
            'dress_total_price' => 'decimal:2',
            'amount' => 'decimal:2',
            'prior_paid' => 'decimal:2',
            'purchase_date' => 'date:Y-m-d',
        ];
    }

    public function getReceiptUrlAttribute(): ?string
    {
        return ReceiptStorage::url($this->receipt_path);
    }

    /** Paid so far: what was paid before recording plus the paid installments */
    public function getPaidTotalAttribute(): float
    {
        return round((float) $this->prior_paid + $this->payments->whereNotNull('paid_date')->sum(fn ($p) => (float) $p->amount), 2);
    }

    public function getRemainingAttribute(): float
    {
        return round((float) $this->amount - $this->paid_total, 2);
    }

    /** paid | partial | unpaid */
    public function getPaymentStatusAttribute(): string
    {
        if ($this->remaining <= 0) return 'paid';
        return $this->paid_total > 0 ? 'partial' : 'unpaid';
    }

    public function getNextDueDateAttribute(): ?string
    {
        return $this->payments->whereNull('paid_date')->sortBy('due_date')->first()?->due_date?->toDateString();
    }

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class)->withTrashed();
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(DressPurchasePayment::class)->orderBy('due_date')->orderBy('id');
    }
}
