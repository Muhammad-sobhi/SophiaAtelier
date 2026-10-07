/**
 * Captures the screenshots used by the "How to Book" guide page (/how-to-book).
 *
 * It walks through the real booking flow on a running local site, in English and Arabic,
 * on desktop and mobile, and saves one image per step to:
 *   public/images/how-to-book/{en|ar}/{desktop|mobile}/step-01.jpg … step-09.jpg
 *
 * Requirements
 *   - Backend running (php artisan serve → http://localhost:8000) on a LOCAL / TEST database:
 *     the last step really submits a visit request.
 *   - Frontend running (npm run dev → http://localhost:3000).
 *   - The guide bride account (created once): phone +201000000777 / guide@sophia.test.
 *   - A Chromium-based browser (Chrome / Brave / Edge). Set BROWSER_PATH if it is not auto-detected.
 *
 * Usage
 *   node scripts/capture-how-to-book.mjs                 # all languages and devices
 *   node scripts/capture-how-to-book.mjs --lang=ar --device=mobile
 *
 * Before each run the guide account's previous visits are removed (via `php artisan tinker`)
 * so every run ends on the "confirmed" success message and leaves nothing behind.
 */
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_DIR = path.resolve(ROOT, '..', 'backend');
const SITE = process.env.SITE_URL || 'http://localhost:3000';
const API = process.env.API_URL || 'http://localhost:8000/api';
const OUT_DIR = path.join(ROOT, 'public', 'images', 'how-to-book');

