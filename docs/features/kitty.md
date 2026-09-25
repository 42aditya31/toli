# Feature · Kitty (common pot)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **PRD refs** | [F7][prd] (kitty), §8 (Kitty), §3 defensibility (a), §14 (accounting construct only; explicit UI language), §21 (users expect the kitty to hold money), Appendix A.2 #4 |
| **Related** | Screens: [kitty](../screens/kitty.md) · [trip-home](../screens/trip-home.md) · [add-expense](../screens/add-expense.md) · [settle-up](../screens/settle-up.md) · [empty-trip](../screens/empty-trip.md) — Docs: [07 §6 kitty, §7 balances, §8.2 direct mode][engine] · [03 §4.1 `trips.kitty_*`, §5.7 `kitty_contributions`][db] · [06 §4][sync] · [04 §11 `kitty_low`][api] — Decisions: [D-010][d010] · [D-006][d006] — Features: [settle-up](settle-up.md) · [balances-and-trace](balances-and-trace.md) · [expenses](expenses.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Two views + hand-over** ([D-022](../decisions/D-022-kitty-views-and-handover.md)): during the trip, show "Kitty cash with {holder}". Changing the holder is the money op `kitty.handover` (**not** `trip.update`). It's append-only, shown in traces, and rejected on settled trips.
> - The "equal refund" override is **dropped** ([D-010](../decisions/D-010-kitty-folding.md)).
> - "Log ₹X each" needs a per-person confirm sheet. The **top-up suggestion is R1b**. LOW uses `color.warning`.

## 1. Purpose

Models how Indian groups actually handle trip cash: **everyone puts ₹5,000 into a pot on day one**, one person holds it, and fuel, tolls and breakfasts are paid from it until it runs out. Toli keeps count of who put in what, what was spent from the pot, what's left, and hands the leftovers back **in proportion to what each person put in**.

**Toli never holds the money.** The cash stays with whoever holds the pot. "Toli only keeps count."

## 2. User problem

- "Did Jay put his ₹5,000 in or not?"
- "The pot ran out on day three and nobody noticed."
- "Neha only put in ₹3,000, so she shouldn't get the same refund as Aditya."

## 3. Business goal

- A differentiator no competitor supports natively (PRD §3).
- Reflects real behaviour, so trips that use cash still end with correct balances (G5).
- Must never look like a wallet: regulatory and trust risk (PRD §14, §21).

## 4. User flow

**Start a kitty**
1. Trip home (empty-trip tip "Start a kitty if you're pooling cash") or trip menu → **Start a kitty**.
2. Pick **who holds the cash** (required; default: the current user).
3. Optionally set a **target per person** ("₹5,000 each"). Optionally change the low warning (default 20%).
4. Log contributions: tap each person → amount (defaults to the target) → **Log**. Or **Everyone put in ₹5,000** (one tap, then untick anyone who didn't).

**Spend from it**
1. Add expense → **PAID BY** → cycle to **Kitty**.
2. Split as normal (participants and split rule still apply).
3. Save → toast "₹1,200 paid from the kitty".

**Watch it**
1. Trip home shows the **Kitty** tile: "₹3,000 left", a progress bar and a flag (**OK** / **LOW**).
2. The kitty screen: ring with remaining; Put in / Spent from pot / Left %; "Who put in" with each person's amount and "→ refund"; "Paid from the pot" list.

**Running low**
1. When remaining ≤ 20% of total contributions: card "**Running low: 14% left**" — "At today's pace the pot needs ₹650 more from each person to last 2 more days." → **Log ₹650 each**.
2. Everyone gets a Trip updates notification (once per time it crosses the threshold). Its **Top up** action opens the Kitty screen; nothing is logged until someone confirms.

**At the end**
1. Settle up shows "Kitty leftovers (₹3,000) are handed back by Rahul in proportion to contributions."
2. The holder appears as a payer in the normal payment list ("Rahul pays Jay ₹400"), because the holder's balance includes the cash they're holding.

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| KT-1 | Enable a kitty per trip, with a target per-person contribution or free-form contributions. | MUST | F7 |
| KT-2 | Record each member's contribution individually, including unequal, partial and late top-ups. | MUST | F7 |
| KT-3 | Any expense can be **paid from the kitty**. It still has participants and a split rule. | MUST | F7 |
| KT-4 | Show a live kitty balance — contributed, spent, remaining — prominently. | MUST | F7 |
| KT-5 | Warn when below a threshold (default 20% of total contributions) and offer "top-up needed: ₹X each". | MUST | F7 |
| KT-6 | At settlement, fold the kitty into normal balances; leftovers refunded **in proportion to contributions**. | MUST | F7 |
| KT-7 | Unequal contributions and unequal spending need no special cases (contributions are payments). | MUST | F7 |
| KT-8 | UI, ToS and store listing say plainly that Toli doesn't hold funds. | MUST | §14, §21 |
| KT-9 | A **holder** is required whenever the kitty is on. | MUST | [07 §6][engine], [03 §4.1][db] |

## 6. Business rules

### 6.1 The model ([07 §6][engine], [D-010][d010])
- The kitty is a **virtual member K**.
- A contribution `c` by member `m`: `m` paid `c`; K received `c`.
- A kitty-paid expense: K paid it; participants owe their shares as normal.
- `kitty_remaining = Σ contributions − Σ kitty-paid expenses` (base currency).
- **Folding:** at balance time, K's balance (`−kitty_remaining`) is added to the **holder's** balance, because the holder physically has the cash. So the holder's balance goes down by the cash they hold, and the normal settle-up pays it back out.
- Each contributor effectively gets back `remaining × c_i / C`. **Proportional by construction.** No special refund code.
- Σ balances = 0 always.

**Worked fixture (PRD A.2 #4):** contributions A ₹5,000, R ₹5,000, N ₹3,000, J ₹2,000 (C = ₹15,000); ₹12,000 spent from the kitty; ₹3,000 left. Implied refunds: A ₹1,000, R ₹1,000, N ₹600, J ₹400. The kitty screen shows these as "→ ₹1,000" lines.

### 6.2 Refund display
The "→ refund" on each row is `allocate(remaining, contributions, member_ids, trip_id + ":kitty")` — display only; the real money moves through settle-up.

### 6.3 Low kitty
- Low when `remaining ≤ kitty_low_bp × C / 10000` (default 2000 bp = 20%).
- The tile flag shows **LOW**; the kitty screen shows the Running low card.
- A `kitty_low` push goes to trip members **once per crossing** (if it's topped up above the line and drops again, it can fire again).
- `kitty_depleted` analytics event when `remaining ≤ 0`.

### 6.4 Top-up suggestion ([07 §6][engine])
Inputs: today, end date, kitty spend so far, days elapsed, active member count.
```
daily = kitty_spent / max(1, days_elapsed)
need  = max(0, daily × days_left − remaining)
each  = ceilTo(need / members, ₹50)
```
- "Active members" = non-removed members who have contributed at least once (proposed; see Open questions).
- If there's no end date, `days_left` is unknown: show "Running low" without a suggested amount, plus **Log a top-up**.
- If `each = 0`, don't show a suggestion.
- **Log ₹650 each** opens a confirm sheet listing everyone at ₹650 with toggles ("Did everyone hand ₹650 to Rahul?"), then writes one `kitty.contribute` per ticked person. (The prototype logs it for everyone silently; a confirm keeps records honest.)

### 6.5 Overspent kitty
If kitty-paid expenses exceed contributions, `remaining` goes negative and the holder's balance goes **up** (they covered the gap). Allowed, never blocked. Warning: "Kitty is ₹800 short — Rahul covered it."

### 6.6 Other rules
- **Kitty-only payer:** an expense paid from the kitty can't also have person payers in v1 ([07 §5.2][engine]).
- **Currency:** contributions are in the trip base currency. Kitty-paid expenses in another currency are converted with their frozen rate.
- **Contributions are immutable.** Fixing one = void it (`kitty.void`) and log a new one.
- **Changing the holder** (`trip.update kitty_holder_member_id`): means the cash physically changed hands. Confirm: "Did Rahul hand the pot (₹3,000) to Neha?" The folding moves to the new holder from then on.
- **Removing the holder** is blocked while the kitty is on; change the holder first.
- **Turning the kitty off:** allowed only when there are no non-voided contributions or kitty-paid expenses (proposed). Otherwise hidden.
- **Direct mode** ([07 §8.2][engine]): kitty-paid shares are owed to the holder; contributions are owed by the holder to the contributor; then netted per pair.

## 7. Data model

| Table ([03][db]) | Columns |
|---|---|
| `trips` | `kitty_enabled`, `kitty_holder_member_id` (required when enabled), `kitty_target_minor` (per person), `kitty_low_bp` (default 2000) |
| `kitty_contributions` | `id`, `trip_id`, `member_id`, `amount_minor` (> 0, trip currency), `recorded_by_user`, `recorded_at`, `voided_at`, `voided_by_user`, `op_id`, `last_seq` |
| `expense_revisions` | `paid_from_kitty = true` (no `expense_payers` rows) |

## 8. API requirements

| Op / endpoint | Source | Notes |
|---|---|---|
| `trip.update` | [06 §4][sync] | kitty settings: enabled, holder, target, low threshold |
| `kitty.contribute` | [06 §4][sync] | member, amount; money, append-only |
| `kitty.void` | [06 §4][sync] | id |
| `expense.create` / `edit` | [06 §4][sync] | `paid_from_kitty` |
| Push `kitty_low` | [04 §11][api] | progress-bar style ([notifications](notifications.md)); action `top_up` opens the Kitty screen with the suggested top-up. It never logs a contribution by itself |

## 9. UI requirements

| Screen | Needs (reference copy) |
|---|---|
| [kitty](../screens/kitty.md) | Header "Kitty" + "The common pot · held by Rahul"; 140 px ring with remaining; "Put in" / "Spent from pot" / "Left %"; Running low card with **Log ₹X each**; "Who put in" (name, amount "→ refund", bar) with "Refund at settle-up"; "Paid from the pot" list; footer: "Toli only keeps count. The cash stays with whoever holds the pot. Leftovers are returned in proportion to what each person put in." |
| [trip-home](../screens/trip-home.md) | Kitty tile: "Kitty", flag **OK**/**LOW**, "₹3,000 left", 6 px bar |
| [add-expense](../screens/add-expense.md) | PAID BY cycles to **Kitty**; toast "₹X paid from the kitty" |
| [settle-up](../screens/settle-up.md) | "Kitty leftovers (₹3,000) are handed back by Rahul in proportion to contributions." |
| Start-kitty sheet | holder picker, target, "Everyone put in ₹5,000", the "Toli only keeps count" line |

**Never** use "wallet", "balance in your account", "deposit", "withdraw" or "transfer to kitty". Say "put in", "pot", "held by".

## 10. States

| State | Display |
|---|---|
| Off | tile hidden; empty-trip tip |
| On, nothing in | "₹0 left" and prompt to log contributions |
| Healthy | flag OK |
| Low | flag LOW + Running low card + one push |
| Empty (remaining = 0) | "The pot is empty" |
| Overspent | "Kitty is ₹800 short — Rahul covered it." |
| Settled trip | read-only; leftovers handled |

## 11. Edge cases

- **Late top-up** by a member who joined late: just another contribution.
- **Member contributes nothing but eats from the kitty:** they owe their shares; the others get more back. Falls out of the model.
- **Holder also contributes:** normal; their contribution and the folded leftovers both count.
- **Voiding a contribution after spending:** remaining drops (may go negative); balances update; show the overspent note if needed.
- **Kitty expense deleted:** remaining goes back up exactly.
- **Top-up with no end date or after the end date:** no suggested amount (days_left ≤ 0).
- **Kitty in a trip with non-INR base currency:** works the same; amounts in base currency.
- **Two phones log the same contribution offline:** both are saved (not a conflict); proposed: reuse the expense duplicate rule (same member, same amount, within 10 minutes, different recorder) to prompt.
- **Holder changed to a ghost:** allowed (someone is holding cash for a person not on the app).

## 12. Permissions

| Action | Organiser | Member | Ghost | Web viewer |
|---|---|---|---|---|
| Start / configure the kitty | ✓ | ✓ (proposed) | — | — |
| Change the holder | ✓ | the current holder (proposed) | — | — |
| Log a contribution (for anyone) | ✓ | ✓ | — (others log for them) | — |
| Void a contribution | ✓ | the recorder (proposed) | — | — |
| Pay an expense from the kitty | ✓ | ✓ | — | — |
| See the kitty | ✓ | ✓ | — | Not in the invite preview today |

## 13. Offline behaviour

Fully offline: contributions and kitty-paid expenses are normal queued ops; remaining, refund lines, low warning and top-up are computed on the phone. The `kitty_low` push is sent by the server after sync.

## 14. Sync behaviour

- Contributions and voids are append-only money ops; no field conflicts.
- Kitty settings (`trip.update`) are field-level last-write-wins; two holder changes → last one received wins.
- The server re-checks that a holder exists when the kitty is on, and that each kitty op is zero-sum (contribution: member +c, K −c).

## 15. Analytics

| Event (PRD §19) | When |
|---|---|
| `kitty_enabled` | kitty turned on |
| `kitty_topped_up` | contributions logged after the first round (proposed: `via_suggestion: bool`, `member_count`) |
| `kitty_depleted` | remaining ≤ 0 |

## 16. Error handling

| Case | Message |
|---|---|
| No holder picked | "Pick who's holding the cash." |
| Remove the holder | "Rahul holds the kitty. Pick a new holder first." |
| Kitty + person payer on one expense | "An expense is paid either from the kitty or by people, not both (for now)." |
| Contribution of ₹0 | Save disabled |
| `trip_settled` | "This trip is settled. Reopen to edit." |

## 17. Testing

- **Golden fixture G5** ([07 §14][engine]): unequal contributions, ₹12,000 spent across mixed participant sets, ₹3,000 left → implied refunds 1,000/1,000/600/400; Σ balances = 0; direct and simplified both correct.
- **Property tests:** random contributions and kitty spends → Σ balances = 0; refunds proportional within 1 paisa; overspent case makes the holder positive; changing the holder moves exactly `remaining` between the two.
- **Top-up formula:** days elapsed 0/1/n, no end date, past end date, `each` rounded up to ₹50.
- **Low threshold:** fires once per crossing; custom `kitty_low_bp`.
- **Copy review:** legal review of kitty wording before R1 ships (PRD §21).

## 18. Future considerations

- Kitty and person payers combined on one expense.
- Several pots per trip (e.g. "fuel pot" and "food pot").
- Currency pots for international trips (a USD pot on an INR trip).
- A group-chosen refund rule, if OQ-E1 is reversed.

## 19. Open questions

1. **"Unless the group overrides this":** PRD F7 lets the group override proportional refunds. With folding ([D-010][d010]), an equal refund would move money between people. See OQ-E1 in [01](../01-overview.md#open-questions); working assumption: **no override in v1**.
2. **Top-up formula:** the prototype computes `ceil(max(0, spent − remaining) / 4 / 50) × 50` ("to last 2 more days"), which differs from [07 §6][engine]. 07 is canonical; confirm the copy ("to last until Tue 15 Oct") and who counts as a member.
3. **Who can configure the kitty and change the holder?** OQ-P12 in [01](../01-overview.md#open-questions) doesn't list kitty settings; by analogy (collaborative edits, recorder-or-organiser voids) the table in §12 is the proposal.
4. **Should the invite preview show the kitty?** Participants may want to see "you put in ₹3,000".
5. **Turning the kitty off** once used: never, or only when every record is voided?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[d006]: ../decisions/D-006-append-only-money.md
[d010]: ../decisions/D-010-kitty-folding.md
