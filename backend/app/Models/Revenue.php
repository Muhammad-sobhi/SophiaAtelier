<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Revenue extends Model
{
    use HasFactory;

    protected $fillable = ['booking_id', 'type', 'amount', 'payment_method', 'payment_date', 'notes', 'receipt_path'];

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
            'amount' => 'decimal:2',
            'payment_date' => 'date',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }
}
