# D-027 · Environments and backups on the free plan
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
The Supabase free plan allows **2 active projects**, but 3 were planned. GitHub runners can't reach Supabase's IPv6-only direct database address (review C-06).

## Decision
- **Development:** the local Supabase CLI (Docker) on each laptop. No cloud project.
- **Preview:** a cloud project for internal QA, with seed data only.
- **Production:** a cloud project. **Beta testers use it** ([D-016](D-016-testing-distribution.md)).
- **Backups:**
  - nightly `pg_dump` from GitHub Actions through the **Session pooler (port 5432)**, with a `postgresql-client` that matches the server's major version;
  - encrypted with `age`, stored in the R2 backups bucket, and **kept 30 days**;
  - a monthly **restore drill** into a temporary local Supabase, which is destroyed afterwards. Production data never goes to dev.
- **Keep-alive:** `/health` pinged every 5 minutes, for both cloud projects.
- Use the new `sb_publishable_…` / `sb_secret_…` API keys from day one.
- **Supabase Pro ($25/month) for production at the public launch:** backups, no pausing, more invocations.

## Impact
[12](../12-environments-and-deployment.md), [08](../08-third-party-integrations.md).
