# Toli · Project Documentation

> **This folder is Toli's long-term memory.** Read it before making any important decision, in any new chat, with any developer or AI. If code and docs disagree, one is wrong: fix it and update both.

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied (2026-09-25). Waiting for final approval; no application code before approval |
| **Last updated** | 2026-09-25 |
| **Product owner** | Aditya (PRD) · Yash (build) |

---

## Sources of truth

```
PRD (WHAT Toli does)              UI reference (HOW it looks and behaves)
docs/superpowers/specs/…-prd.md   ui-refrence/Toli App.dc.html  (+ Tear to Split, Welcome Variants,
                                   Logo Explorations, palette image)
                 ↓                            ↓
                      These docs (HOW we build it)
```

- **Ignore for now:** `design-prompt.md`, `launch-film-brief.md`, `qualified-application-engine.html`.
- The launch-film files in `ui-refrence/` are marketing. They're used only as a secondary UI source, and the prototype wins on conflicts.

---

## Reading order

| # | Doc | What's inside |
|---|---|---|
| 0 | [Open questions (simple version)](open-questions.md) | every question and the answer applied, in plain words (only the domain and the trademark check are still open) |
| 1 | [01 Overview](01-overview.md) | what Toli is, users, scope, metrics, **open questions** |
| 2 | [02 Architecture](02-architecture.md) | the system, layers, monorepo, data flows |
| 3 | [07 Calculation engine](07-calculation-engine.md) | **all money maths**: rounding, splits, FX, kitty, balances, settle-up |
| 4 | [03 Database schema](03-database-schema.md) | every Postgres and SQLite table, RLS |
| 5 | [06 Syncing](06-syncing.md) | offline-first, outbox, conflicts |
| 6 | [04 API schema](04-api-schema.md) | every endpoint, request/response, errors |
| 7 | [05 User flow](05-user-flow.md) | every journey, start to finish |
| 8 | [13 Design system](13-design-system.md) | tokens, components, motion, brand |
| 9 | [screens/](screens/README.md) | one doc per screen |
| 10 | [features/](features/README.md) | one doc per feature |
| 11 | [08 Third-party integrations](08-third-party-integrations.md) | every external service, limits, costs |
| 12 | [09 Security](09-security.md) | auth, RLS, secrets, privacy, threats |
| 13 | [10 Observability](10-observability.md) | analytics events, logging, Sentry, alerts |
| 14 | [11 Testing strategy](11-testing-strategy.md) | what we test and how |
| 15 | [12 Environments and deployment](12-environments-and-deployment.md) | dev / preview / prod, CI/CD, releases |
| 16 | [decisions/](decisions/README.md) | the decision log (D-001 …) |
| 17 | [14 Pre-development review](14-pre-development-review.md) | what's strong, what's broken, what to fix before coding |

Background research: [tech stack and free tiers](superpowers/specs/2026-09-24-toli-tech-stack.md).

---

## Rules for working on Toli

1. **Documentation first, approval second, code third, testing always.**
2. Before a major change, read: this README, then the relevant feature and screen docs, then the decision log, then the open questions.
3. Every feature follows: requirement → analysis → decision → feature doc → UX flow → screen doc → data model → API → build → test → review → **update docs** → release.
4. No table, endpoint, op type or design token exists unless it's documented here.
5. Every document and decision has a status: `Draft` → `Under Review` → `Approved` → `Superseded`. **An unapproved assumption is not a decision.**
6. Money: integers only, a pure engine, deterministic rounding, frozen FX, append-only records, tested hard ([07](07-calculation-engine.md)).

---

## Approval checklist

| Area | Doc | Status |
|---|---|---|
| Overview and open questions | [01](01-overview.md) | Draft v2 (review fixes applied) |
| Architecture | [02](02-architecture.md) | Draft v2 (review fixes applied) |
| Database | [03](03-database-schema.md) | Draft v2 (review fixes applied) |
| API | [04](04-api-schema.md) | Draft v2 (review fixes applied) |
| User flows | [05](05-user-flow.md) | Draft v2 (review fixes applied) |
| Sync | [06](06-syncing.md) | Draft v2 (review fixes applied) |
| Calculation engine | [07](07-calculation-engine.md) | Draft v2 (review fixes applied) |
| Integrations | [08](08-third-party-integrations.md) | Draft v2 (review fixes applied) |
| Security | [09](09-security.md) | Draft v2 (review fixes applied) |
| Observability | [10](10-observability.md) | Draft v2 (review fixes applied) |
| Testing | [11](11-testing-strategy.md) | Draft v2 (review fixes applied) |
| Environments | [12](12-environments-and-deployment.md) | Draft v2 (review fixes applied) |
| Design system | [13](13-design-system.md) | Draft v2 (review fixes applied) |
| Screens | [screens/](screens/README.md) | Draft v2 (31 screens) |
| Features | [features/](features/README.md) | Draft v2 |
| Decisions | [decisions/](decisions/README.md) | D-001–D-031, Approved (default) |
| Pre-development review | [14](14-pre-development-review.md) | Fixes applied (§0) |

When all rows say **Approved**, implementation starts with: project foundation → design system → database → shared schema → calculation engine → sync engine → auth → core APIs → core loop → secondary features → notifications → integrations → analytics → testing → polish → release.
