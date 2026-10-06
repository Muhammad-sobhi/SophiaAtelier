<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A day the atelier is closed: the website does not accept visit requests on it (staff still can) */
class ClosedDay extends Model
{
    protected $fillable = ['date', 'reason', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    /** Today at the shop (Cairo), whatever the server timezone */
    public static function today(): string
    {
        return now('Africa/Cairo')->toDateString();
    }

    public static function isClosed($date): bool
    {
        return !empty($date) && static::whereDate('date', \Carbon\Carbon::parse($date)->toDateString())->exists();
    }

    /** Arabic error shown to the bride when she picks a closed day */
    public static function closedMessage($date): string
    {
        $reason = static::whereDate('date', \Carbon\Carbon::parse($date)->toDateString())->value('reason');

        return 'عذراً، الأتيليه مغلق يوم ' . \Carbon\Carbon::parse($date)->toDateString()
            . ($reason ? ' (' . $reason . ')' : '') . '. يرجى اختيار يوم آخر للزيارة.';
    }
}
