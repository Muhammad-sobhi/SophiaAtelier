# Sophia Dresses — Full Implementation Plan

This document contains the verified, multi-phase plan for the Sophia Dresses system update, extracted from the planning session.

## `models.md` routing
| Phase | Work | Master | Backup 1 | Backup 2 |
|---|---|---|---|---|
| 0 | Pest harness | **GLM-5.3** | Kimi K2.7 Code | GLM-5.3-Flash |
| 1 | Security (auth, PII, money, uploads, public API) | **Opus 4.6** | Gemini 3.1 Pro | Sonnet 4.6 |
| 1b | Security review gate | **Opus 4.6** | Gemini 3.1 Pro | Sonnet 4.6 |
| 2 | DB: journey_mode, pickup/return, sales-per-stage, activity_logs | **Opus 4.6** | Gemini 3.1 Pro | GLM-5.3 |
| 2b | Resolvers, import rewrite, availability SQL, end_fitting, audit writer | **GLM-5.3** | Kimi K2.7 Code | DeepSeek V4 Pro |
| 2c | If stageAction coupling is messy | **Sonnet 4.6** | GLM-5.3 | Gemini 3.1 Pro |
| 3 | FormRequests + Resources | **GLM-5.3** | Kimi K2.7 Code | DeepSeek V4 Pro |
| 3b | Structure check | **Sonnet 4.6** | — | — |
| 4 | Journey board, brides month/search, finance popups, dresses sort, appointments mobile | **Kimi K2.7 Code** | Kimi K3 | GLM-5.3 |
| 4b | Difficult UI: journey popup timeline, month day-grid, appointments mobile | **Kimi K3** | Gemini 3.1 Pro | Opus 4.6 |
| 5 | Cleanup | **GLM-5.3** | Kimi K2.7 Code | Luna |
| 6 | Fast review | **Gemini 3.8 Flash** | Luna | GLM-5.3-Flash |
| 6b | Final / production review | **Opus 4.6** | Gemini 3.1 Pro | Sonnet 4.6 |
| — | Git / artisan | **GLM-5.3** | Kimi K2.7 Code | Luna |
| — | Stuck / disagree | **Grok 4.6** | Gemini 3.1 Pro | Sonnet 4.6 |

*Note: Opus writes anything touching auth, payments, PII, uploads, audit. K3 only for hard UI. GLM-5.3 for Laravel/tests. K2.7 for normal React.*

---

## Phase 0 — Pest  
**Model: GLM-5.3**
- Add Pest + factories (User, Client, Dress, Booking, Visit, Fitting, Employee, Revenue).  
- Add `actingAsStaff()` / `actingAsAdmin()`.
- Red tests we will flip: public dress leak, staff finance transfer, live completed-fitting stuck, Excel notes hijacking live clients, `end_fitting` not leaving Fitting, conflict payload too thin.

---

## Phase 1 — Security  
**Model: Opus 4.6 → Opus security review**
- Auth-only `GET /dresses` and `GET /dresses/{id}`. New `GET /public/dresses` stripped. Update `sophia/app/lib/api.js`.
- Remove public `GET /dresses/release-code/{code}` (admin POST). No `opcache_reset`.
- Delete `/storage-debug/{path}`. Health-only `/public/system-status`.
- Public find-client = tracking DTO. Public booking = real phone + dress; no fake phone; no `Dress::first()`.
- Finance transfer/deposit/withdraw = `role:admin`.
- `force_override` = admin only. Stop Finances modal always sending `is_override: true`.
- Password: plain assign + `hashed` cast only.
- Stop role middleware logging.
- Upload mime + size on `hasFile()`.
- Drop `Access-Control-Allow-Origin: *` on storage route.
- Delete `fix_password.php`, `test_login.php`, `test_hash.php`, `delete_old_emp_data.php`.

---

## Phase 2 — Data + journey engine + logs  
**DB: Opus 4.6 · Implement: GLM-5.3** (Sonnet if stageAction fights)
- **Migrations:**
  - `clients.journey_mode` `legacy|live`, default `live`. Backfill `excel_import` → `legacy`.
  - `bookings.pickup_scheduled_on`, `return_scheduled_on`.
  - Stage sales: `visits.sales_name`, `fittings.sales_name`, `bookings.pickup_sales_name`, `bookings.return_sales_name` (keep `bookings.sales_name` for booking).
  - `activity_logs`: `id`, `user_id`, `employee_name`, `action`, `entity_type`, `entity_id`, `summary` (json old/new, no secrets), `ip`, `created_at`. Index `(created_at)`, `(user_id)`, `(entity_type, entity_id)`.
  - Optional `bookings.accessories_snapshot` json for pickup/return checks.
