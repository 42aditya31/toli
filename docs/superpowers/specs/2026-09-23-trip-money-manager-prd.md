# Product Requirements Document — Toli (trip money manager)

| | |
|---|---|
| **Status** | Draft v1.0 — for review |
| **Author** | aditya@minibet.games |
| **Date** | 23 September 2026 |
| **Audience** | Founding team: product, engineering, design. Also usable as an investor-facing product brief. |
| **Decision owner** | Aditya |
| **v1.1** | Draft changelog below (2026-09-25), **pending Aditya's approval** |

---

## v1.1 changes (draft, pending decision-owner approval)

The [pre-development review](../../14-pre-development-review.md) and the [decision log](../../decisions/README.md) changed the rules below. **Where this list and the original text disagree, this list wins** once it's approved. The original text is left unchanged, so the history stays readable.

| # | Section | Was | Now | Decision |
|---|---|---|---|---|
| 1 | §7, §20 Release plan | R1 = the whole splitting core | R1 split into **R1a (beta)** and **R1b**; R2 and R3 unchanged | [D-018](../../decisions/D-018-r1a-r1b-scope.md) |
| 2 | §9.3 Rounding | leftover paise go in hash order | **largest remainder first**, then hash order (identical for equal splits) | [D-005](../../decisions/D-005-rounding-rule.md) |
| 3 | §9.5 Direct mode | proportional pairing (implied) | **exact north-west-corner pairing**, so paise are never lost | [D-020](../../decisions/D-020-direct-mode-exact-pairing.md) |
| 4 | F6 Settle up | a trip is settled when every derived payment is recorded | settled when payments are zero **and** (end date + 24 h, or **Close trip**). Leftovers under ₹1 become a visible **rounding** settlement. **Mark as paid** pre-fills the exact amount. UPI payments over ₹1 lakh are split into several links | [D-021](../../decisions/D-021-rounding-adjustment.md), [D-023](../../decisions/D-023-auto-settle-timing.md) |
| 5 | F6 Settle up | "mark settled … and generate the recap" | the recap arrives in **R3**; in R1 the settled state shows "Everyone's square." | [03 §6.5](../../03-database-schema.md) |
| 6 | F7 Kitty | "refunded in proportion … unless the group overrides this" | the override is **removed**. During the trip, the kitty shows as **"Kitty cash with {holder}"**; the holder changes only by an explicit **hand-over** | [D-010](../../decisions/D-010-kitty-folding.md), [D-022](../../decisions/D-022-kitty-views-and-handover.md) |
| 7 | F4, §15 | "itemisation is Pro" | itemised splitting **by hand is free** (R1b); only **receipt scanning** is Pro | [D-017](../../decisions/D-017-itemised-free-scan-pro.md) |
| 8 | §13 Onboarding | claim with phone OTP | **no OTP**: an anonymous account is created silently; "Save my account" with Google, Apple or email; phone OTP later | [D-007](../../decisions/D-007-auth.md) |
| 9 | §13, F2 | the web page shows balances and lets the viewer pay | the **beta web page is read-only**. Web payments come in R1b through a limited web membership and stay pending until the payee confirms | [D-024](../../decisions/D-024-web-page-read-only-beta.md) |
| 10 | F2 | add members from contacts / by phone number with matching | contacts add **names only**; no phone matching in v1 | [D-025](../../decisions/D-025-no-contacts-matching-v1.md) |
| 11 | §12 Conflicts | edit/edit is last-write-wins per field | per field for description, category, date and "booked before"; the **money fields win together as one group** | [D-019](../../decisions/D-019-money-edit-group.md) |
| 12 | §8 Lifecycle | "A member with a non-zero balance cannot be removed" | also: **once removed, a member's balance can never change** again | [D-030](../../decisions/D-030-removed-members-locked.md) |
| 13 | F3 | amounts > 0 | adds a **Refund** expense type (R1b) | [D-029](../../decisions/D-029-refund-expense.md) |
| 14 | §6.2 Metrics | North star: trips settled per week | unchanged; "groups with 3+ expenses in week one" added as the **activation** metric | OQ-P1 |
| 15 | F16 Notifications | custom notification behaviour | R1a: the exact stub design **inside the app**, plain system pushes outside; custom Android styles in R1b | [D-009](../../decisions/D-009-notifications.md) |

---

## 1. Executive summary

**Toli is a trip-first money manager for groups of friends.** A group creates a trip, adds everyone travelling, and logs money as it is spent. The app tracks who paid, who participated, and what each person owes, updating balances live. At the end of the trip it collapses hundreds of entries into the smallest possible set of payments — "Rahul pays Aditya ₹1,000" — and hands each person a UPI deep link to actually pay it.

Around that core, Toli holds the rest of the trip's money context in one place: the itinerary, the budget, saved places, bookings and PNRs, tickets and receipts, foreign currency, and a chronological trip timeline that becomes a shareable recap when the trip ends.

**The wedge is a competitor's self-inflicted wound.** Splitwise, the category default with 10M+ users, now limits free users to roughly four expenses per 24 hours with a cooldown between entries, and has moved unequal splits, multiple payers, currency conversion and receipt scanning behind a $40/year paywall. Its Trustpilot rating is 1.8/5 with 65% one-star reviews. A group trip is precisely the situation that breaks this model — a single evening in Goa generates a dozen expenses.

**Toli's core promise: unlimited expenses, unlimited splits, unlimited groups, free forever.** Money is never the thing we charge for. We monetise a per-trip Pro pass for convenience features, which matches the episodic reality of travel far better than a subscription does.

**Launch market is India**, with the rupee as the default, UPI deep links as the settlement rail, and Indian group-trip archetypes (the Goa weekend, the Manali road trip, the office offsite, the destination wedding) as the design targets. Currency and payment rails are built as pluggable interfaces so international expansion is a configuration change, not a rewrite.

---

## 2. The problem

### 2.1 What actually happens on a group trip today

Four friends go to Goa. Over four days they generate sixty-odd shared payments. Aditya books the hotel on his card months in advance. Rahul pays for cabs because his UPI works at the stand. Neha covers dinners on the nights she is not drinking, so she shouldn't pay for the bar tab. Jay joins on day two, so he owes nothing for the first night's room. Somebody puts ₹5,000 each into a common pot on day one and the pot pays for fuel and tolls until it runs out.

The group manages this in one of four ways, all bad:

1. **A WhatsApp group and human memory.** Works until it doesn't. Someone always ends up quietly absorbing ₹2,000 rather than being the person who chases.
2. **A Google Sheet.** One person becomes the unpaid accountant. Formulas break. Nobody updates it after day two.
3. **Splitwise.** Hits the four-expense daily wall on the first night, then shows ads, then demands ₹4,000/year for the unequal splits that a real trip requires constantly.
4. **Nothing, then a painful reckoning on the drive home.** The most common outcome.

### 2.2 The friction is social, not mathematical

The arithmetic is trivial. What is hard is:

- **Recording at the moment of spend.** If logging an expense takes more than a few seconds while standing at a restaurant counter, it doesn't get logged. Every app that loses does so here.
- **Asking to be paid back.** People will eat a ₹1,200 loss to avoid the awkwardness of chasing a friend. An app that produces a neutral, objective number removes the social cost of asking.
- **Fairness in edge cases.** "Only two of us ate", "Jay joined late", "Neha doesn't drink", "the couple counts as two shares". A tool that can't express these gets abandoned, because using it produces answers the group knows are wrong.
- **The last mile.** Knowing that Rahul owes ₹1,000 is not the same as Rahul having paid ₹1,000. Most apps stop at the number.

### 2.3 Why now

