# Screen · Balance trace

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- BALANCE TRACE -->` block (lines 391–421); logic `der` object ("derivation") |
| **Related** | [features/balances-and-trace](../features/balances-and-trace.md) · [features/kitty](../features/kitty.md) · [features/settle-up](../features/settle-up.md) · [07 §7 Balances, §9 Explanations, §12 Formatting](../07-calculation-engine.md) · [03 §5](../03-database-schema.md) · [13 §2 Money and colour](../13-design-system.md) · [trip-home](trip-home.md) · [settle-up](settle-up.md) · PRD principle 7, F5 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Two views** ([D-022](../decisions/D-022-kitty-views-and-handover.md)): during the trip, the kitty holder's balance **doesn't** include the pot. A separate line **"Kitty cash with Rahul · ₹3,000"** is shown. Settle up uses the folded view.
> - **New line types:** "Kitty cash handed to Neha · ₹3,000" (hand-over), "**Rounding · ₹0.33**" (the dust rule, [D-021](../decisions/D-021-rounding-adjustment.md)), and refunds (R1b).
> - Settlement lines open **[Recorded payments](recorded-payments.md)**, where a payment can be voided.
> - **A negative Net** uses `color.text`, not lime ([13 §2](../13-design-system.md)).

## Purpose
**Why:** PRD principle 7: "Every number is explainable." Trust in a money app is destroyed by one unexplained figure. When Rahul asks "why do I owe ₹1,000?", the answer has to be one tap away.
**What:** pick a person, see their net balance on a lime card, and every line (paid, share, settlement, kitty) that adds up to it.
**How:** the engine's `explainBalance(member)` returns lines whose values sum exactly to the balance ([07 §9](../07-calculation-engine.md)). Nothing is estimated.

## User goal
"Show me exactly where my (or Rahul's) number comes from."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | Tap a row in **Balances** (opens on that member) |
| [Settle up](settle-up.md) | Tap the top part of a payment card (opens on the payer) |
| Notification action **"See split"** ([04 §11](../04-api-schema.md)) | Opens on you (Assumption) |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Expense detail](expense-detail.md) | Tap an expense line |

## UI structure
**Header**: back `‹` · title **"Balance trace"** (20/600).

**Content** (scroll, 18 px sides, 14 px gaps):

| # | Block | Details and exact copy |
|---|---|---|
| 1 | **Member picker** | Row of equal-width buttons (40 px, radius 12, 13/600, gap 8): **Aditya · Rahul · Neha · Jay**. Selected = lime / `color.onAccent`; others `color.bg.card`. Assumption: with more than 4 members it becomes a horizontal scroll of `Chip`s, with you first. |
| 2 | **Net card** | `TicketCard` lime, radius 24, padding 18 / 20, gap 4. **"{Name} {word}"** (14 px) where word = **"gets back"** / **"owes"** / **"is settled"**. Amount 48/800 (`type.amountL`) signed: **"+₹3,400"** / **"−₹1,000"** / **"₹0"**. Footer 12 px 70%: **"{n} lines add up to this number"** e.g. **"5 lines add up to this number"**. |
| 3 | **Lines card** | `Card` radius 24, padding 6 / 16. Each line min 52 px, 1 px divider: title 14 px + sub 11 muted on the left, signed mono 14/700 on the right. Final row (52 px): **"Net"** 14/600 + lime mono 16/700 net amount. |
| 4 | **Note** | 12 muted: **"Plus means the group owes them. Minus means they owe the group. All balances on the trip add up to ₹0."** |

**Line types** (exact copy from the prototype, plus kitty lines from [07 §9](../07-calculation-engine.md)):
| Source | Title | Sub | Value |
|---|---|---|---|
| Expense they paid | **"Paid for {title}"** e.g. "Paid for Casa Anjuna · 2 rooms" | **"Day {d} · {time}"** e.g. "Day 1 · 14:10" | **+** amount they paid |
| Their share of an expense | **"Share of {title}"** | **"{n} people"** | **−** share |
| Settlement they paid | **"Paid {Name}"** | **"UPI · confirmed by payer"** or **"Marked as paid"** | **+** |
| Settlement they received | **"Received from {Name}"** | **"Settlement"** | **−** |
| Kitty contribution (Assumption copy) | **"Put into the kitty"** | **"Kitty · held by {Holder}"** | **+** |
| Kitty holder only | **"Holding kitty leftovers"** | **"Cash still in the pot"** (Assumption) | **−** remaining |

Order: chronological by `spent_at` / `recorded_at` (Assumption; the prototype lists expense lines then settlement lines). A line for a multi-payer expense shows only this member's paid part.

Components: `Screen`, `Header`, `Segmented` / `Chip`, `TicketCard`, `Card`, `Row`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local, ≤ 50 ms for 500 expenses, [02 §7](../02-architecture.md)). |
| Empty | Member with no activity: card **"Jay is settled"**, **"₹0"**, **"0 lines add up to this number"**; lines card shows only **Net ₹0**. Assumption: add muted text **"Nothing involving Jay yet."** |
| Populated | As above. |
| Error | n/a (local maths). If the engine ever returns lines that don't sum to the balance, that is a P0 bug: log to Sentry, still show the lines (Assumption). |
| Offline | Identical. Pending (unsynced) lines show a muted mono **"SAVED ON PHONE"** tag in the sub (Assumption). |
| Syncing | Lines and the net update in place when a pull lands; numbers count up ([13 §6.3](../13-design-system.md)). |
| Success | n/a. |
| Disabled | n/a. |
| Partial data | Only the current revision is stored on the phone ([03 §10](../03-database-schema.md)); older revisions don't affect the trace, so nothing is missing. |

## Interactions
| Gesture | Result |
|---|---|
| Tap a member button | Switches the trace to that member. |
| Tap a line | Expense line: opens [Expense detail](expense-detail.md). Settlement line: Assumption, opens the settlement row on [Settle up](settle-up.md). |
| Tap Net | Nothing. |
| Back | Previous screen. |
| Long press | None. |

Assumption: a ghost link at the bottom **"Something looks wrong?"** opens a short report sheet (fires `balance_dispute_reported`, PRD §6.2 quality metric).

## Data
From SQLite, via `@toli/engine` `explainBalance(member)` ([07 §7, §9](../07-calculation-engine.md)):
- current `expense_revisions` (not deleted) + `expense_payers.base_minor` + `expense_shares.base_minor`
- `settlements` (not voided), `method` → "UPI · confirmed by payer" (`upi`) or "Marked as paid" (`cash`/`bank`/`other`)
- `kitty_contributions` (not voided), `trips.kitty_holder_member_id`
- `trip_members.display_name`, `trips.start_date` (for "Day N")

## API / Database
Writes nothing (the dispute report, if built, is an analytics event only; Assumption).

## Edge cases
- **Kitty holder** may show "owes" despite paying a lot: the "Holding kitty leftovers" line explains why.
- **Overpayment** (paid more than owed): balance flips sign; Assumption: the card sub adds **"Overpaid — {Name} gets ₹200 back"**.
- **Foreign-currency expense (R2):** line sub adds the original amount, e.g. **"IDR 5,00,000 · Day 2"**; value is in base currency.
- **Removed member:** not in the picker (balance was 0).
- **Anonymised member** (deleted account): listed as **"Former member"** (numbered if several), with all lines kept ([03 §11](../03-database-schema.md)).
- **Long titles:** ellipsis; values never truncated.

## Analytics
| Event | When |
|---|---|
| `balance_viewed` | Screen opens and each time the member changes (Assumption: property `self: true/false`) |
| `balance_dispute_reported` | "Something looks wrong?" submitted (Assumption UI) |

## Accessibility
- Net card read as "Aditya gets back three thousand four hundred rupees. Five lines add up to this number."
- Each line: "Share of Cab to Baga, four people, minus two hundred rupees" (the word "minus"/"plus" is spoken, never just the symbol).
- Member picker is a radio group.
- Signs use a true minus (U+2212) visually but a spoken "minus".

## Open questions / assumptions
- Kitty contribution and holder line copy are not in the prototype (only in [07 §9](../07-calculation-engine.md)); copy above is proposed.
- Tapping an expense line opens [Expense detail](expense-detail.md) (not in the UI reference).
