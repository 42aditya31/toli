# 10 · Observability

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §6.2 (metrics), §17 (performance), §19 (events), §20 (ship criteria) · [Tech stack §5.12](superpowers/specs/2026-09-24-toli-tech-stack.md) · [Pre-development review](14-pre-development-review.md) · [D-018](decisions/D-018-r1a-r1b-scope.md) · [D-021](decisions/D-021-rounding-adjustment.md) · [D-022](decisions/D-022-kitty-views-and-handover.md) · [D-023](decisions/D-023-auto-settle-timing.md) · [D-024](decisions/D-024-web-page-read-only-beta.md) · [D-026](decisions/D-026-write-path-and-compat.md) · [D-027](decisions/D-027-environments-and-backups.md) |
| **Related** | [08 Integrations](08-third-party-integrations.md) · [09 Security](09-security.md) · [11 Testing](11-testing-strategy.md) · [12 Environments](12-environments-and-deployment.md) · [Open questions](01-overview.md#open-questions) |

How we know Toli is working: **analytics** (are people getting value?), **logs and errors** (is it broken?), **performance** (is it fast?), and **alerts** (who gets woken up?).

---

## 1. Tools

| Need | Tool | Where it runs |
|---|---|---|
| Product analytics, funnels, feature flags | PostHog | phone |
| Crashes, errors, release health | Sentry | phone, Edge Functions, Worker |
| Server logs | Supabase Edge Function logs (+ Worker logs) | server |
| Uptime and keep-alive | UptimeRobot (`/rest/v1/rpc/health` on both cloud projects, Worker `/healthz`) | outside |
| Data correctness | nightly balance audit: a **pure SQL** pg_cron job, no engine | Postgres |
| Free-tier usage | daily invocation check + weekly usage sheet ([08 §5](08-third-party-integrations.md)) | Supabase dashboard / GitHub Action |

---

## 2. Analytics (PostHog)

### 2.1 Rules
- **Instrument the funnel, not vanity** (PRD §19).
- Events are sent from the phone, queued offline, and batched.
- Every event carries these **common properties**: `app_version`, `runtime_version`, `platform`, `env`, `is_anonymous` (bool), `online` (bool), `trip_id_hash` (see §3).
- **Event names are fixed in code** (a typed `track()` function with a Zod schema per event). Unknown events or properties fail the type check.
- `distinct_id` = a SHA-256 hash of the Supabase user ID with a per-environment salt. Never the raw ID, email or phone.

### 2.2 Core event list (24 events)

Merged and trimmed from PRD §19, plus the events the review's fixes need (#20–#24). Each event answers a real question.

| # | Event | Properties | Question it answers |
|---|---|---|---|
| 1 | `app_opened` | `cold_start_ms`, `is_first_open`, `source` (`icon`/`invite_link`/`push`) | Are people coming back, and how fast is the app to start? |
| 2 | `trip_created` | `template`, `member_count`, `has_dates`, `base_currency`, `offline` | Are organisers setting up trips, and how big are the groups? |
| 3 | `member_added` | `source` (`typed`/`contacts`; contacts copy **names only**, [D-025](decisions/D-025-no-contacts-matching-v1.md)), `member_count` | Do people add the whole group up front? |
| 4 | `invite_shared` | `channel` (`whatsapp`/`copy`/`other`), `member_count`, `ghost_count` | Do organisers spread the app? |
| 5 | `invite_opened` | `surface` (`web`/`app`), `has_app` (bool), `method` (`link`/`code`) | Do invite links get opened, and on which surface? |
| 6 | `member_claimed` | `from_ghost` (bool), `days_since_trip_created_bucket`, `install_source` (`referrer`/`link_after_install`/`code`; **R1b** adds `web` = a limited web membership, [D-024](decisions/D-024-web-page-read-only-beta.md)) | Does link-first onboarding convert participants? (invite acceptance, k-factor) |
| 7 | `expense_added` | `split_mode`, `payer_count`, `paid_from_kitty`, `currency_is_base`, `offline`, `entry_method` (`keypad`/`repeat`/`scan`), `participant_count`, `amount_bucket`, **`duration_ms`** | Is logging fast (the 5-second rule)? Which split modes matter? |
| 8 | `expense_edited` | `fields_changed` (list of field names), `by_creator` (bool) | How often do numbers get corrected, and by whom? |
| 9 | `expense_deleted` | `age_bucket` (`<10m`/`<1d`/`>1d`), `was_duplicate_prompt` (bool) | Are deletes mostly duplicates or mistakes? |
| 10 | `duplicate_prompt_shown` | `detected_on` (`save`/`pull`), `choice`: on save `skip`/`save_anyway`, on pull `delete_mine`/`keep_both`, or `dismissed` ([06 §5](06-syncing.md)) | Does duplicate detection help or annoy? |
| 11 | `receipt_scanned` | `success`, `fail_reason` (the `extraction_failed` reasons, [04 §1](04-api-schema.md)), `confidence_bucket`, `edited_after` (bool), `item_count_bucket`, `duration_ms` | Is receipt AI good enough to charge for? |
| 12 | `balance_viewed` | `surface` (`home`/`trace`), `member_count` | Do people check and trust their balances? |
| 13 | `settle_viewed` | `mode` (`simplified`; `direct` from R1b), `payment_count`, `payments_saved`, `has_split_upi` (a payment over ₹1 lakh shown as several links) | Does simplification feel valuable ("12 → 3")? |
| 14 | `upi_link_tapped` | `result` (`url`/`no_upi_id`/`not_inr`), `amount_bucket`, `part_count` | Do people use UPI to settle? |
| 15 | `settlement_recorded` | `method` (`upi`/`cash`/`bank`/`other`, the database values), `partial` (bool), `exact_prefill_kept` (bool: the paise-exact pre-fill wasn't changed), `source` (`upi_return`/`manual`; `web` from R1b), `amount_bucket` | UPI link conversion; partial payment frequency; do people keep the exact amount? |
| 16 | `reminder_sent` | `channel` (`whatsapp` in R1a; `push` from R1b), `days_since_trip_end_bucket` | Do reminders get people paid, or annoy? |
| 17 | `kitty_event` | `action` (`enabled`/`topped_up`/`low`/`depleted`), `member_count` | Is the kitty (our differentiator) used? |
| 18 | `trip_settled` | `days_to_settle`, `expense_count_bucket`, `member_count`, `had_kitty`, `via` (`close_trip`/`end_date_24h`), `had_rounding` (bool). Sent **by the server** when the trip becomes `settled` ([D-023](decisions/D-023-auto-settle-timing.md)), so it's counted once per trip | **North star.** Do trips reach the value moment? |
| 19 | `pro_event` | `action` (`paywall_viewed`/`purchased`/`verify_failed`), `feature` (`scan`/`analytics`/`export`/`recap_theme`/`vault`), `price_variant` | Pro attach rate and price test (R2). Itemised split by hand is free; the Pro sheet opens from **Scan bill · PRO** ([D-017](decisions/D-017-itemised-free-scan-pro.md), [screens/pro-sheet](screens/pro-sheet.md)) |
| 20 | `trip_closed` | `result` (`settled`/`not_zero`), `days_after_end_bucket` (or `no_end_date`), `member_count` | Do people use **Close trip**, and do they try it too early? |
| 21 | `reopen_requested` | `days_since_settled_bucket`, `outcome` (`reopened`/`none`, filled in later by the server) | Do trips lock too early, and do organisers answer? |
| 22 | `rounding_adjustment_applied` | `pair_count`, `max_paise_bucket` (`<25`/`25–49`/`50–99` of 1 major unit). Sent **by the server** when the dust rule writes rounding settlements ([D-021](decisions/D-021-rounding-adjustment.md)) | How often do paise leftovers block settling? It must never be ≥ 1 major unit |
| 23 | `kitty_handover` | `by` (`holder`/`organiser`), `day_of_trip_bucket` | How often does the cash change hands mid-trip ([D-022](decisions/D-022-kitty-views-and-handover.md))? |
| 24 | `duplicate_settlement_prompt` | `choice` (`remove_mine`/`keep_both`/`dismissed`), `recorded_by` (`payer_and_payee`/`other`) | Do payer and payee both record the same payment ([06 §5](06-syncing.md))? |

**Also tracked, but not as funnel events:**
- `sync_conflict` (`type`: e.g. `money_group_replaced`, `field_lww`, `edit_vs_delete`, `removed_member_balance`; `resolution`) — sent to PostHog *and* counted in Sentry breadcrumbs; answers "how often do real users hit conflicts?".
- `update_required_shown` (`reason`: `426` or `unknown_value`) — how many people run an app too old for the server ([D-026](decisions/D-026-write-path-and-compat.md)).
- `balance_dispute_reported` (`surface`) — triggers an alert (§9), because PRD G5 is zero incidents.
- `recap_shared` (`channel`, `hide_amounts`) — R3.

**Dropped from PRD §19 and why:** `split_mode_changed` (covered by `expense_added.split_mode`); `kitty_enabled/topped_up/depleted` (merged into `kitty_event`); `pro_paywall_viewed`/`pro_purchased` (merged into `pro_event`); `invite_link_opened` (renamed `invite_opened`, now covers codes too).

### 2.3 Web invite page events
The Worker sends a small server-side event to PostHog (no cookies, no IP stored). No person profile is created for web viewers.

| Release | Events |
|---|---|
| **R1a** (read-only page, [D-024](decisions/D-024-web-page-read-only-beta.md)) | `invite_opened` with `surface: web`, `web_member_picked`, `web_get_app_tapped`. Nothing else, because the page can't claim or pay |
| **R1b only** (limited web membership) | `web_pay_tapped` (after the Turnstile check, starts the web claim, [04 §3.3](04-api-schema.md)) and `settlement_recorded` with `source: web` (from `/web-settlement`; it stays **pending** until the payee confirms in the app) |

---

## 3. PII scrubbing rules

**Never send** to PostHog, Sentry or logs:
- **amounts** (exact paise or rupees),
- **names** (people, trips, merchants, places),
- **emails, phone numbers, UPI IDs**,
- expense descriptions, notes, receipt text,
- invite tokens, codes, presigned URLs, JWTs,
- raw user IDs or trip IDs.

**Use buckets and hashes instead:**

| Instead of | Send |
|---|---|
| amount | `amount_bucket`: `<100`, `100–499`, `500–1999`, `2000–9999`, `10000+` (in base-currency major units) |
| exact member count | `member_count` (a small integer is fine) |
| expense count | `expense_count_bucket`: `0`, `1–4`, `5–19`, `20–99`, `100+` |
| trip ID | `trip_id_hash` = SHA-256(trip_id + env salt), for grouping only |
| dates | day-level buckets (`days_since_…_bucket`) |

**How it's enforced**
- `track()` only accepts properties declared in the event's Zod schema. There is no free-form property bag.
- PostHog: autocapture **off**, session replay **off**, `$ip` capture off (project setting "Discard client IP data").
- Sentry: `sendDefaultPii: false`; a `beforeSend` / `beforeBreadcrumb` scrubber removes keys matching `name|email|phone|upi|vpa|amount|description|token|code|url` and strips query strings from URLs.
- A unit test sends every event type with sample data and asserts no forbidden keys or patterns (email, `@` handle, digits > 6 long) appear ([11](11-testing-strategy.md)).
- Settings has an **analytics opt-out** toggle; opted-out users send nothing to PostHog (Sentry crashes still go, scrubbed, for reliability — stated in the privacy notice).

**Push notifications and the lock screen**
- Push payloads carry only what the notification shows; never UPI IDs, phone numbers or emails ([04 §11](04-api-schema.md)).
- **Hide amounts on lock screen** (`profiles.hide_lockscreen_amounts`): when on, the **server** removes amounts and names from the push text itself, so they never reach the lock screen. Android uses private visibility and iOS hidden previews on top of that ([review S-05](14-pre-development-review.md#15-security-problems)).
- FCM send results are logged as counts and error codes only, never the message text.

**Web viewers**
- No cookies, no stored IP, no person profile. Web events use `trip_id_hash` only; the picked member is never sent.

---

## 4. North-star metric

| Candidate | Definition | For | Against |
|---|---|---|---|
| **A. Trips settled per week** (PRD §6.2) | Trips that reach `settled`, per ISO week. A trip settles when every derived payment is 0 (after the rounding adjustment) **and** either someone taps **Close trip** or 24 hours have passed since the end date ([D-023](decisions/D-023-auto-settle-timing.md)) | Captures acquisition, activation, group adoption and completion in one number; it's the real value moment | Lags: a trip can take 2–3 weeks to settle; small numbers in the beta are noisy |
| **B. Groups with 3+ expenses in week one** (brief) | Trips with ≥ 3 expenses logged within 7 days of creation | Fast feedback; measures habit at the critical point | Doesn't prove settlement, which is our value moment |

**Recommendation:** keep **A (trips settled per week)** as the north star, and track **B as the main activation metric**, next to the PRD's "trip activation rate" (≥ 3 members and ≥ 5 expenses within 48 h). This matches the proposal in [OQ-P1](01-overview.md#open-questions).

**Decided (OQ-P1, 2026-09-25):** A is the north star and B is the activation metric ([01](01-overview.md#open-questions)). The dashboard shows both side by side.

---

## 5. Dashboards (PostHog)

| Dashboard | Charts |
|---|---|
| **1. Main** | North star (trips settled / week) · activation (B + PRD activation) · **time-to-log p50/p90** from `expense_added.duration_ms` (target p50 ≤ 5 s) · weekly active trips · crash-free sessions (from Sentry) |
| **2. Organiser funnel** | `app_opened (first)` → `trip_created` → `member_added` (≥ 2) → `expense_added` (1st) → `invite_shared` → `trip_settled`. Also: **time from first open to first expense** (target ≤ 60 s, accept ≤ 90 s) |
| **3. Participant funnel** | R1a: `invite_opened (web)` → `web_member_picked` → `web_get_app_tapped` → `app_opened (source: invite_link)` → `member_claimed`. R1b web pay path: `web_member_picked` → `web_pay_tapped` → `settlement_recorded (source: web)`. Invite acceptance (target ≥ 55%) |
| **4. Settlement** | `settle_viewed` → `upi_link_tapped` → `settlement_recorded (upi)`; UPI conversion (target ≥ 45%); settlement rate within 14 days of trip end (target ≥ 80%); reminders per settled trip; `trip_closed` vs automatic settles; `rounding_adjustment_applied` per settled trip; `reopen_requested` rate |
| **5. Quality** | expenses edited/deleted per 100; duplicate prompt choices (`duplicate_prompt_shown`, `duplicate_settlement_prompt`); `sync_conflict` by type; `update_required_shown`; `balance_dispute_reported` per 1,000 trips (target < 2) |
| **6. Retention** | second-trip rate within 90 days (target ≥ 35%); k-factor (claimed members per organiser per trip, target ≥ 2.5) |
| **7. Pro (R2)** | paywall views by feature → purchases; attach rate on settled trips (target ≥ 8%); price variant comparison |

---

## 6. Logging (Edge Functions and Worker)

- **Structured JSON**, one line per event:
  ```json
  { "ts": "…", "level": "info", "fn": "sync-push", "req_id": "…", "user_hash": "…", "trip_hash": "…",
    "event": "op_applied", "op_type": "expense.create", "seq": "41", "duration_ms": 38 }
  ```
- **Levels:** `debug` (dev only), `info` (normal events), `warn` (rejections, retries, rate limits), `error` (unexpected; also sent to Sentry).
- **No PII**: same rules as §3. Log op *types*, reject codes, counts and durations, never payloads.
- **Request ID:** every Edge Function response has an `X-Request-Id`; the phone attaches it to Sentry errors, so a user report can be traced end to end.
- **What to always log:** op applied/rejected (type, reason code), `apply_ops` `stale` retries (count, and whether all 3 tries failed), `op_id_reused`, `426` answers (client version only), engine mismatch (phone vs server shares), rate limit hits, invite guess failures, `stubs-send` results (pushed vs not pushed counts), FCM send results and `push_mode` fallbacks ([D-009](decisions/D-009-notifications.md)), cron job start/finish (`fx-ingest`, the `notify-sender` SQL check and whether it called the function, `lifecycle`, `balance-audit`, `cleanup`, [04 §10.1](04-api-schema.md)), lifecycle results (trips moved to active, settled, archived; rounding adjustments written), balance audit results.
- **Retention:** Supabase's free log retention (short) is enough for debugging; anything we must keep (audit) is in `trip_ops`, not logs.

---

## 7. Sentry

| Topic | Rule |
|---|---|
| **Projects** | `toli-mobile`, `toli-functions`, `toli-web`; Sentry `environment` = `development` / `preview` / `production`, matching the three environments (local dev, `toli-preview`, `toli-prod`, [D-027](decisions/D-027-environments-and-backups.md)). The tester APK (EAS profile `beta`) runs on the production backend, so it reports as `production` ([D-016](decisions/D-016-testing-distribution.md)) |
| **Per-environment sending** | **Development:** off by default (errors go to the local console; a developer can switch it on for a session). **Preview:** errors sampled at 25%, traces off. **Production:** errors 100% |
| **Seat** | The free plan has 1 seat for 2 founders: share it through the team password manager; PostHog `$exception` is the second view ([08 §3.8](08-third-party-integrations.md)) |
| **What's captured** | native crashes, JS errors, unhandled promise rejections, Edge Function errors, Worker errors, **engine mismatch** (server result ≠ phone result, [06 §6](06-syncing.md)) as a warning event with op type only |
| **Release tagging** | `release` = `toli@<appVersion>+<buildNumber>`; `dist` = build number; EAS Update releases add the update ID tag, so an error maps to the exact JS bundle |
| **Source maps** | Uploaded for **every EAS Build and every EAS Update** (Sentry Expo plugin + `sentry-expo-upload-sourcemaps` after `eas update`), from CI, using the auth token in EAS/GitHub secrets ([12 §5](12-environments-and-deployment.md)). A build without uploaded source maps fails the release checklist |
| **Edge Functions** | Sentry Deno SDK; release = git SHA |
| **PII** | `sendDefaultPii: false`; scrubber per §3; no request bodies; user context = hashed ID only |
| **Sampling** | production errors 100%; performance traces 10% in production (raise during beta) |
| **Quota care** | The free 5K errors/month is **shared by all three projects and every environment**. So: filter known noise **before sending** (offline network errors, timeouts that will be retried, `429`, `stale` retries that later succeed, `426` are *expected*, not errors); rate-limit identical errors on the client; drop development events; sample preview. Check usage in the weekly usage sheet ([08 §5](08-third-party-integrations.md)) |

---

## 8. Performance monitoring

Budgets from PRD §17 / [02 §7](02-architecture.md):

| Metric | Budget | Measured by |
|---|---|---|
| **Time-to-log** (app open → expense saved) | p50 ≤ 5.0 s | `expense_added.duration_ms` (from app foreground or `+` tap, whichever is later, to save commit) |
| **First expense after install** | ≤ 60 s target, ≤ 90 s accepted | first `app_opened` → first `expense_added` |
| **Cold start to trip list** | ≤ 1.5 s p90 (mid-range Android) | `app_opened.cold_start_ms` + Sentry app-start span |
| **Local expense save** | ≤ 100 ms | Sentry span `expense.save` (sampled) |
| **Balance recompute (500 expenses)** | ≤ 50 ms | Sentry span `engine.recompute` (sampled) + CI benchmark ([11](11-testing-strategy.md)) |
| **Sync latency** | p50 ≤ 2 s from save to `applied` when online | Sentry span `sync.push` (op queued → applied) |
| **Pull latency** | p50 ≤ 3 s from another phone's save to this phone showing it (foreground) | `seq` broadcast → pulled, sampled |
| **Outbox age** | alert if a user's oldest op is > 24 h old while online | Sentry warning from the sync engine |
| **Crash-free sessions** | ≥ 99.5% | Sentry release health |

---

## 9. Alerting

| Alert | Source | Severity | Who / how |
|---|---|---|---|
| **Nightly balance audit failure** (any trip where the sums of **stored** payers, shares, settlements, contributions and hand-overs ≠ `trip_balances`, or Σ ≠ 0) | pg_cron job → Sentry event | **P0** | Founder, immediately (email + push via Sentry app). Blocks new releases until explained |
| `balance_dispute_reported` | PostHog action → webhook / daily digest | P0 until triaged | Founder |
| Engine mismatch rate > 0 in a release | Sentry | P1 | Engineering |
| Invite page (`/healthz`) or database health (`/rest/v1/rpc/health`) down, 2 checks, either cloud project | UptimeRobot | P1 | Founder |
| Nightly backup job failed, or the monthly restore drill failed | GitHub Actions failure email | **P1** | Founder |
| **Edge Function invocations** on track to pass 70% of the monthly allowance | daily invocation check ([08 §5](08-third-party-integrations.md)) | **P1** | Founder: apply the §3.1a fixes or move to Pro that week |
| Invocations above 90% of the allowance | daily invocation check | **P0** | Founder: upgrade production to Pro now |
| `lifecycle` job failed or didn't run | pg_cron job → Sentry | P1 | Engineering (trips won't auto-settle or get "trip starts/ends" pushes) |
| `apply_ops` returned `stale` 3 times in a row for one push | Sentry warning | P2 | Engineering (a very busy trip, or a bug) |
| `op_id_reused` seen | Sentry | P1 | Engineering (a phone bug reusing op IDs) |
| Crash-free sessions < 99.5% for a release | Sentry release health | P1 | Engineering; consider EAS Update rollback |
| New error type in production | Sentry issue alert | P2 | Engineering |
| `sync-push` rejection rate > 2% of ops (1 hour) | Sentry metric alert | P1 | Engineering |
| Sentry error quota > 70% | Sentry usage + weekly usage check | P2 | Engineering: filter the noisiest error first |
| Other free-tier usage > 70% | weekly usage check ([08 §5](08-third-party-integrations.md)) | P2 | Founder |
| FX ingest failed 2 days in a row | `fx-ingest` Edge Function → Sentry | P2 | Engineering |
| Global wrong-code alarm (500 wrong invite codes in an hour, [04 §3.2](04-api-schema.md)) | Edge Function → Sentry | P1 | Engineering |

**Why the audit can't raise false P0s:** it is **pure SQL** and only adds up what was stored. It never re-runs a newer `@toli/engine` over old revisions, so fixing a rounding bug later doesn't make old trips look wrong. Each revision keeps its `engine_version`; any engine replay is a separate, per-version batch job, not the nightly alert ([D-026](decisions/D-026-write-path-and-compat.md), [07 §7](07-calculation-engine.md)).

---

## 10. Privacy

- The privacy notice lists every analytics and error processor (PostHog, Sentry) and what they receive.
- Analytics opt-out is honoured on the phone (nothing is sent) and on the web page (no events if Do Not Track / Global Privacy Control).
- No advertising IDs are collected. No third-party ad or attribution SDKs.
- Event schemas are reviewed in PRs like database migrations: adding a property needs a reason and a PII check.
- Analytics data is never sold or shared (PRD §18).
