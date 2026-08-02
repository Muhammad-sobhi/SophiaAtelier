<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'phone', 'email', 'address', 'city', 'source', 'wedding_date', 'notes', 'image_path'];

    protected $appends = ['visits_count', 'total_bookings', 'current_stage', 'latest_visit_date', 'latest_visit_time', 'latest_dress_name', 'latest_dress_trying_fee', 'wedding_date'];

    public function getWeddingDateAttribute(): ?string
    {
        if (!empty($this->attributes['wedding_date'])) {
            try {
                return \Carbon\Carbon::parse($this->attributes['wedding_date'])->format('Y-m-d');
            } catch (\Exception $e) {
                return explode(' ', $this->attributes['wedding_date'])[0];
            }
        }
        $booking = $this->relationLoaded('bookings') ? $this->bookings->sortByDesc('id')->first() : $this->bookings()->latest()->first();
        if (!$booking || empty($booking->event_date)) return null;
        try {
            return \Carbon\Carbon::parse($booking->event_date)->format('Y-m-d');
        } catch (\Exception $e) {
            return explode(' ', $booking->event_date)[0];
        }
    }

    public function getLatestVisitDateAttribute(): ?string
    {
        $visit = $this->relationLoaded('visits') ? $this->visits->sortByDesc('id')->first() : $this->visits()->latest()->first();
        if (!$visit || empty($visit->visit_date)) return null;
        try {
            return \Carbon\Carbon::parse($visit->visit_date)->format('Y-m-d');
        } catch (\Exception $e) {
            return explode(' ', $visit->visit_date)[0];
        }
    }

    public function getLatestVisitTimeAttribute(): string
    {
        $visit = $this->relationLoaded('visits') ? $this->visits->sortByDesc('id')->first() : $this->visits()->latest()->first();
        
        $rawSlot = $visit ? $visit->time_slot : null;
        if (!empty($rawSlot)) {
            try {
                if (preg_match('/^([0-1]?\d|2[0-3]):([0-5]\d)$/', trim($rawSlot), $m)) {
                    $h = (int) $m[1];
                    $min = $m[2];
                    $isPm = $h >= 12;
                    $h12 = $h % 12 === 0 ? 12 : $h % 12;
                    $pAr = $isPm ? 'م' : 'ص';
                    $pEn = $isPm ? 'PM' : 'AM';
                    return sprintf('%02d:%s %s (%02d:%s %s)', $h12, $min, $pAr, $h12, $min, $pEn);
                }
                $dt = \Carbon\Carbon::parse($rawSlot);
                $period = $dt->format('A') === 'PM' ? 'م' : 'ص';
                return $dt->format('h:i') . ' ' . $period . ' (' . $dt->format('h:i A') . ')';
            } catch (\Exception $e) {
                return $rawSlot;
            }
        }

        $notes = ($visit ? $visit->notes : '') . ' ' . ($this->notes ?? '');
        if (preg_match('/(?:وقت المقابلة:?\s*)?([0-1]?\d:[0-5]\d(?:\s*(?:م|ص|AM|PM|am|pm))?)/i', $notes, $m)) {
            $raw = trim($m[1]);
            try {
                $dt = \Carbon\Carbon::parse($raw);
                $period = $dt->format('A') === 'PM' ? 'م' : 'ص';
                return $dt->format('h:i') . ' ' . $period . ' (' . $dt->format('h:i A') . ')';
            } catch (\Exception $e) {
                return $raw;
            }
        }
        return 'خلال أوقات العمل الرسمية (من ١:٠٠ م حتى ٨:٣٠ م)';
    }

    public function getLatestDressNameAttribute(): ?string
    {
        $booking = $this->relationLoaded('bookings') ? $this->bookings->sortByDesc('created_at')->first() : $this->bookings()->latest()->first();
        return $booking && $booking->dress ? $booking->dress->name : null;
    }

    public function getLatestDressTryingFeeAttribute(): float
    {
        $booking = $this->relationLoaded('bookings') ? $this->bookings->sortByDesc('created_at')->first() : $this->bookings()->latest()->first();
        return $booking && $booking->dress ? (float) ($booking->dress->trying_fee ?? 0) : 0;
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function fittings(): HasManyThrough
    {
        return $this->hasManyThrough(Fitting::class, Booking::class);
    }

    public function getVisitsCountAttribute(): int
    {
        if (array_key_exists('visits_count', $this->attributes)) {
            return (int) $this->attributes['visits_count'];
        }
        if ($this->relationLoaded('visits')) {
            return $this->visits->count();
        }
        return $this->visits()->count();
    }

    public function getTotalBookingsAttribute(): int
    {
        if (array_key_exists('bookings_count', $this->attributes)) {
            return (int) $this->attributes['bookings_count'];
        }
        if ($this->relationLoaded('bookings')) {
            return $this->bookings->count();
        }
        return $this->bookings()->count();
    }

    /**
     * Compute the bride's current stage in her journey:
     * 1. Visit -> 2. Booking -> 3. Fitting -> 4. Picked Up -> 5. Returned
     */
    public function getCurrentStageAttribute(): string
    {
        // Load relationships
        $bookingsList = $this->relationLoaded('bookings') ? $this->bookings : $this->bookings()->get();
        $visitsList = $this->relationLoaded('visits') ? $this->visits : $this->visits()->get();
        $fittingsList = $this->relationLoaded('fittings') ? $this->fittings : $this->fittings()->get();

        // 1. Returned stage (when booking is marked returned)
        if ($bookingsList->contains('status', 'returned')) {
            return 'returned';
        }

        // 2. Picked up stage (when booking is marked picked_up/out OR when all fittings are completed)
        $hasCompletedFittings = $fittingsList->count() > 0 && $fittingsList->every('status', 'completed');
        if ($bookingsList->contains('status', 'picked_up') || $bookingsList->contains('status', 'out') || $hasCompletedFittings) {
            return 'picked_up';
        }

        // 3. Fitting stage (when fittings exist for the bride, e.g. scheduled or in progress)
        if ($fittingsList->count() > 0) {
            return 'fitting';
        }

        // 4. Booking stage (when booking is confirmed by staff)
        if ($bookingsList->contains('status', 'confirmed')) {
            return 'booking';
        }

        // 5. Default stage: Visit (for all new website leads & appointment requests)
        return 'visit';
    }
}
