# 06 · Syncing (Offline-first)

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §5.5, §11, §12 |
| **Related** | [03 Database](03-database-schema.md) · [04 API](04-api-schema.md) · [07 Engine](07-calculation-engine.md) |

This document explains how Toli works without the internet and how every phone ends up with the same numbers.

---

## 1. The idea in one picture

```
 You tap "Save"
      ↓
 ① SQLite on the phone updated instantly   ← the screen reads from here, never waits
      ↓
 ② The change is also added to the OUTBOX (a queue)
      ↓  (whenever there is internet)
 ③ Outbox sends it to the server  →  server checks it, numbers it (seq 41), saves it
      ↓
 ④ Server tells the other phones "trip changed"
      ↓
 ⑤ Other phones PULL everything after the last seq they have, and update their SQLite
```

Three rules:
1. **The phone never waits for the server.** Every read comes from SQLite.
2. **The server decides the order.** Each change gets a trip sequence number (`seq`), and every phone applies changes in `seq` order.
3. **A retry can never create a duplicate.** Every change carries a unique `op_id`. If the server has already seen that ID, it answers "already done".

---

## 2. Words used here

| Word | Meaning |
|---|---|
| **Op (operation)** | One change, such as "create expense" or "record settlement". It has a UUID v7 `op_id`, a `type`, an `entity_id`, a `payload`, a `device_id` and a `client_ts`. |
| **Outbox** | The local SQLite table of ops the server hasn't confirmed yet. |
| **Seq** | The server's per-trip counter: 1, 2, 3 … This is the only order that counts. |
| **Cursor** | The last `seq` a phone has pulled for a trip. |
| **Result** | The final rows the server saved for an op, returned to every phone. |

---

## 3. Step by step

### 3.1 Making a change (offline or online)
1. In **one SQLite transaction**:
   - Write the new state to the local tables, marked `local_state = pending`.
   - Add the op to `outbox`.
2. The engine recalculates the balances locally, and the UI updates right away (well under 100 ms).
3. If the phone is online, the sync engine is woken up. Otherwise nothing more happens until the network returns.

### 3.2 Pushing (sending changes)
- Triggered by: app start, app coming to the foreground, the network coming back, a new outbox entry, or a realtime nudge. There is **no background polling** (PRD §17).
- The phone sends up to **50 ops per trip, oldest first**, to `POST /sync-push` ([04](04-api-schema.md)).
- The server answers per op:

| Server answer | What the phone does |
|---|---|
| `applied` (with `seq` and `result`) | Replace the local rows with `result`, mark them `synced`, delete the op from the outbox. |
| `duplicate` (with the original `seq`) | Same as `applied`. This happens when a retry gets through after the first attempt already worked. |
| `rejected` (with `reason`) | Set the outbox state to `rejected` (with `reject_code`), put the entity back to the server's version, and show the item in **Unresolved changes** (§5). A network or 5xx error never sets `rejected`; it sets `retrying`. |

- **Network error or timeout:** keep the op, retry with backoff (2 s, 4 s, 8 s … up to 5 minutes, with jitter). An op is never dropped.
- **Ops that depend on a rejected op** (an edit or photo of an expense whose create was rejected) are **held back and grouped** with it in one Unresolved item, instead of each failing separately.
- The `sync-push` response also carries **every op after the phone's cursor** (`catch_up`), so a separate pull is rarely needed ([D-026](decisions/D-026-write-path-and-compat.md)).

### 3.3 Pulling (receiving changes)
- The phone reads **`trip_ops` directly through PostgREST**: `GET /rest/v1/trip_ops?trip_id=eq.X&seq=gt.CURSOR&order=seq&limit=500`. RLS limits it to the caller's app-claimed trips and to the ops visible to them. It **costs no Edge Function call**. `POST /sync-pull` stays as a fallback.
- For each op in `seq` order, the phone writes `result` into SQLite and moves the cursor forward. **Unknown fields and values are ignored** (lenient parsing); anything the app can't show becomes "Update the app to see this".
- **Pending local changes on the same entity** are replayed on top of the incoming result (a rebase), so the user still sees their own unsent edit.
- **A new trip on this phone** (after joining, or on a new device) uses `GET /trip-snapshot` instead: all current rows plus `last_seq`. The snapshot is read in **one REPEATABLE READ transaction**, so `last_seq` matches the rows exactly. After that, pulls continue normally.

