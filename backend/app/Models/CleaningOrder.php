<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CleaningOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'description', 'cost', 'paid_amount', 'payment_status', 'date', 'notes'
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'date' => 'date',
        ];
    }
}
