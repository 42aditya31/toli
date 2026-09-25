# Feature · Members and ghosts

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a**. The limited web membership (browser claims) arrives in **R1b** ([D-018][d018], [D-024][d024]) |
| **PRD refs** | [F2][prd] (ghosts, `joined_from`, 50 members), §8 (Member, lifecycle rules), §5 principle 3 ("never block on someone else installing"), §17 (scale), §18 (deletion anonymises) |
| **Related** | Screens: [members](../screens/members.md) · [create-trip](../screens/create-trip.md) · [trip-home](../screens/trip-home.md) · [join-in-app](../screens/join-in-app.md) · [split-editor](../screens/split-editor.md) · [trip-settings](../screens/trip-settings.md) — Docs: [03 §4.2 `trip_members`, §11][db] · [04 §3.4 `/join`, §3.5 `/member-release`][api] · [06 §4–5][sync] · [07 §5][engine] · [09 §2.3 permission matrix][perm] — Decisions: [D-007][d007] · [D-016][d016] · [D-025][d025] · [D-030][d030] · [D-031][d031] — Features: [invites-and-joining](invites-and-joining.md) · [auth-and-identity](auth-and-identity.md) |

---

## 1. Purpose

Lets the organiser put everyone on the trip **by name alone**, long before they install anything. A name with no account is a **ghost**. Ghosts pay, owe, get split into expenses and appear in settle-up exactly like real users. Later, a friend **claims** their ghost, and all history is theirs, with no recalculation.

This doc also covers late joiners (`joined_from`), renaming, removing, leaving, the 50-member limit and **releasing** a claim.

## 2. User problem

- "Nobody else has the app yet, but we're already spending."
- "Jay joined on day two, so why is he paying for the first night?"
- "Rahul reinstalled the app and now he can't get back to his spot."

## 3. Business goal

- **Cold start:** one installed user makes the trip fully useful (PRD §21 risk "the app is useless alone").
- **Virality:** every ghost is a future install (invite acceptance ≥ 55%, k-factor ≥ 2.5).

## 4. User flow

**Add people**
1. On create-trip or the members screen, type a name → **+**. A ghost chip appears (dashed border, "ghost").
2. Optional: **Add from contacts**. It copies the **name only**. No phone number or hash is stored ([D-025][d025]).
3. If the trip is already running, the app asks **"Joining from?"** with today as the default. This sets `joined_from`.

