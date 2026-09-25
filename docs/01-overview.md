# 01 · Product Overview

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Source** | [PRD](superpowers/specs/2026-09-23-trip-money-manager-prd.md) · `ui-refrence/` |

---

## 1. What is Toli?

**Toli (टोली, "a group that moves together") is a trip-first money app for groups of friends.**

- A group creates a trip and adds everyone. Friends who don't have the app yet are added as **ghost** members, just names.
- They log money as it's spent, in about 5 seconds each. The app knows who paid, who took part, and what each person owes, and it updates live, **even offline**.
- At the end, Toli turns hundreds of entries into the **fewest possible payments**, such as "Rahul pays Aditya ₹1,000", and gives each person a **UPI link** to pay.
- Around that core it holds the rest of the trip's money context: the kitty (a shared pot), the budget, the itinerary, bookings and documents, and a shareable recap.

**Toli never holds, moves or sees money.** It only keeps count (PRD §14).

---

## 2. The problem

- Group trips produce dozens of shared payments.
- Today groups use WhatsApp and memory, a spreadsheet one person maintains, or Splitwise, which now limits free users to about 4 expenses a day and charges for unequal splits.
- The hard part is **social, not maths**:
  - logging at the moment of spending;
  - asking to be paid back without it being awkward;
  - fairness in edge cases ("Jay joined on day 2", "Neha doesn't drink");
  - the last step: actually getting paid.

---

## 3. Who it's for

| Persona | Needs | What they get |
|---|---|---|
| **The Organiser** (Aditya, 26) | stop being the accountant; get paid back without asking twice | ghost members, the 5-second keypad, settle-up with UPI links, reminders |
| **The Participant** (Neha, 24) | open a WhatsApp link, see what she owes, pay | a web page with no install or login; one-tap UPI |
| **The Frequent Traveller** (Rahul, 29) | history, repeat groups, analytics | the trip archive, recaps, Pro |

**Not for (v1):** corporate expenses, flatmates splitting rent, tour operators.

---

## 4. Value proposition

**Unlimited expenses, every kind of split, unlimited groups: free forever.**

Money features are never paywalled. Pro is a **per-trip pass (about ₹149)** for convenience extras: receipt scanning, advanced analytics, export, recap themes, and more vault storage.

---

## 5. Core product loop

```
Create / Join trip  →  Add expense  →  See who owes what  →  Settle up
        ↑                                                     │
        └──────────── next trip (the archive keeps them) ─────┘
```

Everything else supports this loop. Nothing is allowed to make it slower.

---

## 6. Scope

R1 is split into a small beta (**R1a**) and the rest of the splitting core (**R1b**) ([D-018](decisions/D-018-r1a-r1b-scope.md)).

| Release | Contents | Ship criterion |
|---|---|---|
| **R1a · Beta (APK)** | trips; ghost members; join by link or code (claim in the app); **All expenses**; **Trip settings**; **I already have an account**; **Recorded payments**; splits: Equal, Selected-equal, Exact, Percent, Shares; multiple payers; receipt **photos**; kitty (contributions, spends, holder hand-over, "cash with holder" line); balances + trace; **Simplified** settle-up; UPI links (split above ₹1 lakh); Mark as paid (exact amount); rounding adjustment; **Close trip**; offline sync + Unresolved changes; in-app stub banner + **plain** pushes; **read-only** web invite page; English | 3–5 real friend groups; zero balance errors; median time-to-log ≤ 5 s |
| **R1b · Splitting core complete** | Direct mode (exact pairing); Itemised + Adjustment splits; Refunds; web payments (limited web membership, pending until confirmed); custom Android notification styles + push reminders; kitty top-up suggestion; digests; Hindi | PRD §20: 20 real trips by outsiders, **zero balance errors**, median time-to-log ≤ 5 s |
| **R2 · Money context + planning** | budget and burn-down (free), categories and analytics, multi-currency, itinerary and places/map, export, Pro pass, receipt **scanning** (Pro), Splitwise import (SHOULD) | itinerary-to-expense linking in ≥ 30% of trips with an itinerary |
| **R3 · Vault + memory** | bookings and document vault, trip feed, recap card and public recap link | recap shared from ≥ 40% of settled trips |

**Testing phase (before any store):** the R1a APK is shared directly with friend groups and uses the production backend ([D-016](decisions/D-016-testing-distribution.md)).

