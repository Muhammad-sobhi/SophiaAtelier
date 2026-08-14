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

    protected $fillable = ['name', 'phone', 'phone2', 'email', 'address', 'city', 'source', 'wedding_date', 'notes', 'image_path'];

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
        if (!$booking || empty($booking->event_date))
            return null;
        try {
            return \Carbon\Carbon::parse($booking->event_date)->format('Y-m-d');
        } catch (\Exception $e) {
            return explode(' ', $booking->event_date)[0];
        }
    }

    public function getLatestVisitDateAttribute(): ?string
    {
        $visit = $this->relationLoaded('visits') ? $this->visits->sortByDesc('id')->first() : $this->visits()->latest()->first();
        if (!$visit || empty($visit->visit_date))
            return null;
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
     * Compute the bride's current stage in her journey based on status and dates:
     * 1. Returned (إرجاع الفستان)
     * 2. Picked Up (استلام الفستان)
     * 3. Fitting (غرفة القياس / البروفة)
     * 4. Booking (حجز)
     * 5. Visit (طلب زيارة)
     */
    public function getCurrentStageAttribute(): string
    {
        $bookingsList = $this->relationLoaded('bookings') ? $this->bookings : $this->bookings()->get();
        $visitsList = $this->relationLoaded('visits') ? $this->visits : $this->visits()->get();
        $fittingsList = $this->relationLoaded('fittings') ? $this->fittings : $this->fittings()->get();

        // 1. Returned stage
        if ($bookingsList->contains('status', 'returned')) {
            return 'returned';
        }

        // Check latest active booking
        $latestBooking = $bookingsList->sortByDesc('id')->first();
        $today = \Carbon\Carbon::today()->format('Y-m-d');

        if ($latestBooking) {
            // Check status or date rules
            if ($latestBooking->status === 'picked_up' || $latestBooking->status === 'out') {
                return 'picked_up';
            }

            // Extract return / pickup date from notes if saved during excel import
            $notes = $latestBooking->notes ?? '';
            $isExcelImport = ($this->source === 'excel_import' || str_contains($notes, 'استيراد') || str_contains($notes, 'يوم الاستلام:'));

            if ($isExcelImport) {
                $returnDate = null;
                $pickupDate = null;

                if (preg_match('/(?:يوم|ميعاد)\s*التسليم:\s*(\d{4}-\d{2}-\d{2})/u', $notes, $m)) {
                    $returnDate = $m[1];
                }
                if (preg_match('/(?:يوم|ميعاد)\s*الاستلام:\s*(\d{4}-\d{2}-\d{2})/u', $notes, $m)) {
                    $pickupDate = $m[1];
                }

                // Calculate return date (1 day after wedding date if returnDate not explicitly set)
                if (!$returnDate && !empty($latestBooking->event_date)) {
                    $wedding = \Carbon\Carbon::parse($latestBooking->event_date);
                    $returnDate = $wedding->addDay()->format('Y-m-d');
                }

                // Fallback pickupDate calculation from event_date if missing in notes string
                if (!$pickupDate && !empty($latestBooking->event_date)) {
                    $evt = \Carbon\Carbon::parse($latestBooking->event_date);
                    $bCity = $this->city ?? 'القاهرة';
                    $isCairoOrGiza = (! $bCity || stripos($bCity, 'cairo') !== false || stripos($bCity, 'giza') !== false || $bCity === 'القاهرة' || $bCity === 'الجيزة');
                    $daysBefore = $isCairoOrGiza ? 1 : 2;
                    $pickupDate = $evt->copy()->subDays($daysBefore)->format('Y-m-d');
                }

                // Apply Excel import rules ONLY for Excel imported data:
                if ($pickupDate) {
                    if ($pickupDate < '2026-08-02') {
                        if ($returnDate && $returnDate <= $today) {
                            return 'returned';
                        } else {
                            return 'picked_up';
                        }
                    } elseif ($pickupDate >= '2026-08-02' && $pickupDate <= '2026-08-10') {
                        return 'picked_up';
                    } else {
                        return 'fitting';
                    }
                }
            }

            // Normal System Bookings (Not Excel import)
            if (!empty($latestBooking->event_date)) {
                $calcReturn = \Carbon\Carbon::parse($latestBooking->event_date)->addDay()->format('Y-m-d');
                if ($calcReturn <= $today) {
                    return 'returned';
                }
            }

            // If a fitting is scheduled for this client/booking, move to fitting stage
            if ($fittingsList->count() > 0) {
                return 'fitting';
            }

            // Only stay in 'booking' stage if the booking is confirmed and no fitting is scheduled yet
            if ($latestBooking->status === 'confirmed') {
                return 'booking';
            }
        }

        // 2. Fitting stage (if fittings exist without booking)
        if ($fittingsList->count() > 0) {
            return 'fitting';
        }

        // 3. Visit stage (if visits exist or default)
        return 'visit';
    }
}
