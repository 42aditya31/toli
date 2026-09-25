# D-026 · Sync write path, pulls and compatibility
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
- PostgREST can't run the multi-statement transaction that `sync-push` needs (review A-7).
- Checking rules outside the lock allows races (B-03).
- A strict parser on the phone breaks old apps whenever the server adds a field (A-8).
- Pulling through Edge Functions uses up the free invocation allowance at about 500–1,000 daily users.

## Decision
1. **Write path:** `sync-push` loads the trip state at `last_seq = N`, validates it and runs `@toli/engine`. It then calls the `security definer` Postgres function **`apply_ops(trip_id, expected_seq, ops jsonb)`**. That function locks the trip row, **rejects with `stale` if `last_seq ≠ N`**, inserts the rows and `trip_ops`, updates `trip_balances`, and bumps `seq`. On `stale`, the Edge Function reloads and re-validates, up to 3 times.
2. **Pulls:** phones read `trip_ops` **directly through PostgREST** (RLS-protected; no Edge Function call). `sync-push` also returns every op after the phone's cursor, so the phone rarely needs a separate pull. `/sync-pull` remains only as a fallback.
3. **Pushes** are queued and sent from `sync-push` right after commit. The cron checks `notification_outbox` in SQL and only calls `notify-sender` when rows are due.
4. **Compatibility:** Zod is **strict on server input** and **lenient on the phone** (unknown fields are ignored, and unknown enum values show as "Update the app to see this"). `result` rows carry a shape version. The server enforces a **minimum client version**, answering `426` below it. Migrations follow **expand → migrate → contract**.
5. The `trip_ops.payload_hash` is stored. The same `op_id` with a different payload is rejected as `op_id_reused`.

## Impact
[06](../06-syncing.md), [04 §2](../04-api-schema.md), [03 §8](../03-database-schema.md).
