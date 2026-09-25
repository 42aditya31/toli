# D-028 · How money is stored on the phone
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
`expo-sqlite` can't bind or return JS `BigInt`, and Drizzle's SQLite `integer` returns `number` (review B-11).

## Decision
- Money columns in SQLite are `INTEGER`.
- **A single data-layer module** (`data/money-codec.ts`) converts every value to `Minor` (branded `bigint`) when reading, and back to `number` when writing. It asserts `|value| ≤ Number.MAX_SAFE_INTEGER`. Toli's maximum is about 10¹¹, far below 2⁵³.
- No other code touches raw money numbers. A lint rule bans `number`-typed money outside that module.

## Impact
[03 §10](../03-database-schema.md), [02 §4](../02-architecture.md). Proven in the day-1 spike.
