<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    /**
     * Public endpoint to store contact form messages
     */
    public function publicStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'subject' => 'nullable|string|max:255',
            'message' => 'required|string',
        ]);

        $message = ContactMessage::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'subject' => $validated['subject'] ?? 'استفسار عام',
            'message' => $validated['message'],
            'is_read' => false,
        ]);

        // Create notification for dashboard
        Notification::create([
            'type' => 'general',
            'title' => 'رسالة جديدة من تواصل معنا',
            'message' => 'وصلت رسالة جديدة من: ' . $message->name . ' (' . $message->email . ')',
            'related_type' => 'contact_message',
            'related_id' => $message->id,
        ]);

        return response()->json([
            'message' => 'تم إرسال رسالتك بنجاح! سنتواصل معك في أقرب وقت.',
            'data' => $message,
        ], 201);
    }

    /**
     * Authenticated endpoint to list all messages
     */
    public function index(Request $request): JsonResponse
    {
        $messages = ContactMessage::latest()->paginate($request->input('per_page', 20));
        return response()->json($messages);
    }

    /**
     * Mark a message as read/unread
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $msg = ContactMessage::findOrFail($id);
        $msg->update(['is_read' => $request->input('is_read', true)]);

        return response()->json([
            'message' => 'تم تحديث حالة الرسالة',
            'data' => $msg,
        ]);
    }

    /**
     * Delete a message
     */
    public function destroy($id): JsonResponse
    {
        $msg = ContactMessage::findOrFail($id);
        $msg->delete();

        return response()->json(['message' => 'تم حذف الرسالة بنجاح']);
    }
}
