# Toli — Tech Stack

| | |
|---|---|
| **Status** | Draft v1.0 — for review |
| **Date** | 24 September 2026 |
| **Goes with** | [Toli PRD](2026-09-23-trip-money-manager-prd.md) (§16 Technical architecture) |
| **Goal** | Build and run Toli for **$0** for as long as possible, without a rebuild later |

---

## 1. The short version

| Part | We use | Cost to start |
|---|---|---|
| Mobile app | **Expo (React Native) + TypeScript** | Free |
| Data on the phone | **SQLite** (`expo-sqlite` + Drizzle) | Free |
| Money maths | **`@toli/engine`**, our own TypeScript package | Free |
| Backend + database | **Supabase** (Postgres, Mumbai region) | Free |
| Login | **Supabase Auth** | Free |
| Receipts & documents | **Cloudflare R2** | Free |
| Invite web page | **Cloudflare Workers** | Free |
| Push notifications (custom design) | **react-native-notify-kit** (maintained Notifee fork) + **Firebase Cloud Messaging** | Free |
| Exchange rates | **Frankfurter** (backup: fawazahmed0 currency-api) | Free |
| Maps & place search | **MapLibre + OpenFreeMap**, **Geoapify** | Free |
| Analytics | **PostHog** | Free |
| Crash reports | **Sentry** | Free |
| Email | **Resend** | Free |
| Code, CI, builds | **GitHub + GitHub Actions + EAS Build** | Free |
| Domain | **toli.in** or **toli.app** | ~₹800–1,200 / year |
| Play Store | Google Play developer account | $25 once |
| App Store | Apple Developer Program | $99 / year |

**What must be paid:** the two store accounts and the domain. There is no free way around them. Everything else starts free.

**Cheapest launch:** Android beta first (most of India), with no phone-number login yet. Total: **$25 + a domain.**

---

## 2. Why this stack

We checked every choice against four rules:

1. **Free to start.** It must have a real free tier with no trial end date, and commercial use must be allowed.
2. **Matches the PRD.** Offline first, Postgres as the source of truth, one shared money engine, no floating point.
3. **Easy to leave.** Standard tech (Postgres, S3-style storage, TypeScript), so moving later is a migration, not a rebuild.
4. **Few moving parts.** A small team should run the whole thing. That means two platforms, Supabase and Cloudflare, not ten.

**What we ruled out, and why:**

| Option | Why not |
|---|---|
| Firebase | Phone login and file storage now need the paid Blaze plan (card on file). Spark projects lost Storage completely in Feb 2026. |
| Vercel (free) | Hobby plan bans commercial use. |
| Netlify (free) | Credit system pauses the site when credits run out. |
| Fly.io / Railway / Render | No real free tier anymore. Render's free Postgres is deleted after 30 days. |
| PowerSync (hosted free) | Only 50 users online at once, and it switches off after a week idle. The PRD already defines our own sync. |
| Gemini free tier (receipts) | Google may use free-tier data to improve its products, and people may review it. That breaks PRD §18. |
| Google Places + MapLibre | Google's terms don't allow showing Places results on a non-Google map. |
| Notifee (original) | Archived by Invertase on 7 April 2026 (read-only, no fixes). We use its maintained fork, react-native-notify-kit, which keeps the same API. |
| Expo Push alone | It lets the phone's system draw a plain notification. It can't give us our own design (colours, images, action buttons) when the app is closed. |

---

## 3. The big picture

