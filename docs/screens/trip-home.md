# Screen · Trip home

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (Budget tile R2) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- HOME -->` block (lines 237–297), tab bar (lines 867–877), toast (879–881); logic `home`, `kit`, `bud` objects. Offline row copy from `ui-refrence/toli-film.jsx` (`HomeScreen`, "SAVED ON PHONE · WILL SYNC"). The `⋯` button, **See all** and the kitty cash row are assumptions following [13](../13-design-system.md) |
| **Related** | [features/balances-and-trace](../features/balances-and-trace.md) · [features/expenses](../features/expenses.md) · [features/kitty](../features/kitty.md) · [features/budget](../features/budget.md) · [features/offline-and-sync](../features/offline-and-sync.md) · [features/invites-and-joining](../features/invites-and-joining.md) · [07 §6, §7](../07-calculation-engine.md) · [06 §7](../06-syncing.md) · [13 §2, §6](../13-design-system.md) · [D-022 Kitty views](../decisions/D-022-kitty-views-and-handover.md) · [D-023 Settle timing](../decisions/D-023-auto-settle-timing.md) · [trip-settings](trip-settings.md) · [all-expenses](all-expenses.md) |

---

## Purpose
**Why:** PRD F5: "open the app and immediately know whether I'm up or down." This is the screen people see most.
**What:** a lime ticket with your one-line balance, the kitty and budget at a glance, everyone's balance, and the latest expenses. A floating **+** adds an expense.
**How:** every number is read from SQLite and computed by `@toli/engine` on the phone, in the **trip view** ([D-022](../decisions/D-022-kitty-views-and-handover.md)). Nothing waits for the network. Every balance is tappable to explain it (PRD principle 7).

## User goal
"Am I up or down? Who owes what? Let me add the cab I just paid for."

## Entry points
| From | Trigger |
|---|---|
| [Trips list](trips-list.md) | Tap a trip card |
| [Skeleton loading](skeleton-loading.md) | First snapshot finished |
| [Empty trip](empty-trip.md) | The first expense is saved |
| [Add expense](add-expense.md) / [Tear overlay](tear-overlay.md) | After save (toast built from reality, see Success) |
| Tab bar | **Trip** tab from Members (R1a/R1b), or Plan / Vault / Feed (R3) |
| Push notification / deep link | `toli://trip/<id>` |

## Exit points
| To | Trigger |
|---|---|
| [Trips list](trips-list.md) | `‹` back |
| [Trip settings](trip-settings.md) | `⋯` in the header |
| Invite share (see [invite-web](invite-web.md), [features/invites-and-joining](../features/invites-and-joining.md)) | **Invite** |
| [Settle up](settle-up.md) | **Settle up →** on the hero ticket |
| [Kitty](kitty.md) | Kitty tile, or the kitty row in Balances |
| [Budget](budget.md) | Budget tile (R2) |
| [Balance trace](balance-trace.md) | Tap any member balance row (opens for that member) |
| [Receipt scan](receipt-scan.md) / [Pro sheet](pro-sheet.md) | **Scan a bill** (R2; Pro trip → scanner, free trip → Pro sheet) |
| [Expense detail](expense-detail.md) | Tap a Recent row |
| [All expenses](all-expenses.md) | **See all** in the Recent header |
| [Add expense](add-expense.md) | **+** FAB |
| [Members](members.md) | **Members** tab (R1a/R1b) |
| [Unresolved changes](unresolved-changes.md) | **Review** on the error banner |
| [Plan](plan.md) / [Vault](vault.md) / [Feed](feed.md) | Tab bar (R3; Plan screens R2) |

## UI structure
**Header** (`Header`): back `Icon` button (`CaretLeft`, `size.iconButton`, `radius.control`, `color.bg.raised`) · title **"Goa Weekend"** (`type.header`, ellipsis) with subtitle **"12 – 15 Oct · Day 2 of 4"** (`type.small`, muted) · right: tonal `size.buttonM` **"Invite"** + `⋯` icon button (`DotsThree`, label "Trip settings") → [Trip settings](trip-settings.md).