**Out of scope for v1:** flatmate groups, SMS auto-capture, bank imports, a full web app, chat, booking affiliates, approval workflows, **contacts matching** ([D-025](decisions/D-025-no-contacts-matching-v1.md)), phone OTP (later).

---

## 7. Product principles (PRD §5)

1. Money features are free, forever.
2. Five seconds to log an expense.
3. Never block on someone else installing the app.
4. The trip is the container.
5. Offline is the default assumption.
6. We never hold the money.
7. Every number is explainable.

---

## 8. Success metrics

- **North star (PRD):** *trips settled per week*.
- **Activation metric:** *groups with 3+ expenses in week one* (OQ-P1, decided).

| Layer | Metric | 6-month target |
|---|---|---|
| Activation | trips with ≥ 3 members and ≥ 5 expenses within 48 h | ≥ 55% |
| Engagement | median time-to-log | ≤ 5.0 s |
| Completion | trips with ≥ 5 expenses settled within 14 days of the end | ≥ 80% |
| Virality | new installed users per Organiser per trip | ≥ 2.5 |
| Retention | 2nd trip within 90 days | ≥ 35% |
| Monetisation | settled trips with a Pro pass | ≥ 8% |
| Quality | balance disputes per 1,000 trips | < 2 |

Full event list: [10 Observability](10-observability.md).

---

## 9. Important assumptions

| # | Assumption | Where |
|---|---|---|
| A1 | India first: INR default, UPI settlement; English in R1a, Hindi in R1b | PRD §1, [D-018](decisions/D-018-r1a-r1b-scope.md) |
| A2 | Android first. iOS beta later (the Apple account costs $99/year) | [D-001](decisions/D-001-tech-stack.md) |
| A3 | No login screen at first; an anonymous account is created silently | [D-007](decisions/D-007-auth.md) |
| A4 | Whole-rupee keypad for INR | [D-013](decisions/D-013-keypad-entry.md) |
| A5 | Settle-up uses hold-to-tear from the prototype, not the film's tap | [D-012](decisions/D-012-hold-to-tear.md) |
| A6 | Dark theme only in v1 | [13](13-design-system.md) |
| A7 | Screens not in the UI reference (Join by code, Sign in, Settings/Profile, Trip settings, All expenses, Expense detail, Recorded payments, Unresolved changes, Members, Pro sheet) follow the design system and are marked as assumptions | [screens/](screens/README.md) |

---

## Open questions

