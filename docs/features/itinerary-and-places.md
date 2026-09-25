# Feature · Itinerary, places and map (F11 + F12)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 ([D-018](../decisions/D-018-r1a-r1b-scope.md): not in R1a or R1b) |
| **PRD refs** | F11, F12, F1 (destination autocomplete), F8 (budget), §12 (offline), §20 (R2 ship criterion), §22.3 (does the itinerary earn its place?) |
| **Related** | Screens: [plan](../screens/plan.md) · [trip-home](../screens/trip-home.md) · [add-expense](../screens/add-expense.md) · [budget](../screens/budget.md) · Docs: [03 §5.9, §6.1–6.2](../03-database-schema.md) · [04 §6.1](../04-api-schema.md) · [06 §4–5](../06-syncing.md) · [07 §11](../07-calculation-engine.md) · Features: [budget](budget.md) · [vault](vault.md) · Decisions: [D-004](../decisions/D-004-conflict-strategy.md), [D-006](../decisions/D-006-append-only-money.md) |

---

## 1. Purpose

Keep the plan and the money in the same place. A day-by-day plan with estimated costs rolls into a **planned total** that sits next to the budget before the trip, and each item can be linked to the real expense afterwards ("Scuba: estimated ₹12,000, actual ₹13,800").

## 2. User problem

- The plan lives in a Google Doc or WhatsApp, the money in another app. Nobody knows before the trip whether the plan fits the budget.
- During the trip, people want "what's next and where" without signal.
- Everyone wants to edit the plan at once, and changes get lost.

## 3. Business goal

- The **bridge between planning and the money core**: the reason the itinerary belongs in Toli and not in Wanderlog (PRD F11).
- **R2 ship criterion:** itinerary-to-expense linking used in ≥ 30% of trips that have an itinerary (PRD §20).
- **Kill criterion:** if under 20% link any item, reduce the pillar to a lightweight day plan (PRD §22.3). So linking must be measured from day one.
- **Explicitly not** route optimisation, drive-time estimates or recommendations (PRD F12). Competing with Wanderlog there is a distraction.

---

## 4. User flow

**Build the plan**
1. The user opens the **Plan** tab. The header shows the planned total ("₹64,000") and "₹4,000 under budget" (or "over").
2. Day chips (Sat 12 · Sun 13 · Mon 14 · Tue 15) come from the trip's start and end dates. The user picks a day.
3. **+ Add to this day** opens a sheet: title (required), type (Travel, Stay, Activity, Meal, Free time), time (optional), place (optional, search), notes, estimated cost (optional; trip currency by default, another currency can be picked). **+ Add an idea** does the same with no day.
4. Save writes an `itinerary.upsert` op. The item appears in the day's timeline and, if it has a place, as a numbered pin on the map.

**Reorder**
1. Long-press an item and drag it within the day, or drag it onto another day chip to move it.
2. On drop, the app computes a new fractional `sort_key` and writes `itinerary.move`.

**Search and save a place**
1. In the place field (or **Places → + Save a place**), the user types at least 3 characters.
2. After 300 ms of no typing, the app calls `/places-search` with the text, the trip destination's coordinates and a session token.
3. Results show name, category and address. Picking one saves a `places` row (`provider = geoapify`) and links it.
4. If search is unavailable, **Add it manually**: name, optional note, optional "drop a pin".

**Link to a real expense**
1. After spending, the item shows "not spent yet". Tapping **Link expense** lists the trip's expenses from that day first (with matching category).
2. Picking one links them. The item now shows "est ₹12,000" and "actual ₹13,800 · +15% over" (in the warning style when over the estimate). The link is saved on the itinerary item only. The expense itself doesn't change.
3. Shortcut: from an item, **Log this expense** opens Add expense prefilled with the title, category from type, and estimate as the amount hint. Saving writes the `expense.create` op and then an `itinerary.upsert` that sets `linked_expense_id`. The expense payload never carries an itinerary ID.

**See the map**
1. The map preview at the top of Plan ("MAP · 3 PLACES") shows the selected day's pins. Tapping it opens the full trip map with every saved place and itinerary item, filterable by day.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| IT-01 | A day-by-day itinerary over the trip's date range. Items have title, optional time, optional place, optional notes and an estimated cost. | MUST | F11 |
| IT-02 | Item types: Travel, Stay, Activity, Meal, Free time. | MUST | F11 |
| IT-03 | Drag to reorder within a day and move items between days. | MUST | F11 |
| IT-04 | Collaborative editing by all trip members, with live sync and **last-write-wins per field**. | MUST | F11 |
| IT-05 | Link an itinerary item to a real expense and show estimate vs actual. | MUST | F11 |
| IT-06 | Roll estimated costs into a **planned total** shown against the budget, including before the trip starts. | MUST | F11 |
| IT-07 | The itinerary is fully readable offline. | MUST | F11 |
| IT-08 | A shared "ideas" list of unscheduled items. | SHOULD | F11 |
| PL-01 | Save places with name, category, coordinates and notes via a place-search autocomplete. | MUST | F12 |
| PL-02 | One trip map showing all saved places and itinerary items. | MUST | F12 |
| PL-03 | Add a place directly to a day in the itinerary. | MUST | F12 |
| PL-04 | Cache saved places for offline viewing (names, notes, coordinates); map tiles best-effort. | MUST | F12 |
| PL-05 | Place search goes through our server proxy (`/places-search`, Geoapify), never directly from the phone with a key. | MUST | §16, [04 §6.1](../04-api-schema.md) |
| PL-06 | No route optimisation, drive-time estimates or recommendations. | MUST NOT | F12 |

