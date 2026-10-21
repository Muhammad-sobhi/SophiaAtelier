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

    public function secondBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'dress_2_id');
    }

    public function thirdBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'dress_3_id');
    }

    /**
     * [dress_id => 'booked'|'out'] from open bookings (main, second and third dress).
     * Creating a booking never sets dresses.status to 'booked', so the stored status alone misses booked dresses.
     */
    public static function openBookingStatuses(): array
    {
        $statuses = [];
        $openBookings = Booking::whereIn('status', ['confirmed', 'picked_up', 'out'])
            ->select('dress_id', 'dress_2_id', 'dress_3_id', 'status')
            ->get();
        foreach ($openBookings as $b) {
            foreach (array_filter([$b->dress_id, $b->dress_2_id, $b->dress_3_id]) as $dressId) {
                if ($b->status !== 'confirmed') {
                    $statuses[$dressId] = 'out';
                } elseif (!isset($statuses[$dressId])) {
                    $statuses[$dressId] = 'booked';
                }
            }
        }

        return $statuses;
    }

    /** 'available' | 'booked' | 'out' from openBookingStatuses(); a dress marked out/booked by hand keeps that status */
    public function currentStatus(array $openBookingStatuses): string
    {
        $fromBookings = $openBookingStatuses[$this->id] ?? null;
        if ($fromBookings === 'out' || $this->status === 'out') {
            return 'out';
        }

        return $fromBookings === 'booked' || $this->status === 'booked' ? 'booked' : 'available';
    }

    public function visitsAsTried()
    {
        return $this->belongsToMany(Visit::class, 'visit_dresses')
                    ->wherePivot('type', 'tried')
                    ->withPivot('type');
    }
}
