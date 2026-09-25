# 05 · User Flow

| | |
|---|---|
| **Status** | Draft v2: pre-development review fixes applied |
| **Last updated** | 2026-09-25 |
| **Source** | PRD §5, §6.1 (G1), §8, §10 (F1–F16), §12, §13, §14, §18 · UI reference `ui-refrence/Toli App.dc.html` (navigation logic) · [Pre-development review](14-pre-development-review.md) |
| **Related** | [02 Architecture](02-architecture.md) · [04 API](04-api-schema.md) · [06 Syncing](06-syncing.md) · [07 Engine](07-calculation-engine.md) · [09 Permission matrix](09-security.md#permission-matrix) · [13 Design system](13-design-system.md) · [D-007](decisions/D-007-auth.md) · [D-008](decisions/D-008-invite-links.md) · [D-012](decisions/D-012-hold-to-tear.md) · [D-015](decisions/D-015-welcome-direction.md) · [D-016](decisions/D-016-testing-distribution.md) · [D-017](decisions/D-017-itemised-free-scan-pro.md) · [D-018](decisions/D-018-r1a-r1b-scope.md) … [D-031](decisions/D-031-permission-matrix.md) |

This document is the whole journey through Toli, told in plain language. Each step links to the screen that shows it (`screens/`) and the feature that powers it (`features/`).

**Releases ([D-018](decisions/D-018-r1a-r1b-scope.md)).** Every flow below is in **R1a** (the beta APK) unless it's marked **R1b**, **R2** or **R3**. R1b adds Direct settle mode, Itemised and Adjustment splits, Refunds, paying from the web page, custom Android notification styles, push reminders, the kitty top-up suggestion, digests and Hindi.

**Who can do what** is never repeated here. The [permission matrix](09-security.md#permission-matrix) is the only source ([D-031](decisions/D-031-permission-matrix.md)).

---

## 1. The main path in one picture

```
 Tap the app icon
      │
      ▼
 ┌──────────┐   first time    ┌──────────┐   "Get started"   ┌─────────────┐
 │  Splash  │ ──────────────► │ Welcome  │ ────────────────► │ Create trip │
 └──────────┘                 └──────────┘                   └─────────────┘
      │ returning                  │ "I have an invite link"        │ name + ghost members
      │                            │ "I already have an account" ──► Sign in
      ▼                            ▼                                ▼
 ┌────────────┐             ┌─────────────┐                  ┌─────────────┐
 │ Trips list │             │ Join in app │                  │ Empty trip  │  keypad one tap away
 └────────────┘             └─────────────┘                  └─────────────┘
      │ open trip                  │ claim "I'm Neha"               │ tap "+"
      ▼                            ▼                                ▼
 ┌────────────┐ ◄────────────────────────────────────────── ┌─────────────┐
 │ Trip home  │   tear-stubs animation, balances update      │ Add expense │ ⇄ Split editor
 └────────────┘                                              └─────────────┘
      │ tap a balance     │ "See all"         │ ⋯            │ tap "Settle up"
      ▼                   ▼                   ▼              ▼
 ┌───────────────┐ ┌──────────────┐ ┌───────────────┐ ┌───────────┐  hold to tear  ┌──────────────┐
 │ Balance trace │ │ All expenses │ │ Trip settings │ │ Settle up │ ─────────────► │ Tear overlay │ → "STUBS READY"
 └───────────────┘ └──────────────┘ └───────────────┘ └───────────┘                └──────────────┘
                                                            │ payer taps "Pay via UPI" → own UPI app → "Did it go through?"
                                                            │ "Recorded payments" → list with Void
                                                            ▼
                                     Settlement recorded → everything at 0 → Close trip (or end date + 24 h)
                                     → rounding adjustment if needed → trip settled ("Everyone's square."; Recap from R3)
```

**Speed target.** A new user should log their first expense fast:
- **PRD G1 / §13:** within **90 seconds** of install.
- **Master brief:** within **~60 seconds**.
- We **design for 60 s and accept 90 s** (open question [OQ-P2](01-overview.md#open-questions)). After the first time, logging one expense must take **≤ 5 s** from icon tap to saved (PRD §5.2), measured by `expense_added.duration_ms` ([10](10-observability.md)).

---

## 2. First-time user vs returning user

| | First-time user | Returning user |
|---|---|---|
| **Splash** | Plays in full (min 1.2 s) while the app creates a silent **anonymous account** | Leaves as soon as SQLite is read (min 1.2 s, max 2.9 s) |
| **Next screen** | [Welcome](screens/welcome.md) | [Trips list](screens/trips-list.md), or straight to the last open trip |
| **Network needed?** | No. The anonymous sign-in is retried in the background if offline; the trip still works locally | No. Everything reads from SQLite |
| **Account prompt** | Not shown | "Save my account" appears only at the moments in §9 |
| **Deep link waiting?** | If the app was installed from an invite (Play Install Referrer), skip Welcome and go to [Join in app](screens/join-in-app.md) | An invite link opens [Join in app](screens/join-in-app.md) directly |

Screens: [splash](screens/splash.md) · [skeleton-loading](screens/skeleton-loading.md) · [welcome](screens/welcome.md) · [trips-list](screens/trips-list.md)
Features: [auth-and-identity](features/auth-and-identity.md) · [offline-and-sync](features/offline-and-sync.md)

```
 App start
   │
   ├─ Read SQLite ──► any trips? ──yes──► Trips list (or last trip)
   │                      │
   │                      no
   │                      ▼
   ├─ Pending invite? ──yes──► Join in app
   │                      │
   │                      no
   │                      ▼
   └──────────────────► Welcome
```

If SQLite is still loading (large trips, first open after an update), show the [skeleton-loading](screens/skeleton-loading.md) shimmer, never a blank screen or spinner-only screen.

---

## 3. Onboarding

### 3.1 Welcome
- Design direction 1b, "the screen is the ticket" ([D-015](decisions/D-015-welcome-direction.md)).
- Two buttons and one text link:
  - **Get started** → [Create trip](screens/create-trip.md)
  - **I have an invite link** → [Join in app](screens/join-in-app.md) (paste link or type a code)
  - **I already have an account** → [Sign in](screens/sign-in.md) (Google, Apple on iOS, or email code). For someone on a new phone who saved their account before (§14.2)
- No sign-up, no phone number, no email. The PRD's optional phone OTP (§13) is **not** shown at launch ([D-007](decisions/D-007-auth.md)).

### 3.2 The anonymous account
- Created silently on first open by Supabase Auth. The user never sees it.
- It gives the phone a user ID, so sync, invites and RLS all work.
- Offline on first open? The trip is created locally anyway. The anonymous sign-in retries when the network returns, then the outbox syncs ([06](06-syncing.md)).

Features: [auth-and-identity](features/auth-and-identity.md)

---

## 4. Create a trip (PRD F1)

```
 Create trip
   ├─ Trip name  (the only required field)
   ├─ Template chips: Beach · Road trip · Trek · Wedding · Office offsite · Other  (cosmetic)
   ├─ Optional: destination, dates, cover, base currency (default INR)
   └─ Members: "You (organiser)" + type names → each becomes a GHOST
          │
          ▼  tap "Create"  (no network needed)
   Toast: "Goa Weekend created · works offline"
          │
          ▼
   Empty trip  → big "+" → Add expense
```

- The trip is written to SQLite first, with a `trip.create` op in the outbox ([06 §4](06-syncing.md)).
- A future start date puts the trip in `planning`; otherwise `active`.
- No name → toast "Give the trip a name".

### 4.1 Trip settings ([screens/trip-settings](screens/trip-settings.md))
Trip home → **⋯** in the header → Trip settings. One place for:
- rename, dates, destination, cover;
- base currency (only while the trip has no expenses);
- kitty on/off and its low threshold; kitty hand-over;
- per-trip notification mute;
- share or **rotate** the invite;
- **Close trip** / **Request reopen** / **Reopen** (§9.4);
- **Leave trip** (your balance must be 0; the last organiser must hand over the role first);
- **Delete trip**, only if no one else has claimed a spot; otherwise leave or archive.

Each action follows the [permission matrix](09-security.md#permission-matrix). Items the viewer can't use are hidden, not greyed out with an error.

Screens: [create-trip](screens/create-trip.md) · [empty-trip](screens/empty-trip.md) · [trip-home](screens/trip-home.md) · [trip-settings](screens/trip-settings.md)
Features: [trips](features/trips.md) · [members-and-ghosts](features/members-and-ghosts.md)

---

## 5. Add members, including ghosts (PRD F2)

| Way to add | What happens | Needs |
|---|---|---|
| **Type a name** | A ghost member is created. It can pay, owe, and be settled, exactly like a real member | Nothing |
| **From contacts** | Pick a contact; only the **name** is copied and becomes a ghost. No phone number or hash is stored or sent, and there is no "already on Toli" matching in v1 ([D-025](decisions/D-025-no-contacts-matching-v1.md)) | Contacts permission, asked at the moment of use |
| **Share the invite link** | Friends join and claim their ghost (§7) | Network |

- Late joiners get a **joined-from date**. New expenses dated before it leave them out by default; this can be changed per expense.
- Adding ghosts, renaming and removing members follow the [permission matrix](09-security.md#permission-matrix). Removing someone with a non-zero balance is blocked, with a clear reason: "Settle Jay's ₹1,200 or move his expenses first" ([06 §5](06-syncing.md)).
- **Removed members stay at zero** ([D-030](decisions/D-030-removed-members-locked.md)). Any later change that would give a removed member a balance (editing or deleting an old expense, voiding a settlement) is rejected: "This changes Jay's balance. Add Jay back first." In the split editor, removed members show greyed out as **Removed** and can't be edited.
- The **last organiser** can't leave or be removed without handing the role to someone else first.
- Up to 50 members per trip (the server rejects more with `member_limit`, [04 §2.1](04-api-schema.md)).

Screens: [members](screens/members.md) · [create-trip](screens/create-trip.md)
Features: [members-and-ghosts](features/members-and-ghosts.md)

---

## 6. Add an expense (PRD F3) — the critical path

```
 Tap "+" (tab bar FAB)
   │
   ▼
 Add expense: keypad already focused
   ├─ Type amount ─────────────► live line: "₹300 each · 4 people"
   ├─ (optional) Paid by ──────► payer sheet: recent payers first, Kitty, "+ Add payer" for several payers
   ├─ (optional) "Today · ₹ ▾" ► sheet: date/time, currency, "Booked before trip"
   ├─ (optional) Category chip, description
   ├─ (optional) "Repeat: Cab ₹800"
   ├─ (optional) Split chip ───► Split editor (one tap)
   │
   ▼ Save  (an amount of 0 is blocked: "Type an amount first")
 Duplicate check (same amount and currency, spent within 10 min in trip time, by a different member)
   ├─ looks like a duplicate ──► "Already logged?" sheet ("Rahul logged ₹1,200 10 minutes ago")
   │                              ├─ Same one, skip
   │                              └─ Save anyway
   ▼
 Saved to SQLite + outbox (≤100 ms)
   │
   ▼
 Tear overlay: ticket tears, stubs fly to each person (skippable, ~2.5–3 s)
   │
   ▼
 Trip home · balances already updated · toast built from reality:
   online:  "Rahul and Neha will get a stub · Share with Jay on WhatsApp"
   offline: "Saved · sending when you're online"
```

**Defaults** (so the amount is the only thing you need): payer = you, participants = everyone active that day, split = equal, date = now, currency = trip base.

**Keypad:** whole rupees with a `00` key for INR; `.` replaces `00` for decimal currencies ([D-013](decisions/D-013-keypad-entry.md)).

**Offline:** identical. The new row shows "SAVED ON PHONE · WILL SYNC" until the server confirms. The duplicate check compares the **time the money was spent** (`spent_at`), not the time the server received it, so two phones that both saved offline are still caught: when the second one syncs, the later creator sees **Same one, delete mine** / **Keep both** ([06 §5](06-syncing.md)).

**Dated outside the trip:** allowed. After the end date the app asks "After the trip ended?"; before the start date it defaults to **Booked before trip**.

**Paid from the kitty:** pick **Kitty** in the payer sheet. Toast "₹2,400 paid from the kitty". See §10.

**Receipt photo:** camera icon → photo is compressed and EXIF-stripped on the phone → uploads later (Wi-Fi by default). Up to 5 photos, 10 MB each. Free.

**Itemised split (free, R1b) and receipt scan (Pro, R2)** ([D-017](decisions/D-017-itemised-free-scan-pro.md), [D-018](decisions/D-018-r1a-r1b-scope.md)): split editor → **Itemised** → manual item list (free) → assign items to people. At the top, **Scan bill · PRO** opens [Receipt scan](screens/receipt-scan.md) → editable draft → confirm; on a free trip it opens the [Pro sheet](screens/pro-sheet.md) instead. A scan is never saved without confirmation. On failure the photo is kept, the scan doesn't count against the daily limit, and the user types the items or amount.

**Refund (R1b)** ([D-029](decisions/D-029-refund-expense.md)): mark the expense as **Refund** (e.g. the hotel returns ₹2,000). The amount is typed as a positive number and the engine flips the direction: the person who received the money gives it back to the group.

**All expenses** ([screens/all-expenses](screens/all-expenses.md)): Trip home shows only the recent few. **See all** opens the full list, with search and filters by person and category. Tapping a row opens [Expense detail](screens/expense-detail.md).

Screens: [add-expense](screens/add-expense.md) · [split-editor](screens/split-editor.md) · [tear-overlay](screens/tear-overlay.md) · [receipt-scan](screens/receipt-scan.md)
Features: [expenses](features/expenses.md) · [splitting](features/splitting.md) · [receipt-scan](features/receipt-scan.md) · [multi-currency](features/multi-currency.md)

### 6.1 Split the expense

| Mode | You enter | Hint when it doesn't add up |
|---|---|---|
| Equal | tick who was there | "Pick at least one person" |
| Exact | ₹ per person | "₹120 unassigned" / "₹50 too much" + **Distribute the remainder** |
| Percent | % per person | "5% unassigned" + **Distribute the remainder** |
| Shares | ×1, ×2 … | — |
| Adjust (R1b) | equal + extra per person | "₹50 too much" |
| Itemised (R1b; free, scanning is Pro) | items → people | "₹40 difference from the bill total" |

Equal (everyone or selected people), Exact, Percent and Shares are in R1a. **Save is disabled until the split adds up.** Multiple payers are free. The maths is in [07 §5](07-calculation-engine.md).

### 6.2 Edit an expense
Open the expense from trip home or All expenses ([expense detail](screens/expense-detail.md)) → change any field → Save. Who may edit or delete: [permission matrix](09-security.md#permission-matrix).
- A **new revision** is written; the old one stays in history ([D-006](decisions/D-006-append-only-money.md)).
- Everyone whose balance moves by more than their notify threshold (`notify_threshold_major`, default 1 unit of the trip currency, e.g. ₹1) gets a notification.
- If two people edit at once ([D-019](decisions/D-019-money-edit-group.md)):
  - **Money fields** (amount, currency, rate, refund, payers, split mode, split, paid from kitty, items) are one group. The later money edit replaces the whole group, and the earlier editor sees "Rahul changed the amount and split after you". Both versions stay in the history.
  - **Other fields** (description, category, date, "booked before trip") merge one by one: different fields both survive; same field → the later one wins, with a quiet notice ([06 §5](06-syncing.md)).
- An old expense that includes a **removed** member shows them as **Removed** (greyed out). A change that would move their balance is rejected (§5).

### 6.3 Delete an expense
Open → **Delete** → confirm.
- A delete revision is written; every balance returns exactly to its previous value.
- If someone else edited it at the same time, **delete wins**. The editor sees it in [Unresolved changes](screens/unresolved-changes.md) with **Restore as new expense**.
- Settled trip? "This trip is settled. Reopen to edit." with **Request reopen** (§9.4).

---

## 7. Joining a trip

### 7.1 From a WhatsApp link (store version)

```
 Organiser: Members → "Invite" → share sheet → WhatsApp
      │  toli.in/t/<token>   (preview card: trip name, total, "See what you owe")
      ▼
 Friend taps the link
      │
      ├─ App installed? ──yes──► opens app ──► Join in app
      │
      no
      ▼
 Invite web page (no install, no login) — READ-ONLY in R1a (D-024)
   ├─ Trip name, dates, total spent          (/invite-preview: names + total only)
   ├─ "Which one are you?" → Neha
   ├─ What Neha owes, and why (her own lines only)   (/invite-member-view)
   └─ "Get the Toli app"   ← the page ends here. No claim, no UPI, no "I paid" in the browser
          │ Android: Play Install Referrer carries the invite through the install
          │ iOS / sideloaded APK: tap the link again, or type the short code
          ▼
 App opens → Join in app → "You're Neha?" → Claim
          │
          ▼
 Snapshot downloads → Trip home with Neha's full history → pay in the app (§9.2)
```

**R1b: paying from the web page** ([D-024](decisions/D-024-web-page-read-only-beta.md), [04 §3.3](04-api-schema.md)). After "Which one are you?", a Turnstile check runs and the browser gets a **limited web membership** for Neha only. It can't see the rest of the trip. It can open **Pay via UPI** for Neha's own debt and tap **Yes, I paid**, capped at what she owes. That payment shows as **"Pending — waiting for Aditya to confirm"** and doesn't change balances until the payee confirms it in the app. The organiser is told about every web claim and can **Release** it.

Rules ([04 §3](04-api-schema.md), [D-008](decisions/D-008-invite-links.md)):
- **The first claim wins.** A second person picking "Neha" in the app sees "Already claimed. Ask the organiser." (R1b web page: "This spot is taken. Open the Toli app or ask the organiser.").
- Claims need no approval. The organiser is notified ("Neha claimed her spot") and can **Release** a wrong claim (OQ-P14).
- Joining without claiming creates a new member with the name you type.
- The web page shows only names and the trip total until someone picks a name, then only that person's own lines. It never shows phone numbers, emails, user IDs or UPI IDs.
- Link expired → "This invite has expired. Ask Aditya for a new link." Link rotated → same message.

Screens: [invite-web](screens/invite-web.md) · [join-in-app](screens/join-in-app.md) · [members](screens/members.md)
Features: [invites-and-joining](features/invites-and-joining.md) · [members-and-ghosts](features/members-and-ghosts.md)

### 7.2 By code
Welcome → **I have an invite link** (or Trips list → **Join trip**) → type `GOA-7K2PXQ` (3-letter trip prefix + 6 random characters) → same "Which one are you?" step. Wrong code → "We couldn't find that trip. Check the code." After too many wrong tries → "Too many tries. Wait a bit and try again." (limit: 10 wrong codes per IP per hour, plus a global alarm at 500 per hour; [04 §3.2](04-api-schema.md)).

### 7.3 APK testing phase (before the Play Store, [D-016](decisions/D-016-testing-distribution.md))

```
 Founder shares the tester APK (EAS profile `beta`) on WhatsApp / Drive
      │
      ▼
 Friend installs (allows "install unknown apps") → opens → anonymous account
      │
      ├─ Taps the invite link ──► App Link opens the app (assetlinks.json lists the tester APK key)
      │                           → Join in app
      └─ or taps "Join trip" and types the code
      │
      ▼
 "Which one are you?" → claim → trip appears
```

- There is **no install referrer** for a sideloaded APK, so the link can't survive the install. The user opens the link again after installing, or types the code.
- The invite page runs on a `*.workers.dev` address until the domain is bought. After that, the old address redirects `/t/*` and `/j/*` to the new domain, so links already shared keep working.
- The tester APK uses the **production** backend, so testers' trips carry over to the store launch (OQ-P19). **Preview** is internal QA with seed data only and is never given to testers ([D-016](decisions/D-016-testing-distribution.md), [12](12-environments-and-deployment.md)).
- **Moving to the Play Store:** a Play install can't upgrade a sideloaded APK, so testers reinstall once. Two weeks before the switch the app asks every tester to **Save my account**; after reinstalling they use **I already have an account** and their trips come back (§14.2).

### 7.4 Invitations after the trip starts
- Any claimed member can share the current invite; everyone re-shares the **same** link ([04 §3.1](04-api-schema.md)). Rotating it (which kills the old link) is in [Trip settings](screens/trip-settings.md) and follows the [permission matrix](09-security.md#permission-matrix).
- A ghost can be claimed at any time, even after settlement.

---

## 8. Balances and the trace (PRD F5)

```
 Trip home
   ├─ Hero ticket: "You are owed ₹3,400" / "You owe ₹1,200" / "You're all square"
   ├─ Total spent · number of expenses
   ├─ Balances list: each person, "+₹3,400 gets back" / "−₹1,200 owes"  (never colour alone)
   │       └─ tap a person ──► Balance trace: every line that makes the number
   ├─ Kitty trips only: its own line "Kitty cash with Rahul: ₹3,000"
   └─ Recent expenses: "Rahul paid · 4 people · yours ₹200" · "See all" → All expenses
```

- Balances update the instant you save, from local data.
- The trace lines add up exactly to the balance ([07 §9](07-calculation-engine.md)).
- **Kitty during the trip** ([D-022](decisions/D-022-kitty-views-and-handover.md)): Trip home, the trace and the Kitty screen show the kitty cash as a **separate line** with the holder's name. The holder does **not** look like they owe the whole pot. Only Settle up folds the kitty into the holder's balance (§9, §10).

Screens: [trip-home](screens/trip-home.md) · [balance-trace](screens/balance-trace.md)
Features: [balances-and-trace](features/balances-and-trace.md)

---

## 9. Settle up (PRD F6)

### 9.1 Organiser's view

```
 Trip home → "Settle up"
   │
   ▼
 Settle up
   ├─ "6 payments → 3"   (Simplified in R1a; the Simplified | Direct toggle arrives in R1b)
   ├─ Kitty trips: the kitty is folded into the holder's row here, so leftover cash goes back through normal payments
   ├─ Rows: "Neha pays you ₹1,200 · Room ₹1,000 + Cab ₹200"
   │     ├─ Remind  (max once per person per 48 h; WhatsApp text in R1a, push reminders in R1b)
   │     ├─ Mark as paid (pre-filled with the EXACT amount, paise included; cash / bank / other, optional note)
   │     └─ tap "why" → Balance trace
   ├─ Share summary to WhatsApp (text + image card)
   ├─ "Recorded payments" → list of every recorded settlement, with Void
   ├─ "Close trip" (only when every payment is 0)
   │
   ▼ HOLD "Hold to tear & send stubs" (900 ms; releasing early cancels) → /stubs-send
 Tear overlay → headline "STUBS READY" (the stubs are with Toli's server, not yet delivered)
   Toast built from the server's answer: "Rahul and Neha will get a stub. Share with Jay on WhatsApp."
```

- Holding (not tapping) prevents accidental sends to the whole group ([D-012](decisions/D-012-hold-to-tear.md)). **Accessible mode:** with a screen reader, Switch Access, voice control, or the "Tap instead of hold" setting, a tap opens a confirm sheet instead ([13](13-design-system.md)).
- Sending stubs needs the network ([04 §5.1a](04-api-schema.md)). Offline, the button shows **"Needs internet"**; the payments list and **Mark as paid** still work. Sending moves an `active` trip to `settling`.
- Who can mark as paid and who can void: [permission matrix](09-security.md#permission-matrix).
- A derived payment is a **suggestion**, not a debt, until it's recorded.
- **Big amounts:** a payment over ₹1,00,000 is shown as several UPI links of at most ₹1,00,000 each, with "UPI allows about ₹1 lakh per payment. Pay these over one or more days." **I paid a different amount** is always there ([07 §8.5](07-calculation-engine.md)).

### 9.1a Recorded payments ([screens/recorded-payments](screens/recorded-payments.md))
- Settle up → **Recorded payments** lists every settlement: who paid whom, how much, the method, who recorded it and when. Rounding adjustments show as "Rounding · ₹0.33".
- **Void** on a row asks to confirm, then writes `settlement.void`. The payment goes back into the derived payments. Nothing is edited in place ([D-006](decisions/D-006-append-only-money.md)).
- **Same payment recorded twice?** If the payer and the payee both mark the same payment (same pair and amount within 24 hours), the later recorder is asked **"Already recorded?"** → **Same one, remove mine** (voids theirs) / **Keep both** ([06 §5](06-syncing.md)).

### 9.2 Payer's view (UPI)

```
 Stub notification "Pay ₹1,200 via UPI"   or   the payment row in the app  (R1b: also the invite page, §7.1)
   │
   ▼
 Pay via UPI → server builds upi://pay (payee's UPI ID shown only to people who owe them)
   │
   ▼
 Payer's own UPI app (GPay / PhonePe / Paytm …) → enters their own PIN
   │
   ▼ back in Toli
 "Did the payment go through?"
   ├─ Yes → Settlement recorded (method: UPI) → stamp "PAID"
   │        "Aditya has been notified. This is based on your confirmation,
   │         since Toli never sees the payment itself."
   └─ No / Not yet → back to the payment row, nothing recorded
```

- **Toli never touches money and can't verify UPI payments** (PRD §14). The copy must say so honestly.
- **No UPI ID saved by the payee?** The row shows "Aditya hasn't added a UPI ID. Pay another way, then **Mark as paid**."
- **Trip not in INR?** UPI works only in INR (`/upi-link` returns `not_inr`), so the row shows only **Mark as paid**.

### 9.3 Manual and partial payments
- **Mark as paid** works for cash, bank transfer or anything else. It is pre-filled with the **exact** amount, paise included (₹1,233.33, not ₹1,233), so balances can reach exactly 0 ([D-021](decisions/D-021-rounding-adjustment.md)).
- The amount is editable: paying ₹500 of ₹1,200 records ₹500; the remaining ₹700 stays as a derived payment.
- Paying too much is allowed, with a warning: the balance flips sign.
- A wrong settlement is **voided** from Recorded payments (§9.1a), not edited ([D-006](decisions/D-006-append-only-money.md)).

### 9.4 Closing the trip ([D-023](decisions/D-023-auto-settle-timing.md))
A trip becomes **settled** only when every derived payment is 0 **and** one of these is true:
- **Close trip:** any claimed member taps **Close trip** on Settle up; or
- **End date + 24 hours:** the daily lifecycle job settles it automatically, 24 hours after the end date.

So a trip never locks on day 2 just because everyone happens to be square. A trip with **no end date** settles only through Close trip.

**Rounding leftovers (the dust rule, [D-021](decisions/D-021-rounding-adjustment.md)).** If every remaining payment is **under ₹1** (1 unit of the trip currency) when the trip is closing, the server writes a visible **rounding adjustment** for each one ("Rounding · ₹0.33" in the trace and in Recorded payments). All balances become 0 and the trip settles. This never happens mid-trip.

**After settling:** the trip gets a **SETTLED** stamp and shows "Everyone's square." The [Recap](screens/recap.md) arrives in R3.
- A settled trip rejects money and member changes. What is still allowed (feed posts, recap settings, claiming a ghost, voiding a settlement) is the one allow-list in [06 §5](06-syncing.md).
- Voiding a settlement puts the trip back to `settling` (logged).
- **Request reopen:** a member who isn't an organiser taps **Request reopen**; organisers get a push with **Reopen**. Reopening is an explicit, logged action ([permission matrix](09-security.md#permission-matrix)).

Screens: [settle-up](screens/settle-up.md) · [recorded-payments](screens/recorded-payments.md) · [tear-overlay](screens/tear-overlay.md) · [balance-trace](screens/balance-trace.md) · [recap](screens/recap.md)
Features: [settle-up](features/settle-up.md) · [feed-and-recap](features/feed-and-recap.md)

---

## 10. Kitty (PRD F7)

```
 Trip home → Kitty card (or Trip settings → turn on kitty)
   ├─ Choose the holder (who physically holds the cash)
   ├─ Optional target per person (e.g. ₹5,000)
   ├─ Record contributions (each person, any amount, top-ups later)
   │     "Log ₹1,500 each" opens a confirm sheet with a tick per person
   │
   ▼
 Kitty screen: ring "₹3,000 left of ₹15,000" · contributed / spent / remaining
   ├─ "Kitty cash with Rahul: ₹3,000"   (its own line, not part of Rahul's balance)
   ├─ Hand over → pick the new holder → confirm "Hand ₹3,000 of kitty cash to Neha?"
   ├─ Low (≤20%) → banner "Kitty is low" → log top-up
   │     (R1b: the suggestion "Top-up needed: ₹1,150 each")
   ├─ Spends list (expenses with payer = Kitty)
   └─ At settle-up: "→ refund" lines, proportional to what each person put in
```

- **The kitty is only a record.** Toli never holds money; the UI, ToS and store listing say so ([09 §12](09-security.md)).
- **Two views** ([D-022](decisions/D-022-kitty-views-and-handover.md)): during the trip, the kitty is shown as "cash with the holder", so on day 1 Aditya "gets back ₹5,000" and there is a line "Kitty cash with Rahul ₹15,000" (Rahul does **not** "owe ₹10,000"). Only Settle up folds the leftover cash into the holder's balance.
- **Hand-over:** changing the holder is a money action (`kitty.handover`), not a settings edit. It shows in both people's traces as "Kitty cash handed to Neha · ₹3,000" and is blocked on settled trips. Who can do it: [permission matrix](09-security.md#permission-matrix).
- Overspent kitty is allowed: "Kitty is ₹X short — Rahul covered it".

Screens: [kitty](screens/kitty.md) · Features: [kitty](features/kitty.md)

---

## 11. Notifications (PRD F16)

| Event | Who gets it | Buttons |
|---|---|---|
| Expense involving you added | participants | See split · Not me |
| Expense edited/deleted, your balance moved more than your threshold (default ₹1) | affected members | See split |
| You were added to a trip | the claimed user | View trip |
| Settlement to you recorded | payee | View trip |
| Settle-up stub / reminder (push reminders R1b) | payer | Pay via UPI (only when you owe the sender, INR trips) · Mark as paid |
| Someone asked to reopen a settled trip | organisers | Reopen |
| Kitty low | trip members | Top up |
| Budget 75% / 100% (R2) | trip members (personal budget: only you) | View budget |
| Trip started / ended | trip members | View trip |

- **R1a look:** inside the app, the exact lime **stub banner**. With the app closed, a **plain system notification** (title, text, Toli icon and accent colour); tapping opens the right screen. Buttons on the notification and the custom Android styles arrive in **R1b** ([D-018](decisions/D-018-r1a-r1b-scope.md), [D-009](decisions/D-009-notifications.md)). The Buttons column above describes R1b; in R1a the same actions are on the screen the tap opens.
- **Hide amounts on lock screen** (Settings): when on, the server leaves amounts and names out of the push text.
- **Busy trip (R1b digests):** more than 5 events in 30 minutes → one grouped digest, which opens Trip home.
- **Channels** the user can mute: Payments, Expenses, Reminders, Trip updates. Per-trip mute in [Trip settings](screens/trip-settings.md).
- **Permission** is asked at a useful moment (after the first expense, or on first join), never on first launch.
- On phones that kill background apps (Xiaomi, Oppo, Vivo, Realme, OnePlus, or after 2 missed receipts) the server always sends system notification payloads, so they still arrive ([D-009](decisions/D-009-notifications.md)).
- Tapping opens the right screen through a deep link. **A notification never records money by itself** ([04 §11](04-api-schema.md)): "Mark as paid" opens a confirm sheet; "Not me" opens the expense, and confirming removes you; "Top up" opens the Kitty; "View budget" opens the Budget.
- There is no notification inbox in v1. The Trip feed (R3) is the history.

Screens: [notifications](screens/notifications.md) · [settings-profile](screens/settings-profile.md) · Features: [notifications](features/notifications.md)

---

## 12. Offline use

```
 No signal ──► everything still works: create trips, add/edit/delete, split, Mark as paid, kitty,
    │             Close trip (checked again by the server when it syncs)
    │
    ├─ Trip home banner: "Offline. 2 changes saved on this phone. They sync when you're back."
    ├─ New rows: "SAVED ON PHONE · WILL SYNC"
    ├─ Needs network (shows a clear message, never a crash):
    │     invite preview, joining, signing in, sending stubs ("Needs internet"), receipt scan,
    │     place search, Pay via UPI link, export, sign-out (blocked until synced)
    │
 Signal returns ──► pill "Syncing Goa Weekend · 3 changes" ──► disappears when done
```

- FX: the last cached rate table is used, labelled with its date.
- Vault documents downloaded once stay available offline (pinned, never evicted).
- Receipt photos wait in the file queue (Wi-Fi only by default). A photo you ask to **scan** uploads straight away, even on Wi-Fi only (OQ-P17).

Features: [offline-and-sync](features/offline-and-sync.md) · Detail: [06](06-syncing.md)

---

## 13. Sync recovery (Unresolved changes)

When the server rejects a change, nothing is lost. The trip gets a badge; the item appears in [Unresolved changes](screens/unresolved-changes.md) with one clear action.

| What happened | Message | Action |
|---|---|---|
| Someone deleted what you edited | "Neha deleted *Dinner*. Your edit wasn't saved." | **Restore as new expense** · Dismiss |
| Trip was settled meanwhile | "This trip is settled. Reopen to edit." | **Reopen** (organiser) or **Request reopen** · Dismiss |
| Tried to remove a member with a balance | "Settle Jay's ₹1,200 or move his expenses first" | **Go to settle up** |
| The change would give a removed member a balance | "This changes Jay's balance. Add Jay back first." | **Open expense** · Dismiss |
| App too old | "Update Toli to sync this change." | **Update** |
| Split didn't add up on the server | "This expense didn't add up. Please check it." | **Open expense** |
| Server keeps failing (our bug) | Banner: "Can't sync — we're on it" | none; data stays on the phone |

If a rejected change has later changes that depend on it (an edit or photo of an expense whose creation was rejected), they are **held and grouped** into one item, not shown as many separate failures.

Screens: [unresolved-changes](screens/unresolved-changes.md) · Features: [offline-and-sync](features/offline-and-sync.md)

---

## 14. Authentication: save my account, reinstall, new phone

### 14.1 "Save my account"
Shown as a friendly card (never a wall) when:
1. you do your first shared trip action (you invite someone, or you add an expense someone else can see),
2. you have a second device,
3. your first trip ends, or
4. the APK testing phase is about to move to the Play Store (two weeks before the switch, [D-016](decisions/D-016-testing-distribution.md)).

Options: **Google**, **Sign in with Apple** (iOS), **Email code**. Linking keeps the same user ID; no data moves ([D-007](decisions/D-007-auth.md)). Phone OTP comes later.
- Organisers are nudged as soon as they invite anyone, so a lost phone doesn't lock the trip. If no organiser has been active for 30 days, the longest-standing claimed member can take over (OQ-P20).
- Google account already on Toli? Until the merge is designed: "This Google account is already on Toli. Sign in with it instead", through **I already have an account** (OQ-P16).

### 14.2 Reinstall or new phone

```
 New install
   ├─ Saved account? ──yes──► Welcome → "I already have an account" → Sign in
   │                           (Google / Apple / email code) → snapshot each trip → back to normal
   │
   no (anonymous only — the old identity is gone)
   ▼
 Open the invite link / code again → "Which one are you?" → your name shows "claimed"
   ▼
 Ask the organiser → Members → Release "Neha" (history kept) → claim again
```

- [Sign in](screens/sign-in.md) is reached from **Welcome** and from **Settings**. It downloads a snapshot of each trip and then syncs normally ([06 §8](06-syncing.md)).
- An anonymous user with **no trips** can sign out and use Sign in instead (for example after opening the app on a new phone before signing in).

### 14.3 Sign out
- Settings → **Sign out**. It clears this phone's session and local data.
- **Blocked while changes are unsynced:** "3 changes aren't synced yet. Connect to the internet first." Sign-out waits until the outbox is empty, so nothing is lost ([06 §8](06-syncing.md)).
- An anonymous (not saved) account can sign out only when it has **no trips**. With trips, Settings offers **Save my account** first, because signing out would lose the spot.

Screens: [sign-in](screens/sign-in.md) · [settings-profile](screens/settings-profile.md) · [members](screens/members.md) · Features: [auth-and-identity](features/auth-and-identity.md)

---

## 15. Account deletion and data export

**Export my data** (DPDP right to access, free for everyone): Settings → Privacy → **Export my data** → a JSON + CSV file link, valid 24 hours, 3 per day.

**Trip CSV / PDF export** (PRD F15, Pro): Trip → ⋯ → **Export** → CSV or PDF with the balance sheet and a plain-language settlement summary.

**Delete my account:**

```
 Settings → Privacy → Delete account
   ▼
 Explain: "In shared trips your name becomes 'Former member' so your friends'
          balances still add up. Your profile, devices, UPI ID and sign-in are erased."
   ▼
 Type DELETE → confirm
   ▼
 Signed out → Welcome screen
```

The server writes a `member.anonymised` op, so every phone shows "Former member" (numbered if there are several) ([03 §11](03-database-schema.md)).

Features: [account-and-privacy](features/account-and-privacy.md) · [export](features/export.md) · [pro-pass](features/pro-pass.md) · Detail: [09 §10](09-security.md)

---

## 16. Other areas (R2 / R3)

| Area | Entry point | Screen | Feature |
|---|---|---|---|
| Budget and burn-down | Trip home → Budget card | [budget](screens/budget.md) | [budget](features/budget.md) |
| Itinerary, places, map | Tab **Plan** | [plan](screens/plan.md) | [itinerary-and-places](features/itinerary-and-places.md) |
| Bookings and documents | Tab **Vault** | [vault](screens/vault.md) | [vault](features/vault.md) |
| Trip feed | Tab **Feed** | [feed](screens/feed.md) | [feed-and-recap](features/feed-and-recap.md) |
| Recap (R3) | Trip settled, or Feed → Recap | [recap](screens/recap.md) | [feed-and-recap](features/feed-and-recap.md) |
| Pro pass | any PRO tag (Scan bill, export, recap themes, extra analytics) | [pro-sheet](screens/pro-sheet.md) | [pro-pass](features/pro-pass.md) |
| Multi-currency (R2) | Add expense → "Today · ₹ ▾" chip | [add-expense](screens/add-expense.md) | [multi-currency](features/multi-currency.md) |

- The budget burn-down is free; only the extra analytics charts are Pro (OQ-P18). Budgets are changed with `budget.set` / `budget.delete`, and a personal budget is visible only to its owner ([03 §5.9](03-database-schema.md)).

Tab bar in R1: **Trip · (+) · Members**. The Plan, Vault and Feed tabs appear in R2 and R3, giving the full **Trip · Plan · (+) · Vault · Feed** ([13 §5](13-design-system.md), OQ-P11 in [01](01-overview.md#open-questions)).

---

## 17. Error recovery (what the user sees)

| Problem | What the user sees | What the app does |
|---|---|---|
| No network | Offline banner; everything local works | Queues ops, retries with backoff |
| Server slow / down | Nothing, or "Syncing…" longer | Retries; never blocks the UI |
| Rate limited (429) | "Too many tries. Wait a bit and try again." (only for user actions like joining) | Waits `Retry-After` |
| App too old (426) | "Update Toli to keep syncing." with **Update** | Keeps ops in the outbox |
| Invite invalid / expired | "This invite has expired. Ask Aditya for a new link." | — |
| Ghost already claimed | "Already claimed. Ask the organiser to release it." | — |
| Photo upload failed | Small "retry" icon on the photo | Retries on Wi-Fi |
| Receipt scan failed | "We couldn't read this bill. Type the amount instead." Photo kept | `extraction_failed`; not counted against the 30 scans/day limit |
| Vault full (free trip) | The upload is refused, with the Pro option ([vault](screens/vault.md)) | `quota_exceeded` at 1 GB; receipts never count |
| UPI app didn't open | "No UPI app found. Pay another way, then Mark as paid." | — |
| Place search down | "Search is unavailable. Type the place name." | Manual place entry |
| FX rates old | "Rates from 21 Sep" label; manual rate allowed | Uses cached table |
| App crashed mid-entry | On reopen the draft or saved expense is there (atomic save) | Crash sent to Sentry |
| Sign out with unsynced changes | "3 changes aren't synced yet. Connect to the internet first." | Sign-out blocked until the outbox is empty |
| New phone, saved account | Welcome → **I already have an account** | Sign in, then a snapshot of each trip |
| Newer server data the app doesn't know | "Update the app to see this" on that item | Unknown fields and values are ignored, never a crash |
| Wrong number reported | "Something looks wrong?" in the trace → report | `balance_dispute_reported` event, team alert |
