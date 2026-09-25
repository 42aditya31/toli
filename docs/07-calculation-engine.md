# 07 · Calculation Engine (`@toli/engine`)

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §8, §9, §11, F3, F4, F7, F8, F10, Appendix A |
| **Related** | [03 Database](03-database-schema.md) · [06 Syncing](06-syncing.md) · [Decisions](decisions/README.md) |

This document defines **all the money maths in Toli**. If the code and this document disagree, one of them is a bug. Fix it and update both.

---

## 1. Rules that never bend

1. **No floating point for money, anywhere.** Every amount is a `bigint` in **minor units** (paise for INR, cents for USD, whole yen for JPY) plus an ISO 4217 currency code.
2. **The engine is pure.** Inputs go in, outputs come out. No I/O, no database, no network, no `Date.now()`, no randomness, no global state. "Today" is always passed in as an argument.
3. **One engine, two places.** The exact same package runs on the phone (for instant results) and in the Supabase Edge Function (to verify). They can never disagree.
4. **Deterministic.** The same inputs always give the same outputs, whatever order the input lists arrive in. The engine sorts its inputs by ID before calculating.
5. **Every number is explainable.** Every balance can be broken down into the lines that produced it (§9).

---

## 2. The pipeline

```
Expense (amount + currency)
   ↓  freeze FX rate (§4)
Base amount (trip currency)
   ↓  split mode → integer shares in expense currency (§5)
   ↓  convert shares + payers to base currency with allocate() (§3)
Per-member shares & payments (base currency)
   ↓  + settlements, + kitty contributions (§6, §7)
Balances (sum = exactly 0)
   ↓  simplify (§8)
Derived payments ("Neha pays Aditya ₹1,200")
```

---

## 3. The one rounding function: `allocate()`

All division of money goes through **one function**. Nothing else in the codebase is allowed to divide money.

```ts
allocate(total: bigint, weights: bigint[], keys: string[], seed: string): bigint[]
```

