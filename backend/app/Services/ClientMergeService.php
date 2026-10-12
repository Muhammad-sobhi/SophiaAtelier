<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Notification;
use App\Models\Visit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Merges a bride registered twice into one record: everything of $duplicate (bookings with their
 * payments, visits, lost-demand rows, notifications, history) moves to $keep, empty details on $keep
 * are filled from $duplicate, then $duplicate is removed.
 */
class ClientMergeService
{
    private const FILLABLE = ['phone2', 'email', 'address', 'city', 'source', 'wedding_date', 'image_path'];

    public function merge(Client $keep, Client $duplicate): Client
    {
        if ($keep->is($duplicate)) {
            throw new \InvalidArgumentException('لا يمكن دمج العروسة في نفسها');
        }

        DB::transaction(function () use ($keep, $duplicate) {
            // Payments follow their booking / visit, so moving these moves the money too
            Booking::where('client_id', $duplicate->id)->update(['client_id' => $keep->id]);
            Visit::where('client_id', $duplicate->id)->update(['client_id' => $keep->id]);

            // One lost-demand row per dress + wedding date: drop the duplicate's copies of rows $keep already has
            $kept = DB::table('dress_demand_misses')->where('client_id', $keep->id)->get(['dress_id', 'wedding_date']);
            foreach ($kept as $row) {
                DB::table('dress_demand_misses')->where('client_id', $duplicate->id)
                    ->where('dress_id', $row->dress_id)->where('wedding_date', $row->wedding_date)->delete();
            }
            DB::table('dress_demand_misses')->where('client_id', $duplicate->id)->update(['client_id' => $keep->id]);

            Notification::withTrashed()->where('related_type', 'client')->where('related_id', $duplicate->id)
                ->update(['related_id' => $keep->id]);
            ActivityLog::whereIn('entity_type', ['client', 'Client'])->where('entity_id', $duplicate->id)
                ->update(['entity_id' => $keep->id]);

            $fill = [];
            foreach (self::FILLABLE as $field) {
                if (blank($keep->getRawOriginal($field)) && filled($duplicate->getRawOriginal($field))) {
                    $fill[$field] = $duplicate->getRawOriginal($field);
                }
            }
            // A different number of the same bride is kept as her second phone
            if ($duplicate->phone && $duplicate->phone !== $keep->phone && blank($keep->phone2) && !isset($fill['phone2'])) {
                $fill['phone2'] = $duplicate->phone;
            }
            if (filled($duplicate->notes) && $duplicate->notes !== $keep->notes) {
                $fill['notes'] = trim(($keep->notes ? $keep->notes . "\n" : '') . $duplicate->notes);
            }
            if ($fill) {
                $keep->update($fill);
            }

            if ($duplicate->image_path && ($fill['image_path'] ?? null) !== $duplicate->image_path) {
                Storage::disk('public')->delete($duplicate->image_path);
            }

            ActivityLogger::log('دمج عروسة مكررة', 'Client', $keep->id, [
                'kept' => ['id' => $keep->id, 'name' => $keep->name, 'phone' => $keep->phone],
                'merged' => ['id' => $duplicate->id, 'name' => $duplicate->name, 'phone' => $duplicate->phone],
            ]);

            $duplicate->forceDelete();
        });

        return $keep->fresh();
    }
}
