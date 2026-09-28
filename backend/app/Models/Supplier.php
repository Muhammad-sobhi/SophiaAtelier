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
        $purchases = $this->purchases_total ?? $this->purchases()->sum('total_amount');
        $payments = $this->payments_total ?? $this->payments()->sum('amount');
        return round((float) $payments - (float) $purchases, 2);
    }
}
