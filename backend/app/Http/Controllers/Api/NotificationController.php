<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
                $isCairo = str_contains($city, 'القاهرة') || str_contains(strtolower($city), 'cairo');
                $pickupDaysBefore = $isCairo ? 1 : 2;
                
                $pickupDt = $eventDt->copy()->subDays($pickupDaysBefore);
                $pickupDateStr = $pickupDt->toDateString();
                
                // If pickup date is today or tomorrow (or event_date is tomorrow)
                if ($pickupDateStr === $tomorrowStr || $pickupDateStr === $todayStr || $eventDt->toDateString() === $tomorrowStr) {
                    $exists = Notification::where('type', 'pickup_reminder')
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

        $query = Notification::query();

        if ($request->input('unread_only')) {
            $query->where('is_read', false);
        }

        return response()->json($query->latest()->paginate($request->input('per_page', 20)));
    }

    public function show(Notification $notification)
    {
        return response()->json($notification);
    }

    public function destroy(Notification $notification): JsonResponse
    {
        $notification->delete();

        return response()->json(['message' => 'Notification deleted']);
    }

    public function markAsRead($id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $notification->update(['is_read' => true]);

        return response()->json($notification);
    }

    public function markAllAsRead(): JsonResponse
    {
        Notification::where('is_read', false)->update(['is_read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function deleteAll(): JsonResponse
    {
        Notification::query()->delete();

        return response()->json(['message' => 'All notifications deleted']);
    }
}
