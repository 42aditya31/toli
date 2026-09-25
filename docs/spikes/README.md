# Spikes (M0)

| | |
|---|---|
| **Status** | In progress |
| **Last updated** | 2026-09-25 |
| **Plan** | [M0 + M1 plan](../superpowers/plans/2026-09-25-m0-m1-spikes-and-foundation.md) |

Each spike is a throwaway proof of one risky technical bet. The code is deleted afterwards; the result doc stays. If a spike shows a documented decision can't work as written, a new decision (D-033 onward) is written **before** any real code relies on it.

| # | Question | Blocked on | Result |
|---|---|---|---|
| 1 | Can Supabase Edge Functions import workspace TypeScript packages ([D-003](../decisions/D-003-monorepo.md))? | Docker Desktop | Not run yet |
| 2 | Can Deno send FCM HTTP v1 pushes with no Node SDK ([D-009](../decisions/D-009-notifications.md))? | Founder's Firebase project | Not run yet |
| 3 | Does expo-sqlite + Drizzle + the money codec store money exactly, atomically and fast ([D-028](../decisions/D-028-money-in-sqlite.md))? | An Android phone with USB debugging | Not run yet |
| 4 | Does `apply_ops` serialise concurrent writers with lock → `last_seq` check → insert ([D-026](../decisions/D-026-write-path-and-compat.md))? | Docker Desktop | Not run yet |
