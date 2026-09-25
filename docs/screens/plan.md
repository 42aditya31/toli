# Screen · Plan (itinerary + map)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 (the Plan **tab** arrives with the R3 tab bar) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- PLAN -->` block (lines 704–740), `PLAN` and `PINS` consts (lines 946–952), `// plan` logic (lines 1255–1266). Tab bar "Plan" (line 871). Sidebar: "R2 · CONTEXT + PLANNING → Itinerary + map". |
| **Related** | [features/itinerary-and-places](../features/itinerary-and-places.md) · [features/budget](../features/budget.md) · [features/expenses](../features/expenses.md) · [03 §6.1 itinerary_items, §6.2 places](../03-database-schema.md) · [04 §6.1 places-search](../04-api-schema.md) · [06 §4 itinerary.*, place.*](../06-syncing.md) · [07 §11 estimate vs actual](../07-calculation-engine.md) · [13 §2 warning, §6 TripMap, TabBar](../13-design-system.md) · [permission matrix](../09-security.md#permission-matrix) · [budget](budget.md) |

---

## Purpose
**Why:** the plan and the money belong in one place. The itinerary earns its place in Toli only if it connects to spend (PRD F11, open question 3).
**What:** a day-by-day plan with a small map of the day's places, and each item's **estimated cost** next to what was **actually spent**. The header shows the planned total against the budget.
**How:** items live in `itinerary_items` (field-LWW, editable by every member, offline). Linking an item to an expense turns "est ₹4,000" into "actual ₹4,600 · +15%".

## User goal
"What are we doing today, where, and are we spending more than we planned?"

## Entry points
| From | Trigger |
|---|---|
| `TabBar` (R3) | **Plan** tab (tab screen, crossfade). The R1a/R1b bar is Trip · (+) · Members; the full bar Trip · Plan · (+) · Vault · Feed comes in **R3** ([13 §6](../13-design-system.md), OQ-P11 in [01](../01-overview.md#open-questions)) |
| [Trip home](trip-home.md) (R2) | Assumption: a **Plan** tile or header link, because the R2 tab bar doesn't have a Plan tab yet |
| Trips list | Assumption: tapping a **PLANNING** trip ("Coorg Offsite · … ₹64,000 planned") opens Plan first |
| Feed | Assumption: tapping an itinerary-change item |

## Exit points
| To | Trigger |
|---|---|
| Other tabs (R3) | Trip · Vault · Feed, or **+** (Add expense). In R2: back (`CaretLeft`) to Trip home |
| Item detail / edit sheet | Tap an item card (Assumption) |
| [Budget](budget.md) | Tap the header total (Assumption) |
| Add expense (prefilled) | "Log the actual" on an item (Assumption) |

## UI structure

### Header (tab screen)
- Left: **"Plan"** in `type.title` (28/800, −0.02em).
- Right, stacked and right-aligned: the **planned total** in `type.mono` 14/700 (e.g. **"₹32,100"**), and under it 11 px muted **"₹2,100 over budget"** or **"₹X under budget"**.

### Day chips
A row of equal-width chips (gap 6, padding 0 18 10), one per trip day, 52 px high, radius 14:
- Top: weekday 11 px at 75% opacity (**Sat**, **Sun**, **Mon**, **Tue**).
- Bottom: date number 16/800 (**12**, **13**, **14**, **15**).
- Selected = lime background + `color.onAccent`; others `bg.card` + text colour. Background transition 200 ms.
- Default selection: **today** during the trip, else day 1 (Assumption; prototype defaults to day 2 = "today").

### Content (scroll, padding 0 18 110, gap 12)
1. **Map card** (130 px, `radius.card`, `bg.card`). The prototype shows a 24 px grid placeholder; **the app renders the design-system `TripMap`** (MapLibre with OpenFreeMap tiles, [13 §6](../13-design-system.md), [02 §1](../02-architecture.md)).
   - One lime **teardrop pin** per item of the selected day that has a place: 28 px, rotated −45°, the item number in `type.label` `color.onAccent` inside. Pins pop in (`ease.pop`).
   - Bottom-left label (`type.label` 10/700 +0.1em muted): **"MAP · 3 PLACES"**.
2. **Timeline**: one row per item of the selected day, in time order (`sort_key`):
   - Left rail (44 px): time in mono 12/700 (**"10:00"**) and a 2 px `bg.raised` vertical line below it.
   - Item card (`Card`, radius 20, padding 14, gap 6):
     - Top line: `type.label` 10/700 +0.1em muted **"1 · TRAVEL"** (number · type uppercase) on the left; place name 11 px muted on the right (**"Anjuna"**).
     - Title 16/600: **"Scooters for the day"**.
     - Cost chips (only when the estimate is > 0), `radius.badge`, padding 4 × 8, `type.labelS`-sized mono (no uppercase):
       | Chip | Look | Copy |
       |---|---|---|
       | Estimate | `bg.raised` | **"est ₹4,000"** |
       | Actual, over estimate | **`color.warning` + `color.onWarning`**, with the `WarningCircle` icon (`icon.s`). Never lime: lime means good or active ([13 §2](../13-design-system.md), review U-10) | **"actual ₹4,600 · +15% over"** |
       | Actual, at/under estimate | `bg.raised` + muted text | **"actual ₹1,200 · −20%"** |
       | Not linked yet | transparent + muted text | **"not spent yet"** |

Prototype day 2: **1 · TRAVEL** "Scooters for the day" (Anjuna) est ₹4,000 / actual ₹4,600 · +15% · **2 · ACTIVITY** "Scuba · Grande Island" (Vasco) est ₹12,000 / not spent yet · **3 · FREE TIME** "Sunset at Chapora Fort" (Chapora), no chips.

Item types (enum `itinerary_type`): Travel, Stay, Activity, Meal, Free time → labels **TRAVEL, STAY, ACTIVITY, MEAL, FREE TIME**.

The header's **"₹2,100 over budget"** line also uses `color.warning` with the icon; "under budget" stays muted.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; day chips scroll horizontally instead of shrinking below 44 px wide.

Components: `Screen`, `Chip`/`Segmented` (day chips), `Card`, `TripMap`, `Sheet`, `TabBar` (R3), `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: local data. Map tiles load progressively; pins show immediately on the grid background (the reference placeholder is the tile-loading look). |
| Empty (trip has no items) | Assumption: day chips still show; the map card shows "MAP · 0 PLACES"; below it a dashed `Card` "Nothing planned for Sun yet" + **"+ Add to this day"**. |
| Empty (selected day has no items) | Same as above for that day only. |
| Populated | As above. |
| Error | Place search fails (`503 places_unavailable`): the add-item sheet falls back to typing a place name only ([04 §6.1](../04-api-schema.md)). |
| Offline | Plan is fully readable and editable offline (PRD F11). Map tiles are best-effort; if missing, the grid placeholder stays with pins at their coordinates (PRD F12). Place search is disabled with "Search needs internet — type the name instead". |
| Syncing | No indicator here. Other members' edits appear live after pull. |
| Success | After adding an item: it animates in (`dur.fast`, `ease.enter`) at its time slot. |
| Disabled | **Settled trips:** planning edits are not on the settled-trip allow-list in [06 §5](../06-syncing.md), so they're rejected (`trip_settled`). Add/edit controls are hidden, with "This trip is settled. Reopen to edit." / **Request reopen**. Who can edit the plan: [permission matrix](../09-security.md#permission-matrix). |
| Partial data | Item without a time: listed at the end of the day with "—" in the rail (Assumption). Item without a place: no pin, no place label. Items with `day` = null are the unscheduled **"Ideas"** list ([03 §6.1](../03-database-schema.md)); shown as an extra chip after the days (Assumption), and as the only list when the trip has no dates. |

## Interactions
| Gesture | Result |
|---|---|
| Tap a day chip | Switches day; map pins and timeline update. |
| Tap a pin | Scrolls to and highlights that item (Assumption). |
| Tap an item | Item `Sheet`: title, type, time, place (search), notes, estimated cost (keypad, with a currency picker defaulting to the trip currency), **Link an expense** (pick from the trip's expenses) / **Log the actual** (Add expense prefilled with title, category and date, linked on save), **Delete**. (Assumption: not in the reference.) |
| Long press + drag an item | Reorder within the day; drop on a day chip to move to another day (PRD F11). |
| "+ Add to this day" (end of timeline) | Opens the item sheet for the selected day (Assumption). |
| Tap the map card | Assumption: expands to a full-screen trip map with all saved places and items (PRD F12). |

## Data
| Value | Source (SQLite) |
|---|---|
| Day chips | `trips.start_date`–`end_date` |
| Items | `itinerary_items` where `trip_id`, `day` (null = Ideas), not deleted, ordered by `sort_key` (then `time`) |
| Pins, place label | `places` via `itinerary_items.place_id` (`name`, `lat`, `lng`) |
| Estimate | `itinerary_items.estimated_cost_minor` in `estimated_currency` (default: trip currency). Other currencies are converted with today's cached rate, for display only ([03 §6.1](../03-database-schema.md)) |
| Actual | the linked expense's current revision `base_amount_minor` via `itinerary_items.linked_expense_id` |
| Diff % | `(actual − est) × 100 / est` ([07 §11](../07-calculation-engine.md)), shown with "+" or true minus "−" |
| Planned total | Σ estimates (converted to the trip currency) over all items of the trip |
| vs budget | the `trip_budgets` row with `scope = total` ([03 §5.9](../03-database-schema.md)) − planned total |

## API / Database
| Action | Op / endpoint |
|---|---|
| Add / edit an item | `itinerary.upsert` (field-LWW) |
| Reorder / move day | `itinerary.move` (new `sort_key` fractional index and/or `day`) |
| Delete an item | `itinerary.delete` (soft) |
| Save a place | `places-search` (`GET /places-search`, 300 ms debounce, ≥ 3 chars), then `place.upsert` |
| Link / unlink an expense | `itinerary.upsert` patch `linked_expense_id`: a field-LWW planning edit, never a money revision. The link is stored **only** on the planning side; expenses have no itinerary column ([03 §5.9](../03-database-schema.md)) |
| Log the actual | `expense.create`, then `itinerary.upsert` with `linked_expense_id` (both queued in one transaction) |

## Edge cases
- **Two people drag the same item at once:** field-LWW on `sort_key`/`day`, the later one wins; nobody's item is lost.
- **Linked expense deleted:** the chip returns to "not spent yet".
- **Linked expense in another currency:** actual uses its frozen base amount.
- **Estimate is 0 but an expense is linked:** Assumption: show only "actual ₹X" (no %).
- **Several expenses for one item** (scuba paid in two parts): Assumption: v1 links one expense; the sheet warns "Already linked to Scuba deposit".
- **More than ~8 pins:** the map auto-fits bounds; numbers still match the timeline.
- **Late joiner:** no effect on the plan.

## Analytics
PRD §19 has no itinerary event, but R2's ship criterion is "itinerary-to-expense linking used in ≥ 30% of trips that have an itinerary". Proposed (Assumption): `itinerary_item_added` (`type`, `has_estimate`), `itinerary_linked_expense` (`method: link | log_actual`).

## Accessibility
- Day chips are a tab list: "Sunday 13, selected, day 2 of 4".
- Each item reads "10:00, Travel, Scooters for the day, Anjuna. Estimated four thousand rupees, actual four thousand six hundred, 15 percent over."
- "Over" / "under" is spoken and written (+/−, and the word "over"), with the warning icon, never shown by colour alone.
- Drag-to-reorder has an alternative: "Move up / Move down / Move to day…" actions in the item sheet and as screen-reader custom actions.
- The map is decorative for screen readers; the timeline carries the same information.

## Open questions / assumptions
- **Resolved:** the item–expense link is stored only in `itinerary_items.linked_expense_id` ([03 §5.9](../03-database-schema.md)).
- **Resolved:** estimates carry their own `estimated_currency` ([03 §6.1](../03-database-schema.md)).
- **Resolved:** the reference coloured an **over-estimate** chip lime. It now uses `color.warning` + icon + "over" (review U-10, [13 §2](../13-design-system.md)).
- **Resolved:** planning edits on a settled trip are rejected; the one allow-list is [06 §5](../06-syncing.md).
- **Assumption:** add/edit/link UI, the full-screen map and the "Ideas" list are not in the reference and are designed here from PRD F11/F12.