```
┌──────────────────────── PHONE (Expo app) ────────────────────────┐
│  Screens  →  SQLite (all reads)  →  Outbox (pending changes)     │
│                 ▲                         │                      │
│         @toli/engine (splits, balances, settle-up)               │
└─────────────────┼─────────────────────────┼──────────────────────┘
                  │ pull changes            │ push changes
                  │                         ▼
┌──────────────── SUPABASE (Mumbai) ───────────────────────────────┐
│  Edge Function "sync"  → runs @toli/engine again, checks Σ = 0   │
│  Postgres              → source of truth, op log, trip sequence  │
│  Auth                  → anonymous → Google / Apple / email      │
│  Realtime              → "trip changed, pull now" signal         │
│  pg_cron               → daily FX rates, nightly balance audit   │
└──────────────────────────────────────────────────────────────────┘
┌──────────────── CLOUDFLARE ──────────────────────────────────────┐
│  Worker  → toli.in/t/abc  (invite page: "You owe ₹1,200")        │
│          → App Links / Universal Links files                     │
│  R2      → receipt photos, tickets, PDFs (private, signed URLs)  │
└──────────────────────────────────────────────────────────────────┘
  Around it: FCM + notify-kit (custom push) · PostHog · Sentry · Resend · Frankfurter · Geoapify
```

---

## 4. How it works: a trip from start to finish

This follows one trip through the system: the Goa weekend from the PRD.

**Step 1 — Aditya installs and creates a trip (no account needed)**
- The app silently creates an **anonymous Supabase session**, with no sign-up screen.
- The trip is written to **SQLite on the phone** first, so it works with no network.
- He adds Rahul, Neha and Jay as **ghost members**, which are just names.

**Step 2 — He logs "Dinner ₹1,200" at the restaurant (offline)**
- The number pad writes the expense to SQLite. **`@toli/engine`** splits it and updates balances right away.
- The change also goes into the **outbox**, a queue of changes waiting to sync.

**Step 3 — Signal comes back, and the phone syncs**
- The outbox sends its changes to the Supabase **Edge Function `sync`**.
- The function:
  1. checks the change is valid,
  2. runs the **same `@toli/engine`** code again,
  3. confirms all balances add up to exactly ₹0,
  4. gives the change the trip's next sequence number, and
  5. saves it in Postgres.
- If the balances don't add up to zero, the write is **rejected** (PRD §9.3).
- Supabase **Realtime** tells other phones on the trip, "new changes, pull now."

**Step 4 — Aditya shares the trip on WhatsApp**
- The link is `toli.in/t/abc123`.
- A **Cloudflare Worker** serves a small web page. Neha sees the total spent and **what she owes**, with no install and no login (PRD §13).
- WhatsApp shows a preview card, generated by the same Worker.

**Step 5 — Neha installs and claims her name**
- On Android, the **Play Install Referrer** carries the trip code through the install, so the app opens her trip.
- On iOS, she taps the link again or enters a short code.
- She picks "I'm Neha", and her **anonymous session is linked** to Google, Apple or email. All her history stays attached.

**Step 6 — She attaches a receipt photo**
- The app shrinks the photo on the phone to about 150 KB.
- The Edge Function checks she is on the trip and returns a **signed upload link**.
- The photo goes straight to **R2**. It is only viewable through short-lived signed links.

**Step 7 — Settle up**
- `@toli/engine` works out the fewest payments: "Neha pays Aditya ₹1,200".
- The app opens a **`upi://pay` link** in her UPI app. **Toli never touches the money.**
- Coming back, she confirms "Paid". A Settlement is recorded and synced.
- The Edge Function sends a **push through FCM**. On Aditya's phone, **notify-kit** draws a Toli-styled "Neha paid you ₹1,200" card with her avatar and a **View trip** button (see §5.8).

**In the background, every day:**
- **pg_cron** fetches exchange rates from Frankfurter into an `fx_rates` table, and phones sync it.
- A nightly job recomputes every balance to catch errors.
- A **GitHub Action** backs up the database to R2.
- **PostHog** records funnel events. **Sentry** catches crashes.

---

## 5. Each part: what, why and how

### 5.1 Mobile app: Expo + React Native + TypeScript
- **What:** one codebase for Android and iOS, with Expo Router for screens and Zustand for small UI state.
- **Why:** the PRD already chose it. It has the biggest ecosystem and free cloud builds. Hermes supports `BigInt`, so money stays in whole paise.
- **How:** use `expo-sqlite` for storage and `expo-image-manipulator` to compress photos. Write our own ₹1,23,456 formatter in the engine; don't rely on the phone's `Intl`.

