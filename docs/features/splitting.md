# Feature · Splitting

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a:** Equal, Selected-equal, Exact, Percent, Shares, multiple payers, paid from kitty. **R1b:** Adjustment and Itemised (by hand, free), and refunds ([D-018][d018], [D-029][d029]). **R2:** filling the item list by receipt scan (Pro, [D-017][d017]). The engine supports all seven modes from day 1 |
| **PRD refs** | [§9.1][prd] (7 split modes, multiple payers, payer-not-participant), §9.2 (integer money), §9.3 (rounding), F3 (validation, "distribute the remainder"), F4 (itemised, extras by subtotal), F7 (paid from kitty), §11 (correctness), §15 (every split mode free), Appendix A |
| **Related** | Screens: [split-editor](../screens/split-editor.md) · [add-expense](../screens/add-expense.md) · [receipt-scan](../screens/receipt-scan.md) — Docs: [07 §3 `allocate()`, §5 split modes, §5.1 itemised, §5.2 multi-payer][engine] · [03 §5.2–5.5][db] · [06 §5–6][sync] · [09 §2.3 permission matrix][perm] — Decisions: [D-005][d005] · [D-014][d014] · [D-017][d017] · [D-018][d018] · [D-019][d019] · [D-029][d029] · [D-030][d030] — Features: [expenses](expenses.md) · [kitty](kitty.md) · [receipt-scan](receipt-scan.md) |

---

## 1. Purpose

Lets the group divide any expense **the way it really happened**: "only two of us ate", "Neha doesn't drink", "the couple counts as two", "the bill went on two cards". Every mode is free, and every result adds up to the exact paisa.

## 2. User problem

A tool that can't say "Jay only had a soda" gives answers the group knows are wrong, and then the group stops using it. Splitwise charges for most of these cases.

## 3. Business goal

- **The wedge:** unequal splits and multiple payers are free (PRD §15), a direct reason to switch.
- **G5:** zero balance-correctness incidents. Splits are the most maths-heavy part, so they carry the most test weight.

## 4. User flow

1. On add-expense, tap the **SPLIT** tile ("Equal · 4 ›"). The split editor opens: "Split ₹1,200 · Paid by You".
2. Mode chips across the top. **R1a:** **Equal**, **Exact ₹**, **Percent %**, **Shares ×**. **R1b adds:** **Adjust +₹** and **Itemised** (its **Scan bill · PRO** button arrives in R2, [D-017][d017]).
3. One line of help under the chips explains the mode.
4. Each member is a row: tick box, avatar, name, their amount. In non-equal modes, a stepper (− value +) appears under ticked rows; tap the value to type.
5. The footer shows the status: "✓ All ₹1,200 assigned", "₹120 unassigned", "₹50 too much", or "Pick at least one person". When there's an unassigned amount, **Distribute equally** appears.
6. **Done** returns to add-expense.

**Multiple payers**
1. On add-expense, tap **PAID BY** → the payer sheet → **+ Add payer**.
2. Type each person's amount. Status: "₹1,000 left to assign".
3. Done → the tile shows "Aditya + Neha".

## 5. Requirements

