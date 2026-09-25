# Screen · Recorded payments

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (pending web payments with **Confirm** in R1b) |
| **Source** | **Assumption — not in UI reference; follows [13 Design system](../13-design-system.md).** Added because a recorded payment could only be undone from a 2.8-second Undo toast ([review U-3, M-1](../14-pre-development-review.md#8-ux-problems), [D-018](../decisions/D-018-r1a-r1b-scope.md)) |
| **Related** | [features/settle-up](../features/settle-up.md) · [settle-up](settle-up.md) · [balance-trace](balance-trace.md) · [trip-settings](trip-settings.md) · [unresolved-changes](unresolved-changes.md) · [03 §5.6 settlements](../03-database-schema.md) · [06 §4, §5](../06-syncing.md) · [07 §8.4](../07-calculation-engine.md) · [09 Permission matrix](../09-security.md#permission-matrix) · [D-021](../decisions/D-021-rounding-adjustment.md) · [D-023](../decisions/D-023-auto-settle-timing.md) · [D-024](../decisions/D-024-web-page-read-only-beta.md) |

---

## Purpose
**Why:** people record payments by mistake, twice, or with the wrong amount. They need to see every recorded payment and undo the wrong one, at any time.
**What:** a list of every settlement on the trip (Mark as paid, UPI, rounding adjustments and, in R1b, pending web payments), with filters and **Void**.
**How:** settlements are append-only. **Void** never deletes; it writes `settlement.void`, and balances go back to what they were ([D-006](../decisions/D-006-append-only-money.md)).

## User goal
"I marked Rahul's ₹1,000 twice. Undo one," or "did Neha really pay me?"

## Entry points
| From | Trigger |
|---|---|
| [Settle up](settle-up.md) | **Recorded payments** link (open and settled states) |
| [Balance trace](balance-trace.md) | Tap a settlement line (**"Paid {Name}"**, **"Received from {Name}"**, **"Rounding · ₹0.33"**) → opens here with that row's sheet open |
| [Trip settings](trip-settings.md) | **Recorded payments** row |
| Push `payment_to_confirm` (R1b) | Opens here filtered to **Pending** |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | `‹` back |
| [Balance trace](balance-trace.md) | **See {Name}'s balance** in the row sheet |

## UI structure
**Header** (`Header`): back · title **"Recorded payments"** · subtitle **"Goa Weekend · 5 recorded"**.

**Filter chips** (`Chip` row): **All** (default) · **Involving me** · **Pending** (R1b; only shown when there are some) · **Voided**. Plus **Person ▾** (payer or payee).

**Intro** (`type.caption` muted): **"Toli never sees payments. These are what people recorded."**

**List** (`Card`, `radius.card`, newest first):
| Row type | Title | Sub | Right |
|---|---|---|---|
| Recorded payment | **"Rahul → Aditya"** | **"Cash · recorded by Rahul · Sun 13 Oct 21:40"**; with a note: **"· “for the villa”"** | `type.mono` **"₹1,000"** |
| UPI | **"Neha → Aditya"** | **"UPI · confirmed by Neha · Mon 14 Oct"** | **"₹1,233.33"** (paise shown when not whole) |
| Rounding (`method = rounding`) | **"Jay → Aditya"** | **"Rounding · written off when the trip closed"** | **"₹0.33"** |
| Pending web payment (R1b) | **"Neha → Aditya"** | `type.label` `color.warning` + `WarningCircle` **"PENDING · WAITING FOR ADITYA"** | **"₹1,200"**. For the payee, two buttons in the row: primary **"Confirm"** · ghost **"Not received"** |
| Voided | **"Rahul → Aditya"** | **"Voided by Aditya · “recorded twice”"** | amount struck through, `color.textMuted` |
| Unsynced | as above | lime `type.label` **"SAVED ON PHONE · WILL SYNC"** | |

**Row sheet** (tap a row; `Sheet`):
- `type.subhead` **"Rahul paid Aditya"** · `type.amountM` **"₹1,000"**.
- Details (`type.caption`): method · note · **"Recorded by Rahul · Sun 13 Oct 21:40"** · for web payments **"Confirmed by Aditya · Mon 14 Oct"**.
- Honest line (`type.small` muted): **"This is based on what Rahul recorded. Toli never sees the payment itself."** ([09 §12](../09-security.md))
- Actions: ghost **"See Rahul's balance"** · `danger` **"Void payment"** (only if the [permission matrix](../09-security.md#permission-matrix) allows you, and the row isn't already voided).

**Void confirm sheet:** **"Void this payment?"** / **"Rahul will owe Aditya ₹1,000 again. Everyone on the trip sees this in the history."** · field **"Reason (optional)"** · `danger` **"Void payment"** / **"Cancel"**. On a settled trip the body adds **"The trip goes back to settling."** ([D-023](../decisions/D-023-auto-settle-timing.md)).

Components: `Screen`, `Header`, `Chip`, `Card`, `Row`, `Sheet`, `Button` (`primary`, `ghost`, `danger`), `Icon`, `Toast`.

## Permissions
Who may void a payment or confirm a pending one is defined only in the **[permission matrix](../09-security.md#permission-matrix)** ([D-031](../decisions/D-031-permission-matrix.md)). If you may not, the **Void payment** button is hidden and the sheet shows **"Only the person who recorded it, or an organiser, can void this."**

## States
| State | Behaviour |
|---|---|
| Loading | n/a (local). |
| Empty | **"No payments recorded yet."** + `type.caption` **"When someone marks a payment as paid, it shows up here."** |
| Populated | As above. |
| Error | `settlement.void` rejected → the row comes back and the item goes to [Unresolved changes](unresolved-changes.md). `removed_member_balance`: **"This changes Jay's balance. Add Jay back first."** ([D-030](../decisions/D-030-removed-members-locked.md)). `not_allowed`: **"Only the person who recorded it, or an organiser, can void this."** |
| Offline | List readable; **Void** works (queued; the row shows **"SAVED ON PHONE · WILL SYNC"**). **Confirm** (R1b) also queues. |
| Syncing | New or voided rows from other phones appear in place. |
| Success | Toasts: **"Payment voided"**; **"Confirmed · counts in balances now"** (R1b); **"Marked as not received"** (R1b). |
| Disabled | Voided rows have no actions. |
| Partial data | Removed or anonymised members show their stored name (**"Former member"**). |

## Interactions
| Gesture | Result |
|---|---|
| Tap a filter chip | Filters the list. |
| Tap a row | Row sheet. |
| **Void payment** → confirm | Writes `settlement.void`. |
| **Confirm** (R1b, payee) | Writes `settlement.confirm`; the payment now counts in balances. |
| **Not received** (R1b, payee) | Confirm sheet **"Mark as not received? Neha will still owe you ₹1,200."** → writes `settlement.void` with reason `not_received` (Assumption). |
| Back | Previous screen. |

## Data
| UI | Source (SQLite) |
|---|---|
| Rows | `settlements` (`from_member_id`, `to_member_id`, `amount_minor`, `method`, `note`, `recorded_by_user`, `recorded_at`, `voided_at`, `voided_by_user`, `void_reason`, `pending_confirmation`, `confirmed_at`, `confirmed_by_user`) |
| Names | `trip_members.display_name` (recorder via `user_id`) |
| Pending tag | `pending_confirmation = true` and not voided (R1b) |
| Unsynced tag | `local_state = pending` |

## API / Database
| Action | Op ([06 §4](../06-syncing.md)) |
|---|---|
| Void | `settlement.void { id, reason }` |
| Confirm (R1b) | `settlement.confirm { id }` |
| Not received (R1b) | `settlement.void { id, reason }` |

Rounding rows are written only by the server when a trip closes (`trip.close`, [D-021](../decisions/D-021-rounding-adjustment.md)). They are ordinary settlements and can be voided like any other ([07 §8.4](../07-calculation-engine.md)).

## Edge cases
- **Voiding on a settled trip:** allowed by the settled-trip allow-list ([06 §5](../06-syncing.md)); the trip moves back to `settling`.
- **Voiding a rounding row:** the few paise come back; the trip needs closing again.
- **Void twice (two phones):** the second is a no-op ([06 §5](../06-syncing.md)).
- **Duplicate settlement:** the later recorder sees **"Already recorded?"** on Settle up ([06 §5](../06-syncing.md)); **Same one, remove mine** voids it, and it shows here as voided.
- **Pending payments don't change balances** until confirmed ([03 §5.6](../03-database-schema.md)); Settle up still lists the payment as open.

## Analytics
Proposed (not in PRD §19): `settlement_voided` (`method`, `on_settled_trip`), `settlement_confirmed` (R1b).

## Accessibility
- Rows read "Rahul paid Aditya one thousand rupees, cash, recorded by Rahul, Sunday 13 October." Voided rows add "voided" in words, not only strikethrough.
- The pending tag has an icon and a word, never colour alone ([13 §2](../13-design-system.md)).
- Void confirmation traps focus; **Cancel** comes first in focus order.

## Open questions / assumptions
- **Assumption:** the whole screen and copy.
- **Assumption:** **Not received** is a void with a reason; [04 §5.1b](../04-api-schema.md) says the payee "rejects it (`settlement.void`)".
