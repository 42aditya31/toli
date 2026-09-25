# D-011 · All trip writes go through the sync Edge Function
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
If phones could write to trip tables directly, as Supabase allows, the zero-sum rule, split validation and ordering couldn't be enforced in one place.

## Decision
- RLS gives trip members **SELECT only** on all trip tables.
- Every trip write is an op sent to `POST /sync-push`. It runs with the service role, validates with Zod and `@toli/engine`, and commits in one transaction with a `seq`.
- Only profile, devices and notification preferences can be written directly, and only by their owner.

## Why
- One gate for correctness, security and audit.
- It matches the outbox model ([D-002](D-002-offline-first.md)).

## Trade-offs
Edge Function invocations count against the free tier (500k/month). Batching up to 50 ops per request keeps this low.

## Impact
[03 §1](../03-database-schema.md), [04](../04-api-schema.md), [09](../09-security.md).
