<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = ['key', 'title', 'body', 'placeholders'];

    protected function casts(): array
    {
        return [
            'placeholders' => 'array',
        ];
    }
}
