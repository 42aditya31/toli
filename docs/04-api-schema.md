# 04 · API Schema

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Related** | [03 Database](03-database-schema.md) · [06 Syncing](06-syncing.md) · [09 Security](09-security.md) |

Every boundary between the phone, the web and the server is listed here. **If an endpoint isn't in this document, it doesn't exist.**

---

## 1. Shape of the API

| Surface | Used for | Base |
|---|---|---|
| **Supabase Auth** | sign-in (anonymous, Google, Apple, email OTP), linking identities, refreshing tokens | `https://<project>.supabase.co/auth/v1` |
| **PostgREST (read-only for trip data)** | reading your own profile, devices and preferences; writing only the tables RLS allows (profile, devices, preferences) | `/rest/v1` |
| **Edge Functions** | **every trip write**, sync, invites, files, UPI links, reminders, places, receipts, Pro, account | `/functions/v1/<name>` |
| **Cloudflare Worker** | public invite page, recap page, deep-link files, OG images | `https://toli.in` (testing: `*.workers.dev`) |

### Common rules for every Edge Function
- **Auth:** `Authorization: Bearer <Supabase JWT>`, except the public endpoints marked 🌐. Anonymous users have a valid JWT too.
- **Content:** JSON in and out, UTF-8. Money is sent as **strings of integer minor units** (`"120000"`), because JSON numbers can't safely hold 64-bit integers. It's parsed into `bigint` on both sides.
- **Validation:** every request and response has a **Zod schema** in `packages/schema/api/*`. The same schema is used on the phone and on the server.
- **Idempotency:** every write takes an `Idempotency-Key` header, or carries `op_id` values. A repeat returns the first answer.
- **Versioning:** a `Toli-Client: <app_version>/<runtime_version>` header is required. The server can answer `426 upgrade_required`.
- **Errors** always look like this:
  ```json
  { "error": { "code": "split_mismatch", "message": "Shares don't add up to the total", "details": { ... } } }
  ```

| HTTP | Codes |
|---|---|
| 400 | `invalid_request`, `split_mismatch`, `currency_unsupported` |
| 401 | `unauthenticated` |
| 403 | `not_a_member`, `not_organiser`, `pro_required` |
| 404 | `not_found`, `invite_invalid` |
| 409 | `conflict`, `already_claimed`, `trip_settled`, `balance_not_zero` |
| 413 | `quota_exceeded` (free trip vault over 1 GB; receipts never count) |
| 422 | `extraction_failed` with `reason`: `unreadable`, `not_a_receipt`, `provider_unavailable`, `timeout`. (A total that doesn't add up is **not** a failure: the draft comes back with `total_mismatch_minor` so the user fixes it, [07 §5.1](07-calculation-engine.md).) (the photo is always kept; the scan isn't counted against the daily limit) |
| 410 | `invite_expired` |
| 426 | `upgrade_required` |
| 429 | `rate_limited` (with `Retry-After`) |
| 500 | `internal` |

- **Rate limits** are per user, per device (`device_id` in the request) and per IP, counted in Postgres (`rate_limit_buckets`, [03 §9](03-database-schema.md)). Each endpoint's limit is listed below.

---

## 2. Sync

### 2.1 `POST /sync-push`
Sends queued ops for **one trip**.

| | |
|---|---|
| Auth | **app-claimed** trip member (or any user, for `trip.create` with a new ID). Web-claimed sessions can't push |
| Limit | 60 requests/min per device, ≤ 50 ops per request |
| Idempotent | yes, per `op_id` + `payload_hash` |
| Offline | the phone keeps ops in its outbox and retries with backoff ([06 §3.2](06-syncing.md)) |
| Writes | through the `apply_ops` Postgres function with an expected `last_seq` ([D-026](decisions/D-026-write-path-and-compat.md), [06 §6](06-syncing.md)) |

