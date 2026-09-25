# Screen · Trip settings

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (Direct settle mode R1b) |
| **Source** | **Assumption — not in UI reference; follows [13 Design system](../13-design-system.md).** Added because six docs sent people to a Trip settings screen that didn't exist ([review P-3, M-1](../14-pre-development-review.md#7-product-problems), [D-018](../decisions/D-018-r1a-r1b-scope.md)) |
| **Related** | [features/trips](../features/trips.md) · [features/kitty](../features/kitty.md) · [features/invites-and-joining](../features/invites-and-joining.md) · [features/notifications](../features/notifications.md) · [trip-home](trip-home.md) · [members](members.md) · [kitty](kitty.md) · [settle-up](settle-up.md) · [03 §3.3, §4.1](../03-database-schema.md) · [04 §3.1, §5.1c](../04-api-schema.md) · [06 §4, §5](../06-syncing.md) · [09 Permission matrix](../09-security.md#permission-matrix) · [D-022](../decisions/D-022-kitty-views-and-handover.md) · [D-023](../decisions/D-023-auto-settle-timing.md) |

---

## Purpose
**Why:** trips change after they're created: the dates move, the kitty starts on day 2, a link leaks, the trip ends. All of that needs one clear home.
**What:** one scrolling list of the trip's settings, grouped as Trip · Kitty · Settling · People and invite · Notifications · Trip status · Leave or delete.
**How:** each change is an op in the outbox ([06 §4](../06-syncing.md)), so most rows work offline. The server checks every change against the [permission matrix](../09-security.md#permission-matrix) and the settled-trip allow-list ([06 §5](../06-syncing.md)).

## User goal
"Fix the trip dates," "turn on the kitty," "the link got forwarded, make a new one," or "we're done, close the trip."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | `⋯` (`DotsThree`) in the header |
| [Empty trip](empty-trip.md) | `⋯` in the header |
| [Trips list](trips-list.md) | Assumption: long-press sheet → **Trip settings** |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Members](members.md) | **Members** row |
| [Kitty](kitty.md) hand-over sheet | **Kitty cash with {holder}** row → **Hand over** |
| Native share sheet | **Share invite** |
| [Settle up](settle-up.md) | **Close trip** when payments remain (**"Settle up first"**) |
| [Trips list](trips-list.md) | After **Leave trip** or **Delete trip** |

## UI structure
**Header** (`Header`): back · title **"Trip settings"** · subtitle **"Goa Weekend"**.

**Content** (scroll, `space.gutter` sides, `space.stack` between cards). Each group is a `Card` with a `type.label` muted title above it. Rows are `Row` (`size.row`, or `size.rowTall` with a sub-line) with a value on the right and `CaretLeft` mirrored as a chevron.

| Group | Row | Value / control | Rule and copy |
|---|---|---|---|
| **TRIP** | Name | **"Goa Weekend"** | Sheet with text field (1–60 characters, [03 §4.1](../03-database-schema.md)). |
| | Dates | **"12 – 15 Oct"** or **"No dates"** | Sheet with a range picker + **"No dates"**. Helper: **"Days on the trip use these dates. A trip without an end date only settles when someone closes it."** ([D-023](../decisions/D-023-auto-settle-timing.md)) |
| | Destination | **"Goa"** or **"Add"** | Sheet with a text field (place search is R2). |
| | Cover | thumbnail or **"Add"** | Camera / gallery; compressed and EXIF-stripped like receipts ([09 §5](../09-security.md)). |
| | Base currency | **"₹ INR"** | Editable only while the trip has **no expenses**. Otherwise read-only, sub **"Locked after the first expense"**. |
| | Time zone | **"India (Asia/Kolkata)"** | Sheet with a searchable zone list. Helper: **"Decides where each day starts and ends. Times already saved don't change."** |
| **KITTY** | Kitty | `Switch` | Off → on opens the same **Start kitty** sheet as [Kitty](kitty.md) (holder required). On → off only when the pot is empty; otherwise the switch is disabled with sub **"Spend or hand back the ₹3,000 first"**. |
| | Kitty cash with {holder} | **"Rahul · ₹3,000"** | Opens the **Hand over** sheet from [Kitty](kitty.md) (`kitty.handover`). Shown only when the kitty is on. |
| | Low warning | **"At 20% left"** | Sheet with steps 10 / 20 / 30 / 50% (`kitty_low_bp`). |
| | Target per person | **"₹5,000"** or **"None"** | Sheet with keypad (`kitty_target_minor`). |
| **SETTLING** | Settle mode | R1a: read-only **"Simplified"**, sub **"Fewest payments"**. R1b: `Segmented` **Simplified · Direct** | Direct arrives in R1b ([D-018](../decisions/D-018-r1a-r1b-scope.md), [D-020](../decisions/D-020-direct-mode-exact-pairing.md)). |
| | Recorded payments | **"5"** | Push [Recorded payments](recorded-payments.md). |
| **PEOPLE AND INVITE** | Members | **"4 people"** | Push [Members](members.md). |
| | Invite code | mono `type.monoL` **"GOA-7K2PXQ"**, sub **"Expires 14 Nov"** | Tap copies the code; toast **"Code copied"**. |
| | Share invite | `Button` tonal **"Share invite"** | Native share sheet with link + code (same link for every member, [04 §3.1](../04-api-schema.md)). |
| | Make a new link | `Button` ghost **"Make a new link"** | Confirm sheet: **"Make a new invite link? The old link and code stop working straight away. People already on the trip aren't affected."** → **"Make new link"** / **"Cancel"**. |
| **NOTIFICATIONS** | Mute this trip | `Switch` | Sub **"No pushes from Goa Weekend on this phone. You'll still see everything in the app."** |
| **TRIP STATUS** | Close trip | `Button` secondary **"Close trip"** | See **Trip status** below. |
| | Request reopen / Reopen | `Button` secondary | See below. Only on a settled trip. |
| **LEAVE OR DELETE** | Leave trip | `Button` `danger` **"Leave trip"** | See below. |
| | Delete trip | `Button` `danger` **"Delete trip"** | See below. |

Footer `type.small` muted: **"Last synced 2 min ago"** (from `sync_cursors.last_pulled_at`), or **"Not synced yet"**.

### Trip status
| Trip state | What shows | Copy |
|---|---|---|
| Payments still to make (any derived payment ≥ ₹1) | **Close trip** disabled | Sub **"Settle up first: 3 payments left."** + link **"Settle up"** |
| Every payment is below ₹1 (including none) | **Close trip** enabled | Confirm sheet (same as [Settle up](settle-up.md)): **"Close Goa Weekend?"** / **"Everyone's square. Tiny leftovers under ₹1 are written off as rounding. The trip becomes read-only; anyone can ask to reopen it."** → **"Close trip"** / **"Cancel"** ([D-021](../decisions/D-021-rounding-adjustment.md), [D-023](../decisions/D-023-auto-settle-timing.md)) |
| Settled, and the matrix doesn't let you reopen | **Request reopen** | Sheet: **"Ask the organisers to reopen?"** + optional note **"Why? (optional)"** → **"Send request"**. Toast after sync: **"Request sent to Aditya"**; while offline: **"Saved · sending when you're online"**. |
| Settled, and you may reopen | **Reopen trip** | Confirm: **"Reopen Goa Weekend? Everyone can add and change expenses again. This is logged."** → **"Reopen"**. |

### Leave trip
- Enabled when **your own balance is ₹0** (settle view) and you are not the last organiser ([D-030](../decisions/D-030-removed-members-locked.md)).
- Balance not zero: disabled, sub **"Settle your ₹1,200 first"** + link **"Settle up"**.
- Last organiser: disabled, sub **"Make someone else an organiser first"** + link **"Members"**.
- Confirm sheet: **"Leave Goa Weekend?"** / **"Your spot and history stay on the trip, marked as left. The trip disappears from this phone."** → `danger` **"Leave trip"** / **"Cancel"**.

### Delete trip
- Shown only when the [matrix](../09-security.md#permission-matrix) allows you, and **enabled only if nobody else has claimed a spot** (ghosts don't count).
- Otherwise disabled with sub **"Neha and Rahul are on this trip. Leave it instead."**
- Confirm sheet: **"Delete Goa Weekend?"** / **"This deletes the trip, its expenses and photos. Nobody else has joined, so nobody else loses anything."** If the trip has expenses, the user types the trip name to enable `danger` **"Delete trip"** ([features/trips](../features/trips.md)).

Components: `Screen`, `Header`, `Card`, `Row`, `Switch`, `Segmented`, `Button` (`secondary`, `tonal`, `ghost`, `danger`), `Sheet`, `Toast`, `Icon`.

## Permissions
Who may change each row is defined only in the **[permission matrix](../09-security.md#permission-matrix)** ([D-031](../decisions/D-031-permission-matrix.md)). This screen reads the matrix and your `trip_members.role`:
- A row you may not change is shown **read-only**, with sub **"Only an organiser can change this"**.
- An action you may not take at all (e.g. **Delete trip**) is hidden.
- The server rejects anything else with `not_organiser` / `not_allowed` ([unresolved-changes](unresolved-changes.md)).

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | n/a: every trip has settings. |
| Populated | As above. |
| Error | A rejected change (e.g. `not_organiser`, `trip_settled`) → the row goes back to the server value and the item is listed in [Unresolved changes](unresolved-changes.md). **Make a new link** failure: toast **"Couldn't make a new link. Try again."** |
| Offline | Trip, kitty, notification and status rows work (queued). **Share invite**, **Make a new link**, **Leave trip** and **Delete trip** need the network: sub **"Needs internet"** (Assumption for Leave and Delete, so the phone never removes a trip the server still has). |
| Syncing | Values update in place when someone else changes them. |
| Success | Toasts: **"Dates updated"**, **"Kitty handed to Neha"**, **"New link made. Share it again."**, **"Trip closed"**, **"Trip reopened"**, **"You left Goa Weekend"**, **"Trip deleted"**. Toasts about other people only say "sent" after the server confirms ([13 §8](../13-design-system.md)). |
| Disabled | **Settled trip:** Trip and Kitty rows are read-only with the banner **"This trip is settled. Reopen to edit."** ([06 §5](../06-syncing.md)); Notifications and Trip status still work. |
| Partial data | No dates: sub-lines about days are hidden. Kitty off: only the Kitty switch shows in that group. |

## Interactions
| Gesture | Result |
|---|---|
| Tap a row | Opens its sheet (or pushes the linked screen). |
| Toggle a switch | Applies straight away (no Save button); `Toast` with **Undo** for kitty on/off (Assumption). |
| Back | Previous screen. |

## Data
| UI | Source |
|---|---|
| Trip rows | `trips` (`name`, `start_date`, `end_date`, `destination_name`, `cover_key`, `base_currency`, `time_zone`, `settle_mode`, `status`) |
| Base currency lock | any non-deleted expense in the trip |
| Kitty rows | `trips.kitty_enabled`, `kitty_holder_member_id` (cached from the latest `kitty_handovers` row), `kitty_low_bp`, `kitty_target_minor`; remaining from the engine ([07 §6](../07-calculation-engine.md)) |
| Invite | last `/invite-create` response cached locally (`code`, `expires_at`) |
| Mute | `notification_preferences` rows with this `trip_id` |
| Close trip | engine derived payments (settle view) |
| Leave / Delete | engine `balance(me)`, `trip_members.role`, other members with `user_id` set |
| Last synced | `sync_cursors.last_pulled_at` |

## API / Database
| Action | Write |
|---|---|
| Name, dates, destination, cover, base currency, kitty on/off, low warning, target, settle mode | op `trip.update` (field patch, [06 §4](../06-syncing.md)). Cover image: `/upload-url` → R2 → `/upload-confirm` ([04 §4](../04-api-schema.md)) |
| Time zone | op `trip.update` (see Open questions) |
| Hand over the kitty | op `kitty.handover { from_member_id, to_member_id, remaining_minor }` ([D-022](../decisions/D-022-kitty-views-and-handover.md)) |
| Share invite | `POST /invite-create` without `rotate` |
| Make a new link | `POST /invite-create { rotate: true }` |
| Mute this trip | upsert `notification_preferences` (`trip_id` set, one row per category, `enabled = false`) through PostgREST ([04 §9](../04-api-schema.md)) |
| Close trip | op `trip.close` ([04 §5.1c](../04-api-schema.md)) |
| Request reopen | op `trip.request_reopen { note? }` |
| Reopen | op `trip.transition { to: reopen }` |
| Leave trip | op `member.remove { id: me }` ([06 §4](../06-syncing.md)); after it's applied, local data for the trip is deleted |
| Delete trip | not yet defined in [04](../04-api-schema.md) / [06](../06-syncing.md) (see Open questions) |

## Edge cases
- **Dates changed after expenses exist:** old expenses keep their `spent_at`; only "Day N" labels and the default participants for new expenses change.
- **End date moved into the past on a zero-balance trip:** the daily `lifecycle` job may settle it 24 h later ([D-023](../decisions/D-023-auto-settle-timing.md)).
- **Rotating while someone is joining:** their `/join` fails with `invite_invalid`; they need the new link.
- **You're the kitty holder and want to leave:** holding cash makes your balance non-zero, so hand the kitty over first.
- **Two organisers change the same field:** last write wins in server order; the other sees a quiet notice ([06 §5](../06-syncing.md)).

## Analytics
Proposed (not in PRD §19): `trip_settings_changed` (`field`), `invite_rotated`, `trip_closed` (`via: settings`), `trip_reopen_requested`, `trip_left`, `trip_deleted`. `kitty_enabled` fires as on [Kitty](kitty.md).

## Accessibility
- Group titles are headings. Each row reads label, value and state ("Base currency, Indian rupee, locked after the first expense").
- Disabled buttons announce why ("Leave trip, dimmed. Settle your one thousand two hundred rupees first").
- Destructive confirmations are sheets that trap focus; the safe button comes first in focus order.

## Open questions / assumptions
- **Assumption:** the whole screen, its grouping and copy.
- **Open (contradiction):** there is **no op or endpoint for deleting a trip** in [06 §4](../06-syncing.md) or [04](../04-api-schema.md), although the matrix allows it. Needs a `trip.delete` op (or endpoint) before build.
- **Open (contradiction):** `time_zone` is not in the `trip.update` field list in [06 §4](../06-syncing.md), and the [permission matrix](../09-security.md#permission-matrix) doesn't say who can change it. Same for the kitty target per person.
- **Assumption:** Leave and Delete need the network.
