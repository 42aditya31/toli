# Screen · Budget (burn-down)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 (the burn-down is free, OQ-P18) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- BUDGET -->` block (lines 657–702), `// budget` logic (lines 1138–1156), and the **Budget** tile on Trip home (lines 269–273). Sidebar: "R2 · CONTEXT + PLANNING → Budget burn-down". |
| **Related** | [features/budget](../features/budget.md) · [features/expenses](../features/expenses.md) · [features/notifications](../features/notifications.md) · [03 §5.9 trip_budgets, §5.2 is_committed](../03-database-schema.md) · [06 §4 budget.set / budget.delete](../06-syncing.md) · [07 §10 burn-down, §11 analytics](../07-calculation-engine.md) · [13 §2 warning, §6 BurnDownChart](../13-design-system.md) · [permission matrix](../09-security.md#permission-matrix) · [notifications](notifications.md) · [trip-home](trip-home.md) · [all-expenses](all-expenses.md) |

---

## Purpose
**Why:** on day two the Organiser wants to know whether the group will run out of money, not find out on day four.
**What:** how much has been spent against the budget, a burn-down chart with a projection to the last day, what was **booked before the trip** vs **spent on the trip**, and a breakdown by category.
**How:** everything is computed on the phone by `@toli/engine` §10 from local expenses. Pre-booked spend (`is_committed`) is kept separate so the first day doesn't look like a disaster (PRD F8).

## User goal
"Are we on track? If not, by how much, and where is the money going?"

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | Tap the **Budget** tile ("Budget · 60%", "₹18,000 of ₹30k", white progress bar) |
| [Push / in-app banner](notifications.md) | `budget_75` or `budget_100`, action `view_budget` ([04 §11](../04-api-schema.md)) → deep link `toli://trip/<id>/budget` |
| [Plan](plan.md) | Assumption: tapping the "₹X under/over budget" header figure |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | Back "‹" |
| Set / edit budget sheet | Assumption: tap the big amount or an **Edit** action (not in the reference) |
| [All expenses](all-expenses.md), filtered by category | Tap a category row |

## UI structure

### Header
`Header` with back "‹" and title **"Budget"**. Assumption: a right action **"Edit"** (`Button` tonal, 40 px) opens the budget sheet.

### Content (scroll, padding 0 18 24, gap 14)
1. **Headline figure** (padding 0 2):
   - Total spent, `type.amountL` 48/800, −0.04em, e.g. **"₹18,000"**.
   - Caption 14 px muted: **"of ₹30,000 · day 2 of 4"**.
2. **Message banner** (`Banner`, `radius.key`, padding 14 × 16, `type.bodyStrong`):
   - Over the projection, or already over budget: the **`warning` variant**: `color.warning` background, `color.onWarning` text, `WarningCircle` icon and the word **"over"**: **"At this rate you'll finish 7% over, around ₹32,000."** Over budget is **never lime**, because lime means good or active ([13 §2](../13-design-system.md), review U-10).
   - On track: `bg.card` background, text colour: **"On track: about ₹28,500 by the last day."**
3. **Burn-down chart card** (`Card`, `radius.card`, padding `space.cardPad`): the design-system **`BurnDownChart`** ([13 §6](../13-design-system.md)), full card width × 170. The part of the actual line above the budget line, and a projection that ends over budget, are drawn in `color.warning` (Assumption):
   | Mark | Style |
   |---|---|
   | Budget line | horizontal, 1.5 px dashed `3 5`, muted; label **"budget ₹30k"** (mono 11, muted) just above it |
   | Baseline | 1 px `bg.raised` at the bottom |
   | Actual spend | lime line 3.5 px, round caps/joins, draws in over 1.2 s (`ease.move`). Points: "Before" (committed), then cumulative spend at the end of each elapsed day. Each point is a 5 px lime dot with a 3 px `bg.card` ring. |
   | Projection | from today's point to the last day, 2.5 px dashed `6 6`, text colour at 60% opacity, ending in a hollow 5 px circle |
   | X labels | mono 10 muted, centred: **"Before"**, then the short weekday of each trip day (prototype: **Sat, Sun, Mon, Tue**) |
4. **Two tiles** (2 columns, gap 10; `bg.card`, radius 18, padding 14):
   - **"Booked before trip"** + amount (`type.mono` 16/700), e.g. ₹4,000.
   - **"Spent on the trip"** + amount, e.g. ₹14,000.
5. **"By category" card** (`Card`, radius 24): title 15/600, then one row per category sorted by amount (largest first): name left, amount (mono) right, and a 6 px `ProgressBar` (lime fill, width relative to the largest category, grows in over 0.8 s). Prototype order: Travel ₹5,400 · Fuel ₹4,200 · Stay ₹4,000 · Food ₹3,600 · Tolls ₹800.
6. **Footnote** (12 px muted): **"Everyone gets a nudge at 75% and 100% of the budget."**

A category over its own budget shows its bar in `color.warning` with the word **"over"** next to the amount.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the two tiles stay side by side; the chart thins its x-labels.

Components: `Screen`, `Header`, `Banner` (message, `warning` variant), `Card`, `ProgressBar`, `BurnDownChart`, `Keypad`, `Sheet`, `Icon`.

**Trip home tile** (for reference): label **"Budget"**, used % in `type.label` muted, amount + **"of ₹30k"** `type.small` muted, a 6 px bar in `color.text` (not lime), capped at 100%. **Over budget:** the bar and % turn `color.warning`, with the `WarningCircle` icon and the word "over".

## States
| State | Behaviour |
|---|---|
| Loading | n/a: read from SQLite synchronously; first paint has data. |
| Empty (no budget set) | Assumption: headline shows total spent with "No budget yet", the chart shows only the actual line (no budget line, no projection), and a primary button **"Set a budget"** opens the budget sheet. The Home tile reads "Set budget". |
| Empty (no expenses) | Headline **"₹0"**, "of ₹30,000 · day 1 of 4", banner "On track: nothing spent yet." (Assumption), chart shows the budget line only, category card hidden. |
| Populated | As above. |
| Error | n/a: no network call. If the trip has no dates, see Partial data. |
| Offline | Works fully (local maths). Values include expenses saved on this phone but not yet synced. |
| Syncing | No indicator on this screen; numbers update live as pulled expenses arrive. |
| Success | After saving a budget: toast **"Budget set · ₹30,000"** (Assumption). |
| Disabled | Who can set trip and category budgets, and who sees a personal budget: the [permission matrix](../09-security.md#permission-matrix). |
| Partial data | **No trip dates:** no "day X of Y", no projection, x-axis shows dates that have spend (Assumption). **Before the trip starts:** only "Before" is plotted; banner compares the committed + planned total from [Plan](plan.md) to the budget. **Multi-currency:** all amounts are in the base currency using each expense's frozen rate. |

## Interactions
| Gesture | Result |
|---|---|
| Back | Pop. |
| Tap **Edit** / the headline (Assumption) | Budget `Sheet`: total amount on the `Keypad`, optional per-category amounts, optional "My personal budget" (visible only to you). Save writes `budget.set`; clearing an amount writes `budget.delete`. |
| Tap a chart point (Assumption) | Tooltip: "Sun · ₹7,800 spent that day". |
| Tap a category row | Opens [All expenses](all-expenses.md) filtered to that category. |

No drag, no long press.

## Data
| Value | Source (SQLite) | Rule |
|---|---|---|
| Budget | `trip_budgets` (scope `total`; `category` and `member` rows for the per-category and personal budgets) | Budgets live only in `trip_budgets`, never on `trips`. `member`-scope rows are only visible to that member ([03 §5.9](../03-database-schema.md)), and their `budget.set` ops are private (`trip_ops.visible_to_member_id`) |
| Trip days, "day 2 of 4" | `trips.start_date`, `end_date`, today (passed in) | `days_elapsed = clamp(today − start + 1, 1, days_total)` ([07 §10](../07-calculation-engine.md)) |
| Spent, committed, in-trip | current `expense_revisions` of non-deleted `expenses` (incl. kitty-paid): `base_amount_minor`, `is_committed`, `spent_at` | committed = `is_committed`; in-trip = the rest |
| Projection | engine | `projected = committed + in_trip × days_total / days_elapsed`, half-up |
| Over/under % | engine | `(projected − budget) × 100 / budget` |
| Categories | `category_id` → `trip_categories.label` | Σ base amount per category |
| Home tile % | engine | `spent × 100 / budget`, bar capped at 100% |

## API / Database
| Action | Write |
|---|---|
| Set or change the trip budget | `budget.set` op (scope `total`, amount) → outbox → `POST /sync-push`. Field-LWW. Never `trip.update` ([06 §4](../06-syncing.md)). |
| Per-category / personal budget | `budget.set` with scope `category` / `member` (one `trip_budgets` row each); remove with `budget.delete`. |
| 75% / 100% alerts | Server-side, after each applied op that changes spend: queue `budget_75` / `budget_100` in `notification_outbox` and set `trip_budgets.alert_75_at` / `alert_100_at`, so each fires **once** per budget ([notifications](notifications.md)). **Re-armed:** when `budget.set` raises the amount so that spend falls back below a level, that level's `alert_*_at` is set back to null ([03 §5.9](../03-database-schema.md)). |
| Mark an expense "booked before the trip" | Done on the expense (Add/Edit expense), not here: `expense.edit` patch `is_committed`. |

## Edge cases
- **Budget raised after an alert fired:** the alert **re-arms** for each level that spend is now below ([03 §5.9](../03-database-schema.md)).
- **Days** ("day 2 of 4", per-day points) use `trips.time_zone`.
- **Spend over 100%:** headline and bar stay honest (e.g. "112%"); the Home bar is capped at full width, the % keeps counting.
- **Day 1 morning with a big hotel booked earlier:** committed is separated, so the projection only extrapolates in-trip spend.
- **Deleted expense:** leaves the totals immediately (current revision only).
- **Trip longer than ~10 days:** x-labels thin out to every other day (Assumption).
- **Trip extended:** projection recomputes with the new `days_total`.
- **Expenses dated outside the trip dates:** before start → counted as "Before" only if `is_committed`; otherwise plotted on day 1 (Assumption).

## Analytics
PRD §19 has no budget event. Proposed (Assumption, not in PRD): `budget_viewed` (`used_pct`, `projected_over_pct`), `budget_set` (`scope`). The 75/100% pushes are measured through the notification pipeline.

## Accessibility
- The chart has a text summary as its label: "Spent eighteen thousand rupees of thirty thousand. On day 2 of 4. Projected thirty-two thousand, 7 percent over."
- Over/under is conveyed by the words "over" / "On track" and the warning icon, never by colour alone.
- Category rows read "Travel, five thousand four hundred rupees".
- Reduce Motion: the line and bars appear without drawing in.

## Open questions / assumptions
- **Resolved:** per-category and personal budgets are stored in `trip_budgets` ([03 §5.9](../03-database-schema.md)).
- **Resolved:** who can edit budgets is in the [permission matrix](../09-security.md#permission-matrix); field-LWW, audited in `trip_ops`.
- **Resolved:** over budget uses `color.warning`, not lime (review U-10); alerts re-arm when the budget is raised (review C-11).
- **Resolved:** the burn-down (F8) is free; the extra day-by-day and category-trend charts are Pro (OQ-P18 in [01](../01-overview.md#open-questions)).
- **Assumption:** the reference hardcodes "₹30k" and "day 2 of 4"; real labels use `formatMoney` with a compact form ("₹30k") only in the chart label and Home tile.
