<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'dress_id', 'dress_2_id', 'dress_3_id', 'booking_date', 'event_date',
        'pickup_scheduled_on', 'return_scheduled_on',
        'status', 'total_amount', 'deposit_amount', 'insurance_amount', 'notes',
        'receipt_path', 'bill_image_path', 'payment_method', 'sales_name', 'is_override',
        'cancelled_at', 'cancelled_by', 'cancelled_by_name', 'cancelled_stage',
        'cancellation_reason', 'cancellation_note',
    ];

    /** Allowed cancellation reasons (key => Arabic label shown in the dashboard) */
    public const CANCELLATION_REASONS = [
        'wedding_cancelled' => 'إلغاء الفرح',
        'wedding_postponed' => 'تأجيل الفرح',
        'other_shop' => 'اختارت محل آخر',
        'financial' => 'ظروف مادية',
        'unhappy_dress' => 'غير راضية عن الفستان',
        'other' => 'سبب آخر',
    ];

    protected $appends = ['receipt_url'];

    public function getReceiptUrlAttribute()
    {
        if (!$this->receipt_path) return null;
        if (str_starts_with($this->receipt_path, 'data:') || str_starts_with($this->receipt_path, 'http://') || str_starts_with($this->receipt_path, 'https://')) {
            return $this->receipt_path;
        }
        $path = ltrim(str_replace('public/', '', $this->receipt_path), '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, 8);
        }
        return url('storage/' . $path);
    }

    protected function casts(): array
    {
        return [
            'booking_date' => 'date:Y-m-d',
            'event_date' => 'date:Y-m-d',
            'pickup_scheduled_on' => 'date:Y-m-d',
            'return_scheduled_on' => 'date:Y-m-d',
            'total_amount' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'insurance_amount' => 'decimal:2',
            'is_override' => 'boolean',
            'cancelled_at' => 'datetime',
        ];
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        if ($date->format('H:i:s') === '00:00:00') {
            return $date->format('Y-m-d');
        }
        return $date->format('Y-m-d H:i');
    }

    /**
     * Cities/areas that count as Cairo & Giza (pickup 1 day before the wedding instead of 2).
     * Keep in sync with CAIRO_CITY_KEYWORDS in dashboard/src/lib/utils.js (checked by ScheduledDatesTest).
     */
    public const CAIRO_CITY_KEYWORDS = [
        'قاهر', 'جيز', 'cairo', 'giza', 'gize', 'نصر', 'مصر الجديد', 'معادي', 'تجمع', 'زايد',
        'أكتوبر', 'اكتوبر', 'شروق', 'مدينتي', 'حلوان', 'بدر',
    ];

    public static function isCairoCity(?string $city): bool
    {
        $city = mb_strtolower(trim($city ?? ''));
        if ($city === '') {
            return true;
        }
        foreach (self::CAIRO_CITY_KEYWORDS as $keyword) {
            if (str_contains($city, $keyword)) {
                return true;
            }
        }
        return false;
    }

    public static function calculateScheduledDates(?string $weddingDate, ?string $city = null): array
    {
        if (empty($weddingDate)) {
            return ['pickup_date' => null, 'return_date' => null];
        }

        try {
            $wDate = \Carbon\Carbon::parse($weddingDate);
            $isCairo = self::isCairoCity($city);

            // 1 day before wedding for Cairo & Giza, 2 days before wedding for other cities
            $daysBefore = $isCairo ? 1 : 2;
            $daysAfter = 1;

            return [
                'pickup_date' => $wDate->copy()->subDays($daysBefore)->toDateString(),
                'return_date' => $wDate->copy()->addDays($daysAfter)->toDateString(),
            ];
        } catch (\Throwable $e) {
            return ['pickup_date' => null, 'return_date' => null];
        }
    }

    /** Days a returned booking stays in the return stage before moving to the archive */
    public const RETURN_ARCHIVE_DAYS = 15;

    /** Returned more than RETURN_ARCHIVE_DAYS ago (return_scheduled_on holds the actual return date once returned) */
    public function isArchivedReturn(): bool
    {
        if ($this->status !== 'returned') {
            return false;
        }
        $returnedOn = $this->return_scheduled_on ?? $this->updated_at;
        return $returnedOn && \Carbon\Carbon::parse($returnedOn)->startOfDay()->addDays(self::RETURN_ARCHIVE_DAYS)->lt(\Carbon\Carbon::today());
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class);
    }

    public function dress2(): BelongsTo
    {
        return $this->belongsTo(Dress::class, 'dress_2_id');
    }

    public function dress3(): BelongsTo
    {
        return $this->belongsTo(Dress::class, 'dress_3_id');
    }

    public function fittings(): HasMany
    {
        return $this->hasMany(Fitting::class);
    }

    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    protected static function booted()
    {
        // Trying fees paid at the bride's visits before she booked belong to this booking
        static::created(function ($booking) {
            Revenue::whereNull('booking_id')
                ->whereIn('visit_id', Visit::where('client_id', $booking->client_id)->select('id'))
                ->update(['booking_id' => $booking->id]);
        });

        // Keep visit trying fees when a booking is deleted (revenues cascade with their booking)
        static::deleting(function ($booking) {
            $booking->revenues()->whereNotNull('visit_id')->update(['booking_id' => null]);
        });

        static::updated(function ($booking) {
            // Check if status transitioned to returned
            if ($booking->wasChanged('status') && $booking->status === 'returned') {
                foreach (array_filter([$booking->dress, $booking->dress2, $booking->dress3]) as $dressItem) {
                    \App\Models\Notification::create([
                        'type' => 'dress_returned',
                        'title' => 'تم إرجاع فستان: ' . ($dressItem->name ?? 'فستان غير معروف'),
                        'message' => 'تم استلام الفستان المرتجع وأصبح متاحاً',
                        'related_type' => 'booking',
                        'related_id' => $booking->id
                    ]);
                }
            }
        });
    }

    public static function checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId = null)
    {
        $client = \App\Models\Client::find($clientId);
        if (!$client) return null;

        $query = self::with('client')
            ->where(function ($q) use ($dressId) {
                $q->where('dress_id', $dressId)
                  ->orWhere('dress_2_id', $dressId)
                  ->orWhere('dress_3_id', $dressId);
            })
            ->whereIn('status', ['confirmed', 'picked_up', 'out', 'returned']);

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        return self::findDressConflict($client, $eventDate, $query->get());
    }

    /**
     * Same result as checkDressAvailability() for each dress of each booking, but the
     * candidate bookings for all dresses are loaded in one query instead of two per dress.
     * Returns [booking_id => [1 => conflict|null, 2 => conflict|null, 3 => conflict|null]].
     */
    public static function conflictDatesFor(iterable $bookings): array
    {
        $bookings = collect($bookings)->filter()->unique('id');
        $dressIds = $bookings->flatMap(fn($b) => [$b->dress_id, $b->dress_2_id, $b->dress_3_id])->filter()->unique()->values();

        $candidates = $dressIds->isEmpty() ? collect() : self::with('client')
            ->where(function ($q) use ($dressIds) {
                $q->whereIn('dress_id', $dressIds)
                  ->orWhereIn('dress_2_id', $dressIds)
                  ->orWhereIn('dress_3_id', $dressIds);
            })
            ->whereIn('status', ['confirmed', 'picked_up', 'out', 'returned'])
            ->orderBy('id')
            ->get();

        $candidatesByDress = [];
        foreach ($candidates as $eb) {
            foreach (array_unique(array_filter([$eb->dress_id, $eb->dress_2_id, $eb->dress_3_id])) as $id) {
                $candidatesByDress[$id][] = $eb;
            }
        }

        $clients = \App\Models\Client::whereIn('id', $bookings->pluck('client_id')->unique())->get()->keyBy('id');

        $result = [];
        foreach ($bookings as $b) {
            $client = $clients->get($b->client_id);
            foreach ([1 => $b->dress_id, 2 => $b->dress_2_id, 3 => $b->dress_3_id] as $slot => $dressId) {
                if (!$dressId || !$client) {
                    $result[$b->id][$slot] = null;
                    continue;
                }
                $existing = array_filter($candidatesByDress[$dressId] ?? [], fn($eb) => $eb->id != $b->id);
                $result[$b->id][$slot] = self::findDressConflict($client, $b->event_date, $existing);
            }
        }

        return $result;
    }

    private static function findDressConflict(\App\Models\Client $client, $eventDate, $existingBookings): ?string
    {
        $city = $client->city ?? 'القاهرة';
        $isCairoOrGiza = self::isCairoCity($city);
        // 1 day before for Cairo/Giza, 2 days before for other cities
        $daysBefore = $isCairoOrGiza ? 1 : 2;
        $daysAfter = 1;

        $proposedWedding = \Carbon\Carbon::parse($eventDate);
        $proposedStart = $proposedWedding->copy()->subDays($daysBefore)->startOfDay();
        $proposedEnd = $proposedWedding->copy()->addDays($daysAfter)->endOfDay();

        foreach ($existingBookings as $eb) {
            if (!empty($eb->pickup_scheduled_on) && !empty($eb->return_scheduled_on)) {
                $exStart = \Carbon\Carbon::parse($eb->pickup_scheduled_on)->startOfDay();
                $exEnd = \Carbon\Carbon::parse($eb->return_scheduled_on)->endOfDay();
            } else {
                $exClient = $eb->client;
                $exCity = $exClient ? ($exClient->city ?? 'القاهرة') : 'القاهرة';
                $exIsCairoOrGiza = (! $exCity || stripos($exCity, 'cairo') !== false || stripos($exCity, 'giza') !== false || $exCity === 'القاهرة' || $exCity === 'الجيزة');
                $exDaysBefore = $exIsCairoOrGiza ? 1 : 2;
                $exDaysAfter = 1;

                $exWedding = \Carbon\Carbon::parse($eb->event_date);
                $exStart = $exWedding->copy()->subDays($exDaysBefore)->startOfDay();
                $exEnd = $exWedding->copy()->addDays($exDaysAfter)->endOfDay();
            }

            if ($proposedStart->lte($exEnd) && $proposedEnd->gte($exStart)) {
                $availableDate = $exEnd->copy()->addDay()->format('Y-m-d');
                $startDate = $exStart->format('Y-m-d');
                $endDate = $exEnd->format('Y-m-d');
                return "{$availableDate} (غير متوفر من {$startDate} إلى {$endDate})";
            }
        }

        return null;
    }

    public static function isDressOutOnDate($dressId, $date, $excludeClientId = null)
    {
        if (!$dressId || !$date) return null;
        $checkDate = \Carbon\Carbon::parse($date)->startOfDay();
        
        $bookings = self::with('client')
            ->where(function ($q) use ($dressId) {
                $q->where('dress_id', $dressId)
                  ->orWhere('dress_2_id', $dressId)
                  ->orWhere('dress_3_id', $dressId);
            })
            ->whereIn('status', ['confirmed', 'picked_up', 'out', 'returned']);
            
        if ($excludeClientId) {
            $bookings->where('client_id', '!=', $excludeClientId);
        }
        
        foreach ($bookings->get() as $b) {
            if (!empty($b->pickup_scheduled_on) && !empty($b->return_scheduled_on)) {
                $start = \Carbon\Carbon::parse($b->pickup_scheduled_on)->startOfDay();
                $end = \Carbon\Carbon::parse($b->return_scheduled_on)->endOfDay();
            } else {
                $bClient = $b->client;
                $bCity = $bClient ? ($bClient->city ?? 'القاهرة') : 'القاهرة';
                $isCairoOrGiza = self::isCairoCity($bCity);
                // 1 day before for Cairo/Giza, 2 days before for other cities
                $daysBefore = $isCairoOrGiza ? 1 : 2;
                $daysAfter = 1;
                
                $wedding = \Carbon\Carbon::parse($b->event_date);
                $start = $wedding->copy()->subDays($daysBefore)->startOfDay();
                $end = $wedding->copy()->addDays($daysAfter)->endOfDay();
            }
            
            if ($checkDate->gte($start) && $checkDate->lte($end)) {
                return "من {$start->format('Y-m-d')} إلى {$end->format('Y-m-d')}";
            }
        }
        
        return null;
    }
}


