# 03 · Database Schema

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Related** | [06 Syncing](06-syncing.md) · [07 Calculation engine](07-calculation-engine.md) · [04 API](04-api-schema.md) · [09 Security](09-security.md) |

This document covers two databases:
- **Postgres** (Supabase), the source of truth.
- **SQLite** (on the phone), a copy of the user's trips that the UI reads from.

Every table in either database must be documented here first, before it's created. If a table isn't in this document, it must not exist.

---

## 1. Conventions (apply to every table)

| Rule | Detail |
|---|---|
| **IDs** | `uuid`, **UUID v7**, generated on the phone. Never auto-increment. |
| **Money** | `bigint` minor units (`*_minor`), always next to a `char(3)` currency column or an implied trip `base_currency`. |
| **Timestamps** | `timestamptz`, UTC. Every table has `created_at`. Mutable tables also have `updated_at`. |
| **Soft delete** | `deleted_at timestamptz null` on every mutable table. Nothing is hard-deleted except for account erasure ([09](09-security.md)). |
| **Append-only money** | Expenses (through revisions), settlements and kitty contributions are **never updated in place**. Edits add a new revision; removals add a void or tombstone. |
| **Sync** | Every trip-scoped row has `trip_id` and `last_seq bigint`, the trip sequence number of the op that last changed it. |
| **Who** | Trip-scoped rows record `created_by_user uuid` and, where it matters, `*_member_id`. |
| **Naming** | `snake_case`, plural table names. |
| **Lists of values** | Stable lists are Postgres enums (`trip_status`, `member_role`, `platform`, `op_status`). **Lists that will grow** are `text` + a `CHECK` constraint, because enum values can't be removed and old apps break on new ones: `split_mode`, `settlement_method`, `attachment_owner`, `booking_type`, `itinerary_type`, `notif_category`, push `kind`, op `type`. The phone treats unknown values as "Update the app to see this" ([D-026](decisions/D-026-write-path-and-compat.md)). |
| **RLS** | **Enabled on every table.** A CI test fails if any table in `public` has RLS off or has no policy. |
| **Writes** | Trip data is written **only** through `sync-push`, which calls the `apply_ops` Postgres function ([D-026](decisions/D-026-write-path-and-compat.md)). Clients can only `SELECT` trip data (RLS: app-claimed trip members only). |
| **Migrations** | Always **expand → migrate → contract**. Never rename or drop a column in the same release that stops using it. |

### Helper functions (SQL, `security definer`, in a `private` schema that the API doesn't expose, `search_path = ''`, execute revoked from `anon`)
- `private.my_trip_ids() → setof uuid`: trips where the caller (`auth.uid()`) has a member row with `claimed_via = 'app'` and `removed_at is null`. **Web-claimed rows never count** ([D-024](decisions/D-024-web-page-read-only-beta.md)).
- Policies are written as `trip_id in (select private.my_trip_ids())`, so the check runs **once per query, not once per row**. This is backed by the index `trip_members(user_id, trip_id)`.
- `private.member_id_for(trip_id uuid) → uuid`: the caller's member ID in that trip.

> In this document, "RLS: select if `is_trip_member(trip_id)`" is shorthand for the policy `trip_id in (select private.my_trip_ids())`. For `trip_ops`, the policy also requires `visible_to_member_id is null or visible_to_member_id = private.member_id_for(trip_id)`.

### Required indexes
- `trip_members (user_id, trip_id)`: my trips, and the RLS check.
- `trip_members (trip_id) where removed_at is null`.
- `expense_revisions (expense_id, revision_no)`.
- `expenses (trip_id, last_seq)` and `expenses (trip_id) where not is_deleted`.
- `settlements (trip_id)`, `kitty_contributions (trip_id)`, `kitty_handovers (trip_id)`.
- `attachments (owner_type, owner_id)`, and `attachments (state, created_at) where state = 'pending'` (for cleanup).
- `trip_ops (trip_id, seq)` (the primary key) and `trip_ops (op_id)` (unique).
- `notification_outbox (send_after) where sent_at is null`.

