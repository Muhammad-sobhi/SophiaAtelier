<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Material extends Model
{
    public const CATEGORIES = [
        'fabric' => 'أقمشة',
        'lace' => 'دانتيل',
        'beads' => 'خرز وترتر',
        'thread' => 'خيوط',
        'lining' => 'بطانة',
        'accessories' => 'إكسسوارات',
        'other' => 'أخرى',
    ];

    public const UNITS = [
        'meter' => 'متر',
        'piece' => 'قطعة',
        'kg' => 'كيلو',
        'gram' => 'جرام',
        'roll' => 'بكرة',
        'box' => 'علبة',
        'yard' => 'ياردة',
    ];

    protected $fillable = ['name', 'category', 'unit', 'color', 'quantity', 'min_quantity', 'avg_cost', 'supplier_id', 'notes'];

    protected $appends = ['is_low_stock'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'min_quantity' => 'decimal:2',
            'avg_cost' => 'decimal:2',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(MaterialMovement::class);
    }

    public function getIsLowStockAttribute(): bool
    {
        return (float) $this->min_quantity > 0 && (float) $this->quantity <= (float) $this->min_quantity;
    }
}
