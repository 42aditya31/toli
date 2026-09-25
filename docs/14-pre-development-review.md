# 14 · Toli: Pre-Development Review

| | |
|---|---|
| **Status** | Fixes applied to the docs on 2026-09-25 (see §0). The findings below are kept as the record |
| **Date** | 2026-09-24 |
| **Reviewed** | PRD · `ui-refrence/` (Toli App, Tear to Split, Welcome Variants, Logo, film components) · every file in `docs/` (01–13, 27 screens, 20 features, D-001…D-017, open questions) |
| **How** | Every document was cross-checked against the others: PRD ↔ flows ↔ screens ↔ features ↔ database ↔ API ↔ sync ↔ maths ↔ security. The money rules were **run as code** with edge-case numbers to try to break them. |
| **Question answered** | *"If we build exactly what is documented today, what goes wrong, what is already strong, and what should we fix first?"* |

> **Category tags:** SUPER · GOOD · OK · NEEDS IMPROVEMENT · RECOMMENDATION · RISK · BUG · CRITICAL BUG · MISSING · OVER-ENGINEERED · FUTURE CONCERN
> **IDs:** `B-` bugs, `S-` security, `R-` risks, `M-` missing requirements, `C-` contradictions. They're used in the checklist at the end.

---

## 0. Status after fixes (2026-09-25)

**Every must-fix item in §24 has been applied to the documentation.** The suggested answers in §28 and in [open-questions.md](open-questions.md) were accepted by default and recorded as decisions D-018 to D-031. This review is kept unchanged below as the record of what was found.

