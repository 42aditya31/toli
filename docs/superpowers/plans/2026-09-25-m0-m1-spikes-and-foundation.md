# M0 + M1: Spikes and Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the four risky technical bets (M0) and stand up the pnpm + Turborepo monorepo with strict TypeScript, Biome, a no-`number`-money check and green GitHub Actions CI (M1), per [BUILD-PROMPT.md §5](../../../BUILD-PROMPT.md).

**Architecture:** One repo in the layout of [02 §3](../../02-architecture.md) and [D-003](../../decisions/D-003-monorepo.md). Spikes are throwaway code in `spikes/` (outside the pnpm workspace), and each one writes a short result in `docs/spikes/`. The M1 foundation is permanent: root tooling, `packages/config`, a minimal `apps/mobile` Expo development-build skeleton (so CI can prove the app bundles), and `.github/workflows/ci.yml`.

**Tech Stack:** pnpm 9 workspaces (`node-linker=hoisted`), Turborepo 2, TypeScript 5.9 strict, Biome 2 (lint + format), Vitest, Expo SDK 57 (development build, not Expo Go, [02 §4](../../02-architecture.md)), expo-sqlite + Drizzle ORM, Supabase CLI 2.118 (local Docker, [D-027](../../decisions/D-027-environments-and-backups.md)), Deno (Edge Functions).

---

## Status of prerequisites (2026-09-25)

