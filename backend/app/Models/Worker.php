<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Worker extends Model
{
    public const PAY_TYPES = ['monthly', 'per_piece', 'both'];

    protected $fillable = ['name', 'phone', 'specialty', 'pay_type', 'monthly_salary', 'piece_rate', 'is_active', 'notes'];

    protected function casts(): array
    {
        return [
            'monthly_salary' => 'decimal:2',
            'piece_rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(ManufacturingOrder::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(WorkerPayment::class);
    }
}
