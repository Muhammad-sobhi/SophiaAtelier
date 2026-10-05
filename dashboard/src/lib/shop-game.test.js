import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, gamePlace, gameActions, journeyEvent, fittingTime } from './shop-game.js';

const TODAY = '2026-10-05';

test('daysBetween counts calendar days across months', () => {
  assert.equal(daysBetween('2026-10-05', '2026-10-06'), 1);
  assert.equal(daysBetween('2026-10-05', '2026-09-30 00:00:00'), -5);
  assert.equal(daysBetween('', '2026-10-05'), null);
});

test('open visit stands in the queue, closed visit is hidden', () => {
  const open = { current_stage: 'visit', visits: [{ id: 2, status: 'confirmed', visit_date: '2026-10-07' }] };
  const p = gamePlace(open, TODAY);
  assert.equal(p.zone, 'queue');
  assert.equal(p.visitIn, 2);
  const closed = { current_stage: 'visit', visits: [{ id: 3, status: 'no_show' }] };
  assert.equal(gamePlace(closed, TODAY).zone, null);
});

test('booking with a fitting due today goes to the fitting room', () => {
  const b = {
    current_stage: 'booking',
    bookings: [{ status: 'confirmed', event_date: '2026-12-01' }],
    fittings: [{ id: 1, status: 'scheduled', fitting_date: '2026-10-05', additional_notes: 'الوقت: 4:00 م | تقصير' }],
  };
  const p = gamePlace(b, TODAY);
  assert.equal(p.zone, 'fitting');
  assert.equal(fittingTime(p.fitting), '4:00 م');
  assert.equal(gameActions(b, p)[0].action, 'end_fitting');
});

test('future fitting keeps the key in the cabinet', () => {
  const b = { current_stage: 'booking', bookings: [{ status: 'confirmed' }], fittings: [{ status: 'scheduled', fitting_date: '2026-10-09' }] };
  assert.equal(gamePlace(b, TODAY).zone, 'cabinet');
});

test('pickup window shows the dress in the vitrine with handover first', () => {
  const b = { current_stage: 'picked_up', city: 'القاهرة', bookings: [{ status: 'confirmed', event_date: '2026-10-10' }] };
  const p = gamePlace(b, TODAY);
  assert.equal(p.zone, 'vitrine');
  assert.equal(p.pickupIn, 4);
  assert.equal(gameActions(b, p).find((a) => a.primary).open, 'picked_up');
});

test('dress out: home before the return date, return door on or after it', () => {
  const b = (ret) => ({ current_stage: 'returned', bookings: [{ status: 'picked_up', return_scheduled_on: ret }] });
  assert.equal(gamePlace(b('2026-10-08'), TODAY).zone, 'home');
  assert.equal(gamePlace(b('2026-10-08'), TODAY).returnIn, 3);
  assert.equal(gamePlace(b('2026-10-05'), TODAY).zone, 'returnDoor');
  assert.equal(gamePlace(b('2026-10-01'), TODAY).zone, 'returnDoor');
});

test('returned, cancelled and archived brides are hidden', () => {
  assert.equal(gamePlace({ current_stage: 'returned', bookings: [{ status: 'returned' }] }, TODAY).zone, null);
  assert.equal(gamePlace({ current_stage: 'cancelled', bookings: [{ status: 'cancelled' }] }, TODAY).zone, null);
  assert.equal(gamePlace({ current_stage: 'completed', bookings: [{ status: 'returned' }] }, TODAY).zone, null);
});

test('journey events map zone changes to level ups', () => {
  assert.equal(journeyEvent({ zone: 'queue' }, { zone: 'cabinet' }).type, 'booked');
  assert.equal(journeyEvent({ zone: 'vitrine' }, { zone: 'home' }).type, 'handedOver');
  assert.equal(journeyEvent({ zone: 'returnDoor' }, { zone: null }).type, 'returned');
  assert.equal(journeyEvent({ zone: 'fitting', fitting: { id: 1 } }, { zone: 'vitrine', fitting: null }).type, 'fittingDone');
  assert.equal(journeyEvent({ zone: 'cabinet', fitting: null }, { zone: 'cabinet', fitting: { id: 4 } }).type, 'fittingScheduled');
  assert.equal(journeyEvent({ zone: 'cabinet' }, { zone: 'cabinet' }), null);
});
