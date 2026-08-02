<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notification extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['type', 'title', 'message', 'is_read', 'related_type', 'related_id'];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }
}
