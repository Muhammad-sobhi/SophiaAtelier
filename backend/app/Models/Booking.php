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
        'receipt_path', 'payment_method', 'sales_name', 'is_override',
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
        static::updated(function ($booking) {
            // Check if status transitioned to returned
            if ($booking->wasChanged('status') && $booking->status === 'returned') {
                $dressesToClean = [];
                if ($booking->dress) {
                    $dressesToClean[] = $booking->dress;
                }
                if ($booking->dress2) {
                    $dressesToClean[] = $booking->dress2;
                }

                foreach ($dressesToClean as $dressItem) {
                    $dressName = $dressItem->name ?? 'فستان غير معروف';
                    
                    // 1. Create a cleaning task
                    $task = \App\Models\Task::create([
                        'booking_id' => $booking->id,
                        'title' => 'تنظيف فستان: ' . $dressName,
                        'description' => 'تلقائي: تم إرجاع الفستان من العميل ويجب تنظيفه كأولوية قصوى.',
                        'type' => 'cleaning',
                        'status' => 'pending',
                        'due_date' => now()->addDays(1)->toDateString(),
                    ]);

                    // 2. Create a notification for this return
                    \App\Models\Notification::create([
                        'type' => 'dress_returned',
                        'title' => 'تم إرجاع فستان: ' . $dressName,
                        'message' => 'تم استلام الفستان المرتجع بنجاح وإنشاء مهمة تنظيف جديدة بالرقم #' . $task->id,
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

        $city = $client->city ?? 'القاهرة';
        $isCairoOrGiza = self::isCairoCity($city);
        // 1 day before for Cairo/Giza, 2 days before for other cities
        $daysBefore = $isCairoOrGiza ? 1 : 2;
        $daysAfter = 1;

        $proposedWedding = \Carbon\Carbon::parse($eventDate);
        $proposedStart = $proposedWedding->copy()->subDays($daysBefore)->startOfDay();
        $proposedEnd = $proposedWedding->copy()->addDays($daysAfter)->endOfDay();

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

        $existingBookings = $query->get();

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


