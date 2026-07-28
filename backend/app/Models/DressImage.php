<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DressImage extends Model
{
    use HasFactory;

    protected $fillable = ['dress_id', 'image_path', 'is_primary'];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }

    public function dress(): BelongsTo
    {
        return $this->belongsTo(Dress::class);
    }
}
