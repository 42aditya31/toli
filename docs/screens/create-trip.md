# Screen · Create trip

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- CREATE -->` block (lines 156–201); logic in `create` object and `addMember()` |
| **Related** | [features/trips](../features/trips.md) · [features/members-and-ghosts](../features/members-and-ghosts.md) · [03 §4.1 trips, §4.2 trip_members, §5.8 trip_categories](../03-database-schema.md) · [06 §4 `trip.create`](../06-syncing.md) · [13 §6, §9](../13-design-system.md) · [trip-settings](trip-settings.md) · [permission matrix](../09-security.md#permission-matrix) · PRD F1, F2, §13 |

---

## Purpose
**Why:** PRD G1 says a group of 4 should create a trip and log the first expense within 90 seconds of install (we design for 60 s, OQ-P2 in [01](../01-overview.md#open-questions)). This screen is the first half of that.
**What:** one screen with the trip name (the only required field), a template, dates, base currency, and the people coming, added by name as ghosts.
**How:** everything is saved on the phone first. The trip is usable before any network call ([PRD F1](../superpowers/specs/2026-09-23-trip-money-manager-prd.md)).

## User goal
"Make a trip called Goa Weekend with me, Rahul, Neha and Jay, and get on with it."

## Entry points
| From | Trigger |
|---|---|
| [Welcome](welcome.md) | **Get started** |
| [Trips list](trips-list.md) | **+ New** |

## Exit points
| To | Trigger |
|---|---|
| [Empty trip](empty-trip.md) | **Create trip** succeeds. Toast: **"{tripName} created · works offline"** (e.g. "Goa Weekend created · works offline") |
| Back (previous screen) | `‹` back button. Assumption: if a name or members were entered, ask **"Discard this trip?"** with **Discard** / **Keep editing**. |

## UI structure
**Header** (`Header`): `size.iconButton` back tile (`CaretLeft`) + title **"New trip"** (`type.header`).

**Content** (scrolls; `space.gutter` sides; `space.20` gaps):

| # | Block | Details and exact copy |
|---|---|---|
| 1 | Trip name | Caption **"Trip name · the only thing we need"** (`type.small`, muted). Text input: `type.title` (prototype 30 px), transparent, 2 px lime underline. Placeholder **"Goa Weekend"**. Max 60 characters ([03 §4.1](../03-database-schema.md)). |
| 2 | Template | Caption **"Template · presets categories"**. 3-column grid of `size.buttonM` tiles (`radius.chip`, `type.caption` at 600): **Beach trip · Road trip · Trek · Wedding · Office offsite · Other**. Selected = lime / `color.onAccent`; others `color.bg.card`. Default **Beach trip** in the prototype (Assumption: default **Other** in production, see Open questions). |
| 3 | Dates + currency | Two equal tiles (`color.bg.card`, `radius.control`, padding 12/14). Left: label **"Dates"** (`type.micro` muted) + value e.g. **"12 – 15 Oct"** (`type.bodyStrong`). Right: **"Base currency"** + **"₹ INR"**. Both tap to open pickers (Assumption: the prototype tiles are static). Dates are optional; when empty the value reads **"Add dates"** (Assumption). |
| 4 | Who's coming | Caption **"Who's coming · {n} people"**. Wrapping row of member chips (`radius.pill`, 1.5 px border `color.bg.raised`, `color.bg.card` background): `size.avatarS` `Avatar` initial + name `type.bodyStrong` + sub-label `type.micro` muted. The creator: **"You"** + **"organiser"**, solid border. Each added person: name + **"ghost"**, **dashed** border. |
| 5 | Add by name | Input (48 px, `radius.control`, `color.bg.raised`) placeholder **"Add by name"** + 48 px lime **"+"** button. Enter key also adds. |
| 6 | Ghost hint | `type.small` muted: **"Nobody needs the app yet. Ghost members hold balances and can claim their spot from the invite link later."** |

**Footer** (padding 10 / `space.gutter` / 24): primary `Button`, `size.cta`, `radius.cta`, lime: **"Create trip"**.

**Compact layout** (< 380 px wide, [13 §9](../13-design-system.md)):
- the template grid wraps to **2 columns** (3 rows of 2);
- `space.gutter` → 16;
- the Dates and Base currency tiles stay side by side; long values are truncated with an ellipsis.

Components: `Screen`, `Header`, text input, `Chip` (template tiles and member chips), `Avatar`, `Button`, `Toast`, `Sheet` (pickers).

## States
| State | Behaviour |
|---|---|
| Loading | n/a: nothing loads. |
| Empty | Name empty, only the "You · organiser" chip. **Create trip** stays enabled; tapping it shows toast **"Give the trip a name"** (prototype behaviour). |
| Populated | Name typed, members added; header count updates live ("Who's coming · 4 people"). |
| Error | Validation only (see Edge cases). Shown as a toast or inline 12 px text under the field. |
| Offline | Identical. The trip is created locally; the success toast already says "works offline". |
| Syncing | n/a on this screen; the `trip.create` op syncs later. |
| Success | Navigate to Empty trip + toast. |
| Disabled | "+" does nothing when the add-by-name input is empty or whitespace. |
| Partial data | n/a. |

## Interactions
| Interaction | Result |
|---|---|
| Type name | Updates the name. Trimmed on save. |
| Tap a template | Selects it (single choice, 200 ms background transition). Only presets categories and default split; never limits behaviour (PRD F1). |
| Tap **Dates** | Opens a date-range picker (Assumption). Start only, or start + end; `end ≥ start`. Clear button. |
| Tap **Base currency** | Opens a currency list, INR first, default from device locale (Assumption; multi-currency rules in [features/multi-currency](../features/multi-currency.md)). Helper under the list: **"You can change this until the first expense is added."** The base currency stays editable in [Trip settings](trip-settings.md) **only until the first expense**; after that it's locked (`trip.update` allows `base_currency` only while the trip has no expenses, [06 §4](../06-syncing.md)). Who may change it: [permission matrix](../09-security.md#permission-matrix). |
| Type name + **+** / Enter | Adds a ghost chip; clears the input; keeps focus for the next name. Initial = first letter uppercase. |
| Tap a ghost chip | Assumption: small menu **Rename** / **Remove** (the prototype has none). |
| Tap the "You" chip | Assumption: edit your own display name (see Open questions). |
| **Create trip** | Validate → write locally → navigate. |
| Back | Discard confirmation if dirty (Assumption). |

Assumption: "Add from contacts" (PRD F2) lives on the [Members](members.md) screen, not here, to keep this screen fast. It copies **names only**; no phone number or hash is stored ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).

## Data
Reads:
- `profiles.display_name` (for the organiser's member name).
- Device locale for the default currency.
- **Device time zone** (IANA, e.g. `Asia/Kolkata`) for `trips.time_zone`. It isn't shown on this screen (Assumption: it can be changed later in [Trip settings](trip-settings.md)).
- Template → category seed list (from `packages/config`).

## API / Database
One SQLite transaction + one outbox op **`trip.create`** ([06 §4](../06-syncing.md)) with payload: name, dates, base currency, **time zone**, template, organiser display name, the first members.

Rows written locally ([03](../03-database-schema.md)):
| Table | Values |
|---|---|
| `trips` | `id` (UUID v7 on phone), `name`, `start_date`/`end_date`, `base_currency`, **`time_zone` = the phone's zone** (defines "Day 2 of 4", budget days, `joined_from` and duplicate checks; timestamps stay UTC), `template` (`beach`/`road`/`trek`/`wedding`/`offsite`/`other`), `status` = `active` (or `planning` if start date is in the future), `settle_mode` = `simplified`, `kitty_enabled` = false, `local_state` = `pending` |
| `trip_members` | creator: `role` = `organiser`, `user_id` = me, `claimed_at` = now; each ghost: `role` = `member`, `user_id` null, `joined_from` null |
| `trip_categories` | seeded from the template |
| `sync_cursors` | `last_seq` = 0 |

No invite is created here; that happens on first **Invite** ([04 §3.1](../04-api-schema.md)).

## Edge cases
| Case | Behaviour |
|---|---|
| Name is empty or only spaces | Toast **"Give the trip a name"**; focus the name field. |
| Name over 60 characters | Input stops accepting characters at 60. |
| Duplicate member name (case-insensitive) | Don't add; inline text **"{Name} is already on the list"** (Assumption). Unique rule from [03 §4.2](../03-database-schema.md). (Duplicates that only meet on the server, from two offline phones, become "Rahul 2", OQ-P21.) |
| Member name over 30 characters | Input stops at 30. |
| Two people with the same first letter | Initials can repeat (Rahul, Riya → R, R). Assumption: use two letters when the first collides ("RA", "RI"). |
| 50-member limit | After 49 ghosts + you, "+" is disabled with **"Trips can have up to 50 people"** (PRD F2; limit in `packages/config`, the server rejects more with `member_limit`, [04 §2.1](../04-api-schema.md)). |
| Start date in the future | Trip saved as `planning`; Trips list shows it under **PLANNING**. |
| Creating with just yourself | Allowed. Friends can be added later from Members or join via invite. |
| Phone time zone differs from the destination (e.g. created in India for a Bali trip) | The trip uses the creator's phone zone. Assumption: it can be corrected in Trip settings before the trip starts. |
| Wrong base currency picked | Fix it in Trip settings any time **before the first expense**. After that it's locked. |

## Analytics
| Event | When | Properties |
|---|---|---|
| `trip_created` | Create trip succeeds | `template`, `member_count` |
| `member_added` | Once per ghost in the initial list (on create) | `type: ghost` |

## Accessibility
- Name field label: "Trip name, required".
- Template grid is a radio group: "Template, Beach trip, selected, 1 of 6".
- Member chips read "Rahul, ghost member" and "You, organiser".
- The "+" button is labelled "Add member".
- Dashed vs solid border is not the only signal: the "ghost"/"organiser" word is always shown.

## Open questions / assumptions
- **Organiser's own name:** the prototype shows only "You". Other members see this person's `display_name`. Assumption: prefill from `profiles.display_name`; if empty, the "You" chip shows **"Add your name"** and Create trip asks once in a `Sheet`: **"What should friends call you?"**.
- **Default template:** prototype preselects Beach trip; proposing **Other** so categories aren't wrong by default.
- **Destination and cover image** (PRD F1 MUST, optional fields) are not in the UI reference. They're added later from [Trip settings](trip-settings.md), not on this screen.
- **Resolved:** `time_zone` is set from the phone on create (review DB-7). Base currency can change only before the first expense (review C-13).
- **Consent:** the privacy-notice consent is recorded at **Get started** on [Welcome](welcome.md), not here (OQ-P21).
