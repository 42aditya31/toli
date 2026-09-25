# D-019 · Money fields of an expense merge as one group
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
Merging edits field by field ([D-004](D-004-conflict-strategy.md)) breaks when amount, currency, rate, payers and split change on two phones. The merged revision doesn't add up (review B-04).

## Decision
- The **money group** is `amount_minor`, `currency`, `fx_*`, `is_refund`, `payers`, `split_mode`, `split_input`, `paid_from_kitty` and `items`.
- The last write wins **as a whole group**, in server order.
- These fields still merge field by field: `description`, `category_id`, `spent_at` and `is_committed`.
- If a money-group edit replaces someone's newer local money edit, that person is notified, and the history keeps both.

## Impact
This supersedes the money part of D-004. Changes [06 §5](../06-syncing.md).