**Content** (scroll, `space.gutter` sides, `space.stack` gaps, 110 px bottom space for the tab bar):

| # | Block | Details and exact copy |
|---|---|---|
| 0 | **Offline banner** (only when offline with pending ops) | `Banner` on `color.bg.raised`, `radius.key`, `type.caption`: `CloudSlash` icon + **"<b>Offline.</b> 2 changes saved on this phone. They sync when you're back."** (`2` = pending op count) |
| 1 | **Hero ticket** | `TicketCard` hero, lime, `radius.card`, `space.heroPad`. Top: label **"You are owed"** / **"You owe"** / **"You're all square"** and right-aligned `type.label` at 70% **"LIVE"**; amount `type.display`, e.g. **"₹3,400"** (no sign; the label says the direction). The amount is your **trip-view** balance, so it never includes kitty cash you hold ([D-022](../decisions/D-022-kitty-views-and-handover.md)). Dashed perforation (`color.perforation`). Bottom: **"Group spent <b>₹17,000</b>"** (`type.caption`) + `onAccent` button **"Settle up →"**. Notches at the perforation. |
| 2 | **Kitty + Budget tiles** | 2-column grid, `space.stackTight` gap. Each `Card` `radius.cardS`. **Kitty:** "Kitty" (`type.small` muted) + flag `type.label` **"OK"** (muted), or `WarningCircle` + **"LOW"** in `color.warning` (never lime, [13 §2](../13-design-system.md)); **"₹3,000 left"**; sub `type.micro` muted **"Kitty cash with Rahul"**; 6 px bar: lime while OK, `color.warning` when LOW. **Budget** (R2): "Budget" + mono **"57%"** muted; **"₹17,000 of ₹30k"**; bar in `color.text`, capped at 100%. Over budget: bar and % in `color.warning` with `WarningCircle` + **"OVER"**. |
| 3 | **Balances** | `Card` `radius.card`. Header row: **"Balances"** (`type.bodyStrong`) + **"Tap to trace"** (`type.small` muted). One `Row` per member, `size.row`, `color.divider` between rows: `Avatar` · name (**"Aditya (you)"** for yourself) with sub `type.micro` muted **"Ghost · not on Toli yet"** or **"On Toli"** · right: `type.mono` signed amount **"+₹3,400"** (lime when positive, `color.text` otherwise) over the word **"gets back"** / **"owes"** / **"settled"**. **Kitty row** (only when the kitty is on): a last row with the kitty `Icon` tile, **"Kitty cash with Rahul"** and **"₹3,000"** over the word **"in the pot"**. Members + the kitty row add up to ₹0 ([07 §6](../07-calculation-engine.md)). |
| 4 | **Recent** | `Card` `radius.card`. Header: **"Recent"** + lime link **"See all"** → [All expenses](all-expenses.md) (and **"Scan a bill"** in R2). Last 5 expenses, newest first, `size.rowTall` rows: category tile (`radius.chip`) with a 2-letter mono mark (**"ST"** Stay, **"FO"** Food, **"TR"** Travel…) · title `type.bodyStrong`, ellipsis, e.g. **"Cab to Baga"** + meta `type.micro` muted **"Rahul paid · 4 people"** (or **"Paid from kitty · 4 people"**) · right: `type.mono` **"₹800"** + **"yours ₹200"** or **"not in this"**. Rows use the same markers as [All expenses](all-expenses.md). |

