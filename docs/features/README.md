> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - Releases now follow **R1a / R1b / R2 / R3** ([D-018](../decisions/D-018-r1a-r1b-scope.md), [01 §6](../01-overview.md)). R1a: trips, members, invites (web **read-only**), auth, expenses, splitting (Equal/Selected/Exact/Percent/Shares, multi-payer), balances, settle-up (Simplified, UPI, exact Mark as paid, Close trip), kitty (with hand-over), offline sync, notifications (in-app stub + plain pushes). R1b: direct mode, itemised/adjustment, refunds, web payments, custom notification styles, top-up maths, digests, Hindi.
> - New screens used by features: [all-expenses](../screens/all-expenses.md), [trip-settings](../screens/trip-settings.md), [sign-in](../screens/sign-in.md), [recorded-payments](../screens/recorded-payments.md).
> - Who can do what: the [permission matrix](../09-security.md#permission-matrix) only.

# Features

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Source** | [PRD](../superpowers/specs/2026-09-23-trip-money-manager-prd.md) · [Screens](../screens/README.md) · [Decisions](../decisions/README.md) |

One document per feature. Each one explains **why** the feature exists, **what** it must do (traceable to the PRD), and **how** it touches the data model ([03](../03-database-schema.md)), the API ([04](../04-api-schema.md)), sync ([06](../06-syncing.md)) and the money engine ([07](../07-calculation-engine.md)).

If a feature doc and a canonical doc (02–07, 13, decisions) disagree, the canonical doc wins. Log the gap in the feature doc's **Open questions**.

**Money is never Pro.** Adding expenses, every split mode, the kitty, balances, settle-up and UPI links are free forever (PRD §5, §15).

## Index

| Feature | Release | PRD refs | Free or Pro | One-line purpose | Status |
|---|---|---|---|---|---|
| [Trips](trips.md) | R1 | F1, §8 | Free | Create a trip by name alone and move it through planning → active → settling → settled → archived. | Draft |
| [Members and ghosts](members-and-ghosts.md) | R1 | F2, §8 | Free | Add everyone by name; ghosts hold balances until claimed; late joiners, rename, remove, release. | Draft |
| [Invites and joining](invites-and-joining.md) | R1 | F2, §13 | Free | One rotating link + code; see what you owe before installing; claim your spot. | Draft |
| [Auth and identity](auth-and-identity.md) | R1 | §13, §16, §18 | Free | Silent anonymous account; optional "Save my account" with Google / Apple / email; phone OTP later. | Draft |
| [Expenses](expenses.md) | R1 | F3, F4 (photos), F9 | Free | Log a spend in under five seconds, with defaults, repeat-last, duplicate checks and revisions. | Draft |
| [Splitting](splitting.md) | R1 | §9.1–9.3, F3 | Free (itemised by hand is free; receipt scanning is Pro, [D-017](../decisions/D-017-itemised-free-scan-pro.md)) | All seven split modes, multiple payers, paid from kitty, exact to the paisa. | Draft |
| [Balances and trace](balances-and-trace.md) | R1 | F5, §9.4 | Free | Live "you owe / you're owed" and a line-by-line trace behind every number. | Draft |
| [Settle up](settle-up.md) | R1 | F6, §9.5–9.6, §14 | Free | Fewest payments, UPI deep links, confirm-by-payer, reminders, hold to tear, settled. | Draft |
| [Kitty](kitty.md) | R1 | F7, §14 | Free | A common cash pot, tracked only; leftovers returned in proportion to contributions. | Draft |
| [Offline and sync](offline-and-sync.md) | R1 | §12, §11.7 | Free | Works with no signal; clear sync statuses; nothing silently lost (Unresolved changes). | Draft |
| [Notifications](notifications.md) | R1 | F16, F5, F6 | Free | Few, useful pushes in the ticket-stub design; four channels; digests. | Draft |
| [Receipt scan](receipt-scan.md) | R2 | F4, §9.1 | Pro (photos and manual itemising free) | Photograph a bill, get an editable itemised draft, tax follows subtotals. | Draft |
| [Budget](budget.md) | R2 | F8, F9 | Free (advanced analytics Pro) | Total, category and personal budgets with burn-down and 75% / 100% alerts. | Draft |
| [Multi-currency](multi-currency.md) | R2 | F10 | Free | Log in any currency; rate frozen per expense; settle in the base currency. | Draft |
| [Itinerary and places](itinerary-and-places.md) | R2 | F11, F12 | Free | Day-by-day plan with estimated costs linked to real expenses, and a trip map. | Draft |
| [Vault](vault.md) | R3 | F13 | Free (1 GB/trip; unlimited is Pro) | Bookings, PNRs and documents, available offline. | Draft |
| [Feed and recap](feed-and-recap.md) | R3 | F14 | Free (themes / unbranded Pro) | The trip timeline, and a shareable recap card when the trip settles. | Draft |
| [Export](export.md) | R2 | F15 | Pro | CSV and PDF export of a trip; Splitwise import. | Draft |
| [Pro pass](pro-pass.md) | R2 | §15 | Pro | ₹149 (placeholder, OQ-P7) per-trip pass that unlocks convenience features for every member ([Pro sheet](../screens/pro-sheet.md)). | Draft |
| [Account and privacy](account-and-privacy.md) | R1 | §18 | Free | DPDP rights: privacy notice, export, deletion, UPI visibility, contact hashing. | Draft |

## Section template

Every feature doc uses the same sections, in this order:

Header table (Status · Last updated · Release · PRD refs · Related) → Purpose · User problem · Business goal · User flow · Requirements · Business rules · Data model · API requirements · UI requirements · States · Edge cases · Permissions · Offline behaviour · Sync behaviour · Analytics · Error handling · Testing · Future considerations · Open questions.

**Roles used in Permissions tables:** *organiser* (the trip's creator, `role = organiser`), *member* (a claimed member), *ghost* (a name with no account; others act for them), *web viewer* (anyone holding the invite link, no account).