**Circular reference:** `expenses.current_revision_id → expense_revisions` and `expense_revisions.expense_id → expenses` is declared `DEFERRABLE INITIALLY DEFERRED`, so `apply_ops` can insert both in one transaction.

### `apply_ops(trip_id, expected_seq, ops jsonb)`: the only write path
A `security definer` plpgsql function, called by `sync-push` with the rows the engine has already computed. It:
1. takes `SELECT … FOR UPDATE` on the trip;
2. returns `stale` if `trips.last_seq ≠ expected_seq`, so `sync-push` reloads and re-validates (up to 3 tries);
3. re-checks the rules that depend on current state (removed-member balance, settled status, member limit);
4. inserts the rows, the `trip_ops` records and the `trip_balances` deltas, and bumps `last_seq`.

All in one transaction.

### Enums and checked lists
```
trip_status        planning | active | settling | settled | archived
settle_mode        simplified | direct
member_role        organiser | member
split_mode         equal | exact | percent | shares | adjust | itemised
settlement_method  upi | cash | bank | other | rounding      (rounding = the dust rule, D-021)
claimed_via        app | web                                (web = limited R1b web membership, D-024)
attachment_owner   expense | booking | trip | feed_post | profile
attachment_state   pending | uploaded | failed
itinerary_type     travel | stay | activity | meal | free_time
booking_type       flight | train | bus | hotel | cab | activity | other
op_status          applied | rejected
platform           android | ios
notif_category     payments | expenses | reminders | trip_updates
```

---

## 2. Entity map

```
auth.users ─1:1─ profiles ─1:n─ devices
                   │
                   └─ trip_members (user_id null = ghost) ─n:1─ trips ─1:n─ trip_ops (sync log)
                                                                 │
   ┌──────────────┬──────────────┬───────────────┬───────────────┼────────────────┬──────────────┐
 expenses     settlements  kitty_contributions  trip_categories  itinerary_items  bookings   feed_posts
                           kitty_handovers
   │ 1:n                                                          places           booking_members
 expense_revisions ─1:n─ expense_payers / expense_shares / expense_items
   │
 attachments (receipts, tickets, photos → R2 keys)

Planning: trip_budgets · itinerary_items · places · bookings · feed_posts · recaps
Global: fx_rates · pro_passes · pro_subscriptions · consents · notification_outbox · reminders · trip_invites · deletion_requests · data_exports · rate_limit_buckets
```

---

## 3. Identity

