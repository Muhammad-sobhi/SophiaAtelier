<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Booking;
use App\Models\Fitting;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::withCount(['visits', 'bookings'])->with([
            'visits' => function ($q) {
                $q->latest(); },
            'bookings' => function ($q) {
                $q->latest(); },
            'bookings.dress.accessories',
            'bookings.dress2.accessories',
            'bookings.dress3.accessories',
            'bookings.revenues',
            'fittings'
        ]);

        if ($search = $request->input('search')) {
            $cleanSearch = str_replace(['%', '_'], ['\%', '\_'], $search);
            $query->where(function ($q) use ($cleanSearch) {
                $q->where('name', 'like', "%{$cleanSearch}%")
                    ->orWhere('phone', 'like', "%{$cleanSearch}%");
            });
        }

        return response()->json($query->latest()->paginate($request->input('per_page', 100)));
    }

    public function findClient(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'nullable|integer',
            'phone' => 'nullable|string|min:7',
            'email' => 'nullable|email',
        ]);

        $clientId = $request->input('client_id');
        $phone = $request->input('phone');
        $email = $request->input('email');

        if ($clientId) {
            $client = Client::with(['visits', 'fittings', 'bookings.dress', 'bookings.dress2', 'bookings.dress3'])->find($clientId);
            if ($client) {
                return response()->json($client);
            }
        }

        if (!$phone && !$email) {
            return response()->json([
                'message' => 'يرجى إدخال رقم الهاتف أو البريد الإلكتروني للبحث'
            ], 422);
        }

        $query = Client::query();

        if ($phone && $email) {
            $cleanPhone = preg_replace('/[^\d]/', '', $phone);
            $query->where(function ($q) use ($phone, $cleanPhone, $email) {
                $q->where('phone', $phone)
                    ->orWhere('phone', 'LIKE', "%{$cleanPhone}%")
                    ->orWhere('email', $email);
            });
        } elseif ($phone) {
            $cleanPhone = preg_replace('/[^\d]/', '', $phone);
            $query->where(function ($q) use ($phone, $cleanPhone) {
                $q->where('phone', $phone)
                    ->orWhere('phone', 'LIKE', "%{$cleanPhone}%");
            });
        } elseif ($email) {
            $query->where('email', $email);
        }

        $client = $query->with(['visits', 'fittings', 'bookings.dress', 'bookings.dress2', 'bookings.dress3'])->first();

        if (!$client) {
            return response()->json([
                'message' => 'لم يتم العثور على سجل مبيعات أو حجز مرتبط بهذه البيانات.'
            ], 404);
        }

        return response()->json($client);
    }

    public function show(Client $client): JsonResponse
    {
        $client->loadMissing([
            'visits' => function ($q) {
                $q->latest(); },
            'bookings' => function ($q) {
                $q->latest(); },
            'bookings.dress.accessories',
            'bookings.dress2.accessories',
            'bookings.dress3.accessories',
            'bookings.revenues',
            'fittings',
        ]);

        return response()->json($client);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\.\'\-]+$/u'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'source' => 'nullable|in:instagram,website,referral,walkin,whatsapp',
            'wedding_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('clients', 'public');
            $validated['image_path'] = $path;
        }

        if (empty($validated['city']) && !empty($validated['address'])) {
            $validated['city'] = $validated['address'];
        }

        $client = Client::create($validated);

        return response()->json($client, 201);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[\pL\s\.\'\-]+$/u'],
            'phone' => ['nullable', 'string', 'max:50', 'regex:/^\+?[0-9\s\-\(\)]+$/'],
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'source' => 'nullable|in:instagram,website,referral,walkin,whatsapp',
            'wedding_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('image')) {
            if ($client->image_path) {
                Storage::disk('public')->delete($client->image_path);
            }
            $path = $request->file('image')->store('clients', 'public');
            $validated['image_path'] = $path;
        }

        if (array_key_exists('address', $validated) && empty($validated['city'])) {
            $validated['city'] = $validated['address'];
        }

        $client->update($validated);

        return response()->json($client);
    }

    public function destroy(Client $client): JsonResponse
    {
        // Delete related visits, bookings, and fittings associated with this bride
        $client->visits()->delete();
        $client->bookings()->each(function ($booking) {
            $booking->fittings()->delete();
            $booking->delete();
        });

        $client->delete();

        return response()->json(['message' => 'Client deleted']);
    }

    /**
     * PUT /api/clients/{client}/stage-action
     * Perform a stage action: schedule_fitting, confirm_booking, mark_picked_up, mark_returned
     */
    public function stageAction(Request $request, Client $client): JsonResponse
    {
        $request->validate([
            'action' => 'required|string|in:confirm_visit,schedule_fitting,confirm_booking,end_fitting,mark_picked_up,mark_returned',
            'dress_id' => 'nullable|integer|exists:dresses,id',
            'fitting_date' => 'nullable|date',
            'fitting_time' => 'nullable|string|max:20',
            'event_date' => 'nullable|date',
            'total_amount' => 'nullable|numeric|min:0',
            'deposit_amount' => 'nullable|numeric|min:0',
            'insurance_amount' => 'nullable|numeric|min:0',
            'trying_fee' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $action = $request->input('action');
        switch ($action) {
            case 'confirm_visit':
                $visit = $client->visits()->latest()->first();
                if ($visit) {
                    $visit->update(['status' => 'confirmed']);
                } else {
                    \App\Models\Visit::create([
                        'client_id' => $client->id,
                        'visit_date' => now()->toDateString(),
                        'status' => 'confirmed',
                        'source' => $client->source ?: 'website',
                        'notes' => 'تم تأكيد موعد الزيارة'
                    ]);
                }
                break;

            case 'schedule_fitting':
                // Create a fitting record via the latest booking
                $booking = $client->bookings()->latest()->first();
                $dressId = $request->input('dress_id') ?: ($booking ? $booking->dress_id : 1);
                $fittingDate = $request->input('fitting_date', now()->addDays(3)->toDateString());

                // Check if dress is booked/out on the proposed fitting date
                $conflict = \App\Models\Booking::isDressOutOnDate($dressId, $fittingDate, $client->id);
                if ($conflict) {
                    return response()->json([
                        'message' => "الفستان غير متوفر للبروفة في هذا التاريخ لأنه خارج مع عميلة أخرى من {$conflict}"
                    ], 422);
                }

                if (!$booking) {
                    // Create a default booking first if none exists
                    $booking = Booking::create([
                        'client_id' => $client->id,
                        'dress_id' => $dressId,
                        'booking_date' => now()->toDateString(),
                        'event_date' => $request->input('event_date', now()->addMonths(2)->toDateString()),
                        'status' => 'pending',
                        'total_amount' => 0,
                    ]);
                } else {
                    $booking->update(['dress_id' => $dressId]);
                }

                Fitting::create([
                    'booking_id' => $booking->id,
                    'fitting_date' => $request->input('fitting_date', now()->addDays(3)->toDateString()),
                    'status' => 'scheduled',
                    'additional_notes' => 'الوقت: ' . $request->input('fitting_time', '01:00 م') . ' | ' . $request->input('notes', ''),
                ]);

                // Mark any active visits for the client as done
                $client->visits()->where('status', '!=', 'done')->update(['status' => 'done']);

                $tryingFee = floatval($request->input('trying_fee', 0));
                if ($tryingFee > 0) {
                    $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'fitting_fee',
                        'amount' => $tryingFee,
                        'payment_method' => $request->input('payment_method', 'cash'),
                        'payment_date' => now()->toDateString(),
                        'notes' => 'رسوم تجربة وقياس للفستان',
                        'receipt_path' => $receiptPath,
                    ]);
                }
                break;

            case 'confirm_booking':
                // Get or create booking
                $booking = $client->bookings()->latest()->first();
                if (!$booking) {
                    $booking = new \App\Models\Booking();
                    $booking->client_id = $client->id;
                }

                $dressId = $request->input('dress_id');
                $eventDate = $request->input('event_date', $client->wedding_date);

                // Validate availability
                $conflict = \App\Models\Booking::checkDressAvailability(
                    $client->id,
                    $dressId,
                    $eventDate,
                    $booking->id
                );

                if ($conflict) {
                    return response()->json([
                        'message' => "هذا الفستان غير متوفر في هذه الفترة: {$conflict}"
                    ], 422);
                }

                $booking->dress_id = $dressId;
                $booking->booking_date = now()->toDateString();
                $booking->event_date = $eventDate;
                $booking->total_amount = floatval($request->input('total_amount', 0));
                $booking->deposit_amount = floatval($request->input('deposit_amount', 0));
                $booking->insurance_amount = floatval($request->input('insurance_amount', 500));
                $booking->status = 'confirmed';
                $booking->notes = $request->input('notes');
                $booking->save();

                // Save revenue deposit if greater than 0
                $deposit = floatval($request->input('deposit_amount', 0));
                if ($deposit > 0) {
                    $receiptPath = self::saveReceipt($request, 'receipt') ?? self::saveReceipt($request, 'receipt_image');
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'deposit',
                        'amount' => $deposit,
                        'payment_method' => $request->input('payment_method', 'cash'),
                        'payment_date' => now()->toDateString(),
                        'notes' => 'عربون حجز فستان من رحلة العروس',
                        'receipt_path' => $receiptPath,
                    ]);
                }
                break;

            case 'end_fitting':
                $fittings = $client->fittings()->get();
                if ($fittings->count() === 0) {
                    $booking = $client->bookings()->latest()->first();
                    if ($booking) {
                        Fitting::create([
                            'booking_id' => $booking->id,
                            'fitting_date' => now()->toDateString(),
                            'status' => 'completed',
                            'additional_notes' => 'تم إنهاء البروفات وتحويل العروس لمرحلة الاستلام',
                        ]);
                    }
                } else {
                    foreach ($fittings as $f) {
                        $f->update(['status' => 'completed']);
                    }
                }
                break;

            case 'mark_picked_up':
                $booking = $client->bookings()->latest()->first();
                if ($booking) {
                    $booking->update([
                        'status' => 'picked_up',
                        'insurance_amount' => floatval($request->input('insurance_amount', $booking->insurance_amount))
                    ]);
                    // Also update dress status
                    if ($booking->dress) {
                        $booking->dress->update(['status' => 'out']);
                    }
                }
                break;

            case 'mark_returned':
                $booking = $client->bookings()->latest()->first();
                if ($booking) {
                    $booking->update(['status' => 'returned']);
                    // Mark dress for dry clean
                    if ($booking->dress) {
                        $booking->dress->update(['status' => 'dry_clean']);
                    }

                    // Log negative revenue for insurance refund using the SAME payment method used when collecting insurance
                    $insuranceAmount = floatval($booking->insurance_amount ?: 500);
                    if ($insuranceAmount > 0) {
                        $insuranceRev = $booking->revenues()
                            ->where('notes', 'like', '%تأمين%')
                            ->latest()
                            ->first();

                        $paymentMethod = $insuranceRev ? $insuranceRev->payment_method : 'cash';

                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'other',
                            'amount' => -$insuranceAmount,
                            'payment_method' => $paymentMethod,
                            'payment_date' => now()->toDateString(),
                            'notes' => 'مرتجع مبلغ التأمين بعد استلام الفستان بحالة سليمة للعروس: ' . $client->name,
                        ]);
                    }
                }
                break;

            default:
                return response()->json(['message' => 'Unknown action'], 400);
        }

        // Refresh and return updated stage
        $client->refresh();
        return response()->json([
            'message' => 'Action completed',
            'current_stage' => $client->current_stage,
        ]);
    }

    public function exportCsv(Request $request)
    {
        $headers = [
            "Content-type" => "text/csv; charset=UTF-8",
            "Content-Disposition" => "attachment; filename=previous_brides_" . date('Y-m-d') . ".csv",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $columns = ['ID', 'Name', 'Phone', 'Email', 'City', 'Address', 'Source', 'Notes', 'Wedding Date', 'Created At'];

        $callback = function () use ($columns) {
            $file = fopen('php://output', 'w');

            // Add UTF-8 BOM for Excel Arabic compatibility
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($file, $columns);

            Client::whereHas('bookings', function ($q) {
                $q->where('status', 'returned');
            })->chunk(100, function ($clients) use ($file) {
                foreach ($clients as $client) {
                    $latestBooking = $client->bookings()->latest()->first();
                    $weddingDate = $latestBooking ? $latestBooking->event_date : '';
                    fputcsv($file, [
                        $client->id,
                        $client->name,
                        $client->phone,
                        $client->email,
                        $client->city,
                        $client->address,
                        $client->source,
                        $client->notes,
                        $weddingDate,
                        $client->created_at ? $client->created_at->toDateTimeString() : ''
                    ]);
                }
            });

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function importExcel(Request $request): JsonResponse
    {
        $request->validate([
            'rows' => 'required|array',
            'rows.*' => 'array',
        ]);

        $rows = $request->input('rows');
        $importedCount = 0;
        $errors = [];

        \DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                // Key fields matching the columns
                $brideName = trim($row['bride_name'] ?? $row['اسم العروسه'] ?? $row[0] ?? '');
                if (empty($brideName) || $brideName === 'اسم العروسه') {
                    continue; // Skip header or empty row
                }

                $dressName = trim($row['dress_name'] ?? $row['اسم الفستان'] ?? $row[1] ?? '');
                $bookingDate = trim($row['booking_date'] ?? $row['تاريخ الحجز'] ?? $row['يوم الحجز'] ?? $row[2] ?? '');
                $depositAmount = floatval($row['deposit_amount'] ?? $row['الديبوزيت'] ?? $row[3] ?? 0);

                // Extract fields strictly by header title first, then fall back to numeric index
                $city = trim($row['محافظه'] ?? $row['محافظة'] ?? $row['المحافظة'] ?? $row['city'] ?? $row[11] ?? '');
                $salesPerson = trim($row['السيلز'] ?? $row['sales'] ?? $row[13] ?? '');
                $insuranceAmount = floatval($row['التامين'] ?? $row['التأمين'] ?? $row['insurance_amount'] ?? $row[12] ?? 0);
                $extraNotes = trim($row['ملاحظات'] ?? $row['notes'] ?? $row[14] ?? '');
                $cashPayment = trim($row['كاش'] ?? $row['cash'] ?? $row[9] ?? '');
                $transferPayment = trim($row['تحويل'] ?? $row['transfer'] ?? $row[10] ?? '');
                $remainingAmount = floatval($row['الباقي'] ?? $row['باقي الحجز'] ?? $row['remaining_amount'] ?? $row[8] ?? 0);
                $returnDate = trim($row['يوم التسليم'] ?? $row['ميعاد التسليم'] ?? $row['return_date'] ?? $row[7] ?? '');
                $eventDate = trim($row['ميعاد الفرح'] ?? $row['event_date'] ?? $row[6] ?? '');
                $pickupDate = trim($row['يوم الاستلام'] ?? $row['ميعاد الاستلام'] ?? $row['pickup_date'] ?? $row[5] ?? '');
                $paymentMethodSymbol = trim($row['كاش/تحويل'] ?? $row['cash_transfer'] ?? $row[4] ?? '');

                // Normalize Arabic city names (e.g., "الجيزه" -> "الجيزة", "القاهره" -> "القاهرة")
                if (!empty($city)) {
                    $city = str_replace(['ه', 'أ', 'إ', 'آ'], ['ة', 'ا', 'ا', 'ا'], $city);
                    if (str_contains($city, 'جيز'))
                        $city = 'الجيزة';
                    if (str_contains($city, 'قاهر'))
                        $city = 'القاهرة';
                    if (str_contains($city, 'منصور'))
                        $city = 'المنصورة';
                    if (str_contains($city, 'اسكندر') || str_contains($city, 'إسكندر'))
                        $city = 'الإسكندرية';
                    if (str_contains($city, 'منوف'))
                        $city = 'المنوفية';
                    if (str_contains($city, 'اسماعيل') || str_contains($city, 'إسماعيل'))
                        $city = 'الإسماعيلية';
                    if (str_contains($city, 'سويف'))
                        $city = 'بني سويف';
                    if (str_contains($city, 'شرق'))
                        $city = 'الشرقية';
                    if (str_contains($city, 'غري'))
                        $city = 'الغربية';
                    if (str_contains($city, 'سويس'))
                        $city = 'السويس';
                }

                // Helper to clean and format dates (handles 29\4, 29/4, 2\8, 2026-04-29, extra spaces and arabic digits)
                $parseDate = function ($dateVal) {
                    if (empty($dateVal))
                        return null;
                    try {
                        // Convert Eastern Arabic numerals to Western Arabic
                        $westernDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                        $easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                        $str = str_replace($easternDigits, $westernDigits, trim($dateVal));

                        // Match day and month pattern e.g., 2\8, 2/8, 02-08, 2.8
                        if (preg_match('/^(\d{1,2})[\/\\\\.\-–]\s*(\d{1,2})/u', $str, $matches)) {
                            $day = intval($matches[1]);
                            $month = intval($matches[2]);
                            $year = intval(date('Y'));
                            return sprintf('%04d-%02d-%02d', $year, $month, $day);
                        }

                        // Replace any slashes/backslashes for Carbon fallback
                        $normalized = preg_replace('/[\/\\\\.]/', '-', $str);
                        return \Carbon\Carbon::parse($normalized)->format('Y-m-d');
                    } catch (\Exception $e) {
                        return null;
                    }
                };

                $formattedBookingDate = $parseDate($bookingDate) ?? date('Y-m-d');
                $formattedEventDate = $parseDate($eventDate) ?? $formattedBookingDate;
                $formattedPickupDate = $parseDate($pickupDate);
                $formattedReturnDate = $parseDate($returnDate);

                // 1. Create a distinct Client for every Excel row (supports brides with identical names)
                $client = Client::create([
                    'name' => $brideName,
                    'phone' => '0100000' . rand(1000, 9999),
                    'city' => $city ?: null,
                    'wedding_date' => $formattedEventDate,
                    'source' => 'excel_import',
                    'notes' => $salesPerson ? "السيلز: {$salesPerson}" : null,
                ]);

                // 2. Find or Create Dress
                $dressId = null;
                if (!empty($dressName)) {
                    $dress = \App\Models\Dress::where('name', 'like', "%{$dressName}%")
                        ->orWhere('name_ar', 'like', "%{$dressName}%")
                        ->orWhere('code', 'like', "%{$dressName}%")
                        ->first();

                    if (!$dress) {
                        $firstCat = \App\Models\Category::first();
                        $firstDes = \App\Models\Designer::first();
                        $catId = $firstCat ? $firstCat->id : 1;
                        $desId = $firstDes ? $firstDes->id : 1;

                        $dress = \App\Models\Dress::create([
                            'name' => $dressName,
                            'name_ar' => $dressName,
                            'category_id' => $catId,
                            'designer_id' => $desId,
                            'code' => 'IMP-' . strtoupper(substr(md5($dressName), 0, 5)),
                            'rental_price' => $depositAmount + $remainingAmount,
                            'status' => 'available',
                        ]);
                    }
                    $dressId = $dress->id;
                }

                if (!$dressId) {
                    $firstDress = \App\Models\Dress::first();
                    $dressId = $firstDress ? $firstDress->id : 1;
                }

                // 3. Determine Payment Method (ت = instapay/bank_transfer, ك = cash)
                $paymentMethod = 'cash';
                if ($paymentMethodSymbol === 'ت' || !empty($transferPayment) && $transferPayment !== '0' && $transferPayment !== '-') {
                    $paymentMethod = 'instapay';
                } elseif ($paymentMethodSymbol === 'ك' || (!empty($cashPayment) && $cashPayment !== '0')) {
                    $paymentMethod = 'cash';
                }

                $totalAmount = $depositAmount + $remainingAmount;

                // Build notes from extra dates, sales, notes
                $notesArr = [];
                if ($formattedPickupDate)
                    $notesArr[] = "يوم الاستلام: " . $formattedPickupDate;
                if ($formattedReturnDate)
                    $notesArr[] = "يوم التسليم: " . $formattedReturnDate;
                if ($salesPerson)
                    $notesArr[] = "السيلز: " . $salesPerson;
                if ($extraNotes)
                    $notesArr[] = "ملاحظات: " . $extraNotes;
                $notesStr = implode(' | ', $notesArr);

                // Determine status automatically based on pickup & return date rules:
                // A bride ONLY moves to 'returned' IF her return date (1 day after wedding) has passed!
                $todayStr = date('Y-m-d');
                $calculatedReturnDate = $formattedReturnDate;
                if (!$calculatedReturnDate && $formattedEventDate) {
                    $calculatedReturnDate = \Carbon\Carbon::parse($formattedEventDate)->addDay()->format('Y-m-d');
                }

                $bookingStatus = 'confirmed';
                if ($formattedPickupDate && $formattedPickupDate < '2026-08-02') {
                    if ($calculatedReturnDate && $calculatedReturnDate <= $todayStr) {
                        $bookingStatus = 'returned';
                    } else {
                        $bookingStatus = 'picked_up';
                    }
                } elseif ($formattedPickupDate && $formattedPickupDate === '2026-08-02') {
                    if ($calculatedReturnDate && $calculatedReturnDate <= $todayStr) {
                        $bookingStatus = 'returned';
                    } else {
                        $bookingStatus = 'picked_up';
                    }
                } else {
                    $bookingStatus = 'confirmed';
                }

                // 4. Create Booking
                $booking = Booking::create([
                    'client_id' => $client->id,
                    'dress_id' => $dressId,
                    'booking_date' => $formattedBookingDate,
                    'event_date' => $formattedEventDate,
                    'status' => $bookingStatus,
                    'total_amount' => $totalAmount,
                    'deposit_amount' => $depositAmount,
                    'insurance_amount' => $insuranceAmount,
                    'payment_method' => $paymentMethod,
                    'notes' => $notesStr ?: 'استيراد تلقائي من شيت إكسيل',
                ]);

                // Create revenue record for financial tracking if deposit paid
                if ($depositAmount > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'deposit',
                        'amount' => $depositAmount,
                        'payment_method' => $paymentMethod,
                        'payment_date' => $formattedBookingDate,
                        'notes' => 'دفعة عربون من شيت الإكسيل - ' . $client->name,
                    ]);
                }

                $importedCount++;
            }

            \DB::commit();
            return response()->json([
                'success' => true,
                'message' => "تم استيراد {$importedCount} عروسة وحجز بنجاح!",
                'count' => $importedCount
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'حدث خطأ أثناء استيراد البيانات: ' . $e->getMessage()
            ], 500);
        }
    }
}


