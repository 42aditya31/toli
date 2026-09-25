# D-020 · Direct mode uses exact pairing
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
Proportional per-share allocation across payers leaves 1-paisa errors in about half of multi-payer expenses (497 of 1,000 simulated), so trips never settle (review B-01).

## Decision
For each expense revision, pairwise debts are built with the **north-west-corner fill**:
1. List participants by member ID, each with their `base_share`.
2. List payers by member ID, each with their `base_paid`.
3. Walk both lists. Assign `min(remaining share, remaining paid)` from the current participant to the current payer, and move on when either is used up.
4. Drop self-pairs.

The result is exact: row sums equal shares and column sums equal payments. It's deterministic too.

## Impact
[07 §8.2](../07-calculation-engine.md). New property test: direct-mode net balances equal simplified-mode balances. Direct mode ships in R1b ([D-018](D-018-r1a-r1b-scope.md)).
