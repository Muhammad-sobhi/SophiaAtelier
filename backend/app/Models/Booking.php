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
        'status', 'total_amount', 'deposit_amount', 'insurance_amount', 'notes',
        'receipt_path', 'payment_method',
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
            'booking_date' => 'date',
            'event_date' => 'date',
            'total_amount' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'insurance_amount' => 'decimal:2',
        ];
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
                $dressName = $booking->dress->name ?? 'فستان غير معروف';
                
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
        });
    }

    public static function checkDressAvailability($clientId, $dressId, $eventDate, $excludeBookingId = null)
    {
        $client = \App\Models\Client::find($clientId);
        if (!$client) return null;

        $city = $client->city ?? 'القاهرة';
        $isCairoOrGiza = (! $city || stripos($city, 'cairo') !== false || stripos($city, 'giza') !== false || $city === 'القاهرة' || $city === 'الجيزة');
        $daysBefore = $isCairoOrGiza ? 2 : 3;
        $daysAfter = 1;

        $proposedWedding = \Carbon\Carbon::parse($eventDate);
        $proposedStart = $proposedWedding->copy()->subDays($daysBefore)->startOfDay();
        $proposedEnd = $proposedWedding->copy()->addDays($daysAfter)->endOfDay();

        $query = self::with('client')->where('dress_id', $dressId)
            ->whereIn('status', ['confirmed', 'picked_up', 'out', 'returned']);

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        $existingBookings = $query->get();

        foreach ($existingBookings as $eb) {
            $exClient = $eb->client;
            $exCity = $exClient ? ($exClient->city ?? 'القاهرة') : 'القاهرة';
            $exIsCairoOrGiza = (! $exCity || stripos($exCity, 'cairo') !== false || stripos($exCity, 'giza') !== false || $exCity === 'القاهرة' || $exCity === 'الجيزة');
            $exDaysBefore = $exIsCairoOrGiza ? 2 : 3;
            $exDaysAfter = 1;

            $exWedding = \Carbon\Carbon::parse($eb->event_date);
            $exStart = $exWedding->copy()->subDays($exDaysBefore)->startOfDay();
            $exEnd = $exWedding->copy()->addDays($exDaysAfter)->endOfDay();

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
        
        $bookings = self::with('client')->where('dress_id', $dressId)
            ->whereIn('status', ['confirmed', 'picked_up', 'out', 'returned']);
            
        if ($excludeClientId) {
            $bookings->where('client_id', '!=', $excludeClientId);
        }
        
        foreach ($bookings->get() as $b) {
            $bClient = $b->client;
            $bCity = $bClient ? ($bClient->city ?? 'القاهرة') : 'القاهرة';
            $isCairoOrGiza = (! $bCity || stripos($bCity, 'cairo') !== false || stripos($bCity, 'giza') !== false || $bCity === 'القاهرة' || $bCity === 'الجيزة');
            $daysBefore = $isCairoOrGiza ? 2 : 3;
            $daysAfter = 1;
            
            $wedding = \Carbon\Carbon::parse($b->event_date);
            $start = $wedding->copy()->subDays($daysBefore)->startOfDay();
            $end = $wedding->copy()->addDays($daysAfter)->endOfDay();
            
            if ($checkDate->gte($start) && $checkDate->lte($end)) {
                return "من {$start->format('Y-m-d')} إلى {$end->format('Y-m-d')}";
            }
        }
        
        return null;
    }
}
