# D-001 · $0 stack: Expo + Supabase + Cloudflare
| Status | Under Review | Date | 2026-09-24 |
|---|---|---|---|

## Problem
Toli must cost $0 to build and run until it has real traction, and still be production-grade.

## Options considered
1. **Expo + Supabase + Cloudflare R2/Workers** (chosen).
2. Firebase: phone auth and Storage now require the paid Blaze plan.
3. Everything on Cloudflare (Durable Objects + D1): drops Postgres, and login would have to come from elsewhere.
4. Self-hosted on an Oracle free VM: we'd have to run and patch it ourselves.

## Decision
- **App:** Expo (React Native, TypeScript).
- **Supabase (Mumbai):** Postgres, Auth, Realtime, Edge Functions, pg_cron.
- **Cloudflare:** R2 for files, a Worker for the invite and recap web pages. The daily FX fetch runs inside Supabase (pg_cron → the `fx-ingest` Edge Function), so the service key never leaves Supabase.
- **Around it:** FCM and notify-kit for push, PostHog, Sentry, Resend, Geoapify, OpenFreeMap, Frankfurter.

## Why
- Every service has a free tier that allows commercial use.
- It's standard technology (Postgres, S3 API, TypeScript), so moving later is easy.
- Only two main platforms to operate.
- Full research: [tech stack](../superpowers/specs/2026-09-24-toli-tech-stack.md).

## Trade-offs
- Supabase Free pauses after 7 idle days and has **no backups**, so we need a keep-alive and a nightly `pg_dump` to R2.
- The first paid step is Supabase Pro at $25/month.
- Fixed costs: Play $25 once, Apple $99/year (it can wait until the iOS beta), and a domain.

## Impact
[02](../02-architecture.md), [08](../08-third-party-integrations.md), [12](../12-environments-and-deployment.md).
