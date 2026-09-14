<?php

namespace App\Services;

use App\Models\ActivityLog;

class ActivityLogger
{
    public static function log($action, $entityType = null, $entityId = null, $summary = null, $employeeName = null)
    {
        $user = auth('sanctum')->user() ?: auth()->user();
        $name = $employeeName ?: ($user ? $user->name : 'System');

        ActivityLog::create([
            'user_id' => $user ? $user->id : null,
            'employee_name' => $name,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'summary' => $summary,
            'ip' => request()->ip(),
            'created_at' => now(),
        ]);
    }
}

