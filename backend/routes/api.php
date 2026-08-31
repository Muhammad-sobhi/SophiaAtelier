<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CleaningOrderController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DressController;
use App\Http\Controllers\Api\DesignerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\EmployeeLoanController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\FittingController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\FaqController;
use Illuminate\Support\Facades\Route;

// Rate-limited login route
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Public routes (rate-limited)
Route::post('/public/register-client', [ClientController::class, 'store'])->middleware('throttle:5,1');
Route::post('/public/find-client', [ClientController::class, 'findClient'])->middleware('throttle:10,1');
Route::post('/public/bookings', [BookingController::class, 'publicStore'])->middleware('throttle:5,1');
Route::post('/public/contact-messages', [\App\Http\Controllers\Api\ContactMessageController::class, 'publicStore'])->middleware('throttle:5,1');
Route::get('/public/fully-booked-slots', [VisitController::class, 'getFullyBookedSlots']);
Route::get('/public/reviews', [ReviewController::class, 'publicIndex']);
Route::get('/public/categories', [CategoryController::class, 'publicIndex']);
Route::get('/public/collections', [\App\Http\Controllers\Api\CollectionController::class, 'publicIndex']);
Route::get('/public/client-gallery', [\App\Http\Controllers\Api\ClientGalleryController::class, 'publicIndex']);
Route::get('/public/faqs', [FaqController::class, 'publicIndex']);
Route::get('/public/system-status', function () {
    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }
    return response()->json([
        'status' => 'online',
        'dress_code_auto_release' => true,
        'version' => '2026.08.13-v4',
        'server_time' => now()->toDateTimeString(),
    ]);
});
Route::get('/dresses', [DressController::class, 'index']);
Route::get('/dresses/release-code/{code}', [DressController::class, 'releaseCode']);
Route::get('/dresses/{dress}', [DressController::class, 'show']);

// Direct file serving route for uploads (bypasses web server symlink issues completely)
Route::get('/storage/{path}', function ($path) {
    $cleanPath = ltrim($path, '/');
    // Remove any "storage/" prefix that may have been prepended
    $cleanPath = preg_replace('#^storage/#', '', $cleanPath);

    // Try multiple potential locations
    $searchPaths = [
        storage_path('app/public/' . $cleanPath),
        storage_path('app/' . $cleanPath),
        public_path('storage/' . $cleanPath),
    ];

    $foundPath = null;
    foreach ($searchPaths as $candidate) {
        if (file_exists($candidate) && !is_dir($candidate)) {
            $foundPath = $candidate;
            break;
        }
    }

    if (!$foundPath) {
        // Return SVG placeholder with a 200 so <img> tags don't break
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f8fafc"/><path d="M160 210 Q 200 170 240 210 Q 280 250 240 290 Q 200 330 160 290 Z" fill="#e2e8f0"/><circle cx="200" cy="180" r="25" fill="#cbd5e1"/><text x="50%" y="82%" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#94a3b8" text-anchor="middle">Sophia Atelier</text></svg>';
        return response($svg, 200, ['Content-Type' => 'image/svg+xml', 'Cache-Control' => 'no-cache']);
    }

    $mime = @mime_content_type($foundPath) ?: 'image/jpeg';
    return response()->file($foundPath, [
        'Content-Type' => $mime,
        'Cache-Control' => 'public, max-age=31536000',
        'Access-Control-Allow-Origin' => '*',
    ]);
})->where('path', '.*');

// Debug endpoint to verify storage file existence (remove in production if desired)
Route::get('/storage-debug/{path}', function ($path) {
    $cleanPath = ltrim($path, '/');
    $cleanPath = preg_replace('#^storage/#', '', $cleanPath);

    $locations = [
        'storage/app/public/' . $cleanPath => storage_path('app/public/' . $cleanPath),
        'storage/app/' . $cleanPath => storage_path('app/' . $cleanPath),
        'public/storage/' . $cleanPath => public_path('storage/' . $cleanPath),
    ];

    $results = [];
    foreach ($locations as $label => $fullPath) {
        $results[$label] = [
            'full_path' => $fullPath,
            'exists' => file_exists($fullPath),
            'is_file' => is_file($fullPath),
            'readable' => is_readable($fullPath),
            'size' => file_exists($fullPath) && is_file($fullPath) ? filesize($fullPath) : null,
        ];
    }

    // Also check if parent directories exist
    $parentDir = storage_path('app/public/' . dirname($cleanPath));
    $results['parent_directory'] = [
        'path' => $parentDir,
        'exists' => is_dir($parentDir),
        'writable' => is_writable($parentDir),
    ];

    // List files in the relevant subdirectory
    $subDir = storage_path('app/public/' . explode('/', $cleanPath)[0]);
    $dirContents = [];
    if (is_dir($subDir)) {
        $files = array_slice(scandir($subDir), 0, 20); // first 20 files
        $dirContents = $files;
    }

    return response()->json([
        'requested_path' => $path,
        'clean_path' => $cleanPath,
        'locations' => $results,
        'directory_sample' => $dirContents,
    ]);
})->where('path', '.*');

