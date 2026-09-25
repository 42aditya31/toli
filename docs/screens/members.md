# Screen · Members

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | **Launch film only** (`ui-refrence/toli-film.jsx`, Members beat: header "Members" / "Goa Weekend · 4 people", rows "Day 1", lime "joined day 2" badge, card "NIGHT 1 · CASA ANJUNA · ₹3,000 · split 3 ways · ₹1,000 each"). **Not in the Toli App prototype.** Add/rename/remove/release flows are assumptions built on the PRD and canonical docs |
| **Related** | [features/members-and-ghosts](../features/members-and-ghosts.md) · [features/invites-and-joining](../features/invites-and-joining.md) · [features/auth-and-identity](../features/auth-and-identity.md) · [03 §4.2 trip_members](../03-database-schema.md) · [06 §4 `member.add` / `member.update` / `member.remove` / `member.set_role` / `member.release`, §5 removal rule](../06-syncing.md) · [04 §3.5 member-release, §8 contacts-match](../04-api-schema.md) · OQ-P12 / OQ-P14 / OQ-P20 in [01](../01-overview.md#open-questions) · [07 §5 participants](../07-calculation-engine.md) · [D-007](../decisions/D-007-auth.md) · [D-016](../decisions/D-016-testing-distribution.md) · [create-trip](create-trip.md) · PRD F2, §8 lifecycle rules |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **From contacts** copies **names only**. No phone numbers, hashes or "already on Toli" matching in v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
> - **Leave trip** (your own balance must be 0; the last organiser must hand over first).
> - **Permissions:** see the [permission matrix](../09-security.md#permission-matrix). Any member renames **ghosts**; only organisers rename claimed people.

## Purpose
**Why:** trips change. Someone joins on day two, someone's name is misspelled, a friend reinstalls and loses their account. PRD F2 needs `joined_from` so late joiners don't pay for the first night, and PRD §8 says a member with a balance can't be removed, and the UI must explain why rather than silently refusing.
**What:** a list of everyone on the trip with the day they joined, plus actions to add, rename, set "joined from", remove, and (organiser) release a claimed spot or share the organiser role.
**How:** every change is a member op in the outbox. Removal is checked by the server (`balance_not_zero`). Release goes through the API because it changes who owns an identity.

## User goal
"Jay only joined on day two, so he shouldn't pay for the first night," or "add Priya," or "Rahul lost his phone, free up his spot."

## Entry points
| From | Trigger |
|---|---|
| `TabBar` (R1) | **Members** tab: the R1 bar is Trip · (+) · Members (OQ-P11) |
| [Trip home](trip-home.md) / [Empty trip](empty-trip.md) | Tap the header title block (Assumption) |
| Trip settings | **Members** row (Assumption) |
| Push `added_to_trip` | Deep link ([04 §11](../04-api-schema.md); path Assumption) |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back (when pushed, not opened as a tab) |
| Invite share sheet | **Invite** (Assumption, same as Trip home) |
| [Balance trace](balance-trace.md) | "See Jay's balance" in the remove-blocked message (Assumption) |
| [Settle up](settle-up.md) | "Settle up" in the remove-blocked message (Assumption) |

## UI structure
**Header** (`Header`): back `‹` · title **"Members"** · subtitle **"Goa Weekend · 4 people"** · right tonal **"Invite"** (Assumption).

**Members card** (`Card` radius 24, padding 4 / 16), one 58 px row per member, 1 px divider:
- 34 px `Avatar` initial · name 15/600 · right: mono 11/700 pill (padding 5 / 10, radius 999)
  - **"Day 1"** — muted text, transparent background (joined from the start)
  - **"joined day 2"** — lime background, `color.onAccent` text (late joiner); pops 1.3 → 1 when set
- Assumption: a sub-line under the name (11 muted): **"Organiser"**, **"On Toli"** or **"Ghost · not on Toli yet"**, matching Trip home.
- Day label = `joined_from − start_date + 1`; trips without dates show the date instead (**"from 13 Oct"**).

**Late-joiner example card** (from the film; shown here as the explanation of what `joined_from` does, Assumption): lime `TicketCard`, radius 22, padding 16 / 18: mono 11/700 **"NIGHT 1 · CASA ANJUNA"** · **"₹3,000"** (30/800) + **"split 3 ways"** (14/600) · avatars A R N (J at 30% opacity) + mono **"₹1,000 each"**. Assumption: appears once, right after a `joined_from` is set, as an inline tip that can be dismissed.

**Add member** (Assumption, same pattern as [Create trip](create-trip.md)): input **"Add by name"** + lime **"+"**; below it two tonal buttons **"From contacts"** and **"By phone number"** (PRD F2 MUSTs). Hint 12 muted: **"Nobody needs the app yet. Ghost members hold balances and can claim their spot from the invite link later."**

**Member sheet** (tap a row; `Sheet`, radius 28; Assumption):
| Action | Shown when | Copy |
|---|---|---|
| Rename | yourself, or anyone else if you're an organiser | **"Rename"** → text field, 1–30 chars |
| Joined from | always | **"Joined from"** → **"From the start"** / **"Day 2 · Sun 13 Oct"** / … Helper: **"Only new expenses use this. Older ones keep their split until you edit them."** |
| Release spot | claimed member, organiser only | **"Release Rahul's spot"** → confirm: **"Rahul becomes a ghost again. All his history stays. He can claim it again from the invite link."** · **"Release"** / **"Cancel"** |
| Make organiser / Make member | claimed member, organiser only | **"Make Neha an organiser"** / **"Remove organiser role"** (hidden when it would leave no organiser) |
| Remove from trip | balance = ₹0, organiser only (or yourself: **"Leave trip"**) | **"Remove from trip"** → confirm **"Remove Priya? She isn't in any expense."** |
| Remove blocked | balance ≠ ₹0 | Disabled row + text: **"Settle Jay's ₹1,200 or move his expenses first"** ([06 §5](../06-syncing.md)) with links **"See Jay's balance"** / **"Settle up"** |

Components: `Screen`, `Header`, `Card`, `Row`, `Avatar`, `Chip` (day pill), `TicketCard`, `Sheet`, `Button`, `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | Never empty (you are always a member). Only you: helper **"Add the people travelling with you."** (Assumption). |
| Populated | As above. |
| Error | `member.remove` rejected `balance_not_zero` (e.g. an expense for them synced meanwhile) → [Unresolved changes](unresolved-changes.md) and the member reappears. `member.add` rejected `member_limit` (over 50) → Unresolved changes. Duplicate name → inline **"{Name} is already on this trip"**. `member-release` fails `not_organiser` → toast **"Only the organiser can release a spot."** |
| Offline | Add, rename, joined-from, remove work (queued). **Release** and **From contacts** matching need the network: toast **"Connect to the internet to release a spot."** |
| Syncing | Rows update when someone claims a ghost (sub changes to "On Toli"). Claims need no approval; the organiser is notified ("Neha claimed her spot") and can **Release** a wrong claim (OQ-P14). |
| Success | Toasts (Assumption): **"Priya added"**, **"Renamed to Neha S."**, **"Jay joined from day 2"**, **"Rahul's spot released"**, **"Priya removed"**. |
| Disabled | Settled trip: member ops are rejected until an organiser reopens it ([06 §5](../06-syncing.md)), so sheet actions are hidden except viewing. |
| Partial data | Ghost with no activity: can be removed. Anonymised (deleted-account) member: shown as **"Former member"** (numbered if several) after the server's `member.anonymised` op ([03 §11](../03-database-schema.md)); no actions except Joined from (Assumption). |

## Interactions
| Interaction | Result |
|---|---|
| Tap a row | Member sheet. |
| Type name + **+** | Adds a ghost (`joined_from` = today if the trip has started, Assumption; else null). |
| **From contacts** | OS contact picker (permission prompt with plain-language purpose, PRD §18). Copies the **name only** into a new ghost; no number or hash is stored or sent ([D-025](../decisions/D-025-no-contacts-matching-v1.md)). |
| **By phone number** | Name + phone field; still a ghost until claimed. |
| Rename / Joined from / Remove / Release | As in the sheet table. |
| Back | Previous screen. |

**Permissions (OQ-P12 in [01](../01-overview.md#open-questions)):** any claimed member can add ghosts and rename themselves. Only an organiser can remove other members, release a claimed spot, rename other people and change roles (`member.set_role`). Setting joined-from for others isn't listed in OQ-P12; assumed any claimed member.

## Data
- `trip_members` (not removed): `display_name`, `user_id` (null = ghost), `role`, `joined_from`, `claimed_at`.
- `trips.start_date` for "Day N"; trip name and count for the subtitle.
- Engine `balance(m)` for remove eligibility.

## API / Database
| Action | Write |
|---|---|
| Invite | `POST /invite-create` without `rotate` returns the trip's current link and code (e.g. `GOA-7K2PXQ`), so every member shares the same one; rotating is organiser only ([04 §3.1](../04-api-schema.md)) |
| Add | op `member.add` `{ id, display_name, joined_from }` |
| Rename / Joined from | op `member.update` (field patch) |
| Remove | op `member.remove` `{ id }` — server rejects with `balance_not_zero` |
| Change role | op `member.set_role` `{ id, role }` (organiser only; the trip must keep ≥ 1 organiser) |
| Release | `POST /member-release` `{ trip_id, member_id }` (organiser; logged as `member.release`, [04 §3.5](../04-api-schema.md)) |
| Contacts | only the picked **name** is used; nothing about the contact is stored or uploaded ([D-025](../decisions/D-025-no-contacts-matching-v1.md)) |

## Edge cases
- **Changing `joined_from` never re-splits existing expenses** (participants are always explicit, [07 §5](../07-calculation-engine.md)); only defaults for new expenses change.
- **Removing yourself** = "Leave trip": same balance rule (Assumption).
- **Organiser leaves:** must first make someone else an organiser (`member.set_role`). A co-organiser is recommended so a lost account doesn't lock the trip; if no organiser is active for 30 days, the longest-standing claimed member can take over (OQ-P20).
- **Kitty holder** can't be removed while holding cash.
- **50-member cap** reached: add disabled, **"Trips can have up to 50 people"** (server reject `member_limit`).
- **Released member re-claims:** same member ID, same history; `member.claim` op ([04 §3.4](../04-api-schema.md)).

## Analytics
| Event | When | Properties |
|---|---|---|
| `member_added` | Add succeeds | `type`: `ghost` / `contact` (phone-number adds count as `ghost`, Assumption) |
| `invite_shared` | Invite share completes | `channel` |

## Accessibility
- Row: "Jay, ghost, joined day 2." The lime badge's meaning is in its text.
- Sheet actions are buttons with full labels ("Remove Jay from trip, unavailable, Jay owes one thousand two hundred rupees").
- Contacts permission prompt explains why before the OS dialog.

## Open questions / assumptions
- **Whole screen is from the film**; the prototype has no member management.
- Organiser hand-over is `member.set_role` ([06 §4](../06-syncing.md)); permissions follow OQ-P12.
- "Move his expenses" (reassign) has no bulk flow; for now it means editing each expense (any claimed member can, OQ-P12).
