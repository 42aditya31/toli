# Screen · Unresolved changes

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | **Assumption — not in UI reference.** Behaviour and copy from [06 §3.2, §5, §7](../06-syncing.md) and PRD §12 ("anything discarded surfaces in an 'unresolved changes' view"). Visual patterns from the design system ([13](../13-design-system.md)): Header, Banner, Card + Row, Button, Toast. |
| **Related** | [features/offline-and-sync](../features/offline-and-sync.md) · [features/expenses](../features/expenses.md) · [features/members-and-ghosts](../features/members-and-ghosts.md) · [D-004 Conflict strategy](../decisions/D-004-conflict-strategy.md) · [D-006 Append-only money](../decisions/D-006-append-only-money.md) · [03 §8.2 op_rejections, §10 outbox](../03-database-schema.md) · [04 §2.1 reject codes](../04-api-schema.md) · [06 §4 op types, §5 conflict rules](../06-syncing.md) · [trip-home](trip-home.md) · [split-editor](split-editor.md) · [balance-trace](balance-trace.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **New reason codes:** `removed_member_balance` ("This changes Jay's balance. Add Jay back first"), `amount_too_small`, `op_id_reused` ("Something went wrong saving this. Try again"), `not_allowed` ("Only the organiser can do this").
> - **Grouped items:** ops that depend on a rejected op (e.g. an edit or photo of an expense whose create failed) show as **one** item, from `blocked_ops`.
> - Outbox states: `queued` / `sending` / `retrying` (network) / `rejected` (shown here).

## Purpose
**Why:** offline edits can lose to someone else's change (Neha deleted the dinner you were editing). The PRD rule is **nothing is ever silently lost** ([06 §5](../06-syncing.md)).
**What:** a short list of the changes the server refused, each explained in one plain sentence with **one** way forward.
**How:** when `sync-push` answers `rejected`, the phone sets the outbox op to state `rejected` with its `reject_code`, restores the entity to the server's version, and lists the op here until the user acts on it ([06 §3.2](../06-syncing.md)). Network or server errors never land here; they set `retrying`.

## User goal
"Something I did didn't stick. Tell me what, why, and let me fix it in one tap."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | Assumption: a `Banner` at the top of the content, above the hero ticket: dot + **"2 changes couldn't be saved."** + **"Review"** (the "badge on the trip" in [06 §7](../06-syncing.md)) |
| [Trips list](trips-list.md) | Assumption: a small badge **"2 changes need attention"** on the trip card; tap → this screen |
| Toast after sync | "Neha deleted Dinner. Your edit wasn't saved." with a **Review** action (Assumption) |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | Back "‹" (or automatically when the list becomes empty; Assumption) |
| Add expense (prefilled) | **Restore as new expense** (review before saving; Assumption) |
| Split editor | **Fix the split** |
| Balances / Settle up | **Open balances** |
| App store | **Update Toli** |

## UI structure

### Header
`Header`: back "‹", title **"Unresolved changes"**, subtitle 12 px muted **"<Trip name> · <n> to review"**.

### Content (scroll, padding 0 18 24, gap 12)
1. **Intro** (13 px muted, line 1.4): **"These changes were made on this phone but couldn't be saved, usually because someone else changed the same thing first. Nothing else was affected."**
2. **One card per rejected op** (`Card`, radius 20, padding 14 16, gap 10):
   - Top line `type.label` mono 10/700 muted: **"<ENTITY TYPE> · <when you made it>"**, e.g. **"EXPENSE · SUN 21:41"**.
   - Message 15/600 (the sentence from the table below).
   - What you tried (13 px muted), e.g. **"Your edit: amount ₹1,200 → ₹1,300"**.
   - A row with **one primary action** (`Button` tonal, 40 px, radius 14) on the left and a ghost **"Dismiss"** on the right. (Dismiss is always available as the way to let go; the tonal button is the "one action".)
3. **Footnote** (12 px muted): **"Dismissed changes are gone from this phone. Everything the group saved is still in the trip history."**

### Copy and action per reject code
Reject codes from [04 §2.1](../04-api-schema.md). `<>` are variables.
| Reject code | When | Message | Primary action → result |
|---|---|---|---|
| `entity_deleted` (expense edit) | You edited an expense someone deleted ([06 §5](../06-syncing.md)) | **"<Neha> deleted <Dinner>. Your edit wasn't saved."** | **Restore as new expense** → Add expense prefilled with your edited values; saving creates a new `expense.create` |
| `entity_deleted` (other: booking, place, itinerary item, settlement void target) | Same, for planning data | **"<Rahul> deleted <Scuba · Grande Island>. Your change wasn't saved."** | **Restore it** → re-creates it with a new ID (`*.upsert`) |
| `base_revision_missing` | Your edit was based on a revision the server doesn't have (rare) | **"<Dinner> changed while you were offline. Your edit wasn't saved."** | **Apply my edit again** → new `expense.edit` on the current revision |
| `split_mismatch` | The server's maths didn't match (e.g. a member was removed, or an old app) | **"The split on <Dinner> didn't add up, so it wasn't saved."** | **Fix the split** → Split editor with your values |
| `balance_not_zero` | You removed a member who still has a balance | **"Settle <Jay>'s ₹1,200 or move his expenses first."** (06 §5 copy) | **Open balances** → Balance trace for that member |
| `trip_settled` | You made a money or member change on a trip that was settled meanwhile (feed posts and `recap.update` are still allowed, [06 §5](../06-syncing.md)) | **"This trip is settled. Reopen to edit."** (06 §5 copy) | **Reopen trip** → `trip.transition { to: reopen }` then re-sends your op. Organiser only (OQ-P12); others see **"Ask <Aditya> to reopen"** as text and only Dismiss |
| `not_organiser` | You did something only an organiser can do (remove a member, rotate the invite, change the settle mode, rename someone else…, OQ-P12) | **"Only an organiser can <remove Jay>."** | Dismiss only (Assumption) |
| `member_limit` | Adding a member would pass 50 people ([04 §2.1](../04-api-schema.md)) | **"<Goa Weekend> already has 50 people."** | Dismiss only |
| `attachment_limit` | More than 5 receipt photos on one expense | **"An expense can have up to 5 photos. <Dinner> already has 5."** | Dismiss only (the photo stays in your phone's gallery if it came from there) |
| `not_a_member` | You were removed, or released, while offline | **"You're no longer a member of <Goa Weekend>, so this wasn't saved."** | **Copy details** → copies a plain-text summary of the change for WhatsApp (Assumption) |
| `invalid_payload` | Bug or corrupted data | **"This change couldn't be read by the server. We've been told."** | **Try again** → re-queues once; on a second failure only Dismiss remains |
| `upgrade_required` | App too old for this change | **"Update Toli to save this change."** | **Update Toli** → store page; the op is **kept** and re-sent after update (not dismissable; Assumption) |

Components: `Screen`, `Header`, `Card`, `Button` (tonal, ghost), `Banner` (entry on Trip home), `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: reads the local outbox. |
| Empty | **"All changes saved."** with a check mark in lime mono and the muted line "Nothing to review on this trip." The Trip home banner disappears. |
| Populated | List of cards, newest first. |
| Error | An action itself fails (e.g. restore rejected again): the card stays, with a muted line "Still couldn't save. Try later or dismiss." |
| Offline | Readable. **Restore as new expense**, **Fix the split** and **Apply my edit again** work offline (new ops go to the outbox). **Reopen trip** is queued too. |
| Syncing | After an action, the card shows a small spinner and **"Saving…"** until the new op is applied, then slides out. |
| Success | Toast **"Restored as a new expense"** / **"Saved"** / **"Dismissed"**. |
| Disabled | **Reopen trip** for non-organisers (text only). **Dismiss** for `upgrade_required`. |
| Partial data | The deleted entity's name comes from the op's local payload; if the actor who deleted it is unknown, the message says **"Someone deleted <Dinner>…"**. |

## Interactions
| Gesture | Result |
|---|---|
| Tap the primary action | Runs it (table above). |
| Tap **Dismiss** | Removes the rejected op from the outbox; toast **"Dismissed"** with **Undo** for 2.8 s (Assumption). |
| Swipe a card left | Same as Dismiss (Assumption). |
| Tap the card body | Expands "What you tried" to show every field you changed (Assumption). |

## Data
| Value | Source (SQLite) |
|---|---|
| Rejected ops | `outbox` where `trip_id` and `state = rejected`, with `type`, `entity_id`, `payload`, `reject_code`, `last_error` (the `detail`) ([03 §10](../03-database-schema.md)) |
| Who deleted it / current state | the entity's current rows and the latest local `activity` row for that `entity_id` (`actor_member_id`) |
| Names | `trip_members.display_name`, entity descriptions from the payload |
| Organiser? | `trip_members.role` |

## API / Database
| Action | Write |
|---|---|
| Restore as new expense | new `expense.create` (new expense ID, new revision) with the edited values; then delete the rejected op |
| Restore it (planning) | `booking.upsert` / `place.upsert` / `itinerary.upsert` with a new ID |
| Apply my edit again | `expense.edit` with the current `base_revision_id` |
| Fix the split | `expense.edit` (or `expense.create` if the original was a create) after the user saves |
| Reopen trip | `trip.transition { to: reopen }`, then re-queue the op |
| Dismiss | delete the `outbox` row (local only) |
| Server side | the rejection is also in `op_rejections` (select own rows); Assumption: used to rebuild this list on a reinstalled phone |

## Edge cases
- **Same-field overwrite** ("Rahul changed the amount to ₹1,300 after you"): not a rejection. It's a quiet toast, not a card here ([06 §5](../06-syncing.md)).
- **Duplicate expense found on pull** (both saved offline): not a rejection and not here. The later creator sees **"Same one, delete mine"** / **"Keep both"** ([06 §5](../06-syncing.md)).
- **Many rejections at once** (a week offline): all listed; a header action **"Dismiss all"** appears when there are more than 3 (Assumption; still one tap each for restore).
- **Server rejects everything (a bug):** ops stay in the outbox as `retrying`, not `rejected`; this list stays empty and the app shows the "Can't sync — we're on it" banner instead ([06 §8](../06-syncing.md)).
- **A failed create** (`expense.create` rejected, e.g. `split_mismatch`): the expense never existed on the server, so the local row is removed and the card offers **Fix the split** to re-create it.
- **Restoring a deleted expense that was a duplicate** (Neha deleted it on purpose): the restored one goes through the duplicate check, so "Already logged?" (**Same one, skip** / **Save anyway**) may appear.
- **User leaves the trip** with rejected ops: they are discarded with the trip.

## Analytics
| Event | Properties |
|---|---|
| `sync_conflict` | `type` = reject code, `resolution` = `restored` / `reapplied` / `fixed` / `reopened` / `dismissed` / `updated` |

## Accessibility
- Each card reads as: "Expense, Sunday 21:41. Neha deleted Dinner. Your edit wasn't saved. Your edit: amount twelve hundred to thirteen hundred rupees. Actions: Restore as new expense, Dismiss."
- The Trip home banner is announced when it first appears (polite live region).
- Undo is also reachable from the screen-reader actions menu while the toast is visible.
- No colour-only meaning: every card has text and an explicit action.

## Open questions / assumptions
- **Assumption:** the whole screen, its entry banner and all copy not quoted from [06 §5](../06-syncing.md) are designed here.
- Resolved: the outbox has a separate `rejected` state with `reject_code`; transport failures set `retrying` ([03 §10](../03-database-schema.md), [06 §3.2](../06-syncing.md)).
- **Open:** should rejections sync across the user's devices (via `op_rejections`), or only live on the phone that made the change? Assumed: phone only, plus `op_rejections` as a recovery source.
- Resolved: duplicate copy is **"Same one, skip" / "Save anyway"** on save and **"Same one, delete mine" / "Keep both"** on pull ([06 §5](../06-syncing.md)).
