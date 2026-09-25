# 08 · Third-Party Integrations

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §14, §16, §18 · [Tech stack research](superpowers/specs/2026-09-24-toli-tech-stack.md) §5–§7 (free-tier numbers checked 24 Sep 2026) · [Pre-development review §16–§18](14-pre-development-review.md) · [D-001](decisions/D-001-tech-stack.md) · [D-007](decisions/D-007-auth.md) · [D-009](decisions/D-009-notifications.md) · [D-018](decisions/D-018-r1a-r1b-scope.md) · [D-024](decisions/D-024-web-page-read-only-beta.md) · [D-025](decisions/D-025-no-contacts-matching-v1.md) · [D-026](decisions/D-026-write-path-and-compat.md) · [D-027](decisions/D-027-environments-and-backups.md) |
| **Related** | [02 Architecture](02-architecture.md) · [04 API](04-api-schema.md) · [09 Security](09-security.md) · [10 Observability](10-observability.md) · [12 Environments](12-environments-and-deployment.md) |

Every outside service Toli depends on, what we use it for, and what happens when it breaks. **If a service isn't listed here, the app must not call it.**

---

## 1. Ground rules for every integration

1. **The phone never holds a secret key.** Only *publishable* keys (the Supabase **`sb_publishable_…`** key, PostHog project key, Sentry DSN, Firebase config) may ship in the app. Everything else, including the Supabase **`sb_secret_…`** key, lives in **Edge Function secrets** or **Worker secrets** ([12](12-environments-and-deployment.md)). We use the new Supabase API keys from day one; the legacy `anon` / `service_role` keys are deprecated by the end of 2026 ([D-027](decisions/D-027-environments-and-backups.md)).
2. **Free services with no uptime promise are always called through our own server or cache** (FX, places, maps). Switching provider must never need an app update.
3. **The money path never depends on a third party.** Adding, splitting, balances and settle-up work with every integration below switched off (except Supabase, and even then offline).
4. **Every response from a third party is validated with Zod** before we use it ([02 §6](02-architecture.md)).
5. **No PII is sent anywhere it doesn't need to go.** Analytics and crash tools get no names, amounts, emails or UPI IDs ([10 §3](10-observability.md)).
6. **One environment, one set of keys.** There are three environments: **Development** (local Supabase in Docker on each laptop), **Preview** and **Production** (the only two Supabase cloud projects, because the free plan allows 2) ([D-027](decisions/D-027-environments-and-backups.md), [12](12-environments-and-deployment.md)). Other services get a project or key per environment where they allow it.
7. **Every Edge Function call counts.** The free plan's invocation allowance is the first real limit (§4.1). Reads that RLS already protects go through PostgREST, not an Edge Function.

---

## 2. Inventory at a glance

| # | Service | What for | Release | Called from | Cost now |
|---|---|---|---|---|---|
| 1 | Supabase | DB, Auth, Edge Functions, Realtime, pg_cron, PostgREST (pulls, health) | R1a | phone, Worker | $0 |
| 2 | Cloudflare R2 | receipts, docs, backups, exports, cached OG images | R1a | phone (presigned), Edge Functions, CI | $0 |
| 3 | Cloudflare Workers | invite page (read-only in R1a) + recap pages, link files, serving OG cards (not drawing them), privacy/terms/delete-account pages | R1a | public web | $0 |
| 4 | Frankfurter v2 + fawazahmed0 | daily FX rates | R2 (table from R1) | Edge Function `fx-ingest` (pg_cron) only | $0 |
| 5 | Geoapify | place search | R2 | Edge Function `places-search` | $0 |
| 6 | OpenFreeMap + MapLibre | map tiles + map view | R2 | phone | $0 |
| 7 | PostHog | product analytics, feature flags | R1a | phone, Worker (server-side web events) | $0 |
| 8 | Sentry | crashes, errors, releases | R1a | phone, Edge Functions, Worker | $0 (1 seat) |
| 9 | Resend | email OTP codes, transactional mail | R1a | Supabase Auth (SMTP), Edge Functions (incl. `account-delete-request`) | $0 |
| 10 | Firebase FCM + APNs | push delivery | R1a | Edge Functions (`sync-push`, `notify-sender`) → phone | $0 (APNs needs Apple $99/yr) |
| 11 | react-native-notify-kit | Android channels and plain notifications (R1a); custom styles and action buttons (R1b) | R1a | phone (library) | $0 |
| 12 | Expo / EAS | builds, submit, OTA updates | R1a | CI, developers | $0 (EAS Update: first paid step, §4.2) |
| 13 | GitHub + Actions | code, CI, nightly backup, weekly heavy tests | R1a | — | $0 |
| 14 | UptimeRobot | uptime checks + keep-alive | R1a | — | $0 |
| 15 | LLM vision provider (TBD) | receipt extraction | R2, Pro | Edge Function `receipt-extract` | paid, ~₹0.05–0.15/receipt |
| 16 | Google Play Billing / App Store IAP | Pro pass purchase | R2 | phone + Edge Functions `pro-verify`, `pro-webhook` | 15% store fee |
| 17 | WhatsApp auth / MSG91 OTP | phone login | later | Supabase Send SMS hook | ~₹0.12–0.25 per code |
| 18 | Cloudflare Turnstile | bot check before a browser gets a web membership | R1b (web payments) | invite web page → Edge Function `/join` | $0 |

**Not used in v1:** contacts matching (no phone hashes, no `/contacts-match`, [D-025](decisions/D-025-no-contacts-matching-v1.md)); phone OTP; Branch or other deferred deep-link services; Pro subscriptions; an iOS Notification Content Extension.

---

## 3. Service details

### 3.1 Supabase

