<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinanceTransaction extends Model
{
    use HasFactory;

    protected $fillable = ['type', 'category', 'amount', 'description', 'reference_type', 'reference_id', 'transaction_date'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }
}
