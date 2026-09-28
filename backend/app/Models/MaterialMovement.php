<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialMovement extends Model
{
    public const TYPES = [
        'purchase' => 'شراء',
        'manufacturing' => 'تصنيع',
        'maintenance' => 'صيانة فستان',
        'adjustment' => 'تسوية جرد',
    ];

    protected $fillable = [
        'material_id', 'type', 'quantity', 'unit_cost', 'movement_date',
        'material_purchase_id', 'manufacturing_order_id', 'dress_id', 'user_id', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'movement_date' => 'date:Y-m-d',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class);
    }

    public function manufacturingOrder(): BelongsTo
    {
        return $this->belongsTo(ManufacturingOrder::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
