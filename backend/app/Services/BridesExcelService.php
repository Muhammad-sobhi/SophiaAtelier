<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Models\Revenue;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

/**
 * Brides Excel template: one row = one bride + her booking + the money she paid.
 * Staff download the template, fill it and upload it back; every row becomes a client,
 * a booking and its revenue rows (so the finance page picks the payments up on their own dates).
 */
class BridesExcelService
{
    /** key => [Arabic header, type] — the column order of the template */
    public const COLUMNS = [
        'name' => ['اسم العروس *', 'text'],
        'phone' => ['رقم الهاتف *', 'text'],
        'phone2' => ['رقم هاتف آخر', 'text'],
        'city' => ['المدينة', 'text'],
        'address' => ['العنوان', 'text'],
        'source' => ['المصدر', 'list'],
        'wedding_date' => ['تاريخ الفرح *', 'date'],
        'dress_code' => ['كود الفستان 1 *', 'text'],
        'dress_2_code' => ['كود الفستان 2', 'text'],
        'dress_3_code' => ['كود الفستان 3', 'text'],
        'booking_date' => ['تاريخ الحجز', 'date'],
        'pickup_date' => ['تاريخ الاستلام', 'date'],
        'return_date' => ['تاريخ الإرجاع', 'date'],
        'status' => ['حالة الحجز', 'list'],
        'total_amount' => ['إجمالي الإيجار', 'number'],
        'deposit_amount' => ['العربون المدفوع', 'number'],
        'deposit_method' => ['طريقة دفع العربون', 'list'],
        'balance_amount' => ['مبلغ الباقي المدفوع', 'number'],
        'balance_method' => ['طريقة دفع الباقي', 'list'],
        'balance_date' => ['تاريخ دفع الباقي', 'date'],
        'insurance_amount' => ['مبلغ التأمين', 'number'],
        'insurance_paid' => ['التأمين المدفوع', 'number'],
        'insurance_method' => ['طريقة دفع التأمين', 'list'],
        'insurance_refund' => ['التأمين المسترد', 'number'],
        'sales_name' => ['اسم السيلز', 'text'],
        'notes' => ['ملاحظات', 'text'],
    ];

    public const SOURCES = [
        'instagram' => 'انستجرام',
        'whatsapp' => 'واتساب',
        'website' => 'الموقع الإلكتروني',
        'walkin' => 'زيارة مباشرة',
        'phone' => 'مكالمة هاتفية',
        'referral' => 'ترشيح من عميلة أخرى',
    ];

    public const STATUSES = [
        'confirmed' => 'حجز مؤكد',
        'picked_up' => 'تم الاستلام',
        'returned' => 'تم الإرجاع',
    ];

    public const PAYMENT_METHODS = [
        'cash' => 'كاش',
        'instapay' => 'انستاباي',
        'vodafone_cash' => 'فودافون كاش',
        'visa' => 'فيزا',
        'bank_transfer' => 'تحويل بنكي',
        'other' => 'أخرى',
    ];

    private const TEMPLATE_ROWS = 500;

    public function template(): Spreadsheet
    {
        $book = new Spreadsheet();
        $sheet = $book->getActiveSheet();
        $sheet->setTitle('العرائس');
        $sheet->setRightToLeft(true);

        // Lists live on a hidden sheet so the dropdowns work in every Excel version
        $lists = $book->createSheet();
        $lists->setTitle('lists');
        $listRanges = [];
        foreach (['source' => self::SOURCES, 'status' => self::STATUSES, 'method' => self::PAYMENT_METHODS] as $i => $values) {
            $col = chr(ord('A') + count($listRanges));
            foreach (array_values($values) as $r => $label) {
                $lists->setCellValue($col . ($r + 1), $label);
            }
            $listRanges[$i] = "lists!\${$col}\$1:\${$col}\$" . count($values);
        }
        $lists->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);

