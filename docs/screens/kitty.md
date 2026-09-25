# Screen · Kitty

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- KITTY -->` block (lines 423–470); logic `kit` object (`kTot`, `kRem`, `kLow`, `kTop`, `doTopup`); home tile (lines 264–268). Film kitty ring ("left of ₹20,000") in `ui-refrence/toli-film.jsx` is secondary |
| **Related** | [features/kitty](../features/kitty.md) · [07 §6 Kitty, §7 Balances](../07-calculation-engine.md) · [D-010 Kitty folding](../decisions/D-010-kitty-folding.md) · [03 §4.1 (kitty_* columns), §5.7 kitty_contributions](../03-database-schema.md) · [06 §4 `kitty.contribute` / `kitty.void`, `trip.update`](../06-syncing.md) · [13 §5 Ring, Banner](../13-design-system.md) · [settle-up](settle-up.md) · PRD F7, §14 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Trip view:** the ring shows **"Kitty cash with Rahul"**, and members' balances on Trip home don't include the pot ([D-022](../decisions/D-022-kitty-views-and-handover.md)).
> - **Changing the holder** is a **hand-over** (`kitty.handover`): Kitty → ⋯ → *Hand over the cash* → pick the new holder → confirm. It's shown in both people's traces. It can be done by an organiser or the current holder, and is rejected on settled trips.
> - **"Log ₹X each"** opens a **confirm sheet with a checkbox per person** (ghosts included, all ticked by default). Nothing is recorded until confirmed.
> - **LOW** uses `color.warning` + a warning icon + the word "Low", never lime.
> - The **top-up suggestion** is **R1b**. R1a shows the low-kitty banner without the maths.

## Purpose
**Why:** Indian groups often put cash into a common pot ("₹5,000 each") and spend from it. No competitor supports this natively (PRD §3). Running out mid-trip is the failure mode, so the balance must be loud.
**What:** a ring showing what's left, who put in how much (and their refund if the trip ended now), what was paid from the pot, and a warning with a one-tap top-up when it runs low.
**How:** the kitty is **only a record**. The cash stays with the holder (PRD §14). The engine treats contributions as payments and folds the leftover into the holder's balance, so refunds come out proportional by construction ([D-010](../decisions/D-010-kitty-folding.md)).

## User goal
"How much is left in the pot? Do we need to top up? Who gets what back?"

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | Kitty tile |
| [Empty trip](empty-trip.md) | Tip 03 "Start a kitty if you're pooling cash." (Assumption) |
| Notification `kitty_low`, action `top_up` ([04 §11](../04-api-schema.md)) | Opens Kitty with the suggested top-up in the low banner; nothing is logged until the user taps **Log ₹X each** |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Add expense](add-expense.md) | Assumption: **"+ Spend from pot"** (opens with payer = Kitty) |
| [Expense detail](expense-detail.md) | Tap a "Paid from the pot" row |

## UI structure
**Header**: back `‹` · title **"Kitty"** · subtitle **"The common pot · held by Rahul"** (12 muted).

**Content** (scroll, 18 px sides, 14 px gaps):

| # | Block | Details and exact copy |
|---|---|---|
| 1 | **Ring card** | `Card` radius 24, padding 20, gap 18. Left: `Ring` 140 px, stroke 14, track `color.bg.raised`, lime arc with round cap = remaining ÷ put in; animates 0.9 s. Centre: **"₹3,000"** (24/800) over **"remaining"** (11 muted). Right: three stats, label 11 muted over mono 16/700: **"Put in"** ₹15,000 · **"Spent from pot"** ₹12,000 · **"Left"** 20%. |
| 2 | **Low banner** (only when low) | `Banner` `color.bg.raised`, radius 20, padding 16, gap 10, rises in 0.3 s. **"Running low: 20% left"** (15/600). **"At today's pace the pot needs ₹1,500 more from each person to last 2 more days."** (13 muted). Lime button 44 px radius 14: **"Log ₹1,500 each"**. |
| 3 | **Who put in** | `Card` radius 24, padding 8 / 16. Header: **"Who put in"** (15/600) + **"Refund at settle-up"** (12 muted). Per member: name 14/600 left; mono right **"₹5,000 → ₹1,000"** (contribution, then muted "→ refund"). 6 px lime bar = contribution ÷ largest contribution, grows in 0.8 s. |
| 4 | **Paid from the pot** | `Card` radius 24. Header **"Paid from the pot"** (15/600). 44 px rows: title 14 + mono amount, e.g. **"Fuel · 2 scooters ₹4,200"**, **"Toll · Patradevi ₹800"**, **"Breakfast at Artjuna ₹2,400"**, **"Scooter rentals ₹4,600"**. |
| 5 | **Honesty note** | 12 muted: **"Toli only keeps count. The cash stays with whoever holds the pot. Leftovers are returned in proportion to what each person put in."** |

Worked numbers in the prototype = PRD fixture A.2 #4: A ₹5,000, R ₹5,000, N ₹3,000, J ₹2,000 (₹15,000); ₹12,000 spent; ₹3,000 left → refunds ₹1,000 / ₹1,000 / ₹600 / ₹400.

**Home tile** (on [Trip home](trip-home.md)): "Kitty" + mono flag **"OK"** (muted) or **"LOW"** (lime) · **"₹3,000 left"** · 6 px lime bar.

Components: `Screen`, `Header`, `Card`, `Ring`, `ProgressBar`, `Banner`, `Button`, `Toast`, `Sheet`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty (kitty off) | Assumption (not in prototype): ring at 0, text **"No kitty on this trip"**, the honesty note, and lime **"Start a kitty"**. Opens a `Sheet`: **"Who holds the cash?"** (member picker, required, [03 §4.1](../03-database-schema.md)) · **"Target per person (optional)"** e.g. ₹5,000 · toggle **"Log everyone's ₹5,000 now"** · **"Start kitty"**. |
| Empty (on, nothing put in) | Ring empty, **"₹0 remaining"**, Who put in shows each member at **₹0** with a **"+ Add"** link (Assumption). |
| Populated | As above. |
| Error | Rejected `kitty.contribute` (e.g. `trip_settled`) → [Unresolved changes](unresolved-changes.md) item; the row disappears locally. |
| Offline | Works; new contributions show **"SAVED ON PHONE · WILL SYNC"** under the row (Assumption). |
| Syncing | Numbers update in place. |
| Success | Top-up: toast **"Top-up logged · ₹1,500 from each person"**. Assumption: toast has **Undo** (voids those contributions). |
| Disabled | Settled trip: read-only; no top-up or add buttons. |
| Partial data | **Overspent** (spent > put in): ring empty, centre **"₹0"**, banner **"Kitty is ₹800 short — Rahul covered it"** ([07 §6](../07-calculation-engine.md)); allowed, not blocked. **No target set:** top-up still calculated from pace. |

Low rule: remaining ≤ `kitty_low_bp` × put in ÷ 10000 (default 20%, [07 §6](../07-calculation-engine.md)).

## Interactions
| Interaction | Result |
|---|---|
| Tap **Log ₹X each** | Records one contribution of ₹X for every active member (Assumption: the prototype adds ₹X to all 4). |
| Tap **"+ Add"** on Who put in (Assumption) | `Sheet`: pick member + keypad amount → **"Log contribution"**. Supports unequal, partial and late top-ups (PRD F7). |
| Long press a contribution row (Assumption) | **"Remove this contribution"** → confirm → void. |
| Tap subtitle "held by Rahul" (Assumption) | Change holder (organiser only). |
| Tap a spend row | [Expense detail](expense-detail.md). |
| Back | Previous screen. |

## Data
From SQLite via `@toli/engine` ([07 §6](../07-calculation-engine.md)):
| UI | Source |
|---|---|
| Put in | Σ `kitty_contributions.amount_minor` (not voided) |
| Spent from pot | Σ `base_amount_minor` of current revisions with `paid_from_kitty = true` |
| Remaining / % | put in − spent |
| Refund per person | remaining × c_i ÷ C, via `allocate()` |
| Holder | `trips.kitty_holder_member_id` → `trip_members.display_name` |
| Top-up each | `need = max(0, daily × days_left − remaining)`, `each = ceilTo(need / active members, ₹50)`; `daily = kitty_spent / max(1, days_elapsed)` |
| "last N more days" | days left from `trips.end_date` and today |

## API / Database
| Action | Op ([06 §4](../06-syncing.md)) |
|---|---|
| Start kitty / change holder / target / threshold | `trip.update` (`kitty_enabled`, `kitty_holder_member_id`, `kitty_target_minor`, `kitty_low_bp`) |
| Log a contribution / top-up | `kitty.contribute` (one op per member) |
| Remove / undo a contribution | `kitty.void` |
| Spend from pot | `expense.create` with `paid_from_kitty = true` (from Add expense) |

Server sends `kitty_low` push once when the threshold is crossed ([04 §11](../04-api-schema.md)).

## Edge cases
- **Holder leaves or is removed:** not allowed while their balance ≠ 0 (and holding cash makes it non-zero). Change the holder first (Assumption).
- **Late joiner** tops up only from their day: fine, contributions are individual.
- **Turning the kitty off** with money in it: Assumption: not allowed; **"Spend or refund the ₹3,000 first"**.
- **Proportional vs equal refund:** only proportional in v1; the override is dropped ([D-010](../decisions/D-010-kitty-folding.md), OQ-E1 in [01](../01-overview.md#open-questions)).
- **Days left = 0** (last day) or no end date: banner copy drops the day clause: **"At today's pace the pot needs ₹X more from each person."** (Assumption).

## Analytics
| Event | When |
|---|---|
| `kitty_enabled` | Kitty started |
| `kitty_topped_up` | Any contribution after the first round (Assumption: properties `amount_minor`, `member_count`) |
| `kitty_depleted` | Remaining reaches ₹0 or below (Assumption: the PRD doesn't define it) |

## Accessibility
- Ring read as "Three thousand rupees remaining of fifteen thousand. Twenty percent left."
- Low banner is announced when it appears ("Running low").
- Rows: "Neha put in three thousand rupees, refund six hundred rupees at settle-up."
- LOW flag on the home tile is text, not just colour.

## Open questions / assumptions
- **Kitty setup, adding a single contribution, voiding and changing the holder** are not in the UI reference; all flows above are assumptions.
- The prototype's top-up maths (`(spent − remaining) ÷ 4`, rounded to ₹50) differs from [07 §6](../07-calculation-engine.md); we follow 07.
- PRD §14 wants legal review of the kitty wording before R1 ships; the honesty note is the proposed copy.
