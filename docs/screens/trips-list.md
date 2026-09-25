# Screen · Trips list ("Your trips")

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- TRIPS -->` block (lines 203–235) |
| **Related** | [features/trips](../features/trips.md) · [03 §4.1 trips (status)](../03-database-schema.md) · [07 §7 Balances](../07-calculation-engine.md) · [06 §5 settled allow-list, §7 Sync status](../06-syncing.md) · [04 §10.1 lifecycle job](../04-api-schema.md) · [D-023 settle timing](../decisions/D-023-auto-settle-timing.md) · [D-022 kitty views](../decisions/D-022-kitty-views-and-handover.md) · [permission matrix](../09-security.md#permission-matrix) · [13 §6 TicketCard, Stamp](../13-design-system.md) · [trip-home](trip-home.md) · [create-trip](create-trip.md) · [settle-up](settle-up.md) |

---

## Purpose
**Why:** people travel several times a year (PRD persona "Rahul"). They need one place that shows every trip and, for the live one, whether they are up or down.
**What:** a list of trip cards. The active trip is a big lime ticket with your balance; planning and archived trips are quieter dark cards.
**How:** read entirely from SQLite, so it appears instantly on cold start (≤ 1.5 s p90, [02 §7](../02-architecture.md)).

## User goal
"Open the trip I'm on now," or "look back at an old trip," or "start a new one."

## Entry points
| From | Trigger |
|---|---|
| [Splash](splash.md) | Returning user |
| [Trip home](trip-home.md) / [Empty trip](empty-trip.md) | `‹` back button in the header |
| [Create trip](create-trip.md) | Back without creating |

## Exit points
| To | Trigger |
|---|---|
| [Trip home](trip-home.md) (or [Skeleton loading](skeleton-loading.md) if the snapshot isn't local yet) | Tap the active trip card |
| [Trip home](trip-home.md) | Tap a planning, settled or archived card (Assumption: the prototype cards are not wired) |
| [Settle up](settle-up.md) | Tap the **Close trip** hint on a settling card that is all square (Assumption) |
| [Create trip](create-trip.md) | **+ New** |
| [Join in app](join-in-app.md) | Assumption: overflow action **Join a trip** (needed for APK testers, [D-016](../decisions/D-016-testing-distribution.md)) |
| [Settings / profile](settings-profile.md) | Assumption: avatar button (`GearSix` if no avatar) |

## UI structure
**Header** (padding 8 / `space.gutter` / 12): title **"Your trips"** (`type.title`) on the left; right: tonal button `size.buttonM`, `radius.control`, **"+ New"**. No back button (this is a root screen). No tab bar.

**Content** (scroll, `space.gutter` sides, `space.14` gap). Cards, ordered: active → settling → planning → settled → archived (Assumption), newest first inside each group.

| Card | Look | Exact content |
|---|---|---|
| **Active trip** | `TicketCard` variant `trip`: lime, `radius.card`, `space.heroPad` padding; dashed perforation (`color.perforation`) between top and bottom; 20 px notches at the perforation | Top line (`type.label`): **"ACTIVE · DAY 2 OF 4"** left, destination **"GOA"** right. Name `type.title`: **"Goa Weekend"**. Sub `type.caption` at 75% opacity: **"12 – 15 Oct · 4 people · 3 expenses"**. Below the perforation: label `type.body` **"You get back"** / **"You owe"** / **"You're all square"** + amount `type.amountS` e.g. **"₹3,400"**. The balance uses the **trip view** ([D-022](../decisions/D-022-kitty-views-and-handover.md)): the kitty holder does **not** see the kitty cash as a debt here. |
| **Settling trip** | Same lime ticket as active | Top line **"SETTLING UP"**. Below the perforation: your balance, or, when every derived payment is 0: **"Everyone's square · Close trip"** (Assumption), tapping opens Settle up. |
| **Planning trip** | `Card` (`color.bg.card`, `radius.card`, `space.heroPad`) | Label **"PLANNING"** (`type.label`, muted). Name `type.header` **"Coorg Offsite"**. Sub `type.caption` muted: **"Nov · 8 people · 3 bookings · ₹64,000 planned"**. |
| **Settled trip** | `Card` with a `Stamp` | Label **"SETTLED"**. Name **"Manali Road Trip"**. Sub **"Mar 2026 · 6 people · ₹48,300 spent"**. Stamp **"SETTLED"** top-right: `size.stampBorder` muted border, `radius.badge`, `type.monoL`, uppercase, rotated −12°. |
| **Archived trip** | Same as settled | Label **"ARCHIVED"** + SETTLED stamp. |

Card label rules (Assumption where not shown in the prototype):
| `trips.status` | Label | How the trip gets there |
|---|---|---|
| `active` with dates | `ACTIVE · DAY {d} OF {n}` ("Day" counted in `trips.time_zone`) | created, or the lifecycle job moves `planning` → `active` on the start date |
| `active` no dates | `ACTIVE` | |
| `planning` | `PLANNING` (sub shows month, people, bookings count, planned total; bookings/planned only from R2/R3) | start date in the future |
| `settling` | `SETTLING UP` with the lime ticket, like active | someone held to tear on Settle up (`/stubs-send`), or a settlement was voided on a settled trip |
| `settled` | `SETTLED` label + SETTLED stamp | set **only by the server** ([D-023](../decisions/D-023-auto-settle-timing.md)) when every derived payment is 0 (after the rounding adjustment, [D-021](../decisions/D-021-rounding-adjustment.md)) **and** either someone tapped **Close trip** on Settle up, or 24 h have passed since `end_date` (daily `lifecycle` job). A trip with **no end date** settles only through Close trip |
| `archived` | `ARCHIVED` + SETTLED stamp | set by the `lifecycle` job **30 days after** the trip was settled ([04 §10.1](../04-api-schema.md)). Archived trips stay readable |

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the destination label is dropped from the top line if it doesn't fit (Assumption). Amounts are never truncated.

Components: `Screen`, `TicketCard` (trip), `Card`, `Stamp`, `Button` (tonal), `Sheet`, `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: local read. On a brand-new phone before any snapshot, show skeleton cards (Assumption). |
| Empty | Assumption (not in prototype): no trips (e.g. user left every trip). Show a dashed card like Empty trip: **"No trips yet"** / **"Start one, or join a friend's with a link or code."** + lime **"Start a trip"** + ghost **"I have an invite link"**. |
| Populated | As above. |
| Error | Per-card: a trip with `rejected` outbox ops shows a small badge **"1 change needs attention"** that opens [Unresolved changes](unresolved-changes.md) ([06 §7](../06-syncing.md)). |
| Offline | Works fully. Status bar shows **OFFLINE**. Trips with pending ops show a muted mono line **"SAVED ON PHONE · WILL SYNC"** under the sub (Assumption, reusing the row copy from [06 §7](../06-syncing.md)). |
| Syncing | `SyncPill` at the bottom while pulls run: **"Syncing Goa Weekend · 3 changes"**. |
| Success | n/a. |
| Disabled | n/a. |
| Partial data | Trip joined but snapshot still loading: card shows name + **"Loading…"** in place of the balance. |

