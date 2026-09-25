# Screen · Skeleton loading

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | System (ships with R1a) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- SKELETON LOADING -->` block (lines 111–129); sidebar group "SYSTEM STATES · Skeleton loading"; auto-advance to Home after 1.1 s |
| **Related** | [06 §3.3 Pulling / snapshot](../06-syncing.md) · [06 §7 Sync status](../06-syncing.md) · [04 §2.3 trip-snapshot](../04-api-schema.md) · [13 §5 Skeleton, SyncPill](../13-design-system.md) · [features/offline-and-sync](../features/offline-and-sync.md) · [trip-home](trip-home.md) |

---

## Purpose
**Why:** normally every screen reads from SQLite and appears instantly. But a trip the phone has never seen (just joined, or a new phone) has no local rows yet. The user needs to know it is coming, not that it is empty.
**What:** a shimmering placeholder in the exact shape of [Trip home](trip-home.md), plus a "Syncing" pill.
**How:** shown only while the first snapshot of a trip downloads. It is replaced by Trip home as soon as rows land.

## User goal
"Show me my trip." The user waits a second or two and sees the real layout fill in, with no jump.

## Entry points
| From | Trigger |
|---|---|
| [Join in app](join-in-app.md) / [Invite web](invite-web.md) → **Get the Toli app** → app | After `POST /join`, the phone calls `GET /trip-snapshot` |
| [Sign in](sign-in.md) ("I already have an account") | After signing in on a new phone, each trip loads its snapshot |
| [Trips list](trips-list.md) | Tapping a trip whose snapshot hasn't finished (e.g. new phone, sign-in restored) |
| [Splash](splash.md) | Slow startup fallback (data not ready after 2.9 s) |

In the prototype, tapping the active trip card on Trips always passes through this screen (demo only).

## Exit points
| To | When |
|---|---|
| [Trip home](trip-home.md) | Snapshot written to SQLite (prototype: after 1.1 s) |
| [Empty trip](empty-trip.md) | Snapshot written and the trip has no expenses |
| Back to [Trips list](trips-list.md) | User presses back; the snapshot keeps downloading in the background |

## UI structure
Same gutters as Trip home (`space.gutter` 18 sides, 8 top, `space.stack` 12 gaps). All blocks use the `Skeleton` shimmer: `color.bg.raised → color.bg.shimmer → color.bg.raised`, 200% width, 1.3 s linear loop ([13 §6](../13-design-system.md)).

| Block | Shape (mirrors Trip home) |
|---|---|
| Header | `size.iconButton` tile (`radius.control`) + two lines (60% × 14 px, 40% × 10 px) |
| Hero ticket | full width × 168 px, `radius.card` |
| Kitty / Budget tiles | 2-column grid, each 96 px high, `radius.cardS`, gap `space.10`. **R1a/R1b:** only the Kitty tile shape (full width) when the trip has a kitty, because Budget is R2 |
| Balances card | `color.bg.card` card, `radius.card`, padding `space.cardPad`, 4 rows: `size.avatar` circle + flexible 12 px bar + 56 × 12 px bar |
| **SyncPill** | Centred, 40 px from bottom. Light pill (`color.text` background, `color.bg.card` text, `type.caption` at 600). 14 px spinner. Copy: **"Syncing {tripName} · {n} changes"**, e.g. **"Syncing Goa Weekend · 3 changes"**. Enters like a toast (`dur.fast`, `ease.enter`). |

No tab bar on this screen in the prototype. Components: `Screen`, `Skeleton`, `SyncPill`.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the blocks keep the same shapes as the compact Trip home.

## States
| State | Behaviour |
|---|---|
| Loading | The screen itself. |
| Empty | n/a: resolves to [Empty trip](empty-trip.md) when loaded. |
| Populated | n/a: resolves to Trip home. |
| Error | Assumption: if the snapshot fails (`not_a_member`, 5xx), replace the pill with a `Banner`: **"Couldn't load this trip. Check your connection and try again."** + **Try again**. For `not_a_member` (member released or trip deleted): **"You're no longer on this trip."** + **Back to trips**. For `426 upgrade_required`: **"Update Toli to open this trip."** + **Update** ([D-026](../decisions/D-026-write-path-and-compat.md)). |
| Offline | Assumption: pill text becomes **"Waiting for internet to load {tripName}"** with a muted dot instead of a spinner. The skeleton stays; the load resumes automatically when the network returns. Status bar shows **OFFLINE**. |
| Syncing | Default: spinner pill. `{n} changes` = ops still to apply (for a snapshot, show the pill without the count if unknown: **"Syncing Goa Weekend"**). |
| Success | Crossfade (`dur.fast`) to Trip home. Shapes line up so nothing jumps. |
| Disabled | n/a. |
| Partial data | The snapshot is one gzip response, read on the server in **one REPEATABLE READ transaction**, so its rows and `last_seq` always match and no op committed during the read is missed ([04 §2.3](../04-api-schema.md), [06 §3.3](../06-syncing.md)). There is no partial trip. It carries only the last 500 ops of history; older feed history loads later on scroll via `/trip-activity` and never holds up this screen. |

## Interactions
| Gesture | Result |
|---|---|
| Tap anywhere | Nothing (placeholders are not interactive). |
| Back | Returns to Trips list; download continues. |
| Pull-to-refresh | n/a. |

Reduce Motion: shimmer stops; blocks are a flat `color.bg.raised`.

## Data
- Reads `sync_cursors` for the trip (`last_seq` = 0 means "no snapshot yet").
- Reads `trips.name` if the trip row already exists (from the join response) for the pill copy.

## API / Database
- Calls `GET /trip-snapshot?trip_id=` ([04 §2.3](../04-api-schema.md)). The server reads it in one REPEATABLE READ transaction. The phone writes all rows to SQLite (only the current revision of each expense, plus the last 500 ops into the local `activity` table, [03 §10](../03-database-schema.md)) and sets `sync_cursors.last_seq`. Money values go through the money codec ([D-028](../decisions/D-028-money-in-sqlite.md)).
- Then normal pulls for anything after that `last_seq`: the phone reads `trip_ops` **directly through PostgREST** (`GET /rest/v1/trip_ops?trip_id=eq.{id}&seq=gt.{cursor}…`), which costs no Edge Function call. `POST /sync-pull` is only a fallback ([06 §3.3](../06-syncing.md), [D-026](../decisions/D-026-write-path-and-compat.md)).
- Parsing is **lenient**: unknown fields are ignored, and unknown values show as "Update the app to see this" ([D-026](../decisions/D-026-write-path-and-compat.md)).
- No ops are written by this screen.

## Edge cases
- **Large trip (2,000 expenses):** snapshot is gzip; keep the skeleton up to the first render, never block on history ([06 §8](../06-syncing.md)).
- **User was released while loading:** snapshot returns `not_a_member` → error state above.
- **Snapshot finishes while the user already went back:** no navigation; the trip card on Trips list simply becomes populated.

## Analytics
No PRD §19 event. Assumption: log snapshot duration and size to Sentry performance.

## Accessibility
- Screen reader announces **"Loading Goa Weekend"** once; the placeholders are hidden from accessibility.
- The pill is a live region (polite) so the error or offline copy is read when it changes.

## Open questions / assumptions
- **Assumption:** skeletons are used only for first-time trip loads. Opening a trip that is already on the phone never shows a skeleton (SQLite is instant).
- The prototype pill says "3 changes" during a load; for snapshots the change count is not known. Proposed: omit the count for snapshots, show it for pulls.
