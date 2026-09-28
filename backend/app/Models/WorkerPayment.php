<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkerPayment extends Model
{
    public const TYPES = [
        'salary' => 'راتب شهري',
        'piece' => 'أجر قطعة',
        'advance' => 'سلفة',
        'bonus' => 'مكافأة',
    ];

    protected $fillable = ['worker_id', 'type', 'manufacturing_order_id', 'expense_id', 'amount', 'payment_method', 'payment_date', 'period', 'notes'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_date' => 'date:Y-m-d',
        ];
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }
}
