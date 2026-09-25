# D-005 · Rounding rule
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
₹1,000 ÷ 3 leaves 1 paisa over. Who gets it must be deterministic on every device, stable across edits, and fair overall (PRD §9.3).

## Options considered
1. PRD rule: floor every share, then give the leftover paise in `hash(expense_id + member_id)` order.
2. **Largest fractional remainder first, then hash order, then member ID** (chosen).
3. Always give the leftover to the payer or the first member: systematically unfair.

## Decision
A single `allocate(total, weights, keys, seed)` function ([07 §3](../07-calculation-engine.md)):
- the hash is FNV-1a 32-bit over `seed|key`;
- the seed is the expense's **logical ID**.

## Why
- For equal splits it gives exactly the PRD result.
- For weighted splits (shares, percent, itemised, FX conversion), each share stays within 1 paisa of its exact value. The hash-only rule can give the extra paisa to a tiny-weight share.

## Trade-offs
It's a small refinement of the PRD text. **The PRD owner should confirm it.**

## Impact
The engine and all its fixtures.