- **The incumbent has vacated the free tier.** This is a one-time, time-boxed opening. Splitwise can reverse its limits.
- **UPI made the last mile solvable.** A prefilled `upi://pay` link turns "you owe me ₹1,000" into a two-tap payment, with no payment licence required by us.
- **Trips have recovered and are group-shaped.** Domestic tourists were 78.5% of the Indian tourism market in 2025; the global group travel market is estimated at ~$612B in 2026 growing ~8.7% CAGR.
- **Receipt understanding got cheap and good.** LLM-based extraction now reads messy Indian restaurant bills at 97–99% accuracy versus 85–95% for traditional OCR, making itemised splitting practical for the first time.

---

## 3. Competitive landscape

The category is split into three camps and **nobody owns the centre**, which is where a trip actually lives.

| Product | Camp | Strength | Where it fails a trip |
|---|---|---|---|
| **Splitwise** | Splitter | Brand default, 10M+ users, debt simplification | ~4 expenses/day free cap, cooldown timer, ads, unequal splits and multi-payer paywalled, no trip context, no itinerary, 1.8/5 Trustpilot |
| **Tricount** | Splitter | Genuinely free, 37 languages, free FX conversion, offline entry | No trip planning, weak in India, no UPI, thin analytics |
| **Settle Up** | Splitter | Recurring expenses, strong offline, **short-term group premium** (upgrade for two weeks) | Ads on free tier, dated UX, no trip context |
| **Splid** | Splitter | Fastest setup, no account needed, clean multi-currency, offline | Deliberately minimal — no receipts, no planning, no settlement rail |
| **Wanderlog** | Planner | Best-in-class collaborative itinerary, maps, route optimiser, bookings | Expense splitting is a bolted-on afterthought; no settlement, no UPI, offline behind Pro |
| **TravelSpend / Trabee Pocket** | Solo budget | 150+ currencies, fully offline, budget burn-down, custom FX rates | **Single-player.** No group, no splitting, no settlement |
| **Spreadsheet** | — | Infinitely flexible, free | Manual, one person maintains it, no mobile capture, dies on day two |

**The gap:** a trip generates group money, trip context, and multi-currency at the same time. Splitters have the first, planners the second, budget apps the third. Toli is the only product holding all three, and the only one that closes the loop into an actual payment.

**Defensibility.** Feature parity is copyable; three things are not, and all three are in v1: (a) the **trip kitty / common pool** model, which reflects how Indian groups genuinely handle money and which no competitor supports natively; (b) **UPI-native settlement** with reconciliation, which international players will not prioritise; (c) **the trip archive** — once a group's last four trips live in Toli, switching costs are real.

---

## 4. Target users

### Primary persona — "The Organiser" (Aditya, 26, Bengaluru)

Books the hotel, creates the WhatsApp group, fronts the most money, and ends up doing the maths. He is the highest-intent user and our acquisition vector: he brings 3–8 people per trip. **He needs to stop being the accountant, and he needs to get his money back without asking twice.** He will adopt a new app if it reduces his workload; he will pay for a per-trip Pro pass because he is the one feeling the pain.

### Secondary persona — "The Participant" (Neha, 24, Pune)

Did not choose this app; got a WhatsApp link. She will not create an account before she can see anything. **She needs to open the link, immediately see what she owes, and pay it.** Every extra step here costs us a user and damages the Organiser's experience. She is the reason ghost members and link-first onboarding are non-negotiable.

### Tertiary persona — "The Frequent Group Traveller" (Rahul, 29)

Three to six trips a year with overlapping friend circles. Cares about history, per-trip archives, recurring co-travellers, and analytics. He is our retention and monetisation base.

### Explicit non-users for v1

Corporate T&E and reimbursement (different product: approvals, policy, GST input credit), flatmates splitting recurring rent and utilities (different shape: recurring, open-ended, no trip boundary — a fast-follow, not v1), and tour operators managing paying customers.

---

## 5. Product principles

1. **Money features are free, forever.** Adding expenses, splitting them any way, seeing balances, and settling up are never limited, never metered, never behind a paywall. This is the entire reason we exist. Violating it makes us Splitwise.
2. **Five seconds to log an expense.** Measured from app icon tap to saved expense, with defaults applied. Every UI decision loses to this one.
3. **Never block on someone else installing the app.** Ghost members are first-class. A trip works with one installed user and five names.
4. **The trip is the container.** Not an open-ended friend balance. Trips begin, they end, they settle, they get archived and remembered.
5. **Offline is the default assumption.** Hill stations, flights, foreign SIMs, basements of restaurants. The app is fully functional with no network; sync is a background detail.
6. **We never hold the money.** Toli computes and records; banks and UPI apps move funds. This is a deliberate, permanent architectural and regulatory position.
7. **Every number is explainable.** Any balance can be tapped to reveal exactly which expenses produced it. Trust in a money app is destroyed by one unexplained figure.

---

## 6. Goals and success metrics

### 6.1 Product goals

| # | Goal | Why |
|---|---|---|
| G1 | A group of 4 can create a trip and log their first expense within 90 seconds of install | Determines whether the trip gets tracked at all |
| G2 | ≥80% of trips that reach 5 expenses reach a settled state | Settlement is the value moment; unsettled trips mean we failed |
| G3 | Each Organiser brings ≥2.5 new users per trip | Distribution without paid acquisition |
| G4 | ≥35% of users who complete a trip create a second trip within 90 days | Proves we're a habit, not a one-off tool |
| G5 | Zero balance-correctness incidents | One wrong number costs a group permanently |

### 6.2 Metrics

**North star:** *Trips settled per week* — trips where every derived payment is marked paid. It captures acquisition, activation, group adoption and completion in one number.

| Layer | Metric | Definition | 6-month target |
|---|---|---|---|
| Acquisition | Installs from invite links | Installs attributed to a trip invite | ≥60% of all installs |
| Activation | Trip activation rate | % of created trips reaching ≥3 members and ≥5 expenses within 48h | ≥55% |
| Engagement | Expenses per active trip | Median | ≥18 |
| Engagement | Time-to-log | p50 app-open → expense saved | ≤5.0s |
| Completion | Settlement rate | % of ≥5-expense trips fully settled within 14 days of end date | ≥80% |
| Completion | UPI link conversion | % of derived payments settled via in-app UPI link vs manual mark-as-paid | ≥45% |
| Virality | Invite acceptance | % of invited members who install and claim | ≥55% |
| Virality | k-factor | New installed users per Organiser per trip | ≥2.5 |
| Retention | Second-trip rate | % creating a 2nd trip within 90 days | ≥35% |
| Monetisation | Pro pass attach | % of settled trips with ≥1 Pro pass purchased | ≥8% |
| Quality | Balance disputes | Manual corrections following a "this is wrong" report, per 1,000 trips | <2 |
| Quality | Crash-free sessions | — | ≥99.5% |

### 6.3 Non-goals for v1

Being a bank or wallet; holding, pooling or transmitting user funds; corporate expense reporting and approval workflows; flight or hotel booking and inventory; social feed, follower graph or public profiles; credit or lending against trip balances; automatic bank-account transaction import (account aggregator integration is post-v1).

---

## 7. Scope

All five pillars below are **in v1** per the product decision. They are sequenced into three internal releases so the splitting core can be in real trips while the rest is built. Release 1 is independently shippable and independently valuable; R2 and R3 are additive and do not alter R1's data model.