---

## 6. Business rules

1. **Days** are derived from `trips.start_date`…`end_date`; there is no days table. Items with `day = null` form the shared **ideas** list (unscheduled). A trip with no dates shows only that list until dates are set.
2. **Order within a day** is `sort_key` (a fractional index string, e.g. base-62 "a0", "a0V", "a1"), then `id` as a tie-break. Inserting between two items generates a key between their keys; nothing else is rewritten.
3. **Time vs order:** setting or changing an item's time moves it to its chronological position among the timed items of that day (the app writes a new `sort_key`). Items with no time keep their dragged position.
4. **Estimated cost** is `estimated_cost_minor` in `estimated_currency` (default: the trip currency; [03 §6.1](../03-database-schema.md)). Optional; items without an estimate count as 0 in the planned total and show no cost chips.
5. **Planned total** = Σ estimates of non-deleted items, each converted to the trip currency with today's cached rate (display only; nothing is frozen, [03 §6.1](../03-database-schema.md)). Shown against the `trip_budgets` total row ([03 §5.9](../03-database-schema.md)) as "₹X under/over budget". It never affects balances.
6. **Estimate vs actual** ([07 §11](../07-calculation-engine.md)): `actual` = the linked expense's `base_amount_minor`; `est` = the estimate converted to the trip currency; `diff % = (actual − est) × 100 / est`, rounded half-up. If `est` = 0, show only "actual ₹X".
7. **Linking:** one item links to at most one expense, and one expense to at most one item, in v1. The link is stored **only on the planning side**, in `itinerary_items.linked_expense_id` (bookings use `bookings.linked_expense_id`). Expenses and revisions have no itinerary column. Linking or unlinking is a planning edit (field-LWW) and never creates a money revision ([03 §5.9 note](../03-database-schema.md)).
8. **Linked expense deleted:** the item shows "linked expense was deleted" and returns to "not spent yet" for totals; the estimate is kept.
9. **Items outside the trip dates** (after the dates change) are kept and shown in an "Outside trip dates" group with a **Move to a day** action. Nothing is deleted automatically.
10. **Places** are saved once per trip and can be used by many items. Deleting a place unlinks it from items (items keep their title).
11. **Place providers:** only `geoapify` and `manual` are used in v1. Results from Google Places must never be shown on the MapLibre map (see §20 Open question 2).
12. **Attribution:** the map shows "© OpenStreetMap contributors" and "OpenFreeMap"; search results show "Powered by Geoapify", as their terms require (confirm in [08](../08-third-party-integrations.md)).
13. **Settled trips** are read-only for the itinerary too. Itinerary and place ops aren't on the settled-trip allow-list in [06 §5](../06-syncing.md), so they are rejected with `trip_settled` until the trip is reopened.
14. **Over the estimate** uses `color.warning` with the word "over", never lime. Lime means good or active ([13](../13-design-system.md); review U-10).

---

## 7. Data model

From [03 §6](../03-database-schema.md). Planning data uses **field-level last-write-wins with soft delete**, not append-only, because no money depends on it ([D-006](../decisions/D-006-append-only-money.md)).

| Table | Columns used |
|---|---|
| `itinerary_items` | `id`, `trip_id`, `day` (null = ideas list), `sort_key`, `time`, `type` (`itinerary_type`), `title`, `place_id`, `notes`, `estimated_cost_minor`, `estimated_currency`, `linked_expense_id`, `created_by_user`, timestamps, `deleted_at`, `last_seq` |
| `places` | `id`, `trip_id`, `name`, `category`, `lat`, `lng` (numeric(9,6)), `provider`, `provider_ref`, `notes`, timestamps, `deleted_at`, `last_seq` |
| `trips` | `start_date`, `end_date`, `destination_place_ref` |
| `trip_budgets` | the `total` row, for "planned vs budget" |

Search is biased with the trip destination's coordinates. `trips` stores only `destination_place_ref`, so the phone looks up its coordinates once and caches them (see Open question 4).

---

## 8. API requirements

