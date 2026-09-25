# Feature · Offline and sync (what the user sees)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **PRD refs** | [§12][prd] (offline and sync, conflict rules, "unresolved changes" view), §5 principle 5 ("offline is the default"), §11.7 (convergence), §17 (offline, reliability, battery), §19 (`sync_conflict`, `expense_added.offline?`) |
| **Related** | Screens: [trip-home](../screens/trip-home.md) · [skeleton-loading](../screens/skeleton-loading.md) · [unresolved-changes](../screens/unresolved-changes.md) · [trips-list](../screens/trips-list.md) · [splash](../screens/splash.md) — Docs: **[06 Syncing][sync] (the technical source; this doc is the user-facing view)** · [03 §8, §10][db] · [04 §2][api] · [02 §2, §5][arch] — Decisions: [D-002][d002] · [D-004][d004] · [D-011][d011] · [D-014][d014] — Features: [expenses](expenses.md) · [auth-and-identity](auth-and-identity.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Write path:** `sync-push` → `apply_ops` with an expected `last_seq`, and a `stale` retry ([D-026](../decisions/D-026-write-path-and-compat.md)).
> - **Pulls** read `trip_ops` directly through **PostgREST** (RLS), and `sync-push` returns `catch_up` ops. `/sync-pull` is only a fallback.
> - **Conflicts:** the money group wins as a whole ([D-019](../decisions/D-019-money-edit-group.md)). Duplicates are compared on **`spent_at`** ±10 min. Duplicate settlements get a prompt. Removed members are locked at 0.
> - **Compatibility:** lenient parsing on the phone, a minimum client version (`426`), and migrations that follow expand → migrate → contract.
> - **Money on the phone:** INTEGER + one codec ([D-028](../decisions/D-028-money-in-sqlite.md)).
> - Sign-out is blocked while the outbox isn't empty. A new phone uses [screens/sign-in](../screens/sign-in.md).

## 1. Purpose

Makes Toli work the same with or without signal, and tells people **just enough** about syncing: nothing when all is well, a calm note when they're offline, and a clear way forward when something couldn't be saved. How sync works inside is in [06][sync]; this doc is what the user sees and the rules the UI follows.

## 2. User problem

Trips happen on hill roads, flights, foreign SIMs and in restaurant basements. If the app spins, blocks or silently loses an expense there, the group stops trusting it.

## 3. Business goal

- **Reliability:** zero data loss on force-quit; every read and write works with no network (PRD §17).
- **Trust (G5):** nothing is ever silently lost; every rejected change has a visible way forward (PRD §12).

## 4. User flow

1. **Offline:** the user adds an expense as normal. It appears at once, with "SAVED ON PHONE · WILL SYNC" under it. Trip home shows a small banner: "**Offline.** 2 changes saved on this phone. They sync when you're back." The status bar area shows "OFFLINE".
2. **Back online:** a pill appears at the bottom: "Syncing Goa Weekend · 3 changes" with a spinner. When it's done, the pill and the row labels disappear.
3. **Someone else changed something:** numbers update in place (they count to the new value).
4. **A change couldn't be saved:** the trip shows a badge; the trip menu has **Unresolved changes (1)**. Each item says what happened in plain words and offers one action, e.g. "Neha deleted *Dinner*. Your edit wasn't saved." → **Restore as new expense**.

## 5. Requirements

| ID | Requirement | Level | Source |
|---|---|---|---|
| OS-1 | Every read and write works offline; the UI never waits on the network. | MUST | PRD §12, §17 |
| OS-2 | Every change writes locally and to an outbox in one transaction; zero loss on force-quit. | MUST | PRD §12, §17, [06 §3.1][sync] |
| OS-3 | Sync resumes automatically on app start, foreground, network return, new outbox entry, or realtime nudge. No background polling. | MUST | PRD §17, [06 §3.2][sync] |
| OS-4 | Show sync state with five statuses: Synced, Syncing, Pending, Offline, Failed. | MUST | [06 §7][sync] |
| OS-5 | Anything discarded or rejected appears in **Unresolved changes** with a way forward. Nothing is silently lost. | MUST | PRD §12, [06 §5][sync] |
| OS-6 | The earlier editor in a same-field conflict gets a quiet notice. | SHOULD | [06 §5][sync] |
| OS-7 | Duplicate detection also runs after pulling. | MUST | PRD §12, F3 |
| OS-8 | Receipt photo uploads wait for Wi-Fi by default, user-overridable. A receipt **scan** (Pro) uploads immediately, because the user asked for it. | MUST | PRD §17, OQ-P17 in [01](../01-overview.md#open-questions) |
| OS-9 | Balances are identical on every phone after the same ops. | MUST | PRD §11.7 |

## 6. Business rules

### 6.1 The five statuses ([06 §7][sync])

| Status | When | Where it shows | Look |
|---|---|---|---|
| **Synced** | outbox empty for this trip, last push/pull ok | nowhere (normal case) | — |
| **Syncing** | a push or pull is running | pill at the bottom: "Syncing Goa Weekend · 3 changes" | `SyncPill` (spinner, light pill) |
| **Pending** | ops in the outbox, online, not yet sent (or retrying with backoff) | the row: "SAVED ON PHONE · WILL SYNC" | lime mono label |
| **Offline** | no network, ops waiting | trip home banner: "Offline. 2 changes saved on this phone. They sync when you're back." + "OFFLINE" in the status bar | muted dot `Banner` |
| **Failed** | the server rejected an op | badge on the trip card and trip header + **Unresolved changes** list | clear text, one action each |

Rules:
- Don't show "Syncing" for less than ~500 ms (avoid flicker); proposed.
- Row labels come from the local `local_state` column (`synced` / `pending` / `failed`) ([03 §10][db]).
- Counts in the banner and pill are the number of outbox ops for that trip.
- Never show a spinner that blocks input.

### 6.2 Unresolved changes
Each rejected op ([04 §2.1][api] reject codes) becomes one item:

| Reason | Message | Action |
|---|---|---|
| `entity_deleted` (edit vs delete) | "Neha deleted *Dinner*. Your edit wasn't saved." | **Restore as new expense** / **OK** |
| `balance_not_zero` (remove member) | "Settle Jay's ₹1,200 or move his expenses first." | **Settle up** / **OK** |
| `trip_settled` (money and member ops; feed posts and `recap.update` are still allowed) | "This trip is settled. Reopen to edit." | **Reopen** (organiser) / **OK** |
| `not_organiser` | "Only an organiser can do this." | **OK** |
| `member_limit` | "Trips can have up to 50 people." | **OK** |
| `attachment_limit` | "An expense can have up to 5 photos." | **OK** |
| `not_a_member` | "You're no longer on this trip, so these changes weren't saved." (e.g. after a release) | **Join again** / **Copy details** |
| `split_mismatch` | "This split didn't add up, so it wasn't saved." | **Fix split** |
| `base_revision_missing` | "This expense changed while you were offline. Check it and try again." | **Open expense** |
| `invalid_payload` | "Something about this change was wrong, so it wasn't saved." | **Copy details** / **OK** |
| `upgrade_required` | "Update Toli to sync these changes." | **Update** |

- The rejected entity is put back to the server's version locally ([06 §3.2][sync]); the user's version lives in the item until they act or dismiss it.
- Dismissing keeps a record in history (proposed), so "OK" is never data loss without a trace.
- Same-field conflicts are **not** rejections. The earlier editor gets a quiet toast or feed line: "Rahul changed the amount to ₹1,300 after you."
- Duplicates (same amount, created within 10 minutes, by a different member) are **not** conflicts ([06 §5][sync], [expenses](expenses.md)). **On save**, the "Already logged?" sheet offers **Same one, skip** / **Save anyway**. **On pull** (both saved offline), the later creator sees **Same one, delete mine** / **Keep both**.

### 6.3 Server trouble
If the server rejects everything or is down: banner "**Can't sync — we're on it.** Your changes are safe on this phone." Ops stay in the outbox; local data is never deleted ([06 §8][sync]).

### 6.4 What needs a connection
These are the only things that don't work offline, and each says so plainly:
- Joining a trip, claiming or releasing a spot, creating an invite the first time.
- Opening a UPI link (the server builds it), sending a reminder, sending settle-up stubs (the hold button shows "Needs internet"; **Mark as paid** still works offline).
- Linking an account, signing in.
- Place search, receipt scan (Pro), downloading a vault file the first time, feed history older than the last 500 ops, and older revisions of an expense.

## 7. Data model

Local SQLite only ([03 §10][db]):

| Table / column | Use |
|---|---|
| `local_state` on mutable rows | `synced` / `pending` / `failed` → row labels |
| `outbox` | `op_id`, `trip_id`, `type`, `entity_id`, `payload`, `created_at`, `attempts`, `next_attempt_at`, `state` (`queued` / `sending` / `retrying` = network or server error / `rejected` = the server said no), `reject_code`, `last_error` → counts; `rejected` rows are the Unresolved items and stay until the user acts |
| `activity` | local op history (Trip feed, "who changed what"); the snapshot brings the last 500 ops, older ones load on scroll via `/trip-activity` |
| `file_cache` | downloaded files for offline use; pinned vault documents are never evicted |
| `sync_cursors` | `trip_id`, `last_seq`, `last_pulled_at` → "last synced" in trip settings |
| `file_queue` | `attachment_id`, `local_uri`, `state`, `wifi_only` → photo upload indicators |

Only the **current** expense revision is stored locally; older revisions load on demand ([03 §10][db]).

Server: `trip_ops`, `op_rejections` (the sender finds out why), `trip_balances`.

## 8. API requirements

| Endpoint | Source | UI effect |
|---|---|---|
| `POST /sync-push` | [04 §2.1][api] | Syncing pill; per-op `applied` / `duplicate` → Synced; `rejected` → Failed |
| `POST /sync-pull` | [04 §2.2][api] | numbers update; duplicate check on new expenses |
| `GET /trip-snapshot` | [04 §2.3][api] | skeleton loading on a new phone / after joining |
| `GET /trip-activity` | [04 §2.3][api] | older feed history while scrolling back |
| Realtime `trip:{id}` | [06 §3.4][sync] | only a hint to pull |
| `426 upgrade_required` | [04 §1][api] | "Update Toli" item/banner |

Op types that can end up in Unresolved changes: every money op, member ops (`member.add`, `member.remove`, `member.set_role`), `trip.transition` ([06 §4][sync]).

## 9. UI requirements

| Element | Spec |
|---|---|
| Offline banner ([trip-home](../screens/trip-home.md)) | `Banner` on `bg.raised`, radius 16, 8 px muted dot, "**Offline.** N changes saved on this phone. They sync when you're back." |
| Status bar label | "OFFLINE" in mono where the network indicator would be (as in the prototype) |
| Pending row label | "SAVED ON PHONE · WILL SYNC", lime mono 11 |
| `SyncPill` ([skeleton-loading](../screens/skeleton-loading.md)) | light pill, 14 px spinner, "Syncing {trip} · N changes", 40 px from the bottom |
| Failed badge | small badge with count on the trip card and trip header |
| [unresolved-changes](../screens/unresolved-changes.md) | list of items: what happened (one sentence), when, the user's version (expand), one primary action, **OK** |
| Skeleton | shimmer rows while a snapshot loads; the splash never waits on the network |

## 10. States

Synced · Syncing · Pending · Offline · Failed (§6.1), plus:
- **Server trouble** (§6.3),
- **Not signed in yet** (first open offline): behaves as Offline; ops wait for the anonymous session ([auth-and-identity](auth-and-identity.md)),
- **Snapshot loading**: skeleton.

## 11. Edge cases ([06 §8][sync])

- **Killed mid-save:** the expense and its op are both saved or both absent.
- **Killed mid-push:** the op stays; the server answers `duplicate` on retry; the UI shows Synced.
- **Partial pull:** the cursor advances per op; the next pull resumes.
- **A week offline, hundreds of ops:** drains in batches of 50; balances correct locally the whole time; the pill shows the remaining count.
- **Clock wrong on the phone:** ignored for ordering; `client_ts` is display-only.
- **Pending local edit and an incoming change to the same expense:** the local edit is replayed on top (rebase), so the user still sees their unsent edit.
- **Released or removed from a trip while offline:** everything pending for that trip fails with `not_a_member`; the trip leaves the list after the user reviews the items (proposed).
- **Trip deleted by the organiser while offline:** same as above with "Aditya deleted this trip."
- **Old app version:** the server accepts old payloads for 2 releases; after that `upgrade_required`.
- **Two thousand expenses:** pulls page at 500; snapshot is compressed.
- **Airplane mode toggled rapidly:** backoff with jitter prevents a burst of requests.

## 12. Permissions

| Action | Organiser | Member | Ghost | Web viewer |
|---|---|---|---|---|
| Work offline | ✓ | ✓ | — | — (web needs a connection) |
| See own Unresolved changes | ✓ | ✓ | — | — |
| **Reopen** from a `trip_settled` item | ✓ | — | — | — |
| Restore a deleted expense as new | ✓ | ✓ | — | — |

Unresolved changes are per device: each phone sees only its own rejected ops.

## 13. Offline behaviour

This whole doc. In short: everything local works; the few network-only actions are listed in §6.4 and each explains itself.

## 14. Sync behaviour

See [06][sync]. User-visible consequences:
- **Last write wins per field, in server order** ([D-004][d004]). Different fields both survive.
- **Delete beats edit.**
- **Money is append-only**, so history always shows who changed what.
- **The server decides** shares if the phone's maths differs (old app); the row quietly updates.

## 15. Analytics

| Event (PRD §19) | Properties |
|---|---|
| `sync_conflict` | `type` (edit_edit, edit_delete, remove_member, settled, duplicate), `resolution` (restored, dismissed, fixed, auto) |
| `expense_added` | `offline?` |

Proposed, not in §19: `sync_backlog` (max outbox size and hours offline per trip, sampled), `unresolved_opened`.

## 16. Error handling

- Network errors and timeouts: never shown as errors; the op waits and retries with backoff (2 s, 4 s, 8 s … up to 5 min, jitter).
- Server rejections: Unresolved changes (§6.2).
- Server-wide failure: "Can't sync — we're on it." banner; Sentry report.
- Local database error (disk full): "Your phone is out of space. Free some up so Toli can save." Never pretend a save worked.

## 17. Testing

- **Deterministic simulator** in CI ([06 §9][sync]): N phones, random partitions and op orders, edits and deletes of the same expense → identical rows and balances (fixture G8).
- **Idempotency:** each op sent 1–3 times → no duplicates.
- **Kill tests:** random kills during save and push → no loss, no duplicates.
- **UI state tests:** each status appears in the right place with the right copy; every reject code maps to an item with an action.
- **Real-world drills:** airplane mode on a trip for a day; flaky 2G (network link conditioner); switching SIMs.
- **Battery/data:** no background polling; no network on the cold-start path.

## 18. Future considerations

- Background sync via push-triggered wakeups when the app is closed (still no polling).
- "Last synced 3 min ago" per trip in settings.
- Offline map tiles for the plan ([itinerary-and-places](itinerary-and-places.md)).

## 19. Open questions

1. ~~Where do Unresolved items live?~~ Resolved: rejected ops stay in `outbox` with `state = rejected` and `reject_code` ([03 §10][db]).
2. ~~Duplicate prompt on pull~~: resolved as a sheet ("Same one, delete mine" / "Keep both") ([06 §5][sync]).
3. **Dismissed items:** keep a trace in history, or drop them?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[d002]: ../decisions/D-002-offline-first.md
[d004]: ../decisions/D-004-conflict-strategy.md
[d011]: ../decisions/D-011-server-writes.md
[d014]: ../decisions/D-014-ids-and-wire-money.md
