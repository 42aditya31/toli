# Screen · Split editor (all modes, multiple payers, paid from kitty)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1, all modes including Itemised by hand. Only **Scan bill** (receipt scanning) is Pro, R2 ([D-017](../decisions/D-017-itemised-free-scan-pro.md)) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- SPLIT -->` block (lines 347–389); logic `sp` object, `setMode()`, `calc()`. Multiple payers from `ui-refrence/toli-film.jsx` (`payer()` cards, "Paid by", "✓ ₹3,000 covered · 2 payers"). Late-joiner card from the film ("NIGHT 1 · CASA ANJUNA · split 3 ways") |
| **Related** | [features/splitting](../features/splitting.md) · [features/expenses](../features/expenses.md) · [features/kitty](../features/kitty.md) · [features/members-and-ghosts](../features/members-and-ghosts.md) · [07 §3, §5, §5.2](../07-calculation-engine.md) · [03 §5.2–5.4](../03-database-schema.md) · [13 §5 Chip/Segmented](../13-design-system.md) · [add-expense](add-expense.md) · [receipt-scan](receipt-scan.md) · PRD §9.1, F3 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **R1a modes:** Equal, Selected-equal, Exact, Percent, Shares. **R1b:** Adjustment and Itemised (itemised by hand is free; *Scan bill · PRO* is R2) ([D-018](../decisions/D-018-r1a-r1b-scope.md), [D-017](../decisions/D-017-itemised-free-scan-pro.md)).
> - **Removed members** appear greyed out as **"Removed"** and can't be edited. Any change that would give them a balance is rejected (`removed_member_balance`, [D-030](../decisions/D-030-removed-members-locked.md)).
> - **Multiple payers** are added through the `PayerSheet` (**+ Add payer**), not a long press.
> - **Edits:** the money fields (amount, payers, split mode and inputs, kitty-paid) are saved as **one group**. If someone else changed them first, the last money edit wins as a whole, and the other person is told ([D-019](../decisions/D-019-money-edit-group.md)).

## Purpose
**Why:** real trips are unequal: "only two of us ate", "Jay joined late", "the couple counts as two", "the bill went on two cards". An app that can't express these produces answers the group knows are wrong, and gets abandoned (PRD §2.2). Every mode is free.
**What:** a mode switcher (Equal, Exact, Percent, Shares, Adjust, Itemised), one row per person with a tick box and a stepper, a live "assigned" status, and a **Paid by** section for multiple payers or the kitty.
**How:** it edits the Add expense draft only. The engine recomputes shares on every change. Nothing is saved until **Save** on Add expense.

## User goal
"Split this ₹1,200 between just me and Rahul," or "Rahul pays ₹300 extra for his drinks," or "Aditya paid ₹2,000 on his card and Neha ₹1,000 on hers."

## Entry points
| From | Trigger |
|---|---|
| [Add expense](add-expense.md) | **SPLIT** tile (one tap, PRD F3) |
| [Add expense](add-expense.md) | Long press **PAID BY** → opens with the Paid by section expanded (Assumption) |
| [Expense detail](expense-detail.md) | Edit split |

## Exit points
| To | Trigger |
|---|---|
| [Add expense](add-expense.md) | **Done** or `‹` (both keep the edits in the draft) |
| [Receipt scan](receipt-scan.md) | **Scan bill · PRO** in Itemised mode, on a Pro trip (R2) |
| [Pro sheet](pro-sheet.md) | **Scan bill · PRO** on a free trip ([D-017](../decisions/D-017-itemised-free-scan-pro.md)) |

## UI structure
**Header** (padding 8 / 18 / 12): back `‹` · title **"Split ₹1,200"** (20/600) · subtitle **"Paid by You"** (12 muted). Variants: **"Paid by Rahul"**, **"Paid by 2 people"**, **"Paid from the kitty"** (Assumption for the last two). The subtitle is tappable and toggles the Paid by section (Assumption).

**Mode chips** (`Chip`, horizontal scroll, 36 px, radius 12, 13/600, gap 6), each with a mono 9/700 tag at 70%:
| Chip | Tag | `split_mode` |
|---|---|---|
| **Equal** | — | `equal` (also covers "selected-equal" by unticking) |
| **Exact** | **₹** | `exact` |
| **Percent** | **%** | `percent` |
| **Shares** | **×** | `shares` |
| **Adjust** | **+₹** | `adjust` |
| **Itemised** | — | `itemised` (opens the manual item list below; free) |

Selected chip = lime / `color.onAccent`; others `color.bg.card`. The **PRO** tag is no longer on the Itemised chip; it sits on the **Scan bill** button ([D-017](../decisions/D-017-itemised-free-scan-pro.md)).