| Finding | Resolution | Where |
|---|---|---|
| B-01 direct-mode paise | exact north-west-corner pairing; direct mode moves to R1b | [D-020](decisions/D-020-direct-mode-exact-pairing.md), [07 §8.2](07-calculation-engine.md) |
| B-02 removed member balance | removed members locked at 0 (`removed_member_balance`) | [D-030](decisions/D-030-removed-members-locked.md), [06 §5](06-syncing.md) |
| B-03 checks before the lock | `apply_ops` with expected `last_seq` + `stale` retry | [D-026](decisions/D-026-write-path-and-compat.md), [03 §1](03-database-schema.md), [06 §6](06-syncing.md) |
| B-04 per-field money merge | money group wins as a whole | [D-019](decisions/D-019-money-edit-group.md) |
| B-05 kitty holder via settings | `kitty.handover` money op + `kitty_handovers` table | [D-022](decisions/D-022-kitty-views-and-handover.md) |
| B-06 paise dust | exact Mark as paid + rounding settlement under ₹1 on close | [D-021](decisions/D-021-rounding-adjustment.md), [07 §8.4](07-calculation-engine.md) |
| B-07 kitty display | trip view ("Kitty cash with holder") vs settle view | [D-022](decisions/D-022-kitty-views-and-handover.md), [07 §6](07-calculation-engine.md) |
| B-08 / B-09 duplicates | compare `spent_at`; duplicate-settlement prompt | [06 §5](06-syncing.md) |
| B-10 / DB-6 FX edge cases | 12-significant-digit decimal rate; `amount_too_small` | [07 §4](07-calculation-engine.md), [03 §5.2](03-database-schema.md) |
| B-11 SQLite bigint | INTEGER + one money codec | [D-028](decisions/D-028-money-in-sqlite.md) |
| B-13 itemised seed | seed by item ID | [07 §5.1](07-calculation-engine.md) |
| B-14 / C-16 code alphabet | type the 6 random characters only | [D-008](decisions/D-008-invite-links.md) |
| S-01 web claim power | read-only web page in the beta; limited web membership in R1b | [D-024](decisions/D-024-web-page-read-only-beta.md) |
| S-07 private rows leak | `trip_ops.visible_to_member_id`; `trip_member_secrets` | [03](03-database-schema.md) |
| S-08 public Realtime | private channels | [06 §3.4](06-syncing.md) |
| S-02/S-09/S-10 abuse & limits | limits checked first; Turnstile (web); anonymous cleanup; new API keys | [04](04-api-schema.md), [D-027](decisions/D-027-environments-and-backups.md) |
| S-04 contact hashes | contacts matching dropped | [D-025](decisions/D-025-no-contacts-matching-v1.md) |
| S-05 lock screen | `hide_lockscreen_amounts` | [03 §3.1](03-database-schema.md) |
| A-3 audit | pure-SQL audit + `engine_version` | [07 §7](07-calculation-engine.md) |
| A-4/A-8 compatibility | lenient phone parsing, minimum client version, expand/contract | [D-026](decisions/D-026-write-path-and-compat.md) |
| A-7 transactions | `apply_ops` function | [03 §1](03-database-schema.md) |
| C-06 / backups | local dev + 2 cloud projects; pooler backups; 30 days; restore drill | [D-027](decisions/D-027-environments-and-backups.md) |
| Invocation budget | pulls via PostgREST; pushes from sync-push; health via RPC | [04 §2.2, §10.1](04-api-schema.md) |
| API-1 lifecycle job | daily `lifecycle` job | [04 §10.1](04-api-schema.md) |
| §5.3 auto-settle | end + 24 h or Close trip; Request reopen | [D-023](decisions/D-023-auto-settle-timing.md) |
| M-1 missing screens | All expenses, Trip settings, Sign in, Recorded payments | [screens/](screens/README.md) |
| M-8 permissions | one matrix | [09 §2.3](09-security.md#permission-matrix), [D-031](decisions/D-031-permission-matrix.md) |
| P-5 UPI limits | split over ₹1 lakh | [07 §8.5](07-calculation-engine.md) |
| P-6 trip deletion | only if no other claimed member | [09 §2.3](09-security.md#permission-matrix) |
| P-7 refunds | Refund type (R1b) | [D-029](decisions/D-029-refund-expense.md) |
| D-1…D-6 design | exact tokens, icons, warning/danger colours, components, compact layout | [13](13-design-system.md) |
| §5.2 scope | R1a / R1b | [D-018](decisions/D-018-r1a-r1b-scope.md), [01 §6](01-overview.md) |
| C-01…C-05 PRD | PRD v1.1 changelog (pending Aditya) | [PRD](superpowers/specs/2026-09-23-trip-money-manager-prd.md) |

**Still open (actions, not design):** buy the domain (OQ-P5) · trademark check (OQ-P9) · Aditya approves PRD v1.1 · designer pass on the app icon · the four technical spikes (§28.2 item 4).

---

## 1. Executive Summary

**Overall: the foundation is strong.** The product is clear, the money engine is designed well, and offline sync has the right shape. **Don't start coding yet, though. There are 6 problem areas that would cause real rework, wrong money or a data leak if built as documented:**

1. **Some settle-up and balance rules can produce wrong or "stuck" numbers.** Direct mode loses or creates a paisa in about half of multi-payer expenses. Whole-rupee payments against paise balances never reach exactly zero. A removed member can quietly get a balance again. The kitty makes the holder look like they "owe ₹10,000" on day 1. (§13)
2. **A few sync rules have holes that allow bad data.** Checks run before the trip is locked, so two changes can slip past each other. Dependent money fields (amount, payers, split) are merged separately. The kitty holder change bypasses the money rules. Duplicate detection can't catch offline duplicates. (§14)
3. **Four screens the R1 flow needs don't exist:** a full expense list, Trip settings, "I already have an account", and a list of recorded payments with Void. Some copy also says things were "sent" or "paid" when they weren't. (§7, §8)
4. **The invite web page is a security hole as designed.** Claiming a name in a browser makes that person a full member, able to read the whole trip including ID documents. The simplest fix for the beta: **make the web page read-only.** (§15)
5. **Some infrastructure facts break the plan.** The Supabase free plan allows 2 projects, not 3. Backups can't reach the database from GitHub as written. The phone's SQLite library can't store `bigint`. The free function allowance runs out at around 500–1,000 daily users, not 10,000. (§16–§18)
6. **R1 is too big for a small team.** The core loop is buried under web payments, custom notification designs, direct mode, the manual itemised split and contacts. Cut R1 into a smaller beta first. (§5, §7)

**Everything else can move forward.** Most fixes are **document changes (about 2–3 days)**, not architecture changes. The core architecture should stay.

---

## 2. Overall Project Health

| Area | Status | Why, in one or two lines |
|---|---|---|
| Product | **GOOD** | Clear user, clear wedge (free, trip-first, UPI), clear loop. R1 is overloaded. |
| UX | **NEEDS ATTENTION** | Core screens are well specified. Four screens are missing, and some copy overstates what happened. |
| UI / Design system | **GOOD** | A coherent ticket-and-stub language with central tokens. Some tokens are ranges, there's no icon set and no error colour. |
| Architecture | **GOOD** | One shared pure engine, SQLite first, outbox, server-only writes. Keep it. |
| Database | **GOOD, small fixes** | Append-only money and RLS everywhere. A few missing columns and ops, enum choices, and storage growth to watch. |
| API | **GOOD** | Idempotent, versioned, Zod on both sides, money as strings. A few gaps (void list, scheduled lifecycle jobs). |
| Calculations | **CRITICAL REVIEW REQUIRED** | The core splitting is proven correct by test runs. Direct mode, rounding leftovers ("dust") and kitty display have real bugs. |
| Sync | **NEEDS ATTENTION** | Idempotency and ordering are right. Validation timing, dependent-field merging and duplicate detection need fixing. |
| Security | **NEEDS ATTENTION** | Strong base (server-only writes, RLS everywhere). But browser-claimed sessions see everything (critical), the change history leaks private rows, and the Realtime channel is public. |
| Infrastructure | **NEEDS ATTENTION** | 2 free Supabase projects, not 3. The backup job can't connect as written. The free function allowance runs out about 10× sooner than estimated. |
| Testing | **GOOD, gaps** | Property tests and a sync simulator are planned. There are no tests yet for direct-mode totals, migration against old apps, or time zones. |

---

## 3. What Is Already Strong (protect these)

| # | What | Why it's good | Why we should keep it |
|---|---|---|---|
| 1 | **SUPER: one pure money engine, used on the phone and the server** ([07](07-calculation-engine.md)) | The number on the phone and on the server can never disagree. It's fully testable with no database. | This is what makes "zero balance errors" achievable. Never let money logic leak into the UI or into SQL. |
| 2 | **SUPER: one `allocate()` function for all division** | Tested with ₹100/3, ₹10/6, ₹0.01/3, ₹0, and ₹9,99,99,999/7: every result sums exactly. Deterministic across devices. | One function to test deeply instead of ten places that round. |
| 3 | **SUPER: integers only, `bigint` in memory, strings on the wire** ([D-014](decisions/D-014-ids-and-wire-money.md)) | Floating-point money errors can't happen, even in JSON. | Cheap now, impossible to add later. |
| 4 | **SUPER: append-only money (revisions and voids)** ([D-006](decisions/D-006-append-only-money.md)) | "Who changed my share?" always has an answer. Delete-and-restore is exact. | It's the audit trail and the dispute tool. |
| 5 | **GOOD: outbox + server sequence + idempotent `op_id`** ([06](06-syncing.md)) | A lost response or a retry can never duplicate an expense (scenario 9). The order is decided by the server, not by phone clocks. | The right foundation for offline-first. |
| 6 | **GOOD: all trip writes go through one server gate; phones can only read** ([D-011](decisions/D-011-server-writes.md)) | One place checks maths, rules and permissions. RLS can't be bypassed from the app. | Security and correctness in one place. |
| 7 | **GOOD: kitty modelled as "contributions are payments"** ([D-010](decisions/D-010-kitty-folding.md)) | Proportional refunds follow from the normal maths with no special case. | Fewer special cases means fewer bugs. How it's *displayed* needs fixing (B-07). |
| 8 | **GOOD: an honest UPI position** | Toli never says a payment is verified. The UPI ID is released only to someone who owes that person. INR only. | Keeps us clear of payment regulation and keeps trust. |
| 9 | **GOOD: "Unresolved changes"** | Every rejected change gets one plain sentence and one next step. Nothing is silently lost. | This is what makes offline trustworthy. |
| 10 | **GOOD: documentation-first, with a decision log** | 17 recorded decisions, and assumptions are marked. A new engineer can follow the reasoning. | It stops the team re-arguing settled decisions. |
| 11 | **GOOD: a $0 stack chosen with verified limits** ([D-001](decisions/D-001-tech-stack.md)) | Firebase, Vercel and PowerSync were correctly ruled out. The first paid step is known (Supabase Pro, $25/month). | No surprise bills during the beta. |
| 12 | **GOOD: the design language** | The ticket, stub and tear metaphor is original, consistent and on-brand. Money is never shown by colour alone. | It's what makes Toli feel like a product, not a spreadsheet. |

---

## 4. What Is Good but Needs Attention

| Area | Status | What to do |
|---|---|---|
| Rounding refinement (D-005) | **OK** | Correct and better than hash-only, but the PRD still says hash-only. Update the PRD (C-01). |
| Snapshot + pull | **NEEDS IMPROVEMENT** | The snapshot must be read in one consistent database transaction (REPEATABLE READ), or ops committed during the read can be missed. Say so in 04 §2.3. |
| Per-trip lock for `seq` | **GOOD** | The sequence number is assigned under a row lock, so there are no gaps or reordering. **But validation must happen under the same lock** (B-03). |
| Notifications | **NEEDS IMPROVEMENT** | The three design levels plus the phone-maker fallback are right, but too much for R1. Ship the in-app banner and a plain system push first (§22). |
| Invite links | **GOOD** | A hashed plus encrypted token, a rotating code and guess limits. Fix the code alphabet (B-14) and the power of browser sessions (S-01). |
| Tokens in the design system | **NEEDS IMPROVEMENT** | Many tokens are ranges ("16–18"). Pick one value each (§9). |

---

## 5. Things I Recommend Reconsidering

> **I WOULD RECOMMEND THINKING ABOUT THIS ONCE MORE.**

### 5.1 Merge edits "per field" for money
- **Current approach:** two phones' edits to one expense are merged field by field.
- **Why I'm questioning it:** amount, currency, rate, payers, split mode and split input depend on each other.
- **Possible problem:** A changes ₹3,000 to ₹3,500 while B changes the Exact split that assumed ₹3,000. The merged result doesn't add up, and B's edit fails for reasons they can't see.
- **Recommended approach:** treat **{amount, currency, fx, payers, split_mode, split_input, paid_from_kitty}** as **one group**, where the last write wins as a whole. Only description, category, date and is_committed merge field by field.
- **Trade-off:** the earlier money edit is replaced as a whole. It's still in the history, and that editor is notified.

### 5.2 How big R1 is
- **Current approach:** R1 = the full core loop plus web payments, the web-to-app handover key, custom notification designs with a phone-maker fallback, direct mode, manual itemised split, adjustment split, kitty top-up maths, reminders and digests, roles and takeover, contacts, and Hindi.
- **Why I'm questioning it:** a small team will spend months on R1 before a single real trip gets tested. The PRD's own rule is "R1 must be excellent before R2 starts".
- **Recommended approach:** split R1 into **R1a (the beta)** and **R1b**. Details are in §24.
- **Trade-off:** some PRD R1 MUSTs arrive a few weeks later. **This needs the PRD owner's sign-off.**

### 5.3 Auto-settling a trip
- **Current approach:** the server marks the trip settled as soon as the payments reach zero after stubs are sent.
- **Why I'm questioning it:** on day 2 of 4, if everyone happens to be square, the trip locks. Non-organisers can't reopen it, and an offline friend's late expense is rejected.
- **Recommended approach:** auto-settle **only after `end_date` plus a 24-hour grace period**, or on an explicit **Close trip** once everything is zero. Add a **Request reopen** action for members.

### 5.4 Contacts matching in v1
- **Current approach:** phone hashes, a discovery opt-in, consents, and a `/contacts-match` endpoint.
- **Why I'm questioning it:** phone login is "later", so the feature can barely work. A 10-digit phone number hashed with a published salt can be reversed in hours, so it's weak privacy anyway.
- **Recommended approach:** **drop it from v1.** Picking from contacts should add **names only**.
- **Trade-off:** no "Rahul is already on Toli" hint. Nobody will miss it in the beta.

---

## 6. Critical Bugs / Risks

These are the worst problems. Full details are in §13 and §14.

| ID | Severity | One line |
|---|---|---|
| **B-01** | CRITICAL BUG | Direct-mode settlement: about half of multi-payer expenses leave a paisa behind, so the trip never settles |
| **B-02** | CRITICAL BUG | A removed member can get a non-zero balance again, hidden from every screen |
| **B-03** | HIGH BUG | Checks happen before the trip is locked, so two changes can pass the checks together and break the rules |
| **B-04** | HIGH BUG | Merging money fields separately produces invalid splits (§5.1) |
| **B-05** | HIGH BUG | Changing the kitty holder moves money through a plain settings edit |
| **B-06** | HIGH BUG | Paise leftovers: a whole-rupee "mark as paid" leaves ₹0.33, so the trip never auto-settles |
| **B-07** | HIGH BUG (UX/maths) | The kitty makes the holder look like they owe the whole pot during the trip |
| **B-08** | HIGH BUG | Duplicate detection uses the server time, so it misses duplicates made offline |
| **B-09** | HIGH BUG | The same payment can be recorded twice (payer and payee both mark it) |
| **S-01** | **CRITICAL RISK** | Anyone with the invite link can claim a ghost in a browser. They then become a full member: they can **read every trip table, download receipts and ID documents, get the invite token**, and edit or delete any expense |
| **S-07** | HIGH BUG | Private data leaks through the shared change history (personal budgets, owner-only files) and through readable member columns (contact hashes) |
| **B-11** | HIGH BUG | The phone's SQLite library can't return `bigint` at all. The planned "INTEGER → bigint" read doesn't exist |
| **A-7** | HIGH MISSING | `sync-push` needs one database transaction, and the normal Supabase client can't do that. The mechanism isn't chosen |
| **A-8** | HIGH BUG | Phones reject unknown fields, so the first server field we add breaks every older app |
| **R-01** | HIGH RISK | An anonymous user whose session is lost loses their account for good |
| **M-01** | CRITICAL MISSING | R1 has no full expense list, no Trip settings, no "I already have an account" and no recorded-payments list |

---

## 7. Product Problems

**What Toli is:** a free, trip-first money app for Indian friend groups. You log fast, see who owes what, and settle over UPI. **Core action:** log an expense in 5 seconds. **What makes it valuable:** it's unlimited and free, it works offline, it has the kitty, and it pays with one UPI tap.

| # | Category | Problem | Recommendation |
|---|---|---|---|
| P-1 | **RISK** | R1 is too big (§5.2). | Cut to R1a (§24). |
| P-2 | **MISSING** | No full list of expenses in R1. Recent shows 5 and the Feed is R3, so expense #6 is hard to reach. The budget screen links to a list that doesn't exist. | Add an **All expenses** screen in R1 (search, filter by person or category). |
| P-3 | **MISSING** | No Trip settings screen, but 6 docs send people there (rename, dates, currency, kitty on/off, rotate invite, reopen, leave, delete). | Specify **Trip settings**, reached from a ⋯ button in the Trip home header. |
| P-4 | **RISK** | Auto-settle locks trips mid-trip (§5.3). | End date + 24 h grace, or Close trip. |
| P-5 | **MISSING** | UPI has limits: about ₹1 lakh per P2P payment, bank daily limits, and about ₹5,000 in the first 24 h for new UPI users. A ₹1.4 lakh villa share fails. | Split payments over ₹1 lakh into several links with "pay across days" help; always offer "I paid a different amount". |
| P-6 | **MISSING** | Deleting a trip "disappears for everyone", even with other people's settlement history. That breaks the audit promise. | Full delete only if no one else has claimed a spot; otherwise leave or archive. |
| P-7 | **MISSING** | Refunds (a hotel refunds ₹2,000) can't be entered, because amounts must be > 0. | Add a **Refund** expense type: stored as a positive amount with a refund flag, and the engine flips the direction. |
| P-8 | **RISK** | Web claims give the browser too much power (S-01). | A limited role for browser sessions. |
| P-9 | **NEEDS IMPROVEMENT** | The PRD was never updated after 5 decisions changed it (C-01…C-05). | Issue **PRD v1.1**. |

**What should absolutely not be built yet:** contacts matching, Pro subscriptions, the iOS notification content extension, public recap links (R3), Splitwise import (R2), and phone OTP.

---

## 8. UX Problems

| # | Category | Where | Problem | Fix |
|---|---|---|---|---|
| U-1 | **CRITICAL MISSING** | welcome, settings | **Someone on a new phone can't get back in.** Welcome has no "Sign in", so a new anonymous account is created. Linking Google then says "already on Toli", but anonymous users can't sign out. | Add **"I already have an account"** on Welcome and in Settings. Let an anonymous user with no trips sign out. |
| U-2 | **HIGH** | add-expense, tear-overlay, settle-up, invite-web | **Copy says things happened when they didn't.** "Stubs sent to Rahul, Neha, Jay" appears before sync, and even for ghosts with no app. "Nudge sent" appears for a ghost. "Aditya sees it straight away" appears while it's still in the outbox. | Build the copy from reality: "Rahul and Neha will get a stub. Share with Jay on WhatsApp." Use "Stubs ready" / "Saved: sending when online". |
| U-3 | **HIGH MISSING** | settle-up, balance-trace | A recorded payment can only be undone from a 2.8-second Undo toast. | Add a **Recorded payments** list with **Void** (the recorder or an organiser). |
| U-4 | **HIGH MISSING** | add-expense, expense-detail | No control for **date, currency, or "booked before the trip"**, even though budget and FX depend on them. | Add a **"Today · ₹ ▾"** chip on Add expense that opens a sheet with date, currency and "Booked before trip". |
| U-5 | **HIGH** | settle-up | Hold-to-tear has an alternative only for screen-reader users. Switch Access, voice control and users with tremors are locked out. | Honour an OS accessibility setting (tap then confirm), plus haptic progress feedback. |
| U-6 | **HIGH** | add-expense (R2) | On a free trip, the BILL tile opens the Pro sheet, which hides the **free** photo attach. | BILL opens a choice: **Attach photo** / **Scan (PRO)**. |
| U-7 | **HIGH** | notifications | In R1 the digest push opens the Feed, which is R3. | Open Trip home in R1. |
| U-8 | **MEDIUM** | add-expense | **Paid by** cycles through every member with each tap, which is unusable with 8–50 people. Multiple payers are hidden behind a long press. | Tap opens a payer sheet (recent first) with a visible **+ payer**. |
| U-9 | **MEDIUM** | kitty | "Log ₹1,500 each" records cash for everyone, ghosts included, in one tap. | A confirm sheet with a checkbox per person. |
| U-10 | **MEDIUM** | budget, plan, kitty, trace | **Lime means both good and bad** (a positive balance, and also over budget or LOW). | Add a warning style. A negative Net uses the text colour. |
| U-11 | **MEDIUM** | add-expense | The duplicate sheet says "already logged … **today**", but the rule is 10 minutes. | "…10 minutes ago". |
| U-12 | **MEDIUM** | 360 px phones | Keypad keys shrink to about 38–45 px (under 44). "Zero awkward." at 52 px barely fits. | Define a **compact layout** for screens narrower than 380 px. |
| U-13 | **MEDIUM** | splash | A 1.2-second minimum splash works against the 1.5-second cold-start target. | Hold the splash only on first launch, or when the animation hasn't played yet. |
| U-14 | **LOW** | recap | "0 settled" on a settled trip reads oddly. | Hide the counter when it's 0. |

---

## 9. UI / Design Problems

| # | Category | Problem | Fix |
|---|---|---|---|
| D-1 | **NEEDS IMPROVEMENT** | **Tokens given as ranges**, so engineers will guess: `radius.lg` 16–18, `radius.xl` 20–22, card radius 20–24, card padding 16–20, gap 12–14, `type.caption` 12–13, `type.mono` 14–16, `dur.fast` 250–300, row height 52–58, stamp border 2.5–3. `ease.spring` has two curves. | One value per token. Variants get their own names (`radius.card`, `radius.settleRow`). |
| D-2 | **NEEDS IMPROVEMENT** | **Values in screens that aren't tokens:** font sizes 8/9/10/18/22/24/26/30/36/40/46/54/56/72; mono at weight 500; `#16181B`, `#000`, perforation .45 vs .35; easings `(.4,0,.2,1)` and `(.2,.9,.3,1.2)`. | Either make each one a token or change the screen to use an existing token. Add a lint rule that bans raw values in `apps/`. |
| D-3 | **MISSING** | **No icon system.** The prototype uses text glyphs (‹ ✂ ↻ ✕ ⋯ ✈). There's no notification small icon and no people icon. | Choose one open-source set (e.g. Phosphor or Lucide) and define sizes 16/20/24. |
| D-4 | **MISSING** | No **danger/error colour**, although Delete buttons are "destructive". No focus or disabled tokens. | Add `color.danger` (a soft red that passes 4.5:1 on dark), `color.focus` and `opacity.disabled`. |
| D-5 | **MISSING** | Components used in screens but missing from 13 §5: Switch, StubBanner (in-app notification), BurnDownChart, TripMap, PayerSheet. | Add them to the component list. |
| D-6 | **BUG** | The tear overlay is specified in fixed pixels (left 30, width 310). The reference screen is 370 px wide, not the 390 in 13 §8. | Specify it in relative units. |
| D-7 | **GOOD** | The palette matches the reference image exactly, and contrast ratios are checked. | Keep. |

---

## 10. Architecture Problems

| # | Category | Problem | Fix |
|---|---|---|---|
| A-1 | **HIGH BUG** | Validation happens before the lock (B-03). | Check under the lock, or re-check with an expected `last_seq`. |
| A-2 | **MEDIUM** | The Supabase session is bigger than secure-store allows, so it's encrypted in app storage (already fixed in 02). **But if that key or storage is lost, the anonymous account is gone** (R-01). | Prompt to save the account earlier (at the first invite or the first expense someone else can see). Refresh the session through a single path (see R-01). |
| A-3 | **HIGH** | Engine versions: fixing a rounding bug later changes results for new saves only, which is right. But the nightly audit "recomputes from scratch" with the newer engine, so it reports false P0s on old data and blocks releases. It also **can't run in pg_cron** (the engine is TypeScript), and one call over every trip would hit the 2-second CPU limit. | The audit becomes a **pure SQL** comparison of stored payers, shares and settlements against `trip_balances` (cheap, no engine). Store `engine_version` on each revision, and run engine replays per version, in batches. |
| A-4 | **MEDIUM** | Old app versions and database changes: new enum values (a new split mode, a new push kind) could crash old apps. | Rule: every migration is **expand → migrate → contract**. The phone treats unknown values as "Update the app to see this" and never crashes. |
| A-5 | **GOOD** | Clean layers (UI → state → commands → data → sync). The engine has no dependencies. | Keep. Add a lint rule stopping `apps/` code from importing SQL or fetch inside UI files. |
| A-6 | **OK** | Deno Edge Functions importing workspace packages needs bundling. | Settle the import-map and bundling setup in the first week (a spike). |
| A-7 | **HIGH MISSING** | `sync-push` must lock the trip, assign `seq` and insert everything in **one transaction**. The normal Supabase client (PostgREST) can't run multi-statement transactions. | Choose now: a `security definer` Postgres function `apply_ops(jsonb)` that takes the rows the engine computed and does lock → check `last_seq` → insert **(recommended)**, or postgres.js through the transaction pooler. |
| A-8 | **HIGH BUG** | "Zod rejects unknown fields" also runs on the phone. The first field the server adds (the harmless "expand" step) breaks every older app's pull. Sideloaded beta testers never auto-update. | **Be strict with input on the server, lenient on the phone** (ignore unknown fields). Add a version number to the shape of `result`. Migrate queued outbox ops when the app upgrades. Set a minimum client version (`426`). |
| A-9 | **HIGH RISK** | EAS Update reads the build settings and `EXPO_PUBLIC_*` values from the CI machine. If `APP_ENV` is wrong there, an update either silently never arrives or ships preview URLs to production. | Set the environment explicitly on `eas update`. CI checks the bundle's Supabase URL and fingerprint before publishing. |

---

## 11. Database Problems

| # | Category | Problem | Fix |
|---|---|---|---|
| DB-1 | **FUTURE CONCERN** | **Postgres enums are hard to change.** You can add values but not remove or rename them, and old apps break on unknown values. | Use `text` + `CHECK` for fast-changing lists (`split_mode`, push `kind`, `op type`, `attachment_owner`). Keep true enums only for stable ones (`trip_status`). |
| DB-2 | **MEDIUM** | `trip_ops` stores both `payload` and full `result` rows, **roughly doubling growth** of the 500 MB free database. | Keep `payload` for audit. Store `result` compactly (only changed columns), or rebuild it from the rows at pull time. |
| DB-3 | **MEDIUM** | Missing indexes: `trip_members(user_id)` (my trips), `trip_members(trip_id, user_id)` (the RLS check), `expense_revisions(expense_id, revision_no)`, `settlements(trip_id)`, `attachments(owner_type, owner_id)`, `kitty_contributions(trip_id)`. | Add them to 03. |
| DB-4 | **MEDIUM** | RLS calls `is_trip_member()` for every row. | Write policies with `(select auth.uid())` so it's evaluated once, and back them with DB-3's index. Test with 2,000-expense trips. |
| DB-5 | **MEDIUM** | `expenses.current_revision_id` ↔ `expense_revisions.expense_id` is a circular foreign key. | Make it `DEFERRABLE INITIALLY DEFERRED`, or drop that FK and enforce it in the RPC. |
| DB-6 | **MEDIUM BUG** | `fx_rate_num/den` are `bigint`. Cross rates from `numeric(24,12)` inputs can go beyond 19 digits. | Round cross rates to **12 significant digits** before freezing, and store the rate as a decimal string (`numeric(30,15)`). The engine turns it into a fraction. |
| DB-7 | **MISSING** | No `attachment.delete` op. `member.add` has no `contact_hash`. `trip.create` doesn't set `time_zone`. There's no "last active" data for the 30-day organiser takeover. | Add them to 06 and 03 (and drop `contact_hash` if contacts are cut, §5.4). |
| DB-8 | **MISSING** | Nothing cleans up **pending uploads that never completed**. | A nightly job deletes `attachments` still `pending` after 24 h, and their R2 objects. |
| DB-9 | **GOOD** | Soft delete everywhere, revisions for money, `seq` on every row. | Keep. |

---

## 12. API Problems

**"What happens if the phone calls it twice?"** Every write is idempotent, through `op_id` or an `Idempotency-Key`. **GOOD.**

| # | Category | Problem | Fix |
|---|---|---|---|
| API-1 | **HIGH MISSING** | **No scheduled lifecycle job** for: the "trip starts/ends" pushes (a PRD MUST), planning→active on the start date, auto-archive, auto-settle when no op triggers it, and the organiser takeover. | Add a daily `lifecycle` job to 04 §10.1. |
| API-2 | **MEDIUM** | `op_id` duplicates are detected, but a *different payload* with the same `op_id` (a client bug) is silently treated as a duplicate. | Store a payload hash. If it doesn't match, reject with `op_id_reused` and report it to Sentry. |
| API-3 | **MEDIUM** | `split_mismatch` is a reject code, yet 06 says "the server result wins" on a mismatch. When is it which? | Reject only when the phone's shares **don't add up**. If they add up but differ from the server's, the server wins and the phone is told. |
| API-4 | **MEDIUM** | `/invite-preview` returns **every member's balance and payments**, while the page only needs names and a total until someone picks a name. | Preview: names + total only. `/invite-member-view`: only the picked member's lines. |
| API-5 | **MEDIUM** | Failure states for `/stubs-send`, `/join`, `/upi-link` and `/web-settlement` on the web page aren't specified. The most likely drop is right after returning from the UPI app. | Specify a "Recording…" state and a retry with the same Idempotency-Key, plus error copy for each call. |
| API-6 | **LOW** | `settlement_recorded.method` is `upi|manual` in analytics, but `upi|cash|bank|other` in the database. | Use the database enum. |

---

## 13. Calculation / Mathematics Problems

The core splitting was **run as code** (`allocate()` exactly as written in 07):

| Test | Result | Verdict |
|---|---|---|
| ₹100 ÷ 3 | 33.34 / 33.33 / 33.33 | ✅ |
| ₹10 ÷ 6 | 1.67, 1.66, 1.66, 1.67, 1.67, 1.67 (sum ₹10.00) | ✅ |
| ₹0.01 ÷ 3 | 0.01 / 0 / 0 | ✅ (someone owes 1 paisa; acceptable) |
| ₹0 ÷ 3 | 0 / 0 / 0 | ✅ (a zero expense should still be blocked, M-2) |
| 99.99% + 0.01% of ₹0.01 | 0.01 / 0 | ✅ |
| ₹9,99,99,999 ÷ 7 | exact, sum matches | ✅ |
| **Direct mode, 2 payers, 3 people** | **payers collect 51 / 49 instead of 50 / 50** | ❌ **B-01** |
| 1 VND on an INR trip | converts to **₹0.00** | ⚠️ B-10 |

### B-01 · CRITICAL BUG: direct-mode settlement loses or creates paise
- **Why it happens:** 07 §8.2 splits **each person's share** across the payers separately. Each split rounds on its own, so the payers' totals drift away from what they actually paid.
- **Example:** ₹1.00 paid ₹0.50 by A and ₹0.50 by B, split 3 ways. The shares are 34/33/33 paise, and the payers "collect" 51 and 49. In a test of 1,000 random expenses, **497 were wrong**.
- **Impact:** direct-mode payments no longer match the balances. A 1-paisa leftover means the trip **never auto-settles**, and the people involved see numbers that "don't add up".
- **Solution:** build the pairwise debts with a method that **keeps both totals exact** (what each person owes, and what each payer paid). Go through participants and payers in ID order and pair them off until each total is used up (the "north-west corner" method from transport maths). It's exact and deterministic.
- **How to test:** a property test checking that, for every expense, the row sums equal the shares and the column sums equal the payer amounts. Also check that direct-mode net balances equal simplified-mode balances.

### B-06 · HIGH BUG: paise leftovers ("dust") stop trips from settling
- **Why it happens:** balances are in paise (Rahul owes ₹1,233.33). People pay and **mark whole rupees** (₹1,233), because the keypad is whole-rupee (D-013). 33 paise stay forever, and auto-settle needs exactly zero.
- **Example:** a 4-person trip with a ₹3,700 dinner split 3 ways leaves shares of 1,233.34 / 1,233.33 / 1,233.33.
- **Solution:**
  1. **Mark as paid** pre-fills the **exact** amount, paise included.
  2. A **dust rule:** once every remaining derived payment is under 1 major unit (₹1), the server writes an explicit **"rounding adjustment"** settlement (visible in the trace as "Rounding · ₹0.33") and settles the trip. The balances still sum to zero.
- **How to test:** a golden fixture where whole-rupee payments against paise balances end settled, with Σ = 0.

### B-07 · HIGH BUG (maths display): the kitty makes the holder look like they owe the whole pot
- **Why it happens:** folding the kitty into the holder's balance ([07 §6](07-calculation-engine.md)) is right **at settle-up**. On day 1, though, Rahul (the holder) shows "**owes ₹10,000**", and every contributor shows "gets back ₹5,000".
- **Impact:** alarming, wrong-looking numbers every day of every trip that uses a kitty, which is the headline feature.
- **Solution:** the engine returns two views:
  - **during the trip:** balances **with the kitty as its own line** ("Kitty cash with Rahul: ₹3,000");
  - **at settle-up:** the folded balances.
  - Trip home and the trace use the first; Settle up uses the second.
- **How to test:** the PRD kitty fixture checked in both views. Both must sum to zero (the first includes the kitty line).

### B-02 · CRITICAL BUG: a removed member can be given a balance again
- **Why it happens:** `member.remove` only checks the balance **at that moment**. Later, anyone can edit or delete an old expense (or void a settlement) that included the removed member.
- **Example:** Jay is square and gets removed. Someone deletes the night-1 hotel, so Jay is now **+₹1,000**. But removed members are hidden from balances and settle-up, so **the visible numbers stop adding to zero**.
- **Solution:** the server rejects any money op that would make a **removed** member's balance non-zero, with the message "This changes Jay's balance — add Jay back first". Or it automatically brings Jay back, with a notice. **Recommendation: reject.**
- **How to test:** a property test that runs random edits after removals and checks that removed members stay at zero.

### B-05 · HIGH BUG: changing the kitty holder moves money through a plain settings edit
- **Why it happens:** the holder is changed with `trip.update` (last write wins), but it moves the whole kitty balance from one person to another. It skips the append-only rules and the zero-sum check, and it isn't blocked on settled trips.
- **Solution:** add a new money op, `kitty.handover { from, to, amount_at_handover }`. It's append-only, shown in the trace as "Kitty cash handed to Neha · ₹3,000", and rejected on settled trips.
- **How to test:** a golden fixture with the holder changed mid-trip. Balances before and after the handover must reconcile.

### B-10 · MEDIUM BUG: FX edge cases
- A tiny foreign amount can convert to ₹0.00 (1 VND). **Solution:** reject with "This amount is less than ₹0.01 in INR", or require base_amount ≥ 1.
- The rate fraction can overflow `bigint` (DB-6). **Solution:** round to 12 significant digits and store as a decimal string.
- **How to test:** property tests over random rates, including very large ones (VND, IDR, IRR) and very small ones (KWD).

### B-13 · LOW BUG: itemised rounding depends on item order
Each itemised line uses `seed + ":item:" + index`, so **reordering items reshuffles paise**. **Solution:** seed with the item's own ID.

### M-2 · MISSING maths rules
- **Zero amount:** blocked on save ("Type an amount first", as in the prototype).
- **A 1-member trip or a single-participant expense:** allowed, and it has no effect on anyone else. A trip with nothing owed auto-settles only after the end date (§5.3).
- **Overpayment on settle-up:** allowed with a warning, as the PRD says.
- **A negative adjustment** (a discount for one person): not in v1. Say so.

**What's solid:** simplified settlement (greedy) is correct and deterministic, makes at most n−1 payments, and never changes anyone's balance. Per-op zero-sum checking makes a broken total impossible to save.

---

## 14. Offline / Sync Problems

Each of the brief's scenarios, checked against the design:

| # | Scenario | What happens today | Verdict |
|---|---|---|---|
| 1 | Create an expense offline | Saved to SQLite + outbox in one transaction; balances update | ✅ GOOD |
| 2 | Five expenses offline | Queued in order and sent oldest-first in batches | ✅ GOOD. If one is rejected, later ops that depend on it also fail, and the docs don't say how they're grouped (Sync-4) |
| 3 | Save, then kill the app at once | Atomic transaction: both or neither | ✅ GOOD |
| 4 | Network drops during upload | Retries with backoff; op kept | ✅ GOOD |
| 5 | Same request sent twice | `op_id` makes it a duplicate, and the original result is returned | ✅ SUPER |
| 6 | Two phones edit one expense | Merged per field | ❌ **B-04**: money fields must merge as one group (§5.1) |
| 7 | One deletes, another edits | Delete wins; the edit goes to Unresolved changes with "Restore as new expense" | ✅ GOOD |
| 8 | Sign in on a second device | Possible only once the account is saved; an anonymous user can't sign in anywhere else | ⚠️ U-1: the "I already have an account" path is missing |
| 9 | Server saves it, response is lost | The retry returns `duplicate` with the original seq | ✅ SUPER |
| 10 | Sync partly succeeds | The cursor moves forward only after each op is written; per-op results | ✅ GOOD |
| 11 | Migration while an old app is in use | Payload `v` is accepted for 2 releases | ⚠️ A-4: needs the expand/contract rule plus graceful handling of unknown values |

### B-03 · HIGH BUG: checks run before the lock, so two changes can both pass
- **Why:** 06 §6 validates in steps 1–5 and locks only when committing (step 6).
- **Example:** Phone A sends "remove Jay" (Jay's balance is ₹0, so the check passes). At the same moment, phone B sends "add ₹800 cab, Jay included". Both pass their checks separately and both commit. **Jay is removed with −₹200.**
- **Solution:** the Edge Function reads the state at `last_seq = N` and validates. The database commit then happens **only if `last_seq` is still N**. Otherwise it reloads and validates again (up to 3 tries). Alternatively, run the rule checks inside the locked transaction.
- **Test:** the simulator fires conflicting ops at the same time and checks that every invariant still holds.

### B-08 · HIGH BUG: duplicate detection can't see offline duplicates
- **Why:** the rule compares `created_at`, which is the **time the server received it**. Two offline phones sync hours apart, so they never match.
- **Solution:** compare `spent_at` (same trip-local day, ±10 minutes) plus the same amount and a different creating member.
- **Test:** a simulator case with two offline devices logging the same dinner and syncing 3 hours apart. The pull prompt must appear.

### B-09 · HIGH BUG: the same payment can be recorded twice
- **Example:** Neha pays over UPI and taps "Yes, I paid". Aditya, offline, also taps "Mark as paid". Two settlements are recorded, and balances flip.
- **Solution:** on sync, the server looks for another settlement with the same pair and amount within 24 hours, and raises the same "Already recorded?" prompt used for expenses (**Same one, remove mine** / **Keep both**).
- **Test:** a two-device simulator case.

### Sync-4 · MEDIUM: rejected ops that others depend on
If `expense.create` is rejected, a later `expense.edit` or photo for it will fail too. **Solution:** when an op is rejected, **hold and group** the ops that depend on it, and show them as one Unresolved item.

### Sync-5 · MEDIUM: snapshot consistency
`/trip-snapshot` must be read in **one REPEATABLE READ transaction** together with `last_seq`, or ops committed during the read can be missed.

**GOOD:** Realtime is treated only as a nudge, and phones catch up on foreground and network events. Phone clocks are never used for ordering.

---

## 15. Security Problems

### S-01 · CRITICAL: a browser claim gives full member power
- **Problem:** anyone holding the invite link can claim an unclaimed ghost **from the web page**. That makes them a normal claimed member, so `is_trip_member` is true, and they get:
  - read access to **every trip table** through the REST API;
  - `/download-url` for **receipts and vault documents** (tickets, ID copies);
  - the **decrypted invite token**, even after the organiser rotates it;
  - edit/delete rights on any expense (OQ-P12).

  Scripts can also make a new anonymous user for every claim, so the per-user limits don't stop them. They can claim every ghost, harvest creditors' UPI IDs (often `phone@upi`, which leaks the phone number), and post fake "Yes, I paid ₹50,000" settlements.
- **Risk:** one forwarded link exposes the whole trip, including ID documents.
- **Recommended fix:**
  - A browser claim creates a **limited membership** (`claimed_via = 'web'`). **`is_trip_member` stays false** for it. It can see only its own lines, call `/upi-link` and record **its own** payment up to the suggested amount. No vault, no `invite-create`, no REST reads, until the claim moves into the app.
  - Web settlements show as **"Pending — waiting for Aditya to confirm"** until the payee confirms.
  - Add Cloudflare Turnstile on the invite page and limit web claims per trip per hour.
  - The organiser gets a notice for every web claim, with **Release**, including releasing several at once.
  - **For the beta, the simplest safe option:** the web page is **read-only** (§22).
- **Priority:** before any invite link leaves the testing group.

### S-07 · HIGH: private data leaks through shared rows
- **Problem:**
  - `trip_ops` (the change history) is readable by every member and pulled to every phone. So `budget.set` for a **personal** budget and `attachment.register` for an **owner-only** file (e.g. "Aadhaar.pdf") reach everyone, even though the tables themselves hide those rows.
  - `trip_members.contact_hash` and `web_spot_key_hash` are readable by every member. A phone-number hash with a published salt reverses in about a second on a GPU.
- **Fix:**
  - Add `trip_ops.visible_to_member_id` (null = everyone), filtered in RLS and in `sync-pull`.
  - Move secret columns into a server-only `trip_member_secrets` table.
  - Test both with pgTAP.
- **Priority:** before building the vault or personal budgets. The contact hash disappears if contacts are dropped (§5.4).

### S-08 · MEDIUM: public Realtime channel
- **Problem:** `trip:{id}` is a public channel, and trip IDs appear in pushes and links. Anyone can listen, or send fake "pull now" nudges that make every phone pull again and use up the free allowance.
- **Fix:** use **private channels** with RLS on `realtime.messages`, where only the server can broadcast.

### S-09 · MEDIUM: public endpoints can drain the free allowance
- **Problem:** the public (🌐) functions are called directly on `supabase.co`, so each rate-limited request still costs an invocation plus a database write.
- **Fix:** check the limit before any database work. Move `invite-preview` behind Worker rate limits. Watch invocations daily.

### S-10 · MEDIUM: anonymous sign-in limits vs Indian mobile networks
- **Problem:** Supabase allows 30 anonymous sign-ins per IP per hour by default. Indian carriers put many users behind one IP (carrier-grade NAT), so a viral invite could block real people. CAPTCHA settings apply to **all** sign-ins, including the app's silent first open. Anonymous users are never cleaned up.
- **Fix:**
  - Raise the per-IP limit.
  - Put Turnstile on the **web page**.
  - Clean up anonymous users with no trips after 30 days.
  - Start with the new `sb_publishable_` / `sb_secret_` API keys, since the legacy keys are deprecated by the end of 2026.

### S-02 · MEDIUM: bots creating anonymous accounts
- **Problem:** anonymous sign-in is open, so a script could burn the 50,000 monthly-user allowance or flood the database.
- **Fix:** turn on Supabase's CAPTCHA for anonymous sign-ins (Cloudflare Turnstile, free) on the **web page**. The app uses a device attestation check later.
- **Priority:** before public launch.

### S-03 · MEDIUM: the invite preview returns too much (API-4)
Trim the preview to what the page shows.

### S-04 · MEDIUM: contact hashes can be reversed
10-digit numbers with a published salt can be brute-forced. **Fix:** drop contacts matching from v1 (§5.4).

### S-05 · LOW: lock-screen privacy
Pushes show names and amounts on the lock screen. **Fix:** a setting "Hide amounts on lock screen", using Android's private visibility and iOS's hidden previews.

### S-06 · LOW: orphaned uploads
See DB-8.

### R-01 · HIGH RISK: losing an anonymous session means losing the account
- **Problem:** an anonymous account has no password or email. If its session is lost, it can't be recovered. That can happen after a refresh-token clash from two refreshes at once, a storage wipe, or restoring the OS from a backup.
- **Impact:** the person loses their spot, not their data. History stays on the member row, but the organiser has to release the spot.
- **Fix:**
  - Refresh the token through **a single path**.
  - Show the "Save my account" prompt **after the first shared trip action**.
  - Organisers get a stronger nudge.
  - Keep the Release flow.

**GOOD:** the service role stays in Edge Functions. RLS is on every table with a CI check. Uploads use 5-minute presigned URLs. EXIF is stripped. Deep links are validated with Zod. No push performs a money action by itself.

---

## 16. Third-Party Integration Problems

| Service | Verdict | Notes |
|---|---|---|
| Supabase | **GOOD, 2 caveats** | **The free plan allows only 2 active projects**, but 12 plans **3** (dev, preview, prod). **Fix:** dev runs on the local Supabase CLI (Docker), with 2 cloud projects (preview, prod). Both cloud projects need the keep-alive. |
| Nightly backup | **HIGH BUG** | Supabase's direct database address is IPv6-only, and GitHub-hosted runners don't support IPv6. **Fix:**<br>• `pg_dump` through the **Session pooler (port 5432)**, with a `postgresql-client` whose major version matches the server.<br>• Test a **restore** monthly into a **temporary local** Supabase, then delete it. Don't restore into a dev project, because production personal data must never move down.<br>• Keep backups for **30 days**, matching the deletion promise in 09. |
| Edge Function allowance | **HIGH FUTURE CONCERN** | 08 says invocations run out at about 10k daily users. **It's more like 500–1,000 daily users:**<br>• a 6-person, 40-expense trip makes about 240 calls from pushes and nudged pulls;<br>• `notify-sender` every minute is 43k calls a month;<br>• `/health` every 5 minutes is another 8.6k.<br>**Fix:** pull `trip_ops` **directly through the REST API** (RLS already protects it, so it costs no invocation); return new ops in the `sync-push` response; send pushes from `sync-push` after commit; cron checks the notification queue in SQL and calls the function only when something is due. |
| OG preview images | **MEDIUM** | Drawing a PNG in a Worker needs much more than the free 10 ms of CPU. | Render once in an Edge Function and cache it in R2, or use a static template with text overlay. |
| EAS Update | **MEDIUM** | The free plan stops updates at **1,000 monthly users**, with no overage. | Probably the first paid step ($19/month), or ship through the stores. |
| GitHub Actions | **LOW** | Nightly 100k-case property runs + a 20k-run sync simulation + Maestro would pass the 2,000 free minutes. | Run heavy suites weekly, and light ones nightly. |
| Cloudflare R2 / Workers | **GOOD** | May ask for a card when R2 is first turned on. |
| Frankfurter + fallback | **GOOD** | Called only by the server. Unsupported currencies need a manual rate (M-6). |
| Geoapify / OpenFreeMap | **OK (R2)** | Indian place quality is unknown. Test before relying on it. |
| FCM + notify-kit | **NEEDS IMPROVEMENT** | Right tools. FCM HTTP v1 from Deno needs a service-account signed token (JWT). Build a spike early. notify-kit has a small maintainer team, so it sits behind a wrapper. **Delay custom designs to R1b.** |
| PostHog | **GOOD** | 1M events is plenty. Choose a region (EU or US; there's no India region) and note it in the privacy notice. |
| Sentry | **OK** | The free plan has **1 seat**, and there are 2 founders. Use PostHog error tracking as the second view, or share the seat. |
| Resend | **GOOD** | Set up SPF, DKIM and DMARC before any email is sent. |
| LLM vision (R2) | **OK** | Paid tier only. Check the zero-retention contract before F4 ships. |
| **Delay until later** | — | Contacts matching, phone OTP, Branch or other deferred deep-link services, Pro subscriptions, iOS Content Extension. |

---

## 17. Performance Concerns

| # | Status | Concern | Note |
|---|---|---|---|
| Perf-1 | **OK** | Balance recompute for 2,000 expenses in JavaScript BigInt | Well under 50 ms if memoised per revision. Benchmark on a ₹15k Android phone in week 2. |
| Perf-2 | **HIGH (B-11)** | `expo-sqlite` **can't bind or return JS `BigInt`**, and Drizzle's SQLite `integer` returns `number`. 03 §10's "INTEGER read into JS as bigint" is **false**. | Choose: store money as INTEGER and convert at the repository boundary (assert ≤ 2⁵³; our maximum is about 10¹¹, so it's safe), **or** store it as TEXT. **Recommendation:** INTEGER + a guarded conversion in one data-layer module, plus a type-branded `Minor`, and update the lint rule. Proven in the day-1 spike. |
| Perf-3 | **OK** | Drizzle live queries re-render big lists | Use FlashList, and select only the columns a screen needs. |
| Perf-4 | **OK** | Place search | Already debounced (300 ms), with at least 3 characters and caching. |
| Perf-5 | **FUTURE CONCERN** | The `seq` row lock serialises all writes to one trip | Fine for 50 members. Revisit only for huge wedding trips (100+). |

---

## 18. Scalability Concerns

| Users | What breaks first | What we do then |
|---|---|---|
| 10–100 (beta) | Nothing. Watch Supabase pausing (keep-alive) | — |
| ~1,000 | **EAS Update 1,000-user cap**; Realtime peaks (200); Sentry's 5K errors a month | EAS Starter $19/month or store-only updates; connect Realtime only on trip screens |
| ~500–1,000 **daily** | **Edge Function invocations** (unless the §16 fix is done); the database grows fast because each expense is stored about 3 times (≈5 KB, so ~100k expenses ≈ 500 MB) | **Supabase Pro, $25/month**. Do it at public launch anyway, for backups and no pausing |
| 10,000 | Database size and egress on Pro limits; PostHog's free flag requests (~6k daily users) | Trim `trip_ops.payload` after apply; cache flags |
| 100,000 | Edge Function invocations; R2 over 10 GB (vault); OTP costs if phone login is on | Pro limits cover the functions. R2 at $0.015/GB is cheap. |
| 1,000,000 | The per-trip lock is fine; the global `trip_ops` table is large | Partition `trip_ops` by month, and add read replicas. **FUTURE, NOT NEEDED NOW.** |

**"This is fine now, but we'll need to change it when…"**
- …the database passes 400 MB: move to Pro.
- …trips pass 100 members: revisit the lock.
- …we add a web app: move from the Worker plus Edge Functions to a proper web client of the same API.

---

## 19. Testing Gaps

| Gap | Add |
|---|---|
| Direct-mode totals (B-01) | Property test: row and column sums are exact; direct balances equal simplified balances |
| Dust (B-06) | Golden fixture with whole-rupee payments against paise balances |
| Removed-member invariant (B-02) | Property test with random edits after removals |
| Races under concurrency (B-03) | Simulator firing conflicting ops at the same time |
| Offline duplicates (B-08, B-09) | Two-device cases for expenses and settlements |
| Old app against new server (A-4) | A contract test on each release: the previous 2 app versions' payloads are accepted, and unknown enum values don't crash |
| Time zones | Trips crossing midnight or IST ↔ UTC; the "Day 2 of 4" boundary; `joined_from` |
| RLS | pgTAP: a non-member sees 0 rows in every table; `member`-scope budgets and `owner`-visibility files are private |
| Push delivery on Indian Android phones | A manual matrix: Xiaomi, Oppo, Vivo, Samsung, with the app killed |
| Backup restore | Monthly automated restore into a scratch project |
| Accessibility | Hold-to-tear with TalkBack and Switch Access |

**GOOD:** 100% engine coverage target, fast-check property tests, a deterministic sync simulator, kill tests, and the 200-receipt benchmark.

---

## 20. Missing Requirements

| ID | Missing requirement | Why it matters | Recommended decision |
|---|---|---|---|
| M-1 | All expenses list, Trip settings, "I already have an account", Recorded payments list | The core loop has dead ends | Add all four screens to R1 (P-2, P-3, U-1, U-3) |
| M-2 | Zero, refund and negative amounts | Engineers will guess | Block zero; add a Refund type; no negative adjustments in v1 |
| M-3 | UPI limits | Big payments fail | Split links over ₹1 lakh (P-5) |
| M-4 | Scheduled lifecycle job | PRD MUST pushes never fire | API-1 |
| M-5 | Expense dated outside the trip dates | Budget and "committed" logic | Allowed, with a warning ("After the trip ended?"). Before the start date it defaults to "Booked before trip" |
| M-6 | Currency the FX provider doesn't cover | The expense can't be saved offline | Require a manual rate ("Enter the rate you got") |
| M-7 | Editing an old expense that includes a removed member | The split editor must show them | Show them greyed out as "Removed". Changing their share is blocked by B-02 |
| M-8 | Who can do: kitty on/off, void a contribution, edit trip details, delete vault documents, turn "hide amounts" back off | Unclear permissions | One **permission matrix** in 09. All screen and feature docs link to it instead of repeating it |
| M-9 | The last organiser leaves | Nobody to manage the trip | The last organiser can't leave without handing over the role |
| M-10 | Trip with no end date | Never auto-settles | Settles on **Close trip** only |
| M-11 | Sign-out with unsynced data | Data loss | Block sign-out while the outbox isn't empty ("3 changes not synced yet") |

---

## 21. Contradictions Between Documents

| ID | Says X | Says Y | Resolve by |
|---|---|---|---|
| C-01 | PRD §9.3: hash-only rounding | D-005: largest remainder, then hash | PRD v1.1 |
| C-02 | PRD F7: group may override the kitty refund | D-010: drop the override | PRD v1.1 (after OQ-E1) |
| C-03 | PRD F4: itemisation is Pro | D-017: manual itemised is free | PRD v1.1 |
| C-04 | PRD §13: claim with phone OTP | D-007: no OTP; anonymous account | PRD v1.1 |
| C-05 | PRD F6 (R1): generate the recap on settle | 03/06: no recap until R3 | PRD v1.1 |
| C-06 | 12: three Supabase projects | Free plan: 2 projects | Dev on local Docker |
| C-07 | 06 §5: `settlement.void` allowed on settled trips | trips.md: `settlement.*` rejected | Keep **one allow-list in 06**; the others link to it |
| C-08 | OQ-P12: anyone can mark any payment paid, and rename ghosts | settle-up.md: payer or payee only; members.md: organiser renames | Permission matrix (M-8) |
| C-09 | 03: `notify_threshold_major` | notifications and balances docs: `notify_threshold_minor` | Rename in the screen and feature docs |
| C-10 | 04 §1: a total mismatch is not a failure | receipt-scan.md, 08: `total_mismatch` is a failure reason | Remove it from those docs |
| C-11 | 03: budget alerts re-arm when the budget is raised | budget.md §6.9: they don't re-arm | Follow 03 |
| C-12 | OQ-P21: duplicate offline ghost names get "Rahul 2" | members.md: rejected as `invalid_payload` | Follow OQ-P21 |
| C-13 | trips.md: base currency can change before the first expense | multi-currency.md: fixed at creation | Allow before the first expense; add it to `trip.update` |
| C-14 | trips.md: a public recap keeps the old numbers after a reopen | recap.md: it shows the new numbers | Keep the old snapshot and label it "Recap from 15 Oct" |
| C-15 | UI reference: `toli.app/t/goa-wknd` | Docs: `toli.in/t/<token>` | OQ-P5 (domain) |
| C-16 | Code alphabet has no O or L | Code prefix "GOA" contains O (B-14) | The prefix is cosmetic and **not typed**: the app accepts the 6-character code alone, e.g. `7K2PXQ` |
| C-17 | D-016 and 12 disagree on the tester profile name (`preview` vs `beta`) in places | | Use `beta` everywhere |
| C-18 | Prototype: duplicate rule "same day, different payer"; kitty top-up formula | PRD / 07: 10 minutes, different creator; 07 §6 formula | Follow PRD/07. The prototype is a sketch |
| C-19 | Film: settle-up is a tap | Prototype: hold-to-tear | D-012 (the prototype wins) |

---

## 22. Over-Engineering

| Item | Verdict | Keep the simple version |
|---|---|---|
| Contacts matching (hashes, discovery, consents, endpoint) | **OVER-ENGINEERED** for v1 | Add names from contacts only |
| Web payment + spot-key handover | **OVER-ENGINEERED for the beta** | The beta web page is read-only ("see what you owe"). Paying happens in the app. Add web payments in R1b |
| Three notification design levels + iOS Content Extension | **OVER-ENGINEERED for R1a** | The in-app stub banner (exact design) + plain system pushes. Custom Android styles in R1b, iOS extension later |
| Direct settle mode | Nice, not needed first | R1b |
| Manual itemised split, adjustment split | Nice, not needed first | R1b (the engine supports them already; they're UI work) |
| Pro subscriptions table, pro webhook | Not needed until R2 | Keep the design, build it later |
| Three cloud environments | Not possible on free, not needed | Local dev + 2 cloud projects |
| Organiser takeover after 30 days | Rare case | Manual support until it happens |

**Not over-engineered (keep):** the outbox, revisions, RLS, the shared engine, the property tests. These are the product's safety.

---

## 23. Future Improvements (FUTURE / NOT NEEDED NOW)

| Idea | Why it's valuable later |
|---|---|
| `trip_ops` as a full event log | Rebuild any trip at any point in time; very strong dispute support. Already half-built |
| Payee confirmation ("Received ✓") | Settlement disputes drop further |
| Optimal settlement (fewer payments than greedy) | Only matters for 20+ person trips |
| Feature flags / remote config | PostHog already gives these for free; use them for the price test |
| Data warehouse | When PostHog questions outgrow it |
| Partitioning `trip_ops` | At millions of ops |
| Multi-region | Only if Toli leaves India |
| A licensed payment partner for verified settlement | The PRD's post-v1 idea; serious revenue potential |

---

## 24. Recommended Changes Before Coding

### Must fix before development
| # | Fix | Why it matters | Priority |
|---|---|---|---|
| 1 | Direct-mode exact pairing (B-01) | Wrong money | Critical |
| 2 | Removed-member rule (B-02) | Hidden balances | Critical |
| 3 | Missing screens: All expenses, Trip settings, "I already have an account", Recorded payments (M-1) | Dead ends | Critical |
| 4 | Validate under the lock / expected `last_seq` (B-03) | Rules can be bypassed | High |
| 5 | Money fields merge as one group (B-04) | Invalid splits | High |
| 6 | `kitty.handover` op (B-05) | Money moved outside the rules | High |
| 7 | Dust rule + exact "Mark as paid" (B-06) | Trips never settle | High |
| 8 | Kitty "during trip" view (B-07) | Headline feature looks wrong | High |
| 9 | Duplicates by `spent_at`; settlement duplicates (B-08, B-09) | Double counting | High |
| 10 | Browser-session limited membership, or a read-only web page in the beta (S-01) | Whole-trip data exposure | **Critical** |
| 10a | Private rows in `trip_ops` + secret member columns (S-07) | Personal data leak | High |
| 10b | Transaction mechanism `apply_ops` RPC (A-7) | Sync can't be built without it | High |
| 10c | Lenient parsing on the phone + a minimum client version (A-8) | Every schema change breaks old apps | High |
| 10d | Money in SQLite: INTEGER + guarded conversion (B-11) | Runtime crashes | High |
| 10e | Pulls via PostgREST; pushes sent from `sync-push` (§16) | Free allowance at ~500 users | High |
| 11 | Two Supabase projects + local dev; pooler backups (C-06, §16) | The plan can't run on free | High |
| 12 | Lifecycle job (API-1), auto-settle timing (§5.3) | MUST pushes; trips locking | High |
| 13 | Decide R1a vs R1b scope (§5.2) | Months of work | High (decision) |
| 14 | PRD v1.1 (C-01…C-05) | Two sources of truth | Medium |
| 15 | Permission matrix (M-8) | Guesswork | Medium |
| 16 | Design tokens: exact values, icons, danger colour (D-1…D-5) | Guesswork | Medium |

### Suggested R1a (the real beta)
- **In:** trips, ghosts, join by link or code, claim; all expenses; Equal / Selected / Exact / Percent / Shares; multiple payers; kitty (contributions, spends, holder); balances + trace; **simplified** settle-up; UPI links; mark as paid; recorded payments; offline sync + Unresolved changes; the in-app stub banner + plain pushes; the read-only web invite page; Trip settings; English only.
- **R1b:** direct mode; itemised and adjustment splits; web payment + spot key; custom notification styles; reminders push (WhatsApp share stays in R1a); kitty top-up maths; digests; Hindi.

### Can fix later
Performance tuning, `trip_ops` compaction (DB-2), lock-screen privacy (S-05), the iOS extension, analytics dashboards, the 360 px compact layout (before the Play launch), the splash minimum (U-13).

---

## 25. Questions That Need Product Decisions

The 22 in [open-questions.md](open-questions.md) are still unanswered. This review adds new ones in §28 (Q-A to Q-J).

---

## 26. Final Readiness Assessment

**Can we start coding?**

## ➜ YES, AFTER FIXING items 1–13 (including 10a–10e) in §24

- All of them are **document and design changes**: about 2–3 days of doc work, with no architecture rewrite.
- The one real decision is **R1a vs R1b scope** (item 13), which needs Aditya and Yash.
- Two small things can start **today** without waiting, because they don't depend on any open item:
  - **Monorepo setup + `@toli/engine`**, test-first, including the B-01, B-06 and B-07 fixes.
  - **Technical spikes:** Deno bundling of workspace packages, FCM HTTP v1 from Deno, and `expo-sqlite` with bigint.

---

## 27. Pre-Development Checklist

### Product
- [x] Product purpose is clear
- [x] Target user is clear
- [x] Core loop is clear
- [ ] MVP is defined (**R1a/R1b split pending**, §24)
- [x] Non-MVP is defined

### UX
- [x] All screens reviewed
- [x] All user flows reviewed
- [x] Empty states reviewed
- [x] Loading states reviewed
- [ ] Error states reviewed (**API-5: web page and stubs-send failure copy**)
- [x] Offline states reviewed
- [ ] Recovery flows reviewed (**U-1 sign-in, U-3 void**)

### Engineering
- [x] Architecture reviewed
- [x] Database reviewed (**DB-1…DB-8 to apply**)
- [x] APIs reviewed
- [ ] Design system ready (**D-1…D-5**)
- [x] Code structure reviewed

### Money
- [x] No floating-point money
- [x] Currency rules defined (+ M-6 unsupported currencies)
- [ ] Exchange-rate rules complete (**B-10 / DB-6**)
- [x] Rounding defined
- [ ] Settlement logic correct (**B-01, B-06**)
- [x] Mathematical invariants defined (+ removed-member invariant)
- [x] Calculation tests defined (+ §19 additions)

### Sync
- [x] Offline creation defined
- [x] Outbox defined
- [x] Idempotency defined
- [x] Retry defined
- [ ] Conflict resolution complete (**B-04 money group**)
- [ ] Multi-device behaviour complete (**U-1, B-08, B-09**)
- [ ] Failure recovery complete (**B-03, Sync-4**)

### Security
- [x] RLS reviewed (+ **S-07** private rows in `trip_ops`, S-08 private Realtime channels)
- [ ] Authorization complete (**S-01, M-8 matrix**)
- [x] Secrets reviewed
- [x] Storage reviewed (+ DB-8 cleanup)
- [x] Invite links reviewed (+ B-14 / C-16)
- [x] PII reviewed (contacts dropped, §5.4)

### Infrastructure
- [ ] Environments defined (**C-06: 2 projects + local**)
- [x] CI/CD defined
- [ ] Backups defined (**pooler + restore test**)
- [x] Monitoring defined
- [x] Cost limits understood

### Testing
- [x] Unit testing defined
- [x] Integration testing defined
- [x] E2E testing defined
- [x] Offline testing defined
- [x] Financial testing defined (+ §19)
- [x] Sync testing defined (+ §19)

---

## 28. My Open Questions and Recommendations

### 28.1 My open questions (need an answer from you)

| # | Question | Why I'm asking | My suggestion |
|---|---|---|---|
| **Q-A** | Do you accept splitting R1 into **R1a (beta)** and **R1b**? | It's the biggest schedule decision; it changes PRD MUSTs | **Yes**, as listed in §24 |
| **Q-B** | Direct mode: keep it, but pair payers exactly rather than proportionally (B-01)? | Proportional pairing can't be exact | **Yes**. Direct mode moves to R1b anyway |
| **Q-C** | Paise leftovers: write off anything under ₹1 as a visible "rounding adjustment" when closing a trip? | Otherwise trips never settle | **Yes, under ₹1** |
| **Q-D** | Kitty: during the trip, show "Kitty cash with Rahul" as its own line instead of folding it into his balance? | Stops Rahul "owing ₹10,000" on day 1 | **Yes** |
| **Q-E** | When a trip is settled: automatically after the end date + 24 h, or only when someone taps **Close trip**? | Stops trips locking mid-trip | **Automatic after the end date + 24 h**, or Close trip earlier |
| **Q-F** | Can people who only use the web page (no app) record a payment? | It's a security trade-off (S-01) | **Not in the beta.** Later, only their own payment, capped at what they owe |
| **Q-G** | Drop contacts matching from v1? | Weak privacy, and it needs phone login | **Yes, drop it** |
| **Q-H** | Add a **Refund** expense type? | Hotels and bookings do refund | **Yes**, R1b |
| **Q-I** | Split UPI payments over ₹1 lakh into several links? | UPI limits | **Yes** |
| **Q-J** | Who updates the PRD to v1.1 (Aditya is the decision owner)? | Two sources of truth | Aditya approves, I draft |

### 28.2 My recommendations, in order

1. **Answer Q-A first (scope).** Everything else is small by comparison.
2. **Let me update the docs** with the §24 must-fix list (about 2–3 days). This includes the four missing screens and the permission matrix.
3. **Start the engine now, test-first.** `@toli/engine` doesn't depend on any open question. Build it with the B-01, B-06, B-07 and B-13 fixes and the §19 tests.
4. **Run three one-day spikes in parallel:**
   - Edge Functions importing workspace packages;
   - FCM HTTP v1 from Deno;
   - `expo-sqlite` + Drizzle with bigint money;
   - the `apply_ops` Postgres function doing lock → `last_seq` check → insert (A-7).

   Each one is a technical unknown that could change a design detail.
8. **Make the beta web page read-only.** It's the fastest way to remove the biggest security risk (S-01). Web payments come back in R1b with the limited-membership design.
5. **Set up environments correctly from day one:** local Supabase for dev, two cloud projects, pooler-based backups with a tested restore, and a keep-alive on both.
6. **Keep the beta honest and small:** 3–5 real friend groups on the R1a APK, with the PRD's rule "20 real trips, zero balance errors" as the gate to R1b.
7. **Protect the strong parts (§3).** Don't let schedule pressure move money maths into the UI, skip the outbox, or relax RLS. Those are what make Toli trustworthy.
