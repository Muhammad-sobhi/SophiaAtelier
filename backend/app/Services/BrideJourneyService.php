<?php

namespace App\Services;

use App\Exceptions\ActionRejected;
use App\Http\Controllers\Api\VisitController;
use App\Models\Booking;
use App\Models\Client;
use App\Models\Fitting;
use App\Models\Visit;
use Illuminate\Http\Request;

/**
 * The bride journey: what each stage action (visit -> booking -> fitting -> pickup -> return, or cancel)
 * changes on her visits, booking, fittings, dresses and payments. An action that cannot be done throws
 * ActionRejected with the message shown to the employee.
 */
class BrideJourneyService
{
    /** Activity log title of each action */
    public const ACTION_LABELS = [
        'confirm_visit' => 'تأكيد زيارة عروس',
        'close_visit' => 'تحديث نتيجة زيارة عروس',
        'schedule_fitting' => 'جدولة بروفة قياس',
        'confirm_booking' => 'تأكيد حجز فستان',
        'end_fitting' => 'إنهاء بروفات القياس',
        'mark_picked_up' => 'تسليم الفستان للعروس',
        'mark_returned' => 'استلام الفستان وتسوية التأمين',
        'pay_remaining' => 'سداد دفعة مالية',
        'cancel_booking' => 'إلغاء حجز عروس',
    ];

    public function run(string $action, Client $client, Request $request): void
    {
        match ($action) {
            'confirm_visit' => $this->confirmVisit($client, $request),
            'close_visit' => $this->closeVisit($client, $request),
            'schedule_fitting' => $this->scheduleFitting($client, $request),
            'confirm_booking' => $this->confirmBooking($client, $request),
            'end_fitting' => $this->endFitting($client, $request),
            'mark_picked_up' => $this->markPickedUp($client, $request),
            'mark_returned' => $this->markReturned($client, $request),
            'pay_remaining' => $this->payRemaining($client, $request),
            'cancel_booking' => $this->cancelBooking($client, $request),
        };

        $actionTitle = self::ACTION_LABELS[$action] ?? "إجراء مرحلة: {$action}";
        ActivityLogger::log(
            $actionTitle,
            'Client',
            $client->id,
            [
                'bride_name' => $client->name,
                'bride_phone' => $client->phone,
                'sales_name' => $request->input('sales_name'),
                'action_key' => $action,
                'cancellation_reason' => $request->input('cancellation_reason'),
                'deposit_refund' => $action === 'cancel_booking' ? floatval($request->input('deposit_refund', 0)) : null,
                'insurance_refund' => $action === 'cancel_booking' ? floatval($request->input('insurance_refund', 0)) : null,
            ],
            $request->input('sales_name')
        );
    }

    /** Confirms her open visit request, or registers a visit made in the shop / by phone */
    private function confirmVisit(Client $client, Request $request): void
    {
        // Confirm the bride's open visit request (or register a walk-in visit) without
        // overwriting the date/time she asked for unless the employee changed them
        $visit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
        Visit::assertVisitWindow(
            $request->input('visit_date') ?: ($visit?->visit_date ?? now()->toDateString()),
            $request->input('event_date') ?: $client->wedding_date
        );
        $visitTime = $request->filled('visit_time') ? VisitController::normalizeTimeSlot($request->input('visit_time')) : null;

        $visitData = array_filter([
            'visit_date' => $request->input('visit_date'),
            'time_slot' => $visitTime,
            'sales_name' => $request->input('sales_name'),
        ], fn($v) => $v !== null && $v !== '');
        if ($request->has('trying_fee')) {
            $visitData['trying_fee'] = floatval($request->input('trying_fee', 0));
        }

        if ($visit) {
            // A new date/time means the bride must get a new WhatsApp confirmation
            $rescheduled = (isset($visitData['visit_date']) && $visitData['visit_date'] !== $visit->visit_date?->toDateString())
                || (isset($visitData['time_slot']) && $visitData['time_slot'] !== $visit->time_slot);
            if ($rescheduled) {
                $visitData['confirmation_sent_at'] = null;
            }
            $visit->update($visitData);
        } else {
            // Visit registered by staff (in the shop, by phone or chat)
            $visit = Visit::create($visitData + [
                'client_id' => $client->id,
                'visit_date' => now()->toDateString(),
                'source' => $request->input('visit_source') ?: 'walkin',
                'notes' => 'تم تسجيل الزيارة من الداشبورد',
            ]);
        }
        $visit->markConfirmed($request->user()?->id);
        $visit->declineOtherOpenVisits();

        if ($request->filled('event_date')) {
            $client->update(['wedding_date' => $request->input('event_date')]);
        }

        // The dresses to try live on the visit itself; a booking is only created when she chooses
        if ($request->hasAny(['dress_id', 'dress_2_id', 'dress_3_id'])) {
            $dressIds = array_values(array_unique(array_filter([
                $request->input('dress_id'), $request->input('dress_2_id'), $request->input('dress_3_id'),
            ])));
            $visit->requestedDresses()->syncWithPivotValues($dressIds, ['type' => 'requested']);
        }
    }