// General Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/brides-summary', [DashboardController::class, 'bridesSummary']);
    Route::get('/dashboard/dresses-summary', [DashboardController::class, 'dressesSummary']);

    // Calendar — merged visits + bookings
    Route::get('/calendar/events', [CalendarController::class, 'events']);

    Route::get('/clients/export-csv', [ClientController::class, 'exportCsv']);
    Route::post('/clients/import-excel', [ClientController::class, 'importExcel']);
    Route::apiResource('clients', ClientController::class);
    Route::put('/clients/{client}/stage-action', [ClientController::class, 'stageAction']);

    Route::apiResource('dresses', DressController::class)->except(['index', 'show']);
    Route::put('/dresses/{dress}/stage-action', [DressController::class, 'stageAction']);

    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('collections', \App\Http\Controllers\Api\CollectionController::class);
    Route::apiResource('client-gallery', \App\Http\Controllers\Api\ClientGalleryController::class);
    Route::apiResource('designers', DesignerController::class);
    Route::apiResource('visits', VisitController::class);
    Route::apiResource('bookings', BookingController::class);
    Route::apiResource('fittings', FittingController::class);
    Route::apiResource('tasks', TaskController::class);
    Route::apiResource('reviews', ReviewController::class);
    Route::apiResource('faqs', FaqController::class);

    // Employee read routes (staff & admin)
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);

    // Attendance (read & save for staff & admin)
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::get('/attendance/{attendance}', [AttendanceController::class, 'show']);
    Route::post('/attendance/bulk', [AttendanceController::class, 'bulkStore']);
    Route::post('/attendance', [AttendanceController::class, 'store']);
    Route::put('/attendance/{attendance}', [AttendanceController::class, 'update']);
    Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy']);

    // Payroll summary (for attendance/payroll tab)
    Route::get('/payroll/summary', [PayrollController::class, 'summary']);
    Route::post('/payroll/deduct-loans', [PayrollController::class, 'deductLoans']);

    Route::apiResource('leave-requests', LeaveRequestController::class);

    // Employee Loans (read for staff & admin)
    Route::get('/employee-loans', [EmployeeLoanController::class, 'index']);
    Route::get('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'show']);

    Route::apiResource('notifications', NotificationController::class)->only(['index', 'show', 'destroy']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/delete-all', [NotificationController::class, 'deleteAll']);

    Route::apiResource('contact-messages', \App\Http\Controllers\Api\ContactMessageController::class)->only(['index', 'destroy']);
    Route::post('/contact-messages/{id}/read', [\App\Http\Controllers\Api\ContactMessageController::class, 'markAsRead']);

    // WhatsApp Message Templates
    Route::get('/whatsapp-templates', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'index']);
    Route::get('/whatsapp-templates/{whatsappTemplate}', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'show']);
    Route::put('/whatsapp-templates/{idOrKey}', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'update']);

    // Dress image upload / delete
    Route::post('/dresses/{dress}/images', [DressController::class, 'uploadImages']);
    Route::delete('/dresses/{dress}/images/{image}', [DressController::class, 'deleteImage']);
});

// Admin-only Protected Routes
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::get('/dashboard/executive', [DashboardController::class, 'executive']);

    // Employee management (create, update, delete) — admin only
    Route::post('/employees', [EmployeeController::class, 'store']);
    Route::put('/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);

    // Finance & Payroll — admin only
    Route::apiResource('revenues', RevenueController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::get('/finance/ledger', [FinanceController::class, 'ledger']);
    Route::post('/finance/transfer', [FinanceController::class, 'transfer']);
    Route::post('/finance/deposit', [FinanceController::class, 'deposit']);
    Route::post('/finance/withdraw', [FinanceController::class, 'withdraw']);
    Route::get('/clients/export/csv', [ClientController::class, 'exportCsv']);

    // Leave request status approval — admin only
    Route::put('/leave-requests/{leaveRequest}/status', [LeaveRequestController::class, 'updateStatus']);

    // Employee Loans — admin only (create, update, delete)
    Route::post('/employee-loans', [EmployeeLoanController::class, 'store']);
    Route::put('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'update']);
    Route::delete('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'destroy']);

    // Cleaning Orders — admin only
    Route::apiResource('cleaning-orders', CleaningOrderController::class);

    // Reports — admin only
    Route::get('/reports/sales', [ReportController::class, 'sales']);
    Route::get('/reports/conversion', [ReportController::class, 'conversion']);
    Route::get('/reports/top-dresses', [ReportController::class, 'topDresses']);
    Route::get('/reports/worst-dresses', [ReportController::class, 'worstDresses']);
    Route::get('/reports/revenue', [ReportController::class, 'revenue']);
    Route::get('/reports/client-sources', [ReportController::class, 'clientSources']);
    Route::get('/reports/executive-summary', [ReportController::class, 'executiveSummary']);
});
