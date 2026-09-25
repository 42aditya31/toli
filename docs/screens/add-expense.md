# Screen · Add expense (+ "Already logged?" sheet, Repeat last)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 (the **Scan** tile's receipt scan is R2 Pro; itemising by hand is free in R1, [D-017](../decisions/D-017-itemised-free-scan-pro.md)) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- ADD EXPENSE -->` block (lines 299–345, incl. the duplicate sheet 332–343); logic `add` object, `press()`, `save()`, `commit()`, `calc()`. Offline toast **"Saved on this phone"** from `ui-refrence/toli-film.jsx` |
| **Related** | [features/expenses](../features/expenses.md) · [features/splitting](../features/splitting.md) · [features/kitty](../features/kitty.md) · [features/receipt-scan](../features/receipt-scan.md) · [features/offline-and-sync](../features/offline-and-sync.md) · [02 §5.1](../02-architecture.md) · [03 §5.1–5.4](../03-database-schema.md) · [06 §4, §5](../06-syncing.md) · [07 §3, §5](../07-calculation-engine.md) · [13 §5 Keypad, AmountDisplay](../13-design-system.md) · [D-013](../decisions/D-013-keypad-entry.md) · [split-editor](split-editor.md) · [tear-overlay](tear-overlay.md) · [expense-detail](expense-detail.md) · [pro-sheet](pro-sheet.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Date, currency, "booked before trip":** a `DateCurrencyChip` **"Today · ₹ ▾"** under the amount opens a sheet with date and time, currency (R2), and *Booked before trip* (`is_committed`) ([13 §6](../13-design-system.md)).
> - **Paid by:** tapping it opens the **`PayerSheet`** (recent payers first, search when there are more than 8 members, **+ Add payer** for multiple payers). It no longer cycles through members on each tap.
> - **BILL tile:** opens a choice, **Attach photo** (free, R1a) / **Scan (PRO)** (R2). The free photo attach is never hidden behind the Pro sheet.
> - **Duplicate check:** same amount, `spent_at` within **10 minutes**, created by a **different member** ([06 §5](../06-syncing.md)). The copy is "Neha logged ₹1,200 for “Dinner” **6 minutes ago**."
> - **Honest toast** ([13 §7.3](../13-design-system.md)): "Rahul and Neha will get a stub · Share with Jay on WhatsApp". Offline: "Saved · sending when you're online". Never "Stubs sent" before the server confirms.
> - **Split modes in R1a:** Equal, Selected-equal, Exact, Percent, Shares. Adjustment and Itemised are **R1b** ([D-018](../decisions/D-018-r1a-r1b-scope.md)). Refund is R1b ([D-029](../decisions/D-029-refund-expense.md)).
> - **Amount rules:** zero is blocked; a foreign amount under 1 minor unit in the trip currency is rejected (`amount_too_small`, [07 §4](../07-calculation-engine.md)).

## Purpose
**Why:** PRD principle 2: **five seconds to log an expense.** If logging is slow at the restaurant counter, it doesn't get logged. This is the critical path (PRD F3).
**What:** an amount-first keypad. The amount is the only required field. Payer, split, category and title all have sensible defaults and are one tap away.
**How:** the draft lives in memory; the engine shows the per-person amount live. **Save** writes the expense and its outbox op in one SQLite transaction (≤ 100 ms), then plays the tear-stubs animation.

## User goal
"I just paid ₹1,200 for dinner for all four of us. Log it. Done."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) / [Empty trip](empty-trip.md) / any tab | **+** FAB |
| [Split editor](split-editor.md) | **Done** / back returns here with the split applied |
| [Receipt scan](receipt-scan.md) | Assumption: after a failed scan, falls back here with the photo attached (PRD F4) |
| Quick-add widget / share target | SHOULD in PRD F3; out of R1 scope (Assumption) |

