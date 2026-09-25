# 02 · Architecture

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §12, §16, §17 · [Tech stack research](superpowers/specs/2026-09-24-toli-tech-stack.md) · [D-001](decisions/D-001-tech-stack.md) |

---

## 1. The whole system

```
┌──────────────────────────── PHONE · Expo (React Native, TypeScript) ────────────────────────────┐
│  UI (screens, design-system components)                                                          │
│   ↓ reads via hooks                    ↓ user actions call                                       │
│  State: Drizzle live queries on SQLite   Commands (addExpense, recordSettlement, …)              │
│         + Zustand for UI-only state       ↓ validate (Zod) → compute (@toli/engine)              │
│   ↑                                       ↓ ONE SQLite transaction: rows + outbox op             │
│  SQLite (full copy of my trips)  ←────────┘                                                      │
│   ↑ apply results           ↓ drain outbox                                                       │
│  Sync engine (push / pull / snapshot / realtime nudge / file queue)                              │
└──────────┬───────────────────────────────┬──────────────────────────────────────┬────────────────┘
           │ HTTPS (JWT)                   │ WebSocket (Realtime)                 │ presigned PUT/GET
           ▼                               ▼                                      ▼
┌──────── SUPABASE · Mumbai ─────────────────────────────────────┐   ┌──── CLOUDFLARE ────────────────┐
│ Edge Functions (Deno, TS): sync-push · sync-pull · snapshot ·   │   │ R2 (private): receipts, docs   │
│   invites · join · files · upi-link · reminders · places ·      │   │ Worker: toli.in/t/…, /r/…,      │
│   receipts · pro · account · fx-ingest ── uses @toli/engine     │   │   .well-known, OG cards         │
│ Postgres: source of truth · RLS on every table · trip_ops log   │   └────────────────────────────────┘
│ Auth: anonymous → Google / Apple / email OTP                    │
│ Realtime: trip:{id} broadcast (hint only)                       │   Around it: FCM (+APNs) · PostHog ·
│ pg_cron: FX ingest, balance audit, cleanup, notification sender │   Sentry · Resend · Geoapify ·
└─────────────────────────────────────────────────────────────────┘   Frankfurter · OpenFreeMap
```

---

## 2. Layers (on the phone)

Each layer only calls the one below it. **Business logic never lives in the UI.**

| Layer | Contains | Doesn't contain |
|---|---|---|
| **UI** (`app/`, `features/*/ui`) | screens, layout, animation, design-system components | maths, SQL, fetch |
| **State** (`features/*/model`) | hooks that run Drizzle live queries; Zustand stores for drafts, sheets and toasts | writes |
| **Domain / commands** (`features/*/commands`) | `addExpense(draft)`, `editExpense`, `recordSettlement`, `contributeToKitty`, `claimMember` … Each one validates with Zod, computes with `@toli/engine`, builds an **op**, and writes it in one transaction | UI, network |
| **Local data** (`data/`) | the Drizzle schema (from `packages/schema`), migrations, repositories | business rules |
| **Sync** (`sync/`) | outbox drain, pull, snapshot, rebase, file upload queue, realtime subscription | UI |
| **API client** (`api/`) | typed calls to the Edge Functions (Zod in/out), the auth session | state |
| **Infrastructure** | secure storage, push (notify-kit + FCM), analytics, Sentry, network status | — |

---

## 3. Monorepo

```
toli/
├── apps/
│   ├── mobile/                 Expo app (Expo Router)
│   │   ├── app/                routes (screens) — thin
│   │   └── src/{features,data,sync,api,infra}/
│   └── workers/                Cloudflare Worker: invite/recap pages, .well-known, OG cards
├── packages/
│   ├── engine/                 @toli/engine — pure money maths (see 07)
│   ├── schema/                 Drizzle tables, Zod op + API schemas, generated Supabase types
│   ├── design-system/          tokens + React Native primitives (see 13)
│   └── config/                 tsconfig, lint/format config, shared constants (limits, categories)
├── supabase/
│   ├── migrations/             SQL, committed; types generated from these
│   ├── functions/              Edge Functions (import @toli/engine and @toli/schema)
│   └── seed/                   dev/preview seed trips (the Goa Weekend fixture)
├── docs/                       ← this folder: the project memory
├── package.json · pnpm-workspace.yaml · turbo.json
```