```ts
Request  { trip_id: uuid, device_id: uuid, cursor: string /* last seq this phone has */, ops: Op[] }
         // Op = { op_id, type, entity_id, payload, client_ts, v }
Response { results: Array<
             | { op_id, status: "applied" | "duplicate", seq: string, result: EntityRows, result_v: number }
             | { op_id, status: "rejected", reason: RejectCode, detail?: object, blocked_ops?: uuid[] }>,
           catch_up: Op[] /* every op after `cursor`, up to 500 */, has_more: bool, last_seq: string }
```
Reject codes: `not_a_member`, `not_organiser`, `not_allowed` (the permission matrix), `invalid_payload`, `split_mismatch` (the phone's shares don't add up), `base_revision_missing`, `entity_deleted`, `trip_settled`, `balance_not_zero`, `removed_member_balance` ([D-030](decisions/D-030-removed-members-locked.md)), `amount_too_small` (converts to less than 1 minor unit), `member_limit` (more than 50 members, PRD F2), `attachment_limit` (more than 5 receipt photos per expense, PRD F3), `op_id_reused` (same op_id, different payload), `upgrade_required`.

`blocked_ops` lists later ops from the same phone that depend on a rejected one. The phone groups them into one Unresolved item.

**Fixed limits** (in `packages/config`, used by both the phone and the server): 50 members per trip, 5 receipt photos per expense, 10 MB per file, 1 GB vault per free trip, 120-character descriptions. The default split mode per template is a config constant too, not a database value.

<details><summary>Example</summary>

```json
{ "trip_id": "0192…a1", "device_id": "0192…d9",
  "ops": [{ "op_id": "0192…f3", "type": "expense.create", "entity_id": "0192…e7", "v": 1,
            "client_ts": "2026-10-13T16:11:02Z",
            "payload": { "revision_id": "0192…r1", "amount_minor": "120000", "currency": "INR",
                         "fx": { "rate": "1", "source": "same" },
                         "spent_at": "2026-10-13T16:11:00Z", "category_key": "food",
                         "description": "Dinner", "split_mode": "equal",
                         "split_input": { "participants": ["m1","m2"] },
                         "payers": [{ "member_id": "m1", "amount_minor": "120000" }],
                         "shares": [{ "member_id": "m1", "share_minor": "60000" }, { "member_id": "m2", "share_minor": "60000" }] } }] }
```
Response: `{ "results": [{ "op_id": "0192…f3", "status": "applied", "seq": "41", "result": { … } }], "last_seq": "41" }`
</details>

### 2.2 Pulling
**Primary path (no Edge Function call):** read `trip_ops` directly through PostgREST:
```
GET /rest/v1/trip_ops?trip_id=eq.{id}&seq=gt.{cursor}&order=seq.asc&limit=500&select=seq,op_id,type,entity_id,result,result_v,member_id,server_ts
```
RLS returns only the caller's app-claimed trips and the ops visible to them (`visible_to_member_id`).

**Fallback `POST /sync-pull`** (several trips in one call, e.g. after a long time offline):

| | |
|---|---|
| Auth | member of every listed trip (non-member trips return `not_a_member` for that trip only) |
| Limit | 120/min per device |
| Request | `{ cursors: Array<{ trip_id, after_seq: string }> }` (max 20 trips) |
| Response | `{ trips: Array<{ trip_id, ops: Array<{ seq, op_id, type, entity_id, result, user_id, server_ts }>, has_more: bool, last_seq }> }` (≤ 500 ops per trip per call) |

### 2.3 `GET /trip-snapshot?trip_id=`
Full current state for a trip the phone doesn't have yet (after joining, or on a new phone).

| | |
|---|---|
| Auth | app-claimed trip member |
| Limit | 20/min |
| Consistency | read in **one REPEATABLE READ transaction**, so `last_seq` matches the rows exactly |
| Response | `{ trip, members[], categories[], budgets[] (the caller's private ones included, others' excluded), kitty_handovers[], expenses[] (header + current revision + payers + shares), settlements[], kitty_contributions[], itinerary[], places[], bookings[], feed_posts[], attachments[], recap?, activity[] (the last 500 ops, summarised for the feed), last_seq }`, gzip |
| Older history | `GET /trip-activity?trip_id=&before_seq=` → 200 older activity rows (for scrolling back in the feed) |

