<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CategoryController;
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
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\VisitController;
use App\Http\Controllers\Api\FaqController;
use Illuminate\Support\Facades\Route;

// Rate-limited login route
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1,login')->name('login');

// Public routes (rate-limited). The third throttle argument gives each route its own
// counter; without it every throttled guest route shares one per-IP counter.
Route::post('/public/register-client', [ClientController::class, 'store'])->middleware('throttle:5,1,register-client');
Route::post('/public/find-client', [ClientController::class, 'findClient'])->middleware('throttle:10,1,find-client');
Route::post('/public/bookings', [BookingController::class, 'publicStore'])->middleware('throttle:5,1,bookings');
Route::post('/public/contact-messages', [\App\Http\Controllers\Api\ContactMessageController::class, 'publicStore'])->middleware('throttle:5,1,contact-messages');
Route::get('/public/fully-booked-slots', [VisitController::class, 'getFullyBookedSlots']);
Route::post('/public/availability', [\App\Http\Controllers\Api\AvailabilityController::class, 'publicCheck'])->middleware('throttle:60,1,availability');
Route::get('/public/reviews', [ReviewController::class, 'publicIndex']);
Route::get('/public/categories', [CategoryController::class, 'publicIndex']);
Route::get('/public/collections', [\App\Http\Controllers\Api\CollectionController::class, 'publicIndex']);
Route::get('/public/client-gallery', [\App\Http\Controllers\Api\ClientGalleryController::class, 'publicIndex']);
Route::get('/public/faqs', [FaqController::class, 'publicIndex']);
Route::get('/public/settings', [\App\Http\Controllers\Api\SettingController::class, 'publicIndex']);
Route::get('/public/closed-days', [\App\Http\Controllers\Api\ClosedDayController::class, 'publicIndex']);
Route::get('/public/best-sellers', [DressController::class, 'bestSellers']);
Route::get('/public/offers', [OfferController::class, 'publicIndex']);
Route::get('/public/system-status', function () {
    return response()->json([
        'status' => 'online',
    ]);
});
Route::get('/dresses', [DressController::class, 'index']);
Route::get('/dresses/{dress}', [DressController::class, 'show']);

// Direct file serving route for uploads (bypasses web server symlink issues completely)
Route::get('/storage/{path}', \App\Http\Controllers\StorageFileController::class)->where('path', '.*');