## Exit points
| To | Trigger |
|---|---|
| [Tear overlay](tear-overlay.md) → [Trip home](trip-home.md) | **Save & tear stubs ✂** succeeds and at least one other person owes a share |
| [Trip home](trip-home.md) + toast | Save with nobody else owing (toast **"Saved"**), kitty-paid (toast **"₹1,200 paid from the kitty"**), offline (toast **"Saved on this phone"**), or **Same one, skip** (toast **"Skipped the duplicate"**) |
| [Split editor](split-editor.md) | **SPLIT** tile |
| [Receipt scan](receipt-scan.md) (R2) / [Pro sheet](pro-sheet.md) (free trip) | **BILL · Scan** tile |
| Back | `‹` (draft discarded, see Interactions) |

## UI structure
**Header** (padding 8 / 18 / 4): back `‹` · title **"Add expense"** (20/600) · right: repeat chip (36 px, radius 12, `color.bg.card`, 12 px muted) **"↻ {first word of last expense} {amount}"**, e.g. **"↻ Cab ₹800"**; when there is no previous expense: **"↻ Repeat"**.

**Amount area** (centred, padding 18 / 18 / 6), `AmountDisplay`:
- **"₹"** 34/600 muted + amount 64/800 −0.04em (`type.amountXL`). Shows **"0"** in `color.bg.raised` until a key is pressed, then `color.text`. Indian grouping as you type (**"1,200"**).
- Blinking lime caret, 3 × 52 px, 1 s steps.
- Live per-person line, mono 13/500 lime:

| Condition | Copy |
|---|---|
| amount = 0 | **"Amount is the only thing you need"** |
| Equal split | **"₹300 each · 4 people"** (floor of amount ÷ people, shown for guidance) |
| Other mode, valid | **"Split 4 ways · Exact"** (mode name: Equal / Exact / Percent / Shares / Adjust) |
| Other mode, invalid | **"Split needs fixing"** |