- `total`: the amount to divide, in minor units (≥ 0).
- `weights`: one non-negative integer per recipient. At least one weight must be above 0.
- `keys`: one stable ID per recipient (usually the member ID).
- `seed`: a stable ID for the thing being divided (usually the **expense's logical ID**, which never changes across edits).

**Algorithm**

1. `W = Σ weights`.
2. For each recipient: `exact_i = total × w_i / W` (a rational number). `floor_i = ⌊total × w_i / W⌋`, computed with integer division.
3. `R = total − Σ floor_i`. R is always smaller than the number of recipients with weight > 0.
4. Give **one extra minor unit** to each of R recipients, choosing in this order:
   1. largest fractional remainder first (`(total × w_i) mod W`, compared as integers);
   2. on a tie, lowest `fnv1a32(seed + "|" + key_i)` (unsigned 32-bit);
   3. on a still-equal hash, lowest `key_i` by string comparison.
5. Recipients with weight 0 always get 0.

**Why this rule**
- **Always sums exactly to the total.** No paisa is created or lost.
- **Deterministic:** the phone and the server always agree.
- **Stable:** editing an expense's description doesn't reshuffle paise, because the seed is the expense's logical ID.
- **Fair overall:** the hash changes per expense, so no one person always gets the extra paisa.
- **Most accurate:** ordering by largest remainder keeps each share within 1 minor unit of its exact value.

> The PRD (§9.3) orders only by hash. Adding "largest remainder first" is a refinement: it gives identical results for equal splits and more accurate results for weighted ones. See [D-005](decisions/D-005-rounding-rule.md).

**FNV-1a 32-bit** (pure TypeScript, no crypto): start at `2166136261`. For each UTF-8 byte: `hash ^= byte`, then `hash = (hash × 16777619) mod 2³²`.

**Fixture (PRD A.2 #1):** ₹1,000 = 100000 paise split 3 ways. Floors are 33333 each, R = 1, and the remainders are equal, so the hash decides who gets the extra paisa. Result: one of **33334 / 33333 / 33333**, summing to exactly 100000.

---

## 4. Currency and exchange rates

### 4.1 Currency table
- An ISO 4217 table lives inside the engine: code → minor-unit exponent. INR = 2, USD = 2, JPY = 0, KWD = 3, IDR = 2 (per ISO; displayed without decimals), VND = 0.
- The exponent always comes from this table. Never assume 2.

### 4.2 Rate format
A rate means **base-currency minor units per 1 expense-currency minor unit**.

- **Stored** as a decimal string with at most **12 significant digits** (`fx_rate` `numeric(30,15)`). Cross rates are rounded half-up to 12 significant digits **before** freezing, so the fraction can never overflow ([review DB-6](14-pre-development-review.md#11-database-problems)).
- **Used** by the engine as the exact fraction `rate_num / rate_den` parsed from that string (both `bigint`, den > 0).

Example: 1 IDR = 0.0053 INR, both with exponent 2. The rate in minor units is also 0.0053, stored as `"0.0053"` and used as `53 / 10000`.

```
base_amount = roundHalfUp(amount × rate_num / rate_den)
```

`roundHalfUp` rounds .5 away from zero; amounts are never negative here.

**Too small to convert:** if `amount > 0` but `base_amount = 0` (e.g. 1 VND on an INR trip), the expense is **rejected** with "This is less than ₹0.01 in INR". Every saved expense has `base_amount ≥ 1`.

### 4.3 Where the rate comes from
1. **Default:** the server fetches daily reference rates once a day (Frankfurter, fallback fawazahmed0) and stores them in `fx_rates` against one pivot currency. Phones sync this table.
2. The cross rate is `rate(exp→base) = (base per pivot) / (exp per pivot)`, adjusted by `10^(exp_base − exp_expense)`. It's computed from the decimal strings as exact fractions.
3. **Manual override:** the user types "1 USD = 83.12 ₹". The engine turns the decimal string into a fraction (`8312/100`, then adjusted for minor units).
4. **Frozen:** the rate is saved on the expense when it's created (`fx_rate` as a decimal string, `fx_source`, `fx_rate_date`). It is **never recalculated later**.
5. **If the currency itself is edited:** use the cached rate for the expense's original `spent_at` date, or a manual override. Market movement never changes an old expense.
6. **Same currency:** rate = `1/1`, so the conversion is an exact identity.

### 4.4 Convert once, at the end
All split maths runs in the **expense currency** first, producing integer shares and payer amounts. Then the whole vector converts to base currency with one call:

```
base_shares = allocate(base_amount, shares_in_expense_ccy, member_ids, expense_id)
base_payers = allocate(base_amount, payer_amounts_in_expense_ccy, payer_ids, expense_id + ":payers")
```

This guarantees `Σ base_shares = Σ base_payers = base_amount` exactly, in any currency.

---

## 5. Split modes

Every mode produces **one integer share per participant, in the expense currency**, summing exactly to the expense amount. Participants are always an explicit list (defaulting to everyone active on that date). They're never inferred.

| Mode | User enters | How shares are computed | Validation |
|---|---|---|---|
| **Equal** | participants | `allocate(amount, [1,1,…])` | ≥ 1 participant |
| **Selected-equal** | a subset of participants | same as Equal, over the subset (Equal with some unticked) | ≥ 1 participant |
| **Exact** | an amount per person | used as entered | `Σ = amount`, else show "₹120 unassigned" or "₹50 too much" |
| **Percentage** | basis points per person (1% = 100 bp, so 2 decimals) | `allocate(amount, bp)` | `Σ bp = 10000`, else show "5% unassigned" |
| **Shares** | an integer weight per person (≥ 1) | `allocate(amount, weights)` | ≥ 1 participant |
| **Adjustment** | an add-on per person (≥ 0) | `rest = amount − Σadd`; `share_i = allocate(rest, 1s)_i + add_i` | `Σadd ≤ amount` |
| **Itemised** | line items with assignees, plus extras | §5.1 | items + extras = total |

**"Distribute the remainder equally"** (the one-tap fix in the UI) runs `allocate(unassigned, 1s)` over the included participants and adds the result to their entered values.

**Amount rules:**
- **Zero** is never saved ("Type an amount first").
- **Refunds** ([D-029](decisions/D-029-refund-expense.md), R1b) are stored with a **positive** amount and `is_refund = true`. The engine computes shares and payers exactly as normal, then **negates both** before balances. So the payers "received" the refund, and each participant gets back their share.
- There are no negative adjustments in v1.

**Release note ([D-018](decisions/D-018-r1a-r1b-scope.md)):** R1a has Equal, Selected-equal, Exact, Percent and Shares. Adjustment and Itemised arrive in R1b. The engine implements all seven from day 1.

**Removed members** ([D-030](decisions/D-030-removed-members-locked.md)) can't be given a new share or payment. Any revision that would change a removed member's balance is rejected (`removed_member_balance`).

### 5.1 Itemised bills (receipt scan)
Inputs: line items `{ amount, assignees[] }` and extras `{ kind: tax | service | tip | discount | round_off, amount }`. A discount is subtracted. `round_off` (the bill's own rounding line) may be positive or negative. Its absolute value is allocated by subtotals like other extras, then added or subtracted by its sign.

1. **Item split:** each item goes equally to its assignees: `allocate(item.amount, 1s, assignees, expense_id + ":item:" + item_id)`. It uses the item's own **ID**, not its position, so reordering items never reshuffles paise.
2. **Subtotal per person** = the sum of their item pieces.
3. **Extras follow subtotals, not heads** (PRD F4): `allocate(Σ positive extras, subtotals, …)` minus `allocate(Σ discounts, subtotals, …)`.
4. **Share** = subtotal + extras share − discount share.
5. **Check:** Σ items + Σ extras − Σ discounts must equal the expense amount. If the scanned total doesn't match, the draft shows the difference and the user fixes it. We never save a mismatch.

### 5.2 Multiple payers
- An expense has one or more payers `{ member, amount }` in the expense currency. `Σ payer amounts = amount`, validated.
- A payer doesn't have to be a participant.
- The **kitty** can be the only payer (`paid_from_kitty = true`). It can't be combined with people in v1.

---

## 6. Kitty (common pot)

The kitty is **only an accounting record**. No money ever passes through Toli (PRD §14).

**Model:** the kitty is a virtual member, `K`.
- A **contribution** of `c` by member `m` counts as: `m` paid `c`, and `K` received `c`.
- An **expense paid from the kitty** counts as: `K` paid the expense, and the participants owe their shares as normal.
- `kitty_remaining = Σ contributions − Σ kitty-paid expenses`.

**Two views ([D-022](decisions/D-022-kitty-views-and-handover.md)):**

| View | Used on | Kitty shown as |
|---|---|---|
| **Trip view** | Trip home, balance trace, Kitty screen | a separate line **"Kitty cash with Rahul: ₹3,000"** (= `−K`'s balance). The member balances do **not** include it. Members + the kitty line sum to 0 |
| **Settle view** | Settle up and derived payments | **folded**: the holder's balance absorbs `K`'s balance (below) |

On day 1, before any spending, the trip view shows Aditya "gets back ₹5,000" and "Kitty cash with Rahul ₹15,000". It **doesn't** show Rahul "owes ₹10,000", which is the misleading number the old single view produced.

**Folding (settle view):** the kitty's balance belongs to the **kitty holder**, the member physically holding the cash, who is required whenever the kitty is on. The holder's balance absorbs `K`'s balance, which is `−kitty_remaining`, meaning the holder is holding the group's leftover cash.

**Changing holder:** only through the money op `kitty.handover { from, to, remaining_minor }`. It's append-only, shown in the trace as "Kitty cash handed to Neha · ₹3,000", and rejected on settled trips. For folding, each part of the kitty balance belongs to whoever held it after the latest hand-over. The engine replays the hand-overs in order, so the remaining cash is charged to the **current** holder, and each hand-over appears as a line in both holders' traces.

This is exactly "contributions are payments". The leftover cash goes back through the normal settle-up, and each contributor effectively gets back `remaining × c_i / C`, so **the refund is proportional to contributions by construction** (PRD F7).

**Fixture (PRD A.2 #4):** contributions A ₹5,000, R ₹5,000, N ₹3,000, J ₹2,000 (C = ₹15,000); spent ₹12,000; remaining ₹3,000.
- Implied refunds: A ₹1,000, R ₹1,000, N ₹600, J ₹400.
- The kitty screen shows these as "→ refund" explanation lines.
- Balances still sum to 0.

**Low kitty:** when `remaining ≤ threshold_bp × C / 10000` (default 2000 bp = 20%), the app warns.

**Top-up suggestion** (R1b; inputs: today, end date, kitty spend so far, days elapsed, active member count):
- `daily = kitty_spent / max(1, days_elapsed)`
- `need = max(0, daily × days_left − remaining)`
- `each = ceilTo(need / members, 5000 paise)`, rounded up to ₹50 as in the UI reference.

**Overspent kitty** (logged spends are more than contributions): `remaining` goes negative, and the holder's balance becomes positive (the holder covered the gap). The UI shows the warning "Kitty is ₹X short — Rahul covered it". This is allowed, not blocked.

> **Decided (OQ-E1, 2026-09-25):** the PRD F7 "group can override proportional refunds" option is **dropped**. With folding, each person's result is exactly what they paid minus what they used, so an "equal refund" would move money between people ([D-010](decisions/D-010-kitty-folding.md)).

---

## 7. Balances

For each member `m`, in base currency:

```
balance(m) =  Σ base_payers(m)          (expenses they paid)
            − Σ base_shares(m)          (their share of every expense)
            + Σ kitty_contributions(m)
            + Σ settlements where m paid
            − Σ settlements where m received
            − kitty_remaining            (only for the current kitty holder, settle view only)
```

(Refund revisions contribute with the opposite sign, see §5.)

- Positive: the group owes them. Negative: they owe the group.
- **Trip view** leaves out the last line and shows "Kitty cash with {holder}" separately (§6). **Settle view** includes it.
- Only the **current revision** of each non-deleted expense counts. Voided settlements and contributions don't count.
- **Invariant:** `Σ balance(m) = 0` exactly, for every trip, at all times.

**Why the invariant can't break:** every expense revision is zero-sum by itself (`Σ base_payers = Σ base_shares = base_amount`), and every settlement and contribution moves the same amount from one side to the other. The server checks **per-operation zero-sum** on every write ([06](06-syncing.md)) and rejects anything that isn't.

**Nightly audit** ([D-026](decisions/D-026-write-path-and-compat.md)): a **pure SQL** job sums the **stored** payers, shares, settlements, contributions and hand-overs per trip, and checks them against `trip_balances` and Σ = 0. It never re-runs a newer engine on old revisions. Each revision stores `engine_version`. Engine replays, if ever needed, use the matching version, in batches.

---

## 8. Settlement (who pays whom)

### 8.1 Simplified mode (default)
Fewest payments. This is the greedy method from PRD §9.5.

1. Take every non-zero balance. Creditors (> 0) and debtors (< 0) each go into a list.
2. Sort each list by amount descending, ties by member ID ascending (deterministic).
3. The largest debtor pays the largest creditor `min(|debt|, credit)`. Reduce both, remove whoever reaches 0, re-sort.
4. Repeat until both lists are empty. The result is at most `n − 1` payments.

### 8.2 Direct mode (R1b)
Payments only between people who actually owe each other.

1. For each expense revision, build the pairwise debts with the **north-west-corner fill** ([D-020](decisions/D-020-direct-mode-exact-pairing.md)):
   1. List the participants by member ID, each with their `base_share`.
   2. List the payers by member ID, each with their `base_paid`.
   3. Take the first participant and the first payer. Assign `min(share left, paid left)` from that participant to that payer.
   4. Move to the next participant or payer, whichever ran out. Repeat.
   5. Drop self-pairs (a participant who is also the payer).

   This is **exact**: each participant's pieces add up to their share, and each payer's pieces add up to what they paid.
   > The old rule, splitting each share across payers "in proportion", rounded each piece separately. It produced a 1-paisa error in 497 of 1,000 simulated multi-payer expenses, so it's **not allowed**.
2. Kitty-paid expenses: `p` owes the kitty holder.
3. Kitty contributions: the holder owes the contributor.
4. Settlements reduce the matching pairwise debt.
5. Net each pair `(a, b)`: `x = owes(a→b) − owes(b→a)`. The sign decides direction; zero pairs are dropped.

### 8.3 Shared rules
- **"12 payments → 3":** the "before" number is the count of direct-mode payments, and the "after" number is the count in the current mode.
- **A derived payment is a suggestion, not a debt.** It only becomes real when recorded as a Settlement.
- **Partial payments** are allowed. The derived payments are simply recomputed.
- **Overpayment** flips the sign and shows a warning.
- **Simplification never changes anyone's balance,** only who pays whom (property test).
- **Mark as paid pre-fills the exact amount**, paise included ([D-021](decisions/D-021-rounding-adjustment.md)).

### 8.4 Rounding adjustment (the dust rule)
When a trip is being **closed** ([D-023](decisions/D-023-auto-settle-timing.md)) and every remaining derived payment is **below 1 major unit** (₹1, $1, ¥1):
1. the server writes one settlement per remaining pair with `method = 'rounding'`, for exactly that amount;
2. the trace shows it as "**Rounding · ₹0.33**";
3. all balances become 0, and the trip settles.

The rule never runs mid-trip. Rounding settlements are ordinary append-only settlements, so they can be voided like any other.

### 8.5 UPI amount limits
A derived payment above **₹1,00,000** (the usual P2P UPI limit) is shown as **several UPI links** of at most ₹1,00,000 each, with the hint "UPI allows about ₹1 lakh per payment. Pay these over one or more days." There's always an **"I paid a different amount"** path. The split is display-only: each link that gets paid is recorded as its own settlement.

---

## 9. Explanations ("Balance trace")

`explainBalance(member)` returns lines whose values add up exactly to the member's balance. For example:
- `+₹5,200` Paid for Casa Anjuna (Day 1 · 14:10)
- `−₹1,000` Share of Casa Anjuna (4 people)
- `−₹1,200` Received from Neha (Settlement: money already received reduces what the group owes you)
- `−₹3,000` Holding kitty leftovers (holder only)

A derived payment's "why" line in the UI lists the debtor's largest shares of expenses paid by others, e.g. "Room ₹1,000 + Cab ₹200". Tapping it opens the full trace.

---

## 10. Budget and burn-down (R2)

All inputs are passed in, including `today`, the trip dates and the budget.

- `committed` = expenses flagged `is_committed` (booked before the trip).
- `in_trip` = everything else.
- `days_total` = trip length; `days_elapsed` = `clamp(today − start + 1, 1, days_total)`.
- **Projection:** `projected = committed + in_trip × days_total / days_elapsed`, using integer maths rounded half-up.
- **Over/under %:** `(projected − budget) × 100 / budget`. The UI shows "At this rate you'll finish 18% over".
- **Alerts** at 75% and 100% of the budget, once each ([features/budget](features/budget.md)).
- **Budget types:** a total budget, per-category budgets, and an optional personal budget (compared with that member's shares).

---

## 11. Analytics numbers (R2)

- **Per-person spend** = Σ base shares, e.g. "Aditya's share: ₹8,400 — 28% of trip". The percentage is `share × 10000 / trip_total` basis points, rounded half-up, for display only.
- **Category breakdown** = Σ base_amount per category.
- **Itinerary estimate vs actual:** `actual` = the linked expense's base amount; `diff % = (actual − est) × 100 / est`.

These are **display-only derived numbers**. They never feed back into balances.

---

## 12. Formatting (display only)

- `formatMoney(minor, currency, locale)` uses **Indian digit grouping** for INR (`₹1,23,456`) and removes trailing `.00` for INR whole amounts, as in the UI reference.
- Written in the engine; it does **not** use the phone's `Intl`, because Android and iOS differ.
- Signed display: `+₹3,400` / `−₹1,200`, using a true minus sign (U+2212).
- **Money is never shown by colour alone** (PRD §17): always use a sign and a word ("gets back" / "owes").

---

## 13. Invariants (these are the tests)

Checked with **property-based tests (fast-check)** on random trips (random members, modes, currencies, edits, deletes), plus the golden fixtures in §14.

1. `Σ balances = 0` for every trip state.
2. `allocate`: the result sums to `total`; each part is ≥ 0; `|part_i − exact_i| < 1`; weight 0 gives 0.
3. Every expense revision: `Σ base_shares = Σ base_payers = base_amount`.
4. Same inputs in any order give the same outputs.
5. Simplification keeps every member's balance unchanged, gives at most `n − 1` payments, and nobody both pays and receives.
6. Deleting an expense restores every balance exactly to its value before the expense.
7. A frozen FX rate never changes when `fx_rates` changes.
8. Replaying the same op log gives identical balances on every device (sync convergence, [06](06-syncing.md)).
9. No `number` type ever holds money. A lint rule and type branding (`Minor = bigint & {__minor}`) enforce this.
10. Engine coverage target: **100% lines and branches**.
11. **Direct mode is exact:** for every revision, the pairing's row sums equal the shares and its column sums equal the payer amounts. Direct-mode net balances equal simplified-mode balances ([D-020](decisions/D-020-direct-mode-exact-pairing.md)).
12. **Removed members stay at 0** under any sequence of later edits, deletes and voids ([D-030](decisions/D-030-removed-members-locked.md)).
13. **Kitty views agree:** the trip view (members + kitty line) and the settle view both sum to 0, and they differ only by the kitty line ([D-022](decisions/D-022-kitty-views-and-handover.md)).
14. **The dust rule** always leaves every balance at exactly 0 and never writes a rounding settlement of 1 major unit or more.
15. **Every saved expense** has `base_amount ≥ 1`.

---

## 14. Golden fixtures

| # | Scenario | Expected result |
|---|---|---|
| G1 | PRD Appendix A (hotel / dinner / cab) | A +₹3,400, R −₹1,000, N −₹1,200, J −₹1,200. Payments: N→A ₹1,200, J→A ₹1,200, R→A ₹1,000. Direct mode gives the same. |
| G2 | ₹1,000 ÷ 3 | 333.34 / 333.33 / 333.33, deterministic |
| G3 | ₹3,000 paid ₹2,000 A + ₹1,000 N, equal 4 ways | shares ₹750 each; A +₹1,250, N +₹250, R −₹750, J −₹750 |
| G4 | Late joiner: Jay joins day 2 | night-1 room split 3 ways, later expenses split 4 ways |
| G5 | Kitty (§6 fixture) | proportional implied refunds; Σ = 0 |
| G6 | IDR expenses on an INR trip | balances unchanged after `fx_rates` moves |
| G7 | Delete a mid-trip expense | every balance returns to its exact previous value |
| G8 | Three devices offline, 40 interleaved ops | identical balances on all three |
| G9 | Itemised bill with GST 5% + service 10% | extras follow subtotals; Σ = total |
| G10 | JPY (exponent 0) and KWD (exponent 3) trips | no decimal assumptions |
| G11 | ₹1.00 paid ₹0.50 A + ₹0.50 B, split 3 ways, **direct mode** | pieces exact: A collects 50, B collects 50 |
| G12 | ₹3,700 dinner split 3 ways; payers mark whole rupees; Close trip | rounding settlements under ₹1; all balances 0; trip settled |
| G13 | Kitty: holder hands over to Neha mid-trip | trace lines for both; settle view charges the remaining to Neha; Σ = 0 |
| G14 | Remove Jay at 0, then delete an expense Jay was in | rejected with `removed_member_balance` |
| G15 | Refund ₹2,000 on a ₹4,000 hotel split 4 ways | each participant's share goes down by ₹500; the payer's balance goes down by ₹2,000 |
| G16 | ₹1,40,000 derived payment | shown as 2 UPI links (₹1,00,000 + ₹40,000) |

---

## 15. Package layout

```
packages/engine/src/
├─ money/      Minor type, currency table, parse, format
├─ allocate/   allocate(), fnv1a32
├─ fx/         rate fractions, cross rates, conversion
├─ split/      the seven modes, multi-payer, itemised
├─ kitty/      contributions, remaining, low/top-up
├─ balance/    balances, explanations
├─ settle/     simplified, direct
├─ budget/     burn-down, projection
└─ index.ts    public API (only this is imported by the apps)
```

It has zero runtime dependencies. It's the same code in Expo (Hermes supports `BigInt`) and in Deno (Edge Functions).
