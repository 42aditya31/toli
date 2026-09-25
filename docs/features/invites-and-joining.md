# Feature · Invites and joining

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a:** link + code, join and claim **in the app**, **read-only** web invite page. **R1b:** paying from the web page through a limited web membership ([D-018][d018], [D-024][d024]). The testing phase uses the APK flow from [D-016][d016] |
| **PRD refs** | [F2][prd] (invite link, view before install, claim), §13 (onboarding and invite flow), §4 (Participant persona), §6.2 (acquisition, virality), §18 (what's visible) |
| **Related** | Screens: [invite-web](../screens/invite-web.md) · [join-in-app](../screens/join-in-app.md) · [welcome](../screens/welcome.md) · [members](../screens/members.md) · [trip-home](../screens/trip-home.md) · [trip-settings](../screens/trip-settings.md) — Docs: [03 §4.3 `trip_invites`, §4.2 `claimed_via`][db] · [04 §3 invites, §5.1 `/upi-link`, §5.1b `/web-settlement`, §10 Worker][api] · [06 §3.3 snapshot][sync] · [09 §2.3 permission matrix, §6 invite security][perm] · [02 §5.2][arch] — Decisions: [D-007][d007] · [D-008][d008] · [D-016][d016] · [D-024][d024] · [D-031][d031] — Features: [members-and-ghosts](members-and-ghosts.md) · [auth-and-identity](auth-and-identity.md) · [settle-up](settle-up.md) |

---

## 1. Purpose

Gets friends from a WhatsApp message to **"what do I owe?"** with no install and no account, and then into the app on **their own spot** with all history attached.

Each trip has **one active invite**. It has two forms:
- a **link** with a long random token: `toli.in/t/<token>`;
- a short **code** a human can type: `GOA-7K2PXQ`. The prefix is cosmetic; people only need to type the **6 random characters** (`7K2PXQ`) ([D-008][d008], [03 §4.3][db]).

## 2. User problem

Neha didn't choose this app. She got a link in the group chat. She won't make an account to find out a number. If she has to install first, she probably won't, and Aditya is left chasing her.

## 3. Business goal

- **Acquisition:** ≥ 60% of installs come from invite links.
- **Virality:** ≥ 55% of invited members install and claim; k-factor ≥ 2.5.
- **Completion:** people who can see their amount from the link settle faster (G2).

## 4. User flow

### 4.1 Sharing the trip
1. Trip home → **Invite**.
2. The app gets the trip invite from `POST /invite-create`. Every member gets the **same** current link (no rotation).
3. The native share sheet opens with WhatsApp-friendly text, e.g.:
   > Goa Weekend is on Toli. See what you owe, no app needed: https://toli.in/t/… · or type code **7K2PXQ** in the app.
4. An organiser who hasn't saved their account yet is nudged to **Save my account** ([D-007][d007], OQ-P20).
5. WhatsApp shows a preview card (trip name, "See what you owe") from `GET /og/t/:token.png`.

### 4.2 Friend opens the link (web, no install) — R1a, read-only
1. Tap the link → the invite page (a Cloudflare Worker) loads: "Aditya added you to **Goa Weekend**", dates · people · amount spent.
2. "**Which one are you?**" → a list of names → tap **Neha**.
3. Neha's card: "Neha, you owe Aditya **₹1,200**", with **her own** lines that make it up (`/invite-member-view`).
4. The page ends with **Get the Toli app** / **Open in app**: "Pay and track it in the app. Your history comes with you when you claim your spot."
5. There's **no** claim, **no** UPI button and **no** "I paid" on the web page in R1a ([D-024][d024]).

### 4.3 Friend pays from the web page — R1b
1. After picking **Neha**, the page shows a Turnstile check, signs the browser in anonymously and claims a **limited web membership** (`/join` with `via: "web"`, `claimed_via = 'web'`).
2. **Pay ₹1,200 via UPI** → `/upi-link` for **Neha's own debt only** → her UPI app → back on the page: "**Did the payment go through?**" → **Yes, I paid** / **Not yet**. On a non-INR trip there's no UPI button.
3. **Yes, I paid** goes through `/web-settlement`, capped at what Neha owes. It's recorded as **"Pending · waiting for Aditya to confirm"** and doesn't change balances until Aditya confirms it in the app.
4. The organiser is told about every web claim and can **Release** it (several at once if needed).
5. **Open in app** carries a one-time spot key, so the claim moves to the app with Neha's history ([04 §3.4][api]).

### 4.4 Friend joins in the app
1. **Via link, app already installed:** the link opens the app directly (App Links / Universal Links) on the join screen.
2. **Via link, not installed:** install, then the app brings them back to the same trip (deferred deep link, §6.4). If that fails, they type the code.
3. **Via code:** Welcome → **I have an invite link** (or trips list → **Join trip**) → type `7K2PXQ` (a typed "GOA-" is ignored).
4. The app shows the trip preview and "**Which one are you?**" (unclaimed ghosts only).
5. Tap **Neha** → `POST /join` with `claim_member_id` → `GET /trip-snapshot` → the trip opens with Neha's full history.
6. Not on the list → **I'm not on this list** → type a name → joins as a new member.

### 4.5 Testing phase (APK, D-016)
1. The founder shares the APK on WhatsApp or Drive. Friends install it (allowing "install unknown apps").
2. First open silently creates an anonymous account ([auth-and-identity](auth-and-identity.md)).
3. The organiser shares the invite as normal. The link points at the free `*.workers.dev` address.
4. Friends either tap the link (it opens the app if App Links are verified against the tester APK's signing key, EAS profile `beta`) **or** tap **I have an invite link** and type the code.
5. "Which one are you?" → claim.
6. If someone reinstalls, the organiser **releases** their spot and they claim it again ([members-and-ghosts](members-and-ghosts.md)).

## 5. Requirements

| ID | Requirement | Level | Release | PRD / decision |
|---|---|---|---|---|
| IJ-1 | One shareable **trip invite link**, via the native share sheet, optimised for WhatsApp. | MUST | R1a | F2 |
| IJ-2 | An invited person sees the trip summary and **their own** amount and lines, read-only, **before installing or registering**. No account, no install, no wall. | MUST | R1a | F2, §13, [D-024][d024] |
| IJ-3 | On joining **in the app**, the user claims a specific ghost ("Which one are you? → Neha"), and all history transfers without recomputation. | MUST | R1a | F2 |
| IJ-4 | "Open in app" → install → a deferred deep link returns them to the same trip (where the platform allows, §6.4). | MUST | R1a | §13 |
| IJ-5 | A short human **code** works everywhere a link does (APK testers, iOS, typed from a friend's screen). Only the 6 random characters need to be typed. | MUST | R1a | [D-008][d008], [D-016][d016] |
| IJ-6 | Invites **expire** (30 days after the trip's end date, or 60 days if there's no end date) and can be **rotated** by the organiser. | MUST | R1a | [D-008][d008] |
| IJ-7 | The public page never shows phone numbers, emails, user IDs or UPI IDs. `/invite-preview` returns **names and the trip total only**; per-member numbers come only from `/invite-member-view`. | MUST | R1a | §18, [D-024][d024] |
| IJ-8 | Wrong-code guessing is rate-limited (10 wrong codes per IP per hour, plus a global alarm and slowdown at 500 wrong codes per hour). | MUST | R1a | [D-008][d008], [04 §3.2][api] |
| IJ-9 | The web page pays via a `upi://pay` link (INR trips only), for the viewer's **own** debt only, and asks "Did the payment go through?". Web payments stay **pending until the payee confirms**. It never implies Toli verified anything. | MUST | **R1b** (moved from R1) | F6, §14, [D-024][d024] |
| IJ-10 | Browser claims are a **limited web membership**: Turnstile check, at most 5 web claims per trip per hour, the organiser notified of each one with **Release** (including bulk release). | MUST | **R1b** | [D-024][d024] |
| IJ-11 | The invite page is light (~20 KB server-rendered) and mobile-first (max width 480 px). | SHOULD | R1a | [04 §10][api], [13 §8][ds] |
| IJ-12 | "Their name pre-identified where possible" on the web page. | SHOULD | later | §13 |

## 6. Business rules

### 6.1 The invite
- **One active invite per trip.** Rotating revokes the old one ([03 §4.3][db]).
- **Token:** 128-bit random, URL-safe. Looked up by its SHA-256 hash (`token_hash`) and also stored encrypted with a server key (`token_encrypted`), so `/invite-create` without `rotate` returns the **current** link and every member re-shares the same one. Only Edge Functions can decrypt it.
- **Code:** a cosmetic 3-letter prefix from the trip name ("GOA") plus **6 random characters** from a 31-character alphabet without look-alikes (no `0/O/1/I/L`), about 887 million combinations. Only the 6 characters are checked; a typed prefix is ignored. Typing is forgiving: lowercase is upper-cased, dashes and spaces are ignored.
- **Rotation:** organiser only.
- **Expiry:** `expires_at` = 30 days after `end_date`, or 60 days after creation if there's no end date.
- **Scope:** the token or code can only preview this trip and join/claim within it.

### 6.2 What the web viewer sees
- `GET /invite-preview` ([04 §3.2][api]): trip name, dates, base currency, total spent, member count, the organiser's first name, and each member's name and ghost flag. **No balances, no per-person numbers.**
- Picking a member calls `GET /invite-member-view`: **that** member's net, the lines that make it up, and what they owe whom. **No UPI ID.**
- Accepted trade-off ([D-008][d008]): anyone holding the link can look up any member's own view. Rotation is the fix if a link leaks. This is disclosed in the privacy notice.

### 6.3 Claiming
- **In the app** (R1a): `POST /join` with `claim_member_id` creates a full member (`claimed_via = 'app'`). First claim wins; later attempts get `already_claimed`.
- **On the web** (R1b only): picking a name is only for viewing. Paying claims a **limited web membership** (`claimed_via = 'web'`). It can only call `/invite-member-view`, `/upi-link` and `/web-settlement` for **its own** debt. It can't read trip tables, push ops, download files or see the invite ([D-024][d024]). If the spot is already claimed, the page shows "This spot is taken. Open the Toli app or ask the organiser."
- **No approval** (OQ-P14): the organiser is notified ("Neha claimed her spot") and can **Release** a wrong claim ([04 §3.5][api]).
- Joining without a claim creates a new claimed member with the given `display_name`.
- `/join` is idempotent: joining again returns the same member.
- Claiming is allowed in any trip status, including `settled` (PRD §8).
- "Former member" spots can't be claimed (OQ-P21).

### 6.4 Deep links, per platform

| Platform / install path | Link opens the installed app | Deferred (not yet installed) | Fallback |
|---|---|---|---|
| **Android, Play Store** | App Links (`assetlinks.json` with the Play signing key) | **Play Install Referrer**: the store link carries the code; on first open the app reads it and goes to the join screen with the code filled in | Type the code |
| **Android, APK (testing)** | App Links, when `assetlinks.json` lists the **tester APK** (`beta`) signing key ([D-016][d016]) | None: no store, no referrer | The page shows the code in big type with **Copy code**; the app's join screen offers **Paste code** |
| **iOS** | Universal Links (`apple-app-site-association`) | None built in (Firebase Dynamic Links is shut down) | Same as APK: copy the code on the page, paste or type it in the app |
| **Any, link opened in a browser** (verification failed) | — | — | The web page works on its own; "Open in app" tries the link again, and the code is always visible |

- Paste is **user-initiated** (a tap on **Paste code**), never a silent clipboard read on launch.
- If the app is already signed in and a member of that trip, a link opens the trip directly.
- Branch's free tier is the documented fallback if deferred links on iOS turn out to matter ([tech stack §5.7][stack]).

## 7. Data model

| Table | Columns |
|---|---|
| `trip_invites` ([03 §4.3][db]) | `id`, `trip_id`, `code`, `token_hash`, `token_encrypted`, `created_by_user`, `expires_at`, `revoked_at`, `uses`, `created_at`. **No client access**; Edge Functions only. |
| `trip_members` | `user_id`, `claimed_at`, `claimed_via` (`app` / `web`) set by `/join` |
| `trip_member_secrets` | server-only `web_spot_key_hash` for the R1b web → app hand-over |
| `trip_balances` | read by `/invite-member-view` (never recomputed in the Worker) |
| `settlements` | R1b: `pending_confirmation = true` for web payments until the payee confirms |
| `trip_ops` | `member.claim`, `member.release` (server-only ops); R1b `settlement.create` from `/web-settlement` |
| `rate_limit_buckets` | wrong-code, preview and web-claim limits |
| Local (`kv`) | the trip's current invite URL and code, so the phone can share them offline |

## 8. API requirements

| Endpoint | Source | Release | Used for |
|---|---|---|---|
| `POST /invite-create` | [04 §3.1][api] | R1a | Returns the current invite, or a new one with `rotate: true` (organiser). Returns `{ code, url, expires_at }`. |
| 🌐 `GET /invite-preview?token=` / `?code=` | [04 §3.2][api] | R1a | Names and total only; used by the web page and the in-app join preview |
| 🌐 `GET /invite-member-view?token=&member_id=` | [04 §3.3][api] | R1a | "Which one are you? → Neha": that member's own lines (no UPI ID) |
| `POST /join` | [04 §3.4][api] | R1a (app) · R1b (`via: "web"`) | Join and claim; then `GET /trip-snapshot` in the app |
| `POST /member-release` | [04 §3.5][api] | R1a | Organiser frees a wrong claim |
| `POST /upi-link` | [04 §5.1][api] | R1b on the web | Only for the web member's own debt; `reason: "not_inr"` on non-INR trips |
| `POST /web-settlement` | [04 §5.1b][api] | R1b | "Yes, I paid" from the web page, pending until the payee confirms (`settlement.confirm`) |
| Worker `GET /t/:token`, `GET /j/:code` | [04 §10][api] | R1a | The public invite page |
| Worker `GET /og/t/:token.png` | [04 §10][api] | R1a | WhatsApp preview card |
| Worker `/.well-known/assetlinks.json`, `/.well-known/apple-app-site-association` | [04 §10][api] | R1a | App Links / Universal Links |

## 9. UI requirements

| Screen | Needs |
|---|---|
| [invite-web](../screens/invite-web.md) | **R1a:** "Aditya added you to"; trip name; "12 – 15 Oct · 4 people · ₹6,000 spent"; "**Which one are you?**" list (avatar, name, ›); "No app or account needed to see what you owe."; lime owe card "Neha, you owe Aditya ₹1,200" with her lines; **Get the Toli app** / **Open in app**; "Your history comes with you when you claim your spot."; the code in big type with **Copy code**. **R1b adds:** Turnstile; **Pay ₹1,200 via UPI**; "Opens your UPI app with Aditya's UPI ID and the amount filled in."; "Did the payment go through?" / "Toli can't see UPI payments, so we record what you tell us. Aditya will confirm it." / **Yes, I paid** / **Not yet**; "Recorded · waiting for Aditya to confirm". |
| [join-in-app](../screens/join-in-app.md) | Code input (6 characters, auto-uppercase, **Paste code**); preview card (trip, organiser, dates, people); "Which one are you?" with claimed members greyed ("On Toli"); **I'm not on this list** → name input; loading while the snapshot downloads |
| [welcome](../screens/welcome.md) | Secondary action **I have an invite link** |
| [trip-home](../screens/trip-home.md) / [empty-trip](../screens/empty-trip.md) | **Invite** button; empty-trip tip "Share the link so friends can see what they owe, no install." |
| [members](../screens/members.md) / [trip-settings](../screens/trip-settings.md) | Invite section: link, code, **Share**, **Copy code**, **New link** (rotate, organiser), expiry date |

## 10. States

| State | Web page | App |
|---|---|---|
| Valid invite | Trip + "Which one are you?" | Preview + picker |
| Member picked, owes | Owe card + **Get the Toli app** (R1b: + Pay via UPI, INR trips only) | — |
| Member picked, owed money | "You get back ₹3,400" + who pays | — |
| Member picked, square | "You're all square." + SQUARE stamp | — |
| R1b · spot already claimed | "This spot is taken. Open the Toli app or ask the organiser." | Claimed members greyed ("On Toli") |
| R1b · opening UPI | Spinner "Opening your UPI app…" | — |
| R1b · confirm | "Did the payment go through?" | — |
| R1b · recorded | "Recorded · waiting for Aditya to confirm" | Payee sees **Confirm** on the pending payment |
| Expired (`invite_expired`) | "This invite has expired. Ask Aditya for a new one." | Same |
| Revoked / unknown (`invite_invalid`) | "This link doesn't work any more. Ask Aditya for the new one." | "That code doesn't match a trip. Check it and try again." |
| Rate-limited | "Too many tries. Wait a bit and try again." | Same |
| Joining | — | Spinner, then the trip opens |
| Already a member | — | Opens the trip directly |

## 11. Edge cases

- **Two people claim the same ghost** in the app: first wins; the second sees `already_claimed` with an "ask Aditya to release it" hint. The organiser is notified of every claim (OQ-P14).
- **Claimed the wrong name:** organiser releases; person re-claims ([members-and-ghosts](members-and-ghosts.md)).
- **Invite rotated while a friend has the page open:** the next action fails with `invite_invalid`; the page explains and asks for the new link.
- **Trip deleted:** preview returns `invite_invalid`.
- **Trip settled:** the page still works and shows everyone square; claiming in the app still works.
- **Friend opens the link on a laptop:** the read-only page works. In R1b, **Pay via UPI** is hidden on desktop (UPI intents need a phone) and replaced by "Open this on your phone to pay".
- **Link opened inside WhatsApp's in-app browser (R1b):** `upi://` may be blocked; show "Open in browser" help if the UPI app doesn't open.
- **R1b · someone claims many ghosts from a browser:** Turnstile and the 5-per-hour limit slow it down; the organiser can release them all at once.
- **Offline member taps Invite:** if the invite was fetched before, share the cached link and code; otherwise "You're offline. Invites need a connection the first time."
- **The anonymous account doesn't exist yet** (first open offline) and the user tries to join: "Connect to the internet to join a trip."
- **Joiner already has a local trip with the same people:** nothing is merged; they're separate trips.
- **Code typed with a look-alike** ("7K2PXO"): the alphabet excludes both O and 0, so show "That code doesn't match a trip."
- **Domain change** (`workers.dev` → the real domain): links already shared during testing stop working. Accepted for the test; buy the domain before invites leave the testing group (OQ-P5).

## 12. Permissions

Who can share, rotate, release, and what a **web viewer** can do (R1a: read-only; R1b: pay only their own debt, pending) is defined **only** in the [permission matrix, 09 §2.3][perm] ([D-031][d031]). In short: any member shares the same link; only organisers rotate it and release spots; a web viewer sees only names, the total and the member view they pick.

## 13. Offline behaviour

- The web page needs the internet (it's a web page).
- In the app, joining needs a connection (`/invite-preview`, `/join`, `/trip-snapshot`).
- Sharing works offline if the invite was fetched earlier (URL and code cached locally).

## 14. Sync behaviour

- `/join` writes the server-only op `member.claim` into `trip_ops`. Other phones see "Neha joined the trip and claimed her spot" on their next pull.
- The joining phone uses `GET /trip-snapshot` (not a full pull from seq 0), then normal pulls.
- The member view reads the `trip_balances` cache, so it reflects every **synced** change. Changes still sitting in someone's outbox aren't visible on the web yet.
- R1b: `/web-settlement` writes `settlement.create` with `pending_confirmation = true` through the same path as `sync-push`. It counts in balances only after the payee's `settlement.confirm` ([06 §4][sync]).

## 15. Analytics

| Event (PRD §19) | When | Properties |
|---|---|---|
| `invite_shared` | share sheet completed | `channel` (whatsapp, copy, other) |
| `invite_link_opened` | web page or app opened from a link/code | `installed?` (true when the app handled it) |
| `member_claimed` | `/join` with a claim succeeds | (proposed: `via`: app \| web) |
| `upi_link_tapped` | **Pay via UPI** on the web page (R1b) | (proposed: `surface: web`) |

Proposed, not in §19: `invite_member_viewed` (a name picked on the web page), `get_app_tapped`. PostHog on the web page must be cookieless or consent-gated (DPDP); see [account-and-privacy](account-and-privacy.md).

## 16. Error handling

| Code | HTTP | Message |
|---|---|---|
| `invite_invalid` | 404 | "This link doesn't work any more. Ask Aditya for the new one." |
| `invite_expired` | 410 | "This invite has expired. Ask Aditya for a new one." |
| `already_claimed` | 409 | "Neha's spot was just claimed. If that wasn't you, ask Aditya to release it." |
| `rate_limited` | 429 | "Too many tries. Wait a bit and try again." |
| `not_organiser` (rotate) | 403 | "Only Aditya can make a new link." |
| R1b · UPI app didn't open | — | "No UPI app opened. Open your UPI app and pay Aditya directly, then come back and tell us." |
| R1b · `/web-settlement` fails | — | "Recording…" then retry with the same Idempotency-Key; "We couldn't record that. Try again." |

## 17. Testing

- **Security:** token entropy; the token is stored only as a hash plus server-encrypted; `/invite-preview` returns names and the total only, and neither endpoint returns phones, emails, user IDs or UPI IDs (response-schema test); wrong-code limit enforced per IP and the global alarm fires; rotated tokens fail.
- **R1a read-only:** the web page has no claim, UPI or "I paid" path; no browser session can reach trip tables.
- **R1b limited membership:** `claimed_via = 'web'` never passes `my_trip_ids()` (pgTAP); `/upi-link` and `/web-settlement` only work for the member's own debt, capped at the suggested amount; pending settlements don't change balances until confirmed; 5 web claims per trip per hour.
- **Deep links:** App Links verified for the tester APK (`beta`) key and the Play key; Universal Links on iOS; Play Install Referrer carries the code through a real Play internal-test install.
- **Join:** idempotent re-join; concurrent claims (exactly one wins); join on a settled trip; join without claim creates a member; 6-character code with and without a prefix.
- **Web page:** renders under 20 KB; works with JavaScript disabled for the read-only part; tested in WhatsApp's in-app browser and Chrome on a low-end Android.
- **E2E (D-016 test):** 5–6 real phones, APK install → code join → claim → first expense visible on everyone's phone.

## 18. Future considerations

- Per-person invite links ("this link is for Neha") so the page can pre-identify the viewer (PRD §13 "where possible").
- QR code on the organiser's screen for "join by scanning" at the table.
- Branch (or similar) for iOS deferred deep links.
- Phone OTP when claiming (PRD §13), once phone login ships ([auth-and-identity](auth-and-identity.md)).

## 19. Open questions

Resolved:
- Paying from the web page: not in R1a (read-only page); in R1b through a limited web membership, pending until the payee confirms ([D-024][d024], OQ-P8).
- What the preview returns: names and the total only; per-member numbers only from `/invite-member-view` ([D-024][d024]).
- Code alphabet: people type only the 6 random characters ([D-008][d008]).
- Claim approval: none; the organiser is notified and can Release (OQ-P14).
- Re-sharing: every member gets the same link from `token_encrypted` ([03 §4.3][db]).

Still open:
1. **Domain:** the UI reference shows `toli.app/t/…`; [04][api] uses `toli.in`. Buy one before invites leave the testing group (OQ-P5, an action).
2. **Pre-identifying the viewer** (PRD §13) isn't possible with one shared link. Accept, or remember the last pick in the browser?
3. **Joining without claiming:** should the new member get a `joined_from` of today by default?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[stack]: ../superpowers/specs/2026-09-24-toli-tech-stack.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[ds]: ../13-design-system.md
[perm]: ../09-security.md#permission-matrix
[d007]: ../decisions/D-007-auth.md
[d008]: ../decisions/D-008-invite-links.md
[d016]: ../decisions/D-016-testing-distribution.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d024]: ../decisions/D-024-web-page-read-only-beta.md
[d031]: ../decisions/D-031-permission-matrix.md
