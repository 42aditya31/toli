# D-016 · Testing phase: APK shared directly, join by code
| Status | Under Review | Date | 2026-09-24 |
|---|---|---|---|

## Problem
Before the store launch, the founder will share an **APK file** with groups of 5–6 friends. Without the Play Store there's no install referrer, so a link can't carry the trip through the install.

## Decision
- EAS builds an **APK** with the **`beta`** profile (internal distribution, EAS Update channel `beta`). It's shared on WhatsApp or Drive at $0, with no Play account needed.
- Everyone gets an **anonymous account** automatically on first open ([D-007](D-007-auth.md)).
- **Joining:**
  - tap the invite link (App Links work for sideloaded APKs when `assetlinks.json` lists the `beta` signing key), **or**
  - tap **Join trip** and type the code, **then**
  - pick "Which one are you?" to claim your name.
- The invite page runs on the production Worker, on a free `*.workers.dev` address until a domain is bought.
- **Reinstall risk:** the organiser can **Release** a member so the person re-claims it. An optional "Save my account with Google" protects against this.
- **Environments:** beta testers are **real users with real trips**, so the tester APK (EAS profile `beta`) points to the **production** Supabase project from day one. Their trips carry over to the store launch, with no migration.
- **Preview** is for internal QA with **seed data only**, and is never given to testers. This keeps the rule "never test on production data": QA happens on Preview, and production only ever holds real usage.

- **Moving testers to the Play Store:**
  - The beta APK uses the same application ID as the store app.
  - Play App Signing re-signs store builds, so a Play install **can't upgrade over a sideloaded APK**. Testers must uninstall once.
  - So, 2 weeks before the switch, the app prompts every tester to **Save my account** (Google/email). Their trips come back after reinstalling.
- **Old invite links:** after a domain is bought, the `*.workers.dev` Worker stays up and redirects (301) `/t/*` and `/j/*` to the new domain, so links already shared on WhatsApp keep working.

## Why
It's the cheapest possible way to test with real groups. It also exercises the same join flow real users will use.

## Impact
[features/invites-and-joining](../features/invites-and-joining.md), [12](../12-environments-and-deployment.md).
