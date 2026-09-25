# Screen · Pro sheet

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 (nothing in R1a/R1b is Pro) |
| **Source** | **Assumption**: not in the UI reference. Built from PRD §15, §22.2, [features/pro-pass](../features/pro-pass.md) and [D-017](../decisions/D-017-itemised-free-scan-pro.md); follows [13 Design system](../13-design-system.md) |
| **Related** | [features/pro-pass](../features/pro-pass.md) · [receipt-scan](receipt-scan.md) · [add-expense](add-expense.md) · [split-editor](split-editor.md) · [recap](recap.md) · [vault](vault.md) · [budget](budget.md) · [features/export](../features/export.md) · [04 §7, §8a](../04-api-schema.md) · [03 §9 pro_passes](../03-database-schema.md) · [01 OQ-P7, OQ-P21](../01-overview.md#open-questions) · [D-016 testing](../decisions/D-016-testing-distribution.md) · [permission matrix](../09-security.md#permission-matrix) |

---

## Purpose
**Why:** Pro pays for Toli without ever touching money features (PRD principle 1). A per-trip pass at an impulse price only works if the offer is clear, short and shown at the moment the user wants the feature.
**What:** a bottom sheet that explains the Pro trip pass, shows the price, and hands off to the store's purchase sheet.
**How:** the store product comes from the PostHog price flag; the purchase is verified on the server with `/pro-verify`; `trips.is_pro` then unlocks Pro for **every member** of the trip.

## User goal
"I want to scan this bill (or export, or see more charts). What does it cost, and who does it cover?"

## Entry points
Only when the user taps a Pro feature, never on app open, and never inside the add-expense or settle-up flow unprompted ([features/pro-pass](../features/pro-pass.md)).

| From | Trigger | Headline |
|---|---|---|
| [Add expense](add-expense.md) → BILL tile → choice sheet | **Scan (PRO)** on a free trip (**Attach photo** stays free and never opens this sheet, review U-6) | "Scan bills and split by item" |
| [Split editor](split-editor.md) (Itemised) | **Scan bill · PRO** (typing items by hand is free, [D-017](../decisions/D-017-itemised-free-scan-pro.md)) | same |
| [Receipt scan](receipt-scan.md) | Scan opened on a free trip | same |
| Trip menu | **Export trip** | "Export this trip as CSV or PDF" |
| [Budget](budget.md) / Trip home | Extra analytics charts (OQ-P18: burn-down stays free) | "See where the money went, day by day" |
| [Recap](recap.md) | A Pro theme | "Recap themes" |
| [Vault](vault.md) | Upload that would pass 1 GB (`quota_exceeded`) | "More room for this trip's documents" |

## Exit points
| To | Trigger |
|---|---|
| Store purchase sheet (Google Play Billing; App Store on iOS) | **Unlock Pro** |
| The feature the user tapped | Purchase verified |
| Previous screen | **Not now**, swipe down, back |

## UI structure
`Sheet` (`radius.sheet` top, scrim `color.scrim`), `space.gutter` sides:

| # | Block | Details and copy |
|---|---|---|
| 1 | Headline | `type.header`: the feature headline from the table above |
| 2 | Pass ticket | `TicketCard` lime, perforation, notches. `type.label` "PRO · GOA WEEKEND". Price `type.amountL` **"₹149"** (placeholder; the price test may show ₹99 or ₹199, OQ-P7). Sub: "once · **One pass covers everyone on this trip**" and "all 4 of you" |
| 3 | Primary | `Button` primary **Unlock Pro** (`size.cta`) |
| 4 | Secondary | `Button` ghost **Not now** |
| 5 | What's included | Short list: Scan bills · Day-by-day analytics · Export CSV / PDF · Recap themes · More vault storage |
| 6 | Promise | caption muted: "Money features are free forever. Pro never touches expenses, splits or settling up." |
| 7 | Small print | micro muted: "Paid through Google Play. One-time, no subscription." · link **Restore purchase** |

Later (post-R2): after 2 passes, a row "Toli Pro Annual · ₹499/year · all your trips" is added as an offer, never a wall.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the "What's included" list wraps to one item per line.

## States
| State | Behaviour |
|---|---|
| Default | As above |
| Purchase in progress | Store sheet on top; behind it the button shows a spinner "Confirming with Google Play…" |
| Pending payment | "Payment pending. Pro unlocks when it clears." (sheet can be closed) |
| Verified | Sheet closes, toast "Pro is on for Goa Weekend", `PRO` label on the trip header, the tapped feature opens |
| Verification failed (network) | "Payment received. Unlocking…" with background retry (Play refunds unacknowledged purchases after 3 days) |
| Rejected | "We couldn't confirm this purchase." + support link |
| Offline | Button disabled: "Buying needs internet" |
| Already Pro | Sheet never opens; the feature opens directly. This includes trips given Pro **by grant** |
| Beta tester (sideloaded APK, no Play Billing) | **Beta testers get Pro by grant** (OQ-P21): the team writes a `pro_passes` row with `store = grant`, and the server op `trip.pro_activated` unlocks the trip. The sheet is never shown to them for granted trips. If a tester opens a Pro feature on a trip without a grant: "Pro isn't for sale in this test build. Ask the Toli team to switch it on for this trip." (Assumption) |

## Interactions
| Gesture | Result |
|---|---|
| **Unlock Pro** | Launches the Play Billing flow for the product matching the user's sticky price variant |
| Store success | App calls `/pro-verify`; acknowledges only after the server confirms |
| **Restore purchase** | Re-queries the store for unacknowledged or owned purchases and re-sends them to `/pro-verify`. Normally not needed: a pass belongs to the trip on the server, so it survives reinstalls and new phones |
| **Not now** / swipe | Closes; no nag later in the session |

## Data
- `trips.is_pro`, member count (`trip_members`), trip name.
- PostHog flag `pro_price_variant` ∈ {99, 149, 199}, sticky per user; the product shown is the product charged.
- Local store price string from the Billing library (shown instead of the flag value when available, so taxes and currency match the store).

## API / Database
- `POST /pro-verify` `{ trip_id, store, purchase_token }` → `{ is_pro: true }`, idempotent per `store_txn_id` ([04 §7](../04-api-schema.md)).
- Server writes `pro_passes` and the server-only op `trip.pro_activated`, so every member's phone unlocks ([06 §4](../06-syncing.md)). Refunds arrive through `/pro-webhook` → `trip.pro_revoked` ([04 §8a](../04-api-schema.md)).
- **Grants** (beta testers, support): a `pro_passes` row with `store = grant`, no price, written by the team through a server tool (Assumption), followed by the same `trip.pro_activated` op ([03 §9](../03-database-schema.md)).
- Nothing is written by the phone directly. Who can buy: the [permission matrix](../09-security.md#permission-matrix).

## Edge cases
- **Two members buy at once:** the second verify finds the trip already Pro; the extra pass is refunded ([features/pro-pass](../features/pro-pass.md)).
- **Refund:** Pro features lock for new actions; nothing already made (itemised expenses, exports, recaps) is removed.
- **Settled trip:** buying is still allowed (export and recap themes are useful after the trip).
- **Store account outside India:** the store shows local price and currency.
- **Price flag changes while the sheet is open:** the open sheet keeps its product.

## Analytics
| Event | When |
|---|---|
| `pro_paywall_viewed` | Sheet opens (`feature`, `price_variant`) |
| `pro_purchase_started` | Unlock Pro tapped (proposed) |
| `pro_purchased` | Verified (`price_variant`, `store`, `feature`, `member_count`, `trip_status`, `days_into_trip`) |
| `pro_paywall_dismissed` | Not now / swipe (proposed) |

## Accessibility
- The ticket reads "Pro for Goa Weekend, one hundred forty-nine rupees, once. One pass covers everyone on this trip."
- Focus starts on the headline; the sheet traps focus; Not now is reachable without swiping.
- Spinner states announce "Confirming purchase".

## Open questions / assumptions
- The whole sheet is an assumption; no design exists in the UI reference.
- Price: OQ-P7 in [01](../01-overview.md#open-questions).
- **Resolved (OQ-P21):** in the sideloaded tester APK (no Play Billing), beta testers get Pro **by grant** (`pro_passes.store = grant`), not by buying.
- **Resolved:** nothing in R1a or R1b is Pro. Itemised by hand is free (R1b); only **scanning** is Pro ([D-017](../decisions/D-017-itemised-free-scan-pro.md)).