**Tab bar** (`TabBar`, `size.tabBar`, `color.bg.card`, fade gradient behind it). **R1a/R1b:** **Trip** · FAB **+** (`size.fab`, lime, `shadow.fab`) · **Members** (OQ-P11 in [01](../01-overview.md#open-questions), [13 §6](../13-design-system.md)). **R3:** Trip · Plan · (+) · Vault · Feed, as in the UI reference, and Members moves to the Trip home header. Active tab = lime text + 5 px lime dot.

Components: `Screen`, `Header`, `Icon`, `Banner`, `TicketCard` (hero), `Card`, `Row`, `Avatar`, `ProgressBar`, `TabBar`, `Toast`, `SyncPill`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a for local trips. First load uses [Skeleton loading](skeleton-loading.md). |
| Empty | No expenses → this route shows [Empty trip](empty-trip.md) instead. |
| Populated | As above. |
| Error | An outbox op in state `rejected` shows a `Banner` (`warning` variant, `WarningCircle`) above the hero: **"1 change couldn't be saved."** + **Review** → [Unresolved changes](unresolved-changes.md) (Assumption, based on [06 §7](../06-syncing.md)). Sync server failure: **"Can't sync — we're on it"** ([06 §8](../06-syncing.md)). App below the minimum version (`426`): **"Update Toli to keep syncing"** + **Update** ([D-026](../decisions/D-026-write-path-and-compat.md)). |
| Offline | Offline banner (row 0). Status bar **OFFLINE**. New, unsynced expense rows show the subtitle **"SAVED ON PHONE · WILL SYNC"** in lime `type.label` instead of the payer meta, and a lime category tile. Everything still works. |
| Syncing | `SyncPill` at the bottom above the tab bar: **"Syncing Goa Weekend · 3 changes"**. Numbers may change when pulled ops arrive; amounts count up, never fade ([13 §7.3](../13-design-system.md)). |
| Success | After a save, a `Toast` built from reality. It never says something happened before the server confirms it ([13 §8](../13-design-system.md), [04 §5.1a](../04-api-schema.md)): online **"Rahul and Neha will get a stub · Share with Jay on WhatsApp"** (Jay is a ghost or has no push); offline **"Saved · sending when you're online"**; kitty-paid **"₹1,200 paid from the kitty"**; nobody else owes **"Saved"**. |
| Disabled | **Settled trip** (after **Close trip**, or 24 h after the end date with every payment at 0, [D-023](../decisions/D-023-auto-settle-timing.md)): hero label **"Everyone's square."**, amount **₹0**, and the Settle up button reads **"Settled"**. No recap in R1 (it arrives in R3). A `Banner` **"This trip is settled. Reopen to edit."** with **Request reopen** or **Reopen**, as the [permission matrix](../09-security.md#permission-matrix) allows ([06 §5](../06-syncing.md), [trip-settings](trip-settings.md)). The FAB is hidden. |
| Partial data | **Kitty off:** Kitty tile shows **"Start a kitty"** / **"Pool cash for fuel and snacks"** (Assumption), and Balances has no kitty row. **No total budget / R1:** Budget tile hidden and Kitty tile spans full width (Assumption). Ghost with no activity shows **₹0 · settled**. |

## Interactions
| Gesture | Result |
|---|---|
| Tap `‹` | Trips list (tab-style fade). |
| Tap `⋯` | Push [Trip settings](trip-settings.md). |
| Tap **Invite** | Opens the native share sheet with the invite link + code (e.g. **GOA-7K2PXQ**), text optimised for WhatsApp (PRD F2). Every member shares the **same** link; rotating it is in [Trip settings](trip-settings.md) ([04 §3.1](../04-api-schema.md)). Assumption: the prototype instead opens the invite web preview; we keep that as a secondary action **"Preview what friends see"**. First tap may prompt **"Save my account"** ([D-007](../decisions/D-007-auth.md), OQ-P20). |
| Tap **Settle up →** | Push Settle up. |
| Tap Kitty / Budget tile, or the kitty row | Push Kitty / Budget. |
| Tap a member balance row | Push Balance trace pre-selected on that member. |
| Tap **Scan a bill** (R2) | Push Receipt scan on a Pro trip; on a free trip, open the [Pro sheet](pro-sheet.md). |
| Tap a Recent row | Push [Expense detail](expense-detail.md) (edit / delete / history). Who may edit: [permission matrix](../09-security.md#permission-matrix). |
| Tap **See all** | Push [All expenses](all-expenses.md). |
| Tap **+** | Push Add expense. Press state: scale .94. |
| Pull to refresh | Assumption: triggers a sync pull. |
| Long press / swipe | None in the prototype. |

## Data
All from SQLite, computed by `@toli/engine` ([07](../07-calculation-engine.md)):
| UI | Source |
|---|---|
| Header | `trips.name`, `start_date`, `end_date`, `time_zone`, today |
| Hero balance | trip-view `balance(me)`: current `expense_revisions` + `expense_payers` + `expense_shares`, `settlements` (not voided, not pending), `kitty_contributions` (not voided). **No kitty folding here**; folding is only in the settle view on [Settle up](settle-up.md) ([07 §6–7](../07-calculation-engine.md), [D-022](../decisions/D-022-kitty-views-and-handover.md)) |
| Group spent | Σ `base_amount_minor` of current, non-deleted revisions (includes kitty-paid expenses) |
| Kitty tile and row | `trips.kitty_enabled`; remaining = Σ contributions − Σ kitty-paid expenses; holder = `trips.kitty_holder_member_id` (cached from the latest `kitty_handovers` row); LOW when remaining ≤ `kitty_low_bp` × contributions / 10000 |
| Budget tile | the `trip_budgets` row with `scope = total` (R2, [03 §5.9](../03-database-schema.md)) |
| Balances | `trip_members` (not removed) + trip-view `balance(m)`; ghost = `user_id` null |
| Recent | last 5 `expenses` by `spent_at`; `trip_categories` for the mark; payer name; participant count = shares > 0; "yours" = my share |
| Offline / pending | `outbox` count for the trip in state `queued` / `sending` / `retrying`; row `local_state = pending` |
| Error banner | `outbox` rows in state `rejected` |

## API / Database
Writes nothing itself. Opens the private Supabase Realtime channel `trip:{id}` while visible ([06 §3.4](../06-syncing.md)). **Invite** calls `POST /invite-create` without `rotate`, which returns the trip's current invite ([04 §3.1](../04-api-schema.md)); that needs the network (Assumption: offline, the button shows toast **"Connect to the internet to share the invite link"**).

## Edge cases
- **You are the kitty holder:** your trip-view balance does **not** include the pot. The cash shows on its own row, **"Kitty cash with you"**. At settle-up the cash is folded into your balance ([D-022](../decisions/D-022-kitty-views-and-handover.md)).
- **Kitty overspent:** Kitty tile shows **LOW** (`color.warning`) and **"₹0 left"**; the kitty row shows a negative amount; the Kitty screen explains the shortfall.
- **Balances that are 1 paisa off display:** never happens; display rounds nothing, INR whole amounts hide ".00" ([07 §12](../07-calculation-engine.md)).
- **50 members:** Balances card lists all; Assumption: show your row first, then others by absolute balance, collapse after 8 with **"Show all 50"**.
- **Late joiner:** Jay shows normally; his earlier shares are simply smaller.
- **Removed member with history:** not in Balances (balance must be 0 to remove, and it stays 0, [D-030](../decisions/D-030-removed-members-locked.md)).
- **Member deleted their account:** the row stays, renamed **"Former member"** (numbered if several), after the server's `member.anonymised` op ([03 §11](../03-database-schema.md)).
- **Compact layout (< 380 px):** `type.display` drops to 44 and the gutter to 16 ([13 §9](../13-design-system.md)).

## Analytics
| Event | When |
|---|---|
| `invite_shared` | Share sheet completes after **Invite** (`channel`) |
| `balance_viewed` | Fired on [Balance trace](balance-trace.md), not here |

## Accessibility
- Hero read as "You are owed three thousand four hundred rupees. Live. Group spent seventeen thousand rupees."
- Balance rows: "Rahul, ghost, not on Toli yet, owes one thousand rupees. Double-tap to trace." Kitty row: "Kitty cash with Rahul, three thousand rupees."
- Lime is never the only signal: sign + word ("gets back"/"owes") always shown; LOW and OVER have an icon and a word ([13 §2](../13-design-system.md)).
- `⋯` is labelled "Trip settings". FAB label: "Add expense".
- Tab bar items are tabs with "selected" state.

## Open questions / assumptions
- Recent rows open [Expense detail](expense-detail.md); **See all**, `⋯` and the kitty row are not in the UI reference (assumptions following [13](../13-design-system.md)).
- Invite button behaviour (share sheet vs preview): assumption above.
