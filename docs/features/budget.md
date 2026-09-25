# Feature · Budget and burn-down (F8)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 ([D-018](../decisions/D-018-r1a-r1b-scope.md): not in R1a or R1b) |
| **PRD refs** | F8, F9 (categories), F11 (planned total), F16 (budget pushes), §5.1 (free), §19 |
| **Related** | Screens: [budget](../screens/budget.md) · [trip-home](../screens/trip-home.md) · [plan](../screens/plan.md) · [notifications](../screens/notifications.md) · Docs: [07 §10](../07-calculation-engine.md) · [03 §5.2, §5.8, §5.9, §6.1](../03-database-schema.md) · [04 §11](../04-api-schema.md) · [06 §4](../06-syncing.md) · Features: [itinerary-and-places](itinerary-and-places.md) · [notifications](notifications.md) · Decisions: [D-009](../decisions/D-009-notifications.md) |

---

## 1. Purpose

Tell the group, on day two, whether the money will last. Show spend against a budget, project where the trip will finish at the current pace, and nudge everyone once at 75% and once at 100%.

## 2. User problem

- Groups set a rough number ("₹30k for the weekend") and only find out on the last night that they blew through it.
- Pre-paid bookings (flights, the villa) make day one look like a disaster, so people stop trusting the number.
- Some members have their own ceiling that is different from the group's.

## 3. Business goal

