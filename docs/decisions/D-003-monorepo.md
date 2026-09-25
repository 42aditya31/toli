# D-003 · Monorepo layout
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
The phone, the server and the web page share the money engine and the schemas. They must never drift apart.

## Options considered
1. **One pnpm + Turborepo monorepo** (chosen).
2. Separate repos with a published engine package: versions drift, and releases get slower.

## Decision
The layout is:
- `apps/mobile`, `apps/workers`
- `packages/engine`, `packages/schema`, `packages/design-system`, `packages/config`
- `supabase/{migrations,functions,seed}`
- `docs/`

The brief's `packages/types` is named **`packages/schema`**, because it holds runtime Zod schemas and the Drizzle tables, not only types.

## Why
- One pull request can change the engine, the server and the app together, with the same tests.
- Edge Functions (Deno) import the same TypeScript source as the app.

## Trade-offs
The Deno import setup for Edge Functions needs care: an import map pointing to the workspace packages, bundled at deploy time.

## Impact
[02 §3](../02-architecture.md).
