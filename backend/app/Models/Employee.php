<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'phone', 'email', 'position', 'salary', 'pay_cycle', 'pay_cycle_days',
        'hire_date', 'notes', 'password', 'address', 'id_number', 'id_image', 'permissions'
    ];

    protected $hidden = ['password', 'id_number', 'id_image'];

    protected function casts(): array
    {
        return [
            'salary' => 'decimal:2',
            'hire_date' => 'date',
            'permissions' => 'array',
        ];
    }

    public function attendance(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    protected static function booted()
    {
        static::saved(function ($employee) {
            if ($employee->email && $employee->password) {
                $user = \App\Models\User::where('email', $employee->email)->first();
                if (!$user) {
                    $user = new \App\Models\User();
                    $user->email = $employee->email;
                }
                $user->name = $employee->name;
                
                // Password is already hashed by the controller
                $user->password = $employee->password;
                
                // Determine role from permissions
                $user->role = (is_array($employee->permissions) && in_array('*', $employee->permissions)) ? 'admin' : 'staff';
                $user->save();
            }
        });

        static::deleted(function ($employee) {
            if ($employee->email) {
                \App\Models\User::where('email', $employee->email)->delete();
            }
        });
    }
}
