# 11 · Testing Strategy

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §11 (correctness guarantees), §16 (testing requirements), §17 (NFRs), §20 (ship criteria), F4 (receipt benchmark), Appendix A · [Pre-development review §19](14-pre-development-review.md#19-testing-gaps) · [D-018](decisions/D-018-r1a-r1b-scope.md) … [D-031](decisions/D-031-permission-matrix.md) |
| **Related** | [06 §9 Sync tests](06-syncing.md) · [07 §13–§14 Invariants and fixtures](07-calculation-engine.md) · [09 Security](09-security.md) · [10 Observability](10-observability.md) · [12 Environments](12-environments-and-deployment.md) |

A wrong balance loses a whole friend group forever (PRD §21). So Toli is tested hardest where money is touched, and lightest where only pixels are.

---


> **Updated rules (2026-09-25, after the [pre-development review](14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **New property tests** (from [07 §13](07-calculation-engine.md) items 11–15): direct-mode **exact pairing** (row and column sums; direct = simplified balances), removed members stay at 0, the two kitty views agree, the dust rule leaves every balance at 0 and never writes ≥ 1 major unit, and every expense has base ≥ 1.
> - **New golden fixtures G11–G16** ([07 §14](07-calculation-engine.md)).
> - **Concurrency:** conflicting ops sent at the same moment must hit `stale` and retry, keeping every invariant ([06 §9](06-syncing.md)).
> - **Offline duplicates:** an expense and a settlement recorded on two devices and synced hours apart must raise the prompt.
> - **Compatibility contract:** the previous 2 app versions against the new server; unknown enum values don't crash the phone.
> - **RLS:** web-claimed members read **nothing**; private `trip_ops` rows (`visible_to_member_id`) are hidden from others.
> - **Time zones:** DST and midnight boundaries for "Day 2 of 4", `joined_from`, budget days.
> - **Push delivery matrix:** Xiaomi, Oppo, Vivo, Samsung with the app killed. **Backup restore drill** monthly. **HoldButton accessible mode.**
> - **CI minutes:** heavy suites (100k property cases, 20k sync runs, Maestro) run **weekly**; light suites nightly and on each PR, to stay under GitHub's 2,000 free minutes.

## 1. The test pyramid for Toli

```
                    ┌──────────────────┐
                    │  E2E (Maestro)   │  few · real Android phones · incl. offline
                  ┌─┴──────────────────┴─┐
                  │  UI component tests  │  screens and design-system parts
                ┌─┴──────────────────────┴─┐
                │ API + DB + RLS tests     │  Edge Functions against local Supabase
              ┌─┴──────────────────────────┴─┐
              │ Sync simulator + kill tests  │  N fake phones, partitions, retries
            ┌─┴──────────────────────────────┴─┐
            │ Engine: unit + property + golden │  100% coverage, thousands of random trips
            └──────────────────────────────────┘
```

| Layer | Tools | Where |
|---|---|---|
| Unit | Vitest | `packages/*`, `apps/mobile/src/**` |
| Calculation | Vitest + **fast-check** | `packages/engine` |
| Sync | Vitest, deterministic simulator | `apps/mobile/src/sync` + `supabase/functions/sync-*` |
| API / integration | Vitest (Deno test for Edge Functions) against **local Supabase** (Supabase CLI in Docker) | `supabase/functions/**` |
| Database / RLS | **pgTAP** via `supabase test db` | `supabase/tests/*.sql` |
| UI components | React Native Testing Library + Jest (jest-expo) | `apps/mobile`, `packages/design-system` |
| E2E | **Maestro** on real Android devices (and emulator in CI) | `apps/mobile/e2e/*.yaml` |
| Performance | Vitest bench (engine), Maestro + Sentry spans (app), Android profiler | CI + before release |
| Receipt benchmark | a script over the 200-receipt corpus | nightly (R2) |

---

## 2. Unit tests

- Every command (`addExpense`, `editExpense`, `recordSettlement`, `contributeToKitty`, `claimMember` …) is tested with an in-memory SQLite: it validates, computes, and writes **rows + outbox op in one transaction** ([02 §2](02-architecture.md)).
- Zod schemas in `packages/schema`: valid and invalid examples for every op type and API request ([04](04-api-schema.md)).
- Deep-link parser: every allowed route passes; malformed IDs, unknown params and injection strings fail ([09 §7](09-security.md)).
- Analytics `track()`: every event type with sample data; asserts no forbidden keys/patterns (emails, UPI handles, long digit strings) ([10 §3](10-observability.md)).
- Formatting: `₹1,23,456`, `−₹1,200` (U+2212), trailing `.00` removed for INR, JPY/KWD exponents ([07 §12](07-calculation-engine.md)).
- Keypad input rules ([D-013](decisions/D-013-keypad-entry.md)): `00` key, `.` for decimal currencies, 8-digit cap.
- Duplicate check ([06 §5](06-syncing.md)): same amount and currency, **`spent_at`** within 10 minutes in the trip's time zone, by a **different** member → "Already logged?"; same member or 11 minutes apart → no prompt. It never compares server receive time.
- Limits from `packages/config` (50 members, 5 photos per expense, 10 MB, 1 GB free vault, 120-character descriptions) are enforced on the phone with the same values the server uses.
- **Money codec** (`data/money-codec.ts`, [D-028](decisions/D-028-money-in-sqlite.md)): SQLite `INTEGER` ↔ `Minor` round-trips exactly for 0, 1, negative values and Toli's maximum (~10¹¹); a value above `Number.MAX_SAFE_INTEGER` throws. Run it on a real `expo-sqlite` database, not a mock.
- **Lenient phone parsing** ([D-026](decisions/D-026-write-path-and-compat.md)): server data with extra fields parses fine; an unknown enum value (a new split mode, push `kind` or op type) becomes an "Update the app to see this" item and never throws.
- Zero amounts are blocked on save ("Type an amount first"); an FX amount that converts to less than 1 minor unit is blocked (`amount_too_small`).

---

## 3. Calculation engine tests (`@toli/engine`)

This is the most important test suite in the repo.

### 3.1 Coverage
- **100% lines and branches**, enforced in CI ([07 §13](07-calculation-engine.md) #10). A drop fails the PR.
- **Lint rule:** no `number` type holds money; `Minor = bigint & {__minor}` branding; no `/` on money outside `allocate()` ([07 §3](07-calculation-engine.md), #9).

### 3.2 Property tests (fast-check)
Random trips: 1–50 members, random split modes, multiple payers, kitty on/off, currencies with exponents 0/2/3, random edits, deletes, settlements and voids. **Each invariant from [07 §13](07-calculation-engine.md) is one property:**

| # | Property |
|---|---|
| P1 | `Σ balances = 0` for every trip state |
| P2 | `allocate`: sums to total; every part ≥ 0; `|part − exact| < 1`; weight 0 → 0 |
| P3 | every revision: `Σ base_shares = Σ base_payers = base_amount` |
| P4 | shuffling the input lists gives identical outputs |
| P5 | simplification keeps every balance, gives ≤ n − 1 payments, nobody both pays and receives |
| P6 | deleting an expense restores every balance exactly |
| P7 | a frozen FX rate never changes when `fx_rates` changes |
| P8 | replaying the same op log gives identical balances (shared with the sync simulator) |
| P9 | explanation lines sum exactly to the balance ([07 §9](07-calculation-engine.md)) |
| P10 | direct mode and simplified mode give the same net balances |

- **PR runs:** 1,000 cases per property (fast). **Nightly:** 100,000 cases per property with a new seed; failing seeds are saved and added as regression cases.

### 3.3 Golden fixtures
Hand-computed cases in `packages/engine/test/golden/*.json`, from [07 §14](07-calculation-engine.md): **G1** PRD Appendix A (hotel/dinner/cab) · **G2** ₹1,000 ÷ 3 · **G3** multiple payers · **G4** late joiner · **G5** kitty proportional refunds · **G6** IDR on INR trip · **G7** delete restores · **G8** three offline devices, 40 ops · **G9** itemised with GST 5% + service 10% · **G10** JPY and KWD.

- A fixture's expected numbers are **never** updated to match the code. If they disagree, one of them is a bug ([07](07-calculation-engine.md)); a changed fixture needs a decision record.
- The same fixtures run in **Deno** (Edge Function runtime) and **Hermes-compatible** JS, proving the phone and the server agree.

---

## 4. API and integration tests (Edge Functions)

Run against local Supabase (`supabase start`) with seeded data (`supabase/seed`, the Goa Weekend fixture).

| Endpoint group | Must test |
|---|---|
| `sync-push` | applied / duplicate / rejected for each reject code ([04 §2.1](04-api-schema.md)), incl. `member_limit` (51st member) and `attachment_limit` (6th photo); per-op zero-sum; server result wins on engine mismatch; seq strictly increasing under concurrent pushes to one trip; 50-op batch limit; server-only op types (`member.claim`, `member.anonymised`, `trip.transition` to `settled` …) rejected from phones |
| Permissions (OQ-P12) | every organiser-only op (remove, release, rotate, rename others, settle mode, reopen, `member.set_role`) → `not_organiser` for a member; `member.set_role` can't leave a trip with no organiser; settlement void allowed only for its recorder or an organiser |
| Settled trips | money and member ops → `trip_settled`; `feed.post` and `recap.update` still applied; auto-settle when derived payments reach zero after the end date or after `stubs-send`; voiding a settlement moves the trip back to `settling` (OQ-P13) |
| `sync-pull`, `trip-snapshot`, `trip-activity` | paging at 500, `has_more`, non-member trip returns `not_a_member` only for that trip; snapshot includes the last 500 ops as `activity`, older via `/trip-activity` |
| Invites / join | expiry (410), rotation kills old token and is organiser-only, `invite-create` without `rotate` returns the **same** link for every member, code format (3-letter prefix + 6 characters from the 31-character alphabet), first claim wins (`already_claimed`), 10 wrong codes/IP/hour, global alarm at 500/hour, preview and `invite-member-view` never return phone/email/UPI/user IDs (snapshot test of the response shape) |
| Files | size/type rejects, presigned URL expires in 300 s, `upload-confirm` fails on sha256 mismatch, free trip over 1 GB → 413 `quota_exceeded` (receipts not counted) |
| `upi-link` | only a current payer gets a URL; `upi_visible_to = nobody` returns `no_upi_id`; non-INR trip returns `not_inr` |
| `stubs-send` | 1 per trip per 10 min; `pushed: false` for ghosts and members without the app; `active` → `settling` |
| `web-settlement` | only an anonymous session that claimed the paying member; `Idempotency-Key` required; goes through the same validation as `sync-push` |
| `reminder-send` | second reminder within 48 h → 429 with `next_allowed_at` |
| `receipt-extract`, `trip-export`, `pro-verify`, `pro-webhook` | free trip → `pro_required`; each 422 `extraction_failed` reason keeps the photo and doesn't count against 30/trip/day; webhook rejects a bad store signature and sets `refunded_at` |
| `contacts-match` | only users with `discoverable` + consent match; max 500 hashes; 5/day |
| `account-delete` | member rows become "Former member" (numbered), a `member.anonymised` op is written, balances still sum to 0, profile/devices/auth user gone |
| `account-export` | only the caller's trips; link expires |
| `fx-ingest`, `health` | `fx-ingest` refuses calls without the cron secret; `health` returns `{ ok, db }` |
| Common | missing JWT → 401; wrong `Toli-Client` → 426; every response matches its Zod schema |

---

## 5. Database tests (pgTAP)

### 5.1 "No table without RLS" (blocks merge)
A pgTAP test (and a CI script) that:
1. lists every table in schema `public`;
2. **fails** if any table has RLS disabled (`pg_class.relrowsecurity = false`);
3. **fails** if any table has no policy at all, unless it's on an explicit server-only allow-list (`trip_invites`, `notification_outbox`, `reminders`, `rate_limit_buckets`) — those must have RLS **on** with no policies;
4. **fails** if any trip table has an INSERT/UPDATE/DELETE policy for `authenticated` or `anon` ([D-011](decisions/D-011-server-writes.md));
5. **fails** if a table exists that isn't documented in [03](03-database-schema.md) (compared with a list generated from the doc).

### 5.2 RLS behaviour tests
For each table, run as three users — **member**, **non-member**, **anonymous non-member** — using `set local role authenticated` + `request.jwt.claims`:
- member can SELECT own trip rows, non-member sees 0 rows;
- nobody can INSERT/UPDATE/DELETE trip rows directly;
- `profiles`: others see only `display_name`/`avatar_key` via `member_profiles`; `upi_vpa` and `phone_hash` never readable by others;
- `trip_budgets`: `member`-scope rows visible only to that member;
- `devices`, `notification_preferences`, `consents`: owner only; `op_rejections`, `pro_subscriptions`, `deletion_requests`, `data_exports`: owner select only.

### 5.3 Constraints and functions
- `expense_revisions` unique `(expense_id, revision_no)`; settlement `from ≠ to`; amounts > 0.
- The seq-assigning function under concurrency (two transactions, one trip) never duplicates a seq.
- Migrations apply cleanly from zero **and** from the last production schema (upgrade path).
- Generated types (`supabase gen types`) match the committed file (no drift).

---

## 6. Sync tests ([06 §9](06-syncing.md))

| Test | What it does | Pass condition |
|---|---|---|
| **Deterministic simulator** | N fake phones (2–6) with their own SQLite, one fake server; seeded random ops, **random network partitions**, random delivery order, edits and deletes of the same expense, same-field and different-field edits | every phone ends with **identical rows and balances**; nothing silently lost (every reject appears in Unresolved changes) — PRD A.2 #7 / G8 |
| **Idempotency** | every op delivered 1–3 times at random | no duplicates; `duplicate` answers treated as `applied` |
| **Outbox states** | network errors and 5xx vs real rejects | errors leave the op `retrying`, never `rejected`; only a server reject sets `rejected` + `reject_code` |
| **Duplicate on pull** | two members log the same amount offline within 10 minutes | only the later creator sees "Same one, delete mine" / "Keep both" |
| **Kill tests** | kill the process at random points in save and push (between SQLite write and outbox, mid-HTTP, after server commit before response) | no data loss, no duplicates, outbox drains on restart |
| **Rebase** | pending local edit + incoming pull on the same entity | user still sees their own unsent edit on top |
| **Long offline** | 500 ops queued over a simulated week | drains in 50-op batches; balances correct locally throughout |
| **Old client** | payload `v` one and two releases old; three releases old | accepted; rejected with `upgrade_required` |
| **Clock skew** | phones with clocks ±1 day | order is decided by server seq only |

- The simulator is **seeded**: any failure prints the seed, which reproduces it exactly.
- PR: 200 simulated runs. Nightly: 20,000 runs with fresh seeds.

---

## 7. UI component tests

- Design-system parts: `TicketCard`, `Stub`, `Stamp`, `Keypad`, `AmountDisplay`, `HoldButton` (cancels on early release; accessible double-tap alternative), `Segmented`, `Banner`, `SyncPill` ([13 §5](13-design-system.md)).
- Screens with mocked data layer: add expense (live per-person line, disabled Save until the split adds up, "₹120 unassigned", **Distribute the remainder**), "Already logged?" sheet (**Same one, skip** / **Save anyway**), split editor (every mode; Itemised by hand works on a free trip, and **Scan bill · PRO** opens the [Pro sheet](screens/pro-sheet.md), [D-017](decisions/D-017-itemised-free-scan-pro.md)), settle up (Simplified/Direct toggle, "6 → 3" count, offline hold button shows "Needs internet" while **Mark as paid** still works, toast names who couldn't be pushed), balance trace (lines sum to the balance), unresolved changes (one action per item), settled trip shows "Everyone's square." (no recap in R1), R1 tab bar **Trip · (+) · Members** (OQ-P11).
- **Accessibility assertions:** every money value has a spoken label ("Rahul owes one thousand rupees"); tap targets ≥ 44 px; money never conveyed by colour alone (a sign and a word are present) ([13 §9](13-design-system.md)).
- **Reduce Motion:** tear overlay replaced by the toast.
- **Hindi strings** render with the Devanagari fallback font; no clipped text at 1.3× dynamic type.

---

## 8. End-to-end tests (Maestro)

Run on **real Android devices** before every release (a ₹15,000-class 3-year-old phone and one recent phone), and on an emulator in CI nightly.

| Flow | Steps |
|---|---|
| **E1 First trip** | fresh install → Welcome → Get started → create "Goa Weekend" + 3 ghosts → add ₹1,200 → tear overlay → trip home shows correct balances. **Asserts time-to-first-expense ≤ 60 s** (scripted, as a guard) |
| **E2 Split modes** | one expense per mode; balances match golden fixture G1 |
| **E3 Offline** | airplane mode on → add 5 expenses, edit 1, delete 1 → "SAVED ON PHONE · WILL SYNC" labels → airplane mode off → sync pill → second device shows the same balances |
| **E4 Join by code** (APK path, [D-016](decisions/D-016-testing-distribution.md)) | device B installs a sideloaded APK (the `preview` build, for QA) → Join trip → code → "Which one are you?" → claim → sees history; device A's organiser is notified of the claim |
| **E5 Join by link** | tap invite link → App Link opens app → claim |
| **E6 Settle up** | hold to tear → "STUBS DELIVERED" → toast names anyone not pushed ("Share with Jay on WhatsApp") → device B: Pay via UPI (stubbed UPI intent) → "Did the payment go through?" → Yes → device A sees PAID |
| **E6b Web pay** | open the invite page in a browser → pick a debtor → Pay via UPI (anonymous sign-in + claim, then `/upi-link`) → "Yes, I paid" → device A sees PAID; a second browser picking the same name sees "This spot is taken" |
| **E7 Partial + manual** | Mark as paid ₹500 of ₹1,200 → remaining ₹700 shown |
| **E8 Kitty** | enable kitty, contributions, kitty-paid expense, low-kitty banner, refund lines |
| **E9 Conflict** | device A edits, device B deletes the same expense, both offline → reconnect → A sees Unresolved changes with Restore |
| **E10 Reinstall** | anonymous user uninstalls → reinstalls → organiser releases → re-claim → history intact |
| **E11 Delete account** | delete → member shows as "Former member" on device B; balances still sum to 0 |
| **E12 Notifications** | expense by B → push on A with See split (Pay via UPI only if A owes B); tap opens the right screen; "Mark as paid" opens the pre-filled settle row and "Not me" opens the expense, neither records anything without a confirm ([04 §11](04-api-schema.md)) |

---

## 9. Failure tests

Using a fault-injecting proxy (e.g. MSW on the phone side, a toggle in local Edge Functions) and Maestro network toggles.

| Failure | Expected behaviour |
|---|---|
| API completely down | app fully usable; ops queue; banner only if offline; no crash |
| **429** with `Retry-After` | client waits the given time; user-triggered action shows "Too many tries" |
| **5xx** | backoff 2 s → 5 min + jitter; op kept |
| **Timeouts** (10 s) | treated as unknown; retry; server answers `duplicate` if it already applied |
| **426** upgrade required | "Update Toli" prompt; ops stay in the outbox |
| Rejected op | item in Unresolved changes; entity reverted to the server version |
| Realtime disconnected | foreground/network events still pull |
| R2 upload fails / URL expired | photo retry badge; new URL requested |
| FX provider down | `fx-ingest` falls back to fawazahmed0; phone uses cached table with date |
| Geoapify over budget (503) | manual place entry |
| Receipt AI fails | 422 `extraction_failed` with a `reason`; photo kept; not counted against the daily limit; manual item list still works |
| Offline on Settle up | hold button shows "Needs internet"; payments list visible; **Mark as paid** queues in the outbox |
| FCM token `UNREGISTERED` | device marked invalid; no retries |
| Supabase paused (preview) | health check fails → alert; app still works offline |
| Corrupted SQLite / failed migration | app restores from a fresh snapshot after confirming the outbox is empty (or exports the outbox to Sentry first) |

---

## 10. Receipt extraction benchmark (R2, before F4 ships)

- **Corpus:** 200 real Indian receipts (restaurant, bar, grocery), including thermal-print fade, regional-language items, crumpled and angled captures (PRD F4). Stored in a **private** bucket; consent obtained; personal details on receipts redacted.
- **Labels:** hand-typed ground truth: merchant, date, currency, items (label + amount), tax/service/tip/discount, total.
- **Metrics:** total accuracy (exact match, target **≥ 95%**); line-item accuracy (item amount matched, target **≥ 85%**); "sums to total" rate; median latency; cost per receipt.
- **When:** nightly while F4 is being built; on every provider/model/prompt change; before each release. Results tracked per release in `docs/benchmarks/receipts.md`.
- **The feature doesn't ship until the benchmark exists and passes** (PRD F4).

---

## 11. Performance tests (PRD §17 budgets)

| Budget | Test |
|---|---|
| Cold start to trip list ≤ 1.5 s p90 (mid-range Android) | Maestro launches ×20 on the reference ₹15,000 phone; Sentry app-start span; before release |
| Local expense save ≤ 100 ms | Maestro + Sentry span on the reference phone |
| Balance recompute ≤ 50 ms for 500 expenses | Vitest bench in CI (Node) with a 3× safety margin, plus on-device measurement before release |
| 50 members, 2,000 expenses per trip | seeded trip: snapshot size, pull time, scroll performance (no dropped frames on trip home) |
| App download ≤ 40 MB | CI check on the release AAB size (per-ABI download size) |
| Time-to-log p50 ≤ 5 s | measured in the beta from `expense_added.duration_ms` ([10 §8](10-observability.md)) |
| Tear overlay 60 fps | on-device profiling on the reference phone |

---

## 12. What runs when

| Check | Every PR | Nightly | Before release |
|---|---|---|---|
| Typecheck, lint (incl. no-number-money rule), format | ✅ | | ✅ |
| Unit tests | ✅ | | ✅ |
| Engine: 100% coverage, golden fixtures | ✅ | | ✅ |
| Engine property tests | 1,000 cases | 100,000 cases, new seed | 100,000 |
| Sync simulator | 200 runs | 20,000 runs | 20,000 |
| Idempotency + kill tests | ✅ (short) | ✅ (long) | ✅ |
| API / Edge Function tests (local Supabase) | ✅ | | ✅ |
| pgTAP: **no table without RLS** + RLS behaviour | ✅ (blocks merge) | | ✅ |
| Migration from zero + from production schema; type drift | ✅ | | ✅ |
| UI component tests | ✅ | | ✅ |
| Build validation (Expo prebuild + `tsc`, Worker build, Edge Function bundle) | ✅ | | ✅ |
| Maestro E2E | | emulator | **real devices** |
| Failure-injection suite | | ✅ | ✅ |
| Performance budgets | engine bench | | ✅ on reference phone |
| Receipt benchmark (R2) | on prompt/model change | ✅ | ✅ |
| Dependency audit | | ✅ | ✅ |
| Balance audit against preview data | | ✅ (pg_cron) | ✅ |

**Rule:** `main` is always releasable. A failing nightly opens an issue automatically; a failing money test (engine, sync, RLS) blocks releases until fixed.

---

## 13. Beta ship criteria (PRD §20, R1)

R1 is ready to leave the beta only when **all** of these are true:

| Criterion | How we measure |
|---|---|
| **20 real trips** run end to end by people outside the team | trips with ≥ 3 claimed members, ≥ 5 expenses and at least one settlement, in production (APK testers use the production backend, [D-016](decisions/D-016-testing-distribution.md)) |
| **Zero balance-correctness incidents** | nightly balance audit: zero failures; zero confirmed `balance_dispute_reported`; zero engine mismatches in the last 2 releases |
| **Median time-to-log ≤ 5 s** | `expense_added.duration_ms` p50 across beta trips ([10 §8](10-observability.md)) |
| Crash-free sessions ≥ 99.5% | Sentry release health |
| All PR, nightly and release checks green | CI |
| Privacy notice + working delete path live | launch-blocking (PRD §18) |
| Kitty wording reviewed by legal | PRD §21 |

**Do not start R2 before this is met** (PRD §20).
