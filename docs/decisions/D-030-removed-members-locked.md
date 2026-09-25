# D-030 · Removed members stay at zero
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
A member removed at a zero balance could later get a balance again when someone edits old expenses (review B-02).

## Decision
- The server **rejects any op that would make a removed member's balance non-zero** (`removed_member_balance`), with the message "This changes Jay's balance. Add Jay back first."
- In the split editor, removed members appear greyed out as **Removed** and can't be edited.
- The last organiser can't leave or be removed without handing over the role.

## Impact
[06 §5–6](../06-syncing.md), [07 §13](../07-calculation-engine.md) (new invariant).
