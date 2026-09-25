# Screen · Empty trip

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | System (ships with R1a) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- EMPTY TRIP -->` block (lines 131–154); sidebar group "SYSTEM STATES · Empty trip"; reached from `create.go` |
| **Related** | [features/trips](../features/trips.md) · [features/expenses](../features/expenses.md) · [features/invites-and-joining](../features/invites-and-joining.md) · [features/kitty](../features/kitty.md) · [13 §6, §9](../13-design-system.md) · [trip-settings](trip-settings.md) · [all-expenses](all-expenses.md) · [create-trip](create-trip.md) · [trip-home](trip-home.md) · PRD §13, G1 |

---

## Purpose
**Why:** right after creating a trip there is nothing to show. An empty ledger must not look broken; it must push the user to log the first expense within the 90-second goal (PRD G1).
**What:** a dashed "blank ticket" at ₹0, three numbered tips, and a bouncing arrow pointing at the **+** button.
**How:** this is the Trip home route when the trip has zero expenses. As soon as one expense exists, Trip home takes over.

## User goal
"What do I do now?" → add the first expense, invite friends, or start a kitty.

## Entry points
| From | Trigger |
|---|---|
| [Create trip](create-trip.md) | **Create trip** (toast **"Goa Weekend created · works offline"**) |
| [Trips list](trips-list.md) | Tapping a trip with no expenses |
| [Skeleton loading](skeleton-loading.md) | A joined trip that has no expenses yet |
| [Trip home](trip-home.md) | The last remaining expense is deleted (Assumption) |

## Exit points
| To | Trigger |
|---|---|
| [Add expense](add-expense.md) | **+** FAB (the arrow points to it) |
| Invite share sheet | **Invite** header button (same as [Trip home](trip-home.md)) |
| [Trip settings](trip-settings.md) | `⋯` (`DotsThree`) in the header, same as Trip home |
| [Trips list](trips-list.md) | `‹` back |
| [Kitty](kitty.md) | Tip 03 (Assumption: tips are tappable; the prototype tips are static) |
| [Members](members.md) | Tab bar. **R1a/R1b tabs: Trip · (+) · Members** (OQ-P11 in [01](../01-overview.md#open-questions)). In R3 the bar becomes Trip · Plan · (+) · Vault · Feed and Members moves to the header ([13 §6](../13-design-system.md)) |

**"See all" (All expenses): n/a here.** There is no Recent card on an empty trip, so there is no **See all** link. It appears on [Trip home](trip-home.md) once the first expense exists and opens [All expenses](all-expenses.md).

## UI structure
**Header** (same as Trip home): back (`CaretLeft`) · title **"Goa Weekend"** · subtitle **"{template} · {n} people"** e.g. **"Beach trip · 4 people"** · tonal **"Invite"** · `⋯` (`DotsThree`) → [Trip settings](trip-settings.md).

**Content** (`space.gutter` sides, `space.14` gaps, 110 px bottom for the tab bar):

| # | Block | Details and exact copy |
|---|---|---|
| 1 | **Blank ticket** | 2 px dashed `color.bg.raised` border, `radius.card`, padding 28 / 22, centred. **"₹0"** (`type.display`, in `color.bg.raised` = deliberately faded; prototype 56 px). **"No expenses yet"** (`type.subhead`). **"The first ticket prints when someone pays for something."** (`type.caption`, `color.textMuted`, max 240 px). |
| 2 | **Tips card** | `Card` (`radius.card`), padding 6 / 16. Three 54 px rows with `color.divider`; lime number in `type.mono` (prototype: mono 12/700) + `type.body` text: **01** "Tap + and type the amount. That's all it needs." · **02** "Share the link so friends can see their balance, no install." · **03** "Start a kitty if you're pooling cash." |
| 3 | Spacer | Pushes the hint to the bottom |
| 4 | **Arrow hint** | Lime, centred: **"Add the first one"** (`type.caption` at 600) over an arrow icon (`icon.m`, Phosphor `ArrowDown`, Assumption). Bounces 8 px, 1.4 s loop (`ease.move`). Sits right above the FAB. |

**Tab bar** with the Trip tab active and the lime **+** FAB (**R1a/R1b tabs: Trip · (+) · Members**).

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `type.display` → 44, `space.gutter` → 16.

Tip 02 copy is honest for R1a: the web page is **read-only**, so friends can *see* their balance there; they pay from the app ([D-024](../decisions/D-024-web-page-read-only-beta.md)).

Components: `Screen`, `Header`, dashed `Card` (empty-ticket variant), `Card`, `TabBar`, `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | This screen **is** the empty state of Trip home. |
| Populated | n/a → becomes Trip home. |
| Error | Same failed-op banner as Trip home if the `trip.create` op is rejected (e.g. `invalid_payload`), linking to [Unresolved changes](unresolved-changes.md) (Assumption). |
| Offline | Works. Status bar **OFFLINE**. No offline banner unless there are pending ops (a just-created trip has one pending `trip.create`; Assumption: don't show the banner for that alone, because the toast already said "works offline"). |
| Syncing | `SyncPill` as on Trip home. |
| Success | n/a. |
| Disabled | n/a. |
| Partial data | **Kitty already on** (joined trip): tip 03 hidden (Assumption). **Invite already shared:** tip 02 shows a lime ✓ (Assumption). |

## Interactions
| Gesture | Result |
|---|---|
| Tap **+** | Add expense (keypad ready). |
| Tap **Invite** | Share sheet (see Trip home). Who can share or rotate: [permission matrix](../09-security.md#permission-matrix). |
| Tap `⋯` | [Trip settings](trip-settings.md). |
| Tap tip 02 / 03 | Assumption: 02 = Invite share; 03 = Kitty setup. |
| Tap blank ticket | Assumption: also opens Add expense (bigger target). |
| Back | Trips list. |

Reduce Motion: arrow doesn't bounce.

## Data
- `trips.name`, `trips.template` (label: `beach` → "Beach trip", `road` → "Road trip", `trek` → "Trek", `wedding` → "Wedding", `offsite` → "Office offsite", `other` → "Other").
- Member count from `trip_members` (not removed).
- `expenses` count = 0 (the condition for this screen).
- `trips.kitty_enabled` for the tip.

## API / Database
Writes nothing.

## Edge cases
- **Only kitty contributions, no expenses:** still "empty" (no expenses). Assumption: show Trip home instead once any money activity exists (contribution or settlement), so the kitty tile is visible.
- **Trip in `planning` status:** Assumption: blank ticket copy stays; tips same.
- **Base currency:** still editable in [Trip settings](trip-settings.md) while the trip is empty; locked once the first expense exists ([06 §4](../06-syncing.md) `trip.update`).
- **Member count 1** (only you): subtitle **"Beach trip · 1 person"** (singular).

## Analytics
No PRD §19 event. Time from `trip_created` to first `expense_added` measures G1.

## Accessibility
- Blank ticket read as "No expenses yet. The first ticket prints when someone pays for something."
- Faded "₹0" is decorative (the text below says it); faded colour does not need to meet contrast.
- Arrow hint is decorative; the FAB has the label "Add expense".

## Open questions / assumptions
- PRD §13 says the organiser lands "on an empty expense list **with the keypad already focused**". The prototype instead lands here with an arrow to **+**. We follow the prototype (it also teaches Invite and Kitty). Confirm with the PRD owner.