---

## 3. Invites and joining

### 3.1 `POST /invite-create`
Creates, or **rotates**, the trip's invite. Rotating revokes the old one.

| | |
|---|---|
| Auth | any claimed member (the organiser only, when rotating) |
| Limit | 10/hour per trip |
| Request | `{ trip_id, rotate?: bool }` |
| Response | `{ code: "GOA-7K2PXQ", url: "https://toli.in/t/<token>", expires_at }`. Without `rotate`, it returns the **current** invite (decrypted from `token_encrypted`), so every member shares the same link |

### 3.2 🌐 `GET /invite-preview?token=` or `?code=`
Public. The Worker's invite page uses it, and so does the app before joining.

| | |
|---|---|
| Auth | none; the token or code is the key |
| Limit | 30/min per IP; 10 wrong codes per IP per hour; **a global alarm and slowdown at 500 wrong codes per hour** (to stop guessing) |
| Response | `{ trip: { name, start_date, end_date, base_currency, total_spent_minor, member_count }, organiser_first_name, members: Array<{ member_id, display_name, is_ghost }>, expires_at }`. **Names and the trip total only**: no per-person numbers ([D-024](decisions/D-024-web-page-read-only-beta.md)) |
| Never returns | balances, phone numbers, emails, UPI IDs, user IDs, expense lines |
| Where the limits run | The Worker applies its rate limit **before** calling the function, and the function checks `rate_limit_buckets` **before** any other database work, so abuse can't drain the invocation allowance |
| Errors | `invite_invalid`, `invite_expired` |

### 3.3 🌐 `GET /invite-member-view?token=&member_id=`
The "Which one are you? → Neha" view: Neha's net, the lines that make it up, and what she owes whom (PRD §13). **No UPI ID is returned here.** Limit: 30/min per IP.

**R1a (beta): read-only.** The page shows this view and ends with **Get the Toli app** ([D-024](decisions/D-024-web-page-read-only-beta.md)). No claim, UPI or "I paid" from the browser.

**R1b: paying from the web**, with a **limited web membership**:
1. Turnstile check.
2. The page signs the browser in anonymously.
3. It calls `/join` with `claim_member_id` and `via: "web"`, which creates `claimed_via = 'web'`. That's **not** a full member: it can't read trip tables, push ops, download files or see the invite.
4. It calls `/upi-link` for **its own** debt only.
5. "Yes, I paid" goes through `/web-settlement`, recorded as **pending until the payee confirms**.

Web claims are limited to 5 per trip per hour, and the organiser is notified of each one (with Release). If the spot is already claimed, the page shows "This spot is taken. Open the Toli app or ask the organiser."

### 3.4 `POST /join`
Joins a trip and, optionally, claims a ghost in the same step.

| | |
|---|---|
| Auth | any user, including anonymous |
| Limit | 10/hour per user |
| Idempotent | yes: joining again returns the same member |
| Request | `{ token? , code?, claim_member_id?: uuid, display_name?: string, via?: "app" \| "web", spot_key?: string }`. `code` is the **6 random characters** (a typed prefix like "GOA-" is ignored, [D-008](decisions/D-008-invite-links.md)). `via: "web"` only in R1b, and only with Turnstile |
| Web → app hand-over | When a spot was claimed **in a browser**, the invite page shows **Open in app**, which carries a one-time `spot_key` (`/t/<token>?k=<spot_key>`, valid 30 days). `/join` with a matching `spot_key` **moves** the claim from the browser's anonymous user to the app's user, so "your history comes with you" stays true. Without the key, the app gets `already_claimed` and can ask the organiser to release. |
| Response | `{ trip_id, member_id, snapshot_hint: true }`. The phone then calls `/trip-snapshot`. |
| Rules | The first claim wins; after that, `already_claimed`. Joining without a claim creates a new claimed member named `display_name`. Writes `member.claim` into `trip_ops`. |