const GUIDE_BRIDE = { name: 'Sophia Guide', phone: '01000000777', fullPhone: '+201000000777', email: 'guide@sophia.test' };
// Dresses used in the walkthrough (matched by the English name in the image alt text)
const DRESSES = (process.env.GUIDE_DRESSES || 'Ivory Dream,Pearl Bride').split(',').map((s) => s.trim());
const VISIT_SLOT = '04:00 PM';

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const BROWSER_CANDIDATES = [
  process.env.BROWSER_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const LANGS = args.lang ? [args.lang] : ['en', 'ar'];
const DEVICE_NAMES = args.device ? [args.device] : ['desktop', 'mobile'];

/* ── helpers ─────────────────────────────────────────────── */

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** A visit date a few days ahead that is not closed, and a wedding date two months later */
async function pickDates() {
  const closed = await fetch(`${API}/public/closed-days`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const closedSet = new Set((closed || []).map((d) => d.date));
  const today = new Date().toISOString().slice(0, 10);
  let visit = addDays(today, 5);
  while (closedSet.has(visit)) visit = addDays(visit, 1);
  return { visit, wedding: addDays(visit, 60) };
}

function resetGuideVisits() {
  const php = `
    $c = \\App\\Models\\Client::where('phone', '${GUIDE_BRIDE.fullPhone}')->first();
    if ($c) {
      foreach (\\App\\Models\\Visit::where('client_id', $c->id)->get() as $v) {
        \\Illuminate\\Support\\Facades\\DB::table('visit_dresses')->where('visit_id', $v->id)->delete();
        \\App\\Models\\Notification::where('related_type', 'visit')->where('related_id', $v->id)->delete();
        $v->delete();
      }
      echo 'guide visits cleared';
    } else { echo 'guide account not found'; }
  `;
  try {
    const out = execFileSync('php', ['artisan', 'tinker', '--execute', php], { cwd: BACKEND_DIR, encoding: 'utf8' });
    console.log('   ↺', out.trim());
  } catch (e) {
    console.warn('   ⚠ could not clear previous guide visits:', e.message.split('\n')[0]);
  }
}

async function shot(page, lang, device, step) {
  const dir = path.join(OUT_DIR, lang, device);
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(700); // let transitions settle
  const file = path.join(dir, `step-${String(step).padStart(2, '0')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  console.log('   📸', path.relative(ROOT, file));
}

// The dress image (alt = English name); clicking it opens the Quick View like clicking the card
const dressCard = (page, name) => page.locator(`main img[alt="${name}"]`).first();

async function openQuickView(page, name) {
  const card = dressCard(page, name);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.locator('[class*="QuickView"][class*="modal"]').waitFor();
  await page.waitForTimeout(800);
}

async function openBag(page, device) {
  if (device === 'desktop') {
    await page.locator('button[aria-label="Shopping Bag"]').click();
  } else {
    await page.locator('button[aria-label="Toggle Menu"]').click();
    await page.waitForTimeout(500);
    await page.locator('[class*="mobileIcons"] button').nth(3).click();
  }
  await page.locator('[class*="CartDrawer"][class*="drawer"]').waitFor();
}

const closeBag = (page) => page.locator('[class*="CartDrawer"][class*="drawer"] button[aria-label="Close"]').click();

/* ── one full walkthrough ────────────────────────────────── */

async function capture(browser, lang, device, dates) {
  console.log(`\n▶ ${lang} / ${device}`);
  resetGuideVisits();

  const context = await browser.newContext({ ...DEVICES[device], locale: lang === 'ar' ? 'ar-EG' : 'en-US', timezoneId: 'Africa/Cairo' });
  await context.addInitScript(({ lang }) => {
    localStorage.setItem('sophia_lang', lang);
    sessionStorage.setItem('sophia_wedding_prompt_dismissed', '1'); // the guide shows the date inside the bag
  }, { lang });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  // Hide the Next.js dev indicator
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = 'nextjs-portal{display:none!important}';
      document.head.appendChild(s);
    });
  });

  try {
    await walkthrough(page, lang, device, dates);
  } catch (e) {
    const debugDir = path.join(ROOT, 'scripts', '.debug');
    mkdirSync(debugDir, { recursive: true });
    const debug = path.join(debugDir, `${lang}-${device}.png`);
    await page.screenshot({ path: debug }).catch(() => {});
    console.error('   debug screenshot:', path.relative(ROOT, debug));
    throw e;
  } finally {
    await context.close();
  }
}

async function walkthrough(page, lang, device, dates) {
  // 1. Browse the collection
  await page.goto(`${SITE}/collections`, { waitUntil: 'networkidle' });
  const firstCard = dressCard(page, DRESSES[0]);
  await firstCard.waitFor();
  await page.evaluate(() => {
    const bar = document.querySelector('[class*="filterSection"]');
    const nav = document.getElementById('navbar');
    const top = bar ? bar.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight || 80) - 1 : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
  await page.waitForTimeout(1500);
  await shot(page, lang, device, 1);

  // 2. Quick View of a dress
  await openQuickView(page, DRESSES[0]);
  await shot(page, lang, device, 2);

  // 3. Add it to the wishlist (optional step)
  const wishBtn = page.locator('[class*="QuickView"][class*="wishlistBtn"]');
  await wishBtn.scrollIntoViewIfNeeded();
  await wishBtn.click();
  await shot(page, lang, device, 3);

  // 4. Add to the selection bag (2 dresses)
  await page.locator('[class*="QuickView"][class*="addToCartBtn"]').click();
  await page.locator('[class*="CartDrawer"][class*="drawer"]').waitFor();
  await closeBag(page);
  await openQuickView(page, DRESSES[1]);
  await page.locator('[class*="QuickView"][class*="addToCartBtn"]').click();
  const drawer = page.locator('[class*="CartDrawer"][class*="drawer"]');
  await drawer.waitFor();
  await page.waitForTimeout(1200);
  await shot(page, lang, device, 4);

  // 5. Create an account / sign in (the bag asks for it before booking)
  await page.locator('[class*="checkoutBtn"]').click();
  const modal = page.locator('[class*="AuthModal"][class*="modal"]');
  await modal.waitFor();
  await modal.locator('[class*="toggleBtn"]').click(); // → "Create account"
  await modal.locator('input[type="text"]').fill(GUIDE_BRIDE.name);
  await modal.locator('#auth-phone').fill(GUIDE_BRIDE.phone);
  await modal.locator('input[type="email"]').fill(GUIDE_BRIDE.email);
  await shot(page, lang, device, 5);
  // The guide account already exists, so sign in with it
  await modal.locator('[class*="toggleBtn"]').click(); // → "Sign in"
  await modal.locator('#auth-phone').fill(GUIDE_BRIDE.phone);
  await modal.locator('button[type="submit"]').click();
  await modal.waitFor({ state: 'detached' });

  // 6. Visit date & time
  await openBag(page, device);
  await page.locator('#bag-visit-date').fill(dates.visit);
  await page.locator('#bag-visit-date').blur();
  await page.locator('#bag-visit-time').selectOption(VISIT_SLOT).catch(() => {});
  await page.locator('#bag-visit-date').evaluate((el) => el.closest('div').scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(800);
  await shot(page, lang, device, 6);

  // 7. Wedding date → live availability of each dress
  await page.locator('#bag-wedding-date').fill(dates.wedding);
  await page.locator('#bag-wedding-date').blur(); // no highlighted date segment in the shot
  await page.locator('[class*="statusOk"]').nth(DRESSES.length * 2 - 1).waitFor();
  await page.locator('[class*="CartDrawer"][class*="item"]').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(800);
  await shot(page, lang, device, 7);

  // 8. Accept the visit rules and book
  const rules = page.locator('[class*="CartDrawer"][class*="drawer"] input[type="checkbox"]');
  await rules.check();
  await page.locator('[class*="checkoutBtn"]').scrollIntoViewIfNeeded();
  await page.locator('[class*="checkoutBtn"]').evaluate((el) => el.scrollIntoView({ block: 'end' }));
  await shot(page, lang, device, 8);

  // 9. Success message
  await page.locator('[class*="checkoutBtn"]').click();
  await page.locator('[class*="checkoutBtn"]').waitFor({ state: 'detached' });
  await drawer.locator('h3').nth(1).waitFor();
  await shot(page, lang, device, 9);
}

/* ── main ────────────────────────────────────────────────── */

const executablePath = BROWSER_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error('No Chromium-based browser found. Set BROWSER_PATH to Chrome/Brave/Edge.');
  process.exit(1);
}

const dates = await pickDates();
console.log(`Using ${path.basename(executablePath)} · visit ${dates.visit} ${VISIT_SLOT} · wedding ${dates.wedding}`);

const browser = await chromium.launch({ executablePath, headless: true });
let failed = false;
try {
  for (const lang of LANGS) {
    for (const device of DEVICE_NAMES) {
      try {
        await capture(browser, lang, device, dates);
      } catch (e) {
        failed = true;
        console.error(`   ✗ ${lang}/${device} failed:`, e.message.split('\n')[0]);
      }
    }
  }
} finally {
  await browser.close();
  resetGuideVisits(); // leave no test visit behind
}
process.exit(failed ? 1 : 0);
