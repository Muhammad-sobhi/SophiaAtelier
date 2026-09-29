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
