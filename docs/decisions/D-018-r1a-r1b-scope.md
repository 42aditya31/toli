# D-018 · R1 split into R1a (beta) and R1b
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
R1 held the whole core loop plus web payments, custom notification designs, direct mode, itemised and adjustment splits, kitty top-up maths, reminders, digests, roles and takeover, contacts and Hindi. That is too much for a small team, and the PRD rule is "R1 must be excellent before R2 starts" ([review §5.2](../14-pre-development-review.md)).

## Decision
**R1a, the beta (shared as an APK):**
- trips, ghost members, and join by link or code with a claim in the app;
- the All expenses list, Trip settings, "I already have an account", and Recorded payments;
- splits: Equal, Selected-equal, Exact, Percent and Shares, with multiple payers;
- kitty: contributions, spends, holder and hand-over, shown with its own "cash with holder" line;
- balances and balance trace;
- **Simplified** settle-up, UPI links, Mark as paid (exact amount), and the rounding adjustment;
- offline sync and Unresolved changes;
- the in-app stub banner plus **plain** system pushes;
- a **read-only** web invite page;
- English only.

**R1b** (before the public store launch):
- Direct settle mode (with exact pairing, [D-020](D-020-direct-mode-exact-pairing.md));
- Itemised and Adjustment splits, and the Refund type ([D-029](D-029-refund-expense.md));
- web payments using the limited web membership ([D-024](D-024-web-page-read-only-beta.md));
- custom Android notification styles and push reminders (WhatsApp sharing is in R1a);
- kitty top-up suggestion and digests;
- Hindi.

R2 and R3 stay as in the PRD.

## Why
It gets real trips tested in weeks instead of months. The engine still supports every mode from day 1, so R1b is mostly UI work.

## Trade-offs
Some PRD F2, F3 and F6 MUSTs arrive a few weeks later, in R1b. This is recorded in PRD v1.1.
