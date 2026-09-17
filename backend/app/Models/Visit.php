<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    use HasFactory;

    protected $fillable = ['client_id', 'visit_date', 'status', 'source', 'notes', 'time_slot', 'sales_name'];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date:Y-m-d',
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

    public function triedDresses()
    {
        return $this->belongsToMany(Dress::class, 'visit_dresses')->wherePivot('type', 'tried');
    }

    public function bookedDresses()
    {
        return $this->belongsToMany(Dress::class, 'visit_dresses')->wherePivot('type', 'booked');
    }

}