### 3.1 `profiles`
One row per real user. Created on first sign-in, including anonymous sign-in.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `display_name` | text null | set when the user claims a member or edits their profile |
| `avatar_key` | text null | R2 key |
| `upi_vpa` | text null | e.g. `aditya@okhdfc`; opt-in; validated by regex |
| `upi_visible_to` | enum `debtors_only`/`nobody` | default `debtors_only`: the ID is only revealed through `/upi-link` to a member who currently owes this person (PRD §18) |
| `locale` | text | `en-IN` / `hi-IN` |
| `hide_lockscreen_amounts` | bool | default false. When true, the server removes amounts and names from push text ([review S-05](14-pre-development-review.md#15-security-problems)) |
| `notify_threshold_major` | int | default 1: only notify me when an edit changes my balance by more than this many **major units of that trip's currency** (₹1, $1, ¥1, PRD F5). The server converts it to minor units with the currency exponent |
| `is_anonymous` | bool | mirrors `auth.users.is_anonymous` |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | |

**RLS:** the owner can select and update their own row. Other trip members can select only `display_name` and `avatar_key`, through the view `member_profiles`. `upi_vpa` is exposed only through the Edge Function that builds UPI links, and only to members who owe this person.

### 3.2 `devices`
Push tokens are stored **per device**, not per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | generated on the device, stored in secure storage |
| `user_id` | uuid FK → profiles | |
| `platform` | platform | |
| `fcm_token` | text null | null until push permission is granted |
| `app_version`, `runtime_version` | text | |
| `last_seen_at` | timestamptz | |
| `invalidated_at` | timestamptz null | set when FCM reports the token as `UNREGISTERED` |
| `push_mode` | enum `data`/`notification` | `data` (default) = data-only messages drawn by notify-kit with the custom design. `notification` = system-drawn payloads, used on phones whose makers kill background apps (Xiaomi, Oppo, Vivo, Realme, OnePlus) or after 2 missed delivery receipts ([D-009](decisions/D-009-notifications.md)) |
| `created_at`, `updated_at` | | |

**Index:** `(user_id) where invalidated_at is null`. **RLS:** the owner can select, insert and update their own rows.

### 3.3 `notification_preferences`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid FK | PK part |
| `trip_id` | uuid null | null = global default; set = per-trip mute |
| `category` | notif_category | PK part |
| `enabled` | bool | |
| `updated_at` | | |

**Unique:** `(user_id, coalesce(trip_id, '00000000-…'), category)`. **RLS:** owner only.

---

## 4. Trips and members

### 4.1 `trips`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | v7, from the phone |
| `name` | text | required, 1–60 characters |
| `destination_name` | text null | |
| `destination_place_ref` | text null | provider place ID |
| `start_date`, `end_date` | date null | `end_date ≥ start_date` |
| `base_currency` | char(3) | default from the phone's locale (INR) |
| `time_zone` | text | IANA zone, e.g. `Asia/Kolkata`; default: the creator's phone zone. Defines "day 2 of 4", budget days, `joined_from` and feed day grouping. All timestamps stay UTC; only day boundaries use this zone |
| `template` | enum `beach`/`road`/`trek`/`wedding`/`offsite`/`other` | cosmetic only |
| `status` | trip_status | default `active` (`planning` if the start date is in the future) |
| `settle_mode` | settle_mode | default `simplified` |
| `cover_key` | text null | R2 |
| `kitty_enabled` | bool | default false |
| `kitty_holder_member_id` | uuid null FK → trip_members | required when `kitty_enabled`. **A cached value**: the `to` member of the latest `kitty_handovers` row, or the first holder. It's changed only by `kitty.handover` ([D-022](decisions/D-022-kitty-views-and-handover.md)) |
| `closed_at` | timestamptz null | set when someone taps **Close trip**, or by the lifecycle job ([D-023](decisions/D-023-auto-settle-timing.md)) |
| `min_client_version` | text null | optional per-trip override; the global minimum is in server config |
| `kitty_target_minor` | bigint null | per-person target |
| `kitty_low_bp` | int | default 2000 (20%) |
| `is_pro` | bool | true once a Pro pass is bought (derived from `pro_passes`, cached) |
| `last_seq` | bigint | default 0; highest applied op sequence number |
| `created_by_user` | uuid | |
| `created_at`, `updated_at`, `deleted_at` | | |

**Index:** `(id)`. **RLS:** select if `is_trip_member(id)`. No client writes.

### 4.2 `trip_members`
Each person on a trip. A member is a **ghost** when `user_id` is null.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `user_id` | uuid null FK → profiles | null = ghost; set when claimed |
| `display_name` | text | 1–30 characters, unique within the trip (case-insensitive) |
| `role` | member_role | the creator is `organiser` |
| `joined_from` | date null | late joiner; used for default participant sets (PRD F2) |
| `claimed_at` | timestamptz null | |
| `claimed_via` | claimed_via null | `app` = full member. `web` = limited R1b web membership: it **never** passes `my_trip_ids()` ([D-024](decisions/D-024-web-page-read-only-beta.md)) |
| `last_active_at` | timestamptz null | updated at most daily by `sync-push`; used for the organiser takeover rule (OQ-P20) |

> **Removed (D-025):** `contact_hash`. **Moved:** secrets such as the web spot key live in `trip_member_secrets` (§4.4), which members can't read.
| `removed_at` | timestamptz null | only allowed when the balance is 0 (enforced by the server) |
| `last_seq` | bigint | |
| `created_by_user`, `created_at`, `updated_at` | | |

**Unique:** `(trip_id, user_id) where user_id is not null`, so one member per user per trip. **Unique:** `(trip_id, lower(display_name)) where removed_at is null`.
**RLS:** select if `is_trip_member(trip_id)`.

### 4.3 `trip_invites`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `code` | text | human code like `GOA-7K2PXQ`: a cosmetic 3-letter trip prefix plus **6 random characters** from a 31-character alphabet with no ambiguous characters (0/O/1/I/L), about 887 million combinations. Unique, uppercase |
| `token_hash` | bytea | SHA-256 of the long URL token, used for lookups |
| `token_encrypted` | bytea | the token encrypted with a server key (Supabase Vault), so **any member can re-share the same link** without rotating it. Only Edge Functions can decrypt it |
| `created_by_user` | uuid | |
| `expires_at` | timestamptz | default 30 days after the trip's end date, or +60 days if there is no end date |
| `revoked_at` | timestamptz null | the organiser can rotate the invite |
| `uses` | int | counter, for abuse detection |
| `created_at` | | |

One active invite per trip at a time; rotating it revokes the old one. **RLS:** no client access. Edge Functions only. See [D-008](decisions/D-008-invite-links.md).

---

## 5. Money (append-only)

### 5.1 `expenses` (logical header)
The stable identity of an expense. It never changes after creation except for `current_revision_id`, `is_deleted` and `last_seq`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | the **seed** for rounding ([07 §3](07-calculation-engine.md)) |
| `trip_id` | uuid FK | |
| `current_revision_id` | uuid FK → expense_revisions | |
| `is_deleted` | bool | true once a delete revision exists |
| `created_by_user`, `created_by_member_id` | uuid | |
| `created_at` | timestamptz | server time of the first apply |
| `last_seq` | bigint | |

**Indexes:** `(trip_id, is_deleted)`, `(trip_id, last_seq)`.

### 5.2 `expense_revisions`
Every create, edit and delete adds one row. It is **never updated**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `expense_id` | uuid FK | |
| `trip_id` | uuid FK | |
| `revision_no` | int | 1, 2, 3 … per expense |
| `kind` | enum `create`/`edit`/`delete` | |
| `amount_minor` | bigint | > 0, in the expense currency |
| `currency` | char(3) | |
| `fx_rate` | numeric(30,15) | frozen rate, at most 12 significant digits ([07 §4.2](07-calculation-engine.md)); `1` when the currency is the same. The engine parses it into an exact fraction |
| `is_refund` | bool | default false ([D-029](decisions/D-029-refund-expense.md), R1b) |
| `engine_version` | text | the `@toli/engine` version that computed the shares (for audits) |
| `fx_source` | enum `same`/`daily`/`manual` | |
| `fx_rate_date` | date null | |
| `base_amount_minor` | bigint | converted total, in the trip currency |
| `spent_at` | timestamptz | when it was spent (user-editable) |
| `category_id` | uuid null FK | |
| `description` | text null | ≤ 120 characters |
| `split_mode` | split_mode | |
| `split_input` | jsonb | exactly what the user entered (weights, bp, exact amounts, add-ons), validated by a Zod schema per mode |
| `paid_from_kitty` | bool | |
| `is_committed` | bool | booked before the trip (budget) |
| `op_id` | uuid | the op that created this revision |
| `created_by_user`, `created_at` | | |

**Unique:** `(expense_id, revision_no)`. **Check:** `kind = 'delete'` rows copy the previous values, so history stays readable.

### 5.3 `expense_payers`
| Column | Type | Notes |
|---|---|---|
| `revision_id` | uuid FK | PK part |
| `member_id` | uuid FK | PK part |
| `amount_minor` | bigint | in the expense currency, as entered |
| `base_minor` | bigint | from `allocate()` |

No rows when `paid_from_kitty`. **Invariant:** Σ `base_minor` = revision `base_amount_minor`.

### 5.4 `expense_shares`
| Column | Type | Notes |
|---|---|---|
| `revision_id` | uuid FK | PK part |
| `member_id` | uuid FK | PK part |
| `share_minor` | bigint | in the expense currency |
| `base_minor` | bigint | in the trip currency |

**Invariant:** Σ `base_minor` = `base_amount_minor`. The server rejects any op that breaks this ([06](06-syncing.md)).

### 5.5 `expense_items` (itemised: R1 by hand, R2 filled by a scan; [D-017](decisions/D-017-itemised-free-scan-pro.md))
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `revision_id` | uuid FK | |
| `position` | int | |
| `kind` | enum `item`/`tax`/`service`/`tip`/`discount`/`round_off` | `round_off` is the bill's own rounding line (can be ±), prorated like an extra |
| `label` | text | |
| `amount_minor` | bigint | |
| `assignee_member_ids` | uuid[] | only for `kind = item` |

### 5.6 `settlements`
A recorded payment from one member to another. **Immutable**: undoing one means voiding it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `from_member_id`, `to_member_id` | uuid FK | must be different |
| `amount_minor` | bigint | > 0, in the trip currency |
| `method` | settlement_method | `rounding` rows are written only by the server ([D-021](decisions/D-021-rounding-adjustment.md)) |
| `pending_confirmation` | bool | default false. True for **web** settlements (R1b) until the payee confirms. Pending rows **don't count** in balances ([D-024](decisions/D-024-web-page-read-only-beta.md)) |
| `confirmed_at`, `confirmed_by_user` | | |
| `note` | text null | |
| `recorded_by_user` | uuid | |
| `recorded_at` | timestamptz | |
| `voided_at` | timestamptz null | |
| `voided_by_user`, `void_reason` | | |
| `op_id`, `last_seq` | | |

Once set, `voided_at` can't be unset. That rule is enforced by the server, not by an update.

### 5.7 `kitty_contributions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `member_id` | uuid FK | |
| `amount_minor` | bigint | > 0, in the trip currency |
| `recorded_by_user`, `recorded_at` | | |
| `voided_at`, `voided_by_user` | | |
| `op_id`, `last_seq` | | |

### 5.7a `kitty_handovers`
The kitty cash moving from one holder to another ([D-022](decisions/D-022-kitty-views-and-handover.md)). **Immutable**, like settlements.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `from_member_id`, `to_member_id` | uuid FK | must be different |
| `remaining_minor` | bigint | kitty cash at the moment of hand-over (as computed by the engine; informational) |
| `recorded_by_user`, `recorded_at` | | organiser or the current holder |
| `voided_at`, `voided_by_user` | | |
| `op_id`, `last_seq` | | |

### 5.8 `trip_categories`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `key` | text | `food`, `drinks`, `travel`, `stay`, `activities`, `shopping`, `fuel`, `tolls`, `tips`, `misc`, or `custom:*` |
| `label` | text | |
| `position` | int | |
| `is_default` | bool | |
| `deleted_at`, `last_seq` | | |

Seeded from the trip template when the trip is created.

### 5.9 `trip_budgets` (R2)
One row per budget. The total, per-category and personal budgets all live here.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK | |
| `scope` | enum `total`/`category`/`member` | |
| `category_id` | uuid null | set when scope = `category` |
| `member_id` | uuid null | set when scope = `member` (a personal ceiling, visible only to that member) |
| `amount_minor` | bigint | in the trip currency |
| `alert_75_at`, `alert_100_at` | timestamptz null | set once when the alert fires, so each alert is sent only once (PRD F8). **Re-armed** (set back to null) when `budget.set` raises the amount so that usage falls below that threshold again |
| `updated_by_user`, `updated_at`, `deleted_at`, `last_seq` | | field-LWW |

**Unique:** `(trip_id, scope, coalesce(category_id, member_id)) where deleted_at is null`. **RLS:** trip members can select, except `member`-scope rows, which only that member can see.

> **Links between planning and money** are stored **only on the planning side**: `itinerary_items.linked_expense_id` and `bookings.linked_expense_id`. Linking or unlinking is a planning edit (field-LWW) and never creates a money revision.

---

## 6. Planning and memory (R2/R3)

These use **last-write-wins per field** (not append-only), because no money depends on them.

### 6.1 `itinerary_items`
`id`, `trip_id`, `day` (date, null = the unscheduled "ideas" list), `sort_key` (text, fractional index for drag-to-reorder), `time` (time null), `type` itinerary_type, `title`, `place_id` null, `notes`, `estimated_cost_minor` null, `estimated_currency` char(3) (default: the trip currency; converted for the planned total with today's cached rate, display only), `linked_expense_id` null, `created_by_user`, timestamps, `deleted_at`, `last_seq`.

### 6.2 `places`
`id`, `trip_id`, `name`, `category`, `lat`/`lng` (numeric(9,6)), `provider` (`geoapify`/`google`/`manual`), `provider_ref`, `notes`, timestamps, `deleted_at`, `last_seq`.

### 6.3 `bookings` + `booking_members`
- `bookings`: `id`, `trip_id`, `type` booking_type, `provider`, `title` (e.g. "GOI → BLR", "2 rooms · 3 nights"), `reference` (PNR or confirmation), `details` (e.g. "6E-5318 · Seats 14A–14D"), `starts_at`, `ends_at`, `cost_minor`, `currency`, `linked_expense_id`, `notes`, timestamps, `deleted_at`, `last_seq`.
- `booking_members`: `(booking_id, member_id)`, meaning "covers".

### 6.4 `feed_posts`
`id`, `trip_id`, `author_member_id`, `kind` (`note`/`photo`), `text`, timestamps, `deleted_at`, `last_seq`.

Everything else in the Trip feed (expenses, joins, settlements) is **derived from `trip_ops`**. It isn't stored twice.

### 6.5 `recaps`
`trip_id` PK, `snapshot` jsonb (numbers frozen when the trip is settled), `hide_amounts` bool, `theme` text (Pro themes), `public_token_hash` bytea null, `public_token_encrypted` bytea null (so `/recap-publish` can return the same link again, as with invites), `generated_at`, `revoked_at`, `updated_at`, `last_seq`.

- Changed with the op `recap.update` (field-LWW: `hide_amounts`, `theme`).
- The public link is created and revoked through `/recap-publish` and `/recap-revoke` ([04 §8a](04-api-schema.md)).
- Any member can turn `hide_amounts` on; turning it off asks for confirmation.
- In R1 there is no recap. The settled state shows "Everyone's square." and the recap arrives in R3.
- **Reopened and settled again:** a **new snapshot** replaces the old one. The public link stays the same and shows the newest recap, labelled with its date ("Recap · updated 18 Oct"). Revoke it first if the group doesn't want that.

---

## 7. Files

### 7.1 `attachments`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | from the phone |
| `trip_id` | uuid null FK | null only when `owner_type = profile` (avatars) |
| `owner_type` | attachment_owner | `expense`, `booking`, `trip`, `feed_post`, `profile` |
| `display_name` | text null | e.g. "Travel insurance.pdf" |
| `visibility` | enum `trip`/`owner` | default `trip`. `owner` = only the uploader can see it (e.g. a personal ID). The RLS select policy and `/download-url` both enforce it |
| `owner_id` | uuid | |
| `r2_key` | text | `trips/{trip_id}/{attachment_id}.{ext}`, or `profiles/{user_id}/{attachment_id}.{ext}` for avatars; never guessable without the ID |
| `mime` | text | `image/jpeg`, `image/webp` or `application/pdf` |
| `bytes` | int | max 10 MB (images are compressed to ~150 KB first) |
| `sha256` | bytea | integrity and de-duplication |
| `width`, `height` | int null | |
| `state` | attachment_state | `pending` until the upload is confirmed |
| `uploaded_by_user`, `created_at`, `deleted_at`, `last_seq` | | |

**RLS:** select if trip member **and** (`visibility = 'trip'` or `uploaded_by_user = auth.uid()`). File bytes are only reachable through short-lived signed URLs ([04](04-api-schema.md)), which check the same rule.

**Cleanup:** the nightly `cleanup` job deletes rows still `pending` after 24 hours, together with their R2 objects.

---

## 8. Sync backbone

### 8.1 `trip_ops`
The ordered log of every change to a trip. Clients pull from it ([06](06-syncing.md)). It also serves as the **audit trail**: who changed what, and when.

| Column | Type | Notes |
|---|---|---|
| `trip_id` | uuid | PK part |
| `seq` | bigint | PK part; strictly increasing per trip, assigned by the server |
| `op_id` | uuid UNIQUE | **idempotency key** from the phone |
| `payload_hash` | bytea | SHA-256 of the canonical payload. The same `op_id` with a different hash is rejected as `op_id_reused` |
| `visible_to_member_id` | uuid null | null = everyone in the trip. Set for **private** ops (a personal budget, an owner-only file) so they aren't pulled by other members ([review S-07](14-pre-development-review.md#15-security-problems)) |
| `result_v` | smallint | version of the `result` shape (lenient parsing on the phone) |
| `type` | text | e.g. `expense.create` ([06 §4](06-syncing.md)) |
| `entity_id` | uuid | |
| `payload` | jsonb | what the phone sent (validated) |
| `result` | jsonb | the canonical rows after applying, which is what other phones store |
| `status` | op_status | `applied` or `rejected` (rejected ops get no seq; see 8.2) |
| `user_id`, `member_id`, `device_id` | uuid | |
| `client_ts` | timestamptz | the phone's clock (informational only) |
| `server_ts` | timestamptz | |

**Index:** `(trip_id, seq)`. **RLS:** select if trip member.

### 8.2 `op_rejections`
Rejected ops don't enter the trip log. They're recorded here so the sender can find out:

`op_id` PK, `trip_id`, `device_id`, `user_id`, `reason_code`, `detail` jsonb, `created_at`.

**RLS:** select own rows.

### 8.3 `trip_balances` (cache)
`(trip_id, member_id)` PK, `balance_minor` bigint, `as_of_seq` bigint.

Updated in the same transaction as each op. Used by the invite preview and notifications. It is always rebuildable from the revisions, and the nightly audit compares the two.

---

## 9. Global tables

| Table | Purpose | Key columns | RLS |
|---|---|---|---|
| `fx_rates` | daily reference rates | PK `(rate_date, source, quote)`, `pivot` char(3), `rate` numeric(24,12), `fetched_at` | select: any authenticated user |
| `pro_subscriptions` | Pro Annual (offered only after 2 trip passes, PRD §15) | `id`, `user_id`, `store`, `store_txn_id` UNIQUE, `starts_at`, `expires_at`, `auto_renew`, `revoked_at` | owner select |
| `consents` | DPDP consent records | `id`, `user_id`, `kind` (`privacy_notice`; more kinds later), `version`, `granted_at`, `withdrawn_at`. Recorded on **Get started** or on joining | owner select/insert |
| `trip_member_secrets` | server-only secrets per member | `member_id` PK, `web_spot_key_hash` (R1b web hand-over), `updated_at` | **none** (server only) |
| `pro_passes` | Pro purchases | `id`, `trip_id`, `user_id`, `store` (play/app_store/grant; `grant` = given by the team, e.g. to beta testers), `store_txn_id` UNIQUE, `price_minor`, `currency`, `purchased_at`, `refunded_at` | select: trip members |
| `notification_outbox` | pushes queued and sent | `id`, `user_id`, `trip_id`, `category`, `dedupe_key` UNIQUE, `payload` jsonb, `send_after`, `sent_at`, `attempts`, `last_error` | none (server only) |
| `reminders` | the 48-hour limit | `id`, `trip_id`, `from_member_id`, `to_member_id`, `sent_at`; index `(trip_id, to_member_id, sent_at)` | none |
| `deletion_requests` | account deletion | `user_id` PK, `requested_at`, `completed_at` | owner select |
| `data_exports` | export files (account export and Pro trip export) | `id`, `user_id`, `kind` (`account`/`trip_csv`/`trip_pdf`), `trip_id` null, `r2_key`, `expires_at` (24 h; the file is deleted by the cleanup job), `created_at` | owner select |
| `rate_limit_buckets` | API rate limits | PK `(bucket_key, window_start)`, `count` int; `bucket_key` = `endpoint:user:<id>`, `endpoint:device:<id>` or `endpoint:ip:<hash>`; rows older than 1 day are deleted by pg_cron | none (server only) |

---

## 10. Local SQLite schema (phone)

**Same table and column names** as Postgres for every trip-scoped table the user can see, so one Drizzle schema in `packages/schema` describes both. The differences are:

| Difference | Why |
|---|---|
| Money is stored as SQLite `INTEGER`. `expo-sqlite` and Drizzle read it as a JS **number**, so **one module, `data/money-codec.ts`**, converts it to `Minor` (branded `bigint`), asserting `≤ Number.MAX_SAFE_INTEGER`. Nothing else touches raw money numbers ([D-028](decisions/D-028-money-in-sqlite.md)) | exact money without runtime type mixing |
| Only the **current** expense revision plus its payers and shares are stored by default; older revisions load on demand | smaller database; history is fetched from the server when opened |
| An extra `local_state` column on mutable rows: `synced` / `pending` / `failed` | drives the sync indicators ([06](06-syncing.md)) |
| No RLS; the database lives in the app sandbox (OS-level encryption at rest). The auth session is stored encrypted, with its key in `expo-secure-store` ([02 §4](02-architecture.md)) | |

**Local-only tables**

| Table | Purpose |
|---|---|
| `outbox` | queued ops: `op_id` PK, `trip_id`, `type`, `entity_id`, `payload` json, `created_at`, `attempts`, `next_attempt_at`, `state` (`queued` / `sending` / `retrying` = network or server error, will retry / `rejected` = the server said no, shown in Unresolved changes), `reject_code`, `last_error` |
| `activity` | a local copy of the trip's op history for the **Trip feed** and "who changed what": `trip_id`, `seq`, `type`, `entity_id`, `actor_member_id`, `summary` json, `server_ts`. Filled from pulls and from `/trip-snapshot` (the last 500 ops); older history loads on scroll |
| `file_cache` | files downloaded for offline use: `attachment_id` PK, `local_uri`, `bytes`, `downloaded_at`, `pinned` (vault documents are pinned, so they're never evicted) |
| `sync_cursors` | `trip_id` PK, `last_seq`, `last_pulled_at` |
| `fx_cache` | a copy of `fx_rates` for the last 30 days plus the dates of existing expenses |
| `file_queue` | attachments waiting to upload: `attachment_id`, `local_uri`, `state`, `wifi_only` |
| `kv` | device ID, feature flags cache, onboarding flags |

---

## 11. Retention and deletion

- **Trips** are kept while any member still has an account. An organiser deleting a trip marks it `deleted_at`, and it disappears for everyone.
- **Account deletion** ([09](09-security.md)):
  - `profiles` and `devices` are erased.
  - Each of the user's member rows gets `user_id = null` and `display_name = "Former member"` (with a number if there are several in one trip), so the member is **anonymised**, and other people's balances still add up (PRD §18). The server writes a `member.anonymised` op so every phone updates.
  - Any attachments the user uploaded to trips that no longer have other members are deleted from R2.
  - The user's **`visibility = owner`** files (e.g. a personal ID in the vault) are **deleted everywhere**, because nobody else can see them anyway.
- **`trip_ops`** is kept for the life of the trip (audit). `notification_outbox` rows are deleted after 30 days.
- **Anonymous users with no trip membership** are deleted after 30 days of inactivity (cleanup job), so they don't count toward the 50k monthly-user limit.
- **Backups** are kept 30 days ([D-027](decisions/D-027-environments-and-backups.md)), so deleted data is gone from backups within 30 days, as promised in [09](09-security.md).
