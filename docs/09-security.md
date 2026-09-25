# 09 · Security

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §5.6, §13, §14, §18, F2, F6, F7 · India DPDP Act 2023 · [D-007](decisions/D-007-auth.md) · [D-008](decisions/D-008-invite-links.md) · [D-011](decisions/D-011-server-writes.md) · [D-016](decisions/D-016-testing-distribution.md) · [Open questions](01-overview.md#open-questions) (OQ-P8, P12, P14, P20) |
| **Related** | [02 §6 Security boundaries](02-architecture.md) · [03 Database](03-database-schema.md) · [04 API](04-api-schema.md) · [08 Integrations](08-third-party-integrations.md) · [10 Observability](10-observability.md) · [11 Testing](11-testing-strategy.md) |

Toli is a money app used by friend groups. The worst security outcomes are: **someone sees a trip they aren't on, someone changes a balance they shouldn't, or someone's UPI ID or phone number leaks.** Everything below exists to prevent those three.

---

## 1. Authentication

| Topic | Rule |
|---|---|
| **First open** | Supabase **anonymous sign-in**, silently. The user gets a real user ID and JWT with no sign-up screen ([D-007](decisions/D-007-auth.md)) |
| **Upgrading** | "Save my account" links **Google**, **Sign in with Apple** or **email OTP** to the *same* user ID. No data moves |
| **Apple rule** | If Google login is offered on iOS, Sign in with Apple must be offered too |
| **Phone OTP** | Later only, through the Supabase Send SMS hook (WhatsApp / MSG91), with strict anti-pumping limits ([08 §3.17](08-third-party-integrations.md)) |
| **Session storage** | The "large secure store" pattern ([02 §4](02-architecture.md)): a random AES-256 key in `expo-secure-store` (Keychain / Keystore), and the session (access + refresh tokens) **encrypted** with it in app storage. Never in plain AsyncStorage, never in logs |
| **Token lifetime** | Supabase defaults: ~1 hour access token, rotating refresh token. Refresh-token reuse detection **on** |
| **Email OTP** | 6 digits, 10-minute expiry, sent via Resend SMTP; Supabase Auth rate limits on |
| **Anonymous abuse** | Anonymous sign-ups are rate-limited per IP (Supabase setting + CAPTCHA option if abused). Anonymous users can't do anything outside their own trips |
| **Reinstall risk** | An anonymous user who reinstalls loses their identity. The organiser can **release** the member (history kept) so they can claim again ([04 §3.5](04-api-schema.md)). Organisers are nudged to "Save my account" as soon as they invite anyone; if no organiser is active for 30 days, the longest-standing claimed member can take over, logged (OQ-P20 in [01](01-overview.md#open-questions)) |
| **Sign-out** | Clears secure store and the local SQLite database (after warning if the outbox has unsent changes) |

---

<a id="permission-matrix"></a>
## 2. Authorization

### 2.1 Row Level Security everywhere
- **RLS is enabled on every table in `public`.** No exceptions ([03 §1](03-database-schema.md)).
- **CI check (blocks merge):** a SQL test lists every table in `public` and fails if any has `relrowsecurity = false` or has zero policies. It also fails if a new table isn't in [03](03-database-schema.md) ([11 §5](11-testing-strategy.md)).
- Membership checks use `trip_id in (select private.my_trip_ids())` and `private.member_id_for(trip_id)`:
  - `security definer`, in a `private` schema the API doesn't expose;
  - `search_path = ''`, execute revoked from `anon`;
  - evaluated **once per query**, not per row.
- **Web-claimed members never pass** `my_trip_ids()` ([D-024](decisions/D-024-web-page-read-only-beta.md)).
- `trip_ops` rows with `visible_to_member_id` are hidden from everyone else (review S-07).

### 2.2 Who can write what

| Data | Phone can | How |
|---|---|---|
| All trip tables (`trips`, `trip_members`, `expenses`, `expense_*`, `settlements`, `kitty_contributions`, `trip_budgets`, planning tables, `attachments`, `trip_ops`, `pro_passes`) | **SELECT only**, when a trip member. `member`-scope `trip_budgets` rows are visible only to that member | RLS select policy; **no insert/update/delete policies exist** |
| Any trip change | send an op | `POST /sync-push` (service role inside the function) validates and writes ([D-011](decisions/D-011-server-writes.md)). Some ops are **server-only** and rejected from phones: `member.claim`, `member.release`, `member.anonymised`, `trip.pro_activated` / `trip.pro_revoked`, `trip.transition` to `settled`, `attachment.uploaded` ([06 §4](06-syncing.md)) |
| `profiles` | own row: select/update allowed columns | RLS + column grants |
| `devices`, `notification_preferences` | own rows | RLS |
| `consents` | own rows: select/insert | RLS |
| `op_rejections`, `pro_subscriptions`, `deletion_requests`, `data_exports` | own rows: select | RLS |
| `trip_invites`, `notification_outbox`, `reminders`, `rate_limit_buckets` | nothing | no policies = no access |
| `fx_rates` | select | RLS: authenticated |

### 2.3 Permission matrix

**This table is the only place that says who can do what** ([D-031](decisions/D-031-permission-matrix.md)). Screen and feature docs link here instead of repeating it. `sync-push` and the Edge Functions enforce it, rejecting with `not_organiser` or `not_allowed`.

**Roles:**
- **Member:** an app-claimed member.
- **Organiser:** a member with `role = organiser`.
- **Web viewer:** someone on the invite web page. R1a: read-only. R1b: a limited web membership.
- **Ghost:** no account, so it can do nothing itself.

| Action | Member | Organiser | Web viewer | Notes |
|---|---|---|---|---|
| See the trip, balances, expenses, history | ✅ | ✅ | only names, total, **own** lines | private ops are hidden from others (`visible_to_member_id`) |
| Add / edit / delete **any** expense | ✅ | ✅ | ❌ | every change in history + notified; money group LWW ([D-019](decisions/D-019-money-edit-group.md)) |
| "Not me": remove yourself from an expense | ✅ | ✅ | ❌ | |
| Attach / delete a receipt photo | ✅ (delete: own) | ✅ (any) | ❌ | |
| Add ghosts; rename **ghosts** | ✅ | ✅ | ❌ | |
| Rename yourself | ✅ | ✅ | ❌ | |
| Rename another **claimed** member | ❌ | ✅ | ❌ | |
| Set `joined_from` | own | anyone's | ❌ | |
| Remove a member (balance must be 0) | ❌ | ✅ | ❌ | the last organiser can't be removed ([D-030](decisions/D-030-removed-members-locked.md)) |
| Leave the trip (own balance 0) | ✅ | ✅ unless last organiser | ❌ | |
| Release a claimed spot | ❌ | ✅ | ❌ | the spot becomes a ghost again, history kept |
| Make / unmake organiser (`member.set_role`) | ❌ | ✅ | ❌ | ≥ 1 organiser always |
| Share / re-share the invite | ✅ | ✅ | ❌ | same link |
| Rotate the invite | ❌ | ✅ | ❌ | |
| Kitty: turn on/off, set threshold | ❌ | ✅ | ❌ | turning off needs remaining = 0 |
| Kitty: add or void a contribution | ✅ | ✅ | ❌ | void: the recorder or an organiser |
| Kitty: hand over (`kitty.handover`) | current holder | ✅ | ❌ | [D-022](decisions/D-022-kitty-views-and-handover.md) |
| Mark a payment as paid (any pair, including ghost → ghost) | ✅ | ✅ | R1b: **own** debt only, **pending** | pre-filled exact amount ([D-021](decisions/D-021-rounding-adjustment.md)) |
| Confirm a pending web payment | payee | ✅ | ❌ | R1b |
| Void a settlement | the recorder | ✅ | ❌ | |
| Hold to tear & send stubs | ✅ | ✅ | ❌ | 1 per 10 min per trip |
| Send a reminder | ✅ | ✅ | ❌ | 1 per person per 48 h |
| Change settle mode (Simplified / Direct) | ❌ | ✅ | ❌ | Direct is R1b |
| **Close trip** | ✅ | ✅ | ❌ | only when every derived payment is 0 |
| Request reopen | ✅ | — | ❌ | pushes the organisers |
| Reopen a settled trip | ❌ | ✅ | ❌ | logged |
| Edit trip details (name, dates, destination, cover) | ✅ | ✅ | ❌ | base currency: organiser only, and only while there are no expenses |
| Export the trip (CSV/PDF, Pro, R2) | ✅ | ✅ | ❌ | needs a Pro trip |
| Delete the trip | ❌ | ✅ **only if no other claimed member** | ❌ | otherwise leave or archive (review P-6) |
| Budgets (total, category) | ✅ | ✅ | ❌ | R2 |
| Personal budget | own only | own only | ❌ | private |
| Itinerary, places, bookings | ✅ | ✅ | ❌ | R2/R3 |
| Vault document: add / delete | ✅ (delete: own) | ✅ (any) | ❌ | `visibility = owner` files: uploader only |
| Feed post: add / delete | ✅ (delete: own) | ✅ (any) | ❌ | R3; allowed on settled trips |
| Recap: hide amounts on / publish | ✅ | ✅ | ❌ | R3 |
| Recap: hide amounts **off** / revoke link | ✅ (off asks to confirm) | ✅ | ❌ | anyone can revoke |
| Buy a Pro pass for the trip | ✅ | ✅ | ❌ | R2 |

- **Settled trips:** the allow-list in [06 §5](06-syncing.md) applies on top of this table.
- **Organiser takeover:** if no organiser is active for 30 days, the longest-standing member is offered the role (OQ-P20).

### 2.4 The service role
- The **service role key exists only in Edge Function secrets** ([02 §6](02-architecture.md)).
- It is never in the app, never in the Worker, never in logs, never in CI output.
- **The Worker holds no service key and no user data.** The daily FX fetch runs inside Supabase: pg_cron calls the `fx-ingest` Edge Function, which requires a cron secret header and isn't callable by clients ([04 §10.1](04-api-schema.md), [D-001](decisions/D-001-tech-stack.md)).

---

## 3. Secrets management

| Secret | Lives in | Never in |
|---|---|---|
| Supabase service role key | Edge Function secrets (per project) | app, Worker, git |
| Invite token encryption key (`token_encrypted`), `fx-ingest` cron secret | Supabase Vault / Edge Function secrets | app, Worker, git |
| Supabase DB URL / access token | GitHub environment secrets | app, git |
| R2 access keys | Edge Function secrets; backup token in GitHub secrets | app |
| FCM service account JSON, APNs key | Edge Function secrets / Firebase console | app |
| Geoapify, LLM provider, WhatsApp/MSG91 keys | Edge Function secrets | app |
| Play / App Store server keys | Edge Function secrets; EAS credentials (for Submit) | app |
| Sentry auth token, EXPO_TOKEN, Cloudflare API token | GitHub + EAS secrets | app |
| App signing keys | EAS credentials | git, laptops |

**Publishable values allowed in the app:** Supabase URL + anon key, PostHog project key, Sentry DSN, Firebase client config.

**Rules**
- `.env*` files are git-ignored; `.env.example` lists names only.
- GitHub secret scanning + push protection **on**.
- Every secret has an owner and a rotation note in the team password manager. Rotate immediately if a laptop is lost or someone leaves; otherwise yearly.
- Separate secrets per environment. A preview key must never work against production.

---

## 4. API security

| Control | Detail |
|---|---|
| **JWT on every call** | Except the public 🌐 endpoints (`invite-preview`, `invite-member-view`, `recap-preview`, `health`, and `pro-webhook`, which checks the store's signature instead) and `fx-ingest` (cron secret) ([04](04-api-schema.md)). The function verifies the JWT and reads `auth.uid()` |
| **Zod on every edge** | Every request and response has a schema in `packages/schema`; unknown fields rejected; string lengths capped; money as integer strings only ([D-014](decisions/D-014-ids-and-wire-money.md)) |
| **Server re-computes money** | `sync-push` re-runs `@toli/engine` and checks per-op zero-sum; the phone's numbers are never trusted ([06 §6](06-syncing.md)) |
| **Idempotency** | `op_id` / `Idempotency-Key` on every write; a repeat returns the first result |
| **Rate limits** | Per user and per IP in `rate_limit_buckets` ([03 §9](03-database-schema.md)); limits per endpoint listed in [04](04-api-schema.md); `429` + `Retry-After` |
| **Version gate** | `Toli-Client` header; `426 upgrade_required` for unsafe old versions |
| **Errors** | Fixed error shape, no stack traces, no SQL text, no internal IDs beyond what the caller already has |
| **CORS** | Edge Functions allow only the Worker origin(s), for the 🌐 endpoints and for the calls the invite page makes with its anonymous browser session (`/join`, `/upi-link`, `/web-settlement`, [04 §3.3](04-api-schema.md)); the app doesn't need CORS |
| **SQL** | Parameterised queries only; `security definer` functions set `search_path = public, pg_temp` |
| **Logging** | Structured, no PII, no tokens ([10 §6](10-observability.md)) |

---

## 5. Storage security (R2)

| Control | Detail |
|---|---|
| **Private buckets** | No public access, no public bucket URL |
| **Presigned URLs** | Issued only by Edge Functions after a membership check; **5 minutes**, one object each ([04 §4](04-api-schema.md)). Two longer exceptions: actor avatars in push payloads (24 h, [04 §11](04-api-schema.md)) and photo thumbnails on a public recap (1 h, [04 §8a](04-api-schema.md)) |
| **Unguessable keys** | `trips/{trip_id}/{attachment_id}.{ext}` with UUID v7 IDs; still never accessible without a signed URL |
| **EXIF / GPS strip** | `expo-image-manipulator` re-encodes to JPEG (1600 px, q0.7), which drops EXIF, on the phone before upload |
| **Size and type** | Max 10 MB; only `image/jpeg`, `image/webp`, `application/pdf`; checked when the URL is issued **and** on `upload-confirm` (size + sha256 must match) |
| **Quotas** | 5 photos per expense (`attachment_limit`); 1 GB vault per free trip (413 `quota_exceeded`; receipts never count). Limits live in `packages/config` ([04 §2.1](04-api-schema.md)) |
| **PDFs** | Stored and served as downloads only; never rendered server-side |
| **Encryption at rest** | R2 default encryption; vault documents restricted to trip members (PRD F13) |
| **Deletion** | Account erasure removes the user's files from trips with no other members ([03 §11](03-database-schema.md)) |
| **Backups bucket** | Separate bucket, separate write-only token, lifecycle rule (keep 30 daily + 12 monthly) |

---

## 6. Invite security ([D-008](decisions/D-008-invite-links.md))

| Control | Detail |
|---|---|
| **One active invite per trip** | Long token for the URL + short human code (`GOA-7K2PXQ`) |
| **Code strength** | A cosmetic 3-letter trip prefix plus **6 random characters** from a 31-character alphabet with no ambiguous characters (0/O/1/I/L), about 887 million combinations ([03 §4.3](03-database-schema.md)) |
| **Token strength** | 128-bit random. Stored as `token_hash` (SHA-256, for lookups) and `token_encrypted` (Supabase Vault key, decryptable only by Edge Functions), so any member can re-share the **same** link: `invite-create` without `rotate` returns the current invite ([04 §3.1](04-api-schema.md)) |
| **Expiry** | 30 days after the trip's end date, or 60 days if no end date |
| **Rotation** | **Organiser only**, any time; the old token and code stop working immediately |
| **Guess limits** | 10 wrong codes per IP per hour; **global alarm and slowdown at 500 wrong codes per hour**; invite preview 30/min per IP ([04 §3.2](04-api-schema.md)); `uses` counter for abuse detection |
| **Minimal preview** | `invite-preview`: trip name, dates, total and first names **only** ([D-024](decisions/D-024-web-page-read-only-beta.md)). Per-person numbers come only from `invite-member-view`, for the one person picked. **Never** phone numbers, emails, user IDs, UPI IDs or full expense descriptions |
| **Claim rules** | First claim wins; no approval, but the organiser is notified and can **Release** a wrong claim (OQ-P14 in [01](01-overview.md#open-questions)) |
| **Join limit** | `/join` 10/hour per user |
| **Accepted exposure** | Anyone holding the link sees names and balances (PRD F2 non-negotiable). Disclosed in the privacy notice; rotation is the fix if a link leaks |

**Recommended hardening:** invite HTML is served `no-store` and `noindex` so search engines and shared caches never keep it.

---

## 7. Deep-link security

Deep links arrive from WhatsApp, notifications, the invite page and other apps. **Treat every deep link as untrusted input.**

| Rule | Detail |
|---|---|
| **Validate with Zod** | Every route (`toli://trip/<id>/…`, `https://toli.in/t/<token>`, `/j/<code>`) is parsed by a Zod schema: allowed paths only, UUID format, token/code format, no unknown params |
| **Only navigate** | A deep link can **open a screen**, never perform an action. It can pre-fill, but the user must confirm |
| **Never auto-perform money actions** | No link, notification button or push payload may create a settlement, an expense, a kitty contribution, a claim or a deletion by itself. `mark_paid` opens the settle row pre-filled; `not_me` opens the expense, and only the user's confirm writes the `expense.edit`; `pay_upi` is offered only when the recipient owes the actor ([04 §11](04-api-schema.md)) |
| **Membership re-checked** | Opening `toli://trip/<id>` for a trip you aren't on shows "You're not on this trip", not an error dump |
| **Verified links** | Android App Links (`assetlinks.json` with each signing certificate's SHA-256, incl. the tester APK key, [12 §5.2](12-environments-and-deployment.md)) and iOS Universal Links, so other apps can't claim `toli.in` links |
| **Custom scheme** | `toli://` can be registered by other apps, so it only ever carries **IDs**, never tokens or secrets |
| **Outbound UPI** | `upi://pay` links are built by the server (`/upi-link`) and opened with the OS intent; never built from link parameters |
| **Push payloads** | Validated by Zod on the phone before display ([04 §11](04-api-schema.md)) |

---

## 8. UPI ID exposure rules

| Rule | Detail |
|---|---|
| **Opt-in** | `profiles.upi_vpa` is empty until the user adds it; regex-validated (`name@handle`) |
| **Visibility setting** | `upi_visible_to`: `debtors_only` (default) / `nobody` (PRD §18). There is no "all members" option |
| **Never readable via REST** | Other members can read only `display_name` and `avatar_key` (view `member_profiles`) ([03 §3.1](03-database-schema.md)) |
| **Built on the server** | `POST /upi-link` returns a full `upi://pay` URL only if the caller is the payer in a **current derived payment** to that person ([04 §5.1](04-api-schema.md)) |
| **INR only** | For a trip in another base currency, `/upi-link` returns `reason: "not_inr"` and the app shows only **Mark as paid** |
| **Web viewers** | **R1a:** the web page never shows or requests a UPI ID (read-only). **R1b:** only a **web-claimed** debtor (a limited membership, Turnstile, 5 claims per trip per hour) can call `/upi-link`, for **its own** debt; web payments stay **pending** until the payee confirms ([04 §3.3](04-api-schema.md), [D-024](decisions/D-024-web-page-read-only-beta.md)) |
| **Not in payloads** | Never in push payloads, analytics, logs, Sentry or exports of other people's data |
| **Honest copy** | The UI never implies Toli verifies payments |

---

## 9. Personal data inventory and minimisation

| Data | Where | Why we need it | Who can see it | Kept until |
|---|---|---|---|---|
| Display name | `profiles`, `trip_members` | show who paid / owes | trip members; invite link holders | account deletion (member rows in shared trips become "Former member") |
| Email | `auth.users` only | login | the user; Supabase | account deletion |
| Google / Apple ID | `auth.identities` | login | nobody else | account deletion |
| Phone number (later) | `auth.users` | login | co-trip members only (PRD §18) | account deletion |
| UPI ID | `profiles.upi_vpa` | build payment links | per §8 | user removes it / deletion |
| Avatar | R2 | display | trip members | deletion |
| Contacts | **never uploaded**; "Add from contacts" copies the **name only**, on the phone ([D-025](decisions/D-025-no-contacts-matching-v1.md)) | quick ghost names | nobody | not stored |
| Consent records | `consents` | prove DPDP consent (privacy notice) | the user | account deletion |
| Push token | `devices.fcm_token` | deliver pushes | server only | token invalid / deletion |
| Expense descriptions, amounts, receipts | trip tables, R2 | the product | trip members | trip life |
| IP address | rate-limit buckets (hashed), logs | abuse prevention | server only | 1 day (buckets), ≤ 30 days (logs) |
| Analytics events | PostHog | product decisions | team | PostHog retention (no PII) |

**Minimisation rules**
- Don't collect it unless a feature needs it today.
- No location permission (places come from search, not GPS).
- No SMS permission (SMS auto-capture is out of v1).
- Contacts permission is asked only when the user taps "Add from contacts".

### 9.1 Contacts (v1: names only)
- **Contacts matching is removed from v1** ([D-025](decisions/D-025-no-contacts-matching-v1.md)). A phone number hashed with a published salt can be reversed in seconds, and matching needs phone login, which comes later.
- "Add from contacts" opens the system picker, and the app copies **only the chosen name** into a new ghost. No phone number, no hash, nothing is uploaded.
- If matching comes back later, it must use a server-side secret (a keyed hash or OPRF), opt-in discovery and strict rate limits. It will need its own decision.

---

## 10. Data deletion and export (DPDP Act 2023)

| Right | How Toli meets it |
|---|---|
| **Notice** | Plain-language privacy notice in the app and on the website before launch: what we collect, why, where it's stored, who processes it (Supabase, Cloudflare, Google/FCM, PostHog, Sentry, Resend, LLM provider) |
| **Consent** | Clear consent at first open (continue = accept notice); separate explicit consent for notifications (contacts matching is not in v1, [D-025](decisions/D-025-no-contacts-matching-v1.md)); analytics opt-out toggle in Settings. Each consent is a versioned `consents` row matching the `/privacy` version ([03 §9](03-database-schema.md), [04 §10](04-api-schema.md)) |
| **Access** | Settings → **Export my data** → `POST /account-export` → JSON + CSV of all the user's trips, link valid 24 h, 3/day ([04 §8](04-api-schema.md)) |
| **Correction** | Users edit their name, UPI ID and expenses directly |
| **Erasure** | Settings → **Delete account** → `POST /account-delete` (type DELETE). Profile, devices, auth user and UPI ID erased; member rows become "Former member" (numbered if several) and the server writes a `member.anonymised` op, so friends' balances still add up (PRD §18, [03 §11](03-database-schema.md)). This is **disclosed before confirming**. The public `/delete-account` page (required by Google Play) explains this and accepts requests by email |
| **Timeline** | Deletion runs immediately; backups age out within 30 days (disclosed) |
| **Grievance** | A named grievance contact and email in the privacy notice |
| **Breach notification** | Notify the Data Protection Board and affected users without delay (see §13) |
| **Children** | Not directed at under-18s; ToS requires 18+ (DPDP requires verifiable parental consent for children) |
| **Cross-border** | Supabase is in Mumbai; PostHog/Sentry/Resend process outside India (allowed unless a country is restricted by the government; disclosed) |

Launch-blocking (PRD §18): the privacy notice and a working delete path.

---

## 11. Abuse prevention

| Abuse | Control |
|---|---|
| **Reminder harassment** | **1 reminder per recipient per trip per 48 hours**, counted in `reminders` ([04 §5.2](04-api-schema.md)); neutral copy; the recipient can mute the Reminders channel |
| **Spam invites** | `invite-create` 10/hour per trip; `/join` 10/hour per user; invite preview 30/min per IP; anonymous sign-up limits per IP |
| **Code guessing** | 10 wrong codes per IP per hour; global alarm and slowdown at 500 per hour (see §6) |
| **Notification spam** | Digest above 5 events in 30 min; `/stubs-send` 1 per trip per 10 minutes; no marketing through transactional channels (PRD F16) |
| **Contact probing** | not possible in v1: no contacts endpoint exists (§9.1) |
| **Storage abuse** | 60 uploads/hour per user, 10 MB/file, allowed types only, 5 photos per expense, 1 GB vault per trip on free (413 `quota_exceeded`; receipts never count) (PRD §15) |
| **OTP pumping** (later) | per-number + per-IP limits, India-only, daily spend cap |
| **Receipt AI cost abuse** | Pro trips only, 30 scans per trip per day (a failed scan isn't counted), cache by sha256 |
| **Offensive names / content** | Report option on the recap public link (R3); organiser can remove members (balance 0); the recap link can be revoked (`/recap-revoke`) |

---

## 12. "The kitty never holds money" — regulatory position (PRD §14)

- **Toli never touches, holds, pools, routes or transmits money.** Collecting or pooling user funds would make us a Payment Aggregator under RBI rules (₹25 crore net worth, escrow, PCI-DSS, authorisation) — illegal to operate without it under the Payment and Settlement Systems Act, 2007.
- **The kitty is an accounting record only.** Members give cash or UPI to whoever holds the pot; Toli records it ([07 §6](07-calculation-engine.md)).
- **UPI collect requests are not used** (NPCI stopped P2P collect from 1 Oct 2025). Settlement uses `upi://pay` intent links opened in the user's own UPI app with their own PIN.
- **We receive no payment confirmation.** Settlements are user-confirmed; the UI must say so ("This is based on your confirmation, since Toli never sees the payment itself").
- **Required wording** in the UI, ToS and store listing: "Toli only keeps count. It never holds or moves your money." Legal review of the kitty's presentation **before R1 ships** (PRD §21).
- **No code path** may add a payment gateway, wallet, stored balance or payout without a new decision record and legal sign-off.

---

## 13. Threat model

| # | Threat | Likely? | Impact | Mitigation |
|---|---|---|---|---|
| T1 | A user reads another trip's data via the REST API | Medium | High | RLS on every table; `is_trip_member`; CI RLS check; RLS tests per table ([11 §5](11-testing-strategy.md)) |
| T2 | A user writes directly to trip tables to change balances | Medium | Critical | No write policies on trip tables; writes only via `sync-push` ([D-011](decisions/D-011-server-writes.md)) |
| T3 | A modified app sends wrong shares | Medium | High | Server re-computes with `@toli/engine`; per-op zero-sum; server result wins ([06 §6](06-syncing.md)) |
| T4 | Replayed or duplicated requests | High | Medium | `op_id` idempotency; `duplicate` answers |
| T5 | Invite link leaked to strangers | Medium | Medium | Minimal preview; expiry; organiser rotation; no PII in preview |
| T6 | Brute-forcing short codes | Medium | Medium | 6 random characters (~887M codes); 10 wrong/IP/hour; global alarm at 500/hour |
| T7 | Stranger claims someone's ghost first | Low | Medium | First claim wins, visible to the group in the feed; the organiser is notified and can release and re-assign (OQ-P14) |
| T8 | UPI ID scraped | Medium | Medium | Opt-in; `debtors_only` default; built server-side; R1a: the web page shows no UPI IDs at all; R1b: only a web-claimed debtor, for their own debt ([D-024](decisions/D-024-web-page-read-only-beta.md)) |
| T9 | Malicious deep link triggers a payment record | Medium | High | Links only navigate; every money action needs an in-app confirm (§7) |
| T10 | Phishing app claims `toli.in` links | Low | Medium | Verified App Links / Universal Links; `toli://` carries IDs only |
| T11 | Service role key leaked | Low | Critical | Only in Edge Function secrets; secret scanning; rotation runbook |
| T12 | Receipt photo reveals home location | Medium | Medium | EXIF/GPS stripped on the phone |
| T13 | Presigned URL shared | Low | Low | 5-minute expiry, one object (avatars in pushes 24 h, public recap thumbnails 1 h) |
| T14 | Malicious upload (huge file, wrong type) | Medium | Low | Size/type/sha256 checks on issue and confirm; PDFs never rendered server-side |
| T15 | Reminder / invite spam | Medium | Medium | 48-hour limit, rate limits, mute |
| T16 | PII in analytics or crash logs | Medium | Medium | Scrubbers, allow-listed event properties, review ([10 §3](10-observability.md)) |
| T17 | Lost or stolen phone | Medium | Medium | Session in secure storage; OS sandbox encryption; sign-in elsewhere doesn't expose other trips; future: "sign out other devices" |
| T18 | Receipt sent to an LLM that trains on it | Low | High | Paid tier, zero-retention contract before F4 ships |
| T19 | Supabase data loss (free tier has no backups) | Low | Critical | Nightly `pg_dump` to R2; restore drill monthly ([12 §6](12-environments-and-deployment.md)) |
| T20 | Testing on production data / preview key hits production | Low | High | Separate projects, keys and buckets per environment; QA only on Preview with seed data; testers are real users on production ([12](12-environments-and-deployment.md), [D-016](decisions/D-016-testing-distribution.md)) |
| T21 | Supply-chain attack via npm package | Low | High | Lockfile, Dependabot, pinned versions for native modules, review before upgrading notify-kit |
| T22 | Balance-correctness bug looks like an attack | Medium | Critical | Nightly balance audit; P0 alert; `balance_dispute_reported` ([10 §9](10-observability.md)) |

---

## 14. Incident response basics

| Severity | Examples | Response |
|---|---|---|
| **P0** | Data exposed across trips, balance audit failure, service key leaked, money shown wrongly | Founder paged immediately; fix or mitigate within hours |
| **P1** | Sync broken for many users, backup failed, invite page down | Same day |
| **P2** | One feature degraded (places, FX, receipt scan) | Next working day |

**Steps**
1. **Detect** — Sentry alert, UptimeRobot, nightly audit, user report.
2. **Contain** — rotate the leaked key; revoke invites; turn off the feature by PostHog flag or `426` for a bad app version; pause `sync-push` writes for one trip if needed (ops stay safe in outboxes).
3. **Fix** — ship a server fix, or an EAS Update for JS-only fixes.
4. **Recover** — restore from the nightly backup if needed; re-run the balance audit.
5. **Notify** — personal data breach → the Data Protection Board and affected users without delay (DPDP); balance incidents → affected groups in plain language.
6. **Learn** — a short write-up in `docs/incidents/` within 3 days: what happened, why, what we changed.

**Runbooks to write before public launch:** rotate the service role key; rotate R2 keys; restore from backup; revoke all invites for a trip; force upgrade.
