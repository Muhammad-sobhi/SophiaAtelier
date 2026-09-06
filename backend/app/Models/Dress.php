<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Dress extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code', 'name', 'name_ar', 'category_id', 'collection_id', 'designer_id', 'description', 'description_ar',
        'purchase_price', 'purchase_date', 'rental_price', 'trying_fee', 'status', 'size', 'weight_from', 'weight_to',
        'color', 'color_ar', 'fabric', 'fabric_ar', 'notes', 'new_collection', 'is_website_visible',
        'is_best_seller', 'best_seller_sort',
    ];

    protected function casts(): array
    {
        return [
            'purchase_price' => 'decimal:2',
            'purchase_date' => 'date',
            'rental_price' => 'decimal:2',
            'weight_from' => 'integer',
            'weight_to' => 'integer',
            'new_collection' => 'boolean',
            'is_website_visible' => 'boolean',
            'is_best_seller' => 'boolean',
            'best_seller_sort' => 'integer',
        ];
    }

    public function scopeBestSellers($query)
    {
        return $query->where('is_best_seller', true)->orderBy('best_seller_sort');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function designer(): BelongsTo
    {
        return $this->belongsTo(Designer::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(DressImage::class);
    }

    public function accessories(): HasMany
    {
        return $this->hasMany(DressAccessory::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