### 5.2 On-phone data: SQLite + Drizzle
- **What:** the full trip lives on the phone, and every screen reads from here.
- **Why:** offline is the default (PRD §12). The UI never waits for the network.
- **How:** Drizzle defines typed tables shared with the server. Every edit writes the row **and** an outbox entry, both in one transaction.

### 5.3 Money engine: `@toli/engine`
- **What:** a pure TypeScript package that handles splits, rounding, balances, the kitty and settle-up.
- **Why:** it's the most important decision in the PRD. The phone and the server run **the exact same code**, so their numbers can never disagree.
- **How:** it has no network calls, no clock and no dependencies. Tested with Vitest + fast-check (random trips, checking the §11 rules) plus the Appendix A cases.

### 5.4 Backend + database: Supabase
- **What:** managed Postgres, with Edge Functions (TypeScript/Deno), Row Level Security, Realtime and pg_cron.
- **Why:** it is the Postgres the PRD asks for. Database, login, realtime and server code come in one free project, and the Mumbai region keeps it fast and in India.
- **How:**
  - Simple reads and writes go through Supabase's auto API, with Row Level Security: "you can only see trips you're a member of".
  - Sync goes through the `sync` Edge Function, which calls a Postgres function that locks the trip row and assigns the next sequence number.
  - Realtime is only a nudge. The phone still pulls from its last known sequence number.

### 5.5 Login: Supabase Auth
- **What:** anonymous sign-in first, upgraded later to Google, Sign in with Apple, or email code.
- **Why:** the PRD says no sign-up wall. All of these options are free, but phone OTP is not.
- **How:**
  - Email codes are sent through Resend (custom SMTP), because Supabase's built-in email has a very low limit.
  - Apple requires Sign in with Apple if we offer Google login.
  - **Phone OTP later:** Supabase's free "Send SMS hook" lets us pick the cheapest sender. That's WhatsApp authentication messages (~₹0.12 each, no DLT) or MSG91 SMS (₹0.16–0.25 each, plus ~₹5,900 DLT registration).

### 5.6 Files: Cloudflare R2
- **What:** private storage for receipts, tickets and trip documents.
- **Why:** it gives 10 GB free and **free downloads**, compared with only 1 GB on Supabase Storage. It uses the standard S3 API, so it's easy to move.
- **How:**
  - The phone compresses the file.
  - The Edge Function checks trip membership and signs a short-lived upload or download link.
  - The file goes directly to R2.
  - Files are encrypted at rest (PRD §18).

### 5.7 Invite page + deep links: Cloudflare Workers
- **What:** a small server-rendered page at `toli.in/t/<code>`. The same domain hosts the App Links and Universal Links files.
- **Why:** it gives 100k requests a day free and allows commercial use. Firebase Dynamic Links has shut down.
- **How:**
  - The Worker reads a safe, read-only view of the trip (names, totals, what each person owes).
  - On Android, the Play Install Referrer handles deferred deep links.
  - On iOS, the app shows a short-code screen.
  - If that isn't enough, add Branch's free tier later.

### 5.8 Push notifications: custom design with notify-kit + FCM