// General Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/brides-summary', [DashboardController::class, 'bridesSummary']);
    Route::get('/dashboard/dresses-summary', [DashboardController::class, 'dressesSummary']);

    // Calendar — visits, bookings, fittings, pickups and returns as dated events
    Route::get('/calendar/events', [CalendarController::class, 'events']);
    Route::get('/calendar/months', [CalendarController::class, 'months']);

    // Bulk export / import of every bride's contact details: the brides page only
    Route::middleware('permission:/dashboard/brides')->group(function () {
        Route::get('/clients/export-csv', [ClientController::class, 'exportCsv']);
        Route::get('/clients/excel-template', [ClientController::class, 'excelTemplate']);
        Route::post('/clients/import-excel', [ClientController::class, 'importExcel']);
    });
    Route::apiResource('clients', ClientController::class)->except(['destroy']);
    Route::apiResource('clients', ClientController::class)->only(['destroy'])->middleware('permission:/dashboard/brides');
    Route::put('/clients/{client}/stage-action', [ClientController::class, 'stageAction']);
    Route::put('/bookings/{booking}/revert-stage', [ClientController::class, 'revertStage']);

    Route::get('/dresses/{dress}/availability-check', [DressController::class, 'checkAvailability']);
    // Dresses are read across the dashboard (brides journey, visits, bookings); changing them needs the dresses page
    Route::middleware('permission:/dashboard/dresses')->group(function () {
        Route::post('/dresses/best-sellers/reorder', [DressController::class, 'reorderBestSellers']);
        Route::patch('/dresses/{dress}/best-seller', [DressController::class, 'toggleBestSeller']);
        Route::apiResource('dresses', DressController::class)->except(['index', 'show']);
        Route::put('/dresses/{dress}/stage-action', [DressController::class, 'stageAction']);
        Route::post('/dresses/{dress}/images', [DressController::class, 'uploadImages']);
        Route::delete('/dresses/{dress}/images/{image}', [DressController::class, 'deleteImage']);
        Route::apiResource('designers', DesignerController::class);
    });

    // Categories and collections are picked from the dresses and offers pages
    Route::apiResource('categories', CategoryController::class)->only(['index', 'show'])
        ->middleware('permission:/dashboard/dresses,/dashboard/offers');
    Route::apiResource('categories', CategoryController::class)->except(['index', 'show'])
        ->middleware('permission:/dashboard/dresses');
    Route::apiResource('collections', \App\Http\Controllers\Api\CollectionController::class)->only(['index', 'show'])
        ->middleware('permission:/dashboard/collections,/dashboard/dresses,/dashboard/offers');
    Route::apiResource('collections', \App\Http\Controllers\Api\CollectionController::class)->except(['index', 'show'])
        ->middleware('permission:/dashboard/collections');
    Route::apiResource('client-gallery', \App\Http\Controllers\Api\ClientGalleryController::class)
        ->middleware('permission:/dashboard/client-gallery');
    Route::get('visits/{visit}/availability', [VisitController::class, 'availability']);
    Route::post('visits/{visit}/confirmation-sent', [VisitController::class, 'markConfirmationSent']);
    Route::post('availability', [\App\Http\Controllers\Api\AvailabilityController::class, 'check']);
    // Visits, bookings and fittings run through the brides journey from the home page; deleting one needs its page
    Route::apiResource('visits', VisitController::class)->except(['destroy']);
    Route::apiResource('visits', VisitController::class)->only(['destroy'])->middleware('permission:/dashboard/visits');
    Route::post('bookings/{booking}/bill-image', [BookingController::class, 'uploadBillImage']);
    Route::delete('bookings/{booking}/bill-image', [BookingController::class, 'deleteBillImage']);
    Route::apiResource('bookings', BookingController::class)->except(['destroy']);
    Route::apiResource('bookings', BookingController::class)->only(['destroy'])->middleware('permission:/dashboard/bookings');
    Route::post('fittings/{fitting}/measurement-image', [FittingController::class, 'uploadMeasurementImage']);
    Route::delete('fittings/{fitting}/measurement-image', [FittingController::class, 'deleteMeasurementImage']);
    Route::apiResource('fittings', FittingController::class)->except(['destroy']);
    Route::apiResource('fittings', FittingController::class)->only(['destroy'])->middleware('permission:/dashboard/fittings');
    // Visits and bookings pages add follow-up tasks too
    Route::apiResource('tasks', TaskController::class)->only(['store'])
        ->middleware('permission:/dashboard/tasks,/dashboard/visits,/dashboard/bookings');
    Route::apiResource('tasks', TaskController::class)->except(['store'])->middleware('permission:/dashboard/tasks');
    Route::apiResource('reviews', ReviewController::class)->middleware('permission:/dashboard/reviews');
    // Payments are recorded from the brides journey too; listing, changing or deleting them needs the brides or finance page
    Route::apiResource('revenues', RevenueController::class)->only(['store']);
    Route::apiResource('revenues', RevenueController::class)->except(['store'])
        ->middleware('permission:/dashboard/brides,/dashboard/finance');
    Route::apiResource('expenses', ExpenseController::class)->middleware('permission:/dashboard/finance,/dashboard/reports');
    Route::apiResource('faqs', FaqController::class);
    Route::apiResource('offers', OfferController::class)->middleware('permission:/dashboard/offers');

    // Manufacturing: suppliers, materials stock, purchases, workshop workers and manufacturing orders
    Route::middleware('permission:/dashboard/manufacturing')->group(function () {
        Route::apiResource('suppliers', \App\Http\Controllers\Api\SupplierController::class);
        Route::post('/suppliers/{supplier}/payments', [\App\Http\Controllers\Api\SupplierController::class, 'storePayment']);
        Route::delete('/suppliers/{supplier}/payments/{payment}', [\App\Http\Controllers\Api\SupplierController::class, 'destroyPayment']);
        Route::get('/materials/movements', [\App\Http\Controllers\Api\MaterialController::class, 'movements']);
        Route::delete('/materials/movements/{movement}', [\App\Http\Controllers\Api\MaterialController::class, 'destroyMovement']);
        Route::post('/materials/maintenance-use', [\App\Http\Controllers\Api\MaterialController::class, 'useForMaintenance']);
        Route::post('/materials/{material}/adjust', [\App\Http\Controllers\Api\MaterialController::class, 'adjust']);
        Route::apiResource('materials', \App\Http\Controllers\Api\MaterialController::class)->except(['show']);
        Route::apiResource('material-purchases', \App\Http\Controllers\Api\MaterialPurchaseController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('workers', \App\Http\Controllers\Api\WorkerController::class);
        Route::post('/workers/{worker}/payments', [\App\Http\Controllers\Api\WorkerController::class, 'storePayment']);
        Route::delete('/workers/{worker}/payments/{payment}', [\App\Http\Controllers\Api\WorkerController::class, 'destroyPayment']);
        Route::apiResource('manufacturing-orders', \App\Http\Controllers\Api\ManufacturingOrderController::class);
        Route::post('/manufacturing-orders/{manufacturingOrder}/materials', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'addMaterials']);
        Route::delete('/manufacturing-orders/{manufacturingOrder}/materials/{movement}', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'removeMaterial']);
        Route::put('/manufacturing-orders/{manufacturingOrder}/dress', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'linkDress']);
        Route::patch('/manufacturing-orders/{manufacturingOrder}/status', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'updateStatus']);
    });

    // Reports endpoints
    Route::middleware('permission:/dashboard/reports')->group(function () {
        Route::get('/reports/dresses', [ReportController::class, 'dressesReport']);
        Route::get('/reports/bookings', [ReportController::class, 'bookingsReport']);
        Route::get('/reports/visits', [ReportController::class, 'visits']);
        Route::get('/reports/sales-employees', [ReportController::class, 'salesEmployees']);
        Route::get('/reports/brides', [ReportController::class, 'brides']);
        Route::get('/reports/cancellations', [ReportController::class, 'cancellations']);
        Route::get('/reports/sales', [ReportController::class, 'sales']);
        Route::get('/reports/sales-by-stage', [ReportController::class, 'salesByStage']);
        Route::get('/reports/conversion', [ReportController::class, 'conversion']);
        Route::get('/reports/top-dresses', [ReportController::class, 'topDresses']);
        Route::get('/reports/worst-dresses', [ReportController::class, 'worstDresses']);
        Route::get('/reports/revenue', [ReportController::class, 'revenue']);
        Route::get('/reports/client-sources', [ReportController::class, 'clientSources']);
        Route::get('/reports/executive-summary', [ReportController::class, 'executiveSummary']);
    });

    // Finance endpoints
    Route::middleware('permission:/dashboard/finance,/dashboard/reports')->group(function () {
        Route::get('/finance/ledger', [FinanceController::class, 'ledger']);
        Route::get('/finance/summary', [FinanceController::class, 'summary']);
        Route::get('/finance/transactions', [FinanceController::class, 'transactions']);
        Route::get('/finance/payment-breakdown', [FinanceController::class, 'paymentBreakdown']);
    });

    // Employee routes (staff & admin)
    Route::apiResource('employees', EmployeeController::class)->only(['index', 'show']);
    Route::apiResource('employees', EmployeeController::class)->except(['index', 'show'])
        ->middleware('permission:/dashboard/employees');

    // Attendance and payroll summary: the attendance page
    Route::middleware('permission:/dashboard/attendance')->group(function () {
        // Attendance (read & save for staff & admin)
        Route::get('/attendance', [AttendanceController::class, 'index']);
        Route::get('/attendance/{attendance}', [AttendanceController::class, 'show']);
        Route::post('/attendance/bulk', [AttendanceController::class, 'bulkStore']);
        Route::post('/attendance', [AttendanceController::class, 'store']);
        Route::put('/attendance/{attendance}', [AttendanceController::class, 'update']);
        Route::delete('/attendance/{attendance}', [AttendanceController::class, 'destroy']);

        // Payroll summary (for attendance/payroll tab)
        Route::get('/payroll/summary', [PayrollController::class, 'summary']);
    });
    Route::middleware('permission:payroll.manage')->group(function () {
        Route::post('/payroll/deduct-loans', [PayrollController::class, 'deductLoans']);
        Route::post('/payroll/payments', [PayrollController::class, 'pay']);
        Route::delete('/payroll/payments/{payment}', [PayrollController::class, 'destroyPayment']);
        Route::post('/payroll/pieces', [PayrollController::class, 'storePieces']);
        Route::delete('/payroll/pieces/{entry}', [PayrollController::class, 'destroyPieces']);
        Route::post('/employee-loans', [EmployeeLoanController::class, 'store']);
        Route::put('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'update']);
        Route::delete('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'destroy']);
    });

    Route::apiResource('leave-requests', LeaveRequestController::class)->middleware('permission:/dashboard/attendance');

    // Employee Loans (read for staff & admin)
    Route::get('/employee-loans', [EmployeeLoanController::class, 'index'])->middleware('permission:/dashboard/attendance');
    Route::get('/employee-loans/{employeeLoan}', [EmployeeLoanController::class, 'show'])->middleware('permission:/dashboard/attendance');

    // Static paths before the resource so "delete-all" is not captured as {notification}
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/delete-all', [NotificationController::class, 'deleteAll']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::apiResource('notifications', NotificationController::class)->only(['index', 'show', 'destroy']);

    Route::middleware('permission:/dashboard/contact-messages')->group(function () {
        Route::apiResource('contact-messages', \App\Http\Controllers\Api\ContactMessageController::class)->only(['index', 'destroy']);
        Route::post('/contact-messages/{id}/read', [\App\Http\Controllers\Api\ContactMessageController::class, 'markAsRead']);
    });

    // WhatsApp Message Templates: every page sends messages with them, editing needs the templates page
    Route::get('/whatsapp-templates', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'index']);
    Route::get('/whatsapp-templates/{whatsappTemplate}', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'show']);
    Route::put('/whatsapp-templates/{idOrKey}', [\App\Http\Controllers\Api\WhatsappTemplateController::class, 'update'])
        ->middleware('permission:/dashboard/whatsapp-templates');
});