        $lastRow = self::TEMPLATE_ROWS + 1;
        $c = 1;
        foreach (self::COLUMNS as $key => [$header, $type]) {
            $letter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c++);
            $sheet->setCellValue("{$letter}1", $header);
            $sheet->getColumnDimension($letter)->setWidth(max(14, mb_strlen($header) + 6));
            $range = "{$letter}2:{$letter}{$lastRow}";

            if ($type === 'text') {
                // Text format keeps the leading 0 of phone numbers and dress codes
                $sheet->getStyle($range)->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);
            } elseif ($type === 'date') {
                $sheet->getStyle($range)->getNumberFormat()->setFormatCode('dd/mm/yyyy');
            } elseif ($type === 'number') {
                $sheet->getStyle($range)->getNumberFormat()->setFormatCode('#,##0');
            } elseif ($type === 'list') {
                $listKey = $key === 'source' ? 'source' : ($key === 'status' ? 'status' : 'method');
                $validation = $sheet->getCell("{$letter}2")->getDataValidation();
                $validation->setType(DataValidation::TYPE_LIST)
                    ->setAllowBlank(true)
                    ->setShowDropDown(true)
                    ->setShowErrorMessage(true)
                    ->setErrorTitle('قيمة غير صحيحة')
                    ->setError('اختر قيمة من القائمة')
                    ->setFormula1($listRanges[$listKey]);
                $sheet->setDataValidation($range, $validation);
            }
        }

        $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count(self::COLUMNS));
        $sheet->getStyle("A1:{$lastCol}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E11D48']],
        ]);
        $sheet->freezePane('A2');
        $book->setActiveSheetIndex(0);

        return $book;
    }

    /**
     * @return array{created: int, updated_clients: int, skipped: array<int, array{row: int, name: string, reason: string}>}
     */
    public function import(string $path): array
    {
        $sheet = IOFactory::load($path)->getSheet(0);
        $rows = $sheet->toArray(null, true, false, false);
        $header = array_map(fn ($h) => trim((string) $h), array_shift($rows) ?? []);

        $expected = array_column(self::COLUMNS, 0);
        if (array_slice($header, 0, count($expected)) !== $expected) {
            throw new \InvalidArgumentException('الملف لا يطابق القالب. يرجى تحميل القالب من جديد واستخدامه كما هو.');
        }

        $keys = array_keys(self::COLUMNS);
        $result = ['created' => 0, 'updated_clients' => 0, 'skipped' => []];
        $dressesByCode = Dress::whereNotNull('code')->get(['id', 'code', 'status'])
            ->keyBy(fn ($d) => mb_strtolower(trim($d->code)));

        foreach ($rows as $i => $values) {
            $rowNumber = $i + 2;
            $raw = array_combine($keys, array_pad(array_slice($values, 0, count($keys)), count($keys), null));
            if (collect($raw)->every(fn ($v) => $v === null || trim((string) $v) === '')) {
                continue; // empty template row
            }

            try {
                $row = $this->parseRow($raw, $dressesByCode);
                $isNewClient = DB::transaction(fn () => $this->importRow($row));
                $result['created']++;
                if (!$isNewClient) {
                    $result['updated_clients']++;
                }
            } catch (\InvalidArgumentException $e) {
                $result['skipped'][] = ['row' => $rowNumber, 'name' => trim((string) $raw['name']), 'reason' => $e->getMessage()];
            }
        }

        return $result;
    }

    private function parseRow(array $raw, $dressesByCode): array
    {
        $text = fn ($k) => ($v = trim((string) ($raw[$k] ?? ''))) === '' ? null : $v;

        $row = [
            'name' => $text('name'),
            'phone' => self::normalizePhone($text('phone')),
            'phone2' => self::normalizePhone($text('phone2')),
            'city' => $text('city'),
            'address' => $text('address'),
            'sales_name' => $text('sales_name'),
            'notes' => $text('notes'),
            'source' => $this->fromList($text('source'), self::SOURCES, 'المصدر') ?? 'walkin',
            'status' => $this->fromList($text('status'), self::STATUSES, 'حالة الحجز') ?? 'confirmed',
        ];
        if (!$row['name']) throw new \InvalidArgumentException('اسم العروس مطلوب');
        if (!$row['phone']) throw new \InvalidArgumentException('رقم الهاتف مطلوب');

        foreach (['wedding_date', 'booking_date', 'pickup_date', 'return_date', 'balance_date'] as $k) {
            $row[$k] = $this->parseDate($raw[$k] ?? null, self::COLUMNS[$k][0]);
        }
        if (!$row['wedding_date']) throw new \InvalidArgumentException('تاريخ الفرح مطلوب');

        foreach (['total_amount', 'deposit_amount', 'balance_amount', 'insurance_amount', 'insurance_paid', 'insurance_refund'] as $k) {
            $row[$k] = $this->parseAmount($raw[$k] ?? null, self::COLUMNS[$k][0]);
        }
        foreach (['deposit_method', 'balance_method', 'insurance_method'] as $k) {
            $row[$k] = $this->fromList($text($k), self::PAYMENT_METHODS, self::COLUMNS[$k][0]) ?? 'cash';
        }

        foreach (['dress_code' => 'dress_id', 'dress_2_code' => 'dress_2_id', 'dress_3_code' => 'dress_3_id'] as $codeKey => $idKey) {
            $code = $text($codeKey);
            $dress = $code ? $dressesByCode->get(mb_strtolower($code)) : null;
            if ($code && !$dress) {
                throw new \InvalidArgumentException("كود الفستان {$code} غير موجود");
            }
            $row[$idKey] = $dress?->id;
        }
        if (!$row['dress_id']) throw new \InvalidArgumentException('كود الفستان 1 مطلوب');

        if ($row['insurance_refund'] > 0 && $row['status'] !== 'returned') {
            throw new \InvalidArgumentException('التأمين المسترد يُسجل فقط لحجز حالته "تم الإرجاع"');
        }
        if ($row['insurance_refund'] > $row['insurance_paid']) {
            throw new \InvalidArgumentException('التأمين المسترد أكبر من التأمين المدفوع');
        }

        return $row;
    }

    /** @return bool true when a new client was created */
    private function importRow(array $row): bool
    {
        $client = Client::where('phone', $row['phone'])->first();
        $isNew = !$client;
        $clientData = array_filter([
            'name' => $row['name'],
            'phone' => $row['phone'],
            'phone2' => $row['phone2'],
            'city' => $row['city'] ?? $row['address'],
            'address' => $row['address'],
            'source' => $row['source'],
            'notes' => $row['notes'],
            'wedding_date' => $row['wedding_date'],
        ], fn ($v) => $v !== null);

        if ($client) {
            $duplicate = $client->bookings()
                ->whereDate('event_date', $row['wedding_date'])
                ->where('dress_id', $row['dress_id'])
                ->where('status', '!=', 'cancelled')
                ->exists();
            if ($duplicate) {
                throw new \InvalidArgumentException('هذا الحجز مسجل بالفعل لنفس العروس');
            }
            $client->update($clientData);
        } else {
            $client = Client::create($clientData + ['journey_mode' => 'live']);
        }

        // A dress can't be booked twice for the same period (history rows are not checked)
        if ($row['status'] !== 'returned') {
            foreach (array_filter([$row['dress_id'], $row['dress_2_id'], $row['dress_3_id']]) as $dressId) {
                $conflicts = DressAvailabilityService::getConflicts($client->id, $dressId, $row['wedding_date']);
                if ($conflicts) {
                    $c = $conflicts[0];
                    throw new \InvalidArgumentException("الفستان محجوز لعروس أخرى ({$c['client_name']}) بتاريخ فرح {$c['event_date']}");
                }
            }
        }

        $scheduled = Booking::calculateScheduledDates($row['wedding_date'], $client->city);
        $pickupDate = $row['pickup_date'] ?? $scheduled['pickup_date'];
        // No booking date: today, or the pickup day for an old booking (its deposit can't be paid after pickup)
        $bookingDate = $row['booking_date'] ?? min(now()->toDateString(), $pickupDate);
        $returnDate = $row['return_date'] ?? $scheduled['return_date'];

        $booking = Booking::create([
            'client_id' => $client->id,
            'dress_id' => $row['dress_id'],
            'dress_2_id' => $row['dress_2_id'],
            'dress_3_id' => $row['dress_3_id'],
            'booking_date' => $bookingDate,
            'event_date' => $row['wedding_date'],
            'pickup_scheduled_on' => $pickupDate,
            'return_scheduled_on' => $returnDate,
            'status' => $row['status'],
            'total_amount' => $row['total_amount'],
            'deposit_amount' => $row['deposit_amount'],
            'insurance_amount' => $row['insurance_amount'] ?: $row['insurance_paid'],
            'payment_method' => $row['deposit_method'],
            'sales_name' => $row['sales_name'],
            'notes' => $row['notes'],
        ]);

        // Each payment is dated on the day it actually happened, so finance shows it on that day
        $revenues = [
            ['deposit', $row['deposit_amount'], $row['deposit_method'], $bookingDate, 'عربون حجز فستان (استيراد إكسل)'],
            ['balance', $row['balance_amount'], $row['balance_method'], $row['balance_date'] ?? $pickupDate, 'دفعة باقي حساب الفستان (استيراد إكسل)'],
            ['insurance', $row['insurance_paid'], $row['insurance_method'], $pickupDate, 'تأمين الفستان (استيراد إكسل)'],
            ['insurance_refund', -$row['insurance_refund'], $row['insurance_method'], $returnDate, 'استرداد تأمين (استيراد إكسل)'],
        ];
        foreach ($revenues as [$type, $amount, $method, $date, $note]) {
            if ((float) $amount == 0) {
                continue;
            }
            Revenue::create([
                'booking_id' => $booking->id,
                'type' => $type,
                'amount' => $amount,
                'payment_method' => $method,
                'payment_date' => $date,
                'notes' => $note . ' للعروس: ' . $client->name,
            ]);
        }

        if ($row['status'] === 'picked_up') {
            Dress::whereIn('id', array_filter([$row['dress_id'], $row['dress_2_id'], $row['dress_3_id']]))->update(['status' => 'out']);
        }

        return $isNew;
    }

    private function fromList(?string $value, array $options, string $label): ?string
    {
        if ($value === null) return null;
        if (isset($options[$value])) return $value; // English key typed directly
        $key = array_search($value, $options, true);
        if ($key === false) {
            throw new \InvalidArgumentException("قيمة \"{$value}\" غير صحيحة في عمود {$label}");
        }
        return $key;
    }

    private function parseDate($value, string $label): ?string
    {
        if ($value === null || trim((string) $value) === '') return null;
        if (is_numeric($value)) {
            return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->toDateString();
        }
        $value = str_replace(['-', '.'], '/', trim((string) $value));
        foreach (['d/m/Y', 'Y/m/d'] as $format) {
            $date = \DateTime::createFromFormat('!' . $format, $value);
            $errors = \DateTime::getLastErrors();
            if ($date && (!$errors || ($errors['warning_count'] === 0 && $errors['error_count'] === 0)) && (int) $date->format('Y') >= 2000) {
                return $date->format('Y-m-d');
            }
        }
        throw new \InvalidArgumentException("تاريخ غير صحيح في عمود {$label}: {$value} (استخدم يوم/شهر/سنة)");
    }

    private function parseAmount($value, string $label): float
    {
        if ($value === null || trim((string) $value) === '') return 0.0;
        $clean = str_replace([',', ' ', 'ج.م', 'جنيه'], '', (string) $value);
        if (!is_numeric($clean) || (float) $clean < 0) {
            throw new \InvalidArgumentException("مبلغ غير صحيح في عمود {$label}: {$value}");
        }
        return round((float) $clean, 2);
    }

    /** Excel drops the leading 0 of a number typed without text format: 1012345678 -> 01012345678 */
    private static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) return null;
        $digits = preg_replace('/[^\d+]/', '', strtr($phone, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']));
        if (preg_match('/^1\d{9}$/', $digits)) {
            $digits = '0' . $digits;
        }
        return $digits ?: null;
    }
}
