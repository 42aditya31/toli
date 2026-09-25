# 12 · Environments and Deployment

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §16, §20 · [Tech stack §5.14, §7, §8](superpowers/specs/2026-09-24-toli-tech-stack.md) · [D-001](decisions/D-001-tech-stack.md) · [D-003](decisions/D-003-monorepo.md) · [D-016](decisions/D-016-testing-distribution.md) |
| **Related** | [02 Architecture](02-architecture.md) · [08 Integrations](08-third-party-integrations.md) · [09 Security](09-security.md) · [10 Observability](10-observability.md) · [11 Testing](11-testing-strategy.md) |

Three environments, fully separated. Code moves from Development → Preview → Production; data never does. APK beta testers are on Production ([D-016](decisions/D-016-testing-distribution.md)).

---


> **Updated rules (2026-09-25, after the [pre-development review](14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Environments ([D-027](decisions/D-027-environments-and-backups.md)):** **development = local Supabase (Docker)**, no cloud project. **Preview** = a cloud project for internal QA with seed data only. **Production** = a cloud project, **used by beta testers**. That's 2 cloud projects, the free-plan maximum.
> - **Backups:** nightly `pg_dump` through the **Session pooler (port 5432)** with a matching `postgresql-client`; `age`-encrypted to R2; **kept 30 days**; monthly restore drill into a throwaway local Supabase.
> - **Keep-alive:** `/rest/v1/rpc/health` every 5 minutes on both cloud projects (no Edge Function call).
> - **EAS profiles:** `development`, `preview`, `beta` (tester APK → production backend), `production`. `eas update` always sets the environment explicitly, and CI checks the bundle's Supabase URL and fingerprint before publishing.
> - **Compatibility:** a minimum client version (`426`); migrations follow expand → migrate → contract.
> - **Keys:** the new `sb_publishable_` / `sb_secret_` keys from day one, per environment.
> - **Moving testers to the Play Store:** one reinstall, with a *Save my account* prompt 2 weeks before. The `*.workers.dev` Worker redirects old invite links once the domain is bought.
> - **Supabase Pro ($25/month)** for production at the public launch.

## 1. Two rules

1. **Never test on production data.** No developer uses real users' trips for testing. QA happens on Preview with seed data (the Goa Weekend fixture) only. APK beta testers are **real users with real trips**, so they use Production from day one, and their trips carry over to the store launch ([D-016](decisions/D-016-testing-distribution.md), OQ-P19 in [01](01-overview.md#open-questions)).
2. **Separate Supabase projects per environment.** Not schemas, not branches of one project — separate projects, separate keys. A preview key must never work against production ([09 §3](09-security.md)).

---

## 2. The three environments

| | **Development** | **Preview** | **Production** |
|---|---|---|---|
| **Who uses it** | developers | internal QA only (the team); **never given to testers** | real users, including APK beta testers ([D-016](decisions/D-016-testing-distribution.md)) and Play closed testers |
| **Supabase project** | local Supabase CLI in Docker (no cloud project, [D-027](decisions/D-027-environments-and-backups.md)) | `toli-preview` (Mumbai) | `toli-prod` (Mumbai) |
| **API config** | `EXPO_PUBLIC_SUPABASE_URL` / anon key of `toli-dev` or `http://<LAN-IP>:54321` for local | `toli-preview` URL + anon key | `toli-prod` URL + anon key |
| **Secrets** | Edge Function secrets in `toli-dev`; local `.env` (git-ignored) | Edge Function secrets in `toli-preview`; GitHub env `preview` | Edge Function secrets in `toli-prod`; GitHub env `production` (manual approval) |
| **Storage (R2)** | `toli-dev-files` | `toli-preview-files` | `toli-prod-files`, `toli-prod-backups` |
| **Analytics (PostHog)** | project `toli-dev` (or disabled) | project `toli-preview` | project `toli-prod` |
| **Sentry** | projects `toli-mobile` / `toli-functions` / `toli-web`, environment `development` | same projects, environment `preview` | same projects, environment `production` |
| **EAS build profile** | `development` (dev client, internal) | `preview` (**APK**, internal distribution, QA) | `beta` (**APK** for testers, internal distribution); `production` (AAB for Play; IPA for App Store later) |
| **EAS Update channel** | `development` | `preview` | `beta`, `production` |
| **Worker env + domain** | `toli-web-dev` on `toli-web-dev.<account>.workers.dev` | `toli-web-preview` on `toli-web-preview.<account>.workers.dev` | `toli-web-prod` on `toli.in` (domain TBD, [OQ-P5](01-overview.md#open-questions)); on `toli-web-prod.<account>.workers.dev` until the domain is bought |
| **FCM (Firebase project)** | `toli-dev` | `toli-preview` | `toli-prod` |
| **App identifier** | `in.toli.app.dev` | `in.toli.app.preview` | `in.toli.app` |
| **App name on phone** | "Toli Dev" | "Toli Preview" | "Toli" |
| **Deep-link scheme / host** | `toli-dev://`, dev workers.dev host | `toli-preview://`, preview workers.dev host | `toli://`, `toli.in` |
| **Seed data** | Goa Weekend fixture | Goa Weekend fixture only | none |
| **Data retention** | wipe any time | wipe any time (seed data only) | per [09 §9](09-security.md) |

Different app identifiers mean all three can be installed on one phone side by side.

> **Important about Production during the APK phase:** D-016 puts real friend groups on `toli-prod` from the first tester APK. So Production holds **real personal data** before any store launch: RLS, nightly backups, keep-alive, secrets hygiene, the privacy notice and a working delete path must all be live before the first tester APK is shared (§9). No migration is needed at store launch.

---

## 3. Configuration

- **App config** lives in `app.config.ts`, driven by `APP_ENV` (`development` / `preview` / `production`) set per EAS build profile. The `beta` profile uses `APP_ENV=production`. It picks the bundle ID, app name, icon badge, scheme, Supabase URL/anon key, PostHog key, Sentry DSN and Firebase config file.
- **Only publishable values** go into the app (`EXPO_PUBLIC_*`). Everything else is a server secret ([09 §3](09-security.md)).
- Firebase files (`google-services.json`, `GoogleService-Info.plist`) per environment are stored as **EAS file secrets**, not committed.
- **Remote config:** PostHog feature flags for kill switches (receipt scan, places search, map style URL, price variant).

`eas.json` (outline):

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "channel": "development", "env": { "APP_ENV": "development" } },
    "preview":     { "distribution": "internal", "android": { "buildType": "apk" }, "channel": "preview", "env": { "APP_ENV": "preview" } },
    "beta":        { "distribution": "internal", "android": { "buildType": "apk" }, "channel": "beta", "env": { "APP_ENV": "production" } },
    "production":  { "autoIncrement": true, "channel": "production", "env": { "APP_ENV": "production" } }
  },
  "submit": { "production": { "android": { "track": "internal" } } }
}
```

---

## 4. CI/CD (GitHub Actions)

### 4.1 On every pull request (Linux runners only)
1. `pnpm install` (cached) + Turborepo cache.
2. **Typecheck** (`tsc --noEmit`, strict) across all packages and apps.
3. **Lint + format** (Biome or ESLint + Prettier), including the no-`number`-for-money rule.
4. **Tests:** unit, engine (100% coverage + golden + 1,000-case properties), sync simulator (200 runs), UI components ([11 §12](11-testing-strategy.md)).
5. **Database:** start local Supabase → apply all migrations from zero → run pgTAP (**no table without RLS**, RLS behaviour) → Edge Function API tests.
6. **Type drift:** `supabase gen types typescript --local` must equal the committed `packages/schema/src/db.types.ts`.
7. **Build validation:** `expo prebuild --no-install` + `expo export` (JS bundle builds), Edge Functions bundle (`supabase functions deploy --dry-run` or `deno check`), Worker build (`wrangler deploy --dry-run`).
8. Optional: a PR **EAS Update** to the `development` channel for quick device checks.

**Branch protection:** all checks green + one review to merge into `main`. **`main` is always releasable.**

### 4.2 On merge to `main` → Preview
1. `supabase db push` migrations to `toli-preview` (Supabase CLI, access token from the `preview` GitHub environment).
2. Deploy Edge Functions to `toli-preview`.
3. `wrangler deploy --env preview` for the Worker.
4. If JS-only changes: `eas update --channel preview` + Sentry source-map upload.
5. Smoke test: `GET /rest/v1/rpc/health` and the invite page.

### 4.3 Production release (manual, approval required)
1. Tag `vX.Y.Z` on `main`.
2. GitHub environment `production` requires the founder's approval.
3. Migrations to `toli-prod` (see §4.4 rules), then Edge Functions, then Worker.
4. Native changes → `eas build --profile production` → `eas submit`, and `eas build --profile beta` for the tester APK. JS-only → `eas update --channel production` (staged, §5.3) and `--channel beta`.
5. Sentry release created and source maps uploaded.

### 4.4 Database migrations
- SQL files in `supabase/migrations/`, created with `supabase migration new`, **committed**, never edited after merge.
- Every new table must first be documented in [03](03-database-schema.md) and ship with RLS + policies in the **same migration** (the CI check enforces it).
- **Expand → migrate → contract:** add columns/tables first (backwards compatible), ship app versions that use them, remove old columns only after the oldest supported app (2 releases, [06 §8](06-syncing.md)) no longer needs them.
- Generate types after every migration (`supabase gen types`) and commit them.
- Take a fresh `pg_dump` right before any production migration.

---

## 5. EAS Build, Submit and Update

### 5.1 runtimeVersion policy
- **`runtimeVersion: { policy: "fingerprint" }`** — Expo computes a hash of all native code and config. A JS update is delivered **only** to builds with the same fingerprint, so an update can never require native code the build doesn't have.
- Alternative: `appVersion` policy (bump the app version whenever native code changes). We choose **fingerprint** because it's automatic and removes human error.
- CI prints the fingerprint on each PR; if it changes, the PR is labelled **"needs new build"** and can't be shipped as an EAS Update.

### 5.2 EAS Build
| Profile | Output | Where it goes |
|---|---|---|
| `development` | dev-client APK | developers' phones |
| `preview` | **APK** (internal), Preview backend | the team's QA phones only; never shared with testers |
| `beta` | **APK** (internal), Production backend | shared on WhatsApp/Drive with testers (D-016); install link from EAS |
| `production` | AAB (Android), IPA (iOS later) | EAS Submit → Play Console / App Store Connect |

- Free plan: 15 Android + 15 iOS cloud builds per month; use `eas build --local` (WSL2) for extra Android builds.
- Signing keys managed by EAS credentials. The **beta signing key's SHA-256** must be listed in the production Worker's `/.well-known/assetlinks.json` so App Links open sideloaded tester APKs ([04 §10](04-api-schema.md), D-016); the preview key goes in the preview Worker's file for QA. Production `assetlinks.json` also lists the **Play App Signing** key (and the upload key).

### 5.3 EAS Update
- JS/asset-only fixes go out over the air on the matching channel.
- **Staged rollout** in production: `--rollout-percentage 10` → watch Sentry crash-free rate for 24 h → 100%.
- **Rollback:** `eas update:rollback` (or republish the previous update) if crash-free sessions drop below 99.5%.
- Free plan covers 1,000 monthly active users receiving updates; above that, Starter $19/month or ship via the stores ([08 §3.12](08-third-party-integrations.md)).

### 5.4 Sentry source maps
- **Every EAS Build** uploads source maps via the Sentry Expo config plugin (auth token in EAS secrets).
- **Every EAS Update** runs `npx sentry-expo-upload-sourcemaps dist` right after `eas update`, in CI.
- Release naming per [10 §7](10-observability.md). A release without source maps fails the checklist (§8).

---

## 6. Backups and keep-alive

### 6.1 Nightly backup (mandatory — Supabase Free has no backups)
- GitHub Actions scheduled workflow, **02:00 IST** daily, for `toli-prod`, running from before the first tester APK (testers' trips are real data).
- `pg_dump --format=custom` → gzip → encrypt with `age` (public key in the repo, private key offline with the founder) → upload to `toli-prod-backups` in R2.
- Retention: 30 daily + 12 monthly (R2 lifecycle rules).
- Failure → **P1 alert** ([10 §9](10-observability.md)).
- **Monthly restore drill:** restore the latest dump into `toli-dev`, run the balance audit on it, record the result. A backup that has never been restored doesn't count.

### 6.2 Keep-alive
- Supabase Free pauses a project after **7 idle days**.
- UptimeRobot pings `GET /rest/v1/rpc/health` (a tiny SQL function through PostgREST, so no Edge Function call) every **5 minutes** for preview and production ([08 §3.14](08-third-party-integrations.md)).
- Backup job for dev: a weekly GitHub Actions ping keeps `toli-dev` awake if needed.

### 6.3 Scheduled jobs (pg_cron, per project; [04 §10.1](04-api-schema.md))
| Job | When | Does |
|---|---|---|
| `balance-audit` | nightly 03:00 IST | recompute every active trip from revisions, compare with `trip_balances`, Σ = 0 check; failure = **P0** |
| `notify-sender` | every minute | drain `notification_outbox` (digests, retries) |
| `cleanup` | nightly | `rate_limit_buckets` > 1 day, `notification_outbox` > 30 days, expired exports |
| `fx-ingest` | 02:30 IST | pg_cron + pg_net call the `fx-ingest` Edge Function (cron secret header), which fetches Frankfurter (fallback fawazahmed0) and upserts `fx_rates`. Runs inside Supabase so the service key never leaves it; the Worker has no cron |

---

## 7. APK testing distribution (D-016)

```
 main ──► eas build --profile beta  (APK, APP_ENV=production)
            │
            ▼
   EAS install link / APK file ──► shared on WhatsApp or Drive
            │
            ▼
   Tester installs the APK (allow unknown sources)
            │  anonymous account on toli-prod
            ▼
   Joins by invite link (App Links via the production assetlinks.json) or by code
```

- $0: no Play account needed.
- Invite page on `toli-web-prod.<account>.workers.dev` until the domain is bought.
- JS fixes reach testers via `eas update --channel beta`; native changes need a new APK (testers reinstall over the top; data is kept because the signing key is the same).
- Testers' trips live in production and carry over to the store launch (OQ-P19).
- **Never** give a preview build to testers, and never point a preview build at production.

---

## 8. Play Store and iOS

### 8.1 Google Play (Android first)
- Developer account: **$25 once**.
- **Closed-testing rule for new personal accounts:** at least **12 testers opted in for 14 consecutive days** before production access is granted. Start this early with beta groups (it can run in parallel with the APK phase).
- Tracks: internal → closed (12+ testers, 14 days) → production (staged rollout 10% → 50% → 100%).
- Required: privacy policy URL, Data Safety form (matches [09 §9](09-security.md)), content rating, target API level current, kitty wording that makes clear Toli doesn't hold money ([09 §12](09-security.md)).

### 8.2 iOS (later)
- Apple Developer Program **$99/year**, only when the iOS beta starts.
- TestFlight for beta; APNs key uploaded to the production Firebase project.
- Sign in with Apple required (Google login offered). Universal Links via `apple-app-site-association`.
- iOS joins by link or short code (no install referrer).

---

## 9. Release checklist

**Before every production release**
- [ ] `main` green: all PR checks + last nightly (engine 100k properties, 20k sync runs, failure suite)
- [ ] Maestro E2E passed on the **real reference devices** (incl. offline flow E3) ([11 §8](11-testing-strategy.md))
- [ ] Performance budgets checked on the ₹15,000-class phone ([11 §11](11-testing-strategy.md))
- [ ] Migrations reviewed; fresh `pg_dump` taken; expand/contract rules followed
- [ ] Every new table documented in 03 and passes the RLS check
- [ ] Edge Functions and Worker deployed to preview and smoke-tested
- [ ] Fingerprint checked: native change → new build; JS-only → EAS Update allowed
- [ ] Sentry release created, **source maps uploaded** for the build/update
- [ ] New analytics events reviewed for PII ([10 §3](10-observability.md))
- [ ] Old-client compatibility: payload versions from the last 2 releases accepted
- [ ] Nightly balance audit clean for 7 days
- [ ] Release notes written (plain language)
- [ ] Staged rollout plan + rollback owner named

**Before the first tester APK (testers are real users on production, D-016)**
- [ ] Privacy notice (`/privacy`) + working account deletion (in-app and `/delete-account`) live (PRD §18)
- [ ] Nightly backup and keep-alive running for `toli-prod`
- [ ] Beta signing key listed in the production `assetlinks.json`

**Before the first public release (additionally)**
- [ ] Domain bought; `assetlinks.json` + AASA live on it; invite links tested
- [ ] Data Safety form matches [09 §9](09-security.md) (launch-blocking, PRD §18)
- [ ] Legal review of kitty wording (PRD §21)
- [ ] Play closed test: 12 testers × 14 days completed
- [ ] Backups restored successfully at least once
- [ ] Supabase Pro decision made from beta usage ([08 §4](08-third-party-integrations.md))
- [ ] R1 beta ship criteria met ([11 §13](11-testing-strategy.md))

---

## 10. Open questions

| # | Question | Proposal |
|---|---|---|
| ENV-1 | Do APK-phase trips move to production at store launch? | **Resolved:** testers use the production backend from day one, so their trips simply carry over; no migration ([D-016](decisions/D-016-testing-distribution.md), OQ-P19 in [01](01-overview.md#open-questions)) |
| ENV-2 | Is `toli-dev` (hosted) needed, or is local Supabase enough? | Local for daily work; keep a hosted `toli-dev` only for testing push and App Links on phones |
| ENV-3 | Final bundle ID and domain (`in.toli.app` / `toli.in` vs `toli.app`) | Decide with [OQ-P5](01-overview.md#open-questions) before the first tester (`beta`) build — changing the bundle ID later means a new app |