- **Services:**
  - `LegacyStageResolver` / `LiveStageResolver` / `StageComputer`.
  - `Client::getCurrentStageAttribute` → StageComputer only. Delete `2026-08-02` / notes regex.
  - **Live:** after all fittings `completed` and booking not `picked_up`/`returned` → stage **`picked_up`** (column only). `mark_picked_up` still sets dress `out` + money.
  - `DressAvailabilityService`: SQL overlap; dresses 1+2+3; 2/3-day policy.
  - Conflict API: list of blockers `{ client_name, stage, event_date, pickup_scheduled_on, return_scheduled_on, booking_status }` — not one string.
  - `ActivityLogger` middleware or observer on writes + auth login/logout.
  - Scheduler: `activity-logs:prune --days=180` daily.
  - `importExcel`: set `legacy`, write date columns, set status once. No fake phones. No `Dress::first()`.
  - Artisan `brides:recompute-legacy-stages` for existing imported rows.
  - `stageAction` success → `journey_mode = live`. Pass `sales_name` into the matching stage column.
  - `end_fitting`: complete fittings; do not create fake fitting if none unless there is a booking; then StageComputer returns Pickup column.
  - Return: require accessory checklist (or missing note); **manual** insurance refund field default = full insurance; write one insurance refund revenue = amount staff entered (insurance − damage).
  - Stage **edit**: update the same visit/booking/fitting/revenue rows; do not insert a second deposit. Finance totals follow those rows.
  - Cleaning hook includes dress 3.

---

## Phase 3 — API shape  
**GLM-5.3 → Sonnet structure check**
- FormRequests + Resources for Dress, Booking, Client, Employee, Finance, ActivityLog.  
- Keep keys. Client index `per_page` 25.  
- Employee index: directory for staff; salary/PII admin.  
- Sales report: `GET /reports/sales-by-stage?month=YYYY-MM` → per sales person counts (bookings, fittings, pickups, returns, distinct brides).

---

## Phase 4 — Dashboard (items 1–5, 8–13 UI)  
**Kimi K2.7 · hard UI: Kimi K3**
- **1. Journey board (`BridesPage` + replace fat `BrideJourneyCard`):** Five stage tabs/points. Click a stage → only brides in that stage. Search name/phone. Tight chip (name only). Popup has horizontal line + dots with action buttons. Split old 2000-line card into `components/bride-journey/`.
- **2. Appointments mobile:** Vertical list of all events (no width clip). Show bride name and real dress thumb (no Unsplash).
- **4–5 + 13. Brides page:** Month chip → grid day 1..last. Empty days visible. Brides on wedding day/visit day. Search all fields + filter dropdown. Chip "Visited, did not book".
- **7. Stage edit:** Popup “Edit this stage” = same fields as create. Save updates original rows.
- **8. Dresses:** Sort index by `code` ascending.
- **9. Sales per stage:** Required sales select on visit, booking, fitting, pickup, return. Monthly report.
- **10. Conflict modal:** Show each blocker. Admin override still admin-only.
- **11. Return popup:** Accessory checkboxes. Insurance refund input (minus damage).
- **12. Finance cards:** Clickable summary cards → modal of rows.
- **3. Logs page:** Admin-only table. No client-side fake `RecentActivity`.
- Also: `api-client.js` AbortController; Login out of `DashboardLayout`.

---

## Phase 5 — Cleanup  
**GLM-5.3**
- Remove leftover `opcache_reset`. Document or drop composer audit ignores.

---

## Phase 6 — Verify  
**Gemini 3.8 Flash then Opus 4.6**
- `php artisan test` green.
- Legacy: future pickup = Booking; staff click → live.
- Live: finish fitting → Pickup column; hand over → dress out; visit-only chip works.
- Month grid empty days; mobile appointments show all events + names.
- Edit deposit → finance card popup shows one updated row.
- Conflict modal shows other bride’s dates.
- Logs appear; 6-month prune dry-run.
- Public catalog: no prices/PII.
