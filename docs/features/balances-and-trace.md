# Feature · Balances and trace

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **PRD refs** | [F5][prd] (live balances, tappable derivation, notify on change > ₹1), §9.4 (balance formula), §5 principle 7 ("every number is explainable"), §8 (Balance), §11 (correctness guarantees), §17 (recompute ≤ 50 ms; money never by colour alone) |
| **Related** | Screens: [trip-home](../screens/trip-home.md) · [balance-trace](../screens/balance-trace.md) · [settle-up](../screens/settle-up.md) · [invite-web](../screens/invite-web.md) — Docs: [07 §7 balances, §9 explanations, §12 formatting, §13 invariants][engine] · [03 §8.3 `trip_balances`][db] · [06 §6][sync] · [13 §2, §9][ds] — Decisions: [D-006][d006] · [D-010][d010] — Features: [settle-up](settle-up.md) · [kitty](kitty.md) · [notifications](notifications.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Trip view vs settle view** ([D-022](../decisions/D-022-kitty-views-and-handover.md)): during the trip, the kitty is shown as "Kitty cash with {holder}", not folded into the holder's balance.
> - Trace line types added: hand-over, rounding ([D-021](../decisions/D-021-rounding-adjustment.md)), refunds (R1b).
> - Removed members stay at 0 ([D-030](../decisions/D-030-removed-members-locked.md)).
> - Balance-change notifications use `profiles.notify_threshold_major` (in major units of the trip currency).

## 1. Purpose

Opening a trip answers one question at once: **am I up or down?** Every member's balance is listed, and every balance can be **traced** line by line to the expenses and settlements that produced it.

## 2. User problem

"Why do I owe ₹1,200?" One unexplained number destroys trust in a money app. People also need to know, without doing maths, whether they should be paying or waiting to be paid.

## 3. Business goal

- **G5 / quality:** balance disputes < 2 per 1,000 trips. The trace is the main defence.
- **Engagement:** the live hero number is the reason to open the app every day of the trip.

## 4. User flow

1. Open a trip. The lime hero ticket says "**You are owed ₹3,400**" (or "You owe ₹1,200", or "You're all square"), with a **LIVE** label and "Group spent ₹6,000".
2. Below, the **Balances** card lists every member ("Tap to trace"): avatar, name ("Aditya (you)"), status ("Ghost · not on Toli yet" / "On Toli"), signed amount and a word ("gets back" / "owes" / "settled").
3. Tap a member → **Balance trace**: a member picker at the top, a lime card "Rahul owes **−₹1,000** · 4 lines add up to this number", then each line with its amount, then **Net**.
4. From Settle up, tapping a payment ("Neha pays Aditya · Room ₹1,000 + Cab ₹200") opens the same trace for the payer.
5. When someone edits or deletes an expense and your balance moves by more than ₹1, you get a notification ("Rahul changed *Dinner*: your share ₹600 → ₹450").

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| BT-1 | At the top of the trip, show the current user's net position in one line: "You are owed ₹3,400" / "You owe ₹1,200". | MUST | F5 |
| BT-2 | Show a per-member list with net balances, and the group's total spend. | MUST | F5 |
| BT-3 | Every balance is tappable to a derivation listing **every** contributing expense and settlement. | MUST | F5, §5.7 |
| BT-4 | Update optimistically and instantly on local edits; reconcile on sync. | MUST | F5 |
| BT-5 | Recompute correctly on edit or delete, and **notify affected members** when a change alters their balance by more than a threshold (default ₹1). | MUST | F5 |
| BT-6 | Σ of all member balances = 0 exactly, always. | MUST | §9.3, §11.1 |
| BT-7 | Recompute ≤ 50 ms for a 500-expense trip. | MUST | §17 |
| BT-8 | Money never shown by colour alone: sign + word + colour. Screen-reader labels on every amount. | MUST | §17 |
| BT-9 | Indian digit grouping (₹1,23,456). | MUST | §17 |

## 6. Business rules

### 6.1 The formula ([07 §7][engine], PRD §9.4)

```
balance(m) =  Σ base_payers(m)          expenses they paid
            − Σ base_shares(m)          their share of every expense
            + Σ kitty_contributions(m)
            + Σ settlements where m paid
            − Σ settlements where m received
            − kitty_remaining            only for the kitty holder (D-010)
```

- Positive = the group owes them ("gets back"). Negative = they owe the group ("owes"). Zero = "settled".
- Only the **current revision** of each non-deleted expense counts. Voided settlements and contributions don't count.
- All in the trip's base currency, as `bigint` minor units.

### 6.2 Hero line
| Balance | Label | Amount |
|---|---|---|
| > 0 | "You are owed" | `₹3,400` |
| < 0 | "You owe" | `₹1,200` (no sign; the label carries it) |
| = 0 | "You're all square" | `₹0` |

### 6.3 Group spent
Σ `base_amount_minor` of all non-deleted expenses, **including** kitty-paid ones, **excluding** settlements and kitty contributions (they move money, they don't spend it).

### 6.4 Trace lines ([07 §9][engine])
`explainBalance(member)` returns lines whose values add up **exactly** to the balance:

| Line | Sign | Subtitle |
|---|---|---|
| "Paid for Casa Anjuna" | + | "Day 1 · 14:10" |
| "Share of Casa Anjuna" | − | "4 people" |
| "Put ₹5,000 in the kitty" | + | "Kitty contribution" |
| "Paid Aditya" | + | "UPI · confirmed by payer" / "Marked as paid" |
| "Received from Neha" | − | "Settlement" |
| "Holding kitty leftovers" | − | holder only |

- Lines are in chronological order (proposed); the count shows "N lines add up to this number".
- Footer copy: "Plus means the group owes them. Minus means they owe the group. All balances on the trip add up to ₹0."
- For big trips, lines can be grouped by day with a day subtotal (proposed), still adding up exactly.

### 6.5 Change notifications
- After any `expense.edit` or `expense.delete` is applied, the server compares each member's balance before and after.
- Members whose balance moved by **more than their threshold** and who **aren't the person who made the change** get an `expense_changed` push (Expenses channel), batched per [notifications](notifications.md) digest rules. The threshold is per user: `profiles.notify_threshold_minor`, default 100 (₹1) ([03 §3.1][db]). The push can carry **See split** and **Not me** actions; Not me opens the expense and only a confirmed `expense.edit` removes you ([04 §11][api]).
- New expenses notify through their own "stub" push, not this rule.
- Ghosts have no devices, so they aren't notified.

## 7. Data model

| Source | Use |
|---|---|
| Local SQLite (current revisions, payers, shares, settlements, contributions) | Every on-phone balance and trace is computed from these by `@toli/engine`; nothing is stored |
| `trip_balances` ([03 §8.3][db]) | Server cache `(trip_id, member_id) → balance_minor, as_of_seq`; updated in the same transaction as each op; used by the invite preview and notifications; rebuilt nightly by the audit |
| `expense_revisions` history | loaded on demand when a trace line is opened |

No new tables.

## 8. API requirements

- No dedicated endpoint: balances are computed locally from synced rows ([06][sync]).
- The server maintains `trip_balances` inside `POST /sync-push` and enforces the per-op zero-sum check ([06 §6][sync]).
- Invite web view uses `GET /invite-preview` / `/invite-member-view`, which read `trip_balances` ([04 §3][api]).
- Change notifications are queued after commit into `notification_outbox` ([03 §9][db]); payload `kind: "expense_changed"` ([04 §11][api]).

## 9. UI requirements

| Screen | Needs |
|---|---|
| [trip-home](../screens/trip-home.md) | Hero `TicketCard`: label + **LIVE**, amount (52/800), perforation, "Group spent **₹6,000**", **Settle up →**. Balances card: header "Balances · Tap to trace"; rows (avatar 34, name, status, mono signed amount, word). Positive amounts lime; others text colour. |
| [balance-trace](../screens/balance-trace.md) | Header "Balance trace"; member picker (one chip per member, active in lime); lime card "{name} {gets back/owes/is settled}", amount (48/800), "N lines add up to this number"; line list; **Net** row in lime mono; explanation footer. |
| Screen reader | "Rahul owes one thousand rupees", never "minus ₹1,000" ([13 §9][ds]) |

Signed display uses a true minus sign (U+2212) and `+` for positives ([07 §12][engine]).

## 10. States

| State | Display |
|---|---|
| No expenses | Hero "You're all square · ₹0"; balances list shows everyone "settled" (or hidden on the [empty-trip](../screens/empty-trip.md)) |
| Normal | as above |
| Pending changes | numbers already include local pending ops; no special marker on balances (rows show sync state) |
| After pull changes a number | the number **counts** to its new value (never fades; [13 §6.3][ds]) |
| Settled trip | everyone "settled", SETTLED stamp, "Everyone's square." (no recap in R1) |
| Web viewer | a single member's view ([invites-and-joining](invites-and-joining.md)) |

## 11. Edge cases

- **Kitty holder:** their trace includes "Holding kitty leftovers"; if the kitty is overspent, the line is positive ("Covered the kitty shortfall") ([kitty](kitty.md)).
- **Overpayment:** a settlement larger than the debt flips the sign; the trace shows it plainly.
- **Removed members** still appear in the trace of others (e.g. "Share paid by Jay (left)"), but not in the balances list (their balance is 0 by rule).
- **Multi-currency expense:** trace line shows the base amount with the original in the subtitle ("IDR 250,000 · rate frozen 13 Oct") ([multi-currency](multi-currency.md)).
- **Two-thousand-expense trip:** trace list virtualised; recompute stays within budget via per-revision memoisation ([02 §7][arch]).
- **Pull arrives while the trace is open:** lines and total update together (never a total that doesn't match the lines).
- **Notification threshold for a non-INR base currency:** `notify_threshold_minor` is a single per-user number, but minor units differ by currency (100 is ₹1 but ¥100). Proposal: treat the default as 1 major unit of the trip's base currency via the currency table.
- **Balance of exactly ±1 paisa** from FX rounding: shown as "₹0.01"; not hidden.

## 12. Permissions

| Action | Organiser | Member | Ghost | Web viewer |
|---|---|---|---|---|
| See all balances | ✓ | ✓ | — | ✓ (summary via invite) |
| Trace any member | ✓ | ✓ | — | Only the picked member's lines |
| Receive change notifications | ✓ | ✓ | — (no device) | — |

## 13. Offline behaviour

Everything is computed on the phone from SQLite, so balances and traces work fully offline and include the user's own unsynced changes. Changes made by others appear after the next pull.

## 14. Sync behaviour

- The engine is deterministic: replaying the same ops in `seq` order gives identical balances on every phone ([07 §13.8][engine]).
- The server rejects any op that isn't zero-sum by itself, so the invariant can't break ([07 §7][engine]).
- A nightly job recomputes every trip from scratch and compares with `trip_balances`; any difference is a P0 incident (PRD §9.3).

## 15. Analytics

| Event (PRD §19) | When | Properties |
|---|---|---|
| `balance_viewed` | trace opened | (proposed: `own: bool`, `line_count`) |
| `balance_dispute_reported` | "Something looks wrong" on the trace (proposed entry point) | `trip_id`, `member_id` |

## 16. Error handling

- A local recompute can't fail for valid data; if the engine throws (corrupt row), show "We couldn't work out this balance. We've been told." and report to Sentry with the trip ID. Never show a partial number.
- Nightly audit mismatch: alert (P0), freeze nothing for users, investigate from `trip_ops`.

## 17. Testing

- **Invariants** ([07 §13][engine]): Σ balances = 0 for every generated trip state; trace lines sum exactly to the balance for every member; deleting an expense restores every balance.
- **Golden fixtures:** G1 (A +₹3,400, R −₹1,000, N −₹1,200, J −₹1,200), G3, G5 (kitty folding), G7 (delete restores).
- **Convergence:** G8 (three offline devices, 40 ops → identical balances).
- **Notification rule:** change of exactly ₹1 → no push; ₹1.01 → push; the actor never notified; digest applies.
- **Performance:** 500 expenses ≤ 50 ms; 2,000 expenses usable on a ₹15,000 Android.
- **Formatting:** ₹1,23,456; true minus; screen-reader strings in English and Hindi.

## 18. Future considerations

- Per-person analytics ("Aditya's share: ₹8,400 — 28% of trip"): R2, [budget](budget.md).
- Cross-trip balances for frequent co-travellers (Pro annual).
- In-trace "fix this" shortcuts (jump to the expense to edit).

## 19. Open questions

1. ~~Where is the ₹1 threshold configured?~~ Resolved: per user, `profiles.notify_threshold_minor` (default ₹1) ([03 §3.1][db]). The non-INR interpretation is in §11.
2. **Entry point for `balance_dispute_reported`:** the PRD tracks it but no screen has a "this looks wrong" action. Add one to the trace?
3. **Trace grouping for long trips:** flat list (prototype) or grouped by day?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[ds]: ../13-design-system.md
[d006]: ../decisions/D-006-append-only-money.md
[d010]: ../decisions/D-010-kitty-folding.md