**Help line** (13 muted, padding 8 / 18 / 0), exact copy per mode:
| Mode | Copy |
|---|---|
| Equal | **"Untick anyone who wasn’t there. The rest split it evenly."** |
| Exact | **"Type what each person owes. It has to add up to the total."** |
| Percent | **"Percentages have to reach 100%."** |
| Shares | **"A couple can count as 2 shares, singles as 1."** |
| Adjust | **"Split evenly, then add extra to someone (the extra drink)."** |
| Itemised | Assumption: **"Add each item and tap who had it. Tax and tip follow what each person ate."** |

**Itemised mode** (Assumption for layout; rules from [07 §5.1](../07-calculation-engine.md)): instead of person rows, a manual item list:
- At the top, a tonal **"Scan bill · PRO"** button (R2). On a Pro trip it opens [Receipt scan](receipt-scan.md), which fills this list; on a free trip it opens the [Pro sheet](pro-sheet.md). The manual list always works.
- One `Card` per item: label, amount (mono), and a row of 28 px avatar chips to tap who had it.
- **"+ Add item"**, then an extras section: tax, service, tip, discount, round-off (`expense_items.kind`), prorated by subtotal.
- The footer status uses the same copy as Exact (e.g. **"₹120 unassigned"**) until items + extras − discounts = the total.

**Person rows** (scroll, 18 px sides, gap 10). Each `Card` radius 20, padding 12 / 14, gap 10:
- Line 1: 26 px tick box (radius 8, 1.5 px `color.bg.raised` border; lime with **"✓"** when included, transparent when not) · 34 px `Avatar` · name 15/600 (**"You"** for yourself) · share mono 16/700 e.g. **"₹300"**, or **"—"** when excluded. Excluded rows are 45% opacity.
- Line 2 (only when mode ≠ Equal and the person is included), indented 38 px: `−` button (36 px, radius 12, raised) · value box (36 px, `color.bg.base`, mono 14/700) · `+` button.

| Mode | Value box shows | Step per tap | Starting values when switching to this mode |
|---|---|---|---|
| Exact | **"₹300"** | ₹100 | the current equal shares |
| Percent | **"25%"** | 5% | equal whole percents, leftover % to the first people |
| Shares | **"1 share"** / **"2 shares"** | 1 | 1 each |
| Adjust | **"+₹50"** | ₹50 | +₹0 each |

