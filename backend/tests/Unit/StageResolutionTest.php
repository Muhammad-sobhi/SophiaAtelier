<?php

namespace Tests\Unit;

use App\Models\Booking;
use App\Models\Client;
use App\Models\Fitting;
use App\Services\LiveStageResolver;
use App\Services\LegacyStageResolver;
use Carbon\Carbon;
use Tests\TestCase;

class StageResolutionTest extends TestCase
{
    public function test_booked_bride_with_pickup_date_more_than_15_days_is_in_booking_stage()
    {
        $client = new Client();
        $client->city = 'Cairo';

        $booking = new Booking();
        $booking->status = 'confirmed';
        $booking->pickup_scheduled_on = Carbon::today()->addDays(20)->toDateString();
        $booking->event_date = Carbon::today()->addDays(21)->toDateString();

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('booking', $stage);
    }

    public function test_booked_bride_with_pickup_date_within_15_days_is_in_pickup_stage()
    {
        $client = new Client();
        $client->city = 'Cairo';

        $booking = new Booking();
        $booking->status = 'confirmed';
        $booking->pickup_scheduled_on = Carbon::today()->addDays(10)->toDateString();
        $booking->event_date = Carbon::today()->addDays(11)->toDateString();

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('picked_up', $stage);
    }

    public function test_bride_with_fitting_has_fitting_flag_and_keeps_stage()
    {
        $client = new Client();
        $client->city = 'Cairo';

        $booking = new Booking();
        $booking->status = 'confirmed';
        $booking->pickup_scheduled_on = Carbon::today()->addDays(10)->toDateString();

        $fitting = new Fitting();
        $fitting->status = 'scheduled';

        $client->setRelation('fittings', collect([$fitting]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('picked_up', $stage);
        $this->assertTrue($client->has_fitting);

        // When fitting is completed, has_fitting should be false
        $fitting->status = 'completed';
        $this->assertFalse($client->has_fitting);

        // When fitting is cancelled, has_fitting should also be false
        $fitting->status = 'cancelled';
        $this->assertFalse($client->has_fitting);
    }

    public function test_bride_with_dress_out_is_in_returned_stage()
    {
        $client = new Client();
        $booking = new Booking();
        $booking->status = 'picked_up';

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('returned', $stage);
    }

    public function test_bride_returned_in_current_month_remains_in_returned_stage()
    {
        $client = new Client();
        $booking = new Booking();
        $booking->status = 'returned';
        $booking->return_scheduled_on = Carbon::today()->toDateString();

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('returned', $stage);
    }

    public function test_bride_returned_in_previous_month_auto_disappears_to_completed()
    {
        $client = new Client();
        $booking = new Booking();
        $booking->status = 'returned';
        // Returned in previous month
        $booking->return_scheduled_on = Carbon::today()->subMonths(1)->startOfMonth()->toDateString();

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, $booking);
        $this->assertEquals('completed', $stage);
    }

    public function test_bride_without_booking_is_in_visit_stage()
    {
        $client = new Client();
        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LiveStageResolver::resolve($client, null);
        $this->assertEquals('visit', $stage);
    }

    public function test_legacy_resolver_respects_15_day_window_and_month_archiving()
    {
        $client = new Client();
        $booking = new Booking();
        $booking->status = 'confirmed';
        $booking->pickup_scheduled_on = Carbon::today()->addDays(5)->toDateString();

        $client->setRelation('fittings', collect([]));
        $client->setRelation('visits', collect([]));

        $stage = LegacyStageResolver::resolve($client, $booking);
        $this->assertEquals('picked_up', $stage);

        // Previous month returned legacy bride
        $booking->status = 'returned';
        $booking->return_scheduled_on = Carbon::today()->subMonths(1)->toDateString();
        $stagePast = LegacyStageResolver::resolve($client, $booking);
        $this->assertEquals('completed', $stagePast);
    }
}
