// Run with: npm test  (uses Node's built-in test runner, in Egypt's timezone to catch day-shift bugs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScheduledDates, isCairoCity, earliestVisitDate, visitWindowError } from './utils.js';

test('Cairo: pickup 1 day before, return 1 day after', () => {
  assert.deepEqual(calculateScheduledDates('2026-09-23', 'القاهرة'), { pickupDate: '2026-09-22', returnDate: '2026-09-24' });
});

test('other cities: pickup 2 days before, return 1 day after', () => {
  assert.deepEqual(calculateScheduledDates('2026-09-23', 'طنطا'), { pickupDate: '2026-09-21', returnDate: '2026-09-24' });
});

test('month and year boundaries', () => {
  assert.deepEqual(calculateScheduledDates('2026-12-31', 'طنطا'), { pickupDate: '2026-12-29', returnDate: '2027-01-01' });
  assert.deepEqual(calculateScheduledDates('2026-10-01 00:00:00', 'Cairo'), { pickupDate: '2026-09-30', returnDate: '2026-10-02' });
});

test('empty wedding date gives no dates', () => {
  assert.deepEqual(calculateScheduledDates('', 'القاهرة'), { pickupDate: '', returnDate: '' });
});

test('Cairo city detection', () => {
  for (const city of ['', null, 'القاهرة', 'القاهره', 'الجيزة', 'مدينة نصر', 'مصر الجديدة', 'مصر الجديده', 'التجمع الخامس', '6 أكتوبر', 'حلوان', 'Cairo', 'GIZA']) {
    assert.equal(isCairoCity(city), true, city);
  }
  for (const city of ['طنطا', 'دمياط الجديدة', 'المنيا الجديدة', 'الإسكندرية', 'المنصورة', 'Alexandria']) {
    assert.equal(isCairoCity(city), false, city);
  }
});

test('visit at most 4 months before the wedding, counted by day', () => {
  assert.equal(earliestVisitDate('2027-01-30'), '2026-09-30');
  assert.equal(earliestVisitDate('2027-06-30 00:00:00'), '2027-02-28');
  assert.equal(earliestVisitDate('2028-06-30'), '2028-02-29');
  assert.equal(visitWindowError('2026-09-30', '2027-01-30'), '');
  assert.match(visitWindowError('2026-09-29', '2027-01-30'), /30\/09\/2026/);
  assert.equal(visitWindowError('', '2027-01-30'), '');
  assert.equal(visitWindowError('2026-09-29', ''), '');
});

test('an offer with a wedding range opens the window on its days for its dresses', () => {
  const offers = [{ starts_at: '2026-11-06', ends_at: '2026-11-08', wedding_from: '2026-12-01', wedding_until: '2027-03-31', dress_ids: [7] }];
  assert.equal(visitWindowError('2026-11-07', '2027-03-20', ['7'], offers), '');
  assert.notEqual(visitWindowError('2026-11-07', '2027-03-20', ['8'], offers), '');
  assert.notEqual(visitWindowError('2026-11-05', '2027-03-20', ['7'], offers), '');
  assert.notEqual(visitWindowError('2026-11-07', '2027-04-10', ['7'], offers), '');
  assert.notEqual(visitWindowError('2026-11-07', '2027-03-20', ['7'], [{ ...offers[0], wedding_until: null }]), '');
});
