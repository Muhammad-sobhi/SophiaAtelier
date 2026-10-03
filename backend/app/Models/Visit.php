<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    use HasFactory;

    /** pending = request awaiting staff confirmation; confirmed = date/time agreed with the bride; declined = request refused by staff */
    public const STATUSES = ['pending', 'confirmed', 'arrived', 'done', 'booked', 'no_show', 'declined'];

    /** Visits that are still open (the bride has not come yet or is being served) */
    public const OPEN_STATUSES = ['pending', 'confirmed', 'arrived'];

    /** Where the request came from: the website, or registered by staff (in the shop / by phone / chat) */
    public const SOURCES = ['website', 'walkin', 'phone', 'whatsapp', 'instagram', 'referral'];

    /** A visit may be at most this many months before the wedding */
    public const MAX_MONTHS_BEFORE_WEDDING = 4;

    protected $fillable = [
        'client_id', 'visit_date', 'status', 'source', 'notes', 'time_slot', 'trying_fee', 'sales_name',
        'confirmed_at', 'confirmed_by', 'auto_confirmed', 'confirmation_sent_at', 'previous_visit_id',
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date:Y-m-d',
            'trying_fee' => 'decimal:2',
            'confirmed_at' => 'datetime',
            'auto_confirmed' => 'boolean',
            'confirmation_sent_at' => 'datetime',
        ];
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        if ($date->format('H:i:s') === '00:00:00') {
            return $date->format('Y-m-d');
        }
        return $date->format('Y-m-d H:i');
    }

    // removed appends

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Null when the visit date is allowed for the wedding date (or either is missing), otherwise
     * ['earliest_visit_date' => Y-m-d, 'message' => Arabic error]. Counted by day; a shorter month clamps to its last day.
     */
    public static function visitWindowError($visitDate, $weddingDate): ?array
    {
        if (empty($visitDate) || empty($weddingDate)) {
            return null;
        }

        $earliest = \Carbon\Carbon::parse($weddingDate)->startOfDay()->subMonthsNoOverflow(self::MAX_MONTHS_BEFORE_WEDDING);
        if (\Carbon\Carbon::parse($visitDate)->startOfDay()->gte($earliest)) {
            return null;
        }

        return [
            'earliest_visit_date' => $earliest->toDateString(),
            'message' => 'لا يمكن حجز موعد زيارة قبل الفرح بأكثر من ' . self::MAX_MONTHS_BEFORE_WEDDING
                . ' شهور. أقرب تاريخ مسموح للزيارة: ' . $earliest->toDateString(),
        ];
    }

    /** Throws a 422 validation error on the given field when the visit is too far before the wedding */
    public static function assertVisitWindow($visitDate, $weddingDate, string $field = 'visit_date'): void
    {
        if ($error = self::visitWindowError($visitDate, $weddingDate)) {
            throw \Illuminate\Validation\ValidationException::withMessages([$field => [$error['message']]]);
        }
    }

    /** Confirm the visit; without a user it was confirmed automatically (all dresses available) */
    public function markConfirmed(?int $userId): void
    {
        $this->forceFill([
            'status' => 'confirmed',
            'confirmed_at' => $this->confirmed_at ?? now(),
            'confirmed_by' => $this->confirmed_by ?? $userId,
            'auto_confirmed' => $this->confirmed_at ? $this->auto_confirmed : $userId === null,
        ])->save();
    }

    /** Set on a repeated website request: latest earlier visit with the same phone number */
    public function previousVisit(): BelongsTo
    {
        return $this->belongsTo(Visit::class, 'previous_visit_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function requestedDresses()
    {
        return $this->belongsToMany(Dress::class, 'visit_dresses')->wherePivot('type', 'requested');
    }

    public function triedDresses()
    {
        return $this->belongsToMany(Dress::class, 'visit_dresses')->wherePivot('type', 'tried');
    }

    public function bookedDresses()
    {
        return $this->belongsToMany(Dress::class, 'visit_dresses')->wherePivot('type', 'booked');
    }

}
