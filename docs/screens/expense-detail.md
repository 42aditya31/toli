# Screen · Expense detail

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 (linked itinerary/booking rows appear in R2/R3) |
| **Source** | **Assumption**: not in the UI reference. Built from PRD F3, F5, §18 and the canonical docs; follows [13 Design system](../13-design-system.md) |
| **Related** | [features/expenses](../features/expenses.md) · [features/splitting](../features/splitting.md) · [add-expense](add-expense.md) · [split-editor](split-editor.md) · [balance-trace](balance-trace.md) · [feed](feed.md) · [unresolved-changes](unresolved-changes.md) · [03 §5, §7, §10](../03-database-schema.md) · [06 §4–5](../06-syncing.md) · [04 §4, §11](../04-api-schema.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Editable here:** date and time, currency (R2) and *Booked before trip*, through the same sheet as Add expense's `DateCurrencyChip`.
> - **Money-group edits** (amount, currency, payers, split, kitty-paid, items) are saved as **one group** ([D-019](../decisions/D-019-money-edit-group.md)). Description, category and date merge separately.
> - **Refund** flag (R1b, [D-029](../decisions/D-029-refund-expense.md)).
> - Edits that would change a **removed member's** balance are rejected (`removed_member_balance`).
> - **Remove photo** uses the `attachment.delete` op (the uploader or an organiser).

## Purpose
**Why:** PRD F3/F5/§18: any expense must be editable and deletable, and "who changed my share?" must always be answerable. Recent rows, feed entries and trace lines all need somewhere to land.
**What:** one expense, fully explained: amount, who paid, who shares and how much, category, date, receipt photos, links to the plan, and the history of every change.
**How:** reads the current revision from SQLite. Edits and deletes are ops through the outbox ([06 §4](../06-syncing.md)); money is append-only, so every change is a new revision ([D-006](../decisions/D-006-append-only-money.md)).

## User goal
"What exactly is this expense, is my share right, and who changed it?"

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | Tap a row in **Recent** |
| [Feed](feed.md) | Tap an expense entry |
| [Balance trace](balance-trace.md) | Tap a "Paid for…" / "Share of…" line |
| [Kitty](kitty.md) | Tap a kitty spend |
| Push action `not_me` / "See split" ([04 §11](../04-api-schema.md)) | Opens here; `not_me` also shows the hint "Not part of this? Remove yourself" |
| [Plan](plan.md) / [Vault](vault.md) | Tap a linked expense (R2/R3) |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Add expense](add-expense.md) → [Split editor](split-editor.md) | **Edit** |
| Previous screen + undo toast | **Delete** confirmed |
| Photo viewer (full screen) | Tap a receipt thumbnail |
| Itinerary item / booking | Tap the linked row |
| [Balance trace](balance-trace.md) | Tap a person's share (opens on that member) |

## UI structure
**Header:** back `‹` · title = description (or category label, or "Expense") 20/600, ellipsis · right action `⋯` (Edit, Delete).

**Content** (scroll, 18 px sides, 12–14 px gaps, 110 px bottom space):

