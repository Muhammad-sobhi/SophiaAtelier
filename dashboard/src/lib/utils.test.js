// Run with: npm test  (uses Node's built-in test runner, in Egypt's timezone to catch day-shift bugs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateScheduledDates, isCairoCity } from './utils.js';

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
