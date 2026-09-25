# Screen · Settle up

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- SETTLE -->` block (lines 472–533); logic `stl` object, `payments()`, `simplify()`, `direct()`, `settleDown()`, `record()`. Hold behaviour also in `ui-refrence/Tear to Split.dc.html` (button + dashes) |
| **Related** | [features/settle-up](../features/settle-up.md) · [features/notifications](../features/notifications.md) · [features/kitty](../features/kitty.md) · [07 §8 Settlement](../07-calculation-engine.md) · [03 §4.1 settle_mode, §5.6 settlements, §9 reminders](../03-database-schema.md) · [04 §5.1 upi-link, §5.1a stubs-send, §5.1b web-settlement, §5.2 reminder-send](../04-api-schema.md) · OQ-P12 / OQ-P13 in [01](../01-overview.md#open-questions) · [06 §4 `settlement.create` / `settlement.void`, `trip.transition`, `trip.update`](../06-syncing.md) · [D-012 Hold to tear](../decisions/D-012-hold-to-tear.md) · [13 §5 HoldButton, TicketCard payment, Stamp](../13-design-system.md) · [tear-overlay](tear-overlay.md) · [invite-web](invite-web.md) · PRD §9.5, F6, §14 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **R1a:** Simplified mode only. **Direct** mode is R1b and uses **exact pairing** ([D-020](../decisions/D-020-direct-mode-exact-pairing.md)).
> - **Mark as paid** pre-fills the **exact** amount, paise included ([D-021](../decisions/D-021-rounding-adjustment.md)).
> - **UPI over ₹1,00,000:** shown as several links of at most ₹1 lakh each, with "UPI allows about ₹1 lakh per payment. Pay these over one or more days", plus **I paid a different amount** ([07 §8.5](../07-calculation-engine.md)).
> - **Close trip** appears when every derived payment is 0. Any remaining amounts under ₹1 are written off as "Rounding". The trip also settles automatically 24 h after its end date ([D-023](../decisions/D-023-auto-settle-timing.md)). Non-organisers see **Request reopen** on a settled trip.
> - **Recorded payments** link: see and void recorded payments ([recorded-payments](recorded-payments.md)).
> - **HoldButton accessible mode:** with a screen reader, Switch Access, voice control or "Tap instead of hold" on, it becomes tap → confirm sheet. Haptic ticks while holding.
> - **Honest copy:** the overlay says **"STUBS READY"**, and the toast names who got a push and who needs WhatsApp ([04 §5.1a](../04-api-schema.md)).
> - **Settled state in R1:** "Everyone's square." with no recap button (the recap is R3).
> - **Permissions:** see the [permission matrix](../09-security.md#permission-matrix).

## Purpose
**Why:** settling is the value moment and the north-star metric ("trips settled per week"). Knowing Rahul owes ₹1,000 isn't the same as Rahul paying it (PRD §2.2).
**What:** the fewest payments to close the trip ("5 → 3"), each as a lime ticket with **Remind**, **Mark as paid** and **Their view**; a Simplified / Direct toggle; and a **Hold to tear & send stubs** button that sends every payer their stub. When all payments are recorded: **"Everyone's square."**
**How:** payments are *suggestions* computed by `@toli/engine` ([07 §8](../07-calculation-engine.md)). They become real only when recorded as settlements. **Toli never holds money or sees payments**; payers confirm them (PRD §14).

## User goal
- Organiser/creditor: "Tell everyone exactly who pays whom, and get them to actually pay."
- Payer: "Pay what I owe in two taps."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | **Settle up →** on the hero ticket |
| Notification (`reminder`, `stub_received`) | Deep link (Assumption) |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Tear overlay](tear-overlay.md) | Hold completes |
| [Balance trace](balance-trace.md) | Tap the top half of a payment card (opens on the payer) |
| [Invite web](invite-web.md) (preview, `owe` state for that person) | **Their view** |
| [Recap](recap.md) (R3) | **Open the trip recap →** in the settled state |
| WhatsApp (share sheet) | **WhatsApp** header button |
| Payer's UPI app | **Pay via UPI** (payer's own card; Assumption, see below) |

## UI structure
**Header**: back `‹` · title **"Settle up"** (flex) · right tonal 40 px **"WhatsApp"**.

### Open state (payments remaining)
| # | Block | Details and exact copy |
|---|---|---|
| 1 | **Count card** | `Card` radius 24, padding 18 / 20, gap 14. Row: "before" count 56/800 muted with a 3 px strikethrough (e.g. **"5"**) · **"→"** 28 muted · "after" count 72/800 lime (e.g. **"3"**) · **"payments"** 13 muted. Before = direct-mode count, after = current-mode count ([07 §8.3](../07-calculation-engine.md)). |
| | Mode toggle | `Segmented` on a `color.bg.base` track (padding 4, radius 14), two 36 px halves radius 10: **"Simplified"** · **"Direct"**. Active = lime. Only an organiser can change it (OQ-P12); for others it shows the current mode, read-only. |
| | Mode help (12 muted) | Simplified: **"Debts are rerouted so 5 pairwise payments become 3. Nobody's total changes."** · Direct: **"Only people who actually owe each other pay each other. More payments, no rerouting."** |
| 2 | **Payment cards** (one per derived payment) | `TicketCard` payment: lime, radius 22, rises in 0.35 s. **Top (tappable → trace):** 40 px avatar (`color.onAccent` bg, lime initial) · line 15/600 **"{Name} pays you"** or **"{Name} pays {Name}"** · why 11/70% e.g. **"Casa Anjuna ₹1,000 + Cab to Baga ₹200"** (the payer's two largest shares of others' expenses; fallback **"Net of shared expenses"**) · amount 22/800 **"₹1,200"**. Dashed perforation; 18 px notches at top 59. **Bottom buttons** (38 px, radius 12, 12/600, gap 8): **"Remind"** (`color.onAccentSoft`) → **"Reminded · 48h"** once sent · **"Mark as paid"** (`onAccent`: dark bg, lime text; shown only when you're the payer or the payee, OQ-P12) · **"Their view"** (soft). |
| 3 | **Kitty note** (only if kitty has leftovers) | 12 muted: **"Kitty leftovers (₹3,000) are handed back by Rahul in proportion to contributions."** |
| 4 | **Hold button** | `HoldButton` 60 px, radius 20, `color.bg.raised`. Label 16/600 **"Hold to tear & send stubs ✂"**; while held **"Keep holding…"**; offline **"Needs internet"** (disabled). Lime fills left → right over 900 ms (`dur.hold`); label turns `color.onAccent` past 55%. Release early = cancel. Completing the hold calls `POST /stubs-send` ([04 §5.1a](../04-api-schema.md)). |
| 5 | **Honesty footnote** | 12 muted, centred: **"Each person gets a stub that opens their own UPI app. Toli never holds the money and can't see payments, so payers confirm them."** |

### Settled state ("Everyone's square")
| Block | Details and exact copy |
|---|---|
| **Settled ticket** | Lime card radius 24, padding 28 / 22, gap 8, rises in 0.4 s. Trip name mono 12/700 +0.12em (**"Goa Weekend"**). **"Everyone's square."** (40/800). **"3 payments recorded. The trip is now read-only."** (14, 75%; money and member changes are locked, photos and notes still work, [06 §5](../06-syncing.md)). `Stamp` **"SETTLED"** top-right: 3 px `color.onAccent` border, radius 10, mono 14/700, pops in (scale 2.4 → .92 → 1, −30° → −12°) at 0.2 s. |
| **Recap button** (R3 only) | Tonal 56 px radius 18, 16/600: **"Open the trip recap →"**. In R1 there is no recap ([03 §6.5](../03-database-schema.md)); the button becomes **"Share summary to WhatsApp"** (Assumption). |

### Payer's own card ([D-012](../decisions/D-012-hold-to-tear.md); exact layout Assumption)
When **you** are the payer, your card's buttons become **"Pay ₹1,200 via UPI"** (`onAccent`) and **"Mark as paid"**. On a trip whose base currency isn't INR, `/upi-link` returns `not_inr` and only **Mark as paid** is shown ([04 §5.1](../04-api-schema.md)). After returning from the UPI app, a `Sheet` asks (copy shared with [invite-web](invite-web.md)): **"Did the payment go through?"** / **"Toli can't see UPI payments, so we record whatever you tell us. Aditya sees it straight away."** / **"Yes, I paid"** · **"Not yet"**.

### Mark as paid sheet (Assumption; PRD F6 note + partial)
`Sheet`: **"Rahul paid Aditya"** · amount (prefilled **₹1,000**, editable on the keypad for partial payments) · method chips **Cash** (default) · **UPI** · **Bank** · **Other** · note field **"Add a note (optional)"** · lime **"Record ₹1,000"**. The prototype records the full amount in one tap without a sheet.

Components: `Screen`, `Header`, `Card`, `Segmented`, `TicketCard` (payment), `Avatar`, `Button`, `HoldButton`, `Stamp`, `Sheet`, `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | Nothing was ever spent: settled-style card but copy **"Nothing to settle yet."** (Assumption); no stamp. |
| Populated | Open state. |
| Error | `settlement.create` rejected (`trip_settled`, `not_a_member`) → [Unresolved changes](unresolved-changes.md). `/upi-link` returns `no_upi_id` → toast **"Aditya hasn't added a UPI ID yet. Pay another way, then mark it as paid."** (Assumption). `/reminder-send` 429 → toast **"One reminder per 48 hours. Keeps it friendly."** `/stubs-send` 429 (1 per trip per 10 min) → toast **"Stubs were just sent. Try again in a few minutes."** (Assumption). |
| Offline | Suggestions, toggle and **Mark as paid** work (queued in the outbox). **Remind**, **Pay via UPI** and the hold button need the network and show **"Needs internet"** (disabled) ([04 §5.1a](../04-api-schema.md)). |
| Syncing | Payment cards reflow when pulled settlements arrive (including a web viewer's **"Yes, I paid"** via `/web-settlement`); a card that disappears slides out. |
| Success | Remind: toast **"Nudge sent to Rahul"**. Mark as paid: toast **"Rahul → Aditya ₹1,000 recorded"** (Assumption: with **Undo**, which voids it). After the hold + tear ("STUBS DELIVERED" = handed to Toli's server for delivery): the toast names anyone who couldn't get a push, e.g. **"Sent to Rahul, Neha. Share with Jay on WhatsApp."** Last payment recorded → the server settles the trip and the settled state shows. |
| Disabled | Hold button inactive when there are no payments, offline, or while the tear overlay is running. **Remind** shows **"Reminded · 48h"** during the cooldown. |
| Partial data | Partial settlement recorded: the card's amount drops to the remainder (engine recomputes). Overpayment: Assumption: warning toast **"That's ₹200 more than Rahul owed. Aditya now owes Rahul ₹200."** (PRD §9.6). |

## Interactions
| Interaction | Result |
|---|---|
| Tap **Simplified / Direct** (organiser) | Switches `trips.settle_mode` for the whole trip; list and counts recompute. |
| Tap card top | Balance trace for the payer. |
| Tap **Remind** | Sends a nudge (push if on Toli; WhatsApp text for ghosts, via share sheet). Limited to 1 per recipient per trip per 48 h. |
| Tap **Mark as paid** | Opens the Mark as paid sheet (Assumption) → records a settlement. |
| Tap **Their view** | Shows exactly what that person sees on the invite page (read-only preview). |
| **Hold** 900 ms | `POST /stubs-send`, then the tear overlay with one stub per payer. Payers on Toli get a `stub_received` push; the rest are listed in the toast for WhatsApp (`whatsapp_text`). |
| Release early | Fill resets; nothing sent. |
| Tap **WhatsApp** | Share sheet with a formatted text summary + image card (PRD F6). Prototype toast: **"Summary card ready for WhatsApp"**. |
| Tap **Pay via UPI** (payer) | `POST /upi-link` → open `upi://pay…` → on return, the "Did the payment go through?" sheet. |
| Tap **Open the trip recap →** | Recap (R3). Assumption for R1: shows **"Share summary to WhatsApp"** instead. |

## Data
From SQLite via `@toli/engine`:
| UI | Source |
|---|---|
| Payments list | `simplify(balances)` or `direct(...)` per `trips.settle_mode` ([07 §8](../07-calculation-engine.md)) |
| Before / after counts | direct count / current count |
| Why line | payer's largest shares of expenses paid by others ([07 §9](../07-calculation-engine.md)) |
| Reminded state | local record of the last `reminder-send` response `next_allowed_at` (Assumption; `reminders` table is server-only) |
| Kitty note | kitty remaining + holder |
| Recorded count | `settlements` (not voided) |

## API / Database
| Action | Write |
|---|---|
| Toggle mode | op `trip.update` `{ settle_mode }` |
| Mark as paid / Yes, I paid | op `settlement.create` `{ from, to, amount, method, note }` (`method` = `upi` / `cash` / `bank` / `other`) |
| Undo | op `settlement.void` `{ id, reason }` (whoever recorded it, or an organiser, OQ-P12) |
| Remind | `POST /reminder-send` `{ trip_id, to_member_id }` ([04 §5.2](../04-api-schema.md)) |
| Pay via UPI | `POST /upi-link` `{ trip_id, to_member_id, amount_minor }` ([04 §5.1](../04-api-schema.md)) |
| Hold to send | `POST /stubs-send` `{ trip_id, mode }` → `{ payments[] (with pushed: bool), whatsapp_text }`. The server recomputes the payments, queues one `stub_received` per payer on Toli, and moves the trip to `settling` if it was `active` ([04 §5.1a](../04-api-schema.md)) |
| Last payment recorded | No phone op. The server moves the trip to `settled` itself when the derived payments reach zero after the trip ends or after a stubs-send; voiding a settlement puts it back to `settling` (OQ-P13, [06 §4](../06-syncing.md)) |

## Edge cases
- **Only one creditor** (Appendix A): Simplified and Direct give the same list; count card shows **"3 → 3"** (Assumption: hide the strikethrough when equal).
- **Kitty holder** appears as a payer or payee through folding; the kitty note explains it.
- **Ghost payer:** Remind opens WhatsApp with prefilled text; their stub goes by WhatsApp (they have no device).
- **Settled trip:** read-only; any change is rejected **"This trip is settled. Reopen to edit."** ([06 §5](../06-syncing.md)). Only an organiser can reopen (logged); Reopen lives in trip settings (Assumption).
- **Payment recorded on another phone meanwhile:** the card disappears after the pull; if you were mid-sheet, the sheet closes with toast **"Already recorded by Rahul"** (Assumption).
- **We never imply verification:** copy always says "recorded" / "confirmed by payer", never "paid successfully".

## Analytics
| Event | When | Properties |
|---|---|---|
| `settlement_viewed` | Screen opens / mode changes | `mode` (simplified / direct), `payment_count`, `payments_saved` |
| `reminder_sent` | Remind succeeds | — |
| `upi_link_tapped` | Pay via UPI tapped | — |
| `settlement_recorded` | Settlement saved | `method` (`upi` / `manual`), `partial` |
| `trip_settled` | Trip becomes settled | `days_to_settle` |

## Accessibility
- Count card read as "Five payments reduced to three."
- Payment card: "Rahul pays you one thousand rupees. For Casa Anjuna one thousand and Cab to Baga two hundred." Buttons labelled with the person's name ("Remind Rahul").
- **HoldButton:** with a screen reader, double-tap performs the action directly ([13 §9](../13-design-system.md), [D-012](../decisions/D-012-hold-to-tear.md)); hint "Sends a stub to each payer."
- SETTLED stamp is read as "Settled".
- Reduce Motion: stamp appears without the pop; tear replaced by a toast.

## Open questions / assumptions
- **Resolved:** sending stubs is `POST /stubs-send` ([04 §5.1a](../04-api-schema.md)).
- **Resolved:** the payer or the payee can mark a payment as paid; the recorder or an organiser can void it (OQ-P12).
- **Resolved:** the server settles the trip automatically, and a void reverts it to `settling` (OQ-P13).
- The payer card layout, Mark as paid sheet and Undo are **assumptions**.
