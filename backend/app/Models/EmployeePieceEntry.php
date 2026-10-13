<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePieceEntry extends Model
{
    protected $fillable = ['employee_id', 'date', 'pieces', 'piece_rate', 'amount', 'notes', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'pieces' => 'integer',
            'piece_rate' => 'decimal:2',
            'amount' => 'decimal:2',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
