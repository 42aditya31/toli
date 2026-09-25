# D-010 · Kitty folded into the holder's balance
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
PRD F7:
- the leftover kitty cash is refunded in proportion to contributions;
- contributions should be "modelled as payments";
- the group can override the proportional refund.

## Decision
- The kitty is a virtual member. Contributions count as payments by the contributor. Kitty-paid expenses are paid by the kitty.
- At balance time, the kitty's balance (−leftover cash) is **added to the kitty holder's balance**, because the holder physically holds the cash.
- The normal settle-up then returns the leftovers. Refunds come out proportional to contributions automatically, and they're shown as "→ refund" lines on the Kitty screen.
- **Proposal: drop the "equal refund" override for v1.** With folding, each person ends up with exactly what they paid minus what they used. An equal refund would move money from small contributors to large ones, or the other way round.

## Why
- No special cases in the maths.
- Σ balances = 0 by construction.
- It matches the PRD fixture.

## Trade-offs
It differs from the PRD's override line. **Needs the PRD owner's confirmation** (OQ-E1).

## Impact
[07 §6](../07-calculation-engine.md), [features/kitty](../features/kitty.md).