| Pillar | Contents | Release |
|---|---|---|
| **A. Splitting core** | Trips, members, ghost members, expenses, all split modes, kitty, live balances, simplified settlement, UPI settle, receipt photos | R1 |
| **B. Trip money context** | Budget and burn-down, categories, per-person analytics, multi-currency with FX, exports | R2 |
| **C. Trip planning** | Itinerary by day, saved places and map, activities, cost estimates linked to real expenses | R2 |
| **D. Trip vault** | Bookings with PNRs, ticket and document storage, offline access | R3 |
| **E. Trip timeline & recap** | Chronological feed of spends, photos and notes; end-of-trip shareable recap | R3 |

**Deferred beyond v1 (explicitly):** non-trip recurring groups (flatmates), SMS/UPI transaction auto-capture (gated on Google Play SMS-permission policy — assume rejection until proven otherwise), bank account aggregator import, web app, group chat (WhatsApp already wins), travel insurance and booking affiliate revenue, expense approval workflows.

---

## 8. Domain model — core concepts

Precise definitions; the entire product depends on these being unambiguous.

- **Trip** — a bounded container with a name, optional destination, optional start and end dates, a **base currency**, members, expenses, and a lifecycle state (`planning` → `active` → `settling` → `settled` → `archived`).
- **Member** — a participant in a trip. Either **claimed** (linked to a real user account) or a **ghost** (a name only, created by someone else, with no account). Ghosts carry full balances and can be claimed later via invite link without recomputation.
- **Expense** — money spent. Has an amount, currency, date/time, category, description, one or more **payers**, a set of **participants** with a **split rule**, optional receipt images, optional linked itinerary item, and an audit trail.
- **Payer** — who actually paid. May be one person, several people with different amounts, or the **kitty**. A payer need not be a participant (Aditya pays for a cab he isn't in).
- **Participant** — who consumed the expense and therefore owes a share. Never inferred; always an explicit set, defaulted to all trip members.
- **Split rule** — how the amount is divided among participants. See §9.
- **Share** — a participant's owed amount for one expense, stored as an integer in minor units (paise).
- **Kitty** — an optional shared pool per trip. Members contribute; expenses can be paid *from the kitty*; the remaining balance is refunded proportionally at settlement. See F7.
- **Settlement** — a recorded transfer of money from one member to another, reducing the debt between them. Created either from a derived payment suggestion or manually.
- **Balance** — a member's net position: total paid minus total owed, across all expenses and settlements, expressed in the trip's base currency. Always sums to zero across the trip.
- **Derived payment** — an output of the simplification algorithm: "X pays Y ₹Z". Not a debt record; a *suggestion* that, once marked paid, becomes a Settlement.

### Lifecycle rules

- A trip in `settled` is read-only; reopening requires an explicit action and is logged.
- A ghost member can be claimed at any point, including after settlement.
- A member with a non-zero balance cannot be removed from a trip; they must be settled or their expenses reassigned first. The UI must explain this rather than silently refusing.

---

## 9. The splitting engine

This is the heart of the product and the part that must be provably correct.

### 9.1 Split modes (all free, all in R1)

| Mode | Behaviour | Example |
|---|---|---|
| **Equal** | Amount ÷ number of participants | Hotel ₹4,000 ÷ 4 = ₹1,000 each |
| **Selected-equal** | Equal among a chosen subset | Dinner ₹1,200 between Aditya and Rahul = ₹600 each |
| **Exact amounts** | Each participant's amount entered directly; must total the expense | Bar bill ₹3,000 → A ₹1,500, R ₹1,200, J ₹300, N ₹0 |
| **Percentage** | Percentages entered; must total 100% | Villa: A 40%, R 30%, N 15%, J 15% |
| **Shares / weights** | Integer weights; amount divided pro rata | Room: a couple takes 2 shares, singles take 1 |
| **Adjustment** | Equal base plus a per-person add-on | Equal meal ₹500 each, +₹300 on Rahul's for the extra drink |
| **Itemised** | Line items assigned to people; tax, service charge and tip prorated by subtotal | Restaurant bill, item-by-item |

**Multiple payers** is a property of the expense, orthogonal to split mode: an expense may record several payers with individual amounts summing to the total. This is free. It is paywalled in Splitwise and is one of the most common real trip situations (the bill was split across two cards).

**Payer-not-participant** is supported in every mode: the payer is simply absent from the participant set.

### 9.2 Money representation — non-negotiable

- All monetary values are stored and computed as **signed 64-bit integers in the currency's minor unit** (paise for INR). Floating point is never used for money, anywhere, including in the client.
- The currency's minor-unit exponent comes from an ISO 4217 table (INR = 2, JPY = 0, KWD = 3). Zero-decimal currencies must not be assumed away.

### 9.3 Rounding — the deterministic remainder rule

Splitting ₹1,000 three ways yields 33,333.33 paise each; 1 paisa is unallocated. The rule, applied identically on client and server:

1. Compute each participant's exact share as a rational number.
2. Floor each to the minor unit.
3. Compute the remainder R = total − Σ floors. R is strictly less than the participant count.
4. Distribute R as one minor unit each to the first R participants, ordered by `hash(expense_id + member_id)` ascending.

This makes rounding **deterministic** (client and server always agree, so sync never produces drift), **stable** (editing an unrelated field does not reshuffle paise), and **fair in aggregate** (the hash ordering varies by expense, so no single person systematically absorbs the extra paise). The UI never surfaces this; it exists so that balances always sum to exactly zero.

**Invariant (enforced by a server-side check on every write):** for any trip, Σ member balances = 0, exactly. A violation is a P0 incident and blocks the write.

### 9.4 Balance computation

For member *m* in trip *t*, in base currency:

```
balance(m) = Σ amount_paid_by(m, e) for all expenses e
           − Σ share_of(m, e)      for all expenses e
           + Σ settlements_paid_by(m)
           − Σ settlements_received_by(m)
```

Positive means the group owes them; negative means they owe the group. Balances are computed incrementally server-side and cached per trip, with a full recomputation triggered on any expense edit, delete, or member change, and nightly as an integrity audit.

### 9.5 Settlement simplification

Turning *n* members' net balances into the fewest payments is the flagship output.

**Algorithm:** net every member's balance, discard zeros, load positives into a max-heap of creditors and negatives into a max-heap of debtors. Repeatedly pop the largest debtor and largest creditor, create a payment for `min(|debt|, credit)`, push back whichever side has a remainder. Terminate when either heap empties. This produces at most *n − 1* payments.

Minimising transaction count exactly is NP-hard; the greedy max-matching heuristic is what Splitwise uses and is optimal or near-optimal for realistic group sizes (n ≤ 30). We do not need better.

**Two modes, user-selectable per trip:**

- **Simplified (default for trips).** Debts are rerouted for minimum payments. If Anna owes Bob ₹20 and Bob owes Charlie ₹20, Anna pays Charlie ₹20 directly. Correct for closed friend groups, and the reason the feature exists.
- **Direct.** Payments only ever occur between people who have an actual pairwise debt, no rerouting. Some groups object strongly to being told to pay someone they never transacted with. Offering this toggle costs us almost nothing and prevents a category of trust failure.

**Presentation requirements:** show the payment count saved ("12 payments → 3"); every derived payment must be tappable to reveal its derivation ("this covers your ₹1,000 room share and ₹200 cab share"); never present a derived payment as a debt the user "has" — it is a suggestion.

### 9.6 Partial settlements

A member may pay part of what they owe. A Settlement records any amount; the derived payment recalculates. Overpayment is allowed and flips the balance sign, with a warning.

---

## 10. Feature specifications

Format: user story, then acceptance criteria. `MUST` is release-blocking.

---

### F1 — Create a trip *(R1)*

> As an Organiser, I want to create a trip in seconds so I can start logging before I lose momentum.

- MUST require only a **name**; everything else optional.
- MUST offer optional destination (place autocomplete), start/end dates, cover image, and base currency (defaulting to the device locale's currency, INR in India).
- MUST offer trip templates on creation — *Beach trip, Road trip, Trek, Wedding, Office offsite, Other* — that preset the category list and the default split mode. Templates are cosmetic and never constrain behaviour.
- MUST create the trip locally and usable **before** any network call completes.
- MUST support a `planning` state so a trip can hold an itinerary and bookings before it becomes `active`.

---

### F2 — Add members, including ghost members *(R1)*

> As an Organiser, I want to add all four of us immediately, even though nobody else has the app yet.

- MUST allow adding a member **by name alone**, creating a ghost. No phone number, no email, no invite required.
- MUST allow adding from the device contact list (with permission) and by phone number.
- MUST let ghost members appear in every split, hold balances, and appear in settlement output, identically to claimed members.
- MUST generate a single shareable **trip invite link** with a native share sheet, optimised for pasting into WhatsApp.
- MUST let an invited person **view the trip's balances read-only from the link before installing or registering**. This is the single highest-leverage adoption decision in the product; a paywalled or auth-walled invite kills the Participant persona.
- MUST let a user claim a specific ghost identity on joining ("Which one are you? → Neha"), transferring all history without recomputation.
- MUST support members who join partway through: a **`joined_from` date** on each member, and a default participant set for new expenses that excludes members who had not yet joined on that expense's date. This must be overridable per expense.
- MUST support trips up to 50 members (design target 4–12).

---

### F3 — Add an expense *(R1)* — **the critical path**

> As anyone on the trip, I want to log a spend in under five seconds while standing at the counter.

- MUST open to an **amount-first numeric keypad**. Amount is the first and only required field.
- MUST default: payer = current user, participants = all members active on that date, split = equal, date = now, currency = trip base.
- MUST allow saving with amount alone; description, category and receipt are optional and editable later.
- MUST show the resulting per-person amount live as the user types, before saving.
- MUST reach the participant/split editor in **one tap** from the entry screen.
- MUST support all seven split modes from §9.1 and multiple payers, with no limits and no paywall.
- MUST validate that exact-amount splits sum to the total and percentage splits sum to 100%, with an inline "₹120 unassigned" hint and a one-tap "distribute the remainder equally" action.
- MUST allow attaching up to 5 receipt photos, compressed client-side, uploaded lazily in the background.
- MUST work fully offline, queueing for sync.
- MUST provide a "**repeat last expense**" shortcut (the third cab of the day is the same as the first).
- MUST detect probable duplicates — same amount, same day, within a 10-minute window, created by a different member — and prompt rather than silently merging or silently duplicating. Two people logging the same dinner is the most common real data-quality failure in group apps.
- SHOULD support voice entry ("twelve hundred for dinner, me and Rahul") parsed into a draft expense.
- SHOULD provide a quick-add widget and a share-sheet target.

---

### F4 — Receipt scanning and itemised split *(R1 photos free / itemisation is Pro)*

> As the person holding the bill, I want to photograph it and assign items to people instead of typing fourteen lines.

- MUST allow receipt photo attachment on the free tier, always (storage, not intelligence, is the free part).
- Pro: MUST extract merchant, date, total, tax, service charge and line items from a photograph using an LLM-based extraction pipeline, returning structured JSON.
- MUST present extraction as an **editable draft** that the user confirms. Never write an expense from extraction without confirmation.
- MUST support assigning each line item to one or more participants, splitting an item equally among its assignees.
- MUST prorate tax, service charge and tip across participants **in proportion to their assigned subtotal**, not equally. Getting this wrong is visibly unfair.
- MUST degrade gracefully: on extraction failure, keep the photo and fall back to manual entry with a clear message. Never lose the user's photo.
- Target ≥95% accuracy on total, ≥85% on line items, against a benchmark set of 200 real Indian restaurant, bar and grocery receipts including thermal-print fade, regional-language items, and crumpled captures. **This benchmark must exist before the feature ships.**

---

### F5 — Live balances *(R1)*

> As anyone, I want to open the app and immediately know whether I'm up or down.

- MUST show, at the top of the trip, the current user's net position in one line: "**You are owed ₹3,400**" or "**You owe ₹1,200**".
- MUST show a per-member list with net balances and a group total spend figure.
- MUST make every balance tappable to a derivation view listing every contributing expense and settlement.
- MUST update optimistically and instantly on local edits, reconciling on sync.
- MUST recompute correctly when an expense is edited or deleted, and notify affected members when a change alters their balance by more than a configurable threshold (default ₹1).

---

### F6 — Settle up *(R1)* — **the value moment**

> As the Organiser, I want the app to tell everyone exactly who pays whom, and I want them to actually pay.

- MUST produce the simplified payment list per §9.5, with the direct/simplified toggle.
- MUST show a prominent payment-count reduction ("12 payments → 3").
- MUST generate, for each payment where the payee has saved a UPI ID, a `upi://pay` deep link prefilled with payee VPA, payee name, amount, and a transaction note carrying the trip name. Tapping opens the payer's chosen UPI app.
- MUST, on returning from the UPI app, prompt "Did the payment go through?" and record a Settlement on confirmation. **We cannot and do not verify UPI payment status** — we have no payment-gateway relationship and therefore no callback. The UI must never imply verification.
- MUST support manual "mark as paid" for cash, bank transfer, or off-app payments, with an optional note.
- MUST allow partial settlement of any amount.
- MUST let any member send a **settlement summary** to WhatsApp as clean formatted text plus an image card, because that is where the group actually lives.
- MUST support **reminders**: a nudge to a member with an outstanding balance, sent as a push notification and shareable to WhatsApp. Rate-limited to one per member per 48 hours to prevent the app becoming a harassment tool.
- MUST mark a trip `settled` when all derived payments are recorded, and generate the recap (F14).
- MUST NOT touch, hold, route, pool or transmit funds at any point. See §14.

---

### F7 — Trip kitty / common pool *(R1)* — **a differentiator**

> As a group, we each put ₹5,000 into a common pot and spend from it, and we want the leftovers back correctly.

This models how Indian friend groups genuinely handle trip money and is natively supported by no competitor.

- MUST allow enabling a kitty per trip, with a target per-person contribution or free-form contributions.
- MUST record each member's contribution individually, including unequal and partial contributions and late top-ups.
- MUST allow any expense to be marked **paid from the kitty** rather than by a person. Such an expense still has participants and a split rule; the kitty is the payer.
- MUST show a live kitty balance: contributed, spent, remaining — prominently, because running out mid-trip is the failure mode.
- MUST warn when the kitty is below a threshold (default 20% of total contributions) and offer a "top-up needed: ₹X each" calculation.
- MUST, at settlement, fold the kitty into the normal balance computation: a member's contribution counts as money they paid; their shares of kitty-funded expenses count as money they owe. **The remaining kitty is refunded in proportion to contributions, not equally**, unless the group overrides this.
- MUST handle the case where kitty contributions and kitty spending are both unequal, without special-casing — this falls out of the standard balance model if contributions are modelled as payments.

---

### F8 — Budget and burn-down *(R2)*

> As the Organiser, I want to know on day two whether we're going to run out of money.

- MUST support a total trip budget and optional per-category budgets, in the trip base currency.
- MUST support an optional **per-person** budget for members who want to track their own ceiling independently of the group's.
- MUST show spend vs budget with a burn-down projected against days remaining ("at this rate you'll finish 18% over").
- MUST send a push notification at 75% and 100% of budget consumption, to the trip, once each.
- MUST separate **committed** spend (bookings paid pre-trip) from **in-trip** spend in the burn-down, since otherwise the first day always looks catastrophic.

---

### F9 — Categories and analytics *(R2)*

- MUST provide default categories: Stay, Travel, Food, Drinks, Activities, Shopping, Fuel, Tolls, Tips, Misc, with template-specific defaults.
- MUST allow custom categories per trip.
- MUST auto-suggest a category from the description and merchant using an on-device keyword map first, falling back to the extraction model when a receipt is present.
- MUST show a category breakdown for the trip, and per-person spend ("Aditya's share: ₹8,400 — 28% of trip").
- Pro: day-by-day spend chart, category-over-time, per-person comparison, and the same views across a user's whole trip history.

---

### F10 — Multi-currency *(R2)*

> As someone in Bali, I want to log in rupiah and settle in rupees without doing FX maths.

- MUST support a trip base currency plus per-expense currency from a list of 150+ ISO 4217 currencies.
- MUST fetch daily reference rates from an FX provider, cache them locally, and **freeze the rate onto the expense at creation time**. Retroactively re-rating historical expenses when the market moves is unacceptable in a shared ledger — two members opening the app on different days must see identical balances.
- MUST allow manually overriding the rate per expense, for the forex counter or credit-card rate the user actually received. (TravelSpend and Trabee both do this; it's a frequently requested behaviour.)
- MUST display each expense in its original currency with the base-currency equivalent secondary.
- MUST compute all balances and settlements in the base currency only.
- MUST work offline using the last cached rate table, clearly labelled with its date.
- MUST be **free**. It is paywalled in Splitwise and free in Tricount; matching Tricount costs us nothing and removes a switching objection.

---

### F11 — Itinerary *(R2)*

> As a group, we want the plan and the money in the same place.

- MUST provide a day-by-day itinerary for the trip's date range, with items having a title, time, optional place, optional notes, and an **estimated cost**.
- MUST support item types: Travel, Stay, Activity, Meal, Free time.
- MUST allow drag-to-reorder within a day and moving items between days.
- MUST support **collaborative editing** by all trip members with live sync and last-write-wins per field.
- MUST allow **linking an itinerary item to a real expense**, so estimated cost can be compared against actual ("Scuba: estimated ₹3,000, actual ₹3,600").
- MUST roll estimated costs into a **planned total**, shown against the budget before the trip starts — this is the bridge between planning and the money core, and the reason the itinerary earns its place in this product rather than in Wanderlog.
- MUST be fully readable offline.
- SHOULD support a shared "ideas" list of unscheduled items.

---

### F12 — Places and map *(R2)*

- MUST allow saving places to a trip with a name, category, coordinates and notes, via a place-search autocomplete.
- MUST show all saved places and itinerary items on a single trip map.
- MUST allow adding a place directly to a day in the itinerary.
- MUST cache saved place data for offline viewing (names, notes, coordinates; map tiles best-effort).
- Deliberately NOT in scope: route optimisation, drive-time estimation, recommendations. Wanderlog owns that; competing there is a distraction from money.

---

### F13 — Bookings and document vault *(R3)*

> As the person holding everyone's tickets, I want them in one place and available without signal.

- MUST support booking records typed as Flight, Train, Bus, Hotel, Cab, Activity, Other, with provider, confirmation/PNR, dates and times, cost, and who it covers.
- MUST link a booking to an expense so a pre-paid hotel booking is also a split expense, entered once.
- MUST allow attaching files (PDF, image) to bookings and to the trip generally — tickets, IDs, visas, insurance.
- MUST make all attached documents **available offline** once downloaded. This is the feature's entire point; an airport without signal is the use case.
- MUST encrypt documents at rest and restrict access to trip members.
- MUST NOT auto-parse email inboxes for bookings in v1 (high complexity, high privacy cost, TripIt's moat, not ours).
- SHOULD show upcoming bookings as a "next up" card during the trip.

---

### F14 — Trip timeline and recap *(R3)*

> As a group, we want the trip to be a memory, not a ledger.

- MUST present a reverse-chronological trip feed: expenses, settlements, kitty top-ups, member joins, itinerary changes, photos and free-text notes.
- MUST allow posting photos and notes to the timeline without attaching them to an expense.
- MUST generate, on settlement, a **recap**: total spent, per-person totals, biggest expense, spend by category, busiest day, a map of places visited, and a photo montage.
- MUST render the recap as a shareable image card and a public read-only link, both branded, both containing an install call-to-action. This is a deliberate viral surface at the moment of peak positive sentiment.
- MUST allow the group to exclude per-person amounts from the shared version — not everyone wants their spend public.

---

### F15 — Export *(R2, Pro)*

- MUST export a trip to CSV and PDF: all expenses with payers, participants, shares, settlements, and a final balance sheet.
- MUST include a plain-language settlement summary in the PDF.
- SHOULD support importing a Splitwise group export. Migration friction is the main thing keeping users on an app they publicly hate; removing it is high-leverage and cheap.

---

### F16 — Notifications *(R1)*

- MUST push on: an expense involving you is added, an expense affecting your balance is edited or deleted, you are added to a trip, a settlement to you is recorded, a settle-up reminder, budget thresholds, trip start and end.
- MUST be granularly controllable and must not push for every expense in a high-volume trip — batch into a digest above 5 events in 30 minutes.
- MUST NOT send growth or marketing pushes through the transactional channel.
- MUST use Toli's own notification design, not the plain system style: brand colour and icon, the other person's avatar, the amount in the title, and action buttons (e.g. "Pay ₹1,000 via UPI", "Mark as paid", "See split"). Reminders and kitty/budget alerts SHOULD show a progress bar; digests SHOULD use a grouped inbox style. Implementation: see [Tech Stack §5.8](2026-09-24-toli-tech-stack.md).
- MUST offer separate notification categories (Android channels): Payments, Expenses, Reminders, Trip updates, each mutable by the user.

---

## 11. Correctness guarantees

These are the properties the engineering team must be able to demonstrate with tests:

1. Balances across any trip sum to exactly zero at all times.
2. No floating-point arithmetic touches money at any layer.
3. Rounding remainders are deterministic and identical on client and server.
4. An expense's FX rate is frozen at creation and never re-derived.
5. Simplification never changes any member's net balance — only the routing of payments.
6. Deleting an expense restores every affected balance exactly to its prior value.
7. The same operations applied in any order via offline sync converge to identical balances.

---

## 12. Offline and sync

Offline is a requirement, not a feature. Treks, flights, foreign SIMs and restaurant basements are the normal operating environment.

**Model: local-first with an outbox.**

- Local SQLite holds the complete trip state. All reads are local. The UI never waits on the network.
- Every mutation writes locally and appends to an **outbox** of operations, each with a client-generated UUID, a device id, and a client timestamp.
- The outbox drains to the server on connectivity. The server assigns a monotonic per-trip sequence number and is the ordering authority.
- Clients pull changes since their last known sequence number; realtime push (websocket) accelerates this when online.

**Conflict resolution:**

- **Create/create:** no conflict — UUIDs make creates idempotent. Retried creates are absorbed.
- **Edit/edit on the same expense:** last-write-wins **per field**, by server receipt order, so two people editing description and amount both succeed.
- **Edit/delete:** delete wins; the edit is discarded and the editing user is told what happened.
- **Member removal with pending expenses:** rejected server-side; the client surfaces a resolution flow.
- **Duplicate detection** (F3) runs on sync too, since the two entries may have been made offline on different devices.

**Requirement:** balances are recomputed deterministically from the operation log. Any client, replaying the same operations in server sequence order, must arrive at identical balances. Conflict handling must never silently lose an expense — anything discarded surfaces in an "unresolved changes" view.

---

## 13. Onboarding and invite flow

This flow determines whether the product grows. It is specified deliberately.

**Organiser (installs first):**
1. Open app → optional phone OTP, skippable. A trip can be created and used entirely locally without an account. Account creation is prompted only when they invite someone or approach a second device.
2. Create trip (name only) → add members by typing names (ghosts) → land on an empty expense list with the keypad already focused.
3. Target: **under 90 seconds from install to first expense.**

**Participant (receives a WhatsApp link):**
1. Tap link → web page shows the trip: total spent, their name pre-identified where possible, and **what they owe**. No account, no install, no wall.
2. "Open in app" → install → deferred deep link returns them to the same trip.
3. Claim their identity from the member list, with phone OTP.
4. Full history is attached to them instantly.

**Non-negotiable:** showing the balance before install. The Participant's entire motivation is "what do I owe"; making them install to find out converts a fraction of them, and every lost Participant degrades the Organiser's outcome too.

---

## 14. Payments, settlement rail and regulatory position

**Position: Toli never touches money.** This is both a product principle and a regulatory necessity.

- Collecting, pooling, or settling user funds makes an entity a **Payment Aggregator** under the RBI's Payment Aggregator directions. That requires ₹25 crore net worth, escrow accounts with a scheduled commercial bank, PCI-DSS certification, data localisation, and a four-to-six-month authorisation process. Operating without it is illegal under the Payment and Settlement Systems Act, 2007.
- The **trip kitty (F7) is an accounting construct only.** No money enters a Toli-controlled account. Members hand cash or transfer UPI to whoever physically holds the pot; we record it. This distinction must be explicit in the UI, the terms of service, and the App Store listing — a feature called "kitty" that appears to hold funds invites both regulatory attention and user misunderstanding.
- **UPI collect requests are not available to us.** NPCI directed all banks, PSPs and UPI apps to stop initiating, routing or processing P2P collect transactions from 1 October 2025, following widespread fraud. Any design that assumes "request money from Rahul" is invalid.
- **The rail is `upi://pay` intent deep links.** The app constructs a link with the payee VPA, payee name, amount and a transaction note; the OS opens the user's UPI app; the user authenticates with their own PIN in their own app. Toli is never in the flow. No licence, no escrow, no PCI scope, no settlement risk.
- **Consequence to design around:** we receive no payment confirmation callback. Settlement recording is user-confirmed, and the UI must state this honestly rather than implying verification.
- Users store their own UPI ID on their profile, optionally, and control its visibility to trip members.

**Post-v1 option:** a partnership with a licensed PA/PSP to offer verified in-app settlement. This is a Series-A-scale undertaking, has real revenue potential (Splitwise is pursuing exactly this with Splitwise Pay), and is explicitly out of v1.

---

## 15. Monetisation

**Free forever, with no limits:** unlimited trips, unlimited members, unlimited expenses, **every split mode**, multiple payers, the kitty, balances, simplified settlement, UPI links, multi-currency, receipt **photos**, itinerary, places, bookings, documents, timeline, recap, and notifications.

That list is the strategy. Every item on it that Splitwise restricts is a reason for a group to switch.

**Toli Pro — a per-trip pass, ₹149 one-time (price to be validated):**

| Pro feature | Rationale |
|---|---|
| Receipt scanning and itemised auto-split | Genuine marginal cost (inference); highest perceived magic |
| Advanced analytics — day-by-day, category trends, per-person comparison | Nice-to-have, not need-to-have |
| CSV and PDF export | Organiser convenience |
| Custom recap themes and unbranded recap sharing | Vanity, at the moment of peak sentiment |
| Unlimited document vault storage (free tier: 1 GB per trip) | Real marginal cost |
| Priority support | — |

**Why a per-trip pass rather than a subscription:**

1. Trips are episodic. Subscriptions ask for an ongoing commitment against an occasional need — the mismatch that makes travel-app subscriptions convert poorly.
2. It is bought at peak willingness-to-pay: the Organiser, mid-trip, with a pile of receipts.
3. **One purchase covers the whole trip for every member.** The buyer feels generous instead of extracted, and every other member experiences Pro features for free — the best possible trial.
4. Indian consumer subscription conversion is difficult; a ₹149 one-time is an impulse purchase.
5. Settle Up's short-term group premium is the closest existing analogue and is well regarded.

**Toli Pro Annual (₹499/year)** for the frequent traveller: all Pro features on all trips, plus cross-trip analytics and history. Offered only *after* a user has bought two trip passes — sold as savings rather than as a wall.

**Not doing:** ads (the specific thing users cite when abandoning Settle Up's free tier and Splitwise's), selling transaction data, or paywalling anything on the money path.

---

## 16. Technical architecture

> **Full stack, costs and reasoning:** see [Toli — Tech Stack](2026-09-24-toli-tech-stack.md). Target: **$0 to run until real traction.** The only fixed costs are Google Play ($25 once), Apple Developer ($99/year, can wait until the iOS beta) and the domain (~₹800–1,200/year).

**Stack at a glance:**

| Layer | Choice |
|---|---|
| Mobile | Expo (React Native) + TypeScript, Expo Router |
| On-device data | SQLite (`expo-sqlite` + Drizzle) + outbox |
| Money engine | `@toli/engine`, a shared pure-TypeScript package |
| Backend + DB | Supabase: Postgres (Mumbai), Edge Functions, Row Level Security, Realtime, pg_cron |
| Auth | Supabase Auth: anonymous first, then Google / Apple / email code; phone OTP later via the Send SMS hook (WhatsApp or MSG91) |
| Files | Cloudflare R2 (private, signed URLs) |
| Invite page + deep links | Cloudflare Workers on our domain; Play Install Referrer on Android |
| Push | Custom-designed notifications: react-native-notify-kit (maintained Notifee fork) draws them on the device; FCM delivers (APNs on iOS) |
| FX | Frankfurter (fallback: fawazahmed0 currency-api), fetched daily |
| Maps / places | MapLibre + OpenFreeMap tiles; Geoapify search via a server proxy |
| Analytics / crashes / email | PostHog / Sentry / Resend |
| Code / CI / builds | GitHub + GitHub Actions + EAS Build |

**Client:** React Native (Expo, bare workflow where native modules require it), TypeScript. One codebase for iOS and Android. Local store: SQLite via a typed data layer (Drizzle). Client-side money arithmetic uses BigInt minor units and shares the split/settlement implementation with the server as a single package — so the optimistic local result and the authoritative server result cannot diverge.

**Backend:** PostgreSQL (Supabase, `ap-south-1` Mumbai) as the system of record. Simple CRUD goes through Supabase's generated REST API behind Row Level Security (members see only their own trips). Sync goes through a TypeScript Edge Function that re-runs `@toli/engine`, enforces the zero-sum invariant, and calls a Postgres function that locks the trip row and assigns the per-trip sequence number. Supabase Realtime broadcasts a per-trip "pull now" signal; clients always pull by sequence number. Object storage is Cloudflare R2 (S3-compatible) for receipts and documents, served via short-lived signed URLs. Rate limiting and small caches live in Postgres at launch; add Redis only if load requires it. A nightly GitHub Action backs up the database to R2.

**The splitting engine is a standalone, pure, dependency-free TypeScript package** consumed by both client and server. It takes expenses and settlements in, and produces shares, balances and derived payments out. No I/O, no dates from the environment, fully deterministic. This is the most important architectural decision in the document: it is the only way to guarantee that the number on the phone and the number on the server agree, and it makes the highest-risk logic exhaustively testable in isolation.

**Third-party services:** an LLM vision API for receipt extraction (server-side, never client-side keys; paid tier with no training on our data, not a free tier); an FX rates provider with daily caching; a place-search and maps provider; push via FCM (APNs on iOS) with notifications drawn on the device by react-native-notify-kit for a Toli-branded design (colour, avatar, receipt image, action buttons such as "Pay via UPI", progress bars for kitty/budget, grouped digests); phone OTP via WhatsApp authentication messages with an SMS fallback (optional at launch, since it is the only login method with a per-message cost); deferred deep linking for invite attribution (self-built on App Links / Universal Links; Firebase Dynamic Links is shut down).

**Testing requirements:**
- Property-based tests over the splitting engine asserting the §11 invariants across randomly generated trips (random member counts, split modes, currencies, edit and delete sequences).
- A golden-file suite of hand-computed real trip scenarios, including the worked example in Appendix A.
- Deterministic offline-sync simulation: N clients, randomised partitions and operation orders, asserting convergence.
- Receipt extraction benchmarked against the 200-receipt corpus, with accuracy tracked per release.

---

## 17. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Cold start to trip list ≤1.5s (p90, mid-range Android). Expense save ≤100ms locally. Balance recompute ≤50ms for a 500-expense trip. |
| Offline | Every read and write functions with no network. Sync resumes automatically. |
| Reliability | ≥99.5% crash-free sessions. Zero data loss on force-quit mid-entry. |
| Scale | 50 members and 2,000 expenses per trip without degradation. |
| Device targets | Android 9+, iOS 15+. Must be usable on a 3-year-old ₹15,000 Android phone — that is the actual device of a meaningful share of the market. |
| App size | ≤40 MB download. |
| Battery/data | No background polling; push-triggered sync. Receipt uploads deferred to Wi-Fi by default, user-overridable. |
| Accessibility | Full screen-reader labels on all money values; minimum 4.5:1 contrast; dynamic type support. Money must never be conveyed by colour alone. |
| Localisation | English and Hindi at launch; architecture ready for more. Indian digit grouping (₹1,23,456) and the lakh/crore convention must be correct — getting this wrong is an immediate credibility failure in the launch market. |

---

## 18. Privacy, security and compliance

- **India's DPDP Act, 2023 applies.** Explicit consent for contact access, purpose limitation, data minimisation, user rights to access/correct/erase, and breach notification. A privacy notice in plain language, and a functioning account-and-data deletion path, are launch-blocking.
- Contacts are matched by **salted hash**; raw contact books are never uploaded.
- Receipts and vault documents are encrypted at rest; access is authorised per trip membership and served only through short-lived signed URLs.
- Phone numbers are visible to co-trip-members only. UPI IDs are opt-in per user and visible only to members who owe them money.
- Financial data is never sold, shared with advertisers, or used to train third-party models. Receipt images sent for extraction go to a provider under a zero-retention agreement; this must be verified contractually before F4 ships.
- Audit log on every expense: who created it, every edit, who deleted it, retained for the trip's life. In a shared ledger, "who changed my share" must always be answerable.
- Deleting an account anonymises the member in past trips rather than deleting shared expenses, since other members' balances depend on them. This must be disclosed at deletion time.

---

## 19. Analytics and instrumentation

Instrument for the funnel in §6.2, not for vanity. Minimum event set:

`trip_created` (template, member_count) · `member_added` (ghost|claimed|contact) · `invite_shared` (channel) · `invite_link_opened` (installed?) · `member_claimed` · `expense_added` (split_mode, payer_count, currency, offline?, entry_method, **duration_ms**) · `split_mode_changed` · `receipt_scanned` (success, confidence, edited_after?) · `kitty_enabled` / `kitty_topped_up` / `kitty_depleted` · `balance_viewed` · `settlement_viewed` (simplified|direct, payment_count, payments_saved) · `upi_link_tapped` · `settlement_recorded` (upi|manual, partial?) · `reminder_sent` · `trip_settled` (days_to_settle) · `recap_shared` (channel) · `pro_paywall_viewed` (feature) · `pro_purchased` · `sync_conflict` (type, resolution) · `balance_dispute_reported`.

`expense_added.duration_ms` is the instrumentation for the five-second principle and belongs on the main dashboard.

---

## 20. Release plan

**R1 — Splitting core.** F1, F2, F3, F5, F6, F7, F16, plus offline sync. *Ship criterion:* 20 real trips run end-to-end by people outside the team, with zero balance-correctness incidents, and a median time-to-log at or under 5 seconds. This is a complete, valuable, independently launchable product. **Do not proceed to R2 before this criterion is met** — the remaining pillars build on a ledger that must be trustworthy first.

**R2 — Trip money context and planning.** F8, F9, F10, F11, F12, F15, plus Pro purchase and F4 receipt scanning. *Ship criterion:* itinerary-to-expense linking used in ≥30% of trips that have an itinerary; Pro attach rate measurable.

**R3 — Vault and memory.** F13, F14, plus recap sharing and the public recap link. *Ship criterion:* recap shared from ≥40% of settled trips.

**Public launch** at the end of R3 as the full trip money manager, with R1 and R2 already validated on real trips through an invite-only beta. The beta is not a soft-launch formality; it is how we find the balance bugs before strangers do.

---

## 21. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Splitwise reverses its free limits** | Removes the wedge entirely | The wedge buys entry, not victory. Trip context, kitty and UPI are the durable differentiation and are all in v1. Do not build a product whose only claim is "free". |
| **Cold start — the app is useless alone** | Blocks adoption | Ghost members plus link-first, install-free balance viewing. One user with the app makes a trip fully functional. |
| **Scope: three products in one v1** | Slips the launch, all three land mediocre | The R1/R2/R3 sequencing with hard ship criteria. R1 must be excellent before R2 starts. This risk was flagged and accepted by the decision owner. |
| **A wrong balance** | Permanent loss of a whole group | Shared deterministic engine, integer money, property-based tests, zero-sum invariant enforced server-side, full audit trail. |
| **Receipt extraction disappoints** | Undermines the headline Pro feature | 200-receipt benchmark before ship; always-editable drafts; graceful manual fallback; never charge on a failed scan. |
| **Users expect the kitty feature to hold money** | Regulatory exposure and user harm | Explicit language in UI, ToS and store listing; no funds flow; legal review of the kitty feature's presentation before R1 ships. |
| **Play Store restricts SMS auto-capture** | Loses a hoped-for India differentiator | Already excluded from v1. Assume unavailable. |
| **FX and LLM API costs scale with free usage** | Margin erosion | FX is cached daily and shared across all users (negligible). Extraction is Pro-only, so inference cost is always paired with revenue. |
| **Reminders become a harassment vector** | Brand damage, store reports | Rate-limited to one per member per 48h; neutral, non-accusatory copy; recipient can mute. |
| **Low willingness to pay in India** | Weak revenue | Per-trip pricing at impulse level; buyer-covers-group framing; annual plan offered only after demonstrated repeat purchase. |

---

## 22. Open questions

1. **Name and brand — decided, pending legal clearance.** The product is **Toli** (टोली — *a group, a band of people who move together*). Chosen because the product's unit is the friend group on a trip, not the arithmetic. The literal-arithmetic namespace is saturated by direct competitors — Hisaab, Barabar, Khata, Splitkaro, spliit and Splitwise itself all occupy it, and several are the same product under a different name. Toli has no conflict in the Indian app, travel or fintech categories, is four letters, and verbs naturally in Hinglish ("Toli pe daal de"). The common pool keeps the feature name **kitty**, because that is what groups call the pot — but the brand deliberately does not, since a money app named "Kitty" implies it holds funds, which is the exact perception §14 exists to prevent. **Still to clear before design production:** ipindia.nic.in search in Classes 9, 36 and 42; domain acquisition (toli.app / toli.in / gettoli.com — toli.com is unlikely to be available); App Store and Play Store name availability, which are enforced separately from trademark.
2. **₹149 price point** — unvalidated. Test ₹99 / ₹149 / ₹199 in beta.
3. **Does the itinerary earn its place?** Instrument itinerary-to-expense linking in R2. If under 20% of trips with an itinerary link any item to an expense, the planning pillar is a Wanderlog feature we've copied rather than a reason we exist, and it should be reduced to a lightweight day plan.
4. **Trip templates** — cosmetic only in this spec. If beta shows groups want template-driven default splits (e.g. "office offsite splits by company policy"), that is a deeper feature.
5. **Recurring non-trip groups (flatmates)** — a large adjacent market and the main reason people keep a Splitwise account year-round. Deliberately out of v1; revisit after R3.
6. **Splitwise import** — listed as SHOULD in F15. Should it be a launch-blocking MUST? It is the cheapest possible switching-cost remover.
7. **Web app** — currently only an invite-preview page. Organisers reconciling a large trip on a laptop is a plausible real need.

---

## Appendix A — Worked example (golden test case)

Four members: Aditya, Rahul, Neha, Jay. Trip base currency INR.

| # | Expense | Amount | Paid by | Participants | Split | Per-person |
|---|---|---|---|---|---|---|
| 1 | Hotel | ₹4,000 | Aditya | All 4 | Equal | ₹1,000 each |
| 2 | Dinner | ₹1,200 | Aditya | Aditya, Rahul | Selected-equal | ₹600 each |
| 3 | Cab | ₹800 | Rahul | All 4 | Equal | ₹200 each |

**Totals paid:** Aditya ₹5,200 · Rahul ₹800 · Neha ₹0 · Jay ₹0 — total ₹6,000.
**Totals owed:** Aditya ₹1,800 (1,000 + 600 + 200) · Rahul ₹1,800 (1,000 + 600 + 200) · Neha ₹1,200 (1,000 + 200) · Jay ₹1,200 (1,000 + 200) — total ₹6,000. ✓

**Net balances:**

| Member | Paid | Owed | Net |
|---|---|---|---|
| Aditya | ₹5,200 | ₹1,800 | **+₹3,400** |
| Rahul | ₹800 | ₹1,800 | **−₹1,000** |
| Neha | ₹0 | ₹1,200 | **−₹1,200** |
| Jay | ₹0 | ₹1,200 | **−₹1,200** |
| | | **Sum** | **₹0** ✓ |

**Simplified settlement** — creditors {Aditya +3,400}, debtors {Neha −1,200, Jay −1,200, Rahul −1,000}:

> **Neha pays Aditya ₹1,200**
> **Jay pays Aditya ₹1,200**
> **Rahul pays Aditya ₹1,000**

Three payments instead of six pairwise relationships. Since there is exactly one creditor, direct and simplified modes produce identical output here — a useful property for the test suite.

*(Note: the illustrative figures in the original concept brief — "Rahul owes Aditya ₹1,350, Jay owes Rahul ₹150" — don't follow from these three expenses. The table above is the arithmetically correct result and should be the fixture the engine is tested against.)*

### A.2 — Additional required fixtures

1. **Rounding:** ₹1,000 split 3 ways → 333.34 / 333.33 / 333.33, deterministic assignment, sum exactly ₹1,000.
2. **Multiple payers:** ₹3,000 bill paid ₹2,000 by Aditya and ₹1,000 by Neha, split equally among 4.
3. **Late joiner:** Jay joins day 2; night-1 accommodation splits 3 ways, everything after splits 4 ways.
4. **Kitty:** unequal contributions (A ₹5,000, R ₹5,000, N ₹3,000, J ₹2,000), ₹12,000 spent from the kitty across mixed participant sets, ₹3,000 remaining — assert the proportional refund and the resulting net balances.
5. **Multi-currency:** IDR expenses on an INR trip with rates frozen per expense; assert balances are unchanged when the live rate later moves.
6. **Delete-and-restore:** delete a mid-trip expense; assert every balance returns exactly to its prior value.
7. **Offline convergence:** three devices, partitioned, 40 interleaved operations including two edits to the same expense; assert identical final balances on all three.

---

## Appendix B — Sources

- Splitwise free-tier limits and user sentiment: [The Hisaab](https://thehisaab.com/blog/splitwise-free-plan-limits) · [splitty](https://splittyapp.com/learn/splitwise-free-limits/) · [Are We Even](https://www.areweeven.com/blog/splitwise-free-vs-pro-2026) · [split-circle](https://split-circle.com/en/blog/splitwise-daily-limit)
- Splitwise scale, funding and Splitwise Pay: [Tracxn](https://tracxn.com/d/companies/splitwise/__tltLqpt1ryUq4Ieqxfl5dBOBxUiMconSXhb3oFqBc4M) · [Crunchbase](https://www.crunchbase.com/organization/splitwise)
- Competitor comparison (Tricount, Settle Up, Splid): [TripProf](https://tripprof.com/en/blog/best-apps-track-split-group-trip-expenses/) · [Faroway](https://www.faroway.ai/blog/best-apps-splitting-costs) · [SquadTrip](https://www.squadtrip.com/guides/top-splitwise-alternatives-for-group-travel-expenses/)
- Wanderlog feature set and pricing: [Wanderlog](https://wanderlog.com/travel-budget-expense-splitting-app) · [Wandrly review](https://wandrly.app/reviews/wanderlog/)
- Solo travel budget apps, offline and multi-currency: [TravelSpend](https://apps.apple.com/us/app/travelspend-travel-budget-app/id1434284824) · [Trabee Pocket](https://play.google.com/store/apps/details?id=com.trabee.exnote.travel)
- Debt simplification algorithm: [Algorithm Behind Splitwise's Debt Simplification](https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688) · [GeeksforGeeks — Minimize Cash Flow](https://www.geeksforgeeks.org/dsa/minimize-cash-flow-among-given-set-friends-borrowed-money/)
- UPI deep links and intent flow: [Setu — UPI Deeplinks](https://setu.co/payments/upi-deeplinks/) · [Dvaarik — upi://pay explained](https://www.dvaarik.com/blog/upi-payment-link-deep-linking-india)
- NPCI discontinuation of P2P collect requests: [WBPAY](https://wbpay.in/en/upi-payment-change-npci-discontinues-old-upi-collect-payment-method-from-2026/) · [Billcut](https://www.billcut.com/blogs/new-upi-risk-rules-for-collect-requests/)
- RBI Payment Aggregator framework and escrow requirements: [RBI Master Directions, 15 Sep 2025 (PDF)](https://www.fidcindia.org.in/wp-content/uploads/2025/09/RBI-PAYMENT-AGGREGATORS-DIRECTIONS-15-09-25.pdf) · [Treelife](https://treelife.in/fintech/rbi-payment-aggregator-pa-cb-authorisation/)
- Receipt OCR vs LLM extraction accuracy: [Parsli 2026 benchmark](https://parsli.co/blog/llm-ocr-vs-traditional-ocr) · [LlamaIndex](https://www.llamaindex.ai/insights/best-ocr-for-receipts)
- Market sizing: [Market Research Future — Group Travel](https://www.marketresearchfuture.com/reports/group-travel-market-33138) · [VynZ — India Tourism](https://www.vynzresearch.com/consumer-goods/india-tourism-market)
