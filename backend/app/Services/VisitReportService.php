<?php

namespace App\Services;

use App\Models\Dress;
use App\Models\User;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Try-on visit reports for a date range (by visit date):
 * funnel, sources, confirmation speed, no-shows, dress demand → booking, lost demand,
 * staff performance, trying fees, busy slots and dresses-per-visit.
 */
class VisitReportService
{
    private const ATTENDED = ['arrived', 'done', 'booked'];

    public static function build(string $from, string $to): array
    {
        $visits = Visit::whereBetween('visit_date', [$from, $to])->get();
        $pivots = DB::table('visit_dresses')->whereIn('visit_id', $visits->pluck('id'))->get(['visit_id', 'dress_id', 'type']);
        $pivotsByVisit = $pivots->groupBy('visit_id');

        return [
            'range' => ['from' => $from, 'to' => $to],
            'funnel' => self::funnel($visits),
            'sources' => self::sources($visits),
            'confirmation' => self::confirmation($visits),
            'no_show' => self::noShows($visits),
            'dresses' => self::dresses($pivots, $visits),
            'lost_demand' => self::lostDemand($from, $to),
            'staff' => self::staff($visits),
            'trying_fees' => self::tryingFees($visits),
            'dresses_per_visit' => self::dressesPerVisit($visits, $pivotsByVisit),
        ];
    }

    private static function rate(int $part, int $whole): float
    {
        return $whole > 0 ? round($part / $whole * 100, 1) : 0.0;
    }

    private static function funnel(Collection $visits): array
    {
        $total = $visits->count();
        $confirmed = $visits->whereNotNull('confirmed_at')->count();
        $attended = $visits->whereIn('status', self::ATTENDED)->count();
        $booked = $visits->where('status', 'booked')->count();

        return [
            'requests' => $total,
            'pending' => $visits->where('status', 'pending')->count(),
            'confirmed' => $confirmed,
            'auto_confirmed' => $visits->where('auto_confirmed', true)->count(),
            'attended' => $attended,
            'booked' => $booked,
            'no_show' => $visits->where('status', 'no_show')->count(),
            'not_chosen' => $visits->where('status', 'done')->count(),
            'confirm_rate' => self::rate($confirmed, $total),
            'attend_rate' => self::rate($attended, $confirmed),
            'booking_rate' => self::rate($booked, $attended),
            'overall_rate' => self::rate($booked, $total),
        ];
    }

    private static function sources(Collection $visits): array
    {
        return $visits->groupBy(fn($v) => $v->source ?: 'unknown')->map(function ($group, $source) {
            $booked = $group->where('status', 'booked')->count();
            return [
                'source' => $source,
                'visits' => $group->count(),
                'attended' => $group->whereIn('status', self::ATTENDED)->count(),
                'booked' => $booked,
                'booking_rate' => self::rate($booked, $group->count()),
            ];
        })->sortByDesc('visits')->values()->all();
    }

    private static function confirmation(Collection $visits): array
    {
        // Minutes from request to manual confirmation (auto confirmations are instant)
        $manual = $visits->filter(fn($v) => $v->confirmed_at && !$v->auto_confirmed && $v->source === 'website');
        $minutes = $manual->map(fn($v) => $v->created_at->diffInMinutes($v->confirmed_at));

        return [
            'manual_confirmed' => $manual->count(),
            'avg_minutes_to_confirm' => $minutes->isNotEmpty() ? (int) round($minutes->avg()) : null,
            // Open work right now (not limited to the range)
            'pending_over_24h' => Visit::where('status', 'pending')->where('created_at', '<', now()->subDay())->count(),
            'whatsapp_not_sent' => Visit::where('status', 'confirmed')->whereNull('confirmation_sent_at')
                ->whereDate('visit_date', '>=', Carbon::today())->count(),
        ];
    }

    private static function noShows(Collection $visits): array
    {
        // Only visits whose outcome is known
        $closed = $visits->whereIn('status', [...self::ATTENDED, 'no_show']);
        $weekdays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

        $byWeekday = $closed->groupBy(fn($v) => $v->visit_date->dayOfWeek)->map(fn($g, $day) => [
            'day' => $weekdays[$day],
            'day_index' => $day,
            'visits' => $g->count(),
            'no_show' => $g->where('status', 'no_show')->count(),
            'no_show_rate' => self::rate($g->where('status', 'no_show')->count(), $g->count()),
        ])->sortBy('day_index')->values()->all();

        $bySlot = $visits->filter(fn($v) => preg_match('/^\d{2}:\d{2}$/', (string) $v->time_slot))
            ->groupBy('time_slot')->map(fn($g, $slot) => [
                'slot' => $slot,
                'visits' => $g->count(),
                'no_show' => $g->where('status', 'no_show')->count(),
            ])->sortBy('slot')->values()->all();

        return [
            'rate' => self::rate($closed->where('status', 'no_show')->count(), $closed->count()),
            'by_weekday' => $byWeekday,
            'by_slot' => $bySlot,
        ];
    }