**Claim (the friend's side, summary)**
1. The friend opens the invite link or types the code ([invites-and-joining](invites-and-joining.md)).
2. In the app: "Which one are you?" → taps **Neha**.
3. `/join` links Neha's ghost to their account. Neha's history, balance and settle-up lines are now theirs.
4. No approval is needed. The organiser is notified ("Neha claimed her spot") and can **Release** a wrong claim (OQ-P14).

In R1a the web page is read-only, so claims happen **only in the app**. From R1b a browser can claim a **limited web membership** that can only pay its own debt ([D-024][d024]).

**Rename**
1. Members screen → tap a member → **Rename** → save. Everyone sees the new name.

**Remove**
1. Members screen → member → **Remove from trip**.
2. If their balance is 0: confirm, and they're removed.
3. If not: "Jay still owes ₹1,200. Settle it or move his expenses first." with links to Settle up and to his expenses.

**Leave**
1. Trip settings → **Leave trip**. Allowed when your own balance is 0 (and you're not the last organiser).

**Release a claim (organiser)**
1. Rahul says "I reinstalled and lost my spot."
2. Organiser → members → Rahul → **Release spot** → confirm ("Rahul's spot becomes a ghost again. His history stays. He can claim it from the invite link.").
3. Rahul joins again with the code and picks "Rahul".

## 5. Requirements

| ID | Requirement | Level | Release | PRD |
|---|---|---|---|---|
| MG-1 | Add a member **by name alone**, creating a ghost. No phone, email or invite needed. | MUST | R1a | F2 |
| MG-2 | Add from the phone's contacts (with permission). It copies **names only**; no phone number or hash is stored. Adding by phone number and matching people already on Toli are **out of v1** ([D-025][d025]). | MUST | R1a | F2 (changed by PRD v1.1 #10) |
| MG-3 | Ghosts appear in every split, hold balances and appear in settle-up **identically** to claimed members. | MUST | R1a | F2 |
| MG-4 | A user can claim a specific ghost on joining, transferring all history **without recomputation**. | MUST | R1a (in the app) | F2 |
| MG-5 | Each member has a `joined_from` date. New expenses default to participants who had joined by the expense date. Overridable per expense. | MUST | R1a | F2 |
| MG-6 | Support up to **50 members** per trip (design target 4–12). | MUST | R1a | F2, §17 |
| MG-7 | A member with a non-zero balance can't be removed or leave. The UI **explains why** and offers the way forward. | MUST | R1a | §8 |
| MG-8 | **Once removed, a member's balance can never change.** Any op that would change it is rejected ([D-030][d030]). | MUST | R1a | §8 (PRD v1.1 #12) |
| MG-9 | A ghost can be claimed at any time, including after settlement. | MUST | R1a | §8 |
| MG-10 | The organiser can **release** a claimed member back to a ghost, keeping all history. | MUST | R1a | [D-007][d007], [D-016][d016] |
| MG-11 | Members can be renamed; names are unique within the trip, case-insensitive. | SHOULD | R1a | [03 §4.2][db] |
| MG-12 | Each member row shows whether they're on Toli: "Ghost · not on Toli yet" / "On Toli". | SHOULD | R1a | UI reference |
| MG-13 | Browser claims create a **limited web membership** (`claimed_via = 'web'`); the organiser is notified of each one and can Release it, including several at once. | MUST | R1b | [D-024][d024] |

## 6. Business rules

- **Ghost = `user_id IS NULL`.** Claiming only sets `user_id`, `claimed_at` and `claimed_via` on the **same** member row. The member ID never changes, so every share, payment and settlement stays attached without any maths running again.
- **App claims vs web claims:** `claimed_via = 'app'` is a full member. `claimed_via = 'web'` (R1b) is a limited membership that can't read the trip, push ops or download files ([03 §4.2][db], [D-024][d024]).
- **One member per user per trip** (unique `(trip_id, user_id)`).
- **Names:** 1–30 characters, trimmed, unique within the trip among non-removed members, case-insensitive ("neha" and "Neha" clash). A local clash shows "There's already a Neha. Try 'Neha K'."
- **Same name added offline on two phones:** the second one becomes "Neha 2", and both people are told (OQ-P21).
- **`joined_from`:**
  - null = here from the start.
  - When set, the default participant set for an expense includes a member only if `joined_from ≤ date(spent_at)`, using the trip's time zone ([03 §4.1][db]).
  - It only changes **defaults** for new expenses. It never changes existing expenses. The user can always tick the member in manually.
- **Removal (`member.remove`):** allowed only when the member's balance is exactly 0 ([06 §5][sync]). Sets `removed_at`. The member disappears from default participants, pickers and settle-up, but stays in history ("Jay (left)"). Removed members free their name for reuse.
- **Removed members are locked at 0** ([D-030][d030]): the server rejects any later op that would give them a balance (editing or deleting an old expense they were in, voiding a settlement) with `removed_member_balance`: "This changes Jay's balance. Add Jay back first." In the [split editor](../screens/split-editor.md) they appear greyed out as **Removed** and can't be edited.
- **Leaving** is `member.remove` sent by the member themselves, with the same zero-balance rule.
- **Last organiser:** can't leave or be removed without first handing the role to someone else (`member.set_role`) ([D-030][d030]).
- **Reassigning expenses** is how you get a balance to 0 without settling: edit each expense to take the member out (a normal `expense.edit`). There's no bulk "reassign" op in v1.
- **Release (`member.release`):** sets `user_id` back to null. The released person's phone loses access to the trip (next sync returns `not_a_member`); any of their unsent ops are rejected and shown in [Unresolved changes](offline-and-sync.md). The organiser can't release their own spot.
- **Roles:** the creator is `organiser`; everyone else is `member`. An organiser can hand over or share the role with `member.set_role`; the trip always keeps at least one organiser. If no organiser is active for 30 days, the longest-standing member is offered the role (OQ-P20; flagged by the `lifecycle` job, [04 §10.1][api]).
- **Limit:** 50 members, counting non-removed members (ghosts included). The server rejects more with `member_limit`; the limit lives in `packages/config`.
- **Account deletion** ([03 §11][db]): `user_id` becomes null, `display_name` becomes "Former member" (numbered if there are several in one trip), and the server writes a `member.anonymised` op. A "Former member" spot **can't be claimed** by anyone (OQ-P21).

## 7. Data model

| Table | Columns |
|---|---|
| `trip_members` ([03 §4.2][db]) | `id`, `trip_id`, `user_id` (null = ghost), `display_name`, `role`, `joined_from`, `claimed_at`, `claimed_via` (`app` / `web`), `last_active_at`, `removed_at`, `last_seq`, `created_by_user`, `created_at`, `updated_at` |
| `trip_member_secrets` | server-only (the R1b web spot key); members can't read it |
| `member_profiles` view | avatar for claimed members (`display_name`, `avatar_key` from `profiles`) |
| `trip_balances` | used by the removal check |
| `trip_ops` | `member.add`, `member.update`, `member.remove`, `member.set_role`; server-only: `member.claim`, `member.release`, `member.anonymised` |

**Contacts:** "Add from contacts" copies the display name into `member.add`. No phone number, contact hash or match is stored or sent ([D-025][d025]).

## 8. API requirements

| Op / endpoint | Source | Notes |
|---|---|---|
| `member.add` | [06 §4][sync] | `id`, `display_name`, `joined_from`. Structural. |
| `member.update` | [06 §4][sync] | field patch: `display_name`, `joined_from`. Last write wins per field. |
| `member.remove` | [06 §4][sync] | **Rejected if balance ≠ 0** (`balance_not_zero`). Sent by an organiser, or by the member themselves (Leave). |
| `member.set_role` | [06 §4][sync] | `id`, `role`. The trip must keep ≥ 1 organiser. |
| `POST /join` | [04 §3.4][api] | Joins and optionally claims (`claim_member_id`). First claim wins, then `already_claimed`. Writes `member.claim`. `via: "web"` only in R1b. |
| `POST /member-release` | [04 §3.5][api] | `{ trip_id, member_id }`. Writes `member.release`. |
| `trip.create` | [06 §4][sync] | carries the first members |

`member.claim`, `member.release` and `member.anonymised` are written only by the server; claim and release go through the API, not the outbox, so they need a connection.

## 9. UI requirements

| Screen | Needs |
|---|---|
| [create-trip](../screens/create-trip.md) | "Who's coming · N people"; chips with avatar initial, name and "organiser"/"ghost"; ghosts have a **dashed** border; "Add by name" + lime **+**; Enter adds; helper: "Nobody needs the app yet. Ghost members hold balances and can claim their spot from the invite link later." |
| [members](../screens/members.md) | List of members with avatar, name, status ("Ghost · not on Toli yet" / "On Toli" / "Joined from Sun 13 Oct" / "Left"), balance; actions: Rename, Joining from, Remove, Release spot, Make organiser, **Add from contacts** (names only), Invite. Counter "12 of 50". Actions the user can't do are hidden. |
| [trip-settings](../screens/trip-settings.md) | **Leave trip** (own balance 0; not the last organiser) |
| [trip-home](../screens/trip-home.md) | Balance rows use the same status subtitle. The current user is "Aditya (you)". |
| [split-editor](../screens/split-editor.md) | Members who hadn't joined by the expense date are unticked by default, with a small "joined later" hint. Removed members on old expenses are greyed out as **Removed** and can't be changed. |
| [join-in-app](../screens/join-in-app.md) | "Which one are you?" shows unclaimed ghosts; claimed ones show "On Toli" and can't be picked; "Former member" spots aren't listed. |

## 10. States

| Member state | How it's stored | Shown as |
|---|---|---|
| Ghost | `user_id` null, `removed_at` null | dashed chip, "Ghost · not on Toli yet" |
| Claimed (app) | `user_id` set, `claimed_via = app` | solid chip, "On Toli", avatar if set |
| Web-claimed (R1b) | `user_id` set, `claimed_via = web` | "On the web page" (proposed); organiser can Release |
| Late joiner | `joined_from` set | "Joined from Sun 13 Oct" |
| Removed / left | `removed_at` set | "Jay (left)" in history; greyed **Removed** in the split editor |
| Released | back to ghost; `member.release` in the log | ghost again; feed line "Aditya released Rahul's spot" |
| Anonymised (account deleted) | `user_id` null, `display_name` "Former member" | "Former member" (numbered if several); not claimable |
| Pending (local) | `local_state = pending` | normal, with the sync indicator |

## 11. Edge cases

- **Two phones add "Neha" offline:** the second becomes "Neha 2", and both phones are told (OQ-P21). Anyone can rename or merge by hand later.
- **Claim the wrong ghost:** the organiser releases it, and the person claims the right one. History is untouched.
- **Two people claim the same ghost at the same moment:** first wins; the second gets `already_claimed` → "Neha's spot was just claimed. If that wasn't you, ask Aditya to release it."
- **Remove a member who holds the kitty cash:** blocked while the kitty is on. Hand the kitty over first ([kitty](kitty.md), `kitty.handover`).
- **Remove Jay, then someone deletes an old expense Jay was in:** rejected with `removed_member_balance` ("This changes Jay's balance. Add Jay back first."), shown in Unresolved changes ([07 §14 G14][engine]).
- **Remove Jay while another phone is offline adding an expense with Jay:** the server applies whichever arrives first; the second is rejected (`balance_not_zero` or `removed_member_balance`) and shown in Unresolved changes. The `stale` retry makes sure the check sees the latest state ([06 §6][sync]).
- **Late joiner is also the payer** of an expense before their `joined_from`: allowed. Payers don't have to be participants.
- **Organiser loses their own account** (reinstall without saving): a co-organiser can release the spot. Organisers are nudged to "Save my account" when they invite anyone; after 30 days with no active organiser, the longest-standing member is offered the role (OQ-P20).
- **Last organiser tries to leave or demote themselves:** blocked: "Make someone else an organiser first."
- **51st member:** the add button is disabled with "Trips can have up to 50 people." The server also rejects it (`member_limit`).
- **Rename a claimed member:** the trip name (`trip_members.display_name`) changes for this trip only; the user's profile name is separate.
- **Settled trip:** adding or removing members is rejected (`trip_settled`), but claiming still works ([06 §5 allow-list][sync]).

## 12. Permissions

Who can add ghosts, rename (ghosts, yourself, other claimed members), set `joined_from`, remove, leave, release and change roles is defined **only** in the [permission matrix, 09 §2.3][perm] ([D-031][d031]). In short: any member adds and renames ghosts and sets their own `joined_from`; organisers rename other claimed members, set anyone's `joined_from`, remove, release and change roles. A ghost can't do anything itself: others act for it.

## 13. Offline behaviour

- Add, rename, set `joined_from`, remove and leave are queued ops and work offline. The balance check runs locally first, and again on the server.
- Claim and release need a connection (API calls). Offline: "You need a connection to claim your spot."
- The contacts picker works offline (it only reads names on the device).

## 14. Sync behaviour

- `member.add` / `member.update` are last write wins per field. `member.set_role` is checked by the server (≥ 1 organiser kept).
- `member.remove` is rejected if the balance isn't 0 **at the time the server applies it**, even if it was 0 on the phone.
- Any money op that would change a removed member's balance is rejected (`removed_member_balance`), checked again inside `apply_ops` ([03 §1][db]).
- `member.claim` / `member.release` are written to `trip_ops` so every phone sees the change on its next pull. The released user's phone gets `not_a_member` and shows "Aditya released your spot on Goa Weekend. Join again to claim it."
- Claiming never recomputes balances: the member ID is unchanged.

## 15. Analytics

| Event (PRD §19) | When | Properties |
|---|---|---|
| `member_added` | a member is added | type: `ghost` \| `claimed` \| `contact` |
| `member_claimed` | a ghost is claimed via `/join` | (proposed extras: `days_since_added`, `trip_status`, `via`: app \| web) |

Proposed, not in PRD §19: `member_removed`, `member_left`, `member_released` (to watch reinstall losses during the APK test).

## 16. Error handling

| Code / case | Message |
|---|---|
| Duplicate name (local check) | "There's already a Neha. Try 'Neha K'." |
| `balance_not_zero` | "Settle Jay's ₹1,200 or move his expenses first." + **Settle up** / **See his expenses** |
| `removed_member_balance` | "This changes Jay's balance. Add Jay back first." |
| `already_claimed` | "Neha's spot was just claimed. If that wasn't you, ask Aditya to release it." |
| `not_organiser` | "Only an organiser can do this." |
| Last organiser leaving | "Make someone else an organiser first." |
| `member_limit` | "Trips can have up to 50 people." |
| Contacts permission denied | Stay on "Add by name"; small "Allow contacts in Settings" link |
| `trip_settled` | "This trip is settled. Reopen to edit." |

## 17. Testing

- **Engine:** late-joiner fixture G4 ([07 §14][engine]): night-1 room split 3 ways, later expenses 4 ways.
- **Property tests:** claiming or releasing any member never changes any balance; removed members stay at 0 under any later edits, deletes and voids ([07 §13 invariant 12][engine]); fixture G14.
- **Server:** removal rejected when balance ≠ 0, including when a concurrent expense makes it non-zero (race test with `stale` retry, [06 §9][sync]); release keeps every row unchanged.
- **Concurrency:** two simultaneous `/join` claims on the same ghost → exactly one succeeds.
- **Duplicate names:** two offline phones add "Neha" → the second is "Neha 2".
- **Privacy:** "Add from contacts" stores and sends no phone number or hash.
- **Limits:** 50 members accepted; the 51st rejected; splits and settle-up perform well at 50 members ([PRD §17][prd]).
- **E2E (APK test, D-016):** reinstall → release → re-claim → history intact.

## 18. Future considerations

- Recurring co-travellers ("add the usual gang").
- Bulk reassign ("move all of Jay's expenses to Neha").
- Couples as a unit (one member counted as 2 shares by default).
- Contacts matching, only after phone login exists and with a safer design than a salted phone hash ([D-025][d025]).

## 19. Open questions

Resolved:
- Contacts: names only, no matching in v1 ([D-025][d025]).
- Duplicate ghost names created offline: "Rahul 2", with a notice (OQ-P21).
- "Former member" spots can't be claimed (OQ-P21).
- `joined_from`: your own, or anyone's if you're an organiser (OQ-P21).
- Leaving: allowed at zero balance (OQ-P21); the last organiser must hand over first ([D-030][d030]).
- Removed members' balances: locked at 0 ([D-030][d030]).
- Who can add, rename and remove: the [permission matrix][perm] ([D-031][d031]).
- Organiser recovery: co-organiser via `member.set_role`, and the 30-day takeover (OQ-P20).

Still open:
1. **"Joining from?" prompt:** ask every time a member is added to an active trip, or only when expenses already exist?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[perm]: ../09-security.md#permission-matrix
[d007]: ../decisions/D-007-auth.md
[d016]: ../decisions/D-016-testing-distribution.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d024]: ../decisions/D-024-web-page-read-only-beta.md
[d025]: ../decisions/D-025-no-contacts-matching-v1.md
[d030]: ../decisions/D-030-removed-members-locked.md
[d031]: ../decisions/D-031-permission-matrix.md
