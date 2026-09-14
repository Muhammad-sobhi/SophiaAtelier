<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAdmin = $request->user() && $request->user()->role === 'admin';

        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'position' => $this->position,
            'hire_date' => $this->hire_date,
            'attendance_count' => $this->whenCounted('attendance'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];

        if ($isAdmin) {
            $data['salary'] = $this->salary;
            $data['pay_cycle'] = $this->pay_cycle;
            $data['pay_cycle_days'] = $this->pay_cycle_days;
            $data['notes'] = $this->notes;
            $data['address'] = $this->address;
            $data['id_number'] = $this->id_number;
            $data['id_image'] = $this->id_image;
            $data['permissions'] = $this->permissions;
            // password is cast and hidden, usually not returned anyway
        }

        return $data;
    }
}