// Admin-only Protected Routes
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::post('/finance/transfer', [FinanceController::class, 'transfer']);
    Route::post('/finance/deposit', [FinanceController::class, 'deposit']);
    Route::post('/finance/withdraw', [FinanceController::class, 'withdraw']);

    Route::get('/activity-logs', [\App\Http\Controllers\Api\ActivityLogController::class, 'index']);

    // Data health: problems that make the reports wrong, with merge / close fixes
    Route::get('/data-health', [\App\Http\Controllers\Api\DataHealthController::class, 'index']);
    Route::post('/data-health/merge-clients', [\App\Http\Controllers\Api\DataHealthController::class, 'mergeClients']);
    Route::post('/data-health/close-visits', [\App\Http\Controllers\Api\DataHealthController::class, 'closeVisits']);
    Route::post('/data-health/confirm-booking-date', [\App\Http\Controllers\Api\DataHealthController::class, 'confirmBookingDate']);
    Route::get('/data-health/{check}', [\App\Http\Controllers\Api\DataHealthController::class, 'show']);
    Route::post('/manufacturing-orders/{manufacturingOrder}/approve', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'approve']);
    Route::post('/manufacturing-orders/{manufacturingOrder}/dress', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'createDress']);
    Route::post('/manufacturing-orders/{manufacturingOrder}/unapprove', [\App\Http\Controllers\Api\ManufacturingOrderController::class, 'unapprove']);

    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::get('/dashboard/executive', [DashboardController::class, 'executive']);

    // System settings
    Route::get('/settings', [\App\Http\Controllers\Api\SettingController::class, 'index']);
    Route::put('/settings', [\App\Http\Controllers\Api\SettingController::class, 'update']);
    Route::get('/closed-days', [\App\Http\Controllers\Api\ClosedDayController::class, 'index']);
    Route::post('/closed-days', [\App\Http\Controllers\Api\ClosedDayController::class, 'store']);
    Route::delete('/closed-days/{closedDay}', [\App\Http\Controllers\Api\ClosedDayController::class, 'destroy']);
});
