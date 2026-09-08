<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$countA = \App\Models\Attendance::where('date', '<', '2026-09-01')->delete();
$countL = \App\Models\LeaveRequest::where('start_date', '<', '2026-09-01')->delete();
$countLoan = \App\Models\EmployeeLoan::where('date', '<', '2026-09-01')->delete();

echo "Deleted Attendances: $countA\n";
echo "Deleted Leave Requests: $countL\n";
echo "Deleted Loans: $countLoan\n";
