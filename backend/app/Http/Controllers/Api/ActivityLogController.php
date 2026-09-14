<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::with('user:id,name,email,role')->latest();

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('employee_name', 'like', "%{$s}%")
                  ->orWhere('action', 'like', "%{$s}%")
                  ->orWhere('entity_type', 'like', "%{$s}%")
                  ->orWhere('entity_id', 'like', "%{$s}%")
                  ->orWhere('summary->description', 'like', "%{$s}%")
                  ->orWhere('ip', 'like', "%{$s}%");
            });
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        if ($request->filled('employee_name')) {
            $query->where('employee_name', $request->input('employee_name'));
        }

        if ($request->filled('action') && $request->input('action') !== 'all') {
            $action = trim($request->input('action'));

            switch ($action) {
                case 'booking':
                case 'حجز':
                case 'حجوزات':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%حجز%')
                          ->orWhere('action', 'like', '%booking%')
                          ->orWhere('entity_type', 'like', '%Booking%');
                    });
                    break;

                case 'visit':
                case 'زيارة':
                case 'زيارات':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%زيارة%')
                          ->orWhere('action', 'like', '%visit%')
                          ->orWhere('action', 'like', '%عميل%')
                          ->orWhere('action', 'like', '%client%')
                          ->orWhere('entity_type', 'like', '%Visit%')
                          ->orWhere('entity_type', 'like', '%Client%');
                    });
                    break;

                case 'fitting':
                case 'بروفة':
                case 'بروفات':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%بروفة%')
                          ->orWhere('action', 'like', '%قياس%')
                          ->orWhere('action', 'like', '%fitting%')
                          ->orWhere('entity_type', 'like', '%Fitting%');
                    });
                    break;

                case 'pickup':
                case 'تسليم':
                case 'تسليم للعروس':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%تسليم%')
                          ->orWhere('action', 'like', '%pickup%');
                    });
                    break;

                case 'return':
                case 'استلام':
                case 'استلام الفستان':
                case 'مرتجع':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%استلام%')
                          ->orWhere('action', 'like', '%إرجاع%')
                          ->orWhere('action', 'like', '%مرتجع%')
                          ->orWhere('action', 'like', '%return%');
                    });
                    break;

                case 'finance':
                case 'سداد':
                case 'مالية':
                case 'مدفوعات':
                case 'مدفوعات ومالية':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%سداد%')
                          ->orWhere('action', 'like', '%إيراد%')
                          ->orWhere('action', 'like', '%دفعة%')
                          ->orWhere('action', 'like', '%تحويل%')
                          ->orWhere('action', 'like', '%إيداع%')
                          ->orWhere('action', 'like', '%سحب%')
                          ->orWhere('action', 'like', '%مصروف%')
                          ->orWhere('action', 'like', '%pay%')
                          ->orWhere('action', 'like', '%transfer%')
                          ->orWhere('action', 'like', '%deposit%')
                          ->orWhere('action', 'like', '%withdraw%')
                          ->orWhere('entity_type', 'like', '%Revenue%')
                          ->orWhere('entity_type', 'like', '%Expense%');
                    });
                    break;

                case 'auth':
                case 'دخول':
                case 'دخول وخروج':
                    $query->where(function ($q) {
                        $q->where('action', 'like', '%دخول%')
                          ->orWhere('action', 'like', '%خروج%')
                          ->orWhere('action', 'like', '%login%')
                          ->orWhere('action', 'like', '%logout%');
                    });
                    break;

                default:
                    $query->where(function ($q) use ($action) {
                        $q->where('action', 'like', "%{$action}%")
                          ->orWhere('entity_type', 'like', "%{$action}%")
                          ->orWhere('summary', 'like', "%{$action}%");
                    });
                    break;
            }
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->input('date'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->input('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->input('to_date'));
        }

        $perPage = min(100, max(10, (int) $request->input('per_page', 25)));

        return response()->json($query->paginate($perPage));
    }
}