| ID | Requirement | Level | Release | PRD |
|---|---|---|---|---|
| SP-1 | Support all seven modes: Equal, Selected-equal, Exact, Percentage, Shares, Adjustment, Itemised. **R1a** ships the first five; **Adjustment and Itemised move to R1b** ([D-018][d018]). | MUST | R1a / **R1b** | §9.1, F3 |
| SP-2 | **Multiple payers** with individual amounts summing to the total. Free. | MUST | R1a | §9.1 |
| SP-3 | **Payer-not-participant** works in every mode. | MUST | R1a | §9.1 |
| SP-4 | Participants are always an **explicit** set, defaulting to members active on the expense date. Never inferred. | MUST | R1a | §8, F2 |
| SP-5 | Exact must total the expense; Percent must total 100%. Show an inline hint ("₹120 unassigned") and a one-tap **distribute the remainder equally**. | MUST | R1a | F3 |
| SP-6 | Show the per-person result live. | MUST | R1a | F3 |
| SP-7 | Integer minor units only; rounding via the one `allocate()` rule, identical on phone and server. | MUST | R1a | §9.2, §9.3, [07 §3][engine] |
| SP-8 | Itemised: tax, service charge and tip are prorated **by each person's subtotal**, not equally. | MUST | **R1b** | F4 |
| SP-9 | An expense can be **paid from the kitty**; it still has participants and a split. | MUST | R1a | F7 |
| SP-10 | No mode is limited or paywalled. Only the receipt **scan** is Pro. | MUST | R1a | §5, §15, [D-017][d017] |
| SP-11 | **Refund** expenses split like normal ones, with the direction flipped ([D-029][d029]). | MUST | **R1b** | F3 (PRD v1.1 #13) |
| SP-12 | Removed members on old expenses show greyed out as **Removed** and can't be edited ([D-030][d030]). | MUST | R1a | §8 (PRD v1.1 #12) |

## 6. Business rules

### 6.1 The seven modes ([07 §5][engine])

| Mode | Release | User enters | Shares computed as | Valid when | Stored as `split_mode` |
|---|---|---|---|---|---|
| **Equal** | R1a | who's in | `allocate(amount, [1,1,…])` | ≥ 1 participant | `equal` |
| **Selected-equal** | R1a | a subset (untick people) | same as Equal over the subset | ≥ 1 participant | `equal` (participants list is the subset) |
| **Exact** | R1a | an amount per person | as entered | Σ = amount | `exact` |
| **Percentage** | R1a | % per person, 2 decimals (stored as basis points) | `allocate(amount, bp)` | Σ bp = 10000 | `percent` |
| **Shares** | R1a | whole-number weight per person (≥ 1) | `allocate(amount, weights)` | ≥ 1 participant | `shares` |
| **Adjustment** | R1b | an add-on per person (≥ 0) | `rest = amount − Σadd`; share = `allocate(rest, 1s)` + add-on | Σadd ≤ amount | `adjust` |
| **Itemised** | R1b | line items with assignees + extras | [07 §5.1][engine]: each item split equally among its assignees; extras follow subtotals; discounts subtract | items + extras − discounts = total | `itemised` |

- **Selected-equal is Equal with some people unticked.** There's one chip ("Equal") and the help text says "Untick anyone who wasn't there. The rest split it evenly."
- `split_input` stores **exactly what the user entered** (participants, weights, bp, exact amounts, add-ons), validated by a Zod schema per mode ([03 §5.2][db]).
- An older app that receives a mode it doesn't know (e.g. `itemised` from an R1b phone) shows "Update the app to see this" instead of crashing ([D-026][d026]).

### 6.2 Rounding
- All division goes through `allocate(total, weights, keys, seed)`; nothing else divides money ([07 §3][engine]).
- Leftover paise go by **largest remainder first**, then `fnv1a32(seed|member_id)`, then member ID ([D-005][d005]). The seed is the expense's logical ID, so editing the description never reshuffles paise.
- **Itemised lines** are seeded with each **item's own ID**, not its position, so reordering items never reshuffles paise ([07 §5.1][engine]).
- The UI never mentions rounding. ₹1,000 ÷ 3 shows "₹333.34 / ₹333.33 / ₹333.33" in exact shares; the live line shows "₹333 each · 3 people" (see Open questions).
- Leftover paise at the end of the trip are handled by the **rounding adjustment** on Close trip, not here ([settle-up](settle-up.md), [D-021][d021]).

### 6.3 Switching modes (prefill, from the prototype)
| Switch to | Prefill |
|---|---|
| Exact | each ticked person's current equal share |
| Percent | 100% spread evenly (e.g. 34/33/33) |
| Shares | 1 each |
| Adjust (R1b) | +₹0 each |
| Itemised (R1b) | the manual item list. From R2 a **Scan bill · PRO** button sits at the top; on a free trip it opens the [Pro sheet](../screens/pro-sheet.md) ([D-017][d017]) |

Stepper sizes (prototype): Exact ±₹100, Percent ±5%, Shares ±1, Adjust ±₹50. Tapping the value opens the keypad for exact entry.

### 6.4 Validation and "distribute the remainder"
- **Exact:** unassigned = amount − Σ entered. Positive → "₹120 unassigned"; negative → "₹50 too much".
- **Percent:** "5% unassigned" / "5% too much".
- **Adjust:** Σ add-ons > amount → "₹200 too much".
- **Distribute equally** (only when something is **unassigned** in Exact or Percent): runs `allocate(unassigned, 1s)` over the ticked participants and adds each piece to their entered value ([07 §5][engine]). It's not offered for "too much".
- **Changing the amount** after entering Exact values makes the split invalid until fixed. Percent, Shares and Equal just recompute.
- Save is disabled while invalid; the add screen says "Split needs fixing".

### 6.5 Payers
- One or more payers `{ member, amount }` in the expense currency; Σ payer amounts = amount ([07 §5.2][engine]).
- Payers are converted to base currency with a separate `allocate()` seed (`expense_id + ":payers"`), so Σ base payers = Σ base shares = base amount exactly.
- A payer doesn't have to be a participant.
- **Kitty as payer:** `paid_from_kitty = true`, no `expense_payers` rows. In v1 the kitty **can't be combined** with people on one expense ([07 §5.2][engine]).

### 6.6 Refunds (R1b, [D-029][d029])
- A refund has a **positive** amount and `is_refund = true`.
- Shares and payers are computed exactly as for a normal expense, then **both are negated** before balances: the payer received the money, and each participant gets their share back ([07 §5][engine]).

### 6.7 Edits and removed members
- The split is part of the **money group** (`split_mode`, `split_input`, `payers`, `items`, amount, currency, rate, refund, kitty-paid). Two money edits don't merge: the last one the server receives replaces the whole group, and the earlier editor is told ([D-019][d019]).
- **Removed members** stay in old splits, greyed out as **Removed**. Their share can't be changed, and any edit that would change their balance is rejected with `removed_member_balance` ([D-030][d030]).

## 7. Data model

| Table ([03 §5][db]) | Columns |
|---|---|
| `expense_revisions` | `split_mode`, `split_input` (jsonb), `amount_minor`, `currency`, `base_amount_minor`, `is_refund`, `paid_from_kitty`, `engine_version` |
| `expense_payers` | `member_id`, `amount_minor`, `base_minor` |
| `expense_shares` | `member_id`, `share_minor`, `base_minor` — **invariant:** Σ `base_minor` = `base_amount_minor` |
| `expense_items` (itemised, R1b) | `id`, `position`, `kind` (item/tax/service/tip/discount/round_off), `label`, `amount_minor`, `assignee_member_ids` |

`split_mode` is a checked text list: `equal | exact | percent | shares | adjust | itemised` (selected-equal is `equal`).

## 8. API requirements

- Splits travel inside `expense.create` / `expense.edit` payloads ([06 §4][sync]): `split_mode`, `split_input`, `payers[]`, `shares[]`, `items[]`, `is_refund`, amounts as integer strings ([D-014][d014]).
- **Server check** ([06 §6][sync]): `@toli/engine` recomputes shares and payers from `split_input` and checks Σ payers = Σ shares = base amount ≥ 1.
  - If the phone's shares **don't add up**, the op is rejected with `split_mismatch`.
  - If they add up but **differ** from the server's, the server's result wins, is sent back, and the difference goes to Sentry.
- Itemised drafts from a photo come from `POST /receipt-extract` (Pro, R2, [04 §7][api]).

## 9. UI requirements

[split-editor](../screens/split-editor.md):
- Header "Split ₹1,200" + "Paid by You".
- Mode chips with mono tags: Equal, Exact **₹**, Percent **%**, Shares **×** (R1a); Adjust **+₹**, Itemised (R1b; no PRO tag on the chip; the `PRO` tag is on its **Scan bill · PRO** button, R2).
- Help lines (reference copy):
  - Equal: "Untick anyone who wasn't there. The rest split it evenly."
  - Exact: "Type what each person owes. It has to add up to the total."
  - Percent: "Percentages have to reach 100%."
  - Shares: "A couple can count as 2 shares, singles as 1."
  - Adjust: "Split evenly, then add extra to someone (the extra drink)."
- Rows: tick box (lime ✓ when in), avatar, name ("You" for the current user), amount in mono; unticked rows at 45% opacity with "—"; removed members greyed with **Removed** and no controls.
- Stepper row for ticked people in non-equal modes: "−", value ("40%", "2 shares", "+₹300", "₹500"), "+".
- Footer: status in lime when valid ("✓ All ₹1,200 assigned"), text colour otherwise; **Distribute equally**; **Done**.
- Accessibility: each row reads "Neha, in, owes three hundred rupees"; status changes are announced.

Payer sheet (`PayerSheet`, [13][ds]): recent payers first, search above 8 members, **+ Add payer**, per-payer amounts with "₹1,000 left to assign".

## 10. States

| State | Footer |
|---|---|
| No amount | "Add an amount first" |
| Nobody ticked | "Pick at least one person" |
| Valid | "✓ All ₹1,200 assigned" |
| Under | "₹120 unassigned" + **Distribute equally** (Exact/Percent) |
| Over | "₹50 too much" |
| Itemised (R1b) | manual item list in [split-editor](../screens/split-editor.md); a scanned draft (R2) is handled in [receipt-scan](receipt-scan.md) |
| Unknown mode from a newer app | "Update the app to see this" |

## 11. Edge cases

- **₹1 split 3 ways:** 100 paise → 34/33/33 paise; still sums exactly. **1 paisa split 3 ways** (possible after FX conversion): 1/0/0, and the hash decides who gets it.
- **Weight 0:** not allowed in Shares (untick instead); `allocate` gives 0 to weight 0 anyway.
- **Percent with 2 decimals** (33.33 + 33.33 + 33.34): valid; stored as bp.
- **All add-ons equal the amount** (Adjust): rest = 0; shares are just the add-ons. Valid.
- **Payer-not-participant in multi-payer:** allowed (two people paid, neither ate).
- **Kitty-paid expense switched to a person payer:** allowed via edit; balances move accordingly.
- **Two phones edit the split offline:** the last money edit received wins as a whole; it never produces a split that doesn't add up ([D-019][d019]).
- **Old expense includes a removed member:** shown greyed; the rest of the split can still be edited as long as the removed member's share doesn't change.
- **Late joiner** unticked by default but ticked manually: allowed.
- **Refund split 4 ways (R1b):** ₹2,000 back on a ₹4,000 hotel reduces each share by ₹500 ([07 §14 G15][engine]).
- **Zero-decimal currency** (JPY) and **three-decimal** (KWD): no 2-decimal assumptions ([07 §14 G10][engine]).
- **Old app version** with an engine bug sends different (but valid) shares: server result wins; Sentry report.
- **Itemised items reordered (R1b):** paise don't move, because each line is seeded by its item ID.

## 12. Permissions

Choosing modes, being a participant or payer, and seeing splits follow the [permission matrix, 09 §2.3][perm] ([D-031][d031]): any claimed member can add or edit any expense's split; a web viewer sees only their own lines. Receipt **scan** needs a Pro trip (R2).

## 13. Offline behaviour

Fully offline. The engine runs on the phone; the result is shown and saved instantly. Receipt extraction for itemised needs the network (Pro, R2).

## 14. Sync behaviour

- The server is the authority for the final shares. It recomputes from `split_input`; the phone replaces local rows with the returned `result`.
- Description, category and date edits merge field by field. Any change to the split is part of the money group, where the last one received wins as a whole ([06 §5][sync], [D-019][d019]).
- Because the rounding seed is the expense ID and inputs are sorted by ID, every phone gets the same paise ([07 §1][engine]).

## 15. Analytics

| Event (PRD §19) | Properties |
|---|---|
| `split_mode_changed` | `from`, `to` (proposed props) |
| `expense_added` | `split_mode`, `payer_count` |

Proposed, not in §19: `split_remainder_distributed` (how often the one-tap fix is used).

## 16. Error handling

| Case | Message |
|---|---|
| Save while invalid | Toast "₹120 still unassigned" / "5% still unassigned" |
| Nobody ticked | "Pick at least one person" |
| `split_mismatch` (shares don't add up) | Unresolved change: "This split didn't add up, so it wasn't saved. Fix it and try again." |
| Valid but different from the server | Silent correction |
| `removed_member_balance` | "This changes Jay's balance. Add Jay back first." |

## 17. Testing

- **Golden fixtures** ([07 §14][engine]): G1 (Appendix A: selected-equal dinner), G2 (₹1,000 ÷ 3 → 333.34/333.33/333.33), G3 (₹3,000 paid ₹2,000 + ₹1,000, equal 4 → ₹750 each; A +₹1,250, N +₹250, R −₹750, J −₹750), G9 (itemised with GST 5% + service 10%; extras follow subtotals), G10 (JPY, KWD), G15 (refund).
- **Property tests:** for every mode, random amounts and participants: Σ shares = amount; each share within 1 minor unit of exact; weight 0 → 0; order of input lists doesn't change output; same inputs → same paise on "phone" and "server" builds; itemised results don't change when items are reordered.
- **Validation:** Exact/Percent under and over; distribute remainder lands exactly on the total; Adjust with Σadd = amount and > amount.
- **Money group:** concurrent split edits give one valid revision.
- **Type safety:** lint rule — no `number` holds money ([07 §13.9][engine], [D-028][d028]).
- **UI:** stepper bounds (never below 0), prefill on mode switch, removed members not editable, screen-reader labels.

## 18. Future considerations

- Kitty plus a person paying together (v1 forbids it).
- Saved split presets ("couple = 2 shares" remembered per trip).
- Template-driven default splits (PRD §22 Q4).
- Negative adjustments (a discount for one person): not in v1.

## 19. Open questions

Resolved:
- Itemised by hand is free; only the scan is Pro ([D-017][d017]). Itemised and Adjustment ship in R1b ([D-018][d018]).
- Multi-payer entry point: the payer sheet with **+ Add payer** (review U-8, `PayerSheet` in [13][ds]).
- Two split edits at once: the money group wins as a whole ([D-019][d019]).
- Refunds: R1b ([D-029][d029]).

Still open:
1. **Rupee display of paise:** INR amounts are typed in whole rupees ([D-013][d013]), but equal splits create paise (₹333.34). Show paise on shares, or round the display and keep exact values underneath? (Mark as paid always uses the exact amount, [D-021][d021].)

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[ds]: ../13-design-system.md
[perm]: ../09-security.md#permission-matrix
[d005]: ../decisions/D-005-rounding-rule.md
[d013]: ../decisions/D-013-keypad-entry.md
[d014]: ../decisions/D-014-ids-and-wire-money.md
[d017]: ../decisions/D-017-itemised-free-scan-pro.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d019]: ../decisions/D-019-money-edit-group.md
[d021]: ../decisions/D-021-rounding-adjustment.md
[d026]: ../decisions/D-026-write-path-and-compat.md
[d029]: ../decisions/D-029-refund-expense.md
[d030]: ../decisions/D-030-removed-members-locked.md
[d031]: ../decisions/D-031-permission-matrix.md
