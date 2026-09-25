# Screen · Trip feed

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R3 (Feed tab in the R3 tab bar) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- FEED -->` block (lines 789–816) and `// feed` logic (lines 1274–1285). Tab bar "Feed" (line 874). Sidebar: "R3 · VAULT + MEMORY → Trip feed". |
| **Related** | [features/feed-and-recap](../features/feed-and-recap.md) · [features/expenses](../features/expenses.md) · [features/settle-up](../features/settle-up.md) · [features/kitty](../features/kitty.md) · [03 §6.4 feed_posts, §8.1 trip_ops, §7.1 attachments](../03-database-schema.md) · [06 §4 op types, §5 settled allow-list](../06-syncing.md) · [permission matrix](../09-security.md#permission-matrix) · [13 §5 icons, §6](../13-design-system.md) · [recap](recap.md) |

---

## Purpose
**Why:** a trip should end up as a memory, not a ledger (PRD F14). The feed is also a quiet audit: everyone sees what was added, paid and changed.
**What:** a timeline of the trip grouped by day, newest first: expenses, kitty spends and top-ups, settlements, people joining, plan changes, and photos and notes people post.
**How:** money and membership events are **derived from `trip_ops`** (never stored twice), read on the phone from the local `activity` table ([03 §10](../03-database-schema.md)); photos and notes are `feed_posts` ([03 §6.4](../03-database-schema.md)). There is no notification inbox in v1: this feed is the trip's history ([04 §8a](../04-api-schema.md)).

## User goal
"What happened on the trip, and when?" and "Let me drop a photo or a note for the group."

## Entry points
| From | Trigger |
|---|---|
| `TabBar` | **Feed** tab |
| Push | Tapping a `digest` notification opens the feed scrolled to the first new item, **from R3 only**. In R1 and R2 the digest opens Trip home, because the feed doesn't exist yet ([04 §11](../04-api-schema.md)) |

## Exit points
| To | Trigger |
|---|---|
| [Recap](recap.md) | Header button **"Recap"** |
| [Expense detail](expense-detail.md) | Tap an expense item |
| Balance trace / Settle up | Tap a settlement item (Assumption) |
| [Plan](plan.md) | Tap an itinerary-change item (Assumption) |
| Other tabs | Trip · Plan · Vault, or **+** |

## UI structure

### Header (tab screen)
- Left: **"Trip feed"** in `type.title` (28/800).
- Right: `Button` tonal, 40 px, radius 14, 13/600: **"Recap"**.

### Content (scroll, padding 0 18 110, gap 16 between days)
**Day group:** a label in `type.label` (mono 11/700, +0.12em, muted): **"SUN 13 OCT · TODAY"**, **"SAT 12 OCT"**. Days are newest first; items inside a day are newest first.

**Feed item** (row, gap 12, aligned to top):
- A `size.avatar` tile, `radius.chip`, with a **mark** (text marks in `type.mono`; icons are Phosphor at `icon.m`, [13 §5](../13-design-system.md)):
  | Event | Mark | Tile |
  |---|---|---|
  | Expense paid by a person | **₹** (`CurrencyInr`) | lime (`color.accent` / `color.onAccent`) |
  | Settlement | **✓** | lime |
  | Kitty spend, kitty start / top-up / hand-over | **K** | `bg.raised` |
  | Member joined / claimed, note, photo, plan change | the person's **initial** (e.g. **J**, **R**, **N**) | `bg.raised` |
  | Trip started | `AirplaneTilt` (Assumption: when the first booking is a flight; otherwise the ticket mark) | `bg.raised` |
  | Kitty low, trip over budget | `WarningCircle` | `color.warning` / `color.onWarning` (never lime) |
- Text (`type.body`) and, for photos, a 140 px image (`radius.key`). The reference placeholder reads **"photo · Chapora Fort"**.
- Time (`type.micro` mono, muted): **"18:40"**, or **"just now"** for the last few minutes.

**Copy patterns** (from the reference; `<>` are variables):
| Source op | Text |
|---|---|
| `expense.create` | **"<Payer> paid <₹amount> · <description>"**, e.g. "Aditya paid ₹4,000 · Casa Anjuna · 2 rooms" |
| `expense.create` (from kitty) | **"Kitty paid <₹amount> · <description>"**, e.g. "Kitty paid ₹4,200 · Fuel · 2 scooters" |
| `settlement.create` | **"<From> paid <To> <₹amount>"**, e.g. "Rahul paid Aditya ₹1,000" |
| `trip.update` enabling the kitty + first `kitty.contribute` | **"Kitty started · <₹total> in, held by <Holder>"** |
| `member.claim` | **"<Name> joined the trip and claimed his spot"** (Assumption: use "claimed their spot" — gender-neutral) |
| `feed.post` (note) | **"<Author>: <text>"**, e.g. "Rahul: scuba moved to 12:00, pickup at Baga jetty" |
| `feed.post` (photo) | **"<Author> posted a photo"** + image |
| `trip.transition` → active | **"Trip started · <first booking or destination>"**, e.g. "Trip started · flight BLR → GOI" |

Additional items (Assumption, from PRD F14 "member joins, itinerary changes, kitty top-ups"; muted `bg.raised` tile):
| Source op | Text |
|---|---|
| `kitty.contribute` (later) | "<Name> topped up the kitty · ₹500" |
| `member.add` | "<Actor> added <Name>" |
| `expense.edit` | "<Actor> edited <description>" (Assumption: shown only when amount or split changed) |
| `expense.delete` | "<Actor> deleted <description> · ₹1,200" |
| `settlement.void` | "<Actor> undid a payment · <From> → <To> ₹1,000" |
| `itinerary.upsert` / `move` | "<Actor> moved Scuba to 12:00" |
| `kitty.handover` | "Kitty cash handed to <To> · ₹3,000" ([D-022](../decisions/D-022-kitty-views-and-handover.md)) |
| `settlement.create` with `method = rounding` | "Rounding · ₹0.33" (the dust rule when the trip closes, [D-021](../decisions/D-021-rounding-adjustment.md)) |
| `trip.close` | "<Actor> closed the trip" |
| `trip.transition` → settled | "Everyone's square. Trip settled." (after Close trip, or 24 h after the end date, [D-023](../decisions/D-023-auto-settle-timing.md)) |
| `trip.request_reopen` | "<Actor> asked to reopen the trip" |
| `trip.transition` `reopen` | "<Actor> reopened the trip" |
| `expense.create` with `is_refund` (R1b) | "<Payer> got back ₹2,000 · Hotel refund" ([D-029](../decisions/D-029-refund-expense.md)) |
| `attachment.delete` | "<Actor> removed Travel insurance from the vault" |

**Private ops never appear for other members.** A personal budget (`budget.set` with scope `member`) or an owner-only file (`attachment.register` with `visibility = owner`) is stored with `trip_ops.visible_to_member_id`, so it's never pulled into anyone else's `activity` table ([03 §8.1](../03-database-schema.md)). The owner sees their own.

**Composer** (Assumption; the reference has no way to post): a row at the top of today's group, `Card` 52 px: avatar + "Add a note or photo" (muted) + a photo icon button. Opens a `Sheet` with a text field (≤ 280 chars; Assumption) and "Add photo".

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; photos keep full width.

Components: `Screen`, `Row` (feed variant), `Avatar`/icon tile, `Card`, `Sheet`, `Button` (tonal), `TabBar`, `Toast`, `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: derived from SQLite. Photos show the `Skeleton` shimmer (`bg.raised → bg.shimmer`) until the image loads (the prototype's raw striped gradient is replaced by the token-based skeleton). |
| Empty | Brand-new trip: one item "Trip created" plus the composer; Assumption copy under it: "Spends, payments and photos show up here as the trip happens." |
| Populated | As above. |
| Error | Photo upload failed: the post shows "Not uploaded · retry" under the image (the post itself is kept locally). |
| Offline | Everything already on the phone shows. New posts are saved locally and show "SAVED ON PHONE · WILL SYNC" in place of the time (same label as pending expenses, [06 §7](../06-syncing.md)). Other people's photos not yet downloaded show the placeholder. |
| Syncing | New items from other phones slide in at the top of today (`dur.fast`, `ease.enter`). Pulls read `trip_ops` through PostgREST into `activity` ([06 §3.3](../06-syncing.md)). |
| Success | After posting: toast **"Posted to the trip"** (Assumption). |
| Disabled | Settled trip: the composer stays enabled for notes and photos; feed posts are allowed on settled trips ([06 §5](../06-syncing.md)). |
| Partial data | Expense with no description: uses the category label ("Aditya paid ₹800 · Food"). Removed member: shows their kept `display_name`. Anonymised (deleted account): shown as **"Former member"** (numbered if several), avatar is initials ([03 §11](../03-database-schema.md)). |

## Interactions
| Gesture | Result |
|---|---|
| Tap **Recap** | Push to [Recap](recap.md). |
| Tap an expense / settlement item | Expense: [Expense detail](expense-detail.md). Settlement: Balance trace / Settle up (Assumption). |
| Tap a photo | Full-screen viewer with the author and time. |
| Long press a post | **Delete** (`danger`) → `feed.delete`, when the [permission matrix](../09-security.md#permission-matrix) allows it (your own posts; organisers any). |
| Pull to refresh | Triggers a sync pull (Assumption; realtime usually makes this unnecessary). |
| Scroll to the end | The phone holds the last 500 ops; older history loads 200 rows at a time from `GET /trip-activity?before_seq=` ([04 §2.3](../04-api-schema.md)). Needs internet; offline shows "Older activity loads when you're online" (Assumption). |

## Data
| Value | Source (SQLite) |
|---|---|
| Derived items | the local-only **`activity`** table (`trip_id`, `seq`, `type`, `entity_id`, `actor_member_id`, `summary` json, `server_ts`, [03 §10](../03-database-schema.md)), filled from pulls and from `/trip-snapshot` (last 500 ops), turned into feed items; pending local changes come from `outbox`. Unknown op types show as "Update the app to see this" ([D-026](../decisions/D-026-write-path-and-compat.md)) |
| Names, initials | `trip_members.display_name` |
| Expense text | the op's `result` (description, amount, payer, `paid_from_kitty`) |
| Posts | `feed_posts` (kind, text, author_member_id, created_at) + `attachments` where `owner_type = feed_post` |
| Day grouping | op `server_ts` (or `spent_at` for expenses; Assumption) in the **trip's** time zone (`trips.time_zone`, [03 §4.1](../03-database-schema.md)), not the phone's |

## API / Database
| Action | Op / endpoint |
|---|---|
| Post a note | `feed.post` (`kind = note`) |
| Post a photo | `feed.post` (`kind = photo`) + `attachment.register` + `POST /upload-url` / `POST /upload-confirm` (Wi-Fi only by default) |
| Delete a post | `feed.delete` |
| Everything else | Read only |

## Edge cases
- **Expense edited later:** the original "paid" item stays, showing the **current** amount (Assumption), plus an "edited" item if the amount or split changed.
- **Expense deleted:** the original item is shown struck through with "deleted" (Assumption) and the delete item appears.
- **Expense backdated** (`spent_at` yesterday, logged today): grouped by `spent_at` day so the story stays true (Assumption).
- **Hundreds of events on a busy day:** consecutive kitty spends within 30 minutes collapse into "Kitty paid ₹6,200 · 3 spends" (Assumption).
- **Rejected ops** never appear in the feed; they're in [Unresolved changes](unresolved-changes.md).
- **Settlement voided on a settled trip:** the void item appears and the trip moves back to settling ([06 §5](../06-syncing.md)).
- **Photo with location metadata:** EXIF/GPS is stripped before upload ([02 §4](../02-architecture.md)). The "· Chapora Fort" label is the linked itinerary place, not GPS (Assumption).

## Analytics
No PRD §19 feed event. Proposed (Assumption): `feed_post_added` (`kind`), `feed_viewed`. `recap_shared` fires on the Recap screen.

## Accessibility
- The day label is a heading.
- Each item is read as one sentence with its time: "Aditya paid four thousand rupees, Casa Anjuna, 2 rooms. 14:10."
- Marks (₹, K, ✓, ✈) are decorative; the text carries the meaning.
- Photos need alt text: "Photo by Neha, 18:40". Assumption: an optional caption is used as alt text.
- Reduce Motion: new items appear without the slide.

## Open questions / assumptions
- **Resolved:** feed history on a new phone or for a mid-trip joiner comes from the snapshot's `activity[]` (last 500 ops) and `/trip-activity` for older rows ([03 §10](../03-database-schema.md), [04 §2.3](../04-api-schema.md)).
- **Resolved:** feed posts are allowed on a settled trip ([06 §5](../06-syncing.md)).
- **Resolved:** private ops (personal budgets, owner-only files) are hidden from other members via `visible_to_member_id` (review S-07).
- **Resolved:** the `digest` push opens the feed only from R3 (review U-7).
- **Assumption:** the composer, detail taps, deletes and the extra event types are not in the reference.
