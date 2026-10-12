<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Dress;
use App\Services\BridesExcelService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Tests\TestCase;

class BridesExcelImportTest extends TestCase
{
    use DatabaseTransactions;

    private function file(array $rows): string
    {
        $sheet = (new Spreadsheet())->getActiveSheet();
        $sheet->fromArray(array_column(BridesExcelService::COLUMNS, 0), null, 'A1');
        $keys = array_keys(BridesExcelService::COLUMNS);
        foreach ($rows as $i => $row) {
            $sheet->fromArray(array_map(fn($k) => $row[$k] ?? null, $keys), null, 'A' . ($i + 2));
        }
        $path = tempnam(sys_get_temp_dir(), 'brides') . '.xlsx';
        (new Xlsx($sheet->getParent()))->save($path);

        return $path;
    }

    public function test_reimporting_a_file_with_a_shared_phone_creates_nothing_twice()
    {
        $d1 = Dress::factory()->create(['code' => 'IMP-A']);
        $d2 = Dress::factory()->create(['code' => 'IMP-B']);
        $row = ['phone' => '01034046999', 'status' => 'تم الإرجاع', 'total_amount' => 10000, 'deposit_amount' => 2000, 'booking_date' => '01/05/2026'];
        $path = $this->file([
            $row + ['name' => 'Bride One', 'wedding_date' => '10/06/2026', 'dress_code' => 'IMP-A'],
            $row + ['name' => 'Bride Two', 'wedding_date' => '12/06/2026', 'dress_code' => 'IMP-B'],
        ]);
        $service = app(BridesExcelService::class);

        $first = $service->import($path);
        $this->assertSame(2, $first['created'], json_encode($first['skipped'], JSON_UNESCAPED_UNICODE));
        $second = $service->import($path);

        $this->assertSame(0, $second['created']);
        $this->assertCount(2, $second['skipped']);
        $clients = Client::where('phone', '+201034046999')->orderBy('id')->pluck('name')->all();
        $this->assertSame(['Bride One', 'Bride Two'], $clients, 'brides sharing a phone stay separate and keep their names');
        $this->assertSame(2, Booking::whereIn('dress_id', [$d1->id, $d2->id])->count());
    }
}
