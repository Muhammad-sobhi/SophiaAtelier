<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A time-boxed promotion (Black Friday…) shown on the website; prices are never exposed */
class Offer extends Model
{
    public const TYPES = ['percentage', 'fixed', 'perk'];

    public const SCOPES = ['all', 'category', 'collection', 'dresses'];

    protected $fillable = [
        'name', 'name_ar', 'type', 'value', 'perk', 'perk_ar', 'scope', 'scope_id',
        'banner_text', 'banner_text_ar', 'starts_at', 'ends_at', 'is_active',
    ];

    protected $attributes = [
        'scope' => 'all',
        'is_active' => true,
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'scope_id' => 'integer',
        'starts_at' => 'date:Y-m-d',
        'ends_at' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    protected $appends = ['status'];

    public function dresses(): BelongsToMany
    {
        return $this->belongsToMany(Dress::class);
    }

    /** Bookings the offer brought in; cancelled ones do not count toward its results */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class)->where('status', '!=', 'cancelled');
    }

    /** Enabled offers whose date range includes today (Cairo time) */
    public function scopeRunning(Builder $query): Builder
    {
        $today = now('Africa/Cairo')->toDateString();

        return $query->where('is_active', true)
            ->whereDate('starts_at', '<=', $today)
            ->whereDate('ends_at', '>=', $today);
    }

    /** running, scheduled, ended or disabled, judged against today in Cairo */
    public function getStatusAttribute(): string
    {
        $today = now('Africa/Cairo')->toDateString();

        return match (true) {
            ! $this->is_active => 'disabled',
            $this->starts_at?->toDateString() > $today => 'scheduled',
            $this->ends_at?->toDateString() < $today => 'ended',
            default => 'running',
        };
    }

    /** Ids of the dresses this offer covers, or null when it covers every dress */
    public function coveredDressIds(): ?array
    {
        return match ($this->scope) {
            'category' => Dress::where('category_id', $this->scope_id)->pluck('id')->all(),
            'collection' => Dress::where('collection_id', $this->scope_id)->pluck('id')->all(),
            'dresses' => $this->dresses()->pluck('dresses.id')->all(),
            default => null,
        };
    }
}
