# D-006 · Append-only money records
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
In a shared ledger, "who changed my share?" must always be answerable (PRD §18). Silent overwrites also make sync conflicts dangerous.

## Decision
- `expenses` is a stable header. Every create, edit and delete adds an **`expense_revisions`** row, with its own payers and shares. The header points to the current revision.
- `settlements` and `kitty_contributions` are immutable. Undoing one sets `voided_at` (a one-way change, done only by the server).
- Planning data (itinerary, places, bookings, notes) uses plain field-level last-write-wins with soft delete, because no balance depends on it.

## Why
- A full audit trail.
- "Delete restores balances exactly" is trivially true.
- Conflicts are easier to resolve.

## Trade-offs
More rows. The phone stores only the current revision and fetches history on demand.

## Impact
[03 §5](../03-database-schema.md), [06](../06-syncing.md).