| Call | Detail |
|---|---|
| `itinerary.upsert` | create or patch fields of an item (field-LWW), including `linked_expense_id` |
| `itinerary.move` | `{ id, day, sort_key }` |
| `itinerary.delete` | soft delete |
| `place.upsert` / `place.delete` | save or remove a place |
| `GET /places-search?q=&lat=&lng=&session=` | Geoapify proxy. Server cache 30 days per (normalised q, rounded lat/lng). Phone: 300 ms debounce, ≥ 3 characters. 60/min per user + a global daily budget; above it `503 places_unavailable` → manual entry ([04 §6.1](../04-api-schema.md)). Response `{ results: [{ ref, name, category, lat, lng, address }] }` |
| Map tiles | MapLibre loads OpenFreeMap vector tiles directly (public, no key) |

All ops go through `/sync-push` ([06 §4](../06-syncing.md)). The same `/places-search` endpoint serves trip destination autocomplete (PRD F1).

**Phone-side search rules:** cancel in-flight requests when the text changes; keep a per-session in-memory cache of queries; never search on every keystroke.

---

## 9. UI requirements

Screen doc: [screens/plan](../screens/plan.md). From the UI reference (PLAN section):

- **Header:** "Plan" (`type.title`); right side mono planned total and a muted "₹X under budget" / "over budget".
- **Day chips:** equal-width, 52 px, weekday (small) + date number (bold); active chip lime.
- **Map preview:** 130 px card, numbered lime teardrop pins for the day's items, label "MAP · N PLACES". Tap → full map.
- **Timeline items:** a left column with the mono time and a vertical line; a card with "1 · TRAVEL" (mono label), the place on the right (muted), the title, and cost chips: "est ₹4,000" (raised) and "actual ₹4,600 · +15% over" (`color.warning` with an icon when over the estimate, raised/muted when under) or "not spent yet".
- **Drag:** long-press lifts the card (scale 1.02, `shadow.stub`), haptic tick on drop; day chips highlight as drop targets.
- **Full map:** MapLibre, lazy-loaded (keeps the app under 40 MB, PRD §17); pins for places and items, filter by day; tap a pin → item/place card.
- Accessibility: drag has an alternative, **Move up / Move down / Move to day…** in the item's action menu; pins have labels ("Stop 2, Scuba, Grande Island").

---

## 10. States

| State | Display |
|---|---|
| No dates | "Add trip dates to plan by day" + Unscheduled list |
| Empty day | "Nothing planned for Sunday yet" + **Add to this day** |
| Item with estimate, not spent | "est ₹X" + "not spent yet" |
| Item linked | "est ₹X" + "actual ₹Y · ±Z%" |
| Place search loading / no results / unavailable | spinner / "No matches. Add it manually." / "Search is resting. Add it manually." |
| Map offline, tiles not cached | pins on a plain grid background (like the prototype) with "Map needs internet" |
| Someone else editing | the item updates live; no locking |
| Pending local change | small "SAVED ON PHONE" mark on the item |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Two people drag the same item at once | Last `itinerary.move` received wins; the other sees it jump, with a quiet notice. |
| Two people insert between the same two items offline | Keys may be equal; the `id` tie-break gives a stable order on every phone. |
| One person edits an item another deleted | Delete wins; the editor sees "Neha removed *Scuba*. Restore?" (same pattern as [D-004](../decisions/D-004-conflict-strategy.md)). |
| Trip shortened from 4 days to 3 | Day-4 items go to "Outside trip dates". |
| Item linked to an expense in another currency | Actual uses the expense's frozen base amount; a foreign-currency estimate uses today's cached rate, so the ±% can drift slightly with the market. |
| An expense should cover two items (return ferry) | v1: link to one; see Open question 1. |
| Place with no coordinates (manual) | Shown in lists, not on the map. |
| Many searches in a busy group | Server cache + debounce; global budget exhaustion falls back to manual entry. |
| Item time crosses midnight (night bus) | Stays on its start day; the time shows "23:30". |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can add, edit, move, delete and link itinerary items and places. Organisers have no extra powers here. Web viewers and ghosts see nothing of the plan. `/places-search` needs a signed-in user and is rate-limited.

## 13. Offline behaviour

- The itinerary and saved places live in SQLite: **fully readable and editable offline** (IT-07, PL-04).
- Place search needs the network; offline, only manual places can be added.
- **Map tiles are best-effort:**
  - MapLibre's ambient cache keeps recently viewed tiles (capped, e.g. 50 MB).
  - SHOULD: a **Save map for offline** action that downloads the trip area (bounding box of saved places, zoom ~10–15) with a size estimate, on Wi-Fi by default. Before shipping this, confirm OpenFreeMap's policy on bulk/offline downloads (Open question 3).
  - Without tiles, pins still render on a plain background, so "where is it relative to the others" still works.

