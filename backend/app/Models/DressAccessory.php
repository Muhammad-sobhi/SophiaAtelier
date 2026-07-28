<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DressAccessory extends Model
{
    use HasFactory;

    protected $fillable = ['dress_id', 'name', 'quantity', 'notes'];

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class);
    }
}