**What**
- **[react-native-notify-kit](https://github.com/marcocrupi/react-native-notify-kit)** draws the notification on the phone. It's the maintained fork of [Notifee](https://notifee.app/): same API, same docs, and the original Notifee was archived in April 2026.
- **Firebase Cloud Messaging (FCM)** delivers the message to Android and iOS. On iOS, FCM hands it to Apple's APNs.
- **Cost: $0.** notify-kit is free and open source (Apache-2.0). FCM is free on Firebase's free Spark plan. APNs is free once we have the Apple account.

**Why not just Expo Push**
- With a plain push, the phone's system draws the notification, so every app looks the same.
- To get **our own design** even when the app is closed, the app has to receive the data itself and draw the notification with notify-kit.

**What we can design** (Notifee / notify-kit features)

| Toli notification | Design |
|---|---|
| **"Neha paid you ₹1,200"** | Toli colour and small icon, Neha's avatar as the large icon, amount in the title, **View trip** button |
| **"Rahul added Dinner ₹1,200 — your share ₹600"** | Receipt photo as a big picture when there is one, **See split** and **Not me** buttons |
| **Settle-up reminder** | **Pay ₹1,000 via UPI** button (opens the `upi://pay` link) and **Mark as paid** |
| **Kitty / budget alerts** | Progress bar: "Kitty 82% used — ₹2,400 left" |
| **Busy trip digest** (5+ events in 30 min) | Inbox style: one grouped card per trip with the latest lines (PRD F16) |
| **Categories** | Android channels such as *Payments*, *Expenses*, *Reminders*, *Trip updates*, so users can mute each one (PRD F16) |

**How it works**
1. Something happens (an expense is added, a payment is recorded). The `sync` Edge Function decides who to notify, following PRD F16 rules: digest, 48-hour reminder limit, user settings.
2. The Edge Function sends it through the **FCM HTTP v1 API**. It can build the message with notify-kit's server helper (`buildNotifyKitPayload`), or by hand.
   - **Android:** a *data-only* message with high priority. notify-kit (FCM Mode) receives it, even when the app is closed, and draws our design.
   - **iOS:** an alert with `mutable-content`. A small **Notification Service Extension**, set up automatically by notify-kit's Expo config plugin, adds the avatar or receipt image before iOS shows it.
3. Tapping a button deep-links into the app (for example, the trip screen or the UPI payment).
4. The phone saves its FCM token to Supabase after login and refreshes it when it changes.

**Setup needs**
- An **Expo development build** (`expo prebuild` / EAS Build). notify-kit doesn't run in Expo Go.
- `@react-native-firebase/app` + `@react-native-firebase/messaging` (free) and a Firebase project on the **Spark (free) plan**, used only for FCM.
- The React Native **New Architecture**, which notify-kit requires and is the default in current Expo.

**Limits to know**
- These are **rich styles** (colours, images, buttons, progress, grouping), not fully free-form layouts. Android 12+ restricts custom layouts for every app. A fully custom card on iOS needs a native Notification Content Extension (Swift), which is possible later if the design needs it.
- notify-kit is a community fork with a small maintainer team. To stay safe, all notification code sits behind one small file (`notify.ts`). If the fork stops, we can switch that file to `expo-notifications` (Invertase's own recommendation) without touching the rest of the app.
- **Please share the notification design image.** It didn't come through, and the table above is our best guess until we see it.

### 5.9 Exchange rates: Frankfurter
- **What:** daily rates for 300+ currencies, with no key needed. The backup is fawazahmed0 currency-api.
- **Why:** it's free, one fetch a day serves every user, and the rate is frozen on each expense (PRD F10).
- **How:** pg_cron fetches the rates once a day into `fx_rates`, and phones sync that table. Offline, the app uses the last table and shows its date.

### 5.10 Maps + places: MapLibre, OpenFreeMap, Geoapify
- **What:**
  - MapLibre draws the map, using free OpenFreeMap tiles.
  - Geoapify provides place search (3,000 free credits a day).
- **Why:** all free for commercial use, and MapLibre can save maps for offline.
- **How:**
  - Search goes through our own Edge Function (hides the key, caches results, lets us switch provider without an app update).
  - **Test Indian place quality in R2.** If it's too weak, switch to Google Maps SDK + Places together: 70k free Places calls a month in India, but no offline maps.

### 5.11 Receipt scanning (Pro, R2)
- **What:** an AI vision model that turns a bill photo into line items.
- **Why:**
  - Free while building: Cloudflare Workers AI (about 130 receipts a day) or Groq.
  - Paid in production: Gemini Flash-Lite (paid tier) or Mistral Small, at about **₹0.05–0.15 per receipt**, against a ₹149 Pro pass. It's Pro-only, so revenue always pays for it.
- **How:** it runs only on the server, never with a key in the app. Always show an editable draft. Confirm zero-retention terms with the provider before launch (PRD §18).

### 5.12 Analytics + crashes: PostHog + Sentry
- **What:**
  - **PostHog:** 1M events a month, feature flags and surveys.
  - **Sentry:** 5K errors a month.
- **Why:** PostHog covers the PRD §19 funnel and `duration_ms`. Its flags can run the ₹99/149/199 price test. Sentry works with Expo and EAS out of the box.
- **How:** PostHog queues events offline. Upload Sentry source maps in the EAS build.

### 5.13 Email: Resend
- **What:** 3,000 emails a month, max 100 a day, sent from `hello@toli.in`.
- **Why:** it's free and simple, and it plugs into Supabase as SMTP.
- **How:** verify the domain (SPF/DKIM). Use it for login codes and receipts, never for marketing.

### 5.14 Code, CI/CD and builds
- **What:** a private GitHub repo, GitHub Actions for CI and EAS Build for app builds.
- **Why:**
  - GitHub Actions gives 2,000 free minutes a month (use Linux runners, since macOS counts 10×).
  - EAS gives 15 Android and 15 iOS cloud builds a month free.
  - Android builds on our own machine (`eas build --local` in WSL2) are unlimited.
- **How:** see the table below.

| On every pull request | Nightly | For a release |
|---|---|---|
| Typecheck, lint, engine tests, sync simulation | Database backup (`pg_dump` to R2) | EAS Build, then EAS Submit to the stores |

### 5.15 Development tools
| Tool | Use |
|---|---|
| pnpm + Turborepo | Monorepo |
| TypeScript (strict), Zod | Types everywhere, validation at every API edge |
| Vitest + fast-check | Engine and sync tests |
| Maestro | End-to-end tests on a phone (free) |
| Supabase CLI | Local Postgres, migrations, functions |
| Wrangler | Run and deploy the Cloudflare Worker |
| Biome (or ESLint + Prettier) | Lint and format |

**Repo layout:**
```
toli/
├─ apps/mobile        Expo app
├─ apps/web           Cloudflare Worker (invite page, link files)
├─ packages/engine    @toli/engine — splits, balances, settle-up
├─ packages/schema    Drizzle tables + Zod types (shared)
└─ supabase/          migrations, Edge Functions, cron jobs
```

---

## 6. Free limits and when we'll start paying

| Service | Free limit | What happens as we grow | Next step and price |
|---|---|---|---|
| **Supabase** | 500 MB DB, 5 GB egress, 50k logins/month, 200 live connections | Likely the **first real limit**, at roughly 5–10k active trips or busy peak hours | Pro, **$25/month** (raises everything) |
| **EAS Update** (over-the-air fixes) | 1,000 users/month | Hit early if we rely on it | $19/month, or just ship through the stores |
| **Phone OTP** | none | Costs from the first message | ~₹0.12 per WhatsApp code |
| **Resend** | 100 emails/day | Only if email becomes the main login | $20/month, or Amazon SES (~$0.10 per 1,000) |
| **Sentry** | 5K errors/month | Thousands of weekly users | Sample, or move errors to PostHog (100K free) |
| **PostHog** | 1M events/month | Lasts a long time | Sample non-critical events |
| **R2** | 10 GB | Mostly the R3 document vault | $0.015 per GB per month (small) |
| **Cloudflare Workers** | 100k requests/day | Lasts a long time | $5/month plan |
| **Receipt AI** | — | Every Pro scan | Paid by Pro revenue |

**Rough cost at real scale** (tens of thousands of monthly users): **~$50–100 a month**, mainly Supabase Pro, Expo Starter and OTP messages. By then, Pro passes should cover it.

---

## 7. Things to watch

1. **Supabase pauses projects after 7 days of no activity.** Real users prevent this. Before launch, an UptimeRobot ping every 5 minutes keeps it awake.
2. **Supabase Free has no backups.** The nightly GitHub Action backup is **not optional** for a money app.
3. **Google Play testing rule:** new personal accounts need **12 testers opted in for 14 days** before going live. Start this with beta groups early.
4. **R2 may ask for a card or PayPal** when you turn it on, even for free use. Until then, Supabase Storage (1 GB) works.
5. **Cloudflare free Workers get 10 ms of CPU per request.** Fine for the invite page. Never do balance maths there; that belongs in the Edge Function.
6. **Notifications need a development build.** Once notify-kit is added, the app no longer runs in Expo Go. Use an EAS development build from day one.
7. **Free services with no uptime promise** (OpenFreeMap, Frankfurter, Geoapify): always call them through our own server or cache, so we can switch without an app update.
8. **Buy the domain early.** Invite links and app links are tied to it, and changing domains later breaks every link already shared on WhatsApp.

---

## 8. Build order

| Step | Do this | Cost |
|---|---|---|
| 1 | Create the monorepo and build **`@toli/engine`** with the full test suite (PRD §11, Appendix A) | $0 |
| 2 | Build the Expo app with SQLite + outbox, working fully offline | $0 |
| 3 | Set up Supabase (Mumbai): schema, Row Level Security, `sync` Edge Function, anonymous login | $0 |
| 4 | Buy the domain. Set up Cloudflare: invite page, App Links files, R2 | ~₹800–1,200/yr |
| 5 | Add custom push (Firebase project for FCM, notify-kit, notification designs), PostHog, Sentry, Resend, the nightly backup, UptimeRobot | $0 |
| 6 | Google Play account and a closed test with 12+ testers for 14 days | $25 once |
| 7 | **R1 beta on Android** (PRD §20: 20 real trips, zero balance errors) | — |
| 8 | Apple Developer account for the iOS beta | $99/yr |
| 9 | R2 features: FX, maps and places, receipt AI (paid, Pro-only) | Pay per use |
| 10 | Phone OTP via WhatsApp, if needed | ~₹0.12 per login |

---

## 9. Other options we looked at

- **Everything on Cloudflare** (one Durable Object per trip). A great fit for per-trip ordering and live updates, with 5 GB free. Not chosen for v1: it drops Postgres, makes cross-trip queries harder, and still needs separate login. Revisit if live updates become the bottleneck.
- **Neon** instead of Supabase's database. A good free Postgres with 6-hour restore, but no built-in login, realtime or functions. Useful as a migration target.
- **Oracle Cloud Always Free VM.** A free server (2 CPUs / 12 GB since June 2026), but we'd run and patch it ourselves, and idle machines can be reclaimed. Not worth it for a small team.

---

## 10. Sources (checked 24 Sep 2026)

Prices and limits change often. Check before paying for anything.

- Supabase — https://supabase.com/pricing · https://supabase.com/docs/guides/auth/auth-hooks
- Cloudflare Workers, R2, Durable Objects — https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/r2/pricing/ · https://developers.cloudflare.com/durable-objects/platform/pricing/
- Firebase (Blaze required for phone auth and Storage) — https://firebase.google.com/pricing · https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Expo EAS — https://expo.dev/pricing
- Notifications — Notifee (archived Apr 2026): https://github.com/invertase/notifee · react-native-notify-kit: https://github.com/marcocrupi/react-native-notify-kit · FCM (free): https://firebase.google.com/pricing
- Apple / Google Play — https://developer.apple.com/programs/enroll/ · https://support.google.com/googleplay/android-developer/answer/14151465
- WhatsApp pricing — https://developers.facebook.com/docs/whatsapp/pricing · MSG91 — https://msg91.com/in/pricing
- Frankfurter — https://frankfurter.dev/ · fawazahmed0 currency-api — https://github.com/fawazahmed0/exchange-api
- OpenFreeMap — https://openfreemap.org/ · Geoapify — https://www.geoapify.com/pricing/ · Google Maps India — https://developers.google.com/maps/billing-and-pricing/pricing-india
- Gemini API terms — https://ai.google.dev/gemini-api/terms · Workers AI — https://developers.cloudflare.com/workers-ai/platform/pricing/
- PostHog — https://posthog.com/pricing · Sentry — https://sentry.io/pricing/ · Resend — https://resend.com/pricing
- Vercel Hobby restriction — https://vercel.com/docs/limits/fair-use-guidelines
- GitHub Actions — https://docs.github.com/en/billing/concepts/product-billing/github-actions

*Not confirmed on official pages:* Branch free tier size, WhatsApp's exact INR rate, DLT fee, .in renewal prices, and whether R2 needs a card.
