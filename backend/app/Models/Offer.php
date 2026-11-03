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
        'banner_text', 'banner_text_ar', 'terms', 'terms_ar', 'starts_at', 'ends_at', 'visible_from',
        'wedding_from', 'wedding_until', 'is_active',
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
        'visible_from' => 'date:Y-m-d',
        'wedding_from' => 'date:Y-m-d',
        'wedding_until' => 'date:Y-m-d',
        'is_active' => 'boolean',
    ];

    protected $appends = ['status', 'on_website'];

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

    /** Offers the website shows: enabled, announced (from visible_from, else the start day) and not ended */
    public function scopeOnWebsite(Builder $query): Builder
    {
        $today = now('Africa/Cairo')->toDateString();

        return $query->where('is_active', true)
            ->whereDate('ends_at', '>=', $today)
            ->where(fn (Builder $q) => $q->whereDate('visible_from', '<=', $today)
                ->orWhere(fn (Builder $q) => $q->whereNull('visible_from')->whereDate('starts_at', '<=', $today)));
    }

    /**
     * The enabled offer that lets a visit on its days be more than 4 months before the wedding: the wedding
     * falls in the offer's wedding range (wedding_until set) and one of the dresses is covered.
     */
    public static function openingVisitWindow($visitDate, $weddingDate, array $dressIds): ?self
    {
        $dressIds = array_map('intval', array_filter($dressIds));
        if (empty($visitDate) || empty($weddingDate) || ! $dressIds) {
            return null;
        }
        $visit = \Carbon\Carbon::parse($visitDate)->toDateString();
        $wedding = \Carbon\Carbon::parse($weddingDate)->toDateString();

        return self::where('is_active', true)
            ->whereDate('starts_at', '<=', $visit)->whereDate('ends_at', '>=', $visit)
            ->whereDate('wedding_until', '>=', $wedding)
            ->where(fn (Builder $q) => $q->whereNull('wedding_from')->orWhereDate('wedding_from', '<=', $wedding))
            ->get()
            ->first(fn (self $offer) => ($covered = $offer->coveredDressIds()) === null || array_intersect($dressIds, $covered));
    }

    /** Whether a wedding on this date may take the offer; without a wedding range every wedding may */
    public function coversWedding($weddingDate): bool
    {
        if (! $this->wedding_from && ! $this->wedding_until) {
            return true;
        }
        if (empty($weddingDate)) {
            return false;
        }
        $wedding = \Carbon\Carbon::parse($weddingDate)->toDateString();

        return (! $this->wedding_from || $this->wedding_from->toDateString() <= $wedding)
            && (! $this->wedding_until || $this->wedding_until->toDateString() >= $wedding);
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

    /** Whether the website shows it today (same rule as scopeOnWebsite) */
    public function getOnWebsiteAttribute(): bool
    {
        $today = now('Africa/Cairo')->toDateString();

        return $this->is_active
            && $this->ends_at?->toDateString() >= $today
            && ($this->visible_from ?? $this->starts_at)?->toDateString() <= $today;
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
