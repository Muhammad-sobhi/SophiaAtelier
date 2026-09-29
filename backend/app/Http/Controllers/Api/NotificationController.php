<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        // Auto-delete notifications older than 24 hours
        try {
            Notification::where('created_at', '<', now()->subHours(24))->delete();
        } catch (\Exception $e) {
            \Log::error('Failed to auto-delete old notifications: ' . $e->getMessage());
        }

        // Dynamic scan for tomorrow/today pickup reminders
        try {
            $todayStr = now()->toDateString();
            $tomorrowStr = now()->addDay()->toDateString();
            
            $activeBookings = \App\Models\Booking::with(['client', 'dress'])
                ->whereIn('status', ['confirmed', 'pending'])
                ->get();
                
            foreach ($activeBookings as $booking) {
                if (!$booking->event_date || !$booking->client) continue;
                
                $eventDt = \Carbon\Carbon::parse($booking->event_date);
                $city = $booking->client->city ?? 'القاهرة';
                $isCairoOrGiza = \App\Models\Booking::isCairoCity($city);
                $pickupDaysBefore = $isCairoOrGiza ? 1 : 2;
                
                $pickupDt = $eventDt->copy()->subDays($pickupDaysBefore);
                $pickupDateStr = $pickupDt->toDateString();
                
                // If pickup date is today or tomorrow (or event_date is tomorrow)
                if ($pickupDateStr === $tomorrowStr || $pickupDateStr === $todayStr || $eventDt->toDateString() === $tomorrowStr) {
                    
                    $exists = Notification::withTrashed()
                        ->where('type', 'pickup_reminder')
                        ->where('related_type', 'booking')
                        ->where('related_id', $booking->id)
                        ->whereDate('created_at', $todayStr)
                        ->exists();
                        
                    if (!$exists) {
                        $eventDateClean = \Carbon\Carbon::parse($booking->event_date)->format('Y-m-d');
                        $clientName = $booking->client->name ?? 'عروسنا الجميلة';
                        $phone = $booking->client->phone ?? '';
                        $dressName = $booking->dress->name ?? 'فستان الزفاف';

                        Notification::create([
                            'type' => 'pickup_reminder',
                            'title' => 'تذكير بموعد استلام فستان 👗: ' . $clientName,
                            'message' => "تذكير بموعد استلام فستان الزفاف ({$dressName}) للعروس {$clientName}. تاريخ الفرح: {$eventDateClean} | تاريخ الاستلام المقترح: {$pickupDateStr} | رقم الهاتف: {$phone}",
                            'related_type' => 'booking',
                            'related_id' => $booking->id
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to generate pickup reminders: ' . $e->getMessage());
        }

        // Read/deleted state is per employee
        $query = Notification::query()
            ->leftJoin('notification_user as nu', function ($join) use ($request) {
                $join->on('nu.notification_id', '=', 'notifications.id')
                    ->where('nu.user_id', $request->user()->id);
            })
            ->whereNull('nu.deleted_at')
            ->select('notifications.*', DB::raw('nu.read_at IS NOT NULL as is_read'));

        if ($request->input('unread_only')) {
            $query->whereNull('nu.read_at');
        }

        return response()->json($query->latest('notifications.created_at')->paginate($request->input('per_page', 20)));
    }

    public function show(Notification $notification)
    {
        return response()->json($notification);
    }

    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        $this->setUserState($request, [$notification->id], 'deleted_at');

        return response()->json(['message' => 'Notification deleted']);
    }

    public function markAsRead(Request $request, $id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $this->setUserState($request, [$notification->id], 'read_at');

        return response()->json(['message' => 'Notification marked as read']);
    }

    /** Marks the notifications the employee can see (ids) as read; all of them when ids is omitted */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->setUserState($request, $this->targetIds($request), 'read_at');

        return response()->json(['message' => 'All notifications marked as read']);
    }

    /** Hides the notifications the employee can see (ids) for this employee only */
    public function deleteAll(Request $request): JsonResponse
    {
        $this->setUserState($request, $this->targetIds($request), 'deleted_at');

        return response()->json(['message' => 'All notifications deleted']);
    }

    private function targetIds(Request $request): array
    {
        $validated = $request->validate([
            'ids' => 'nullable|array|max:500',
            'ids.*' => 'integer',
        ]);

        $query = Notification::query();
        if (isset($validated['ids'])) {
            $query->whereIn('id', $validated['ids']);
        }

        return $query->pluck('id')->all();
    }

    private function setUserState(Request $request, array $notificationIds, string $column): void
    {
        if (empty($notificationIds)) {
            return;
        }

        $now = now();
        $rows = array_map(fn($id) => [
            'notification_id' => $id,
            'user_id' => $request->user()->id,
            $column => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ], $notificationIds);

        DB::table('notification_user')->upsert($rows, ['notification_id', 'user_id'], [$column, 'updated_at']);
    }
}
