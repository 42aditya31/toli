# Feature · Toli Pro: per-trip pass (§15)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 (purchase and Pro gates; [01 §6](../01-overview.md#6-scope), [D-018](../decisions/D-018-r1a-r1b-scope.md)); Annual plan later. Beta testers on the sideloaded APK get Pro by **grant** |
| **PRD refs** | §15 (monetisation), §5.1 (money is free forever), §6.2 (Pro attach ≥ 8%), §19 (`pro_paywall_viewed`, `pro_purchased`), §20 (R2 criterion "Pro attach rate measurable"), §21 (low willingness to pay), §22.2 (price test) |
| **Related** | Screens: [pro-sheet](../screens/pro-sheet.md) · [trip-home](../screens/trip-home.md) · [receipt-scan](../screens/receipt-scan.md) · [recap](../screens/recap.md) · [vault](../screens/vault.md) · [settings-profile](../screens/settings-profile.md) · Docs: [03 §4.1, §9](../03-database-schema.md) · [04 §1, §7](../04-api-schema.md) · [01 OQ-P7](../01-overview.md#open-questions) · Features: [receipt-scan](receipt-scan.md) · [export](export.md) · [vault](vault.md) · [feed-and-recap](feed-and-recap.md) |

---

## 1. Purpose

Charge for **convenience**, never for money. One purchase unlocks Pro features for **one trip, for every member**, at an impulse price.

## 2. User problem

- Travel is episodic; a yearly subscription for an occasional need feels like a trap.
- The Organiser feels the pain (a pile of receipts, the export for the office) and is willing to pay once, but not to pay for everyone separately.

## 3. Business goal

- **Pro pass attach ≥ 8%** of settled trips (PRD §6.2); R2 ship criterion: attach rate measurable (PRD §20).
- Revenue pays for the features with real marginal cost (receipt inference, large vault storage).
- **One purchase covers the whole trip:** the buyer feels generous, and every other member gets a free trial of Pro (PRD §15).
- Validate the price with an **A/B test of ₹99 / ₹149 / ₹199** using PostHog feature flags (PRD §22.2; decided in OQ-P7, [01](../01-overview.md#open-questions)).

---

## 4. User flow

**Buy a pass**
1. A member taps a Pro feature (**Scan bill · PRO** at the top of the itemised list, Export, Advanced analytics, Recap theme, or adds a document past 1 GB).
2. The **Pro sheet** ([screens/pro-sheet](../screens/pro-sheet.md)) opens, about that feature: "Scan bills and split by item" → "Unlock Pro for **Goa Weekend** · **₹149** once · covers all **4** of you" → **Unlock Pro**, and a small "Not now". A list of what else Pro includes is below the fold.
3. The store's own purchase sheet opens (Google Play Billing on Android, App Store In-App Purchase on iOS).
4. On success, the app sends the purchase token to `POST /pro-verify { trip_id, store, purchase_token }`.
5. The server verifies it with Google Play / Apple, records a `pro_passes` row, sets `trips.is_pro = true`, writes a `trip.pro_activated` op to the trip log, and returns `{ is_pro: true }`.
6. The phone acknowledges (Play) / finishes (Apple) the transaction **only after** the server confirms.
7. Every member's app unlocks Pro for that trip on their next pull. The trip shows a small `PRO` label; the buyer sees a toast "Pro unlocked for everyone on Goa Weekend".

**Grant a pass (team only)**
1. Beta testers use a sideloaded APK with no store billing ([D-016](../decisions/D-016-testing-distribution.md)). The team grants Pro to a tester's trip on the server.
2. The server writes a `pro_passes` row with `store = 'grant'` (no store transaction, `price_minor = 0`), sets `trips.is_pro = true` and writes `trip.pro_activated`, exactly like a purchase. The phone never unlocks Pro by itself (PP-05).

**Annual plan (later)**
1. After a user has bought **two** trip passes, the Pro sheet on their next trip also shows "Toli Pro Annual · ₹499/year · all your trips" as a savings offer, never as a wall.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| PP-01 | A **per-trip** Pro pass, one-time purchase, price **₹149** by default (to be validated). | MUST | §15 |
| PP-02 | **One purchase covers every member** of that trip. | MUST | §15 |
| PP-03 | Price test **₹99 / ₹149 / ₹199** via **PostHog feature flags**, one variant per user, sticky. | MUST | §22.2, [tech stack §5.12](../superpowers/specs/2026-09-24-toli-tech-stack.md) |
| PP-04 | Purchases go through **Google Play Billing** and **App Store In-App Purchase** only (digital goods rules). | MUST | §15 |
| PP-05 | Every purchase is verified **server-side** with the store (`/pro-verify`) before Pro unlocks. The client never unlocks on its own. | MUST | [04 §7](../04-api-schema.md) |
| PP-06 | Pro features: receipt scanning (fills the itemised split; itemising by hand is free from R1b, [D-017](../decisions/D-017-itemised-free-scan-pro.md)); advanced analytics (the burn-down stays free, OQ-P18); CSV and PDF export; custom recap themes and unbranded recap sharing; unlimited vault storage (free: 1 GB per trip); priority support. | MUST | §15 |
| PP-07 | The **always-free** list (§6) is never gated, metered or nagged. **Nothing on the money path is ever paywalled.** | MUST | §5.1, §15 |
| PP-08 | **Toli Pro Annual ₹499/year**: all Pro features on all the user's trips, plus cross-trip analytics and history; offered **only after** the user has bought two trip passes. | SHOULD (post-R2) | §15 |
| PP-09 | No ads, ever. No selling data. | MUST NOT | §15 |
| PP-10 | Log `pro_paywall_viewed` (feature) and `pro_purchased`. | MUST | §19 |
| PP-11 | Restore: a pass is tied to the trip on the server, so it survives reinstalls and new phones with no "restore" step. | MUST | §15 (proposal) |
| PP-12 | The team can **grant** Pro to a trip (`pro_passes.store = 'grant'`), e.g. for beta testers who have no store billing. | MUST | OQ-P21 |

---

## 6. What is Pro and what is always free

| Always free (PRD §15), never limited | Pro (per trip) |
|---|---|
| Unlimited trips, expenses; up to 50 members per trip | Receipt **scanning**, which fills the itemised split ([receipt-scan](receipt-scan.md)) |
| Every split mode, including itemised by hand (R1b, [D-017](../decisions/D-017-itemised-free-scan-pro.md)); multiple payers; refunds | Advanced analytics: day-by-day, category trends, per-person comparison (PRD F9, OQ-P18) |
| The kitty | CSV and PDF export ([export](export.md)) |
| Live balances, balance trace | Custom recap themes, unbranded recap sharing ([feed-and-recap](feed-and-recap.md)) |
| Simplified/direct settlement, UPI links, reminders | Unlimited vault storage (free is 1 GB per trip) ([vault](vault.md)) |
| Multi-currency ([multi-currency](multi-currency.md)) | Priority support |
| Receipt **photos** | |
| Itinerary, places, map; budget and the burn-down chart ([budget](budget.md)) | |
| Bookings, documents (up to 1 GB/trip), offline access | |
| Trip feed, the standard recap and its public link | |
| Notifications | |
| Account data export and deletion ([account-and-privacy](account-and-privacy.md)) | |

---

## 7. Business rules

1. **Scope:** a pass belongs to a **trip** (`pro_passes.trip_id`), not to the buyer. `trips.is_pro` is true while at least one non-refunded pass exists.
2. **Forever for that trip:** a Pro trip stays Pro after it settles or is archived (e.g. export a year later).
3. **Store products:** one consumable product per price variant (e.g. `pro_trip_pass_99`, `pro_trip_pass_149`, `pro_trip_pass_199`), because a user buys one per trip. The PostHog flag picks which product the sheet shows. Store prices include taxes, as the stores require in India.
4. **Price-variant assignment (the A/B test):** by user (PostHog distinct ID), sticky across trips, with the flag `pro_price_variant` ∈ {99, 149, 199}. The price shown and charged must be the same product; the flag never changes the price of an open sheet.
   - **Grants:** a `grant` pass counts like any other for `trips.is_pro`, but it is **excluded** from attach-rate and price-test metrics and never counts toward Annual eligibility (rule 11). It can be revoked by the team (sets `refunded_at`, writes `trip.pro_revoked`).
5. **Double purchase on one trip** (two members buy at the same moment): the second `/pro-verify` sees the trip is already Pro. It still records the pass, then refunds it through the store API (Play: `purchases.products` refund/revoke; Apple: refund request is user-initiated, so we show "You've been charged twice, tap to get a refund" and handle it through support). See Open question 2.
6. **Pending purchases** (Play "pending" payment methods, e.g. some UPI flows in Play): Pro unlocks only when the purchase becomes `PURCHASED` and is verified.
7. **Acknowledge in time:** Play auto-refunds purchases not acknowledged within 3 days, so verification is retried in the background until it succeeds.
8. **Refunds and chargebacks:** the store notifies `/pro-webhook`, which sets `pro_passes.refunded_at`, recomputes `trips.is_pro` and writes a `trip.pro_revoked` op. Pro features lock again for new actions; **nothing already created is removed** (scanned expenses, exports, recaps stay).
9. **Never charge for a failed scan** (PRD §21): see [receipt-scan](receipt-scan.md) RS-13.
10. **Paywall etiquette:**
    - The Pro sheet appears **only** when a user taps a Pro feature. Never on app open, never inside Add expense or Settle up flows, never as a timer or countdown.
    - A `PRO` tag marks Pro entry points ([13 §3 `type.label`](../13-design-system.md)).
    - "Not now" is always one tap.
11. **Annual plan eligibility:** count of the user's non-refunded, **store-bought** `pro_passes` (not `grant`) ≥ 2.
12. **Who can buy:** see §13 (anonymous accounts included; the store account pays).
13. **Priority support:** Pro trips get a **Contact support** row that tags the email (via Resend, `hello@`) with the trip ID and Pro status.

---

## 8. Data model

| Table | Use | Status |
|---|---|---|
| `pro_passes` | `id`, `trip_id`, `user_id`, `store` (`play` / `app_store` / `grant`; `grant` = given by the team, e.g. to beta testers), `store_txn_id` UNIQUE, `price_minor`, `currency`, `purchased_at`, `refunded_at` | exists ([03 §9](../03-database-schema.md)) |
| `trips.is_pro` | cached flag, derived from `pro_passes` | exists |
| `pro_subscriptions` | Pro Annual: `id`, `user_id`, `store`, `store_txn_id` UNIQUE, `starts_at`, `expires_at`, `auto_renew`, `revoked_at` | exists ([03 §9](../03-database-schema.md)) |
| **Price variant on the pass** | which test arm (for analysis) | not a column; `price_minor` is enough for the price, but the variant ID should also go to PostHog |

---

## 9. API requirements

| Call | Status | Detail |
|---|---|---|
| `POST /pro-verify` | exists ([04 §7](../04-api-schema.md)) | `{ trip_id, store, purchase_token }` → verifies with Google Play Developer API / App Store Server API → `{ is_pro: true }`; idempotent per `store_txn_id` |
| `403 pro_required` | exists ([04 §1](../04-api-schema.md)) | returned by any server-gated Pro endpoint (e.g. `/receipt-extract`) |
| `trip.pro_activated` / `trip.pro_revoked` ops | exists ([06 §4](../06-syncing.md)) | server-only ops written by `/pro-verify` and `/pro-webhook`, so every member's phone learns `is_pro` on its next pull |
| 🌐 `POST /pro-webhook` | exists ([04 §8a](../04-api-schema.md)) | Google Play RTDN and App Store Server Notifications (refunds, revocations), verified by each store's signature; sets `pro_passes.refunded_at` |
| `POST /trip-export` | exists ([04 §8a](../04-api-schema.md)) | Pro CSV/PDF export ([export](export.md)) |
| PostHog flags | external | `pro_price_variant` ∈ {99, 149, 199} |

---

## 10. UI requirements

Screen doc: [pro-sheet](../screens/pro-sheet.md). The Pro sheet appears from: [receipt-scan](../screens/receipt-scan.md), the **Scan bill · PRO** button at the top of the manual item list in the [split-editor](../screens/split-editor.md) (the Itemised chip itself is free, [D-017](../decisions/D-017-itemised-free-scan-pro.md)), [recap](../screens/recap.md) themes, [vault](../screens/vault.md) quota, analytics on [trip-home](../screens/trip-home.md), export in the trip menu.

**Pro sheet** (bottom sheet, radius 28):
- Headline about the feature the user tapped.
- A lime `TicketCard` with "PRO · GOA WEEKEND", the price in `type.amountL`, and "once · covers all 4 of you".
- Primary **Unlock Pro** (lime), ghost **Not now**.
- "What's included" list, and the line "Money features are free forever. Pro never touches expenses, splits or settling up."
- Small print: "Paid through Google Play. One-time, no subscription."

**After purchase:** toast; `PRO` label on the trip header; the tapped feature opens straight away.

---

## 11. States

| State | Display |
|---|---|
| Free trip | `PRO` tags on Pro entry points |
| Purchase in progress | store sheet; the app shows a spinner "Confirming with Google Play…" |
| Pending payment | "Payment pending. Pro unlocks when it clears." |
| Verified | Pro unlocked for every member |
| Verification failed (network) | "Payment received. Unlocking…" and background retry |
| Verification rejected (invalid) | "We couldn't confirm this purchase." + support link |
| Refunded | Pro features locked again; a quiet note on the trip |
| Offline | Pro sheet says "Buying needs internet"; already-Pro trips work offline |

---

## 12. Edge cases

| Case | Handling |
|---|---|
| Buyer leaves the trip | Pass stays with the trip |
| Buyer deletes their account | Pass stays with the trip; `pro_passes.user_id` handling per [account-and-privacy](account-and-privacy.md) |
| Ghost-only trip (one installed user) | Works; "covers all 5 of you" still true |
| Trip deleted by organiser | Pass lost with the trip; show a warning before deleting a Pro trip |
| Store account country is not India | store handles local price and currency; `pro_passes.currency` records it |
| APK testers (no Play Store) | no store purchases in the sideloaded tester APK (EAS profile `beta`, production backend, [D-016](../decisions/D-016-testing-distribution.md)). Pro is **granted** on the server (`store = 'grant'`, OQ-P21), since the client never unlocks on its own (PP-05) |
| Price variant changes mid-test | existing sheets keep their product; new sheets use the new flag |
| Family Sharing (iOS) | consumables aren't shareable; no impact |

---

## 13. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can buy a pass for the trip and use Pro features on a Pro trip; web viewers and ghosts can't. Only the server (service role) writes `pro_passes` and `trips.is_pro`, including grants; members can read `pro_passes` for their trips (RLS).

## 14. Offline behaviour

- Buying needs the network (store + verification).
- Once a trip is Pro, on-device Pro features (export, analytics, themes) work offline. Server Pro features (scanning) need the network anyway.
- If the purchase completes but verification can't reach the server, it is retried whenever the app is online; the store transaction is not acknowledged until then.

## 15. Sync behaviour

- `trips.is_pro` reaches every member through the server-only `trip.pro_activated` / `trip.pro_revoked` ops ([06 §4](../06-syncing.md)). Until a phone pulls, it may lag; the server remains the gate for server-side features.

---

## 16. Analytics

| Event | Properties | Source |
|---|---|---|
| `pro_paywall_viewed` | `feature` (receipt_scan, export, analytics, recap_theme, vault_storage), `price_variant` | PRD §19 |
| `pro_purchased` | `price_variant`, `store`, `feature` (what triggered it), `member_count`, `trip_status`, `days_into_trip` | PRD §19 |
| `pro_purchase_failed` | `stage` (store, verify), `reason` | proposed |
| `pro_refunded` (server) | `days_after_purchase` | proposed |

Metrics: attach rate = settled trips with ≥ 1 pass / settled trips (target ≥ 8%); conversion by price variant; revenue per settled trip by variant.

## 17. Error handling

| Error | Handling |
|---|---|
| Store: user cancelled | nothing |
| Store: item already owned (unconsumed) | re-run verification for the existing purchase |
| `/pro-verify` network error | background retry with backoff; keep the purchase token securely until done |
| `/pro-verify` invalid token | show support; Sentry |
| Trip no longer exists | refund path via support |

## 18. Testing

- Server: `/pro-verify` against Google Play and App Store sandbox/test accounts; idempotency on `store_txn_id`; double purchase; refund notification → `is_pro` false.
- Client: purchase flow with Play Billing test cards (success, pending, declined); acknowledge only after verify.
- Gating: every Pro entry point checks `is_pro`; every always-free feature is verified **not** gated (a test list mirroring §6).
- Price test: flag assignment is sticky and the sheet shows the matching product.

## 19. Cost and free-tier impact

| Item | Detail |
|---|---|
| Store fees | Google Play and Apple Small Business Program: 15% of the price. India prices include GST, so the net per ₹149 pass is roughly ₹100–110 (to confirm with the finance setup) |
| Server | `/pro-verify` calls; store APIs are free |
| PostHog flags | within the 1M events/month free tier |
| What Pro pays for | receipt inference (≤ ~₹18 per heavy trip), extra R2 storage |

## 20. Future considerations

- Toli Pro Annual ₹499 with cross-trip analytics and history.
- Gift a pass to another trip.
- Group chip-in ("Rahul paid, others can pay him back ₹37 each" as a normal expense). Note: this must stay a normal expense, never Toli collecting money.
- Web checkout (lower fees) once there is a web app, if store rules allow.

## 21. Open questions

**Resolved:**
- **Price:** A/B test ₹99 / ₹149 / ₹199 with PostHog flags (OQ-P7, [01](../01-overview.md#open-questions)).
- **Beta testers:** Pro by grant, `pro_passes.store = 'grant'` (OQ-P21, [03 §9](../03-database-schema.md)).
- **Missing op, webhook, annual table:** `trip.pro_activated` / `trip.pro_revoked` ([06 §4](../06-syncing.md)), `/pro-webhook` ([04 §8a](../04-api-schema.md)) and `pro_subscriptions` ([03 §9](../03-database-schema.md)).
- **Itemised splitting:** by hand is free; scanning is Pro ([D-017](../decisions/D-017-itemised-free-scan-pro.md)).

**Still open (feature-level):**
1. **Price test size:** sample size and duration. Testers on the APK can't buy through a store, so the price test only measures real purchases once Toli is on the Play Store. Until then, testers can only be shown the price (sheet views), not charged.
2. **Double purchases:** refund automatically where the store allows, or offer "move this pass to another trip"?
3. **Buyer account deletion:** keep `pro_passes.user_id` (needed for refunds/tax records) or null it? Retention period for purchase records?
4. Should anonymous (unlinked) accounts be nudged to save their account before buying, so support can find them later?