### 3.5 `POST /member-release`
The organiser frees a claimed spot, e.g. a friend reinstalled and lost their anonymous account. The member becomes a ghost again and **keeps all its history**.

`{ trip_id, member_id }` → `{ ok: true }`. Auth: organiser. Logged as `member.release`.

---

## 4. Files (receipts, tickets, photos)

### 4.1 `POST /upload-url`
| | |
|---|---|
| Auth | trip member |
| Limit | 60/hour per user; 10 MB per file; `image/jpeg`, `image/webp`, `application/pdf` only |
| Request | `{ trip_id (null for owner_type = profile), attachment_id, owner_type, owner_id, mime, bytes, sha256, display_name? }` |
| Response | `{ put_url, headers, expires_in: 300 }`, a presigned **PUT** to the private R2 bucket |
| Notes | The phone has already **compressed the image and removed EXIF/GPS data**. The server re-checks size and type when the upload is confirmed. |

### 4.2 `POST /upload-confirm`
`{ attachment_id }` → the server checks the object exists in R2 with a matching size and sha256, then marks it `uploaded` → `{ ok }`.

### 4.3 `POST /download-url`
`{ attachment_id }` → `{ get_url, expires_in: 300 }`. Auth: trip member. Vault documents are cached on the phone after the first download, so they stay available offline (PRD F13).

---

## 5. Money helpers

### 5.1 `POST /upi-link`
Builds the `upi://pay` link **on the server**, so a payee's UPI ID is only revealed to someone who owes them (PRD §18).

| | |
|---|---|
| Auth | trip member who is the payer in a current derived payment |
| Request | `{ trip_id, to_member_id, amount_minor }` |
| Response | `{ url: "upi://pay?pa=aditya@okhdfc&pn=Aditya&am=1200.00&cu=INR&tn=Toli%20·%20Goa%20Weekend", payee_name }`, or `{ url: null, reason: "no_upi_id" }` |
| Rule | Toli never checks whether the payment happened. The phone asks "Did the payment go through?" afterwards. |
| Currency | UPI works only in **INR**. For a trip in another base currency the response is `{ url: null, reason: "not_inr" }`, and the app shows only **Mark as paid** |
| Large amounts | Over **₹1,00,000**, the response is `{ urls: [...], parts: [...] }`: several links of at most ₹1,00,000 each, with the hint to pay over one or more days ([07 §8.5](07-calculation-engine.md)) |

### 5.1a `POST /stubs-send`
What **"Hold to tear & send stubs"** on Settle up does ([D-012](decisions/D-012-hold-to-tear.md)).

| | |
|---|---|
| Auth | trip member |
| Limit | 1 per trip per 10 minutes |
| Request | `{ trip_id, mode: "simplified" \| "direct" }` |
| Server | Recomputes the derived payments with the engine. Queues one `stub_received` push per payer who's on Toli. Moves the trip to `settling` if it was `active`. |
| Response | `{ payments: Array<{ from_member_id, to_member_id, amount_minor, pushed: bool }>, whatsapp_text }` |
| Offline | The button shows **"Needs internet"**. The payments list is still visible, and **Mark as paid** still works offline. |

**Honest copy (review U-2):**
- The overlay headline is **"STUBS READY"**, not "delivered".
- The toast is built from the response: "**Rahul and Neha will get a stub. Share with Jay on WhatsApp**", naming who is a ghost or has no push token.
- While offline, the button reads **"Needs internet"**. A plain expense save says "Saved · sending when you're online" until it syncs.

### 5.1b `POST /web-settlement` (R1b)
Records **"Yes, I paid"** from the invite web page, where the browser has no outbox.

