<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeSalaryPayment extends Model
{
    protected $fillable = ['employee_id', 'expense_id', 'period', 'period_start', 'period_end', 'amount', 'net_salary', 'payment_method', 'payment_date', 'notes', 'paid_by'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'payment_date' => 'date:Y-m-d',
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }
}