## Interactions
| Gesture | Result |
|---|---|
| Tap card | Open that trip (push). |
| Tap **+ New** | Create trip. |
| Long press card | Assumption: sheet with **Leave trip** (only if your balance is ₹0), **Mute notifications** (per-trip `notification_preferences` row), and on a **settled** trip **Request reopen** (non-organisers) or **Reopen** (organisers). There is **no Archive action**: archiving is automatic, 30 days after settling. Who can do each one: [permission matrix](../09-security.md#permission-matrix). |
| Pull to refresh | Triggers a sync pull for all trips (Assumption; sync also runs on foreground). |
| Swipe | None. |

## Data
Reads from SQLite:
| Field | Source |
|---|---|
| name, dates, destination, status | `trips` |
| "Day X of N" | `start_date`, `end_date`, today |
| people count | `trip_members` where `removed_at` is null |
| expense count | `expenses` where `is_deleted` = false |
| hero balance | engine `balance(me)`, **trip view** (kitty cash as its own line, [D-022](../decisions/D-022-kitty-views-and-handover.md)), from current revisions, settlements, kitty contributions and hand-overs ([07 §7](../07-calculation-engine.md)). Money values are read through the money codec ([D-028](../decisions/D-028-money-in-sqlite.md)) |
| "all square" hint (settling) | engine derived payments = 0 |
| spent (archived) | Σ `base_amount_minor` of current revisions |
| bookings / planned (planning) | `bookings` count, Σ `itinerary_items.estimated_cost_minor`, each converted from its `estimated_currency` with today's cached rate (display only, [03 §6.1](../03-database-schema.md); R2/R3) |
| pending / rejected | `local_state` on rows; `outbox` state (`queued` / `sending` / `retrying` = pending, `rejected` = needs attention) |

## API / Database
Writes nothing by default. Long-press actions (Assumption) write ([06 §4](../06-syncing.md)):
- **Leave trip:** `member.remove` (self). Allowed at a ₹0 balance; the last organiser must hand over the role first ([D-030](../decisions/D-030-removed-members-locked.md)).
- **Request reopen:** `trip.request_reopen`. Organisers get a `reopen_requested` push with **Reopen** ([04 §5.1c](../04-api-schema.md)).
- **Reopen** (organiser): `trip.transition` with `reopen`. Logged.
- **Mute notifications:** a `notification_preferences` row through PostgREST.

`settled` and `archived` are **server-only** transitions (Close trip on Settle up, or the `lifecycle` job). The phone never sends them. The rules for what may change on a settled trip are the one allow-list in [06 §5](../06-syncing.md).

## Edge cases
- **Long trip name:** single line, ellipsis ([13 §8](../13-design-system.md)). Amount never truncated.
- **Several active trips:** each gets its own lime ticket.
- **Trip deleted by organiser:** disappears after the next pull ([03 §11](../03-database-schema.md)).
- **Released member** (organiser freed your spot, [04 §3.5](../04-api-schema.md)): trip disappears after `not_a_member`; Assumption: toast **"You were removed from {trip}"**.
- **Added to a trip by someone else** (`added_to_trip` push, [04 §11](../04-api-schema.md)): the new card appears after its snapshot; until then it shows **"Loading…"** (Partial data).
- **Large balance:** Indian grouping, e.g. **₹1,23,456** ([07 §12](../07-calculation-engine.md)).
- **All square mid-trip:** the trip stays `active`/`settling`. It never settles by itself before `end_date` + 24 h ([D-023](../decisions/D-023-auto-settle-timing.md)).
- **Request reopen already sent:** the action reads **"Reopen requested"** and is disabled until an organiser answers (Assumption).
- **Settlement voided on a settled trip:** the card moves back to **SETTLING UP** after the next pull.

## Analytics
No PRD §19 event specific to this screen. `balance_viewed` is **not** fired here (it is for the trace view).

## Accessibility
- Active card read as: "Goa Weekend, active, day 2 of 4, 4 people, 3 expenses. You are owed three thousand four hundred rupees."
- The SETTLED stamp is read as part of the card label ("settled").
- Cards are single tap targets (whole card).

## Open questions / assumptions
- Empty state, long-press actions and the "settling" label are **assumptions** (not in the prototype).
- Where "Join a trip" lives for returning users is not shown in the UI reference.
- **Resolved:** a member may leave at ₹0 (OQ-P21); archiving is automatic after 30 days; settle timing follows [D-023](../decisions/D-023-auto-settle-timing.md).
- Copy uses **"You get back"** rather than the prototype's "You are owed", to match the voice rule "owes / gets back" ([13 §8](../13-design-system.md)).