**Status (2026-09-25):** every question below was **accepted with its suggested answer** (see [open-questions.md](open-questions.md) and [review §28](14-pre-development-review.md#28-my-open-questions-and-recommendations)). They're now decisions. The product owner can still change any of them by recording a new decision. **Only the items marked "Still open" need someone to act.**

| ID | Question | Decision | Where |
|---|---|---|---|
| OQ-P1 | North-star metric | **Trips settled per week.** "Groups with 3+ expenses in week one" is tracked as the activation metric | [10](10-observability.md) |
| OQ-P2 | First-expense target | Design for **60 s**, accept 90 s | [05](05-user-flow.md) |
| OQ-E1 | Kitty "equal refund" override | **Dropped** | [D-010](decisions/D-010-kitty-folding.md) |
| OQ-E2 | Rounding refinement | **Accepted** (largest remainder, then hash) | [D-005](decisions/D-005-rounding-rule.md) |
| OQ-P3 | Tagline | "**Trip money, sorted.**" | [13 §8](13-design-system.md) |
| OQ-P4 | App icon | Option **1b** (lime ticket on dark grey); a designer pass before the store listing | [13 §8](13-design-system.md) |
| OQ-P5 | Domain | **Still open:** toli.in or toli.app. Buy one before invites leave the testing group. Until then, `*.workers.dev` | [D-016](decisions/D-016-testing-distribution.md) |
| OQ-P6 | Splitwise import | **SHOULD**, in R2 | [features/export](features/export.md) |
| OQ-P7 | Pro price | A/B test ₹99 / ₹149 / ₹199 **after the Play Store launch** (R2), when real purchases are possible (PostHog flags). Beta testers get Pro by grant, so the beta can only measure *interest* (taps on the Pro sheet) | [features/pro-pass](features/pro-pass.md) |
| OQ-P8 | Paying from the web page | **Not in R1a** (read-only page). **R1b:** a limited web membership pays only its own debt, and payments stay pending until the payee confirms | [D-024](decisions/D-024-web-page-read-only-beta.md) |
| OQ-P9 | Trademark check | **Still open:** legal check of "Toli" (ipindia, classes 9/36/42) before the store launch. Owner: Aditya | PRD §22.1 |
| OQ-P10 | Lock-screen notification look | **Accepted:** exact design in the app; plain system notifications in R1a; custom Android styles in R1b | [D-009](decisions/D-009-notifications.md) |
| OQ-P11 | Bottom bar in R1 | **Trip · + · Members.** The full bar comes in R3 | [13 §6](13-design-system.md) |
| OQ-P12 | Who can do what | The **[permission matrix](09-security.md#permission-matrix)** is the single source | [D-031](decisions/D-031-permission-matrix.md) |
| OQ-P13 | When a trip is settled | Zero balances **and** (end date + 24 h, or **Close trip**). **Request reopen** for members | [D-023](decisions/D-023-auto-settle-timing.md) |
| OQ-P14 | Claim approval | **No approval.** The organiser is notified and can Release | [features/invites-and-joining](features/invites-and-joining.md) |
| OQ-P15 | Default category | **None** selected; suggested from the description; empty shows "Misc" | [features/expenses](features/expenses.md) |
| OQ-P16 | Google account already on Toli | Interim: "This Google account is already on Toli. Sign in with it instead" (through **I already have an account**). A merge comes later | [features/auth-and-identity](features/auth-and-identity.md) |
| OQ-P17 | Receipt photos on mobile data | Attached photos wait for Wi-Fi if "Wi-Fi only" is on; **scans upload immediately** | [features/receipt-scan](features/receipt-scan.md) |
| OQ-P18 | Is the budget chart free? | **Yes.** Pro adds only the extra analytics charts | [features/budget](features/budget.md) |
| OQ-P19 | Do testers' trips carry over? | **Yes:** testers use production. One reinstall at the Play Store switch, with a prompt to save the account first | [D-016](decisions/D-016-testing-distribution.md) |
| OQ-P20 | The only organiser loses their account | Prompt organisers to save their account at their first invite. After 30 days with no active organiser, the longest-standing member is offered the role | [features/auth-and-identity](features/auth-and-identity.md) |
| OQ-P21 | Small rules | "Former member" spots can't be claimed. Members can leave at zero balance. Your own `joined_from`, or anyone's if you're an organiser. Duplicate offline ghost names become "Rahul 2". Beta testers get Pro by **grant**. Privacy consent is recorded at Get started / join. Unresolved changes stay on their device. No payer card labels | [09](09-security.md#permission-matrix), [features/members-and-ghosts](features/members-and-ghosts.md) |
| Q-A | R1a / R1b split | **Accepted** | [D-018](decisions/D-018-r1a-r1b-scope.md) |
| Q-B | Direct mode exact pairing | **Accepted** (R1b) | [D-020](decisions/D-020-direct-mode-exact-pairing.md) |
| Q-C | Rounding adjustment under ₹1 | **Accepted** | [D-021](decisions/D-021-rounding-adjustment.md) |
| Q-D | Kitty "cash with holder" line during the trip | **Accepted** | [D-022](decisions/D-022-kitty-views-and-handover.md) |
| Q-E | Settle timing | End date + 24 h, or Close trip | [D-023](decisions/D-023-auto-settle-timing.md) |
| Q-F | Web payments | Not in the beta; limited and pending in R1b | [D-024](decisions/D-024-web-page-read-only-beta.md) |
| Q-G | Contacts matching | **Dropped** from v1 | [D-025](decisions/D-025-no-contacts-matching-v1.md) |
| Q-H | Refund type | **Accepted** (R1b) | [D-029](decisions/D-029-refund-expense.md) |
| Q-I | UPI over ₹1 lakh | Split into several links | [07 §8.5](07-calculation-engine.md) |
| Q-J | PRD v1.1 | Drafted as a changelog at the top of the PRD; **Still open: Aditya to approve** | [PRD](superpowers/specs/2026-09-23-trip-money-manager-prd.md) |

**Still open (actions, not design questions):** OQ-P5 (buy the domain), OQ-P9 (trademark check), Q-J (Aditya approves PRD v1.1), and a designer pass on the app icon.

## Known unknowns
- How good Geoapify/OSM place data is for Indian places. Test in R2.
- Receipt extraction accuracy on the 200-receipt benchmark. Measure before shipping F4.
- The real Supabase free-tier breaking point. Watch database size and Realtime connections during the beta.