- **pnpm workspaces + Turborepo**, strict TypeScript everywhere (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- The brief's `packages/types` is named **`packages/schema`**, because it holds runtime Zod schemas and not only types ([D-003](decisions/D-003-monorepo.md)).
- **Dependency rule:** `engine` depends on nothing. `schema` depends on `engine` (for types) and on `zod`/`drizzle`. The apps depend on packages; packages never depend on apps.

---

## 4. Key technical choices

| Area | Choice | Why |
|---|---|---|
| Mobile | Expo SDK (latest), **development build** from day one (not Expo Go), New Architecture, Hermes | notify-kit and native modules need a development build; Hermes supports BigInt |
| Navigation | Expo Router, stack + a custom tab bar. **R1a/R1b: Trip · + · Members. R2: Trip · Plan · + · Members.** From R3, the full bar: Trip · Plan · **+** · Vault · Feed, as in the UI reference (OQ-P11) | matches the UI reference, and doesn't show tabs for features that don't exist yet |
| Local DB | `expo-sqlite` + Drizzle ORM + live queries | typed; the UI re-renders on data change |
| UI state | Zustand (drafts, sheets, overlays) | small; no server cache is needed, because SQLite is the cache |
| Animation | Reanimated 3 + Gesture Handler; Skia only for the tear overlay if needed | 60 fps ticket and stub motion ([13](13-design-system.md)) |
| Secure storage | The Supabase session can be larger than the secure-store size limit. So it's stored **encrypted**: a random AES-256 key lives in `expo-secure-store` (Keychain/Keystore), and the encrypted session lives in app storage (the "large secure store" pattern). The device ID is in secure store | the session is never stored in plain text or in plain AsyncStorage |
| Images | `expo-image-manipulator` (resize to 1600 px, JPEG q0.7, **strips EXIF**) | privacy + size |
| Backend | Supabase: Postgres, Auth, Realtime, Edge Functions, pg_cron | one free platform ([D-001](decisions/D-001-tech-stack.md)) |
| Writes | **Only through the `sync-push` Edge Function**, which calls the `apply_ops` Postgres function with an expected `last_seq` (lock → check → insert, one transaction). Never through direct table writes | one place validates maths and rules, with no race between checks and commit ([D-011](decisions/D-011-server-writes.md), [D-026](decisions/D-026-write-path-and-compat.md)) |
| Pulls | Phones read `trip_ops` **directly through PostgREST** (RLS-protected), and `sync-push` returns catch-up ops | no Edge Function call per pull, which keeps the free allowance ([D-026](decisions/D-026-write-path-and-compat.md)) |
| Parsing | Zod **strict on the server**, **lenient on the phone** (unknown fields ignored, unknown values show "Update the app"); a minimum client version (`426`) | old apps keep working through additive changes |
| Money on the phone | SQLite `INTEGER`, converted to `bigint` only in `data/money-codec.ts` | expo-sqlite can't return BigInt ([D-028](decisions/D-028-money-in-sqlite.md)) |
| Files | Cloudflare R2, private, presigned URLs from Edge Functions | 10 GB free, no egress fees |
| Web | Cloudflare Worker (Hono) | free for commercial use |
| Push | FCM (APNs on iOS) + react-native-notify-kit | custom stub design ([D-009](decisions/D-009-notifications.md)) |
| IDs | UUID v7 generated on the device | works offline, sortable by time |

---

## 5. Data flows

### 5.1 Add an expense (the critical path; target ≤ 5 s for the human, ≤ 100 ms for the save)
1. The keypad fills a Zustand draft. The engine shows the per-person amount live.
2. **Save** calls `addExpense(draft)`:
   - Zod-validate;
   - freeze the FX rate from `fx_cache`;
   - `engine.split()` computes shares and payers;
   - the duplicate check runs against local data;
   - one SQLite transaction writes the rows and the outbox op.
3. The tear-stubs animation plays. Balances update from the live query.
4. The sync engine pushes. The server re-verifies, assigns a `seq` and saves. The result comes back, and the row is marked synced.
5. The server queues notifications, and other phones get a Realtime nudge and pull.

### 5.2 A friend opens an invite link
WhatsApp link → Worker page (`/t/:token`) → `invite-preview` (names + total) → "Which one are you?" → `invite-member-view` (what you owe) → **Get the Toli app** (R1a, read-only). In R1b: **Pay via UPI** with a limited web membership → "Did it go through?" → a **pending** settlement the payee confirms ([features/invites](features/invites-and-joining.md)).

### 5.3 Receipt photo
Camera → compress + strip EXIF → the attachment row plus a `file_queue` entry (Wi-Fi only by default) → `upload-url` → PUT to R2 → `upload-confirm`. Pro only: `receipt-extract` returns an editable draft.

---

## 6. Security boundaries

| Boundary | Protection |
|---|---|
| Phone ↔ Supabase | JWT on every call; RLS (app-claimed members only); the secret key exists **only** in Edge Function secrets. New `sb_publishable_` / `sb_secret_` keys from day one; Realtime channels are **private** |
| Web page ↔ data | R1a: read-only (names, total, one member's own lines). R1b: a limited **web membership** that never counts as a trip member ([D-024](decisions/D-024-web-page-read-only-beta.md)) |
| Phone ↔ R2 | presigned URLs only, 5 minutes, one object each; R2 keys are never in the app |
| Public web ↔ data | the invite token or code is the only key; responses are trimmed to what the invite page needs; rate-limited |
| Edge Function ↔ third parties | keys in secrets; outputs validated with Zod |
| Phone storage | session encrypted with a key held in the Keychain/Keystore (the "large secure store" pattern, §4); SQLite in the app sandbox |

Details are in [09 Security](09-security.md).

---

## 7. Performance budgets (PRD §17)

| Metric | Budget | How |
|---|---|---|
| Cold start to trip list | ≤ 1.5 s p90 on a mid-range Android | SQLite reads only; no network on the startup path; splash ≤ 1.2 s when data is ready |
| Save an expense locally | ≤ 100 ms | one transaction; the engine is pure JS |
| Recompute balances, 500 expenses | ≤ 50 ms | incremental per trip; memoised per revision |
| Scale | 50 members, 2,000 expenses per trip | paged pull, compressed snapshot |
| App download | ≤ 40 MB | no heavy SDKs; maps loaded lazily |
| Battery and data | no background polling; receipt uploads on Wi-Fi by default | push-triggered sync |
