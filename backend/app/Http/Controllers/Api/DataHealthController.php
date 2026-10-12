<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Visit;
use App\Services\ActivityLogger;
use App\Services\ClientMergeService;
use App\Services\DataAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Admin "data health" page: data that makes the reports wrong, and the fixes that need more than an edit */
class DataHealthController extends Controller
{
    public function __construct(private DataAuditService $audit)
    {
    }

    /** GET /data-health — every check with its count */
    public function index(): JsonResponse
    {
        return response()->json(array_map(function ($c) {
            $c['count'] = $c['ids']->count();
            unset($c['ids']);

            return $c;
        }, $this->audit->summary()));
    }

    /** GET /data-health/{check} — one check with the full details of its rows */
    public function show(string $check): JsonResponse
    {
        abort_unless($this->audit->exists($check), 404);

        return response()->json($this->audit->check($check));
    }

    /** POST /data-health/merge-clients — merge brides registered twice into the one to keep */
    public function mergeClients(Request $request, ClientMergeService $merger): JsonResponse
    {
        $validated = $request->validate([
            'keep_id' => 'required|integer|exists:clients,id',
            'merge_ids' => 'required|array|min:1|max:20',
            'merge_ids.*' => 'integer|distinct|exists:clients,id|different:keep_id',
        ]);

        $keep = Client::findOrFail($validated['keep_id']);
        foreach ($validated['merge_ids'] as $id) {
            $keep = $merger->merge($keep, Client::findOrFail($id));
        }

        return response()->json(['message' => 'تم دمج العروسة', 'client' => $keep]);
    }

    /** POST /data-health/close-visits — close past visits that were never marked */
    public function closeVisits(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1|max:1000',
            'ids.*' => 'integer|distinct',
            'status' => 'required|in:done,no_show',
        ]);

        // Only visits that are still open and in the past, so a stale page can't overwrite a newer status
        $closed = Visit::whereIn('id', $validated['ids'])
            ->whereIn('status', Visit::OPEN_STATUSES)
            ->whereDate('visit_date', '<', now()->toDateString())
            ->update(['status' => $validated['status']]);

        ActivityLogger::log('إغلاق زيارات قديمة من فحص البيانات', 'Visit', null, [
            'status' => $validated['status'], 'count' => $closed, 'ids' => $validated['ids'],
        ]);

        return response()->json(['message' => "تم إغلاق {$closed} زيارة", 'closed' => $closed]);
    }
}