**Fields** (padding 6 / 18, gap 8):
| Element | Details |
|---|---|
| Title input | 40 px, radius 12, `color.bg.card`, 14 px, centred text. Placeholder **"What for? (optional)"**. ≤ 120 characters. |
| Three tiles (44 px, radius 14, `color.bg.raised`, micro label 10 muted over 13/600 value) | **PAID BY** → **"You"** / member name / **"Kitty"** (flex 1) · **SPLIT** → **"Equal · 4 ›"** (flex 1.3) · **BILL** → **"Scan"** (56 px wide) |
| Category chips | Horizontal scroll, 32 px pills, 12/600, gap 6: **Food · Drinks · Travel · Stay · Activities · Shopping · Fuel · Misc**. Selected = lime / `color.onAccent`; others `color.bg.card`. **None selected by default** (OQ-P15 in [01](../01-overview.md#open-questions); the prototype pre-selects Food). A chip is auto-suggested (outlined) from the title as you type; saved without a category shows as **"Misc"**. Assumption: the list comes from `trip_categories` (template order); Tolls and Tips appear if the template includes them. |

**Keypad** (`Keypad`, fills remaining height, 3 columns, gap 8, keys `color.bg.card` radius 16, digits 24/600): **1 2 3 / 4 5 6 / 7 8 9 / 00 0 ⌫**. Pressed: `color.bg.raised` + scale .96.

**Footer** (padding 10 / 18 / 22): `Button` 56 px, radius 18, 17/600: **"Save & tear stubs ✂"** (✂ in mono). Lime when the draft is valid; `color.bg.raised` with muted text when not.

### "Already logged?" duplicate sheet
`Sheet` over a `color.scrim` backdrop (covers the status bar too), `color.bg.raised`, radius 28 top, padding 22 / 20 / 28, gap 12:
- Title **"Already logged?"** (20/600)
- Body 14 muted: **"{Name} already logged {₹amount} for “{title}” today. Two people logging the same bill is common."** e.g. *"Aditya already logged ₹1,200 for “Dinner at Fisherman's Wharf” today. Two people logging the same bill is common."*
- Buttons (50 px, radius 16, 15 px): lime **"Same one, skip"** · dark `color.bg.card` **"Save anyway"**

### Repeat last expense
The header chip fills the draft from the **most recent expense in this trip**: same amount, category, title and participant set. The payer stays whatever the draft currently has (so "you" repeat Rahul's cab as your own if you paid this time). The user can still change anything before saving (PRD F3 MUST).

Components: `Screen`, `Header`, `Chip`, `AmountDisplay`, `Keypad`, `Button`, `Sheet`, `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | Amount 0: display "0" faded, hint "Amount is the only thing you need", Save button greyed. |
| Populated | Amount typed; live per-person line; Save lime. |
| Error | Tapping a greyed Save shows a toast: **"Type an amount first"** (no amount) or **"₹120 still unassigned"** / **"5% still unassigned"** (invalid split from the Split editor). Write failure (SQLite): toast **"Couldn't save. Try again."** and the draft is kept (Assumption). |
| Offline | Fully works. After save, skip the tear animation and show toast **"Saved on this phone"** (film); the new Recent row shows **"SAVED ON PHONE · WILL SYNC"** ([06 §7](../06-syncing.md)). Stubs can't be delivered offline: the server queues the pushes once the op syncs ([06 §6](../06-syncing.md) step 7). |
| Syncing | n/a on this screen. |
| Success | Tear overlay → Trip home + toast **"Rahul and Neha will get a stub · Share with Jay on WhatsApp"** (offline: **"Saved · sending when you're online"**). |
| Disabled | Save greyed while invalid. Keypad ignores input past the digit cap. **Settled trip:** screen can't be opened (FAB hidden, [trip-home](trip-home.md)). |
| Partial data | Nothing but amount entered → saves with defaults: payer = you, everyone active on today's date, Equal, today/now, trip base currency, no category and no title (both shown as "Misc"). |

## Interactions
| Interaction | Result |
|---|---|
| Key press | Appends digit; leading zeros stripped; **⌫** deletes last digit. INR: whole rupees only; **00** appends two zeros. Decimal currencies: **00** becomes **"."** ([D-013](../decisions/D-013-keypad-entry.md)). Cap: 8 digits (D-013; the prototype caps at 6). Haptic tick (Assumption). |
| Tap **PAID BY** | Cycles the single payer: **You → Rahul → Neha → Jay → Kitty → You** (Kitty only when the kitty is on). |
| Long press **PAID BY** | Assumption: opens the **Paid by** section of the [Split editor](split-editor.md) for multiple payers. When there are several payers the tile reads **"2 payers"**. |
| Tap **SPLIT** | Push Split editor (one tap, PRD F3 MUST). |
| Tap **BILL · Scan** | R1: opens the camera to **attach a receipt photo** (free, up to 5 per expense, else `attachment_limit`, [04 §2.1](../04-api-schema.md)); the tile reads **"1 photo"** afterwards. R2: on a Pro trip, push Receipt scan; on a free trip, open the [Pro sheet](pro-sheet.md) ([D-017](../decisions/D-017-itemised-free-scan-pro.md)). |
| Tap a category chip | Selects it (single choice). |
| Tap **↻ repeat** | Fills the draft from the last expense (see above). |
| Tap **Save & tear stubs ✂** | Validate → duplicate check → save → tear overlay. |
| Duplicate sheet: **Same one, skip** | Nothing saved; back to Trip home; toast **"Skipped the duplicate"**. |
| Duplicate sheet: **Save anyway** | Saves without re-checking. |
| Tap scrim | Assumption: same as dismissing = return to the draft (nothing saved). |
| Back `‹` | Assumption: if an amount is typed, the draft is kept for this trip (restored next time **+** is tapped within 10 minutes) instead of a confirm dialog, to protect the 5-second path. |

## Data
Reads:
- `trip_members` (not removed; `joined_from` ≤ expense date → default participants, PRD F2).
- `trip_categories` (chips), `trips.base_currency`, `trips.kitty_enabled`.
- Last expense (current revision + shares) for **Repeat**.
- Duplicate candidates: expenses in this trip with the **same amount, created within 10 minutes, by a different member** (PRD F3, [06 §5](../06-syncing.md)). The prototype checks same amount + same day + different payer; we use the PRD rule.
- `fx_cache` (R2, for a foreign-currency expense).

## API / Database
One SQLite transaction ([02 §5.1](../02-architecture.md), [06 §3.1](../06-syncing.md)):
| Write | Details |
|---|---|
| `expenses` | new header (UUID v7 = rounding seed), `local_state = pending` |
| `expense_revisions` | `kind = create`, `amount_minor`, `currency`, fx 1/1 `same`, `base_amount_minor`, `spent_at` = now, `category_id`, `description`, `split_mode`, `split_input`, `paid_from_kitty` |
| `expense_payers` | one row per payer (none when kitty-paid) |
| `expense_shares` | from `@toli/engine` `allocate()` |
| `outbox` | op **`expense.create`** with the full revision ([04 §2.1 example](../04-api-schema.md)) |
| `attachments` + `file_queue` | if a photo is attached; op **`attachment.register`**; upload later on Wi-Fi when "Wi-Fi only" is on (OQ-P17; [02 §5.3](../02-architecture.md)) |

Server re-verifies shares; mismatch → server result wins ([06 §6](../06-syncing.md)). **Duplicates found on pull** (made offline on two phones) use the sheet variant from [06 §5](../06-syncing.md): both are already saved, buttons **"Same one, delete mine"** (writes `expense.delete`) / **"Keep both"**.

## Edge cases
| Case | Behaviour |
|---|---|
| Payer is the only participant | Save → toast **"Saved"**, no tear (nobody to send a stub to). |
| Payer not a participant | Allowed (PRD §9.1); all participants get stubs. |
| Kitty payer | No tear, no duplicate check (prototype); toast **"₹X paid from the kitty"**. Kitty can't be combined with people ([07 §5.2](../07-calculation-engine.md)). Kitty balance may go negative (allowed, [07 §6](../07-calculation-engine.md)). |
| Late joiner | Default participants exclude members whose `joined_from` is after today; override in Split editor. |
| App killed mid-entry | Draft persisted to `kv` on every change (PRD §17 "zero data loss on force-quit mid-entry"); restored on reopen (Assumption). App killed mid-save: atomic, nothing half-saved. |
| Two members log the same bill offline | Detected on pull → duplicate sheet variant (above). |
| Very large amount | Cap per D-013; Indian grouping (**₹9,99,99,999**). |
| Settled trip (via deep link) | Rejected locally with toast **"This trip is settled. Reopen to edit."** |

## Analytics
| Event | When | Properties |
|---|---|---|
| `expense_added` | After local save | `split_mode`, `payer_count`, `currency`, `offline`, `entry_method` (`keypad` / `repeat` / `scan`), **`duration_ms`** (from **+** tap, or app open for widget, to saved) |
| `split_mode_changed` | Fired in Split editor | — |

Assumption (proposed, not in PRD §19): `duplicate_prompt_shown` with `resolution: skip | save_anyway | delete_mine | keep_both`.

## Accessibility
- Amount has a live label: "Amount, one thousand two hundred rupees. Three hundred rupees each, four people."
- Keypad keys labelled "1"…"9", "double zero", "0", "delete".
- **PAID BY** tile: "Paid by You. Double-tap to change." Long-press alternative (multiple payers) is also an accessibility action "Multiple payers".
- The duplicate sheet traps focus; the lime button is first.
- Save button disabled state is announced ("Save, dimmed, type an amount first").
- Dynamic type capped at 1.3× for the 64 px amount.

## Open questions / assumptions
- **Duplicate sheet wording:** resolved in [06 §5](../06-syncing.md): "Same one, skip / Save anyway" on save; "Same one, delete mine / Keep both" on pull.
- **Default category:** resolved by OQ-P15 in [01](../01-overview.md#open-questions): none selected, auto-suggest, saved without = "Misc".
- **Date/time** isn't editable here (default now). Backdating is done on [Expense detail](expense-detail.md).
- **Receipt photo (free, R1)** has no UI in the prototype; we reuse the BILL tile.