| Needed for | Prerequisite | State |
|---|---|---|
| Spikes 1 and 4 | Docker Desktop (needs BIOS virtualization + WSL2, admin) | **Blocked on the founder**: virtualization is off in firmware; WSL2 isn't installed |
| Spike 2 | A Firebase project + service-account key + `google-services.json` (founder's account) | **Blocked on the founder** (checklist in Task 0.2) |
| Spike 3 | An Android phone with USB debugging, Android SDK + `adb` | SDK present at `%LOCALAPPDATA%\Android\Sdk`; the emulator can't run without virtualization, so a **real phone** is used |
| M1 | Node 22, pnpm 9, git remote `origin` = `42aditya31/toli` | Ready |

Order of work: **M1 first** (not blocked), then **Spike 3**, then **Spikes 1, 4** once Docker works, then **Spike 2** once Firebase exists. Stop and report after M0 + M1 ([BUILD-PROMPT §10](../../../BUILD-PROMPT.md)).

## File map

| Path | Responsibility | Kept? |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `turbo.json`, `.gitignore`, `biome.json` | root tooling | yes |
| `packages/config/tsconfig.base.json` | the one strict TS config every package extends | yes |
| `packages/config/scripts/check-money-types.mjs` + `check-money-types.test.mjs` | the "no `number` holds money" check ([07 §13 #9](../../07-calculation-engine.md), [D-028](../../decisions/D-028-money-in-sqlite.md)) | yes |
| `apps/mobile/` | Expo SDK 57 dev-build skeleton: `app.json`, `package.json`, `tsconfig.json`, `index.ts`, `App.tsx` | yes |
| `apps/mobile/src/data/money-codec.ts` + test | the single SQLite ↔ `Minor` converter ([D-028](../../decisions/D-028-money-in-sqlite.md)) | yes (born in Spike 3) |
| `.github/workflows/ci.yml` | typecheck, lint, test, build on every PR ([12 §4.1](../../12-environments-and-deployment.md)) | yes |
| `supabase/config.toml` | local Supabase config (`supabase init`) | yes |
| `spikes/01-edge-imports/`, `spikes/02-fcm-deno/`, `spikes/03-sqlite-money/` (screen inside the app), `spikes/04-apply-ops/` | throwaway proofs | deleted after M0 (result docs stay) |
| `docs/spikes/README.md`, `docs/spikes/0N-*.md` | spike results | yes |

---

## Task 0.1: Founder checklist, Docker (blocking Spikes 1 and 4)

Not code. Send the founder these exact steps, then wait for "done".

- [ ] **Step 1:** Restart, open the BIOS (F2 / Del / F10), enable **Intel Virtualization Technology** or **SVM Mode** (AMD), then Save & Exit.
- [ ] **Step 2:** In Admin PowerShell, run `wsl --install --no-distribution`, then restart.
- [ ] **Step 3:** In Admin PowerShell, run `winget install -e --id Docker.DockerDesktop`, open it, keep the WSL 2 backend, and wait for "Engine running".
- [ ] **Step 4 (verify, agent):** Run `docker version --format '{{.Server.Version}}'`. Expected: a version number. Then run `pnpm exec supabase start`. Expected: it prints `API URL: http://127.0.0.1:54321` and a `Publishable key: sb_publishable_…`.

## Task 0.2: Founder checklist, Firebase (blocking Spike 2)

- [ ] **Step 1:** At console.firebase.google.com, **Add project** → name `toli-dev-spike` → turn Analytics off.
- [ ] **Step 2:** **Add app → Android**, package `app.toli.dev` → download `google-services.json` → give it to the agent **outside git** (e.g. `C:\Users\Admin\toli-secrets\google-services.json`).
- [ ] **Step 3:** Project settings → **Service accounts** → **Generate new private key** → save it as `C:\Users\Admin\toli-secrets\fcm-sa.json`. Never commit it.

---

# M1 · Monorepo foundation

### Task 1: Root tooling

**Files:**
- Modify: `package.json`
- Create: `biome.json`
- Modify: `turbo.json`

- [ ] **Step 1: Add Biome and Turbo**

Run: `pnpm add -Dw @biomejs/biome@^2 turbo@^2 typescript@~5.9.2`
Expected: `devDependencies` gains the three packages.

- [ ] **Step 2: Write the root scripts** in `package.json`:

```json
{
  "name": "toli",
  "private": true,
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "build": "turbo run build",
    "lint": "biome check . && node packages/config/scripts/check-money-types.mjs",
    "format": "biome format --write ."
  }
}
```
(Keep the `devDependencies` block pnpm wrote.)

- [ ] **Step 3: Write `biome.json`**

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!**/node_modules", "!docs/**", "!ui-refrence/**", "!spikes/**", "!supabase/.temp/**", "!**/*.html", "!pnpm-lock.yaml"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "always" } },
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "error" },
      "style": { "noNonNullAssertion": "error" }
    }
  }
}
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test": { "outputs": ["coverage/**"] },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }
  }
}
```

- [ ] **Step 5: Verify**

Run: `pnpm exec biome check .`
Expected: `Checked N files … No fixes applied.` with exit code 0. (The money check doesn't exist yet, so `pnpm lint` fails until Task 2.)

- [ ] **Step 6: Commit** (only the tooling files; never `git add -A`, because the founder's uncommitted doc edits must stay out)

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .gitignore turbo.json biome.json packages/config supabase/config.toml supabase/.gitignore
git commit -m "chore: monorepo root tooling (pnpm, turbo, biome, strict tsconfig, supabase init)"
```

### Task 2: The no-`number`-money check (TDD)

**Rule** ([07 §13 #9](../../07-calculation-engine.md), [11 §3](../../11-testing-strategy.md), [D-028](../../decisions/D-028-money-in-sqlite.md)): a declaration (variable, parameter, property, property signature) whose **name** looks like money must not have the TypeScript type `number`. It applies everywhere except `**/data/money-codec.ts` and test files. Money-looking names match `/(minor|amount|balance|price|cost|owed|paid)$/i` or `/^(amount|balance)/i`. Using the type checker (not only annotations) means `const amountMinor = row.amount_minor` (a Drizzle `number`) is caught too.

**Files:**
- Create: `packages/config/scripts/check-money-types.mjs`
- Create: `packages/config/scripts/check-money-types.test.mjs`
- Create: `packages/config/scripts/fixtures/bad.ts`, `packages/config/scripts/fixtures/good.ts`, `packages/config/scripts/fixtures/data/money-codec.ts`
- Modify: `packages/config/package.json`

- [ ] **Step 1: Write the fixtures**

`packages/config/scripts/fixtures/bad.ts`:
```ts
export const amountMinor: number = 5;
export function pay(totalAmount: number) {
  return totalAmount;
}
export type Row = { balance: number };
declare const row: { amount_minor: number };
export const shareMinor = row.amount_minor;
```

`packages/config/scripts/fixtures/good.ts`:
```ts
export const amountMinor: bigint = 5n;
export const count: number = 3;
export type Row = { balance: bigint; memberCount: number };
```

`packages/config/scripts/fixtures/data/money-codec.ts`:
```ts
export function toDb(amountMinor: bigint): number {
  return Number(amountMinor);
}
```

- [ ] **Step 2: Write the failing test** `packages/config/scripts/check-money-types.test.mjs`:

```js
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { findMoneyNumbers } from './check-money-types.mjs';