- **Late joiner** (Assumption, from the film's Members beat): a member whose `joined_from` is after the expense date starts **unticked**, and shows a lime pill **"joined day 2"** next to the name. Ticking them is allowed (PRD F2 "overridable per expense").

**Paid by section** (Assumption for placement; card design from the film). Shown above the mode chips when expanded:
- Caption **"Paid by"** (13 muted).
- One `Card` per payer (radius 20, padding 14, gap 10): 34 px `Avatar` · name 15/600 with a mono 11 muted sub-line · amount mono 16/700 · 8 px bar (lime fill = payer amount ÷ total). Film example: **Aditya · "HDFC CARD ••42" · ₹2,000** and **Neha · "ICICI CARD ••17" · ₹1,000**.
- **"+ Add payer"** tonal button, and a **"Kitty"** option when the kitty is on.
- Status line lime 15/600: **"✓ ₹3,000 covered · 2 payers"**. Otherwise **"₹1,000 not covered yet"** or **"₹200 more than the bill"** (Assumption).
- **Paid from the kitty:** picking Kitty replaces all people payers (kitty can't be mixed with people in v1, [07 §5.2](../07-calculation-engine.md)); the section shows one card **"Kitty · held by Rahul"** with the full amount.

**Footer** (`color.bg.base`, padding 10 / 18 / 22, gap 10):
- Status row (min 36 px): status text 14/600 (lime when valid) + optional tonal button 34 px **"Distribute equally"**.
- Primary `Button` 56 px lime **"Done"**.

Status copy (exact from prototype):
| Condition | Copy |
|---|---|
| No amount | **"Add an amount first"** |
| Valid | **"✓ All ₹1,200 assigned"** |
| Nobody ticked | **"Pick at least one person"** |
| Under (money) | **"₹120 unassigned"** |
| Over (money) | **"₹50 too much"** |
| Under / over (percent) | **"5% unassigned"** / **"5% too much"** |

**Distribute equally** appears only in Exact and Percent when something is unassigned; it spreads the remainder equally over the ticked people with `allocate()` ([07 §5](../07-calculation-engine.md)).

Components: `Screen`, `Header`, `Chip`, `Card`, `Avatar`, stepper (`Button` tonal ×2 + value), `ProgressBar` (8 px, payers), `Button`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a. |
| Empty | Amount is 0: rows show ₹0, status **"Add an amount first"**. |
| Populated | Default: Equal, everyone active on the date ticked. |
| Error | Invalid split shows the status copy above in `color.text` (not lime). **Done** still works; Add expense then blocks Save with a toast. |
| Offline | Identical (pure local maths). |
| Syncing | n/a. |
| Success | **"✓ All ₹X assigned"** in lime. |
| Disabled | Steppers can't go below 0 (Shares: below 1 while ticked, Assumption). **Scan bill** on a free trip opens the Pro sheet; Itemised by hand is never disabled. |
| Partial data | One ticked person → they owe everything (valid). Payer unticked → valid ("payer-not-participant", PRD §9.1). |

## Interactions
| Interaction | Result |
|---|---|
| Tap mode chip | Switches mode and resets the values to that mode's starting values. |
| Tap tick box | Include / exclude the person. Equal re-splits live. |
| Tap `−` / `+` | Changes the value by the step. |
| Tap the value box | Assumption: opens a small numeric keypad to type an exact value (e.g. ₹437, 33.33%). Percent accepts 2 decimals (stored as basis points, [07 §5](../07-calculation-engine.md)). |
| Long press `−` / `+` | Assumption: repeats. |
| Tap **Distribute equally** | Adds the remainder equally to ticked people. |
| Tap header subtitle | Show / hide Paid by (Assumption). |
| Tap **+ Add payer** | Adds a payer row; amount starts at whatever is not yet covered. |
| Tap **Done** / `‹` | Back to Add expense with the split applied. |

## Data
- Reads the in-memory draft (amount, currency, payer(s), mode, included set, values).
- `trip_members` (not removed) with `joined_from`, `user_id` (for "You").
- `trips.kitty_enabled`, `trips.kitty_holder_member_id`, `trips.is_pro`.

## API / Database
Writes nothing. On Save (in Add expense), the draft becomes `expense_revisions.split_mode` + `split_input` + `expense_payers` + `expense_shares` ([03 §5.2–5.4](../03-database-schema.md)).

`split_input` per mode (Assumption; the Zod schema lives in `packages/schema`):
| Mode | `split_input` |
|---|---|
| equal | `{ participants: [member_id…] }` |
| exact | `{ amounts: { member_id: minor } }` |
| percent | `{ bp: { member_id: int } }` (Σ = 10000) |
| shares | `{ weights: { member_id: int ≥ 1 } }` |
| adjust | `{ participants: […], add: { member_id: minor ≥ 0 } }` |
| itemised | items + extras ([07 §5.1](../07-calculation-engine.md)) |

## Edge cases
| Case | Behaviour |
|---|---|
| Rounding (₹1,000 ÷ 3) | Rows show ₹333 / ₹333 / ₹334 (in paise 33334/33333/33333); who gets the paisa is decided by `allocate()`, never shown as a choice ([07 §3](../07-calculation-engine.md)). |
| Adjust add-ons larger than the total | Status **"₹X too much"**; invalid ([07 §5](../07-calculation-engine.md) `Σadd ≤ amount`). |
| Amount changed after setting Exact values | Status updates to unassigned / too much; user fixes or taps Distribute. |
| Late joiner example (film) | **"NIGHT 1 · CASA ANJUNA"**, **₹3,000**, **"split 3 ways"**, A R N ticked, J faded, **"₹1,000 each"**. |
| 50 members | Rows scroll; Assumption: a **"Select all / none"** link above the rows. |
| Multiple payers + kitty | Not allowed together; picking Kitty clears people payers. |
| Payer amounts don't cover the bill | Add expense Save is blocked with toast **"₹1,000 not covered yet"** (Assumption). |

## Analytics
| Event | When | Properties |
|---|---|---|
| `split_mode_changed` | Mode chip changed | `from`, `to` (Assumption: properties not specified in PRD) |
| `pro_paywall_viewed` | **Scan bill** tapped on a free trip | `feature: receipt_scan` |

`payer_count` is recorded on `expense_added`.

## Accessibility
- Mode chips are a radio group with the tag spoken ("Exact, rupees").
- Rows read "Rahul, included, owes three hundred rupees." Tick box: "Include Rahul".
- Stepper buttons: "Decrease Rahul's share", "Increase…"; value is announced after each change.
- Status row is a polite live region.
- Excluded rows at 45% opacity also show **"—"** instead of an amount (not colour only).

## Open questions / assumptions
- **Multiple payers placement** is not in the prototype (only in the film). Assumption: a Paid by section in this screen.
- **Card labels** ("HDFC CARD ••42") have no column in `expense_payers` ([03 §5.3](../03-database-schema.md)). Drop them, or add an optional payer note?
- Percent steps of 5% in the prototype vs basis points in [07](../07-calculation-engine.md): typing handles decimals.
