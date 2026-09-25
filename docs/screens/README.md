# Screens · Index

| | |
|---|---|
| **Status** | Draft v2 (review fixes applied) |
| **Last updated** | 2026-09-25 |
| **Visual source of truth** | `ui-refrence/Toli App.dc.html` (clickable prototype). Secondary: `Tear to Split.dc.html`, `Toli Welcome Variants.dc.html`, launch film (`toli-film.jsx`). The prototype wins on conflicts ([D-012](../decisions/D-012-hold-to-tear.md)). |
| **Related** | [13 Design system](../13-design-system.md) · [03 Database](../03-database-schema.md) · [04 API](../04-api-schema.md) · [06 Syncing](../06-syncing.md) · [07 Engine](../07-calculation-engine.md) · [Decisions](../decisions/README.md) |

One document per screen. Each follows the same structure: header table → Purpose · User goal · Entry / Exit points · UI structure · States · Interactions · Data · API / Database · Edge cases · Analytics · Accessibility · Open questions.

**Source key:** **UI ref** = drawn in the prototype files · **film** = only in the launch film · **assumption** = not drawn anywhere; designed from the PRD and canonical docs.

| Screen | Release | Source | One-line purpose | Status |
|---|---|---|---|---|
| [Splash](splash.md) | System | UI ref | Brand moment on cold start while SQLite and the session load; routes to Welcome or Trips. | Draft |
| [Skeleton loading](skeleton-loading.md) | System | UI ref | Placeholder in Trip home's shape while a trip's first snapshot downloads, with the Syncing pill. | Draft |
| [Empty trip](empty-trip.md) | System | UI ref | A trip with no expenses: blank ₹0 ticket, three tips, arrow to **+**. | Draft |
| [Welcome](welcome.md) | R1a | UI ref | First-run ticket screen: "One trip. One tab. Zero awkward." → Get started / I have an invite link. | Draft |
| [Create trip](create-trip.md) | R1a | UI ref | Name-only trip creation with template, dates, currency and ghost members; works offline. | Draft |
| [Trips list](trips-list.md) | R1a | UI ref | "Your trips": active ticket with your balance, planning and settled trips. | Draft |
| [Trip home](trip-home.md) | R1a | UI ref | Your balance, kitty/budget tiles, everyone's balance, recent expenses (→ expense detail), tab bar and **+**. | Draft |
| [Add expense](add-expense.md) | R1a | UI ref | Amount-first keypad (5-second logging), repeat last, and the "Already logged?" duplicate sheet. | Draft |
| [Split editor](split-editor.md) | R1a (Adjust, Itemised R1b) | UI ref + film | Equal / Exact / Percent / Shares / Adjust / Itemised (by hand, free; **Scan bill · PRO**), multiple payers, paid from kitty. | Draft |
| [Expense detail](expense-detail.md) | R1a | assumption | One expense: payers, shares, receipts, links, "who changed what"; Edit / Delete / Not me. | Draft |
| [Balance trace](balance-trace.md) | R1a | UI ref | Every line that adds up to a member's balance. | Draft |
| [Kitty](kitty.md) | R1a | UI ref | The common pot: remaining ring, who put in (and refunds), spends, low warning and top-up. | Draft |
| [Settle up](settle-up.md) | R1a | UI ref | Fewest payments, Simplified/Direct, Remind / Mark as paid / Their view, hold to tear, "Everyone's square." | Draft |
| [Tear overlay](tear-overlay.md) | R1a | UI ref | The tear-stubs animation component shown after saving an expense or settling up. | Draft |
| [Members](members.md) | R1a | film | People on the trip: add, rename, joined-from (late joiners), remove rules, release a claim. | Draft |
| [Join in app](join-in-app.md) | R1a | assumption ([D-016](../decisions/D-016-testing-distribution.md)) | Paste link or type the 6-character code (7K2PXQ) → "Which one are you?" → claim. | Draft v2 |
| [Invite web](invite-web.md) | R1a read-only · R1b pay | UI ref | Public page: pick your name, see what you owe, **Get the Toli app** (R1a). Paying from the web in R1b ([D-024](../decisions/D-024-web-page-read-only-beta.md)). | Draft v2 |
| [Notifications](notifications.md) | R1 (budget alerts R2) | UI ref (Tear to Split) + film + assumption | Ticket-stub push and in-app notifications with Pay via UPI / Mark as paid actions. | Draft |
| [Unresolved changes](unresolved-changes.md) | R1a | assumption ([06](../06-syncing.md)) | Every rejected or conflicting change, with one way forward each. Nothing silently lost. | Draft |
| [Settings & profile](settings-profile.md) | R1a | assumption | Name, UPI ID, Save my account, notifications, language, export, delete account. | Draft |
| [All expenses](all-expenses.md) | R1a | assumption (review M-1) | Every expense in the trip: search, filter by person/category/date, open detail. | Draft |
| [Trip settings](trip-settings.md) | R1a | assumption (review M-1) | Rename, dates, currency, time zone, kitty, invite, Close / reopen, leave, delete. | Draft |
| [Sign in](sign-in.md) | R1a | assumption (review U-1) | "I already have an account": Google / Apple / email → your trips come back. | Draft |
| [Recorded payments](recorded-payments.md) | R1a | assumption (review U-3) | Every recorded payment (incl. rounding, R1b pending web payments) with Void / Confirm. | Draft |
| [Receipt scan](receipt-scan.md) | R2 | UI ref | Pro: photo → editable itemised draft; tax and service follow each person's subtotal. | Draft |
| [Pro sheet](pro-sheet.md) | R2 | assumption | Per-trip Pro pass offer (₹149 placeholder): one pass covers everyone; Play Billing; restore. | Draft |
| [Budget](budget.md) | R2 | UI ref | Spend vs budget burn-down, committed vs in-trip, by category. | Draft |
| [Plan](plan.md) | R2 | UI ref | Day-by-day itinerary with map pins and estimate vs actual. | Draft |
| [Vault](vault.md) | R3 | UI ref | Bookings with PNRs and documents, all available offline. | Draft |
| [Feed](feed.md) | R3 | UI ref | Reverse-chronological trip timeline of spends, joins, notes and photos. | Draft |
| [Recap](recap.md) | R3 | UI ref | End-of-trip shareable recap card with the option to hide per-person amounts (R1 settled state is just "Everyone's square."). | Draft |

**31 screens.** Screens marked *assumption* follow [13 Design system](../13-design-system.md) and are listed in [01 §9 A7](../01-overview.md).

**R1a/R1b tab bar:** Trip · (+) · Members. The full bar (Trip · Plan · + · Vault · Feed) arrives in R3 ([13 §6](../13-design-system.md)). Releases follow [D-018](../decisions/D-018-r1a-r1b-scope.md).
