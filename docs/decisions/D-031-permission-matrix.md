# D-031 · One permission matrix
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
Permissions were written differently in OQ-P12, settle-up, members, kitty and recap docs (review C-08, M-8).

## Decision
[09 Security §Permission matrix](../09-security.md#permission-matrix) is the **only** place that says who can do what. Every screen and feature doc links to it instead of repeating it. The server enforces the same matrix (`not_organiser` / `not_allowed`).

## Impact
[09](../09-security.md) and every screen/feature doc's Permissions section.
