<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Fitting extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id', 
        'fitting_date', 
        'measurements', 
        'alterations',
        'sales_associate', 
        'alterations_notes', 
        'additional_notes',
        'status',
        'tailor_id'
    ];

    protected function casts(): array
    {
        return [
            'fitting_date' => 'datetime',
            'measurements' => 'array',
            'alterations' => 'array',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function tailor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'tailor_id');
    }
}
