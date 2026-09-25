# Screen · All expenses

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (refund rows R1b) |
| **Source** | **Assumption — not in UI reference; follows [13 Design system](../13-design-system.md).** Added because Recent shows only 5 rows and the Feed is R3 ([review P-2, M-1](../14-pre-development-review.md#7-product-problems), [D-018](../decisions/D-018-r1a-r1b-scope.md)). Row design reuses the Recent rows of [Trip home](trip-home.md) |
| **Related** | [features/expenses](../features/expenses.md) · [trip-home](trip-home.md) · [expense-detail](expense-detail.md) · [unresolved-changes](unresolved-changes.md) · [budget](budget.md) · [03 §5.1–5.4](../03-database-schema.md) · [06 §7](../06-syncing.md) · [07 §5, §12](../07-calculation-engine.md) · [D-029 Refunds](../decisions/D-029-refund-expense.md) |

---

## Purpose
**Why:** after the 6th expense there was no way to reach older ones in R1. People need to find "that scooter rental on day 1" to check or fix it.
**What:** every expense on the trip in one list, with search, filters (person, category, date) and sort. Each row opens [Expense detail](expense-detail.md).
**How:** reads only SQLite, so it works offline and is instant. The list is virtualised, so a trip with 2,000 expenses still scrolls smoothly ([06 §8](../06-syncing.md)).

## User goal
"Find the dinner from Saturday and check my share," or "show me everything Rahul paid."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | **See all** in the Recent card header |
| [Budget](budget.md) (R2) | A category row → opens here pre-filtered to that category (Assumption) |
| [Balance trace](balance-trace.md) | Assumption: **"See all of {Name}'s expenses"** under the lines → pre-filtered to that person |

## Exit points
| To | Trigger |
|---|---|
| [Expense detail](expense-detail.md) | Tap a row |
| [Unresolved changes](unresolved-changes.md) | Tap a row marked **COULDN'T SAVE** |
| [Add expense](add-expense.md) | The empty-state button **Add an expense** |
| Previous screen | `‹` back |

## UI structure
**Header** (`Header`): back · title **"All expenses"** (`type.header`) · subtitle **"Goa Weekend · 32 expenses"** (`type.small`, `color.textMuted`).

**Search and filters** (sticky under the header, `space.gutter` sides, `space.stackTight` gaps):
| Element | Details and copy |
|---|---|
| Search field | Input on `color.bg.card`, `radius.control`, `size.buttonM` high. Placeholder **"Search expenses"**. Matches the description, the category name and payer names. Case- and accent-insensitive. |
| Filter chips | `Chip` row (horizontal scroll): **Person ▾** · **Category ▾** · **Date ▾** · **Sort: Newest ▾**. A chip with a value turns lime (`color.accent` / `color.onAccent`) and shows it, e.g. **"Rahul"**, **"Food"**, **"Day 2"**. |
| Person sheet | `Sheet` **"Show expenses for"**: one row per member (removed and "Former member" rows included, at the end). Choice below: **"Paid by them"** · **"They're part of it"** · **"Either"** (default **Either**). |
| Category sheet | `Sheet` with the trip's categories plus **"No category (Misc)"**. Several can be ticked. |
| Date sheet | `Sheet`: **"Any day"** · one row per trip day (**"Day 2 · Sun 13 Oct"**) · **"Before the trip"** (`spent_at` before `start_date`) · **"Booked before trip"** (`is_committed`). Days use the trip time zone ([03 §4.1](../03-database-schema.md)). |
| Sort sheet | **Newest first** (default) · **Oldest first** · **Largest amount** · **Smallest amount**. |
| Result line | `type.caption` muted: **"32 expenses · ₹17,000"**, or with filters **"Showing 6 of 32 · ₹4,200"** + ghost link **"Clear"**. |

**List** (`Card`, `radius.card`, rows separated by `color.divider`, 110 px bottom space kept free as usual):
- When sorted by date, rows are grouped under day headers in `type.label` muted: **"DAY 2 · SUN 13 OCT"**, **"BEFORE THE TRIP"**.
- **Row** (`Row`, `size.rowTall`): category tile (`radius.chip`, 2-letter mono mark **"FO"**, **"TR"** …, as on Trip home) · title `type.bodyStrong`, ellipsis, e.g. **"Dinner at Thalassa"** · meta `type.small` muted **"Rahul paid · 4 people · 21:40"** · right: amount `type.mono` **"₹1,200"** over `type.micro` muted **"yours ₹300"** / **"not in this"**.

**Row markers** (text first, never colour alone):
| Case | Marker |
|---|---|
| Unsynced (`local_state = pending`) | Meta line replaced by lime `type.label` **"SAVED ON PHONE · WILL SYNC"** ([06 §7](../06-syncing.md)) |
| Rejected by the server (`outbox.state = rejected`) | `color.warning` `WarningCircle` icon + `type.label` **"COULDN'T SAVE · REVIEW"** |
| Paid from the kitty | Meta reads **"Paid from kitty · 4 people"** and a small `type.labelS` tag **"KITTY"** on `color.bg.raised` |
| Several payers | Meta reads **"2 people paid · 4 people"** |
| Refund (R1b, [D-029](../decisions/D-029-refund-expense.md)) | `type.labelS` tag **"REFUND"**; amount shown as **"−₹2,000"** (true minus); sub **"you get back ₹500"** |
| Booked before trip | `type.labelS` tag **"BOOKED"** |
| Foreign currency (R2) | Amount in base currency; `type.micro` under it **"IDR 5,00,000"** |

Components: `Screen`, `Header`, `Chip`, `Sheet`, `Card`, `Row`, `Icon`, `Button`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: local data. The first frame is already filled. |
| Empty | No expenses on the trip: `Icon` (`icon.l`) + **"No expenses yet"** + primary **"Add an expense"**. |
| Populated | As above. |
| No results | **"No expenses match."** + ghost **"Clear filters"**. |
| Error | n/a (local). Rows with a rejected op show their marker and link to [Unresolved changes](unresolved-changes.md). |
| Offline | Identical. Pending rows show their marker. |
| Syncing | Rows appear, change or disappear in place when a pull lands; the result line updates. Amounts count up, never fade ([13 §7.3](../13-design-system.md)). |
| Success | n/a. |
| Disabled | Settled trip: the list still works (read-only screen anyway). |
| Partial data | Expense with no description: title shows the category name, or **"Misc"**. Removed or anonymised payer: name shown as stored (**"Former member"**). |

## Interactions
| Gesture | Result |
|---|---|
| Type in search | Filters live (debounced 150 ms, Assumption). |
| Tap a filter chip | Opens its sheet. Tapping the chip's small `X` clears that filter. |
| Tap a row | Push [Expense detail](expense-detail.md). |
| Tap a **COULDN'T SAVE** row | Push [Unresolved changes](unresolved-changes.md). |
| Pull to refresh | Starts a sync pull (Assumption, same as Trip home). |
| Back | Previous screen. Filters are kept while the app is open (Assumption). |
| Long press / swipe | None in R1a (no bulk actions). |

## Data
All from SQLite:
| UI | Source |
|---|---|
| Rows | `expenses` (not deleted) + current `expense_revisions` (`description`, `category_id`, `spent_at`, `amount_minor`, `currency`, `base_amount_minor`, `paid_from_kitty`, `is_committed`, `is_refund`) |
| Payer / participant counts, "yours" | `expense_payers`, `expense_shares` (base amounts) |
| Day groups | `spent_at` converted to `trips.time_zone`; `trips.start_date` for "Day N" |
| Markers | `local_state`, `outbox` rows for the entity (`state`) |
| Result total | Σ `base_amount_minor` of the shown rows (refunds subtract, R1b; see Open questions) |
| Money format | `formatMoney` ([07 §12](../07-calculation-engine.md)) |

## API / Database
Writes nothing. No network calls.

## Edge cases
- **2,000 expenses:** virtualised list; search runs on an in-memory index built once per open (Assumption).
- **An expense edited so it no longer matches the filter:** it leaves the list after the edit; the result line updates.
- **Deleted expenses:** not listed. Their history stays in the trip log and the Feed (R3).
- **Removed members** still appear in the Person filter, so their old expenses can be found.
- **Two expenses at the same minute:** ordered by `spent_at`, then by expense ID (stable).

## Analytics
Proposed (not in PRD §19): `expense_list_viewed` (`from`: home / budget / trace), `expense_list_filtered` (`filter`: search / person / category / date / sort).

## Accessibility
- Each row reads in full: "Dinner at Thalassa. Rahul paid, four people, 21:40. One thousand two hundred rupees. Your share three hundred rupees. Saved on phone, will sync."
- Day headers are headings, so screen-reader users can jump by day.
- Filter chips announce their value ("Person filter, Rahul. Double-tap to change").
- The result line is a polite live region.

## Open questions / assumptions
- **Assumption:** the whole screen, including the filters and markers above.
- **Assumption:** the filtered total subtracts refunds. [07](../07-calculation-engine.md) does not yet define how "Group spent" treats refunds (R1b).