    /** Records how her open visit ended (arrived, done, no show) or declines it */
    private function closeVisit(Client $client, Request $request): void
    {
        // After the try-on: she arrived, left without choosing (done), or did not show up; or the request was declined
        $visit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
        if (!$visit) {
            throw new ActionRejected(['message' => 'لا توجد زيارة مفتوحة لهذه العروس']);
        }
        $visit->update(['status' => $request->input('visit_status')]);
        $visit->declineOtherOpenVisits();
        if ($request->has('tried_dresses')) {
            $visit->triedDresses()->syncWithPivotValues($request->input('tried_dresses', []), ['type' => 'tried']);
        }
    }

    /** Schedules a fitting on her latest booking and records the try-on fee */
    private function scheduleFitting(Client $client, Request $request): void
    {
        // Create a fitting record via the latest booking
        $booking = $client->bookings()->latest()->latest('id')->first();
        $dressId = $request->input('dress_id') ?: ($booking ? $booking->dress_id : null);
        if (!$dressId) {
            $dressId = \App\Models\Dress::value('id');
        }
        $fittingDate = $request->input('fitting_date', now()->addDays(3)->toDateString());

        // Check if dress is booked/out on the proposed fitting date
        if ($dressId) {
            $conflict = \App\Models\Booking::isDressOutOnDate($dressId, $fittingDate, $client->id);
            if ($conflict) {
                throw new ActionRejected([
                    'message' => "الفستان غير متوفر للبروفة في هذا التاريخ لأنه خارج مع عميلة أخرى من {$conflict}"
                ]);
            }
        }

        if (!$booking) {
            $defaultDressId = $dressId ?: \App\Models\Dress::value('id');
            // Create a default booking first if none exists
            $booking = Booking::create([
                'client_id' => $client->id,
                'dress_id' => $defaultDressId,
                'booking_date' => now()->toDateString(),
                'event_date' => $request->input('event_date', $client->wedding_date ?: now()->addMonths(2)->toDateString()),
                'status' => 'pending',
                'total_amount' => 0,
            ]);
            $booking->update([
                'dress_id' => $defaultDressId,
                'status' => 'confirmed'
            ]);
        }

        Fitting::create([
            'booking_id' => $booking->id,
            'fitting_date' => $request->input('fitting_date', now()->addDays(3)->toDateString()),
            'status' => 'scheduled',
            'sales_name' => $request->input('sales_name'),
            'additional_notes' => 'الوقت: ' . $request->input('fitting_time', '01:00 م') . ' | ' . $request->input('notes', ''),
        ]);

        // Mark any active visits for the client as done
        $client->visits()->where('status', '!=', 'done')->update(['status' => 'done']);

        $tryingFee = floatval($request->input('trying_fee', 0));
        $payments = $request->input('payments');
        $receiptPath = ReceiptStorage::save($request, 'receipt') ?? ReceiptStorage::save($request, 'receipt_image');

        if (is_array($payments) && count($payments) > 0) {
            foreach ($payments as $p) {
                $pAmt = floatval($p['amount'] ?? 0);
                $pMethod = $p['payment_method'] ?? 'cash';
                if ($pAmt > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'fitting_fee',
                        'amount' => $pAmt,
                        'payment_method' => $pMethod,
                        'payment_date' => now()->toDateString(),
                        'notes' => 'رسوم تجربة وقياس للفستان للعروس: ' . $client->name,
                        'receipt_path' => $receiptPath,
                    ]);
                }
            }
        } elseif ($tryingFee > 0) {
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
    }

    /** Creates or edits her booking with its dresses, dates and deposit */
    private function confirmBooking(Client $client, Request $request): void
    {
        $clientUpdates = [];
        if ($request->filled('phone')) {
            $clientUpdates['phone'] = $request->input('phone');
        }
        if ($request->has('phone2')) {
            $clientUpdates['phone2'] = $request->input('phone2');
        }
        if (!empty($clientUpdates)) {
            $client->update($clientUpdates);
        }

        // Edit the current booking; a cancelled or finished one is history and starts a new booking
        $booking = $client->bookings()->latest()->latest('id')->first();
        if (!$booking || in_array($booking->status, ['cancelled', 'returned'])) {
            $booking = new \App\Models\Booking();
            $booking->client_id = $client->id;
        }

        $dressId = $request->input('dress_id');
        $dress2Id = $request->input('dress_2_id');
        $dress3Id = $request->input('dress_3_id');
        $eventDate = $request->input('event_date', $client->wedding_date);
        $forceOverride = ($request->boolean('force_override') || $request->boolean('is_override')) && $request->user()->role === 'admin';

        // Validate availability for both dresses if not force override
        if (!$forceOverride) {
            $conflicts = array_merge(
                \App\Services\DressAvailabilityService::getConflicts($client->id, $dressId, $eventDate, $booking->id),
                $dress2Id ? \App\Services\DressAvailabilityService::getConflicts($client->id, $dress2Id, $eventDate, $booking->id) : [],
                $dress3Id ? \App\Services\DressAvailabilityService::getConflicts($client->id, $dress3Id, $eventDate, $booking->id) : []
            );

            if (!empty($conflicts)) {
                throw new ActionRejected([
                    'error' => 'الفستان غير متوفر في هذه الفترة',
                    'conflicts' => $conflicts
                ]);
            }
        }

        // The offer staff applied in the form (absent from older callers: keep what the booking has)
        if ($request->has('offer_id')) {
            $offer = app(BookingOfferService::class)->resolve(
                $request->integer('offer_id') ?: null,
                (float) $request->input('discount_amount', 0),
                (float) $request->input('total_amount', 0),
                [$dressId, $dress2Id, $dress3Id],
                $booking->exists ? $booking : null
            );
            $booking->offer_id = $offer['offer_id'];
            $booking->discount_amount = $offer['discount_amount'];
        }

        $booking->dress_id = $dressId;
        $booking->dress_2_id = $dress2Id;
        $booking->dress_3_id = $dress3Id;
        $booking->sales_name = $request->input('sales_name');
        $booking->is_override = $forceOverride;
        // Editing keeps the original booking date unless the employee sets one (e.g. recording an older booking)
        $bookingDate = $request->input('booking_date') ?: ($booking->booking_date?->toDateString() ?? now()->toDateString());
        if ($eventDate && $bookingDate > \Carbon\Carbon::parse($eventDate)->toDateString()) {
            throw new ActionRejected(['message' => 'تاريخ الحجز لا يمكن أن يكون بعد تاريخ الفرح']);
        }
        $booking->booking_date = $bookingDate;
        $booking->event_date = $eventDate;

        // Handle pickup and return dates
        if ($request->filled('pickup_scheduled_on')) {
            $booking->pickup_scheduled_on = $request->input('pickup_scheduled_on');
        } elseif ($request->filled('pickup_date')) {
            $booking->pickup_scheduled_on = $request->input('pickup_date');
        }

        if ($request->filled('return_scheduled_on')) {
            $booking->return_scheduled_on = $request->input('return_scheduled_on');
        } elseif ($request->filled('return_date')) {
            $booking->return_scheduled_on = $request->input('return_date');
        }

        if (empty($booking->pickup_scheduled_on) || empty($booking->return_scheduled_on)) {
            $scheduled = \App\Models\Booking::calculateScheduledDates($eventDate, $client->city);
            if (empty($booking->pickup_scheduled_on)) {
                $booking->pickup_scheduled_on = $scheduled['pickup_date'];
            }
            if (empty($booking->return_scheduled_on)) {
                $booking->return_scheduled_on = $scheduled['return_date'];
            }
        }

        $booking->total_amount = floatval($request->input('total_amount', 0));
        $booking->deposit_amount = floatval($request->input('deposit_amount', 0));
        $booking->insurance_amount = floatval($request->input('insurance_amount', 5000));
        $booking->status = 'confirmed';
        $booking->notes = $request->input('notes');
        if ($request->input('payment_method')) {
            $booking->payment_method = $request->input('payment_method');
        }

        $receiptPath = ReceiptStorage::save($request, 'receipt') ?? ReceiptStorage::save($request, 'receipt_image');
        if ($receiptPath) {
            $booking->receipt_path = $receiptPath;
        }

        $booking->save();

        // Keep the bride's wedding date in sync with the booking's event date
        $client->syncWeddingDateFrom($booking);

        // The try-on visit ends with this booking
        $bookedVisit = $client->visits()->whereIn('status', Visit::OPEN_STATUSES)->latest()->latest('id')->first();
        if ($bookedVisit) {
            $bookedVisit->update(['status' => 'booked']);
            $bookedVisit->bookedDresses()->syncWithPivotValues(array_values(array_filter([$dressId, $dress2Id, $dress3Id])), ['type' => 'booked']);
        }

        $payments = $request->input('payments');
        // Clean up previous deposit revenues for this booking to prevent duplicate entries when editing
        $booking->revenues()->where('type', 'deposit')->delete();

        if (is_array($payments) && count($payments) > 0) {
            $totalDeposit = 0;
            $methods = [];
            foreach ($payments as $p) {
                $pAmt = floatval($p['amount'] ?? 0);
                $pMethod = $p['payment_method'] ?? 'cash';
                $rowReceipt = !empty($p['receipt_image'])
                    ? ReceiptStorage::saveData($p['receipt_image'])
                    : (!empty($p['receipt']) ? ReceiptStorage::saveData($p['receipt']) : $receiptPath);

                if ($pAmt > 0) {
                    $totalDeposit += $pAmt;
                    $methods[] = $pMethod;
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'deposit',
                        'amount' => $pAmt,
                        'payment_method' => $pMethod,
                        'payment_date' => $bookingDate,
                        'notes' => 'عربون حجز فستان من رحلة العروس' . ($booking->sales_name ? ' (السيلز: ' . $booking->sales_name . ')' : ''),
                        'receipt_path' => $rowReceipt,
                    ]);
                }
            }
            if ($totalDeposit > 0) {
                $booking->deposit_amount = $totalDeposit;
                $booking->payment_method = count(array_unique($methods)) > 1 ? 'multiple' : ($methods[0] ?? 'cash');
                $booking->save();
            }
        } else {
            $deposit = floatval($request->input('deposit_amount', 0));
            if ($deposit > 0) {
                \App\Models\Revenue::create([
                    'booking_id' => $booking->id,
                    'type' => 'deposit',
                    'amount' => $deposit,
                    'payment_method' => $request->input('payment_method', 'cash'),
                    'payment_date' => $bookingDate,
                    'notes' => 'عربون حجز فستان من رحلة العروس' . ($booking->sales_name ? ' (السيلز: ' . $booking->sales_name . ')' : ''),
                    'receipt_path' => $receiptPath,
                ]);
            }
        }
    }

    /** Marks her fittings completed so she moves on to pickup */
    private function endFitting(Client $client, Request $request): void
    {
        $fittings = $client->fittings()->get();
        $endFittingSalesName = $request->input('sales_name');
        if ($fittings->count() === 0) {
            $booking = $client->bookings()->latest()->latest('id')->first();
            if ($booking) {
                Fitting::create([
                    'booking_id' => $booking->id,
                    'fitting_date' => now()->toDateString(),
                    'status' => 'completed',
                    'sales_name' => $endFittingSalesName,
                    'additional_notes' => 'تم إنهاء البروفات وتحويل العروس لمرحلة الاستلام',
                ]);
            }
        } else {
            foreach ($fittings as $f) {
                $f->update([
                    'status' => 'completed',
                    'sales_name' => $endFittingSalesName ?: $f->sales_name,
                ]);
            }
        }
    }

    /** Hands the dresses over and records the balance and insurance paid at pickup */
    private function markPickedUp(Client $client, Request $request): void
    {
        $booking = $client->bookings()->latest()->latest('id')->first();
        if ($booking) {
            $updateData = [
                'status' => 'picked_up',
            ];
            if ($request->filled('total_amount')) {
                $updateData['total_amount'] = floatval($request->input('total_amount'));
            }
            if ($request->has('deposit_amount')) {
                $updateData['deposit_amount'] = floatval($request->input('deposit_amount'));
            }
            if ($request->has('insurance_amount')) {
                $updateData['insurance_amount'] = floatval($request->input('insurance_amount'));
            }
            if ($request->has('sales_name')) {
                $updateData['pickup_sales_name'] = $request->input('sales_name');
            }
            if ($request->filled('pickup_scheduled_on')) {
                $updateData['pickup_scheduled_on'] = $request->input('pickup_scheduled_on');
            } elseif ($request->filled('pickup_date')) {
                $updateData['pickup_scheduled_on'] = $request->input('pickup_date');
            }
            if ($request->filled('return_scheduled_on')) {
                $updateData['return_scheduled_on'] = $request->input('return_scheduled_on');
            } elseif ($request->filled('return_date')) {
                $updateData['return_scheduled_on'] = $request->input('return_date');
            }
            $booking->update($updateData);

            // Sync deposit payments if provided
            $depositPayments = $request->input('deposit_payments');
            if (is_array($depositPayments)) {
                $booking->revenues()->where('type', 'deposit')->delete();
                foreach ($depositPayments as $dp) {
                    $dpAmt = floatval($dp['amount'] ?? 0);
                    $dpMethod = $dp['payment_method'] ?? 'cash';
                    if ($dpAmt > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'deposit',
                            'amount' => $dpAmt,
                            'payment_method' => $dpMethod,
                            'payment_date' => $booking->booking_date ?: now()->toDateString(),
                            'notes' => 'عربون حجز فستان للعروس: ' . $client->name,
                        ]);
                    }
                }
            }

            if ($booking->dress) {
                $booking->dress->update(['status' => 'out']);
            }
            if ($booking->dress2) {
                $booking->dress2->update(['status' => 'out']);
            }

            $receiptPath = ReceiptStorage::save($request, 'receipt') ?? ReceiptStorage::save($request, 'receipt_image');

            // Pickup money is dated on the actual pickup day chosen by staff (not the day the form was saved)
            $pickupPaymentDate = ($request->input('pickup_date') ?: $request->input('pickup_scheduled_on'))
                ? \Carbon\Carbon::parse($request->input('pickup_date') ?: $request->input('pickup_scheduled_on'))->toDateString()
                : now()->toDateString();

            // 1. Record balance payment(s)
            $balancePayments = $request->input('balance_payments');
            if (is_array($balancePayments)) {
                $booking->revenues()->where('type', 'balance')->delete();
                foreach ($balancePayments as $bp) {
                    $bpAmt = floatval($bp['amount'] ?? 0);
                    $bpMethod = $bp['payment_method'] ?? 'cash';
                    $rowReceipt = !empty($bp['receipt_image'])
                        ? ReceiptStorage::saveData($bp['receipt_image'])
                        : (!empty($bp['receipt']) ? ReceiptStorage::saveData($bp['receipt']) : $receiptPath);

                    if ($bpAmt > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'balance',
                            'amount' => $bpAmt,
                            'payment_method' => $bpMethod,
                            'payment_date' => $pickupPaymentDate,
                            'notes' => 'دفعة استلام الفستان النهائية للعروس: ' . $client->name,
                            'receipt_path' => $rowReceipt,
                        ]);
                    }
                }
            }

            // 2. Record insurance security deposit payment(s)
            $insurancePayments = $request->input('insurance_payments');
            if (is_array($insurancePayments)) {
                $booking->revenues()->where('type', 'insurance')->delete();
                foreach ($insurancePayments as $ip) {
                    $ipAmt = floatval($ip['amount'] ?? 0);
                    $ipMethod = $ip['payment_method'] ?? 'cash';
                    $rowReceipt = !empty($ip['receipt_image'])
                        ? ReceiptStorage::saveData($ip['receipt_image'])
                        : (!empty($ip['receipt']) ? ReceiptStorage::saveData($ip['receipt']) : $receiptPath);

                    if ($ipAmt > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'insurance',
                            'amount' => $ipAmt,
                            'payment_method' => $ipMethod,
                            'payment_date' => $pickupPaymentDate,
                            'notes' => 'تأمين الفستان المسترد للعروس: ' . $client->name,
                            'receipt_path' => $rowReceipt,
                        ]);
                    }
                }
            }
        }
    }

    /** Takes the dresses back and settles the insurance (refund and damage fee) */
    private function markReturned(Client $client, Request $request): void
    {
        $booking = $client->bookings()->latest()->latest('id')->first();
        if ($booking) {
            $returnUpdate = ['status' => 'returned'];
            if ($request->has('sales_name')) {
                $returnUpdate['return_sales_name'] = $request->input('sales_name');
            }
            if ($request->has('insurance_amount')) {
                $returnUpdate['insurance_amount'] = floatval($request->input('insurance_amount'));
            }
            if ($request->filled('return_date')) {
                $returnUpdate['return_scheduled_on'] = $request->input('return_date');
            } elseif ($request->filled('return_scheduled_on')) {
                $returnUpdate['return_scheduled_on'] = $request->input('return_scheduled_on');
            }
            $booking->update($returnUpdate);
            // Returned dresses are available again; cleaning is handled outside the system
            if ($booking->dress) $booking->dress->update(['status' => 'available']);
            if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
            if ($booking->dress3) $booking->dress3->update(['status' => 'available']);

            // Return: write one insurance refund revenue = amount staff entered
            $damageDeduction = floatval($request->input('damage_deduction', 0));
            $maxRefund = max(0, floatval($booking->insurance_amount ?? 0) - $damageDeduction);
            $refundAmount = min(
                $maxRefund,
                floatval($request->input('insurance_refund', $maxRefund))
            );

            // Settlement is dated on the actual return day (not the day the form was saved)
            $settlementDate = $request->filled('return_date')
                ? \Carbon\Carbon::parse($request->input('return_date'))->toDateString()
                : now()->toDateString();

            // Editing an existing return replaces its settlement instead of duplicating it
            $previousSettlement = $booking->revenues()->whereIn('type', ['insurance_refund', 'damage_fee'])->get();
            $previousRefundReceipt = optional($previousSettlement->firstWhere('type', 'insurance_refund'))->receipt_path;
            $booking->revenues()->whereIn('type', ['insurance_refund', 'damage_fee'])->delete();

            $insuranceRev = $booking->revenues()
                ->where('notes', 'like', '%تأمين%')
                ->latest()
                ->first();

            $insuranceMethod = $insuranceRev ? $insuranceRev->payment_method : 'cash';

            // Damage deduction kept from the insurance -> recorded as its own damage_fee income
            if ($damageDeduction > 0) {
                \App\Models\Revenue::create([
                    'booking_id' => $booking->id,
                    'type' => 'damage_fee',
                    'amount' => $damageDeduction,
                    'payment_method' => $insuranceMethod,
                    'payment_date' => $settlementDate,
                    'notes' => 'خصم تلفيات من التأمين' . ($request->filled('damage_notes') ? ' - ' . $request->input('damage_notes') : ''),
                ]);
            }

            if ($refundAmount > 0) {
                $paymentMethod = $request->input('insurance_refund_method')
                    ?: $insuranceMethod;

                $receiptPath = ReceiptStorage::save($request, 'insurance_refund_receipt')
                    ?? ReceiptStorage::saveData($request->input('insurance_refund_receipt'))
                    ?? $previousRefundReceipt;

                \App\Models\Revenue::create([
                    'booking_id' => $booking->id,
                    'type' => 'insurance_refund',
                    'amount' => -$refundAmount,
                    'payment_method' => $paymentMethod,
                    'payment_date' => $settlementDate,
                    'notes' => 'استرداد تأمين' . ($request->filled('notes') ? ' - ' . $request->input('notes') : ''),
                    'receipt_path' => $receiptPath,
                ]);
            }
        }
    }

    /** Records a payment towards what she still owes, and any insurance paid with it */
    private function payRemaining(Client $client, Request $request): void
    {
        $booking = $client->bookings()->latest()->latest('id')->first();
        if ($booking) {
            $receiptPath = ReceiptStorage::save($request, 'receipt') ?? ReceiptStorage::save($request, 'receipt_image');
            $payments = $request->input('payments');
            $paidOn = $request->filled('payment_date')
                ? \Carbon\Carbon::parse($request->input('payment_date'))->toDateString()
                : now()->toDateString();

            if (is_array($payments) && count($payments) > 0) {
                foreach ($payments as $p) {
                    $pAmt = floatval($p['amount'] ?? 0);
                    $pMethod = $p['payment_method'] ?? 'cash';
                    $rowReceipt = !empty($p['receipt_image'])
                        ? ReceiptStorage::saveData($p['receipt_image'])
                        : (!empty($p['receipt']) ? ReceiptStorage::saveData($p['receipt']) : $receiptPath);

                    if ($pAmt > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'balance',
                            'amount' => $pAmt,
                            'payment_method' => $pMethod,
                            'payment_date' => $paidOn,
                            'notes' => 'سداد باقي حساب الفستان للعروس: ' . $client->name . ($request->input('notes') ? ' - ' . $request->input('notes') : ''),
                            'receipt_path' => $rowReceipt,
                        ]);
                    }
                }
            } else {
                $payAmount = floatval($request->input('amount', 0));
                if ($payAmount > 0) {
                    \App\Models\Revenue::create([
                        'booking_id' => $booking->id,
                        'type' => 'balance',
                        'amount' => $payAmount,
                        'payment_method' => $request->input('payment_method', 'cash'),
                        'payment_date' => $paidOn,
                        'notes' => 'سداد باقي حساب الفستان للعروس: ' . $client->name . ($request->input('notes') ? ' - ' . $request->input('notes') : ''),
                        'receipt_path' => $receiptPath,
                    ]);
                }
            }

            // Handle insurance payments if provided
            $insurancePayments = $request->input('insurance_payments');
            if (is_array($insurancePayments) && count($insurancePayments) > 0) {
                $totalInsurance = 0;
                foreach ($insurancePayments as $ip) {
                    $iAmt = floatval($ip['amount'] ?? 0);
                    $iMethod = $ip['payment_method'] ?? 'cash';
                    $iReceipt = !empty($ip['receipt_image'])
                        ? ReceiptStorage::saveData($ip['receipt_image'])
                        : (!empty($ip['receipt']) ? ReceiptStorage::saveData($ip['receipt']) : null);

                    if ($iAmt > 0) {
                        \App\Models\Revenue::create([
                            'booking_id' => $booking->id,
                            'type' => 'security_deposit',
                            'amount' => $iAmt,
                            'payment_method' => $iMethod,
                            'payment_date' => $paidOn,
                            'notes' => 'تأمين مسترد للعروس: ' . $client->name . ' (يُسترد عند إعادة الفستان)',
                            'receipt_path' => $iReceipt,
                        ]);
                        $totalInsurance += $iAmt;
                    }
                }
                // Update booking's insurance_amount if it differs
                if ($totalInsurance > 0) {
                    $booking->insurance_amount = $totalInsurance;
                    $booking->save();
                }
            }
        }
    }

    /** Cancels her confirmed booking: frees the dresses, closes fittings and records refunds */
    private function cancelBooking(Client $client, Request $request): void
    {
        $booking = $client->bookings()->latest()->latest('id')->first();
        if (!$booking || $booking->status !== 'confirmed') {
            throw new ActionRejected([
                'message' => 'لا يمكن إلغاء الحجز: لا يوجد حجز مؤكد لم يتم تسليم فستانه بعد'
            ]);
        }

        $revenues = $booking->revenues()->get();
        $paidRent = (float) $revenues->whereIn('type', ['deposit', 'balance'])->sum('amount');
        $paidInsurance = (float) $revenues->whereIn('type', ['insurance', 'security_deposit'])->sum('amount');
        $depositRefund = round(floatval($request->input('deposit_refund', 0)), 2);
        $insuranceRefund = round(floatval($request->input('insurance_refund', 0)), 2);

        if ($depositRefund > round($paidRent, 2)) {
            throw new ActionRejected(['message' => 'مبلغ رد العربون أكبر من المدفوع (' . $paidRent . ' ج.م)']);
        }
        if ($insuranceRefund > round($paidInsurance, 2)) {
            throw new ActionRejected(['message' => 'مبلغ رد التأمين أكبر من المدفوع (' . $paidInsurance . ' ج.م)']);
        }

        $stageBefore = $client->current_stage;
        $refundDate = $request->filled('refund_date')
            ? \Carbon\Carbon::parse($request->input('refund_date'))->toDateString()
            : now()->toDateString();
        $reasonLabel = Booking::CANCELLATION_REASONS[$request->input('cancellation_reason')];
        $user = $request->user();

        \Illuminate\Support\Facades\DB::transaction(function () use ($request, $client, $booking, $stageBefore, $refundDate, $reasonLabel, $user, $depositRefund, $insuranceRefund) {
            $booking->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancelled_by' => $user?->id,
                'cancelled_by_name' => $request->input('sales_name') ?: $user?->name,
                'cancelled_stage' => $stageBefore,
                'cancellation_reason' => $request->input('cancellation_reason'),
                'cancellation_note' => $request->input('cancellation_note'),
            ]);

            // Close open fittings of this booking
            Fitting::where('booking_id', $booking->id)
                ->whereIn('status', ['scheduled', 'rescheduled'])
                ->update(['status' => 'cancelled']);

            // Free reserved dresses unless another active booking still holds them
            foreach (array_filter([$booking->dress_id, $booking->dress_2_id, $booking->dress_3_id]) as $dressId) {
                $stillHeld = Booking::where('id', '!=', $booking->id)
                    ->whereIn('status', ['confirmed', 'picked_up'])
                    ->where(fn($q) => $q->where('dress_id', $dressId)->orWhere('dress_2_id', $dressId)->orWhere('dress_3_id', $dressId))
                    ->exists();
                if (!$stillHeld) {
                    \App\Models\Dress::where('id', $dressId)->where('status', 'booked')->update(['status' => 'available']);
                }
            }

            // Refunds are negative revenue rows so finance totals and transactions reflect them
            $refunds = [
                ['deposit_refund', $depositRefund, 'deposit_refund_method', 'deposit_refund_receipt', 'رد عربون (إلغاء حجز)'],
                ['insurance_refund', $insuranceRefund, 'insurance_refund_method', 'insurance_refund_receipt', 'رد تأمين (إلغاء حجز)'],
            ];
            foreach ($refunds as [$type, $amount, $methodField, $receiptField, $label]) {
                if ($amount <= 0) {
                    continue;
                }
                \App\Models\Revenue::create([
                    'booking_id' => $booking->id,
                    'type' => $type,
                    'amount' => -$amount,
                    'payment_method' => $request->input($methodField) ?: 'cash',
                    'payment_date' => $refundDate,
                    'notes' => $label . ' للعروس: ' . $client->name . ' - ' . $reasonLabel,
                    'receipt_path' => ReceiptStorage::save($request, $receiptField),
                ]);
            }
        });
    }

    /** Takes the booking back to an earlier stage, removing what was recorded after it (see revertStage) */
    public function revert(Booking $booking, ?string $targetStage): void
    {
        $client = $booking->client;

        \Illuminate\Support\Facades\DB::transaction(function () use ($booking, $client, $targetStage) {
            if ($targetStage === 'visit') {
                // Delete everything related to the booking
                $booking->revenues()->delete();
                $booking->fittings()->delete();
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'available']);
                $booking->delete();

                // The visit that ended with this booking is open again
                $bookedVisit = $client->visits()->where('status', 'booked')->latest()->latest('id')->first();
                if ($bookedVisit) {
                    $bookedVisit->update(['status' => 'arrived']);
                    $bookedVisit->bookedDresses()->detach();
                }

                $client->update(['current_stage' => 'visit']);
            }
            elseif ($targetStage === 'booking') {
                // Keep the booking (deposit remains), but remove fittings and after
                $booking->fittings()->delete();
                $booking->revenues()->whereIn('type', ['fitting_fee', 'balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();

                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);

                $booking->update(['status' => 'confirmed']);
                $client->update(['current_stage' => 'booking']);
            }
            elseif ($targetStage === 'fitting') {
                // Keep the fitting, but remove pickup/return data
                $booking->revenues()->whereIn('type', ['balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();

                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);

                $booking->update(['status' => 'confirmed']);

                // Ensure the booking has a scheduled fitting so stage resolves to 'fitting'
                $latestFitting = $booking->fittings()->latest()->first();
                if ($latestFitting) {
                    $latestFitting->update(['status' => 'scheduled']);
                } else {
                    \App\Models\Fitting::create([
                        'booking_id' => $booking->id,
                        'fitting_date' => now()->addDays(3)->toDateString(),
                        'status' => 'scheduled',
                        'additional_notes' => 'تمت العودة لمرحلة البروفة',
                    ]);
                }
            }
            elseif ($targetStage === 'pickup_pending' || $targetStage === 'unhandover') {
                // Revert from Sub-stage 2 (out/delivered) back to Sub-stage 1 (ready for handover):
                // Reset booking status to confirmed, dresses to available, and remove balance & insurance revenues recorded at pickup
                $booking->revenues()->whereIn('type', ['balance', 'insurance', 'insurance_refund', 'late_fee', 'damage_fee'])->delete();
                $booking->update(['status' => 'confirmed']);
                if ($booking->dress) $booking->dress->update(['status' => 'available']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'available']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'available']);
                // Ensure fittings are marked completed so stage remains picked_up (waiting for handover)
                $booking->fittings()->update(['status' => 'completed']);
                $client->update(['current_stage' => 'picked_up']);
            }
            elseif ($targetStage === 'picked_up') {
                // Keep pickup, remove return data
                $booking->revenues()->whereIn('type', ['insurance_refund', 'late_fee', 'damage_fee'])->delete();
                $booking->update(['status' => 'picked_up']);
                if ($booking->dress) $booking->dress->update(['status' => 'out']);
                if ($booking->dress2) $booking->dress2->update(['status' => 'out']);
                if ($booking->dress3) $booking->dress3->update(['status' => 'out']);
                $client->update(['current_stage' => 'picked_up']);
            }
        });
    }
}
