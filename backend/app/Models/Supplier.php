<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = ['name', 'phone', 'address', 'notes'];

    public function purchases(): HasMany
    {
        return $this->hasMany(MaterialPurchase::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SupplierPayment::class);
    }

    /** Adds purchases_total, payments_total (use ->balance after) */
    public function scopeWithBalance($query)
    {
        return $query->withSum('purchases as purchases_total', 'total_amount')
            ->withSum('payments as payments_total', 'amount');
    }

    /** Paid minus bought: negative = the shop still owes the supplier, positive = overpaid */
    public function getBalanceAttribute(): float
    {
        // withBalance() sets the totals to null when there are no rows, which means 0 — no need to re-query
        $purchases = array_key_exists('purchases_total', $this->attributes) ? $this->purchases_total : $this->purchases()->sum('total_amount');
        $payments = array_key_exists('payments_total', $this->attributes) ? $this->payments_total : $this->payments()->sum('amount');
        return round((float) $payments - (float) $purchases, 2);
    }
}