## 14. Sync behaviour

- Ops: `itinerary.upsert`, `itinerary.move`, `itinerary.delete`, `place.upsert`, `place.delete` (field-LWW, [06 §4](../06-syncing.md)).
- **Per-field merge:** Rahul changing the time and Neha changing the notes on the same item both survive. Same field: the server's last received wins.
- Live updates: while Plan is open, the Realtime nudge triggers a pull, so collaborators see each other's changes within seconds.
- Itinerary changes appear in the trip feed, grouped ([feed-and-recap](feed-and-recap.md)).

---

## 15. Analytics

PRD §19 has no planning events, but PRD §20 and §22.3 require measuring linking. Proposed additions (for [10 Observability](../10-observability.md)):

| Event | Properties |
|---|---|
| `itinerary_item_added` | `type`, `has_estimate`, `has_place`, `trip_status` |
| `itinerary_item_linked` | `type`, `method` (pick / log_this_expense), `diff_pct_bucket` |
| `itinerary_reordered` | `across_days` (bool) |
| `place_saved` | `provider` (geoapify / manual), `from_search` (bool) |
| `places_search_unavailable` (server) | — |
| `map_opened` | `offline_tiles` (bool) |

Derived metric: **% of trips with ≥ 1 itinerary item that have ≥ 1 linked item** (ship ≥ 30%, kill < 20%).

## 16. Error handling

| Error | Handling |
|---|---|
| `503 places_unavailable` | "Search is resting. Add it manually." |
| `429 rate_limited` on search | back off silently; show manual option |
| `trip_settled` on any op | "This trip is settled. Reopen to edit." |
| Map fails to load | plain background with pins; retry on next open |
| Link to an expense that was deleted meanwhile | link cleared; notice |

## 17. Testing

- Unit: fractional-index key generation (between, before-first, after-last, many inserts at the same spot).
- Unit: estimate vs actual maths, planned total, "under/over budget" text.
- Sync simulator: concurrent moves/edits/deletes on the same items converge on all phones ([06 §9](../06-syncing.md)).
- Contract test for `/places-search`: cache hit, debounce behaviour on the phone, 503 fallback.
- E2E (Maestro): add items across days, drag between days, link an expense, see actual chip; offline read of the plan.
- Manual: Indian place-search quality check in R2 (tech stack §5.10) on a list of 50 real Goa/Manali/Coorg places.

## 18. Cost and free-tier impact

| Item | Limit | Expected usage | Breaking point | Upgrade |
|---|---|---|---|---|
| Geoapify | 3,000 credits/day free | ~1 credit per request; ~4–6 requests per search after debounce; server cache absorbs repeats | ~500–700 uncached searches a day | Geoapify paid plan, or raise cache radius; the proxy allows a provider switch without an app update |
| OpenFreeMap tiles | free, no SLA, no key | tiles fetched by phones | provider outage or policy change | switch tile URL in remote config (e.g. self-hosted PMTiles on R2) |
| Supabase | rows and ops | small rows; many small edits in busy planning sessions (batched 50 per push) | not soon | Supabase Pro |
| App size | ≤ 40 MB | MapLibre native ~5–8 MB | — | lazy-load the map module |

## 19. Future considerations

- Ideas list with voting.
- Import a plan from a shared Google Doc or text.
- Opening hours and booking links on places.
- Split an itinerary item's cost estimate per person (who's joining which activity).

## 20. Open questions

**Resolved:**
- **Where the link lives:** only on the planning side, in `itinerary_items.linked_expense_id` (and `bookings.linked_expense_id`). It is never a money revision ([03 §5.9 note](../03-database-schema.md)).
- **Nullable `day`:** `day = null` is the ideas list ([03 §6.1](../03-database-schema.md)).
- **Estimates in another currency:** stored in `estimated_currency` and converted with today's cached rate for the planned total ([03 §6.1](../03-database-schema.md)).
- **Over-estimate colour:** `color.warning`, not lime ([13](../13-design-system.md), review U-10).

**Still open (feature-level):**
1. **One-to-one links:** should one item link to several expenses (deposit + balance), or one expense to several items (return ferry)? v1 proposes 1:1.
2. **Google Places conflict:** `places.provider` allows `google`, but Google's terms don't allow showing Places results on a non-Google map (MapLibre) and restrict caching. If place quality forces a switch to Google, it must be Google Maps SDK + Places together (and no offline maps). Should `google` be removed from the enum until that decision?
3. **OpenFreeMap offline packs:** confirm their policy allows user-initiated area downloads; if not, offline tiles are ambient cache only.
4. **Destination coordinates:** `trips` has no `destination_lat/lng`, so biasing search needs a lookup of `destination_place_ref`. Should we add the columns to [03](../03-database-schema.md), or keep the lookup and cache it on the phone?
