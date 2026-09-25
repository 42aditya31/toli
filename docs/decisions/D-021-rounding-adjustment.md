# D-021 · Rounding adjustment (dust rule) and exact Mark as paid
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
Balances carry paise (₹1,233.33). People pay whole rupees, and the leftover paise mean the trip never reaches exactly 0 (review B-06).

## Decision
1. **Mark as paid** always pre-fills the **exact** derived amount, paise included. The user can edit it.
2. **Dust rule:** when every remaining derived payment is below **1 major unit** (₹1, $1, ¥1), the server writes one `settlement` row per remaining pair, with `method = 'rounding'`. The trace shows "Rounding · ₹0.33". The trip then qualifies for settling.
3. The dust rule only runs when the trip is being closed ([D-023](D-023-auto-settle-timing.md)), never mid-trip.

## Impact
[03 §5.6](../03-database-schema.md) (`settlement_method` gains `rounding`), [07 §8](../07-calculation-engine.md).
