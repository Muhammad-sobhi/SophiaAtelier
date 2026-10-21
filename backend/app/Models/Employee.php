<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'phone', 'email', 'role', 'daily_rate', 'pay_type', 'piece_rate', 'attendance_deductions', 'pay_cycle', 'pay_cycle_days',
        'hire_date', 'notes', 'password', 'address', 'id_number', 'id_image', 'id_image_back', 'permissions', 'sales_aliases'
    ];

    protected $hidden = ['password', 'id_number', 'id_image', 'id_image_back'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'daily_rate' => 'decimal:2',
            'piece_rate' => 'decimal:2',
            'attendance_deductions' => 'boolean',
            'hire_date' => 'date',
            'permissions' => 'array',
            'sales_aliases' => 'array',
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

    public function pieceEntries(): HasMany
    {
        return $this->hasMany(EmployeePieceEntry::class);
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
                
                // Determine role from permissions, only when they are set or changed: saving a name or
                // password must not demote an admin whose employee record has no "*"
                $permissionsSet = $employee->wasRecentlyCreated ? $employee->permissions !== null : $employee->wasChanged('permissions');
                if (!$user->exists || $permissionsSet) {
                    $user->role = (is_array($employee->permissions) && in_array('*', $employee->permissions)) ? 'admin' : 'staff';
                }
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
