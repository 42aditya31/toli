# Feature · Trips

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a** (create, list, Trip settings, lifecycle, Close trip, Request reopen). Direct settle mode as a trip setting arrives in **R1b** ([D-018][d018]) |
| **PRD refs** | [F1][prd], §8 (Trip, lifecycle rules), §5 principle 4 ("the trip is the container"), §6.1 G1, §13 (organiser onboarding), §17 (cold start) |
| **Related** | Screens: [create-trip](../screens/create-trip.md) · [trips-list](../screens/trips-list.md) · [trip-home](../screens/trip-home.md) · [trip-settings](../screens/trip-settings.md) · [empty-trip](../screens/empty-trip.md) · [settle-up](../screens/settle-up.md) · [recap](../screens/recap.md) — Docs: [03 §4.1 `trips`, §5.8 `trip_categories`][db] · [04 §2 sync, §5.1c Close trip, §10.1 `lifecycle` job][api] · [06 §4 op types, §5 settled allow-list][sync] · [09 §2.3 permission matrix][perm] — Decisions: [D-002][d002] · [D-011][d011] · [D-018][d018] · [D-021][d021] · [D-023][d023] · [D-031][d031] — Features: [members-and-ghosts](members-and-ghosts.md) · [settle-up](settle-up.md) · [kitty](kitty.md) |

---

## 1. Purpose

A **trip** is the box everything else lives in: members, expenses, the kitty, settlements, and later the plan, vault and recap. This feature covers creating a trip, the list of trips, **Trip settings**, and the trip's **lifecycle** from `planning` to `archived`, including **Close trip**, **Request reopen** and reopening a settled trip.

## 2. User problem

The organiser wants to start tracking money **the moment the trip starts**, often standing at a check-in desk. Any form longer than "type a name" loses him. Later, the group wants the trip to *end*: a clear moment where everyone is square and the numbers stop changing. But it must never lock by accident in the middle of the trip.

## 3. Business goal

- **G1:** a group of 4 creates a trip and logs the first expense within **90 seconds of install** (design for 60 s, OQ-P2).
- **G2:** trips reach `settled`. A clear lifecycle makes "finished" visible and measurable (north star: trips settled per week).
- **G4:** archived trips become a history the group returns to (second-trip rate).

## 4. User flow

**Create a trip**
1. Welcome → **Get started** (or trips list → **+ New**).
2. Type the trip name. That's the only required field ("Trip name · the only thing we need").
3. Optionally pick a template, dates, base currency and destination.
4. Add people by typing names. Each becomes a **ghost** ([members-and-ghosts](members-and-ghosts.md)).
5. Tap **Create trip**. The trip exists on the phone straight away. The toast says "Goa Weekend created · works offline".
6. You land on the empty trip, with a clear pointer to **+** (add the first expense).

**Live with a trip**
1. Trips list → tap a trip → trip home.
2. Tap **⋯** in the trip home header → [Trip settings](../screens/trip-settings.md): name, dates, destination, cover, base currency (only before the first expense), kitty on/off, settle mode (R1b), invite, leave, delete.
3. On the start date, a `planning` trip becomes `active` by itself.

**Close the trip**
1. When the trip is over, go to [Settle up](settle-up.md), pay and record the payments.
2. When every remaining payment is below ₹1, **Close trip** becomes available. Any claimed member can tap it.
3. The server writes any leftover paise as **rounding** settlements ("Rounding · ₹0.33"), and the trip becomes `settled`: "Everyone's square." (the recap arrives in R3).
4. If nobody taps Close trip, the trip settles by itself **24 hours after the end date**, once every payment is 0. A trip with no end date only settles through Close trip.
5. 30 days after settling, the trip moves to the archive.

**Reopen**
1. Organiser: open a settled trip → Trip settings → **Reopen trip** → confirm ("Everyone will be told. Balances can change again."). The trip is `active` again, and the reopen is logged.
2. Anyone else: **Request reopen** (optional note). Organisers get a push with **Reopen**.

## 5. Requirements

