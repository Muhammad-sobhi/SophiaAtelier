<?php

namespace Tests\Unit;

use App\Models\Booking;
use Tests\TestCase;

class ScheduledDatesTest extends TestCase
{
    public function test_cairo_pickup_is_one_day_before_and_return_one_day_after()
    {
        $this->assertSame(
            ['pickup_date' => '2026-09-22', 'return_date' => '2026-09-24'],
            Booking::calculateScheduledDates('2026-09-23', 'القاهرة')
        );
    }

    public function test_other_cities_pickup_is_two_days_before()
    {
        $this->assertSame(
            ['pickup_date' => '2026-09-21', 'return_date' => '2026-09-24'],
            Booking::calculateScheduledDates('2026-09-23', 'طنطا')
        );
    }

    public function test_year_boundary()
    {
        $this->assertSame(
            ['pickup_date' => '2026-12-29', 'return_date' => '2027-01-01'],
            Booking::calculateScheduledDates('2026-12-31', 'طنطا')
        );
    }

    public function test_cairo_city_detection()
    {
        foreach ([null, '', 'القاهرة', 'القاهره', 'الجيزة', 'مدينة نصر', 'مصر الجديدة', 'مصر الجديده', 'التجمع الخامس', '6 أكتوبر', 'حلوان', 'Cairo', 'GIZA'] as $city) {
            $this->assertTrue(Booking::isCairoCity($city), (string) $city);
        }
        foreach (['طنطا', 'دمياط الجديدة', 'المنيا الجديدة', 'الإسكندرية', 'المنصورة', 'Alexandria'] as $city) {
            $this->assertFalse(Booking::isCairoCity($city), $city);
        }
    }

    public function test_cairo_city_list_matches_dashboard()
    {
        $utils = base_path('../dashboard/src/lib/utils.js');
        if (!file_exists($utils)) {
            $this->markTestSkipped('Dashboard source not available');
        }

        preg_match('/CAIRO_CITY_KEYWORDS = \[(.*?)\];/s', file_get_contents($utils), $match);
        $this->assertNotEmpty($match, 'CAIRO_CITY_KEYWORDS not found in dashboard/src/lib/utils.js');
        preg_match_all("/'([^']*)'/u", $match[1], $keywords);

        $this->assertSame(Booking::CAIRO_CITY_KEYWORDS, $keywords[1], 'Cairo city lists differ between backend and dashboard');
    }
}
