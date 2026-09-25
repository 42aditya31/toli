# Feature · Export and Splitwise import (F15)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2. Trip export (`/trip-export`) is **Pro**. Splitwise import is a **SHOULD** in R2 (OQ-P6, [01](../01-overview.md#open-questions)). The free account export (DPDP) is separate ([account-and-privacy](account-and-privacy.md)) |
| **PRD refs** | F15, §15 (CSV and PDF export are Pro), §18 (right to access), §22.6 (Splitwise import SHOULD or MUST?) |
| **Related** | Screens: [trip-home](../screens/trip-home.md) (trip menu) · [settle-up](../screens/settle-up.md) (after settling) · [settings-profile](../screens/settings-profile.md) · Docs: [07 §7–9, §12](../07-calculation-engine.md) · [03 §5, §9](../03-database-schema.md) · [04 §8, §8a](../04-api-schema.md) · [06 §4](../06-syncing.md) · [01 OQ-P6](../01-overview.md#open-questions) · Screens: [pro-sheet](../screens/pro-sheet.md) · Features: [pro-pass](pro-pass.md) · [account-and-privacy](account-and-privacy.md) |

---

## 1. Purpose

- **Export:** give the Organiser a clean CSV and a readable PDF of a trip: every expense, who paid, who shared, every settlement, the final balance sheet, and a plain-language "who pays whom" summary.
- **Import:** let a group bring an existing Splitwise group into Toli, so migration costs nothing.

## 2. User problem

- Office offsites and weddings need a record to send to someone else (the finance person, the parents).
- Some people want the data in Excel to double-check it.
- The main thing keeping people on Splitwise, which they publicly dislike, is that their history lives there (PRD F15).

## 3. Business goal

- **Export** is an Organiser convenience and part of the **Pro** pass (PRD §15).
- **Splitwise import** is a high-leverage, cheap switching-cost remover (PRD F15). It supports acquisition from the wedge (PRD §1).
- Neither undermines "money is free": viewing every expense, balance and settlement in the app stays free. The legal right to a copy of your own data is always free through **account export** ([account-and-privacy](account-and-privacy.md)).

---

## 4. User flow

**Export a trip (Pro)**
1. From the trip menu on Trip home (or **Download summary** on Settle up after "Everyone's square."), tap **Export**.
2. If the trip isn't Pro: the [Pro sheet](../screens/pro-sheet.md) (`pro_paywall_viewed`, feature = export).
3. Choose **PDF summary** or **CSV (spreadsheet)**.
4. The phone first drains its outbox, then calls `POST /trip-export` ([04 §8a](../04-api-schema.md)). The server builds the file, records it in `data_exports` (`kind = trip_pdf` or `trip_csv`) and returns a download link (valid 24 h). The phone downloads it and opens the share sheet (WhatsApp, email, Files, Drive).
5. If some changes still haven't synced, a note says: "2 changes on this phone aren't in this file yet."

**Import from Splitwise (SHOULD)**
1. From **New trip → Import from Splitwise** (or Settings), the app shows how to export a group from Splitwise ("Export as spreadsheet").
2. The user picks the CSV file.
3. The app parses it on the phone and shows a preview: members found, number of expenses and payments, date range, currency, and the resulting balances.
4. The user maps each Splitwise name to a Toli member (default: create ghosts with those names; map one to "You").
5. **Import** creates the trip (or fills an empty one) with `expense.create` and `settlement.create` ops, queued like normal changes.
6. A final check shows: "Balances match Splitwise: Rahul −₹1,000 …" (or the rows that couldn't be matched).

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| EX-01 | Export a trip to **CSV** and **PDF**: all expenses with payers, participants and shares; settlements; kitty contributions; a final balance sheet. | MUST | F15 |
| EX-02 | The PDF includes a **plain-language settlement summary** ("Neha pays Aditya ₹1,200"), and explains that Toli never moves money. | MUST | F15 |
| EX-03 | Export is a **Pro** feature (per trip). | MUST | §15 |
| EX-04 | Export is built on the server (`/trip-export`) from synced data, so it needs internet. Offline, the Export button shows "Needs internet". | MUST | [04 §8a](../04-api-schema.md) |
| EX-05 | Numbers in the export match the app exactly (same engine, same rounding). | MUST | §5.7 |
| EX-06 | Account-level data export (DPDP) is separate, always free, and never paywalled. | MUST | §18 |
| IM-01 | Import a **Splitwise group export** into a Toli trip. | SHOULD | F15 |
| IM-02 | After import, each member's net balance equals the Splitwise balance, to the minor unit, or the mismatching rows are listed. | SHOULD | F15 |
| IM-03 | Import never touches Splitwise itself (file only; no Splitwise login or API). | MUST | §18 (proposal) |

---

## 6. Business rules

**Export**
1. **Only current revisions** of non-deleted expenses, and non-voided settlements and contributions, are in the main tables. The PDF has an "Edits and deletions" appendix listing deleted expenses (the server has every revision); a full revision-by-revision export is future (§19).
2. **Money in CSV:** one column for the currency code and one for the amount as a plain decimal string built from the integer minor units and the currency exponent (e.g. `1200.00`, `350000` for IDR). **Never** a float, and no grouping separators, so spreadsheets parse it. Both expense-currency and base-currency amounts are included, with the frozen rate exactly as stored (`fx_rate`, a decimal string with at most 12 significant digits, [07 §4.2](../07-calculation-engine.md)) and `fx_source`.
   - **Refunds** ([D-029](../decisions/D-029-refund-expense.md)) keep their positive amount and have a `refund` column set to `yes`, so the sign is never guessed.
   - **Rounding adjustments** ([D-021](../decisions/D-021-rounding-adjustment.md)) are listed in `settlements.csv` with method `rounding`.
3. **Money in PDF:** `formatMoney()` with Indian grouping (₹1,23,456), as in the app ([07 §12](../07-calculation-engine.md)).
4. **CSV encoding:** UTF-8 with BOM (so Excel shows ₹ and Hindi names), comma-separated, RFC 4180 quoting. Files:
   - `expenses.csv`: date, description, category, currency, amount, rate, base amount, split mode, refund, paid from kitty, committed, payers (name:amount; …), then one column per member with their share in base currency.
   - `settlements.csv`: date, from, to, amount, method, note, recorded by.
   - `kitty.csv` (if enabled): date, member, amount.
   - `balances.csv`: member, paid, share, kitty contributed, settlements paid, settlements received, net.
   - Delivered as one `.zip`, or as a single "expenses" CSV when the user picks the simple option.
5. **Balance sheet** uses `explainBalance()` totals, so paid − owed + settlements = net, and Σ net = 0 is printed at the bottom ([07 §7, §9](../07-calculation-engine.md)).
6. **Settlement summary** uses the trip's current settle mode (simplified or direct) and states it: "Simplified: 6 payments became 3. Nobody's total changes."
7. **Names:** member display names; ghosts included; deleted accounts appear as "Former member" (numbered if several) ([03 §11](../03-database-schema.md)).
8. **Receipts:** the PDF lists "receipt attached" per expense; photos are not embedded in v1 (size).
9. **Pro gate:** checked by the server on `/trip-export` (`403 pro_required` on a free trip). The phone also checks `trips.is_pro` to show the Pro sheet first. Limit: 10 exports per trip per day. Beta testers' trips can be Pro through a **grant** ([pro-pass](pro-pass.md)).
   - **File lifetime:** every export file has a `data_exports` row with `expires_at` 24 hours later. The nightly `cleanup` job deletes the file from R2 after that ([03 §9](../03-database-schema.md), [04 §10.1](../04-api-schema.md)).

**Import**
10. **Format** (to be verified against real exports before building): Splitwise's group CSV has columns `Date, Description, Category, Cost, Currency`, then one column per member holding that member's **net effect** for the row (what they paid minus what they owe), and a final "Total balance" row.
11. **Rebuilding an expense from a row:** if exactly one member has a positive value, they are the payer (paid = `Cost`); each other member's share = −(their value); the payer's share = `Cost` − (their value). This is saved as an **Exact** split, which reproduces the row exactly.
12. **Rows with several positive values** (multiple payers) can't be split into payers and shares uniquely. They are imported as an Exact split with those members as payers in proportion to their positive values (still exact to the row's net effect), and flagged "check this" in the preview.
13. **Payment rows** (Splitwise category "Payment") become `settlement.create` with method `other` and the note "Imported from Splitwise".
14. **Currency:** the trip base currency = the most common currency in the file. Rows in other currencies need a rate: the user enters one per currency (manual FX, frozen) or skips those rows.
15. **Amounts** are parsed from decimal strings straight into minor units. Values that don't fit the currency exponent are rejected with the row number.
16. **Idempotency:** each imported row gets a deterministic UUID derived from the file hash + row number, so importing the same file twice doesn't duplicate.
17. **Limits:** up to 2,000 rows (the trip scale target, PRD §17) and 50 members (the server rejects more with `member_limit`, [04 §2.1](../04-api-schema.md)). Larger files are refused with a message.
18. Import creates normal ops; the server verifies every one like any other expense.

---

## 7. Data model

No new tables. Reads (export) and writes (import) use [03 §5](../03-database-schema.md): `expenses`, `expense_revisions`, `expense_payers`, `expense_shares`, `settlements`, `kitty_contributions`, `kitty_handovers`, `trip_members`, `trip_categories`, `attachments` (for "receipt attached"), and `trips.is_pro`.

**`data_exports`** ([03 §9](../03-database-schema.md)) records every generated file: `id`, `user_id`, `kind`, `trip_id` (null for account export), `r2_key`, `expires_at` (24 h), `created_at`. The `kind` values are:

| `kind` | Made by | Pro? |
|---|---|---|
| `trip_pdf` | `/trip-export` with `format: "pdf"` (this feature) | Pro |
| `trip_csv` | `/trip-export` with `format: "csv"` (this feature) | Pro |
| `account` | `/account-export` ([account-and-privacy](account-and-privacy.md)) | always free |

The owner can read their own rows (RLS).

The export is built on the server, which has every revision. The phone only stores the **current** revision ([03 §10](../03-database-schema.md)), so it couldn't build the history appendix itself.

---

## 8. API requirements

| Need | Call |
|---|---|
| Export | `POST /trip-export { trip_id, format: "csv" \| "pdf" }` → `{ url, expires_at }` (24 h). Pro only; 10/day per trip ([04 §8a](../04-api-schema.md)). Writes a `data_exports` row (`trip_csv` / `trip_pdf`) |
| Import writes | `trip.create`, `member.add`, `expense.create`, `settlement.create` ops via `/sync-push` (50 per request) ([06 §4](../06-syncing.md)) |
| Account export (not this feature) | `POST /account-export` ([04 §8](../04-api-schema.md)), free |

---

## 9. UI requirements

No dedicated screen doc exists yet for export or import (gap). Entry points:
- [trip-home](../screens/trip-home.md): trip menu → **Export** (with a `PRO` tag on free trips).
- [settle-up](../screens/settle-up.md): after "Everyone's square.", a tonal **Download summary (PDF)** button. From R3 it sits next to **Open the trip recap →** (there is no recap before R3).
- The New trip (create-trip) flow and [settings-profile](../screens/settings-profile.md): **Import from Splitwise**.

**Export sheet:** two large options (PDF summary / Spreadsheet CSV), and the unsynced-changes note when relevant.

**PDF layout** (A4, the design-system fonts, light background for printing):
1. Cover: trip name, dates, members, base currency, total spent, "Generated by Toli on 24 Sep 2026".
2. **Who pays whom** (plain language), with the payment count saved.
3. Balance sheet (table; Σ = ₹0 shown).
4. Expenses by day (date, description, paid by, split, amount, and the member's share columns).
5. Settlements and kitty.
6. Footer on every page: "Toli only keeps count. It never holds or moves money."

**Import preview:** member mapping list, counts, balances comparison (Splitwise vs Toli) with ✓ per member, flagged rows, **Import**.

---

## 10. States

| State | Display |
|---|---|
| Free trip | Export shows `PRO`; tapping opens the Pro sheet |
| Offline | Export button shows "Needs internet" |
| Building | spinner ("Building PDF… 120 expenses") while `/trip-export` runs |
| Ready | share sheet |
| Unsynced changes | note in the sheet ("2 changes on this phone aren't in this file yet") |
| Import: parsing | spinner |
| Import: preview OK | all members ✓ |
| Import: preview with issues | flagged rows, **Import anyway** or **Cancel** |
| Import: syncing | normal sync pill "Syncing Goa Weekend · 240 changes" |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Trip with 2,000 expenses | the server builds the PDF page by page and streams CSV rows |
| Multi-currency trip | both amounts and the frozen rate per row |
| Itemised expenses | CSV lists shares; the PDF shows items under the expense |
| Kitty trip | kitty section + holder line and any hand-overs; the balance sheet uses the **settle view** (folded), and a note shows the trip view's "Kitty cash with Rahul" line ([07 §6](../07-calculation-engine.md), [D-022](../decisions/D-022-kitty-views-and-handover.md)) |
| Refund expense | shown with the refund flag; its effect on balances is reversed as in the app ([D-029](../decisions/D-029-refund-expense.md)) |
| Names with commas or quotes | RFC 4180 quoting |
| Splitwise file from a non-English locale (dates, decimal commas) | detect format; ask the user to confirm the date format if ambiguous |
| Splitwise CSV with members who left | imported as ghosts |
| The same Splitwise file imported twice | deterministic IDs → duplicates are absorbed |
| Import into a trip that already has expenses | not allowed in v1 (empty trip or new trip only) |
| Pass refunded after export | nothing to undo; future exports blocked |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member of a Pro trip can export it; on a free trip they see the Pro sheet, and account export is always free. Any user can import a Splitwise file into a new trip they create (they become its organiser). Web viewers and ghosts can do neither.

## 13. Offline behaviour

- **Export needs internet** (server-built). Offline, the button shows "Needs internet"; everything else in the trip still works.
- **Import parsing and preview are offline**; the created trip works locally at once and syncs later (a large import is many ops, drained 50 at a time, [06 §8](../06-syncing.md)).

## 14. Sync behaviour

- Export reads the server's state. The phone drains its outbox first; anything still unsynced is left out and noted.
- Import writes ordinary ops; the server re-verifies each expense's zero-sum and rejects anything invalid, which then shows in Unresolved changes.

---

## 15. Analytics

| Event | Properties | Source |
|---|---|---|
| `pro_paywall_viewed` | `feature = export` | PRD §19 |
| `trip_exported` | `format` (pdf/csv), `expense_count_bucket`, `unsynced_left_out` (bool) | proposed |
| `splitwise_import_started` | `rows_bucket`, `currencies` | proposed |
| `splitwise_import_completed` | `rows_imported`, `rows_flagged`, `balances_match` (bool) | proposed |

## 16. Error handling

| Error | Handling |
|---|---|
| `403 pro_required` | open the Pro sheet |
| `429 rate_limited` (10/day per trip) | "You've exported this trip a lot today. Try again tomorrow." |
| Server error or timeout | "Couldn't build the file. Try again."; offer CSV if the PDF failed |
| Share sheet cancelled | nothing (the link stays valid for 24 h) |
| Import: not a Splitwise CSV | "This doesn't look like a Splitwise export. Here's how to get one." |
| Import: bad amount in a row | row listed with its number; the rest can import |
| Import: server rejects an op | Unresolved changes, with the Splitwise row number in the detail |

## 17. Testing

- Golden: export of fixture G1 produces the expected CSV byte-for-byte and a PDF whose summary says "Neha pays Aditya ₹1,200 · Jay pays Aditya ₹1,200 · Rahul pays Aditya ₹1,000".
- Property: Σ net in `balances.csv` = 0 for random trips; CSV amounts round-trip to the same minor units.
- Import: sample Splitwise exports (single payer, multi-payer, payments, multi-currency, non-English dates) → balances equal the file's "Total balance" row.
- Excel/Google Sheets/Numbers open the CSV with correct ₹ and Hindi text.

## 18. Cost and free-tier impact

| Item | Impact |
|---|---|
| Export | one `/trip-export` call per file (max 10/day per trip) plus a short-lived file in R2; negligible |
| Import | one burst of ops per imported trip (e.g. 300 ops ≈ 6 `/sync-push` calls); negligible against 500k invocations/month |
| App size | none: the PDF is built on the server |

## 19. Future considerations

- Full audit-trail export (every revision) via a server endpoint.
- Tricount and Settle Up imports.
- Google Sheets live sync.
- GST-ready export for office offsites (out of scope for v1; corporate T&E is a non-user, PRD §4).

## 20. Open questions

**Resolved:**
- **Splitwise import: SHOULD or MUST?** SHOULD, in R2 (OQ-P6, [01](../01-overview.md#open-questions)).
- **Where export files are tracked:** `data_exports` with kinds `account` / `trip_csv` / `trip_pdf`, deleted after 24 h ([03 §9](../03-database-schema.md)).

**Still open (feature-level):**
1. **Is Splitwise import Pro?** PRD lists it under F15, whose export is Pro. Import is an acquisition tool; proposal: **free**. Needs a decision.
2. **Splitwise CSV format** (rule 10) must be verified against current real exports before building; the multi-payer reconstruction (rule 12) is a best effort.
3. **No screen doc** exists for export or import; one should be added to `screens/`.
4. Should the PDF embed receipt photos (bigger files) as an option?