### 3.4 Realtime nudge
While a trip screen is open, the phone subscribes to the **private** Supabase Realtime channel `trip:{id}`. RLS on `realtime.messages` lets only app-claimed members listen, and **only the server** can broadcast. The server broadcasts `{ seq }` after each applied op, and the phone pulls. **Realtime is only a hint.** If it's missing, the next foreground or network event still catches up.

---

## 4. Op types

| Type | Payload (validated by Zod) | Kind |
|---|---|---|
| `trip.create` | name, dates, base currency, **time_zone** (from the creator's phone), template, organiser display name, the first members | structural |
| `trip.update` | field patch (name, dates, destination, cover, **time_zone**, settle_mode, kitty on/off and threshold, `base_currency` **only while the trip has no expenses**). Budgets use `budget.set`; the kitty holder uses `kitty.handover` | field-LWW |
| `trip.transition` | `to`: planning → active → settling, or `reopen` (organiser). `settled` and `archived` are server-only ([D-023](decisions/D-023-auto-settle-timing.md)) | rule-checked |
| `trip.close` | none. Any claimed member, from Settle up: applies the dust rule and settles if every derived payment is 0 | rule-checked |
| `trip.request_reopen` | optional note. A non-organiser asks; organisers get a push with **Reopen** | structural |
| `member.add` | id, display_name, joined_from | structural |
| `member.update` | field patch (display_name, joined_from) | field-LWW |
| `member.remove` | id | **rejected if the balance ≠ 0**. Sent by an organiser, or by the member themselves ("Leave trip") |
| `member.set_role` | id, role (`organiser` / `member`) | organiser only. Hands over or shares the organiser role; the trip must always keep at least one organiser |
| `member.claim` / `member.release` | through the API, not the outbox ([04](04-api-schema.md)); written to the log as ops | — |
| `expense.create` | full revision (amount, currency, rate, `is_refund`, payers, split_input, items, …) | money, append-only |
| `expense.edit` | `base_revision_id` + patch. The **money group** is replaced as a whole ([D-019](decisions/D-019-money-edit-group.md)) | money, append-only |
| `expense.delete` | `base_revision_id` | money, append-only |
| `settlement.create` / `settlement.void` | from, to, amount (Mark as paid pre-fills the **exact** amount), method, note / id, reason | money, append-only |
| `settlement.confirm` | id. The payee confirms a **pending** web settlement (R1b); only then does it count in balances | money, append-only |
| `kitty.contribute` / `kitty.void` | member, amount / id | money, append-only |
| `kitty.handover` | from_member_id, to_member_id, remaining_minor | money, append-only ([D-022](decisions/D-022-kitty-views-and-handover.md)). By an organiser or the current holder |
| `category.upsert` / `category.delete` | | field-LWW |
| `budget.set` / `budget.delete` | a `trip_budgets` row: scope (total, category or member), amount | field-LWW |
| `recap.update` | `hide_amounts`, `theme` | field-LWW |
| `itinerary.upsert` / `itinerary.move` / `itinerary.delete` | | field-LWW |
| `place.upsert` / `place.delete`, `booking.upsert` / `booking.delete`, `feed.post` / `feed.delete` | | field-LWW |
| `attachment.register` | id, owner, mime, bytes, sha256, display_name, visibility | structural |
| `attachment.delete` | id | by the uploader or an organiser. Soft delete; the R2 object is removed by the cleanup job |

**Ops only the server writes** (never sent by phones; they appear in the log so every phone updates): `member.claim`, `member.release`, `member.anonymised` (account deleted), `trip.pro_activated` / `trip.pro_revoked` (purchase or refund), `trip.transition` to `settled` / `archived` (lifecycle job, [D-023](decisions/D-023-auto-settle-timing.md)), `settlement.create` with `method = rounding` (dust rule, [D-021](decisions/D-021-rounding-adjustment.md)), `attachment.uploaded` (after `/upload-confirm`).

**Private ops:** `budget.set` with scope `member`, and `attachment.register` with `visibility = owner`, are stored with `visible_to_member_id`, so other members never pull them.

---

## 5. Conflict rules (decided before building)

**Summary: last write wins in server order. For money, the whole money group wins together. Money is append-only.** ([D-004](decisions/D-004-conflict-strategy.md), [D-019](decisions/D-019-money-edit-group.md))

| Situation | Rule | What the user sees |
|---|---|---|
| Two phones **create** things | No conflict. UUIDs never collide, and retries are absorbed by `op_id`. | Nothing |
| Two phones edit **non-money fields** (description, category, date, "booked before trip") of the same expense | Field by field. Different fields both survive. | Both changes are kept |
| Two phones edit the **money group** (amount, currency, rate, refund, payers, split mode, split input, kitty-paid, items) | The last money edit received **replaces the whole group**. It's never merged field by field, because the fields depend on each other. | The earlier editor gets a notice: "Rahul changed the amount and split after you". Both versions are in the history |
| Two phones edit the **same non-money field** | The one the server receives last wins. | A quiet notice |
| **Edit vs delete** | Delete wins, and the edit is rejected. | Shown in Unresolved changes: "Neha deleted *Dinner*. Your edit wasn't saved." with **Restore as new expense** |
| **Remove a member** who still has a balance | Rejected by the server. | "Settle Jay's ₹1,200 or move his expenses first" |
| **Any change that would give a removed member a balance** (editing or deleting an old expense, voiding a settlement) | Rejected: `removed_member_balance` ([D-030](decisions/D-030-removed-members-locked.md)) | "This changes Jay's balance. Add Jay back first." |
| **Void a settlement** twice | The second is a no-op. | Nothing |
| **Duplicate expense**: same amount and currency, `spent_at` within **10 minutes** (trip time zone), created by a **different member** (PRD F3). Compared on `spent_at`, **not** on server time, so offline duplicates are caught | Not a conflict. **On save** (the other entry is already on this phone), the sheet "Already logged?" offers **Same one, skip** / **Save anyway**. **On pull** (both saved offline), the later creator sees **Same one, delete mine** / **Keep both**. | as described |
| **Duplicate settlement**: same payer → payee, same amount, recorded within 24 hours by two different people | Not a conflict. Both are saved, and the later recorder is asked **"Already recorded?"** → **Same one, remove mine** (voids it) / **Keep both** | as described |
| **Changes to a settled trip** | **Allowed:** feed posts (photos, notes), `recap.update`, claiming a ghost, `settlement.void` (which moves the trip back to `settling`), `trip.request_reopen`, and `trip.transition` `reopen` by an organiser. **Everything else is rejected** (`trip_settled`) until the trip is reopened (logged). **This is the one allow-list. Other docs link here** | "This trip is settled. Reopen to edit." / **Request reopen** |
| Phone clock is wrong | Ignored. Only the server `seq` decides order; `client_ts` is shown for information only. | Nothing |

**Nothing is ever silently lost.** Every rejected op lands in Unresolved changes with a way forward.

---

## 6. What the server checks on every push

Inside `sync-push` ([D-026](decisions/D-026-write-path-and-compat.md)):
1. **Version:** the `Toli-Client` header is at or above the minimum client version, otherwise `426 upgrade_required`.
2. **Auth:** the user is an **app-claimed** member of the trip (or it's `trip.create` for a new trip ID). Web-claimed sessions can't push.
3. **Idempotency:** if `op_id` is already in `trip_ops` with the **same `payload_hash`**, return `duplicate`. With a **different** hash, reject as `op_id_reused` and report it to Sentry.
4. **Schema:** strict Zod validation of the payload (unknown fields are rejected **on the server**).
5. **Load:** read the trip state at `last_seq = N`.
6. **Rules:** the op is allowed in the trip's status (§5 allow-list), the sender has permission (the [permission matrix](09-security.md#permission-matrix)), the base revision exists, split inputs are valid, no removed member's balance changes, and the member limit holds.
7. **Maths:** `@toli/engine` recomputes shares and payer amounts from `split_input`. It checks `Σ payers = Σ shares = base_amount ≥ 1` (per-op zero-sum).
   - If the phone's shares **don't add up**, reject with `split_mismatch`.
   - If they add up but **differ** from the server's (an older engine), the **server's result wins**: it's sent back as `result`, the phone shows it, and the difference goes to Sentry.
8. **Commit:** call `apply_ops(trip_id, expected_seq = N, ops)`. The function locks the trip, **returns `stale` if `last_seq ≠ N`**, re-checks the state-dependent rules, inserts everything and bumps `seq`, all in one transaction. On `stale`, go back to step 5 (max 3 tries).
9. **After commit:** Realtime broadcast, queue notifications (sent from the same request), and return the results plus `catch_up` ops.

---

## 7. What the user sees (sync status)

| State | Where | Look |
|---|---|---|
| **Synced** | nothing shown (the normal case) | — |
| **Syncing** | pill at the bottom: "Syncing Goa Weekend · 3 changes" | spinner pill (UI reference: skeleton loading) |
| **Pending / Offline** | banner on trip home: "**Offline.** 2 changes saved on this phone. They sync when you're back." Status bar shows OFFLINE | muted dot banner |
| **Pending row** | the new expense row's subtitle: "SAVED ON PHONE · WILL SYNC" | lime mono label |
| **Failed** | a badge on the trip, plus the **Unresolved changes** list | clear text and one action per item |

---

## 8. Special cases

| Case | Behaviour |
|---|---|
| **App killed mid-save** | The SQLite transaction is atomic, so the expense and its outbox op are either both saved or both absent. |
| **App killed mid-push** | The op stays in the outbox. On retry the server answers `duplicate` if it already applied it. |
| **Partial pull** (network drops) | The cursor only advances after each op is written, so the pull resumes where it stopped. |
| **Long offline trip** (a week, hundreds of ops) | The outbox drains in batches of 50. Balances stay correct locally the whole time. |
| **New phone / reinstall** | **I already have an account** ([screens/sign-in](screens/sign-in.md)), then a snapshot of each trip, then continue. The anonymous-account risk is in [features/auth](features/auth-and-identity.md). |
| **Sign out with unsynced changes** | Blocked: "3 changes aren't synced yet. Connect to the internet first." |
| **Old app version** | The server accepts older payload versions (`payload.v`) for 2 releases, and the phone parses server data **leniently**. Below the minimum client version, the server answers `426` and the app shows **Update Toli**. Queued outbox ops are migrated to the new payload version when the app upgrades. Migrations follow expand → migrate → contract. |
| **Server rejects everything** (bug) | Ops stay in the outbox. The app shows a "Can't sync — we're on it" banner, and the error goes to Sentry. Local data is never deleted. |
| **Trip with 2,000 expenses** | Pull is paged at 500 per request. The snapshot is compressed. The local recompute takes ≤ 50 ms (PRD §17). |

---

## 9. Proving it works (tests)

- **Deterministic simulator** (in CI): N fake phones, random network partitions, random op orders, including edits and deletes of the same expense. Each run checks that every phone ends with the same rows and the same balances (PRD fixture A.2 #7).
- **Idempotency test:** every op is sent 1–3 times at random, and nothing is duplicated.
- **Kill test:** the app is killed at random points in the save and push steps. No data loss, no duplicates.
- **Race test:** two phones send conflicting ops at the same moment (remove Jay / add an expense with Jay; two money edits). The `stale` retry must keep every rule and invariant.
- **Offline duplicates:** two devices log the same dinner offline and sync 3 hours apart, and the pull prompt appears. The same for a settlement recorded by both payer and payee.
- **Compatibility:** the previous 2 app versions sync against the new server, and unknown enum values don't crash the phone.
- Details are in [11 Testing](11-testing-strategy.md).