| ID | Requirement | Level | Release | PRD |
|---|---|---|---|---|
| TR-1 | Only a **name** is required to create a trip (1–60 characters). | MUST | R1a | F1 |
| TR-2 | Optional: destination (place autocomplete), start/end dates, cover image, base currency (default from the phone's locale; INR in India). | MUST | R1a | F1 |
| TR-3 | Offer templates: *Beach trip, Road trip, Trek, Wedding, Office offsite, Other*. A template presets the category list and the default split mode (a constant in `packages/config`, [04 §2.1][api]). Templates never limit behaviour. Seeded lists (`TEMPLATE_CATEGORIES`, Assumption, 2026-09-26): every template gets Food · Drinks · Travel · Stay · Activities · Shopping · Fuel · Misc; **Road trip** adds Tolls and **Wedding** adds Tips (screens/add-expense: "Tolls and Tips appear if the template includes them"). Default split: Equal for all. | MUST | R1a | F1, §22 Q4 |
| TR-4 | The trip is created **locally** and is fully usable **before** any network call finishes. | MUST | R1a | F1, §12 |
| TR-5 | Support a `planning` state so a trip can hold an itinerary and bookings before it's `active`. | MUST | R1a | F1 |
| TR-6 | Lifecycle is `planning → active → settling → settled → archived` (§6). | MUST | R1a | §8 |
| TR-7 | A `settled` trip only accepts the changes on the [settled allow-list in 06 §5][sync]. Reopening is an explicit, logged action. | MUST | R1a | §8 |
| TR-8 | A trip becomes `settled` only when every derived payment is 0 (after the rounding adjustment) **and** either 24 h have passed since the end date, or someone taps **Close trip** ([D-023][d023]). It never settles mid-trip. | MUST | R1a | F6 |
| TR-9 | **Close trip** on Settle up, for any claimed member, when every remaining payment is below 1 major unit ([D-021][d021]). | MUST | R1a | F6 |
| TR-10 | **Request reopen** for non-organisers on a settled trip; organisers get a push with **Reopen**. | MUST | R1a | [D-023][d023] |
| TR-11 | A **Trip settings** screen, reached from **⋯** in the trip home header ([trip-settings](../screens/trip-settings.md)). | MUST | R1a | review M-1 |
| TR-12 | The trips list opens from local data in ≤ 1.5 s (p90, mid-range Android). | MUST | R1a | §17 |
| TR-13 | After creation, land on the empty trip with the add-expense action one tap away (see Open questions). | SHOULD | R1a | §13 |
| TR-14 | Show trip progress on the list card ("ACTIVE · DAY 2 OF 4"), member count, expense count and the user's own balance. | SHOULD | R1a | F5 |
| TR-15 | The recap snapshot is written when the trip settles. | MUST | R3 | F6, F14 |

## 6. Business rules

**Lifecycle** (status values from [03 §1 `trip_status`][db]; timing from [D-023][d023]):

| From → To | Trigger | Who | Notes |
|---|---|---|---|
| (new) → `planning` | Created with a start date in the future | Creator | 03 §4.1 default |
| (new) → `active` | Created with no dates, or a start date today or earlier | Creator | 03 §4.1 default |
| `planning` → `active` | The start date arrives | Server (daily `lifecycle` job, [04 §10.1][api]) | Also sends the "trip starts" push. Expenses can be logged while planning (they count as booked before the trip). |
| `active` → `settling` | A member holds **Hold to tear & send stubs** on Settle up; `/stubs-send` moves the trip ([04 §5.1a][api]) | Any claimed member (server) | Expenses can still be added (late receipts). |
| `active` / `settling` → `settled` | Every derived payment is 0 after the rounding adjustment **and** (a) 24 h have passed since `end_date`, or (b) someone taps **Close trip** | (a) server `lifecycle` job · (b) any claimed member, op `trip.close` | Server-only `trip.transition` ([06 §4][sync]). Sets `trips.closed_at`. A trip with **no end date** only settles through (b). |
| `settled` → `settling` | A settlement is voided | Server | Logged ([D-023][d023]) |
| `settled` → `archived` | 30 days after `settled` | Server (`lifecycle` job) | Only changes where the trip shows in the list. Still read-only. |
| `settled` / `archived` → `active` | **Reopen trip** | Organiser | `trip.transition` with `reopen`. Logged. Everyone gets a Trip updates notification. |
| (request) | **Request reopen** | Any claimed member who isn't an organiser | `trip.request_reopen` (optional note). Pushes `reopen_requested` to organisers. Doesn't change the status. |

Other rules:
- **No mid-trip lock.** Even if everyone happens to be square on day 2, the trip stays open until the end date + 24 h, or until someone taps Close trip.
- **Close trip** runs the **rounding adjustment** first: each remaining payment below ₹1 is written as a `settlement` with `method = rounding`, shown in the trace as "Rounding · ₹0.33" ([D-021][d021], [07 §8.4][engine]). The adjustment never runs mid-trip.
- **Settled trips:** what's still allowed (feed posts, claims, voiding a settlement, Request reopen, reopen) is defined **only** in the [allow-list in 06 §5][sync]. Everything else is rejected with `trip_settled`.
- **Templates are cosmetic.** They seed `trip_categories` (03 §5.8) at creation. Changing the template later doesn't change existing categories.
- **Base currency** can change only while the trip has no expenses (every frozen FX rate points at it; [07 §4][engine]).
- **Time zone:** `trip.create` sets `trips.time_zone` from the creator's phone. It decides "Day 2 of 4", the duplicate check's "same day" and `joined_from` ([03 §4.1][db]).
- **Dates:** `end_date ≥ start_date`. Both optional. "Day 2 of 4" is shown only when both dates exist.
- **Delete trip:** only when **no other member has claimed a spot**. Otherwise the organiser can leave the trip or let it archive ([09 §2.3][perm], review P-6). Needs a typed confirmation when the trip has expenses.
- **Settle mode** (`simplified` default / `direct`, R1b) is a trip setting.
- **Organisers:** the trip always keeps at least one organiser. The last organiser can't leave or be removed without handing over the role ([D-030][d030]).

## 7. Data model

From [03 Database][db]. No new tables.

| Table | Columns used here |
|---|---|
| `trips` | `id` (UUID v7 from the phone), `name`, `destination_name`, `destination_place_ref`, `start_date`, `end_date`, `base_currency`, `time_zone`, `template`, `status`, `settle_mode`, `cover_key`, `kitty_*` (see [kitty](kitty.md)), `closed_at`, `min_client_version`, `is_pro`, `last_seq`, `created_by_user`, `created_at`, `updated_at`, `deleted_at` |
| `trip_categories` | seeded from `template` on `trip.create` |
| `trip_members` | the creator's row with `role = organiser` |
| `settlements` | `method = rounding` rows written by Close trip or the `lifecycle` job |
| `trip_ops` | every `trip.create`, `trip.update`, `trip.transition`, `trip.close`, `trip.request_reopen` (audit trail) |
| `trip_budgets` (R2) | budgets live here, not on `trips` ([03 §5.9][db]) |
| `recaps` (R3) | snapshot written when the trip becomes `settled` |
| Local only | `sync_cursors` (per trip), `kv` (onboarding flags) |

## 8. API requirements

All trip writes are ops sent through `POST /sync-push` ([04 §2.1][api], [D-011][d011]).

| Op type ([06 §4][sync]) | Payload | Used for |
|---|---|---|
| `trip.create` | name, dates, base currency, time zone, template, organiser display name, first members | Create |
| `trip.update` | field patch: name, dates, destination, cover, `settle_mode`, kitty on/off and threshold, `base_currency` (only while there are no expenses). Budgets use `budget.set`; the kitty holder uses `kitty.handover` | Edit (last write wins per field) |
| `trip.transition` | `to`: next status, or `reopen` (organiser). `settled` and `archived` are written only by the server | Lifecycle (rule-checked) |
| `trip.close` | none | Close trip: rounding adjustment, then settle if every payment is 0 ([04 §5.1c][api]) |
| `trip.request_reopen` | optional note | Ask organisers to reopen |
| `member.set_role` | member id, role | Hand over or share the organiser role |
| `attachment.register` | cover image | Cover |

Other endpoints: `POST /stubs-send` (moves `active` → `settling`), `GET /trip-snapshot` (a trip new to this phone), pulls through PostgREST ([04 §2.2][api]), `GET /places-search` (destination autocomplete, online only), `POST /upload-url` + `/upload-confirm` (cover image). The daily `lifecycle` job ([04 §10.1][api]) handles start, auto-settle, archive and the "trip starts / ended" pushes.

## 9. UI requirements

| Screen | What this feature needs |
|---|---|
| [create-trip](../screens/create-trip.md) | Big name field with the hint "Trip name · the only thing we need"; template chips (3 × 2 grid); dates and base currency tiles; "Who's coming · N people" with ghost chips; "Add by name" input with lime **+**; helper line "Nobody needs the app yet…"; primary **Create trip**. Empty name → toast "Give the trip a name". |
| [trips-list](../screens/trips-list.md) | "Your trips" + **+ New**. The active trip is a lime `TicketCard` (label "ACTIVE · DAY 2 OF 4", destination, dates · people · expenses, perforation, "You are owed ₹3,400"). Planning trips show "PLANNING". Settled/archived trips show a grey **SETTLED** stamp. |
| [trip-home](../screens/trip-home.md) | Header: trip name, dates, "Day 2 of 4", **Invite**, **⋯** (Trip settings). Hero ticket, kitty tile, balances, recent, **See all** ([all-expenses](../screens/all-expenses.md)). R1 tab bar: **Trip · (+) · Members** (OQ-P11). |
| [trip-settings](../screens/trip-settings.md) | Name, dates, destination, cover, base currency (locked after the first expense), kitty on/off, settle mode (R1b), invite, **Reopen trip** / **Request reopen** (settled only), **Leave trip**, **Delete trip** (only when no one else has claimed a spot). Actions the user can't do are hidden. |
| [settle-up](../screens/settle-up.md) | **Close trip** when every remaining payment is below ₹1; otherwise hidden or disabled with "Record the remaining payments first". |
| [empty-trip](../screens/empty-trip.md) | "₹0 · No expenses yet · The first ticket prints when someone pays for something."; three numbered tips; bouncing "Add the first one ↓" pointing at **+**. |
| Settled trip | Stamp **SETTLED**, "Everyone's square.", "The trip is now read-only."; **Open the trip recap →** from R3. Edit actions are hidden. Organisers see **Reopen trip**; others see **Request reopen**. |

## 10. States

| State | What the user sees |
|---|---|
| Creating (local) | Trip appears immediately; row is `local_state = pending` |
| Planning | "PLANNING" label; expenses allowed (flagged as booked before the trip) |
| Active | Normal trip home |
| Settling | Settle up shows "STUBS READY"; home banner "Settling up · 2 of 3 payments recorded" |
| Ready to close | Every remaining payment is under ₹1; **Close trip** on Settle up |
| Settled | Read-only, SETTLED stamp, "Everyone's square."; **Reopen trip** or **Request reopen** |
| Reopen requested | Non-organiser: "Reopen requested · Aditya has been told" |
| Archived | Listed under Archived with the SETTLED stamp; opens read-only |
| Deleted | Removed from every list; a tap on an old notification shows "This trip was deleted by Aditya" |
| Loading (first open on a new phone) | [skeleton-loading](../screens/skeleton-loading.md) while `/trip-snapshot` runs |
| Empty | [empty-trip](../screens/empty-trip.md) |

## 11. Edge cases

- **Created offline, never synced**, then the app is killed: the SQLite transaction is atomic, so the trip and its `trip.create` op are both there or both absent ([06 §8][sync]).
- **Created before the first network ever** (so no anonymous account yet): the trip works locally; the op waits in the outbox until sign-in succeeds ([auth-and-identity](auth-and-identity.md)).
- **Two members edit the trip name offline:** the one the server receives last wins; the other sees the change on pull.
- **Everyone square on day 2:** nothing happens. The trip stays `active` until the end date + 24 h or Close trip ([D-023][d023]).
- **Trip with no end date:** never settles by itself. Settle up shows **Close trip** once everything is paid.
- **Close trip tapped on two phones:** the second is a no-op; everyone sees the same settled moment.
- **Close trip tapped offline:** the op waits in the outbox. The server decides; if a late expense arrived first and a payment is no longer under ₹1, the close is rejected and shown in Unresolved changes.
- **Whole-rupee payments leave ₹0.33:** Close trip writes "Rounding · ₹0.33" and settles ([07 §14 G12][engine]).
- **Settled by accident** (someone marked a payment paid wrongly): the recorder or an organiser voids the settlement, and the trip goes back to `settling`.
- **Late expense from an offline friend after the trip settled:** rejected with `trip_settled`; the friend sees **Request reopen** in Unresolved changes.
- **Dates changed so that "today" falls outside them:** "Day X of Y" is hidden. Moving the end date later postpones auto-settle.
- **Start date moved into the future on an active trip with expenses:** stays `active` (no backwards transition).
- **Changing base currency after the first expense:** blocked with "The currency can't change once money is logged."
- **Delete with other claimed members:** Delete isn't offered. "Others are on this trip. You can leave it instead."
- **Reopen after the recap was shared (R3):** the old snapshot is kept and labelled with its date until the trip settles again ([feed-and-recap](feed-and-recap.md)).

## 12. Permissions

Who can do what (edit details, change the base currency, Close trip, Request reopen, reopen, delete, hand over the organiser role) is defined **only** in the [permission matrix, 09 §2.3][perm] ([D-031][d031]). In short: any claimed member can edit trip details and tap Close trip; only organisers reopen, change the base currency or settle mode, and delete (and only when no one else has claimed a spot). The [settled allow-list in 06 §5][sync] applies on top.

## 13. Offline behaviour

- Create, edit and view all work offline. The trips list and trip home read only from SQLite.
- Destination autocomplete needs the network; offline it falls back to free text (`destination_place_ref` stays null).
- Cover images queue in `file_queue` (Wi-Fi only by default).
- `trip.close`, `trip.request_reopen` and `trip.transition` can be queued offline, but the server decides if they're valid.
- Auto-settle and archive happen on the server; phones see them on the next pull.

## 14. Sync behaviour

- `trip.create` is the first op for a new trip ID. Any signed-in user may send it ([04 §2.1][api]).
- `trip.update` is last write wins per field, in server order.
- `trip.transition`, `trip.close` and `trip.request_reopen` are rule-checked; invalid ones are rejected and shown in Unresolved changes.
- Settling and archiving are **server-only** `trip.transition` ops, so all phones see the same moment. Rounding settlements are server-only `settlement.create` ops ([06 §4][sync]).
- Joining or a new phone uses `GET /trip-snapshot`, then normal pulls.

## 15. Analytics

From PRD §19:

| Event | When | Properties |
|---|---|---|
| `trip_created` | `trip.create` saved locally | `template`, `member_count` |
| `trip_settled` | trip reaches `settled` | `days_to_settle` (from `end_date`, or from creation if no end date) |

Proposed, not in PRD §19 (confirm before adding): `trip_closed` (`via`: close_button, auto; `rounding_count`), `trip_reopen_requested`, `trip_reopened` (`days_since_settled`), `trip_deleted` (`expense_count`).

## 16. Error handling

| Case | Message |
|---|---|
| Empty name | Toast "Give the trip a name" |
| Name over 60 characters | Input stops accepting characters |
| End before start | Date picker blocks it; inline "End date is before the start" |
| Change rejected because settled (`trip_settled`) | "This trip is settled. Reopen to edit." + **Reopen** (organiser) / **Request reopen** (others) |
| Close trip while a payment is ₹1 or more | "Record the remaining payments first." |
| Reopen by a non-organiser (`not_organiser`) | Action hidden; if it reaches the server: "Only Aditya can reopen this trip. Request reopen instead." |
| Delete with other claimed members (`not_allowed`) | "Others are on this trip. You can leave it instead." |
| Places search down (`503 places_unavailable`) | Silent fallback to free-text destination |

## 17. Testing

- **Unit:** lifecycle transition table (every valid and invalid pair); template → categories seeding; base-currency lock.
- **Lifecycle job:** planning → active on the start date; auto-settle only when payments are 0 **and** end date + 24 h has passed; never mid-trip; no auto-settle without an end date; archive after 30 days.
- **Close trip:** rounding settlements are all under 1 major unit, every balance ends at exactly 0 ([07 §13 invariant 14][engine], fixture G12); a second Close is a no-op.
- **Integration:** create offline → kill app → reopen → trip present, op in outbox; then go online → `applied`.
- **Sync simulation** ([06 §9][sync]): concurrent `trip.update` on the same field converges; `expense.create` racing `trip.close` gives one consistent result on every phone.
- **Performance:** trips list cold start ≤ 1.5 s p90 on a ₹15,000 Android with 20 trips.
- **E2E (Maestro):** install → create trip with 4 names → first expense in < 90 s (G1).

## 18. Future considerations

- Template-driven default splits ("office offsite splits by company policy"): PRD §22 Q4.
- Recurring non-trip groups (flatmates): PRD §22 Q5, explicitly out of v1.
- Web app for organisers reconciling on a laptop: PRD §22 Q7.
- Trip duplication ("same group, new trip") to help G4.

## 19. Open questions

Resolved:
- When a trip settles: end date + 24 h or Close trip; no mid-trip lock; Request reopen ([D-023][d023], OQ-P13).
- Leftover paise: rounding settlements under ₹1 on close ([D-021][d021]).
- `planning → active` on the start date and archive 30 days after settling: the `lifecycle` job ([04 §10.1][api]).
- Who can edit trip details: any claimed member ([permission matrix][perm], OQ-P12).
- Trip deletion: only when no one else has claimed a spot ([09 §2.3][perm]).
- Where trip settings live: [Trip settings](../screens/trip-settings.md) ([D-018][d018]).

Still open:
1. **Keypad focused after create:** PRD §13 says land "with the keypad already focused"; the prototype lands on the empty trip with a pointer to **+**. Which one?
2. **Organiser's display name:** `trip.create` needs an organiser display name, but the create screen in the prototype never asks for one (it shows "You"). Ask inline on first create?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[perm]: ../09-security.md#permission-matrix
[d002]: ../decisions/D-002-offline-first.md
[d011]: ../decisions/D-011-server-writes.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d021]: ../decisions/D-021-rounding-adjustment.md
[d023]: ../decisions/D-023-auto-settle-timing.md
[d030]: ../decisions/D-030-removed-members-locked.md
[d031]: ../decisions/D-031-permission-matrix.md