| | |
|---|---|
| Auth | a **web-claimed** browser session (`claimed_via = 'web'`) for **its own** member only ([§3.3](#33--get-invite-member-viewtokenmember_id)) |
| Idempotent | yes (`Idempotency-Key` required) |
| Request | `{ trip_id, to_member_id, amount_minor, method: "upi" \| "cash" \| "bank" \| "other", note? }`. `amount_minor` must be ≤ what this member currently owes `to_member_id` |
| Server | Writes a `settlement.create` op with **`pending_confirmation = true`** through the same path as `sync-push`. **Pending settlements don't change balances** until the payee confirms (`settlement.confirm`) or rejects it (`settlement.void`) in the app. |
| Response | `{ ok: true, seq, pending: true }` |
| Limit | 3 per member per day |

### 5.1c Close trip and reopen
- **Close trip** is the op `trip.close` (any app-claimed member, from Settle up). The server applies the rounding adjustment and settles the trip if every derived payment is 0 ([D-021](decisions/D-021-rounding-adjustment.md), [D-023](decisions/D-023-auto-settle-timing.md)).
- **Request reopen** (`trip.request_reopen`) pushes `reopen_requested` to organisers.

### 5.2 `POST /reminder-send`
| | |
|---|---|
| Auth | trip member |
| Limit | **1 per recipient per trip per 48 hours** (PRD F6), counted in `reminders` |
| Request | `{ trip_id, to_member_id }` |
| Response | `{ sent: true, next_allowed_at }`, or 429 with `next_allowed_at` |
| Notes | Pushes to the recipient's devices if they're on Toli. Always returns WhatsApp share text too, so ghosts can be nudged by hand. |

---

## 6. Places and FX

### 6.1 `GET /places-search?q=&lat=&lng=&session=`
A proxy to Geoapify. The key stays on the server.

- Results are **cached** per `(q normalised, rounded lat/lng)` for 30 days.
- The phone debounces input by 300 ms and needs at least 3 characters.
- Limit: 60/min per user, plus a global daily budget. Above the budget: `503 places_unavailable`, and the phone falls back to manual entry.

Response: `{ results: Array<{ ref, name, category, lat, lng, address }> }`.

### 6.2 FX rates
Read directly through PostgREST: `GET /rest/v1/fx_rates?rate_date=gte.<date>`. It's public data to any signed-in user. A **cron job**, not the phone, fetches from providers ([08](08-third-party-integrations.md)).

---

## 7. Pro (R2)

| Endpoint | Purpose |
|---|---|
| `POST /pro-verify` | `{ trip_id, store, purchase_token }` → the server checks it with Google Play or the App Store → `{ is_pro: true }`. Idempotent per `store_txn_id`. |
| `POST /receipt-extract` | `{ trip_id, attachment_id }` → `{ draft: { merchant, date, currency, items[], extras[], total_minor, total_mismatch_minor }, confidence }`. `total_mismatch_minor` is 0 when the lines add up to the printed total. Auth: member of a Pro trip. Limit: 30 per trip per day. Failure returns **422 `extraction_failed`** with a `reason` ([§1](#1-shape-of-the-api)), and the photo is **always kept** (PRD F4). |

---

## 8. Account and privacy

| Endpoint | Purpose |
|---|---|
| `POST /account-export` | Builds a JSON + CSV export of all the user's trips and uploads it to R2 → `{ url, expires_at }` (24 h). Limit 3/day. |
| `POST /account-delete` | `{ confirm: "DELETE" }` → anonymises the user's member rows, erases the profile, devices and auth user ([03 §11](03-database-schema.md)) → `{ ok }`. Before confirming, the phone shows that shared expenses stay for the other members. |

## 8a. Other endpoints

| Endpoint | Purpose |
|---|---|
| `POST /trip-export` | Pro (PRD F15): `{ trip_id, format: "csv" \| "pdf" }` → `{ url, expires_at }` (24 h). Separate from the free DPDP account export. Limit 10/day per trip. |
| 🌐 `POST /pro-webhook` | Google Play RTDN and App Store Server Notifications (refunds, revocations). Verified by each store's signature. Sets `pro_passes.refunded_at`. |
| `POST /recap-publish` | `{ trip_id }` → creates (or returns) the public recap token → `{ url: "https://toli.in/r/<token>" }`. Any member of a settled trip. |
| `POST /recap-revoke` | `{ trip_id }` → sets `revoked_at`, so the old link shows "This recap is no longer shared". Allowed for **any member** (privacy beats sharing); publishing again creates a new token. |
| 🌐 `GET /recap-preview?token=` | Used by the Worker: the trimmed snapshot (trip name, dates, total, per-person totals unless `hide_amounts`, stats, photo thumbnails signed for 1 h). Never includes UPI IDs, phone numbers, emails, expense descriptions or receipts. 30/min per IP. |
| 🌐 `GET /rest/v1/rpc/health` | A tiny SQL function (`select true`) called through PostgREST with the publishable key. UptimeRobot pings it every 5 minutes on **both** cloud projects, which also stops them pausing. **It costs no Edge Function call.** |

> **Removed in v1 (D-025):** `POST /contacts-match`.

**There is no in-app notification inbox in v1.** The **Trip feed** ([screens/feed](screens/feed.md)) is the history of what happened. `notification_outbox` is server-only.

---

## 9. Directly through PostgREST (RLS-guarded)

| Table | Allowed |
|---|---|
| `profiles` | select/update own row (display_name, avatar_key, upi_vpa, upi_visible_to, locale, notify_threshold_major, hide_lockscreen_amounts) |
| `devices` | select/insert/update own rows (register the FCM token) |
| `notification_preferences` | select/upsert own rows |
| `consents` | select/insert own rows (withdrawing = inserting with `withdrawn_at`; rows are never updated) |
| All trip tables, `trip_ops` | **select only**, when the trip is in `private.my_trip_ids()` (app-claimed members). `trip_ops` also filters `visible_to_member_id`. **This is the main pull path** (§2.2) |
| `fx_rates` | select |

---

## 10. Cloudflare Worker (public web)

| Route | Returns |
|---|---|
| `GET /t/:token` | Invite page (server-rendered, ~20 KB). Calls `/invite-preview`. Has an "Open in app" / "Get the Toli app" button. |
| `GET /j/:code` | Short-code version of the same page |
| `GET /r/:token` | Public recap page, if the group shared one (amounts hidden when `hide_amounts`) |
| `GET /og/t/:token.png` | WhatsApp preview card (trip name, "See what you owe"). **Not drawn in the Worker** (the 10 ms CPU limit): a static branded template with the trip name overlaid as text, or an image rendered once by an Edge Function and cached in R2 |
| `GET /og/r/:token.png` | WhatsApp preview card for a public recap (respects `hide_amounts`), rendered the same way (R3) |
| `GET /privacy` · `GET /terms` | privacy notice (versioned, matches the `consents.version`) and terms. They state clearly that Toli never holds money (PRD §14) |
| `GET /delete-account` | public **account deletion request page**, required by Google Play. It explains what is deleted and links to the in-app flow. Its form posts to the 🌐 Edge Function `account-delete-request` (email address only, rate-limited), which emails a confirmation link through Resend. **The Worker stores nothing and holds no Resend key.** |
| `GET /healthz` | `200 ok` (static). UptimeRobot checks the web page; `/rest/v1/rpc/health` checks the database |
| `GET /.well-known/assetlinks.json` | Android App Links (the SHA-256 of each signing certificate, including the test APK key) |
| `GET /.well-known/apple-app-site-association` | iOS Universal Links |

The Worker only ever calls the public 🌐 Edge Functions. **It holds no user data and no Supabase service key.**

### 10.1 Scheduled jobs (inside Supabase, so the service role never leaves it)
| Job | Schedule | What it does |
|---|---|---|
| `fx-ingest` (Edge Function, called by pg_cron + pg_net) | daily 02:30 IST | Fetches Frankfurter v2 (fallback fawazahmed0) and upserts `fx_rates`. Not callable by clients (requires a cron secret header). |
| `notify-sender` | Pushes are normally sent **inside `sync-push`** right after commit. A pg_cron job checks `notification_outbox` **in SQL** every minute and calls the function **only when rows are due** (retries, digests), so idle minutes cost nothing |
| `lifecycle` | daily 03:00 IST | For each trip: planning → active on the start date; the **"trip starts" / "trip ended"** pushes (PRD F16); **auto-settle** when every derived payment is 0 and `end_date` + 24 h has passed (after the rounding adjustment, [D-023](decisions/D-023-auto-settle-timing.md)); **archive** 30 days after settled; flag trips where no organiser has been active for 30 days (the longest-standing member is offered the role, OQ-P20) |
| `balance-audit` | nightly | **Pure SQL:** sums the **stored** payers, shares, settlements, contributions and hand-overs per trip, and checks them against `trip_balances` and Σ = 0. It never re-runs a newer engine on old data. A mismatch is a P0 alert. It also (re)builds any missing recap snapshot (R3). Runs in batches with a cursor |
| `cleanup` | nightly | Deletes old `rate_limit_buckets`; expired exports; `notification_outbox` rows older than 30 days; **`pending` attachments older than 24 h and their R2 objects**; **anonymous users with no trips after 30 days** |

---

## 11. Push payloads (server → phone)

Push payloads are validated by Zod on the phone before they're shown.

```ts
{ v: 1, category: "payments" | "expenses" | "reminders" | "trip_updates",
  trip_id, trip_name, kind: "added_to_trip" | "member_claimed" /* to organisers: "Neha claimed her spot" */ | "stub_received" | "payment_recorded" | "payment_to_confirm" /* R1b web settlement */ | "expense_changed" | "reminder" | "kitty_low" | "budget_75" | "budget_100" | "digest" | "trip_started" | "trip_ended" | "reopen_requested",
  title, body, amount_minor?: string, currency?: string, actor_name?: string,
  actor_avatar_url?: string /* signed, 24 h */, image_url?: string /* e.g. a receipt thumbnail, signed */,
  progress_bp?: number /* 0–10000, for kitty_low / budget_75 / budget_100 progress bars */,
  actions?: Array<"pay_upi" | "mark_paid" | "view_trip" | "see_split" | "not_me" | "top_up" | "view_budget" | "reopen" | "confirm_payment">,
  deep_link: "toli://trip/<id>/..." }
```

**Action behaviour**

| Action | What it does |
|---|---|
| `pay_upi` | Shown **only when the recipient currently owes the actor** (a derived payment exists). It opens the app, calls `/upi-link`, then opens the UPI app. Otherwise the action is `see_split`. |
| `mark_paid` | Opens the settle row pre-filled. The user confirms, and a `settlement.create` op is written. |
| `not_me` | Opens the expense with the hint "Not part of this? Remove yourself". Confirming writes `expense.edit` (removes you from the participants). |
| `top_up` | Opens the Kitty screen with the suggested top-up. |
| `view_budget` | Opens the Budget screen. |
| `reopen` | On `reopen_requested` (organisers only): opens Trip settings with **Reopen trip** ready to confirm. |
| `confirm_payment` | On `payment_to_confirm` (R1b, the payee): opens Recorded payments with **Confirm** / **Not received**. |

**No push ever performs a money action by itself.** Every action opens the app and asks for confirmation.

**Deep links by release:** `digest` opens **Trip home** in R1 and R2, and the Feed from R3. Unknown `kind` values (from a newer server) show as a plain notification that opens Trip home.

**R1a:** pushes are **plain system notifications** (title, text, Toli icon and accent colour, tap opens the right screen). Inside the app, the same event shows the exact **stub banner** design. The custom Android styles and action buttons arrive in R1b ([D-018](decisions/D-018-r1a-r1b-scope.md), [D-009](decisions/D-009-notifications.md)). The setting **"Hide amounts on lock screen"** removes amounts and names from the push text itself, on the server.

The notification design itself is in [features/notifications](features/notifications.md).