| # | Block | Details and copy |
|---|---|---|
| 1 | **Amount ticket** | `TicketCard` lime, perforation. Category label (`type.label`, e.g. "FOOD", or "MISC" if none, OQ-P15). Amount `type.amountL` "₹1,200". Sub: "Day 2 · 20:40 · Tue 14 Oct". Foreign currency (R2): "IDR 5,00,000 · 1 IDR = ₹0.0053 (frozen)". |
| 2 | **Paid by** | `Card` rows: avatar · name · mono amount. "Paid from kitty · held by Rahul" when `paid_from_kitty`. |
| 3 | **Split** | `Card`. Sub-header: mode ("Equal · 4 people", "Shares", "Itemised · 6 items"…). One row per participant: avatar · name · mono share. **You** row highlighted with the lime avatar. Itemised: items listed with faces, then extras ("GST 5% · follows subtotals"). |
| 4 | **Receipts** | Up to 5 thumbnails (72 px, radius 12) + **"Add photo"** tile while fewer than 5. Pending upload tiles show "WAITING FOR WI-FI" or "UPLOADING" (`type.label`). Hidden when there are none and the trip is settled. |
| 5 | **Linked to** (R2/R3) | Rows for the itinerary item or booking whose `linked_expense_id` points here: "Plan · Day 2 · Dinner at Thalassa · est ₹1,000 · +20%" / "Booking · Casa Anjuna · 2 rooms". |
| 6 | **History** | `Card` "Who changed what". Newest first: "Rahul changed the amount ₹1,000 → ₹1,200 · 2h ago", "Neha removed Jay · yesterday", "Aditya added this · Day 2 20:41". Shows up to 3, then **"See all changes"**. |
| 7 | **Actions** | `Button` tonal **Edit** · ghost **Not me** (only if you're a participant and not the only one) · ghost destructive-text **Delete**. |

Pending rows: sub of block 1 adds "SAVED ON PHONE · WILL SYNC" (lime mono, [06 §7](../06-syncing.md)).

Components: `Screen`, `Header`, `TicketCard`, `Card`, `Row`, `Avatar`, `Button`, `Sheet`, `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a for the current revision (local). "See all changes" shows 3 skeleton rows while older revisions load. |
| Populated | As above. |
| Deleted | Opened from the feed after a delete: amount ticket muted with a "DELETED" `Stamp`; actions replaced by **Restore as new expense**. |
| Offline | Everything shown from SQLite. Edit, Delete, Not me and Add photo work (queued). "See all changes" beyond the local `activity` rows shows "Older changes load when you're online". |
| Settled trip | Read-only: actions hidden, banner "This trip is settled. Reopen to edit." ([06 §5](../06-syncing.md)). |
| Rejected change | If this expense has a `rejected` outbox op, a banner links to [Unresolved changes](unresolved-changes.md). |
| Error (history fetch) | "Couldn't load older changes. Try again." |

## Interactions
| Gesture | Result |
|---|---|
| **Edit** | Opens Add expense prefilled, then the split editor; save sends `expense.edit` with `base_revision_id` + field patch. |
| **Delete** | Confirm sheet: "Delete Dinner at Thalassa? Balances go back to how they were. Everyone on the trip is told." → **Delete** / **Cancel**. Writes `expense.delete`; returns to the previous screen with toast "Deleted · Undo" (2.8 s). Undo writes a new `expense.create` copying the last revision (a delete can't be un-done in place, since money is append-only). |
| **Not me** | Confirm sheet: "Remove yourself from this expense? Your share (₹300) is split among the others." → writes `expense.edit` removing you from the participants and re-running the split mode. |
| **Add photo** | Camera / gallery → compressed, EXIF stripped → `attachment.register` + `file_queue` ([02 §5.3](../02-architecture.md)). |
| Tap thumbnail | Full-screen viewer; long press → **Remove photo** (soft delete). |
| Tap a share row | Balance trace for that member. |
| **See all changes** | Expands the history, loading older revisions on demand. |

## Data
- SQLite: `expenses`, current `expense_revisions`, `expense_payers`, `expense_shares`, `expense_items`, `trip_categories`, `trip_members`, `attachments` (owner = expense), `file_queue`, `file_cache`.
- History: the local `activity` table (entries for this `entity_id`), plus older `expense_revisions` fetched on demand ([03 §10](../03-database-schema.md)). "From → to" diffs are computed between consecutive revisions.
- Links: `itinerary_items` / `bookings` where `linked_expense_id = this id` (stored only on the planning side, [03 §5.9](../03-database-schema.md)).

## API / Database
| Action | Op / endpoint |
|---|---|
| Edit, Not me | `expense.edit` (`base_revision_id` + patch) via `/sync-push` |
| Delete | `expense.delete` (`base_revision_id`) |
| Undo delete / Restore | `expense.create` (new ID) |
| Add photo | `attachment.register`, then `/upload-url` → R2 → `/upload-confirm` ([04 §4](../04-api-schema.md)) |
| View photo | `/download-url` (or `file_cache`) |
| Older history | revisions from Postgres (RLS select); older feed rows via `/trip-activity` |

Reject codes to handle: `entity_deleted` (edit vs delete, shown in Unresolved changes), `trip_settled`, `attachment_limit` (6th photo), `split_mismatch`.

## Edge cases
- **Same-field edit race:** the earlier editor sees "Rahul changed the amount to ₹1,300 after you" ([06 §5](../06-syncing.md)).
- **Edited by someone else while open:** the screen updates in place when the pull lands; numbers count up.
- **Not me when you're the only participant:** hidden; the only fix is Delete or Edit.
- **Not me when you're also the payer:** allowed; you stay the payer.
- **Ghost participants:** anyone can edit on their behalf (OQ-P12); history names who did it.
- **Anonymised member:** shown as "Former member" in rows and history ([03 §11](../03-database-schema.md)).
- **5 photos already:** Add photo tile hidden; sync reject `attachment_limit` if two phones add at once.
- **Kitty-paid expense:** Paid by shows the kitty; deleting it restores the kitty remaining.
- **Linked expense deleted:** the planning item keeps its estimate and shows "Linked expense deleted" (link cleared by a planning edit).

## Analytics
| Event | When |
|---|---|
| `expense_viewed` | Screen opens (property `from`: recent/feed/trace/push/plan) |
| `expense_edited` | Edit saved (properties: fields changed) |
| `expense_deleted` / `expense_delete_undone` | Delete confirmed / Undo tapped |
| `expense_not_me` | Not me confirmed |
| `expense_history_opened` | See all changes |

(Event names are proposals; align with [10 Observability](../10-observability.md).)

## Accessibility
- Amount ticket read as "Dinner at Thalassa, one thousand two hundred rupees, food, day 2."
- Each share: "Neha's share, three hundred rupees."
- History rows read in full ("Rahul changed the amount from one thousand to one thousand two hundred rupees, two hours ago").
- Delete and Not me confirmations are sheets that trap focus; destructive buttons say what they do.
- Thumbnails have labels "Receipt photo 1 of 3".

## Open questions / assumptions
- The whole screen is an assumption; no design exists in the UI reference.
- Undo after delete creates a new expense ID (history shows a delete then a create). Acceptable, or should the server support an `expense.restore` op?
- Whether paise can be edited here for INR ([D-013](../decisions/D-013-keypad-entry.md) says "on the expense detail screen") needs a design for the amount field.
