<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'employee_name',
        'action',
        'entity_type',
        'entity_id',
        'summary',
        'ip',
    ];

    protected $casts = [
        'summary' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