const fx = (p) => fileURLToPath(new URL(`./fixtures/${p}`, import.meta.url));

describe('check-money-types', () => {
  it('flags every money-named declaration typed number', () => {
    const hits = findMoneyNumbers([fx('bad.ts')]).map((h) => h.name).sort();
    expect(hits).toEqual(['amountMinor', 'amount_minor', 'balance', 'shareMinor', 'totalAmount']);
  });
  it('accepts bigint money and non-money numbers', () => {
    expect(findMoneyNumbers([fx('good.ts')])).toEqual([]);
  });
  it('exempts data/money-codec.ts', () => {
    expect(findMoneyNumbers([fx('data/money-codec.ts')])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it and check that it fails**

Run: `pnpm add -D --filter @toli/config vitest typescript && pnpm --filter @toli/config test`
Expected: FAIL, because `check-money-types.mjs` doesn't exist.

- [ ] **Step 4: Implement** `packages/config/scripts/check-money-types.mjs`:

```js
#!/usr/bin/env node
// "No number holds money" (docs/07 §13 #9, D-028). Exempt: **/data/money-codec.ts and tests.
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MONEY_NAME = /(minor|amount|balance|price|cost|owed|paid)$|^(amount|balance)/i;
const EXEMPT = /(^|[\\/])data[\\/]money-codec\.ts$|\.test\.tsx?$|\.spec\.tsx?$/;

export function findMoneyNumbers(files) {
  const program = ts.createProgram(files, {
    strict: true, noEmit: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, skipLibCheck: true, allowImportingTsExtensions: true,
  });
  const checker = program.getTypeChecker();
  const hits = [];
  for (const sf of program.getSourceFiles()) {
    if (!files.some((f) => path.resolve(f) === path.resolve(sf.fileName))) continue;
    if (EXEMPT.test(sf.fileName)) continue;
    const visit = (node) => {
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node) ||
           ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) &&
          node.name && ts.isIdentifier(node.name) && MONEY_NAME.test(node.name.text)) {
        const type = checker.getTypeAtLocation(node.name);
        const nonNull = checker.getNonNullableType(type);
        const isNumber = (t) => (t.flags & ts.TypeFlags.NumberLike) !== 0;
        if (isNumber(nonNull) || (nonNull.isUnion() && nonNull.types.some(isNumber))) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
          hits.push({ file: sf.fileName, line: line + 1, name: node.name.text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return hits;
}

function trackedSourceFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard',
    'apps/**/*.ts', 'apps/**/*.tsx', 'packages/**/*.ts', 'packages/**/*.tsx', 'supabase/functions/**/*.ts'],
    { encoding: 'utf8' });
  return out.split('\n').filter(Boolean).filter((f) => !f.includes('/fixtures/'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const hits = findMoneyNumbers(trackedSourceFiles());
  for (const h of hits) console.error(`${h.file}:${h.line}  '${h.name}' is money typed as number. Use Minor (bigint); only data/money-codec.ts may convert.`);
  if (hits.length) process.exit(1);
  console.log('check-money-types: OK');
}
```

`packages/config/package.json`:
```json
{
  "name": "@toli/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "vitest run" },
  "devDependencies": { "typescript": "~5.9.2", "vitest": "^3" }
}
```
(Keep whatever exact versions pnpm wrote in Step 3.)

- [ ] **Step 5: Run the tests and check that they pass**

Run: `pnpm --filter @toli/config test`
Expected: `3 passed`.

Run: `pnpm lint`
Expected: `check-money-types: OK`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add packages/config package.json pnpm-lock.yaml
git commit -m "chore(config): no-number-money check with tests (07 §13 #9, D-028)"
```

### Task 3: `apps/mobile` development-build skeleton

Minimal and permanent: CI needs a real app to typecheck and bundle. There are no screens yet (M7). The dev build uses `expo-dev-client` ([02 §4](../../02-architecture.md): a development build from day one, not Expo Go).

**Files:**
- Create: `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/tsconfig.json`, `apps/mobile/index.ts`, `apps/mobile/App.tsx`, `apps/mobile/babel.config.js` (only if create-expo-app omits it)

- [ ] **Step 1: Scaffold**

Run: `pnpm dlx create-expo-app@latest apps/mobile --template blank-typescript --no-install`
Then: `cd apps/mobile && pnpm dlx expo install expo-dev-client --pnpm` (from the repo root: `pnpm --filter @toli/mobile exec expo install expo-dev-client`).
Expected: `apps/mobile/package.json` has `expo` `~57.x`.

- [ ] **Step 2: Set the identity** in `apps/mobile/package.json`: `"name": "@toli/mobile"`, `"private": true`, plus these scripts:

```json
"scripts": {
  "start": "expo start --dev-client",
  "android": "expo run:android",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --passWithNoTests",
  "build": "expo export --platform android --output-dir dist"
}
```

`apps/mobile/app.json` (the `expo` key only; keep the other fields from the template):
```json
{
  "expo": {
    "name": "Toli (dev)",
    "slug": "toli",
    "scheme": "toli",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "android": { "package": "app.toli.dev" }
  }
}
```

`apps/mobile/tsconfig.json`:
```json
{
  "extends": ["expo/tsconfig.base", "../../packages/config/tsconfig.base.json"],
  "compilerOptions": { "allowImportingTsExtensions": true },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install and verify**

Run from the root: `pnpm install && pnpm add -D --filter @toli/mobile vitest && pnpm --filter @toli/mobile typecheck && pnpm --filter @toli/mobile build`
Expected: typecheck exits 0; `expo export` prints `Exported: dist`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile pnpm-lock.yaml
git commit -m "chore(mobile): Expo SDK 57 development-build skeleton"
```

### Task 4: CI on GitHub Actions

Implements [12 §4.1](../../12-environments-and-deployment.md) steps 1–4 and the JS part of 7. Steps 5–6 (Supabase + pgTAP + type drift) are added in **M4**, when the first migration exists. Edge Function checks come with the first function.

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  checks:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

- [ ] **Step 2: Verify locally** (the same commands, in order)

Run: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: every command exits 0.

- [ ] **Step 3: Commit, push the branch, open a PR**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck, lint (incl. money check), test, build on every PR"
git push -u origin r1a-phone-preview
gh pr create --base main --title "M0 + M1: spikes and monorepo foundation" --body "…"
```

- [ ] **Step 4: Wait for CI**

Run: `gh pr checks --watch`
Expected: `checks  pass`. Paste the output in the M1 report.

### Task 5: Doc fixes found while planning

- [ ] **Step 1:** In [12 §2 table](../../12-environments-and-deployment.md) line 38, replace `` `toli-dev` (plus local Supabase CLI in Docker for most work) `` with `local Supabase CLI in Docker (no cloud project, D-027)`. D-027 wins.
- [ ] **Step 2:** Create `docs/spikes/README.md` listing the 4 spikes, each with its status and a link to its result doc.
- [ ] **Step 3: Commit** `docs: fix dev environment row (D-027); spike index`.

---

# M0 · Spikes (throwaway code; results are permanent)

Each result doc (`docs/spikes/0N-name.md`) holds: **question · what I built · result (pass/fail, with real output) · what changes in the docs (a new decision D-033+ if needed)**.

### Spike 3: expo-sqlite + Drizzle + money codec on a real Android phone ([D-028](../../decisions/D-028-money-in-sqlite.md))

**Question:** can a development build on Hermes store money as SQLite `INTEGER`, read it through Drizzle as `number`, convert it losslessly to `Minor` (`bigint`) in one codec module, and write rows + an outbox op atomically in one transaction in < 100 ms?

**Files:**
- Create (permanent): `apps/mobile/src/data/money-codec.ts`, `apps/mobile/src/data/money-codec.test.ts`
- Create (throwaway): `apps/mobile/src/spikes/sqlite-money.tsx`, `apps/mobile/src/spikes/schema.ts`, `apps/mobile/drizzle.config.ts`, `apps/mobile/drizzle/` (generated)
- Create: `docs/spikes/03-sqlite-money.md`

- [ ] **Step 1: Write the failing codec test** `apps/mobile/src/data/money-codec.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fromDb, toDb } from './money-codec.ts';

describe('money-codec', () => {
  it('round-trips the values Toli can hold', () => {
    for (const v of [0n, 1n, -1n, 33334n, 100_000_000_000n, -100_000_000_000n, 9_007_199_254_740_991n]) {
      expect(fromDb(toDb(v))).toBe(v);
    }
  });
  it('rejects unsafe or non-integer numbers from SQLite', () => {
    expect(() => fromDb(9_007_199_254_740_992)).toThrow('unsafe');
    expect(() => fromDb(1.5)).toThrow('unsafe');
    expect(() => fromDb(Number.NaN)).toThrow('unsafe');
  });
  it('rejects bigints that SQLite/JS numbers cannot carry exactly', () => {
    expect(() => toDb(9_007_199_254_740_992n)).toThrow('unsafe');
  });
  it('reads null as null', () => {
    expect(fromDb(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and check that it fails**

Run: `pnpm --filter @toli/mobile test`
Expected: FAIL, because `./money-codec.ts` doesn't exist.

- [ ] **Step 3: Implement** `apps/mobile/src/data/money-codec.ts`:

```ts
// The only place where money crosses between SQLite numbers and Minor bigints (D-028).
export type Minor = bigint & { readonly __minor: unique symbol };

const MAX = BigInt(Number.MAX_SAFE_INTEGER);

export function fromDb(value: number): Minor;
export function fromDb(value: number | null): Minor | null;
export function fromDb(value: number | null): Minor | null {
  if (value === null) return null;
  if (!Number.isSafeInteger(value)) throw new RangeError(`unsafe money value from SQLite: ${value}`);
  return BigInt(value) as Minor;
}

export function toDb(value: bigint): number {
  if (value > MAX || value < -MAX) throw new RangeError(`unsafe money value for SQLite: ${value}`);
  return Number(value);
}
```
(When `@toli/engine` exists in M2, `Minor` is imported from it instead of being declared here.)

- [ ] **Step 4: Run it and check that it passes**

Run: `pnpm --filter @toli/mobile test`
Expected: `4 passed`.

- [ ] **Step 5: Add SQLite + Drizzle**

Run: `pnpm --filter @toli/mobile exec expo install expo-sqlite && pnpm add --filter @toli/mobile drizzle-orm && pnpm add -D --filter @toli/mobile drizzle-kit babel-plugin-inline-import`

`apps/mobile/src/spikes/schema.ts` (a trimmed copy of two tables with the documented names, [03 §5.2, §10](../../03-database-schema.md)):
```ts
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const expense_revisions = sqliteTable('expense_revisions', {
  id: text('id').primaryKey(),
  expense_id: text('expense_id').notNull(),
  amount_minor: integer('amount_minor').notNull(),
  base_amount_minor: integer('base_amount_minor').notNull(),
  local_state: text('local_state').notNull(),
});

export const outbox = sqliteTable('outbox', {
  op_id: text('op_id').primaryKey(),
  trip_id: text('trip_id').notNull(),
  type: text('type').notNull(),
  entity_id: text('entity_id').notNull(),
  payload: text('payload').notNull(),
  created_at: text('created_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  state: text('state').notNull(),
});
```

`apps/mobile/drizzle.config.ts`:
```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', driver: 'expo', schema: './src/spikes/schema.ts', out: './drizzle' });
```

Run: `pnpm --filter @toli/mobile exec drizzle-kit generate`
Expected: `drizzle/0000_*.sql` and `drizzle/migrations.js` are created.

Babel: add `plugins: [['inline-import', { extensions: ['.sql'] }]]` to `apps/mobile/babel.config.js`. Metro: create `apps/mobile/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
module.exports = config;
```

- [ ] **Step 6: Write the on-device check screen** `apps/mobile/src/spikes/sqlite-money.tsx`. It runs the checks and renders `PASS`/`FAIL` for each:

```tsx
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import migrations from '../../drizzle/migrations';
import { fromDb, toDb } from '../data/money-codec.ts';
import { expense_revisions, outbox } from './schema.ts';

const sqlite = openDatabaseSync('spike.db');
const db = drizzle(sqlite);
const VALUES = [1n, 33334n, 100_000_000_000n, 9_007_199_254_740_991n, -100_000_000_000n];

export function SqliteMoneySpike() {
  const { success, error } = useMigrations(db, migrations);
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    if (!success) return;
    const out: string[] = [];
    const check = (name: string, ok: boolean, extra = '') => out.push(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`);
    db.delete(outbox).run();
    db.delete(expense_revisions).run();
    check('hermes bigint', 2n ** 60n === 1152921504606846976n);
    VALUES.forEach((v, i) =>
      db.insert(expense_revisions).values({ id: `r${i}`, expense_id: `e${i}`, amount_minor: toDb(v), base_amount_minor: toDb(v), local_state: 'pending' }).run());
    const rows = db.select().from(expense_revisions).all();
    check('round-trip', rows.every((r, i) => fromDb(r.amount_minor) === VALUES[i]));
    const sum = rows.reduce((a, r) => a + fromDb(r.base_amount_minor), 0n);
    check('bigint sum', sum === VALUES.reduce((a, v) => a + v, 0n), String(sum));
    try {
      db.transaction((tx) => {
        tx.insert(expense_revisions).values({ id: 'rb', expense_id: 'eb', amount_minor: 5, base_amount_minor: 5, local_state: 'pending' }).run();
        tx.insert(outbox).values({ op_id: 'ob', trip_id: 't', type: 'expense.create', entity_id: 'eb', payload: '{}', created_at: 'now', state: 'queued' }).run();
        throw new Error('kill mid-save');
      });
    } catch {}
    const leaked = db.select().from(outbox).all().length + db.select().from(expense_revisions).all().filter((r) => r.id === 'rb').length;
    check('atomic rollback', leaked === 0);
    const t0 = performance.now();
    db.transaction((tx) => {
      tx.insert(expense_revisions).values({ id: 'rt', expense_id: 'et', amount_minor: 120000, base_amount_minor: 120000, local_state: 'pending' }).run();
      for (let k = 0; k < 4; k++) tx.insert(outbox).values({ op_id: `o${k}`, trip_id: 't', type: 'expense.create', entity_id: 'et', payload: '{"x":1}', created_at: 'now', state: 'queued' }).run();
    });
    const ms = performance.now() - t0;
    check('save < 100 ms', ms < 100, `${ms.toFixed(1)} ms`);
    setLines(out);
  }, [success]);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ color: 'white', fontSize: 16 }}>{error ? `FAIL migrations ${error.message}` : lines.join('\n') || 'running…'}</Text>
    </ScrollView>
  );
}
```
(Inline styles are fine here: this is throwaway spike code outside the design system, and it gets deleted in Step 9.)

Temporarily render it from `App.tsx`: `export default function App() { return <SqliteMoneySpike />; }`.

- [ ] **Step 7: Build and run on the phone**

Founder: turn on **Developer options → USB debugging**, plug the phone in, and accept the "Allow USB debugging" prompt.
Run (PowerShell, with the Android Studio JDK): `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"; $env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"; & "$env:ANDROID_HOME\platform-tools\adb.exe" devices`
Expected: one device listed as `device`.
Run: `pnpm --filter @toli/mobile android`
Expected: the app installs and launches, and every line reads `PASS`.

- [ ] **Step 8: Write `docs/spikes/03-sqlite-money.md`** with the real screen output (photo or `adb exec-out screencap -p > shot.png`) and the measured save time.

- [ ] **Step 9: Remove the throwaway code** (`src/spikes/`, the `App.tsx` change, `drizzle/`, `drizzle.config.ts`). Keep `money-codec.ts` + its test, the Drizzle deps and the babel/metro SQL setup, because M5 uses them. Then commit: `spike(03): expo-sqlite + Drizzle + money codec proven on device`.

### Spike 1: Edge Functions importing workspace TypeScript packages (needs Task 0.1)

**Question:** can `supabase functions serve` (local) and the deploy bundler import `packages/*` source through a `deno.json` import map, with the same `.ts`-extension imports Metro and Vitest use? ([D-003](../../decisions/D-003-monorepo.md) trade-off.)

**Files (throwaway):** `spikes/01-edge-imports/pkg/src/index.ts`, `spikes/01-edge-imports/pkg/src/sum.ts`, `supabase/functions/spike-import/index.ts`, `supabase/functions/spike-import/deno.json`

- [ ] **Step 1:** Create a fake workspace package with a relative `.ts`-extension import and bigint:

`spikes/01-edge-imports/pkg/src/sum.ts`:
```ts
export const sumMinor = (xs: readonly bigint[]): bigint => xs.reduce((a, b) => a + b, 0n);
```
`spikes/01-edge-imports/pkg/src/index.ts`:
```ts
export { sumMinor } from './sum.ts';
```

- [ ] **Step 2:** The function. `supabase/functions/spike-import/deno.json`:
```json
{ "imports": { "@toli/spike-pkg": "../../../spikes/01-edge-imports/pkg/src/index.ts" } }
```
`supabase/functions/spike-import/index.ts`:
```ts
import { sumMinor } from '@toli/spike-pkg';
Deno.serve(() => new Response(JSON.stringify({ total: sumMinor([1n, 2n, 100000000000n]).toString() }), { headers: { 'content-type': 'application/json' } }));
```

- [ ] **Step 3: Run**

Run: `pnpm exec supabase start && pnpm exec supabase functions serve spike-import --no-verify-jwt` (a second shell), then `curl -s http://127.0.0.1:54321/functions/v1/spike-import`
Expected: `{"total":"100000000003"}`. If the import fails because the file is outside `supabase/`, try in order: (a) a `static_files`/import-map setting in `supabase/config.toml` `[functions.spike-import]`, (b) a symlink `supabase/functions/_shared/packages → ../../../packages`, (c) a pre-bundle step. Record which one works.

- [ ] **Step 4: Check the deploy bundle** without a cloud project: `pnpm exec supabase functions deploy spike-import --dry-run` if the CLI supports it; otherwise `deno check supabase/functions/spike-import/index.ts` (install Deno user-locally with `winget install DenoLand.Deno`). Record the result.
- [ ] **Step 5:** Write `docs/spikes/01-edge-imports.md`. If the workable setup differs from D-003's "import map … bundled at deploy time", write **D-033** first. Then delete the throwaway files and commit.

### Spike 4: `apply_ops` does lock → `last_seq` check → insert ([D-026](../../decisions/D-026-write-path-and-compat.md)) (needs Task 0.1)

**Question:** does a plpgsql `security definer` function correctly serialise concurrent writers and return `stale` to the loser?

**Files (throwaway):** `spikes/04-apply-ops/apply_ops_spike.sql`, `spikes/04-apply-ops/race.test.mjs`

- [ ] **Step 1: The SQL** `spikes/04-apply-ops/apply_ops_spike.sql` (minimal tables, the spike's only; the real ones come from 03 in M4):
```sql
create schema if not exists spike;
create table spike.trips (id uuid primary key, last_seq bigint not null default 0);
create table spike.trip_ops (trip_id uuid not null, seq bigint not null, op_id uuid not null unique, payload jsonb not null, primary key (trip_id, seq));

create or replace function spike.apply_ops(p_trip uuid, p_expected bigint, p_ops jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_seq bigint; v_op jsonb;
begin
  select last_seq into v_seq from spike.trips where id = p_trip for update;
  if v_seq is null then return jsonb_build_object('status','not_found'); end if;
  if v_seq <> p_expected then return jsonb_build_object('status','stale','last_seq',v_seq); end if;
  for v_op in select * from jsonb_array_elements(p_ops) loop
    v_seq := v_seq + 1;
    insert into spike.trip_ops(trip_id, seq, op_id, payload) values (p_trip, v_seq, (v_op->>'op_id')::uuid, v_op);
  end loop;
  update spike.trips set last_seq = v_seq where id = p_trip;
  return jsonb_build_object('status','applied','last_seq',v_seq);
end $$;
```

- [ ] **Step 2: The race test** `spikes/04-apply-ops/race.test.mjs` (run with `pnpm dlx vitest run spikes/04-apply-ops` after `pnpm add -Dw pg`): open 20 `pg` connections to `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, reset the trip to `last_seq = 0`, and have all 20 call `spike.apply_ops(trip, 0, '[{"op_id":"<uuid>"}]')` at once. **Expect exactly 1 `applied`, 19 `stale`**, `last_seq = 1` and 1 row in `trip_ops`. Then loop: each loser retries with the returned `last_seq` (like `sync-push`, max 3 tries per [D-026](../../decisions/D-026-write-path-and-compat.md), then an unlimited loop to prove convergence). Expect a final `last_seq = 20`, seqs 1..20 with no gaps, and 20 distinct op_ids.
- [ ] **Step 3:** Run it: `psql`-apply the SQL via `pnpm exec supabase db execute --file spikes/04-apply-ops/apply_ops_spike.sql` (or `docker exec -i supabase_db_lt psql -U postgres < …`), then run the test. Paste the output into `docs/spikes/04-apply-ops.md`. Drop the `spike` schema, delete the files, commit.

### Spike 2: FCM HTTP v1 from Deno (needs Task 0.2)

**Question:** can Deno (no Node SDKs) sign the Google service-account JWT with WebCrypto, get an OAuth token, and send a push that arrives on the phone?

**Files (throwaway):** `spikes/02-fcm-deno/send.ts`

- [ ] **Step 1:** `spikes/02-fcm-deno/send.ts`:
```ts
// deno run --allow-read --allow-net --allow-env spikes/02-fcm-deno/send.ts <sa.json> <device-token>
const [saPath, token] = Deno.args;
const sa = JSON.parse(await Deno.readTextFile(saPath));
const b64u = (b: Uint8Array | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const now = Math.floor(Date.now() / 1000);
const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const claims = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, '');
const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`)));
const jwt = `${header}.${claims}.${b64u(sig)}`;
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` })).json();
if (!tok.access_token) throw new Error(`token exchange failed: ${JSON.stringify(tok)}`);
const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
  method: 'POST', headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ message: { token, notification: { title: 'Toli spike', body: 'FCM HTTP v1 from Deno works' }, android: { priority: 'high' } } }),
});
console.log(res.status, await res.text());
```
- [ ] **Step 2:** Get a device token: temporarily add `@react-native-firebase/messaging` (or `expo-notifications` `getDevicePushTokenAsync()`) to the dev build with the founder's `google-services.json` (path via `android.googleServicesFile` in `app.json`, file kept outside git), rebuild with `pnpm --filter @toli/mobile android`, and read the token from the log.
- [ ] **Step 3:** Run: `deno run --allow-read --allow-net --allow-env spikes/02-fcm-deno/send.ts C:\Users\Admin\toli-secrets\fcm-sa.json <token>`. Expected: `200 {"name":"projects/…/messages/…"}`, and the notification appears on the phone.
- [ ] **Step 4:** Write `docs/spikes/02-fcm-deno.md` (including which token library [D-009](../../decisions/D-009-notifications.md) should use in M8), remove the throwaway code and the temporary dependency, commit.

---

## Finish (after all tasks)

- [ ] Run `superpowers:verification-before-completion`: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build`, pasting the real output.
- [ ] Run `superpowers:requesting-code-review` on the branch diff.
- [ ] Report to the founder in the §10 format and wait for "continue".
