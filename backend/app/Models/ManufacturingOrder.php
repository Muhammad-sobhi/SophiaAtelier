<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ManufacturingOrder extends Model
{
    public const STATUSES = [
        'planned' => 'مخطط',
        'in_progress' => 'قيد التصنيع',
        'completed' => 'انتهى التصنيع (بانتظار الموافقة)',
        'approved' => 'تمت الموافقة',
        'cancelled' => 'ملغي',
    ];

    protected $fillable = [
        'title', 'worker_id', 'status', 'start_date', 'due_date', 'completed_date',
        'worker_fee', 'dress_id', 'dress_auto_created', 'approved_by', 'approved_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'due_date' => 'date:Y-m-d',
            'completed_date' => 'date:Y-m-d',
            'worker_fee' => 'decimal:2',
            'approved_at' => 'datetime',
            'dress_auto_created' => 'boolean',
        ];
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /** Materials taken from stock for this order (quantities stored negative) */
    public function materialMovements(): HasMany
    {
        return $this->hasMany(MaterialMovement::class);
    }

    public function workerPayments(): HasMany
    {
        return $this->hasMany(WorkerPayment::class);
    }
}
