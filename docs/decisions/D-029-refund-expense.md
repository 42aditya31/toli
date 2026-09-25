# D-029 · Refund expenses
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Decision
- An expense can be marked **Refund** (`expense_revisions.is_refund = true`), e.g. the hotel returns ₹2,000.
- The amount is stored positive. The engine **flips the direction**: payers *received* money and participants *get back* their shares.
- Zero amounts are still blocked.
- Ships in R1b.

## Impact
[07 §5](../07-calculation-engine.md), [03 §5.2](../03-database-schema.md).