| Field | Detail |
|---|---|
| **Service** | Supabase (managed Postgres, Auth, Edge Functions, Realtime, pg_cron), region `ap-south-1` Mumbai |
| **Purpose** | Source of truth for all trip data; anonymous → Google/Apple/email auth; every trip write (`sync-push` → `apply_ops`); pulls of `trip_ops` through PostgREST; private Realtime "pull now" nudge; scheduled jobs (`fx-ingest`, `notify-sender` check, `lifecycle`, `balance-audit`, `cleanup`; [04 §10.1](04-api-schema.md)) |
| **Environment(s)** | **Two cloud projects** (the free plan allows 2 active projects): `toli-preview` (internal QA, seed data only) and `toli-prod` (real users, **including APK beta testers**). **Development runs on the local Supabase CLI in Docker** on each laptop; there is no dev cloud project ([D-027](decisions/D-027-environments-and-backups.md), [12](12-environments-and-deployment.md)) |
| **Authentication** | Phone: user JWT from Supabase Auth. Edge Functions → Postgres: the secret key. CI: Supabase access token for migrations; the backup job connects through the **Session pooler** (port 5432, §3.13) |
| **API keys** | **`sb_publishable_…`** key in the app and Worker config (safe: RLS protects data). **`sb_secret_…`** key only in Edge Function secrets. **DB password / access token** only in GitHub environment secrets. Separate keys per project, so a preview key never works on production |
| **Endpoints** | `https://<ref>.supabase.co/auth/v1`, `/rest/v1` (read-only for trip data; **the main pull path** `GET /rest/v1/trip_ops?…`; health `GET /rest/v1/rpc/health`), `/functions/v1/<name>`, `wss://<ref>.supabase.co/realtime/v1` (private channels) ([04](04-api-schema.md)) |
| **Rate limits** | Our own per-endpoint limits in `rate_limit_buckets`, checked **before** any other database work ([04 §1](04-api-schema.md)). Supabase Auth also has built-in limits: raise the anonymous sign-ins per IP above the default 30/hour, because Indian mobile carriers put many users behind one IP |
| **Caching** | The phone's SQLite is the cache. `trip_balances` caches balances server-side |
| **Retries** | Outbox retries with backoff 2 s → 5 min + jitter; ops are idempotent by `op_id` + `payload_hash` ([06 §3.2](06-syncing.md)). `apply_ops` answers `stale` if another write got in first; `sync-push` re-validates, up to 3 times |
| **Fallback** | None needed for reads/writes: the app runs offline and syncs later |
| **Failure behaviour** | Users see nothing or "Syncing…"; the outbox keeps everything. Joining, invite preview, signing in, UPI link building and sending stubs need the server and show a clear "try again" / "Needs internet" message |
| **Security** | RLS on every table + CI check; SELECT-only on trip tables for **app-claimed** members; private `trip_ops` rows hidden (`visible_to_member_id`); writes only through `sync-push` ([D-011](decisions/D-011-server-writes.md)); see [09](09-security.md) |
| **Cost** | $0 (Free plan) |
| **Free tier** | 500 MB database · 5 GB egress · 50k monthly active users · 200 concurrent Realtime connections · 500k Edge Function invocations/month · 1 GB storage · **2 active projects**. **Pauses after 7 idle days. No backups.** |
| **Upgrade trigger** | **Production moves to Pro ($25/month) at the public launch anyway** (daily backups, no pausing, 2M invocations) ([D-027](decisions/D-027-environments-and-backups.md)). Earlier if: DB > 400 MB, egress > 4 GB/month, Realtime peaks > 150 connections, or invocations > 400k/month. Preview stays on Free |

#### 3.1a Edge Function invocation budget