    private static function dresses(Collection $pivots, Collection $visits): array
    {
        $counts = $pivots->groupBy('dress_id')->map(fn($rows, $dressId) => [
            'dress_id' => (int) $dressId,
            'requested' => $rows->where('type', 'requested')->count(),
            'tried' => $rows->where('type', 'tried')->count(),
            'booked' => $rows->where('type', 'booked')->count(),
        ]);
        $dresses = Dress::withTrashed()->whereIn('id', $counts->keys())->get(['id', 'name', 'code'])->keyBy('id');

        return $counts->map(function ($c) use ($dresses) {
            $d = $dresses[$c['dress_id']] ?? null;
            return $c + [
                'name' => $d?->name,
                'code' => $d?->code,
                'booking_rate' => self::rate($c['booked'], max($c['requested'], $c['tried'])),
            ];
        })->sortByDesc('requested')->values()->take(20)->all();
    }

    private static function lostDemand(string $from, string $to): array
    {
        $rows = DB::table('dress_demand_misses')
            ->whereBetween('created_at', [Carbon::parse($from)->startOfDay(), Carbon::parse($to)->endOfDay()])
            ->select('dress_id', DB::raw('COUNT(*) as misses'), DB::raw('COUNT(DISTINCT client_id) as brides'))
            ->groupBy('dress_id')->orderByDesc('misses')->limit(20)->get();
        $dresses = Dress::withTrashed()->whereIn('id', $rows->pluck('dress_id'))->get(['id', 'name', 'code'])->keyBy('id');

        return $rows->map(fn($r) => [
            'dress_id' => $r->dress_id,
            'name' => $dresses[$r->dress_id]->name ?? null,
            'code' => $dresses[$r->dress_id]->code ?? null,
            'misses' => (int) $r->misses,
            'brides' => (int) $r->brides,
        ])->all();
    }

    private static function staff(Collection $visits): array
    {
        $bySales = $visits->filter(fn($v) => filled($v->sales_name))->groupBy('sales_name')->map(function ($g, $name) {
            $attended = $g->whereIn('status', self::ATTENDED)->count();
            $booked = $g->where('status', 'booked')->count();
            return [
                'sales_name' => $name,
                'visits' => $g->count(),
                'attended' => $attended,
                'booked' => $booked,
                'booking_rate' => self::rate($booked, $attended),
            ];
        })->sortByDesc('booked')->values()->all();

        $users = User::whereIn('id', $visits->pluck('confirmed_by')->filter()->unique())->pluck('name', 'id');
        $confirmations = $visits->whereNotNull('confirmed_by')->groupBy('confirmed_by')
            ->map(fn($g, $userId) => ['name' => $users[$userId] ?? '—', 'confirmed' => $g->count()])
            ->sortByDesc('confirmed')->values()->all();

        return ['by_sales' => $bySales, 'confirmations' => $confirmations];
    }

    private static function tryingFees(Collection $visits): array
    {
        $attended = $visits->whereIn('status', self::ATTENDED);
        $paid = $attended->filter(fn($v) => (float) $v->trying_fee > 0);
        $free = $attended->filter(fn($v) => (float) $v->trying_fee <= 0);

        return [
            'total_due' => (float) $attended->sum('trying_fee'),
            'paid_visits' => $paid->count(),
            'free_visits' => $free->count(),
            'paid_booking_rate' => self::rate($paid->where('status', 'booked')->count(), $paid->count()),
            'free_booking_rate' => self::rate($free->where('status', 'booked')->count(), $free->count()),
        ];
    }

    private static function dressesPerVisit(Collection $visits, Collection $pivotsByVisit): array
    {
        return $visits->whereIn('status', self::ATTENDED)
            ->groupBy(fn($v) => ($pivotsByVisit[$v->id] ?? collect())->where('type', 'requested')->count())
            ->map(fn($g, $count) => [
                'dresses' => (int) $count,
                'visits' => $g->count(),
                'booked' => $g->where('status', 'booked')->count(),
                'booking_rate' => self::rate($g->where('status', 'booked')->count(), $g->count()),
            ])->sortBy('dresses')->values()->all();
    }
}
