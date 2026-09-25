# D-002 · Local-first: SQLite + outbox + server sequence
| Status | Under Review | Date | 2026-09-24 |
|---|---|---|---|

## Problem
Trips happen on hill roads, on flights and in basements. The app must work fully offline (PRD §5.5, §12), and every phone must end up with identical numbers.

## Options considered
1. **Our own outbox with a server-assigned per-trip `seq`** (chosen).
2. PowerSync (hosted): the free plan allows 50 concurrent clients and deactivates after a week idle.
3. ElectricSQL: another moving part, and less control over money validation.
4. Online-only with a cache: fails the PRD.

## Decision
- SQLite on the phone is what the UI reads.
- Every change is written locally, together with an outbox op (UUID v7 `op_id` as the idempotency key), in one transaction.
- The server validates each op, assigns a per-trip `seq`, and returns the canonical `result`.
- Phones pull ops in `seq` order.
- Realtime is only a nudge.

## Why
- The PRD specifies this model.
- Validating money and rules on the server needs our own code path.
- It has the fewest dependencies.

## Trade-offs
We build and test the sync ourselves, including a deterministic simulator in CI.

## Impact
[06](../06-syncing.md), [03](../03-database-schema.md), [04](../04-api-schema.md).
