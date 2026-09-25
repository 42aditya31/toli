# D-004 · Conflict strategy

> **Partly superseded (2026-09-25):** the money fields of an expense now merge as **one group** ([D-019](D-019-money-edit-group.md)). Everything else here still applies.
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
Two phones can edit the same thing while offline. The rule has to be decided before building, and it must never silently lose data.

## Options considered
1. **Per-field last-write-wins in server order, with append-only money** (chosen, matching PRD §12).
2. Whole-record last-write-wins: loses the other person's edits to different fields.
3. CRDTs: too complex for this data. Money needs validated, ordered writes anyway.

## Decision
- **Creates** never conflict (UUIDs, idempotent `op_id`).
- **Edits** carry a field patch plus `base_revision_id`. The server applies the patch onto the **latest** revision, producing a new revision. Different fields both survive. For the same field, the last one received wins, and the earlier editor is told.
- **Edit vs delete:** delete wins, and the edit goes to Unresolved changes with a "Restore as new expense" option.
- **Member removal** with a non-zero balance is rejected.
- **Changes to a settled trip** are rejected until someone reopens it.
- **The phone clock is ignored for ordering.**

## Why
Matches the PRD. Revisions make "who changed what" answerable, and the history is kept.

## Trade-offs
A same-field edit can be overwritten, but it's always visible in history and the loser is notified.

## Impact
[06 §5](../06-syncing.md).