- Makes Toli a trip **money manager**, not only a splitter (PRD pillar B).
- Budget and the burn-down chart are **free** (not in the PRD §15 Pro list; OQ-P18 in [01](../01-overview.md#open-questions)). Only the extra analytics charts (day-by-day, category trends) are Pro. It gives the Organiser a reason to open the app daily, which drives expense logging.
- Links the itinerary's **planned total** to real money (PRD F11), which is the planning pillar's reason to exist.

---

## 4. User flow

**Set a budget**
1. On Trip home, the **Budget** tile says "Set a budget" (or, if the itinerary has estimates, "₹64,000 planned · set a budget?").
2. The user taps it and enters a total in the base currency on the keypad. The planned total is offered as a one-tap default.
3. Optional: **Add category budgets** (e.g. Food ₹8,000) and **My own budget** (a personal ceiling).
4. Save writes a `budget.set` op. The tile now shows "₹X of ₹30k" with a bar and the % used.

**Check progress**
1. The user taps the Budget tile. The Budget screen shows the spent amount, "of ₹30,000 · day 2 of 4", a message ("At this rate you'll finish 18% over, around ₹35,400." or "On track: about ₹27,800 by the last day."), a burn-down chart, **Booked before trip** vs **Spent on the trip** tiles, and **By category** bars.

**Get nudged**
1. When an applied expense pushes group spend to ≥ 75% of the total budget, every member gets one push ("Goa Weekend has used 75% of its ₹30,000 budget") with a progress bar and a **View budget** action that opens the Budget screen. Same again at 100%.
2. Each threshold fires once per budget (see §6 rule 8). If the group later **raises** the budget so spend is back under a threshold, that threshold is re-armed and can fire again (rule 9).
3. A **personal** budget alerts only its own member, never the group.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| BU-01 | A total trip budget in the trip base currency. | MUST | F8 |
| BU-02 | Optional per-category budgets, in the base currency. | MUST | F8 |
| BU-03 | An optional **personal** budget per member, compared with that member's own shares. | MUST | F8 |
| BU-04 | Show spend vs budget, plus a burn-down projected over the days remaining ("at this rate you'll finish 18% over"). | MUST | F8 |
| BU-05 | Separate **committed** spend (booked before the trip) from **in-trip** spend in the burn-down. | MUST | F8 |
| BU-06 | Push at 75% and 100% of the total budget, to the trip, **once each**. | MUST | F8, F16 |
| BU-07 | Budget, burn-down and alerts are free. | MUST | §15 |
| BU-08 | Before the trip starts, show the itinerary's planned total against the budget. | MUST | F11 |
| BU-09 | Everything on the Budget screen is computed locally and works offline. | MUST | §12 |
| BU-10 | Category budgets show an in-app warning when a category passes 100%, without a push. | SHOULD | F8 (proposal) |
| BU-11 | Budget pushes show a progress bar in the notification. | SHOULD | F16 |

---

## 6. Business rules

All maths is in [07 §10](../07-calculation-engine.md) and runs in `@toli/engine` with `today` passed in.

1. **What counts as spend:** the `base_amount_minor` of the **current revision** of every non-deleted expense, **including expenses paid from the kitty**. Settlements and kitty contributions are not spend; they only move money between people.
2. **Committed** = expenses with `is_committed = true`. **In-trip** = the rest.
3. **Default for `is_committed`:** true when the expense's `spent_at` is before the trip `start_date`, or when it is created from a booking that was booked before the start date ([vault](vault.md)). The user can change it with the **Booked before the trip** toggle on the expense.
4. **Days:** `days_total` = trip length in days; `days_elapsed = clamp(today − start + 1, 1, days_total)`, in the trip's local date.
5. **Projection:** `projected = committed + in_trip × days_total / days_elapsed`, integer maths, rounded half-up. **Over/under %** = `(projected − budget) × 100 / budget`.
6. **Personal budget** compares Σ that member's `base_minor` shares with their personal amount. It doesn't include what they paid for others.
7. **Category spend** = Σ `base_amount_minor` per `category_id`. Uncategorised expenses show as "Misc" (OQ-P15).
8. **Alerts:** evaluated **on the server** after each applied money op that changes total spend (in `sync-push`, after commit, [06 §6](../06-syncing.md)). When `spent × 100 / budget` first reaches 75, queue one `budget_75` push and set `trip_budgets.alert_75_at`; same for 100 (`alert_100_at`). For the total budget the push goes to every claimed member; for a personal budget, only to that member. Category budgets show an in-app warning only (BU-10). A fired alert is **not** sent again just because spend drops (an expense is deleted) and rises again ([03 §5.9](../03-database-schema.md)).
9. **Re-arming:** when `budget.set` **raises** the amount so that spend falls back below a threshold, the server sets that `alert_*_at` back to null, so the alert can fire again for the new amount ([03 §5.9](../03-database-schema.md); review C-11). Lowering the budget never re-arms anything.
10. **Who can set:** see §12. Total and category budgets are shared planning data (field-level last-write-wins, every change in the trip log). A personal budget is private (rule 13).
11. **Budget is display only.** It never changes balances, shares or settlements ([07 §11](../07-calculation-engine.md)).
12. Budgets are always in the **trip base currency**.
13. **Personal budgets are private end to end:**
    - RLS hides `member`-scope `trip_budgets` rows from everyone except that member;
    - the `budget.set` / `budget.delete` op for a personal budget is stored with `trip_ops.visible_to_member_id` = that member, so other phones **never pull it** (review S-07, [06 §4](../06-syncing.md));
    - `/trip-snapshot` includes the caller's own personal budget and nobody else's ([04 §2.3](../04-api-schema.md));
    - the budget alert for it goes only to that member.
14. **Warning colour:** over budget, a category over 100% and "projected over" use `color.warning` with an icon and the word "over". Lime is only for good or active states ([13](../13-design-system.md); review U-10).

---

## 7. Data model

| Need | Table / column in [03](../03-database-schema.md) | Status |
|---|---|---|
| Total, category and personal budgets | `trip_budgets` ([03 §5.9](../03-database-schema.md)): `scope` (`total` / `category` / `member`), `category_id`, `member_id`, `amount_minor`; `member`-scope rows are readable only by that member (RLS) | exists |
| "Alert already fired" marker | `trip_budgets.alert_75_at`, `alert_100_at` | exists |
| Committed flag | `expense_revisions.is_committed` | exists |
| Spend, categories | `expense_revisions.base_amount_minor`, `category_id`; `trip_categories` | exist |
| Per-member shares | `expense_shares.base_minor` | exists |
| Planned total | Σ `itinerary_items.estimated_cost_minor`, each converted from `estimated_currency` with today's cached rate (display only) | exists |
| Push queue + dedupe | `notification_outbox` (`dedupe_key` UNIQUE, e.g. `budget_75:<budget_id>`) | exists |

---

## 8. API requirements

| Call | Use |
|---|---|
| `budget.set` op via `/sync-push` | a `trip_budgets` row: `{ id, scope: "total" \| "category" \| "member", category_id?, member_id?, amount_minor }`. Field-LWW ([06 §4](../06-syncing.md)). |
| `budget.delete` op | clears a budget (soft delete). Budgets are **never** set through `trip.update`. |
| Push payload | `kind: "budget_75" \| "budget_100"`, category `trip_updates`, `amount_minor` (spent), `progress_bp` (0–10000, for the progress bar), `actions: ["view_budget"]` ([04 §11](../04-api-schema.md)). With **Hide amounts on lock screen** on, the server removes the amount from the text. |
| Reads | local SQLite only; no endpoint needed |

---

## 9. UI requirements

Screen doc: [screens/budget](../screens/budget.md). From the UI reference (BUDGET and HOME sections):

- **Trip home tile:** "Budget" label, mono `NN%` top-right, big amount "₹14,200 of ₹30k", a 6 px bar in `color.text` (not lime; lime is for positive money). Over 100%, the bar uses `color.warning`.
- **Budget screen:**
  - Hero: spent amount (`type.amountL`), sub-line "of ₹30,000 · day 2 of 4".
  - Message card: **warning** style (`color.warning` + warning icon) when projected over ("At this rate you'll finish 18% over, around ₹35,400."), card colour when on track ("On track: about ₹27,800 by the last day."). It is never lime for a bad state (review U-10).
  - Burn-down chart: dashed budget line with label "budget ₹30k"; solid lime **actual** line from "Before" (committed) through each day so far; dashed white **projection** line to the last day, ending in an open circle. X-axis: "Before", then weekday names.
  - Two tiles: **Booked before trip** and **Spent on the trip** (mono amounts).
  - **By category:** rows with name, mono amount and a lime bar; with a category budget, show "₹6,200 of ₹8,000". A category over its budget switches its bar to `color.warning` and says "over".
  - **My budget** row (only for the member who set one).
  - Footer: "Everyone gets a nudge at 75% and 100% of the budget."
- Accessibility: the chart has a text summary ("Spent ₹14,200 of ₹30,000. Projected ₹35,400, 18% over.") ([13 §9](../13-design-system.md)).
- Never show over-budget by colour alone: the message text always says "over".

---

## 10. States

| State | Display |
|---|---|
| No budget | Tile "Set a budget"; screen shows spend and categories, with a **Set a budget** CTA |
| Planning (before start date) | "Planned ₹64,000 · budget ₹60,000 · ₹4,000 over"; committed spend so far; **no projection** |
| Active, on track | Card-coloured message |
| Active, projected over | Warning-style message (icon + "over") |
| Over 100% | Hero amount + "₹2,300 over budget" in the warning style |
| Trip ended / settled | Projection line hidden; "Finished at ₹31,900 · 6% over" |
| No trip dates | Spent vs budget only; message "Add trip dates to see a projection" |
| Pending (offline) changes | Numbers include local changes; nothing special shown |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Day 1 with a big pre-paid villa | Villa is committed, so the projection only extrapolates in-trip spend. |
| Budget set to 0 | Not allowed (minimum 1 major unit); clearing sends `budget.delete`. |
| Expense deleted after the 75% alert | Alert is not re-sent when spend crosses 75% again. |
| Budget raised after the 75% alert (₹30k → ₹40k, spend ₹24k = 60%) | `alert_75_at` is re-armed; the 75% alert fires again when spend reaches ₹30k. |
| Budget lowered after an alert | Nothing is re-armed. If spend is now over 100% for the first time, the 100% alert fires. |
| Expense edited into another category | Category bars move; category warnings re-evaluate. |
| Trip dates changed mid-trip | `days_total` and `days_elapsed` recalculate; no alert re-fire. |
| Foreign-currency expenses | Counted by their frozen base amount. |
| Kitty-paid expense | Counts as spend (it is spend). |
| Today is outside the trip dates | `days_elapsed` is clamped; after the end, projection = actual. |
| Personal budget on a member who leaves | Removed with the member's row visibility; no effect on others. |
| Two members set different totals offline | Last write received by the server wins; the other gets a quiet notice ([D-004](../decisions/D-004-conflict-strategy.md)). |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can set total and category budgets; a personal budget is set and seen only by its own member; web viewers and ghosts can't see budgets.

**Push recipients:** every claimed member with Trip updates notifications on ([notification_preferences](../03-database-schema.md)) for the total budget; only the owner for a personal budget.

## 13. Offline behaviour

- The whole Budget screen is computed from SQLite by the engine: fully offline.
- Setting a budget offline writes a local op and syncs later.
- Crossing 75% offline shows an **in-app** banner on the phone that made the change; the **push** to the group goes out only when the server applies the op.

## 14. Sync behaviour

- `budget.set` / `budget.delete` are field-LWW ops ([06 §4–5](../06-syncing.md)).
- Personal-budget ops are **private ops** (`visible_to_member_id`), so only the owner's phones pull them.
- Alerts are decided by the server in `seq` order, so two phones crossing 75% offline at the same moment still produce **one** push (`alert_75_at` + dedupe key).
- Other phones get the budget through the normal pull.

---

## 15. Analytics

PRD §19 has no budget events. Proposed additions (to be added to [10 Observability](../10-observability.md)):

| Event | Properties |
|---|---|
| `budget_set` | `scope` (total/category/member), `from_planned_total` (bool), `trip_status` |
| `budget_viewed` | `days_elapsed`, `projected_over` (bool) |
| `budget_alert_sent` (server) | `threshold` (75/100), `days_elapsed` |

No amounts are sent.

## 16. Error handling

| Error | Handling |
|---|---|
| `trip_settled` on `budget.set` | "This trip is settled. Reopen to edit." |
| Budget amount invalid | Inline "Enter an amount above ₹0" |
| Push fails (FCM) | Retried by the notification sender; in-app state is unaffected |
| Engine division guard | `budget = 0` never reaches the engine (validated by Zod) |

## 17. Testing

- Engine unit tests for §10: committed/in-trip split, projection rounding, clamp before/after trip, over/under %.
- Golden fixture: the UI reference data (₹30,000 budget, committed ₹4,000 hotel, day 2 of 4) gives the same message as the prototype.
- Property test: budget output never changes any balance.
- Server test: two concurrent ops crossing 75% → exactly one `budget_75` outbox row.
- Server test: raising the budget below the threshold re-arms `alert_75_at`; lowering it doesn't.
- RLS / pgTAP: another member sees no `member`-scope budget row and no `trip_ops` row for it.
- E2E: set budget → add expenses → 75% push arrives once.

## 18. Cost and free-tier impact

| Item | Impact |
|---|---|
| Compute | on the phone; zero server cost |
| Storage | a few rows per trip |
| Pushes | at most 2 per trip per member; FCM is free |
| Breaking point | none foreseeable |

## 19. Future considerations

- Daily allowance ("₹2,100 a day left for the rest of the trip").
- Per-person budget suggestions from the itinerary.
- Budget templates by trip type.
- Cross-trip budget history (Pro analytics).

## 20. Open questions

All resolved:
1. **Storage:** `trip_budgets` holds all scopes and the alert markers ([03 §5.9](../03-database-schema.md)).
2. **Op path:** `budget.set` / `budget.delete` only ([06 §4](../06-syncing.md)).
3. **Re-arming alerts:** yes, when the budget is raised so spend falls below the threshold ([03 §5.9](../03-database-schema.md), review C-11).
4. **Personal budget privacy:** RLS plus private ops (`trip_ops.visible_to_member_id`, review S-07).
5. **Who can change the group budget:** the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)).
6. **Is the chart free?** Yes; Pro adds only the extra analytics charts (OQ-P18, [01](../01-overview.md#open-questions)).
7. **Notification category:** `trip_updates` ([features/notifications](notifications.md)).
