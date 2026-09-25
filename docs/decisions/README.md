# Decision Log

Every important product or technical decision is recorded here, so it isn't re-argued later.

**How to add one:** copy the template below into `D-0NN-short-name.md`, add a row to the table, and set the status. A decision that changes an earlier one marks the old one **Superseded** (fully or in part) and links to the new one.

**Status meanings:** `Draft` (proposed) → `Under Review` → `Approved` → `Superseded`.
**"Approved (default)"** means the suggested answer in [open-questions](../open-questions.md) and in [review §28](../14-pre-development-review.md#28-my-open-questions-and-recommendations) was accepted on 2026-09-25 because nobody raised an objection. The product owner can still change it: record the change as a new decision.

| ID | Decision | Status | Date |
|---|---|---|---|
| [D-001](D-001-tech-stack.md) | $0 stack: Expo + Supabase + Cloudflare | Approved (default) | 2026-09-24 |
| [D-002](D-002-offline-first.md) | Local-first: SQLite + outbox + server sequence | Approved (default) | 2026-09-24 |
| [D-003](D-003-monorepo.md) | Monorepo layout (pnpm + Turborepo) | Approved (default) | 2026-09-24 |
| [D-004](D-004-conflict-strategy.md) | Conflicts: per-field last-write-wins; money append-only | **Partly superseded** by D-019 (money fields) | 2026-09-24 |
| [D-005](D-005-rounding-rule.md) | Rounding: largest remainder, then hash order | Approved (default) | 2026-09-24 |
| [D-006](D-006-append-only-money.md) | Expenses as revisions; settlements and contributions voided, never edited | Approved (default) | 2026-09-24 |
| [D-007](D-007-auth.md) | Auth: anonymous first → Google / Apple / email; phone OTP later | Approved (default) | 2026-09-24 |
| [D-008](D-008-invite-links.md) | Invites: one rotating, expiring trip token + short code | Approved (default), amended 2026-09-25 | 2026-09-24 |
| [D-009](D-009-notifications.md) | Notifications: FCM + notify-kit, ticket-stub design | Approved (default); custom styles move to R1b ([D-018](D-018-r1a-r1b-scope.md)) | 2026-09-24 |
| [D-010](D-010-kitty-folding.md) | Kitty folded into the holder's balance at settle-up; no "equal refund" override | Approved (default); display refined by D-022 | 2026-09-24 |
| [D-011](D-011-server-writes.md) | All trip writes go through the sync Edge Function | Approved (default); mechanism in D-026 | 2026-09-24 |
| [D-012](D-012-hold-to-tear.md) | Settle up uses hold-to-tear (+ accessible tap → confirm) | Approved (default) | 2026-09-24 |
| [D-013](D-013-keypad-entry.md) | Keypad enters whole rupees ("00" key); "." key only for decimal currencies | Approved (default) | 2026-09-24 |
| [D-014](D-014-ids-and-wire-money.md) | UUID v7 IDs; money as integer strings in JSON | Approved (default) | 2026-09-24 |
| [D-015](D-015-welcome-direction.md) | Welcome screen: "the screen is the ticket" (variant 1b) | Approved (default) | 2026-09-24 |
| [D-016](D-016-testing-distribution.md) | Testing phase: APK shared directly, join by code; testers use the production backend | Approved (default) | 2026-09-24 |
| [D-017](D-017-itemised-free-scan-pro.md) | Itemised split by hand is free; receipt scanning is Pro | Approved (default); itemised UI moves to R1b | 2026-09-24 |
| [D-018](D-018-r1a-r1b-scope.md) | R1 split into R1a (beta) and R1b | Approved (default) | 2026-09-25 |
| [D-019](D-019-money-edit-group.md) | Money fields of an expense merge as one group | Approved (default) | 2026-09-25 |
| [D-020](D-020-direct-mode-exact-pairing.md) | Direct mode uses exact (north-west-corner) pairing | Approved (default) | 2026-09-25 |
| [D-021](D-021-rounding-adjustment.md) | Rounding adjustment under ₹1 + exact Mark as paid | Approved (default) | 2026-09-25 |
| [D-022](D-022-kitty-views-and-handover.md) | Kitty: trip view vs settle view; `kitty.handover` op | Approved (default) | 2026-09-25 |
| [D-023](D-023-auto-settle-timing.md) | Settled = zero + (end date + 24 h, or Close trip) | Approved (default) | 2026-09-25 |
| [D-024](D-024-web-page-read-only-beta.md) | Web invite page read-only in the beta; limited web membership in R1b | Approved (default) | 2026-09-25 |
| [D-025](D-025-no-contacts-matching-v1.md) | No contacts matching in v1 | Approved (default) | 2026-09-25 |
| [D-026](D-026-write-path-and-compat.md) | `apply_ops` with expected seq; pulls via PostgREST; lenient phone parsing; min client version | Approved (default) | 2026-09-25 |
| [D-027](D-027-environments-and-backups.md) | Local dev + 2 cloud projects; pooler backups, 30 days, restore drill | Approved (default) | 2026-09-25 |
| [D-028](D-028-money-in-sqlite.md) | Money in SQLite: INTEGER + one guarded codec | Approved (default) | 2026-09-25 |
| [D-029](D-029-refund-expense.md) | Refund expenses (R1b) | Approved (default) | 2026-09-25 |
| [D-030](D-030-removed-members-locked.md) | Removed members stay at zero | Approved (default) | 2026-09-25 |
| [D-031](D-031-permission-matrix.md) | One permission matrix, in 09 | Approved (default) | 2026-09-25 |

## Template

```markdown
# D-0NN · Title
| Status | Draft | Date | YYYY-MM-DD |
## Problem
## Options considered
## Decision
## Why
## Trade-offs
## Impact (docs/code affected)
```