The review found the old estimate ("runs out at ~10k daily users") was about 10× too high. **Without the fixes below, 500k calls a month run out at roughly 500–1,000 daily active users** ([review §16](14-pre-development-review.md#16-third-party-integration-problems)):
- a 6-person trip with 40 expenses makes about 240 calls from pushes and nudged pulls;
- `notify-sender` called every minute is 43k calls a month on its own;
- a `/health` function pinged every 5 minutes is another 8.6k a month, **per project**.

**What we do instead** ([D-026](decisions/D-026-write-path-and-compat.md)):

| Fix | Saves |
|---|---|
| Phones **pull `trip_ops` directly through PostgREST** (RLS-protected). `/sync-pull` is only a fallback | one call per pull, the biggest share |
| `sync-push` **returns the catch-up ops** in its response | most separate pulls after a push |
| Pushes are **sent from `sync-push`** right after commit | a separate sender call per event |
| pg_cron checks `notification_outbox` **in SQL** and calls `notify-sender` only when rows are due | ~43k idle calls a month |
| Health is a **PostgREST RPC** (`/rest/v1/rpc/health`), not a function | ~8.6k calls a month per project |
| Public 🌐 functions check the rate limit first; the Worker rate-limits `invite-preview` before calling it | abuse can't drain the allowance |
| Realtime uses **private** channels that only the server can broadcast on | no fake "pull now" storms |

What is left is mostly `sync-push`, `trip-snapshot`, invites and files. **Measure the real calls per daily user in the beta** and set the upgrade date from that number (§5).

### 3.2 Cloudflare R2

| Field | Detail |
|---|---|
| **Service** | Cloudflare R2 object storage (S3-compatible) |
| **Purpose** | Receipt photos, vault documents (tickets, PDFs), avatars, trip covers, data exports, OG preview images rendered once and cached, nightly `pg_dump` backups |
| **Environment(s)** | One bucket set per environment: `toli-dev-files` (used by local development), `toli-preview-files`, `toli-prod-files`, plus `toli-prod-backups` (APK testers use production, [D-016](decisions/D-016-testing-distribution.md)). Backups are kept **30 days** (R2 lifecycle rule), matching the deletion promise in [09 §10](09-security.md) ([D-027](decisions/D-027-environments-and-backups.md)) |
| **Authentication** | S3 access key + secret, scoped **per bucket**. Phones never see them; they get 5-minute presigned URLs |
| **API keys** | Edge Function secrets (files bucket, read/write). GitHub Actions secrets (backups bucket, write-only token if possible) |
| **Endpoints** | `https://<account>.r2.cloudflarestorage.com/<bucket>/trips/{trip_id}/{attachment_id}.{ext}` — only via presigned PUT/GET ([04 §4](04-api-schema.md)) |
| **Rate limits** | Ours: `upload-url` 60/hour per user; 10 MB per file; 5 receipt photos per expense (`attachment_limit`); 1 GB vault per free trip (`413 quota_exceeded`; receipts never count) ([04 §1–§2](04-api-schema.md)) |
| **Caching** | The phone caches downloaded files in `file_cache`; vault documents are pinned and never evicted, so they stay available offline. Receipts are cached as thumbnails |
| **Retries** | `file_queue` retries uploads (Wi-Fi only by default; a photo the user asks to scan uploads immediately, OQ-P17); a new presigned URL is requested if the old one expired |
| **Fallback** | If R2 isn't enabled yet (it may ask for a card), Supabase Storage (1 GB) can hold receipts in dev only |
| **Failure behaviour** | Expense is saved; the photo shows a "retry" badge. Nothing on the money path waits for R2 |
| **Security** | Private buckets, no public access, 5-minute one-object URLs, EXIF stripped on the phone, size/type/sha256 checked on confirm, encrypted at rest ([09 §5](09-security.md)) |
| **Cost** | $0 |
| **Free tier** | 10 GB stored · 1M write (Class A) ops · 10M read (Class B) ops per month · **free egress** |
| **Upgrade trigger** | Stored data > 8 GB (mostly R3 vault) → pay-as-you-go $0.015/GB/month (no plan change needed) |

### 3.3 Cloudflare Workers

| Field | Detail |
|---|---|
| **Service** | Cloudflare Workers (Hono). No cron jobs |
| **Purpose** | Public invite page `/t/:token` and `/j/:code`, public recap `/r/:token` (R3), serving WhatsApp OG images `/og/t/:token.png` and `/og/r/:token.png`, `/privacy`, `/terms`, the Google Play account deletion page `/delete-account`, `/healthz`, `/.well-known/assetlinks.json` and `apple-app-site-association` ([04 §10](04-api-schema.md)) |
| **Invite page by release** | **R1a: read-only** ([D-024](decisions/D-024-web-page-read-only-beta.md)): trip name, dates and total, "Which one are you?", that member's own lines, then **Get the Toli app**. No claim, no UPI, no "I paid". **R1b:** web payments through a limited web membership, behind **Turnstile** (§3.18) |
| **OG images** | **Not drawn in the Worker**: drawing a PNG needs far more than the free 10 ms of CPU. Either a static branded template with the trip name overlaid as text, or an image rendered **once** by an Edge Function and cached in R2; the Worker only serves it ([04 §10](04-api-schema.md)) |
| **Environment(s)** | `toli-web-preview` on `*.workers.dev` (points at `toli-preview`); `toli-web-prod` on `toli.in` (domain TBD, [OQ-P5](01-overview.md#open-questions)), on `toli-web-prod.<account>.workers.dev` until the domain is bought. Local development runs the Worker with `wrangler dev`. **After the domain is bought, the `workers.dev` Worker stays up and 301-redirects `/t/*` and `/j/*`** to the new domain, so links already shared on WhatsApp keep working ([D-016](decisions/D-016-testing-distribution.md)) |
| **Authentication** | Public routes: none (the invite token/code is the key). Calls to Supabase: the `sb_publishable_` key to the public 🌐 Edge Functions only. **R1b only:** paying from the invite page happens in the browser: Turnstile, then supabase-js signs in anonymously, calls `/join` with `via: "web"`, then `/upi-link` and `/web-settlement` for its own debt ([04 §3.3](04-api-schema.md)) |
| **API keys** | Worker secrets (set with `wrangler secret put`), per environment |
| **Endpoints** | See [04 §10](04-api-schema.md) |
| **Rate limits** | Cloudflare free plan: 100k requests/day, **10 ms CPU per request**. The Worker rate-limits `invite-preview` **before** calling the function; the function also checks its own limits first (30/min per IP, 10 wrong codes per IP per hour, global alarm at 500 wrong codes per hour) |
| **Caching** | OG images cached at the edge for 10 minutes; invite HTML is `Cache-Control: private, no-store` and `noindex` (it shows one member's lines) |
| **Retries** | n/a |
| **Fallback** | If the Worker is down, the app still joins by code (it calls the Edge Function directly) |
| **Failure behaviour** | Link taps land on a Cloudflare error page; in-app join still works |
| **Security** | Holds no user data, no Supabase secret key and no Resend key; never computes money (CPU limit and correctness); trims responses to what the page needs |
| **Cost** | $0 |
| **Free tier** | 100k requests/day, 10 ms CPU/request |
| **Upgrade trigger** | > 70k requests/day sustained, or CPU-limit errors → Workers Paid **$5/month** |

> The FX fetch does **not** run in the Worker. pg_cron calls the `fx-ingest` Edge Function daily inside Supabase ([04 §10.1](04-api-schema.md)), so the Worker holds **no** Supabase service key.

### 3.4 Frankfurter v2 (primary) + fawazahmed0 currency-api (fallback)

| Field | Detail |
|---|---|
| **Service** | Frankfurter **v2** — `https://api.frankfurter.dev/v2` (open source, no key). Fallback: fawazahmed0 `exchange-api` served from the jsDelivr CDN |
| **Purpose** | One set of daily reference rates for all users, stored in `fx_rates` and synced to phones. The rate is **frozen on each expense** at creation (PRD F10, [07 §4](07-calculation-engine.md)) |
| **Which version and why** | **We use v2.** The older v1 only carried the ~30 ECB reference currencies, which misses common trip currencies such as VND and AED. v2 covers **~310 currencies, including INR, IDR, THB, VND and AED**, which meets the PRD's "150+ currencies" requirement from the primary source alone |
| **Why a fallback still exists** | Frankfurter is a free community service with **no uptime promise** and a single maintainer. If a day's fetch fails, or a currency is missing, we fill the gap from fawazahmed0 (different infrastructure, ~200 currencies). Each row records its `source`, so we always know where a rate came from |
| **Environment(s)** | Each cloud project (`toli-preview`, `toli-prod`) runs its own `fx-ingest` job and writes its own `fx_rates`. Local development uses a seeded rate table |
| **Authentication** | None (public APIs) |
| **API keys** | None |
| **Endpoints** | Called **only** by the `fx-ingest` Edge Function, which pg_cron + pg_net run daily at 02:30 IST; it needs a cron secret header and isn't callable by clients ([04 §10.1](04-api-schema.md)). **Phones never call FX providers** — they read `fx_rates` through PostgREST ([04 §6.2](04-api-schema.md)) |
| **Rate limits** | One request per day per provider per environment. Nothing to worry about |
| **Caching** | `fx_rates` in Postgres (history kept); `fx_cache` on the phone (last 30 days + dates of existing expenses) |
| **Retries** | In `fx-ingest`: 3 tries with backoff, then the fallback provider; if everything fails, the next day's run catches up |
| **Fallback** | 1) fawazahmed0 for missing currencies or a failed day; 2) the phone uses the newest cached table, labelled "Rates from 21 Sep"; 3) the user can always type a **manual rate** |
| **Failure behaviour** | No user-visible failure; rates just get a day older. Sanity check: if a rate moves > 20% day-on-day, keep yesterday's and alert (Sentry) |
| **Security** | Output validated with Zod (positive decimals, known ISO codes). Rates are public data |
| **Cost** | $0 |
| **Free tier** | Unlimited within fair use |
| **Upgrade trigger** | Frankfurter stops working for > 3 days in a row → make fawazahmed0 primary, or move to a paid provider (e.g. Open Exchange Rates). No app update needed |

### 3.5 Geoapify

| Field | Detail |
|---|---|
| **Service** | Geoapify Places / Autocomplete API |
| **Purpose** | Place search for trip destination (F1) and saved places (F12) |
| **Environment(s)** | One key per environment (dev/preview can share a separate low-limit key) |
| **Authentication** | API key as a query parameter, added by our proxy |
| **API keys** | Edge Function secret only. **Never in the app** (the proxy hides it and lets us switch provider) |
| **Endpoints** | Phone → `GET /places-search` Edge Function ([04 §6.1](04-api-schema.md)) → Geoapify autocomplete |
| **Rate limits** | Geoapify free: 3,000 credits/day. Ours: 60/min per user, plus a global daily budget (e.g. 2,500) |
| **Caching** | Results cached for 30 days per (normalised query, rounded lat/lng). The phone debounces 300 ms and needs ≥ 3 characters |
| **Retries** | One retry on 5xx; none on 4xx |
| **Fallback** | Over budget or down → `503 places_unavailable` → the phone offers **manual place entry** (name only, no coordinates) |
| **Failure behaviour** | "Search is unavailable. Type the place name." |
| **Security** | Only the query text and rough location leave our server; no user ID is sent |
| **Cost** | $0 |
| **Free tier** | 3,000 credits/day, commercial use allowed |
| **Upgrade trigger** | Daily budget hit on > 3 days in a week, **or** Indian place quality is too weak in the R2 test → paid Geoapify, or switch to Google Maps SDK + Places together (Google's terms don't allow Places on a non-Google map) |

### 3.6 OpenFreeMap + MapLibre

| Field | Detail |
|---|---|
| **Service** | MapLibre React Native (map rendering library) + OpenFreeMap vector tiles |
| **Purpose** | Trip map showing saved places and itinerary items (F12) |
| **Environment(s)** | Same tile source in all environments |
| **Authentication** | None |
| **API keys** | None |
| **Endpoints** | Style URL `https://tiles.openfreemap.org/styles/...` — read from **remote config** (PostHog flag / our config), not hard-coded, so we can switch tile host without an app update |
| **Rate limits** | No published limit; fair use |
| **Caching** | MapLibre's tile cache; optional offline region for the trip area (best-effort, PRD F12) |
| **Retries** | Built into MapLibre |
| **Fallback** | Map unavailable → the Plan tab shows the list view of places and items (all data is in SQLite) |
| **Failure behaviour** | Grey map area with "Map unavailable offline"; everything else works |
| **Security** | Tile requests reveal the viewed map area to the tile host; no user IDs are sent |
| **Cost** | $0 |
| **Free tier** | Free, no key, commercial use allowed, **no uptime promise** |
| **Upgrade trigger** | Repeated outages → self-host tiles on R2 (PMTiles) or use a paid tile provider |

### 3.7 PostHog

| Field | Detail |
|---|---|
| **Service** | PostHog Cloud (product analytics, feature flags, surveys) |
| **Purpose** | The funnel in PRD §6.2 / §19, `duration_ms` time-to-log, price test ₹99/149/199 via flags ([10](10-observability.md)) |
| **Environment(s)** | Separate projects: `toli-dev` (or disabled), `toli-preview`, `toli-prod`. The tester APK (profile `beta`) reports to `toli-prod` |
| **Authentication** | Project API key (publishable, write-only for events) |
| **API keys** | Project key in app config — **allowed** (it can only send events). Personal API key (for dashboards/exports) only in the team password manager |
| **Endpoints** | PostHog ingest host (US or EU cloud — choose one before the first tester APK; there is no India region). The chosen region is named in the privacy notice |
| **Rate limits** | Generous; we batch events |
| **Caching** | The SDK queues events offline and sends later; feature flags cached locally |
| **Retries** | SDK built-in |
| **Fallback** | None needed; analytics loss is acceptable |
| **Failure behaviour** | Invisible to the user. Never blocks the UI |
| **Security** | No PII in events or person properties; anonymous distinct ID = hashed user ID; session replay **off** (money screens) ([10 §3](10-observability.md)) |
| **Cost** | $0 |
| **Free tier** | 1M events/month, feature flags, surveys |
| **Upgrade trigger** | > 800k events/month → sample non-critical events first; then pay-as-you-go |

### 3.8 Sentry

| Field | Detail |
|---|---|
| **Service** | Sentry (errors, crashes, release health, performance) |
| **Purpose** | App crashes, JS errors, Edge Function and Worker errors, engine mismatch reports, P0 alerts ([10 §7, §9](10-observability.md)) |
| **Environment(s)** | One Sentry project per surface (`toli-mobile`, `toli-functions`, `toli-web`), with the Sentry *environment* tag `development` / `preview` / `production` |
| **Quota is shared** | The free **5K errors a month is one pool for every project and environment**. So development sends nothing by default (local only), preview is sampled, and known noise (offline network errors, `stale` retries, 429s) is filtered before sending ([10 §7](10-observability.md)) |
| **Seats** | The free plan has **1 seat**, and there are 2 founders. Share the one seat through the team password manager, and use PostHog error tracking (`$exception`) as the second view |
| **Authentication** | DSN (publishable) for sending; auth token for source-map upload |
| **API keys** | DSN in app/Function/Worker config — allowed. **Auth token** only in EAS secrets and GitHub Actions secrets |
| **Endpoints** | Sentry ingest via SDK |
| **Rate limits** | Plan quota; client-side sampling and rate-limiting of identical errors |
| **Caching** | SDK stores crash reports offline and sends on next launch |
| **Retries** | SDK built-in |
| **Fallback** | Over quota → errors dropped (PostHog can capture `$exception` as a backup, 100K free) |
| **Failure behaviour** | Invisible to the user |
| **Security** | `beforeSend` scrubber removes names, amounts, emails, UPI IDs, tokens, URLs with tokens; no request bodies; `sendDefaultPii: false` |
| **Cost** | $0 |
| **Free tier** | 5K errors/month (shared), 1 seat |
| **Upgrade trigger** | Quota hit twice in a month → tighten sampling and fix the noisy error first; then Team plan (~$26/month), which also adds seats |

### 3.9 Resend

| Field | Detail |
|---|---|
| **Service** | Resend (transactional email) |
| **Purpose** | Email login codes (Supabase Auth custom SMTP), data-export-ready emails, account deletion requests from the public `/delete-account` page ([04 §10](04-api-schema.md)). **Never marketing** |
| **Environment(s)** | One account; separate API keys per environment. Dev/preview send from a test sub-domain |
| **Authentication** | SMTP credentials / API key |
| **API keys** | Supabase Auth SMTP settings (per project) and Edge Function secrets |
| **Endpoints** | `smtp.resend.com` (from Supabase Auth); `api.resend.com` (from Edge Functions) |
| **Rate limits** | Free: **100 emails/day**, 3,000/month |
| **Caching** | — |
| **Retries** | Supabase Auth retries; Edge Functions retry once |
| **Fallback** | Over the daily limit → the login sheet suggests Google/Apple; anonymous use continues unaffected |
| **Failure behaviour** | "We couldn't send the code. Try Google instead, or try again later." |
| **Security** | Domain verified with SPF + DKIM + DMARC **before any email is sent**; codes expire in 10 minutes |
| **Cost** | $0 |
| **Free tier** | 3,000/month, 100/day, 1 domain |
| **Upgrade trigger** | > 70 emails/day on 3 days in a week → Resend Pro $20/month or Amazon SES (~$0.10 per 1,000) |

### 3.10 Firebase Cloud Messaging (FCM) + APNs

| Field | Detail |
|---|---|
| **Service** | Firebase Cloud Messaging (Spark free plan, used **only** for FCM). On iOS, FCM hands off to Apple Push Notification service |
| **Purpose** | Deliver push messages: added to a trip, stubs, payments, expense changes, reopen requests, trip started/ended, kitty alerts; reminders and digests from R1b; budget alerts from R2 ([04 §11](04-api-schema.md), [D-009](decisions/D-009-notifications.md)) |
| **What R1a sends** | **Plain system notifications**: title, text, Toli icon and accent colour; a tap opens the right screen. The exact stub design is shown only as the in-app banner. Custom Android styles and action buttons come in R1b ([D-018](decisions/D-018-r1a-r1b-scope.md)). When a user turns on **Hide amounts on lock screen**, the server leaves amounts and names out of the push text |
| **Environment(s)** | **Separate Firebase projects** (Firebase projects are free and not limited like Supabase): `toli-dev`, `toli-preview`, `toli-prod` (each has its own `google-services.json` / `GoogleService-Info.plist`). APNs: sandbox for dev, production for TestFlight/App Store |
| **Authentication** | FCM HTTP v1 with a Google service account: the Edge Function signs a JWT and swaps it for an OAuth 2 token. **Build this as a spike in week 1** (Deno). APNs `.p8` key uploaded to Firebase |
| **API keys** | Service account JSON **only** in Edge Function secrets. The Firebase client config in the app is publishable |
| **Endpoints** | `POST https://fcm.googleapis.com/v1/projects/<id>/messages:send`, called from **`sync-push` right after commit** for normal events, and from `notify-sender` only for retries and digests (pg_cron calls it only when `notification_outbox` has rows due) |
| **Rate limits** | FCM: very high; we send far below it. Our own rules: digest > 5 events / 30 min; 1 reminder per recipient per trip per 48 h |
| **Caching** | Access token cached ~55 minutes in the function |
| **Retries** | `notification_outbox.attempts` with backoff on 5xx/429 (max 5); `UNREGISTERED` → set `devices.invalidated_at`, no retry |
| **Fallback** | Phones from makers that kill background apps (Xiaomi, Oppo, Vivo, Realme, OnePlus), or with 2 missed delivery receipts, get system notification payloads instead of data-only ones (`devices.push_mode = notification`). In-app: the next sync shows the change anyway (there is no notification inbox; the Trip feed is the history). For stubs and reminders, the API always returns WhatsApp share text too |
| **Failure behaviour** | User misses a push; the data is still correct on next open |
| **Security** | Payload is minimal and validated by Zod on the phone ([04 §11](04-api-schema.md)); no UPI ID in payloads; avatar and image URLs are short-lived signed links; action buttons only open the app, never record money ([09 §7](09-security.md)) |
| **Cost** | $0 (APNs needs the Apple Developer Program, $99/year, only when iOS starts) |
| **Free tier** | FCM free with no message cap |
| **Upgrade trigger** | None expected |

### 3.11 react-native-notify-kit

| Field | Detail |
|---|---|
| **Service** | Open-source library (Apache-2.0), maintained fork of Notifee (archived April 2026) |
| **Purpose** | **R1a:** Android channels (Payments, Expenses, Reminders, Trip updates) and plain notifications. **R1b:** Toli-styled notifications: colour, avatar, big picture, action buttons, progress bars, grouped digests |
| **Environment(s)** | Same in all builds; needs an **EAS development build** (not Expo Go) and the New Architecture |
| **Authentication / API keys** | None |
| **Endpoints** | None (on-device) |
| **Rate limits / Caching / Retries** | n/a |
| **Fallback** | All calls sit behind one wrapper file `notify.ts`. If the fork is abandoned, swap to `expo-notifications` without touching the rest of the app |
| **Failure behaviour** | If rendering fails, show a plain system notification with the same text |
| **Security** | Pin the version; review changelogs before upgrading (small maintainer team) |
| **Cost / Free tier** | $0 |
| **Upgrade trigger** | No release in 6 months, or a breaking Android/iOS change unfixed for 30 days → switch to `expo-notifications` |

### 3.12 Expo / EAS

| Field | Detail |
|---|---|
| **Service** | Expo SDK, EAS Build, EAS Submit, EAS Update |
| **Purpose** | Build Android/iOS binaries (including the testing APK), submit to stores, ship JS-only fixes over the air |
| **Environment(s)** | Build profiles `development` (local Supabase), `preview` (internal QA, seed data), `beta` (the tester APK, on the **production** backend, [D-016](decisions/D-016-testing-distribution.md)), `production`; Update channels `development`, `preview`, `beta`, `production` ([12](12-environments-and-deployment.md)) |
| **Config safety** | `eas update` reads `EXPO_PUBLIC_*` values and the app config **from the machine that runs it**. So CI always sets the environment explicitly on `eas update`, and **checks the bundle's Supabase URL and the fingerprint** before publishing. A wrong value would either never reach phones or ship preview URLs to production ([12 §5.3](12-environments-and-deployment.md)) |
| **Authentication** | Expo account + `EXPO_TOKEN` for CI |
| **API keys** | `EXPO_TOKEN` in GitHub secrets. EAS secrets hold the Sentry auth token and per-profile env values. Play service account JSON and Apple API key for Submit live in EAS credentials |
| **Endpoints** | EAS services via CLI |
| **Rate limits** | Free plan build queue (can be slow at peak) |
| **Caching** | EAS build cache |
| **Retries** | Re-run the build |
| **Fallback** | `eas build --local` in WSL2 for unlimited Android builds |
| **Failure behaviour** | Release delayed; users unaffected |
| **Security** | App signing keys managed by EAS credentials; the tester APK signing key's SHA-256 is listed in `assetlinks.json` ([D-016](decisions/D-016-testing-distribution.md)) |
| **Cost** | $0 |
| **Free tier** | 15 Android + 15 iOS cloud builds/month; **EAS Update: 1,000 monthly active users, and updates stop above that (no overage)** |
| **Upgrade trigger** | **This is likely the first paid step** (~1,000 users). At > 800 MAU receiving updates → Starter **$19/month**, or ship fixes through store releases only |

### 3.13 GitHub + GitHub Actions

| Field | Detail |
|---|---|
| **Service** | Private GitHub repo + Actions (Linux runners) |
| **Purpose** | Code, PR checks, migrations deploy, Edge Function deploy, Worker deploy, the nightly backup, the monthly restore drill, and weekly heavy test runs ([12 §4, §6](12-environments-and-deployment.md)) |
| **Environment(s)** | GitHub *Environments* `preview` and `production`, with production needing a manual approval |
| **Authentication** | Repo access; environment-scoped secrets |
| **API keys** | Supabase access token + **Session pooler** connection string, R2 backup token, Cloudflare API token, EXPO_TOKEN, Sentry auth token — **all as GitHub environment secrets** |
| **Backups: how they connect** | Supabase's direct database address is **IPv6-only**, and GitHub-hosted runners don't support IPv6. So `pg_dump` connects through the **Session pooler (port 5432)**, using a `postgresql-client` whose **major version matches the server** ([D-027](decisions/D-027-environments-and-backups.md)) |
| **Endpoints** | — |
| **Rate limits** | 2,000 free minutes/month (macOS counts 10×, so **never use macOS runners** on the free plan) |
| **Minute budget** | PR checks stay light (1,000 property cases, 200 sync runs). **Heavy suites run weekly**, not nightly: 100k-case property runs, the 20k-run sync simulation and Maestro on the emulator. Nightly keeps only the backup and light jobs. This keeps the total under 2,000 minutes ([11 §12](11-testing-strategy.md)) |
| **Caching** | pnpm store + Turborepo cache |
| **Retries** | Manual re-run; nightly backup job alerts on failure |
| **Fallback** | Run migrations/backup by hand from a developer machine (documented in [12](12-environments-and-deployment.md)) |
| **Failure behaviour** | A failed nightly backup or restore drill is a **P1 alert** |
| **Security** | Branch protection on `main`; secret scanning on; Dependabot on; no secrets in logs |
| **Cost** | $0 |
| **Free tier** | 2,000 minutes/month for private repos |
| **Upgrade trigger** | > 1,600 minutes/month → cache harder, move more to the weekly run; then GitHub Team ($4/user/month, 3,000 minutes) |

### 3.14 UptimeRobot

| Field | Detail |
|---|---|
| **Service** | UptimeRobot (free) |
| **Purpose** | Uptime alerts for the invite page and the database; **keep-alive ping** so the two free Supabase projects don't pause after 7 idle days |
| **Environment(s)** | Monitors for **both** cloud projects (`toli-preview`, `toli-prod`) and both Workers. Local development needs none |
| **Authentication** | Account login only |
| **API keys** | The `sb_publishable_` key of each project goes in the monitor's request header (publishable, safe) |
| **Endpoints** | 🌐 `GET /rest/v1/rpc/health`: a tiny SQL function (`select true`) called through **PostgREST**, so it keeps the project awake and **costs no Edge Function call** ([04 §8a](04-api-schema.md)). Plus the Worker's static `GET /healthz` ([04 §10](04-api-schema.md)) |
| **Rate limits** | 5-minute check interval on free plan |
| **Caching / Retries** | n/a |
| **Fallback** | A GitHub Actions scheduled job can also ping daily |
| **Failure behaviour** | Email/Telegram alert to the founder |
| **Security** | Health endpoints return no data |
| **Cost / Free tier** | $0 · 50 monitors, 5-minute interval |
| **Upgrade trigger** | Need 1-minute checks or SMS alerts → paid plan (~$7/month) |

### 3.15 LLM vision provider (receipt extraction) — **R2, Pro, paid, provider TBD**

| Field | Detail |
|---|---|
| **Service** | To be chosen: Gemini Flash-Lite (**paid tier**) or Mistral Small. Free tiers are ruled out for production because they may use data for training (PRD §18) |
| **Purpose** | Turn a receipt photo into a structured, editable draft that fills the (free) itemised list: merchant, date, currency, items, tax/service/tip, total (PRD F4, [D-017](decisions/D-017-itemised-free-scan-pro.md)) |
| **Environment(s)** | Dev/preview may use Cloudflare Workers AI or Groq free tiers **with test receipts only** (never real user photos). Production: the paid provider under a zero-retention agreement |
| **Authentication** | Provider API key |
| **API keys** | Edge Function secret only. **Never in the app** |
| **Endpoints** | Phone → `POST /receipt-extract` ([04 §7](04-api-schema.md)) → Edge Function fetches the image from R2 and calls the provider |
| **Rate limits** | Ours: 30 scans per trip per day (failed scans don't count); Pro trips only (a free trip gets the Pro sheet) |
| **Caching** | Result cached per attachment `sha256` (re-scanning the same photo costs nothing) |
| **Retries** | One retry on timeout/5xx; 20 s total budget |
| **Fallback** | Return `422 extraction_failed` with a `reason` (`unreadable`, `not_a_receipt`, `provider_unavailable`, `timeout`; [04 §1](04-api-schema.md)); the photo is **always kept**; the user types the items or amount. Never charge or count a failed scan. A total that doesn't add up is **not** a failure: the draft comes back with `total_mismatch_minor` for the user to fix |
| **Failure behaviour** | "We couldn't read this bill. Type the amount instead." |
| **Security** | Zero-retention and no-training terms **verified contractually before F4 ships**; image stripped of EXIF; output validated by Zod; totals re-checked by the engine ([07 §5.1](07-calculation-engine.md)) |
| **Cost** | ~₹0.05–0.15 per receipt, paid from Pro revenue (₹149 pass) |
| **Free tier** | Not used in production |
| **Upgrade trigger** | Accuracy below target on the 200-receipt benchmark → try the next model tier ([11 §10](11-testing-strategy.md)) |

### 3.16 Google Play Billing / App Store In-App Purchase — **R2**

| Field | Detail |
|---|---|
| **Service** | Google Play Billing Library; Apple StoreKit |
| **Purpose** | Buy the per-trip **Pro pass** (₹149, to be tested) and later Pro Annual ([features/pro-pass](features/pro-pass.md)) |
| **Environment(s)** | Play: license testers + closed-testing track. Apple: sandbox testers. Production only from store builds |
| **Authentication** | Server-side verification: Google Play Developer API (service account); App Store Server API (API key) |
| **API keys** | Service account JSON and App Store `.p8` key **only in Edge Function secrets** |
| **Endpoints** | Phone → store purchase → `POST /pro-verify` ([04 §7](04-api-schema.md)) → store API → `pro_passes` (Pro Annual: `pro_subscriptions`). Refunds and revocations: Google RTDN / App Store Server Notifications → 🌐 `POST /pro-webhook` ([04 §8a](04-api-schema.md)), verified by each store's signature |
| **Rate limits** | Store API quotas (high) |
| **Caching** | `trips.is_pro` cached from `pro_passes`; the server writes `trip.pro_activated` / `trip.pro_revoked` ops so every phone updates |
| **Retries** | The phone keeps an unverified purchase and retries `pro-verify` until it succeeds (idempotent per `store_txn_id`) |
| **Fallback** | Verification down → the purchase is kept and applied when verification succeeds; never charge twice |
| **Failure behaviour** | "Payment received. Unlocking Pro… this can take a minute." |
| **Security** | Never trust the phone's claim; always verify with the store; refunds set `pro_passes.refunded_at` through `/pro-webhook` |
| **Cost** | Store fee: 15% (small-business rates on both stores) |
| **Free tier** | n/a |
| **Upgrade trigger** | n/a |

### 3.17 WhatsApp authentication messages / MSG91 OTP — **later**

| Field | Detail |
|---|---|
| **Service** | WhatsApp Business Platform authentication templates (primary), MSG91 SMS (fallback) |
| **Purpose** | Phone-number login, if and when we add it ([D-007](decisions/D-007-auth.md)) |
| **Environment(s)** | Production only; dev/preview use Supabase test OTP numbers |
| **Authentication** | Provider tokens |
| **API keys** | Edge Function secrets (the Send SMS hook function) |
| **Endpoints** | Supabase Auth **Send SMS hook** → our Edge Function → WhatsApp Cloud API or MSG91 |
| **Rate limits** | Supabase Auth OTP limits + ours: 5 codes per phone per hour, 20 per IP per hour |
| **Caching** | — |
| **Retries** | WhatsApp fails → MSG91 SMS once |
| **Fallback** | Google / Apple / email login |
| **Failure behaviour** | "Couldn't send the code. Try another way to sign in." |
| **Security** | OTP abuse ("SMS pumping") is the main risk: strict per-number and per-IP limits, country allow-list (India only at first), daily spend cap |
| **Cost** | WhatsApp ~₹0.12 per code (no DLT); MSG91 ₹0.16–0.25 per SMS + ~₹5,900 DLT registration |
| **Free tier** | None — costs from the first message |
| **Upgrade trigger** | Only add when user research shows Google/email login blocks adoption |

### 3.18 Cloudflare Turnstile — **R1b (web payments)**

| Field | Detail |
|---|---|
| **Service** | Cloudflare Turnstile (free CAPTCHA alternative) |
| **Purpose** | Stops scripts from claiming ghosts in a browser. Runs **before** the invite page signs a browser in and calls `/join` with `via: "web"` ([D-024](decisions/D-024-web-page-read-only-beta.md), [04 §3.3](04-api-schema.md)). **Not needed in R1a**, because the page is read-only |
| **Environment(s)** | One site key per Worker (preview, production); Cloudflare's test keys in local development |
| **Authentication** | Site key (public, on the page); secret key checks the token on the server |
| **API keys** | Site key in Worker config. Secret key in Edge Function secrets (and in Supabase Auth's CAPTCHA setting if we turn that on) |
| **Endpoints** | Browser widget → token → the Edge Function verifies it with `challenges.cloudflare.com/turnstile/v0/siteverify` |
| **Rate limits** | Plus ours: 5 web claims per trip per hour; the organiser is notified of each and can Release |
| **Caching / Retries** | n/a; the user can retry the check |
| **Fallback** | If Turnstile is down, web claims are refused with "Open the Toli app to pay". Reading the page still works |
| **Failure behaviour** | "We couldn't check you're a person. Try again, or use the app." |
| **Security** | Meant for the web page only, **not** the app's silent anonymous sign-in. Careful: Supabase Auth's CAPTCHA setting applies to **every** sign-in, including the app's first open, so it can't simply be switched on. How the web check is wired (our own function check, or the Auth setting plus an app-side token) is decided when R1b is built |
| **Cost / Free tier** | $0 |
| **Upgrade trigger** | None expected |

---

## 4. Cost and limits table

| Service | Current limit (free) | Expected usage (R1a beta: 3–5 groups, then ~20–50 trips, ~200 users) | Breaking point | Cost after | Upgrade requirement | Fallback |
|---|---|---|---|---|---|---|
| Supabase projects | **2 active** | 2 (`toli-preview`, `toli-prod`); dev is local | a third cloud project | Pro per project | never needed for dev ([D-027](decisions/D-027-environments-and-backups.md)) | local Supabase in Docker |
| Supabase DB | 500 MB | < 50 MB | each expense is stored about 3 times (≈5 KB), so ~100k expenses ≈ 500 MB | $25/month (Pro) | Pro at public launch, or at 400 MB | compact `trip_ops.result`; trim payloads after apply |
| Supabase egress | 5 GB/month | < 0.5 GB | snapshot-heavy growth | incl. in Pro (250 GB) | same as above | gzip snapshots, paged pull |
| Supabase Realtime | 200 concurrent | < 30 | ~200 open trip screens at once (around 1,000 users) | incl. in Pro (500) | Pro | connect only on trip screens; Realtime is only a hint |
| Edge Functions | 500k calls/month | measure in the beta | **~500–1,000 daily actives without the §3.1a fixes**; much later with them | incl. in Pro (2M) | Pro | pulls via PostgREST; catch-up in `sync-push`; SQL cron check; health via RPC |
| Supabase pause | 7 idle days | — | a quiet week | — | — | UptimeRobot 5-min ping on `/rest/v1/rpc/health`, both projects |
| Supabase backups | none | — | any data loss | Pro includes daily backups | — | **nightly `pg_dump` via the Session pooler to R2, kept 30 days; monthly restore drill** (mandatory) |
| R2 | 10 GB, free egress | < 1 GB | R3 vault growth | $0.015/GB/month | none (pay as you go) | Pro-only extra vault space (PRD §15: 1 GB/trip free) |
| Workers | 100k req/day, 10 ms CPU | < 2k/day | viral invite spike | $5/month | Workers Paid | OG images are never drawn in the Worker; cache them |
| Frankfurter v2 | fair use | 1 call/day/env | service shutdown | $0 | — | fawazahmed0, cached table, manual rate |
| Geoapify | 3,000 credits/day | < 300/day | ~1k daily planners | paid plan | only if R2 test passes | manual place entry |
| OpenFreeMap | fair use | low | outage/abuse policy | self-host PMTiles on R2 | — | list view |
| PostHog | 1M events/month; free flag requests | ~50k | ~20k MAU (events); ~6k daily users (flag requests) | pay as you go | sample first | drop non-core events; cache flags |
| Sentry | 5K errors/month **shared by all projects and environments**, 1 seat | < 500 | ~1,000 users with noisy errors | ~$26/month | fix noise first | PostHog `$exception` |
| Resend | 100/day, 3,000/month | < 20/day | email becomes main login | $20/month or SES | — | Google / Apple login |
| FCM | unlimited | — | — | $0 | — | in-app sync |
| EAS Build | 15 + 15 builds/month | ~8 | frequent releases | $19/month | — | `eas build --local` |
| EAS Update | 1,000 MAU, **no overage** | ~200 | ~1,000 users | $19/month | Starter | store releases only |
| GitHub Actions | 2,000 min/month | ~800 | heavy suites every night or on every PR | $4/user/month | — | heavy suites weekly |
| UptimeRobot | 50 monitors, 5 min | 4 (2 DB health + 2 Worker) | — | ~$7/month | — | GitHub cron ping |
| Turnstile (R1b) | free | web claims only | — | $0 | — | refuse web claims; app still works |
| Receipt AI | — | Pro only | — | ~₹0.05–0.15/scan | provider contract | manual entry |
| Store billing | — | — | — | 15% of Pro revenue | — | — |
| Phone OTP | none | not used | — | ~₹0.12/code | only if needed | Google / email |
| **Fixed** | — | — | — | Play $25 once · Apple $99/yr (iOS beta) · domain ~₹800–1,200/yr | — | — |

**Rough cost at real scale** (tens of thousands of monthly users): **~$50–100/month**, mainly Supabase Pro, Expo Starter and OTP messages ([tech stack §6](superpowers/specs/2026-09-24-toli-tech-stack.md)).

### 4.1 What breaks first, by size ([review §18](14-pre-development-review.md#18-scalability-concerns))

| Users | What breaks first | What we do |
|---|---|---|
| 10–100 (beta) | Nothing. Watch Supabase pausing | keep-alive on both projects |
| ~1,000 | **EAS Update 1,000-user cap**; Realtime peaks (200); Sentry's 5K errors | EAS Starter $19/month or store-only updates; Realtime only on trip screens; filter Sentry noise |
| ~500–1,000 **daily** | Edge Function invocations (if the §3.1a fixes slip); database growth | Supabase Pro $25/month |
| 10,000 | Database size and egress on Pro; PostHog flag requests | trim `trip_ops.payload` after apply; cache flags |
| 100,000 | Edge Function invocations; R2 over 10 GB | Pro limits cover functions; R2 is cheap |

### 4.2 Upgrade order

1. **EAS Update Starter ($19/month)** at about 800 monthly users receiving updates. This is likely the **first paid step**. The alternative is shipping fixes only through store releases.
2. **Supabase Pro ($25/month) for production at the public launch**, whatever the numbers say (backups, no pausing, 2M invocations). Earlier if the database passes 400 MB or invocations pass 400k a month. Preview stays on Free ([D-027](decisions/D-027-environments-and-backups.md)).
3. **Sentry Team (~$26/month)** only after the noise is fixed and the quota is still hit twice in a month.
4. **Workers Paid ($5/month)** if requests stay above 70k a day.
5. **Resend Pro or SES** only if email becomes the main login.
6. Paid LLM and store fees are paid from Pro revenue (R2). Phone OTP only if research shows it's needed.

---

## 5. How we watch the limits

- A **daily** check of Supabase **Edge Function invocations** for `toli-prod` (the limit most likely to surprise us), with an alert at **70% of the monthly allowance pro-rated to the day of the month** ([10 §9](10-observability.md)).
- A weekly **usage check** (manual at first, a GitHub Action later) records Supabase DB size, egress, Realtime peak, Edge Function calls, R2 size, EAS Update MAU, PostHog and Sentry usage into a simple sheet.
- Any service above **70%** of its free limit → create an issue with the upgrade decision.
- Any service above **90%** → upgrade or apply the fallback that week.
