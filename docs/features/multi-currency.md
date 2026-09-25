# Feature · Multi-currency (F10)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R2 ([D-018](../decisions/D-018-r1a-r1b-scope.md): R1a and R1b are single-currency) |
| **PRD refs** | F10, §9.2 (minor units), §11.4 (frozen rate), §15 (free), §21 (FX cost), Appendix A.2 #5 |
| **Related** | Screens: [add-expense](../screens/add-expense.md) · [trip-home](../screens/trip-home.md) · [settle-up](../screens/settle-up.md) · Docs: [07 §4, §12](../07-calculation-engine.md) · [03 §5.2, §9, §10](../03-database-schema.md) · [04 §6.2, §10](../04-api-schema.md) · [06 §4](../06-syncing.md) · Decisions: [D-013](../decisions/D-013-keypad-entry.md), [D-014](../decisions/D-014-ids-and-wire-money.md), [D-005](../decisions/D-005-rounding-rule.md), [D-019](../decisions/D-019-money-edit-group.md) |

---

## 1. Purpose

Let someone in Bali log a spend in rupiah and have everyone settle in rupees, with no FX maths and with every phone showing exactly the same balances forever.

## 2. User problem

- Abroad, people pay in the local currency but think and settle in their home currency.
- Converting by hand is slow and everyone gets a slightly different number.
- If an app re-converts old expenses when rates move, two people opening the app on different days see different balances. In a shared ledger that is a trust failure.
- The forex counter or card rate is not the reference rate; people want to type the rate they actually got.

## 3. Business goal

- **Free**, to remove a switching objection: Splitwise paywalls currency conversion; Tricount gives it free (PRD F10). Costs us almost nothing: one shared fetch a day (PRD §21).
- Needed for international trips and for later international expansion (PRD §1: currency is pluggable).

---

## 4. User flow

**Log a foreign-currency expense**
1. On Add expense, the user taps the currency symbol next to the amount (default: trip base, e.g. ₹).
2. A currency picker opens: **recent currencies first**, then the trip destination's currency (if known), then a searchable list of all supported currencies (code, name, symbol).
3. The user picks IDR. The keypad changes to that currency's rules ([D-013](../decisions/D-013-keypad-entry.md): whole units for IDR/JPY/VND; a `.` key for decimal currencies).
4. They type 350,000. Under the amount: "≈ ₹1,855 · rate of 23 Sep". The per-person line shows both currencies.
5. Optional: tap the rate line → **Use my own rate** → "1 IDR = ₹ 0.0053" (or "₹100 = IDR 18,900"). The line changes to "≈ ₹1,855 · your rate".
6. Save. The rate is **frozen** onto the expense.

**See it later**
1. The expense row shows **IDR 350,000** as the main amount and "≈ ₹1,855" in muted text.
2. Balances, the Settle up screen, UPI links and the recap are all in the base currency.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| MC-01 | A trip base currency plus a per-expense currency, from 150+ ISO 4217 currencies. | MUST | F10 |
| MC-02 | Daily reference rates are fetched by a **server cron inside Supabase** (pg_cron → the `fx-ingest` Edge Function, 02:30 IST) from **Frankfurter** (v2 API), with **fawazahmed0 currency-api** as the fallback, and stored in `fx_rates`. Phones never call the providers. | MUST | F10, [04 §10.1](../04-api-schema.md) |
| MC-03 | Phones cache rates locally (`fx_cache`) and use them offline. | MUST | F10 |
| MC-04 | The rate is **frozen on the expense at creation** and never re-derived. | MUST | F10, §11.4 |
| MC-05 | The user can override the rate per expense (the rate they actually got). | MUST | F10 |
| MC-06 | Each expense is displayed in its original currency, with the base-currency equivalent as secondary. | MUST | F10 |
| MC-07 | All balances and settlements are computed in the base currency only. | MUST | F10 |
| MC-08 | Offline, use the last cached rate table and **label it with its date**. | MUST | F10 |
| MC-09 | Free, with no limits. | MUST | F10, §15 |
| MC-10 | No floating point anywhere: rates are stored as decimal strings (at most 12 significant digits) and used as exact fractions, amounts are integer minor units, exponents come from the ISO table. | MUST | §9.2 |
| MC-12 | An expense that converts to less than 1 minor unit of the base currency is rejected (`amount_too_small`). | MUST | [07 §4.2](../07-calculation-engine.md) |
| MC-13 | A currency the providers don't cover can still be used, with a **manual rate** that the user must enter. | MUST | review M-6 |
| MC-11 | Recent and destination currencies appear first in the picker. | SHOULD | F10 (UX) |

---

## 6. Business rules

All maths is in [07 §4](../07-calculation-engine.md).

1. **Currency table:** the engine holds the ISO 4217 code → minor-unit exponent table (INR 2, USD 2, JPY 0, KWD 3, IDR 2 displayed without decimals, VND 0). Never assume 2.
2. **Rate format:** a rate means base minor units per 1 expense minor unit. It is **stored** as a decimal string with at most **12 significant digits** (`expense_revisions.fx_rate`, `numeric(30,15)`), e.g. `"0.0053"`. The engine **parses** it into an exact fraction (`53 / 10000`) and computes `base_amount = roundHalfUp(amount × num / den)` ([07 §4.2](../07-calculation-engine.md); review DB-6).
3. **Cross rate:** from the `fx_rates` pivot: `rate(exp→base) = (base per pivot) / (exp per pivot)`, adjusted by `10^(exp_base − exp_expense)`, computed as an exact fraction from the stored decimal strings. It is then **rounded half-up to 12 significant digits before it is frozen**, so the stored rate is always short and the fraction can never overflow.
4. **Which daily rate:** the latest `rate_date` **on or before** the expense's `spent_at` date that exists in the phone's cache. Frankfurter only publishes on working days, so weekends use Friday's rate.
5. **Source preference:** per currency, use `source = frankfurter` when present for that date; otherwise `fawazahmed0`.
6. **Frozen:** `fx_rate` (the 12-digit decimal string), `fx_source` (`same` / `daily` / `manual`) and `fx_rate_date` are written on the revision. **Nothing re-rates an old expense** when `fx_rates` changes.
7. **Editing an expense:**
   - Changing only the amount, description, split, etc.: keep the frozen rate.
   - Changing the **currency**: use the cached rate for the expense's original `spent_at` date, or a manual rate ([07 §4.3.5](../07-calculation-engine.md)).
   - Changing the rate manually: new revision with `fx_source = manual`.
8. **Same currency:** rate `"1"` (the fraction `1/1`), `fx_source = same`, exact identity.
9. **Conversion happens once, at the end:** shares and payers are computed in the expense currency, then the whole vector is converted with `allocate()` so Σ shares = Σ payers = base amount exactly ([07 §4.4](../07-calculation-engine.md)).
10. **Base currency can change only while the trip has no expenses.** `trip.update` accepts `base_currency` only then, and only from an organiser ([06 §4](../06-syncing.md), [permission matrix](../09-security.md#permission-matrix); review C-13). After the first expense it is fixed, because changing it would re-rate every expense and break MC-04.
11. **Kitty contributions and settlements are in the base currency only** ([03 §5.6–5.7](../03-database-schema.md)).
12. **UPI is INR-only.** `upi://pay` links (`cu=INR`) are built only when the trip base currency is INR. For other base currencies `/upi-link` returns `{ url: null, reason: "not_inr" }`, and settle up offers **Mark as paid** only ([04 §5.1](../04-api-schema.md)).
13. **Stale rates:** the rate label always shows the rate date. If the rate is more than 7 days older than `spent_at`, the label turns into a warning: "Rate is 9 days old · tap to set your own".
14. **No rate at all:** the user must enter a manual rate before saving. This covers two cases: the currency was never cached (offline), and the currency is **not covered by Frankfurter or fawazahmed0** at all (review M-6). The keypad save button says "Add a rate to save". The expense then saves offline like any other, with `fx_source = manual`.
15. **Manual rate input** accepts either direction ("1 USD = ₹83.12" or "₹100 = USD 1.20") and a decimal string; the engine converts it to a fraction. Maximum 12 significant digits (an inverted rate is rounded to 12 digits before it is frozen).
16. **Too small to convert:** if the amount is above 0 but converts to 0 in the base currency (e.g. 1 VND on an INR trip), the phone blocks the save with "This is less than ₹0.01 in INR", and the server rejects it with `amount_too_small` ([07 §4.2](../07-calculation-engine.md), [04 §2.1](../04-api-schema.md)). Every saved expense has `base_amount_minor ≥ 1`.

---

## 7. Data model

All in [03](../03-database-schema.md); nothing new is needed.

| Table | Columns used |
|---|---|
| `trips` | `base_currency` |
| `expense_revisions` | `amount_minor`, `currency`, `fx_rate` (`numeric(30,15)`, at most 12 significant digits), `fx_source`, `fx_rate_date`, `base_amount_minor` |
| `expense_payers` / `expense_shares` | `amount_minor` / `share_minor` (expense currency) and `base_minor` |
| `fx_rates` (global) | PK `(rate_date, source, quote)`, `pivot`, `rate numeric(24,12)`, `fetched_at` |
| `fx_cache` (phone) | copy of `fx_rates` for the last 30 days plus the dates of existing expenses |

Both `fx_rates.rate` (`numeric(24,12)`) and `expense_revisions.fx_rate` (`numeric(30,15)`) are read by the engine as **decimal strings**, never as JS numbers.

---

## 8. API requirements

| Call | Detail |
|---|---|
| `fx-ingest` Edge Function (pg_cron + pg_net, daily 02:30 IST) | Fetch Frankfurter; for currencies it lacks, fetch fawazahmed0; upsert `fx_rates`. Runs inside Supabase, so the service role never leaves it; not callable by clients (cron secret header) ([04 §10.1](../04-api-schema.md)) |
| `GET /rest/v1/fx_rates?rate_date=gte.<date>` | Phones pull rates through PostgREST; any signed-in user ([04 §6.2](../04-api-schema.md)) |
| `expense.create` / `expense.edit` ops | carry `currency` and the frozen rate as a **decimal string** (at most 12 significant digits) with its source and rate date ([04 §2.1](../04-api-schema.md), [D-014](../decisions/D-014-ids-and-wire-money.md)) |
| Server check in `sync-push` | parses the sent rate, recomputes `base_amount_minor` and rejects mismatches; rejects a rate with more than 12 significant digits (`invalid_payload`) and a conversion to 0 (`amount_too_small`). It **does not** substitute its own rate |

**Cron sanity checks** (proposal, to be added to [08](../08-third-party-integrations.md)):
- Reject a quote that moved more than 20% from the previous day's value; keep the previous row and alert Sentry.
- If both providers fail, write nothing. Phones keep using the latest rows and show their date.
- Log the number of quotes fetched per source.

**When phones fetch rates:** on app start and foreground (if the newest cached `rate_date` is older than today), and when the user opens the currency picker. Only rows newer than the cache are requested.

---

## 9. UI requirements

Screen docs: [add-expense](../screens/add-expense.md) (picker, rate line), [trip-home](../screens/trip-home.md) (rows).

- **Amount display:** the currency symbol/code sits where "₹" sits today (`type.amountXL`, symbol 34/600 muted). Tapping it opens the picker.
- **Rate line** under the per-person line, mono caption: "≈ ₹1,855 · rate of 23 Sep" / "≈ ₹1,855 · your rate" / warning style when stale.
- **Currency picker** (bottom sheet): search field; sections "Recent", "This trip" (destination), "All currencies"; each row shows code, name, symbol.
- **Expense rows:** primary mono amount in the original currency with its code ("IDR 3,50,000" uses the currency's own grouping, see Open question 3), secondary "≈ ₹1,855".
- **Formatting:** always `formatMoney()` from the engine, never the phone's `Intl` ([07 §12](../07-calculation-engine.md)).
- **Settle up / balances:** base currency only, with a small note on trips that have foreign expenses: "Balances are in ₹. Each expense keeps the rate it was logged with."
- Screen-reader labels read both amounts: "350,000 Indonesian rupiah, about 1,855 rupees".

---

## 10. States

| State | Display |
|---|---|
| Base currency expense | No rate line |
| Foreign, fresh rate | "≈ ₹X · rate of {date}" |
| Foreign, stale rate (> 7 days) | Warning label, tap to override |
| Foreign, no cached rate, offline | "No rate saved for IDR yet. Add your rate to save." |
| Currency the providers don't cover | Picker marks it "manual rate"; "Enter the rate you got" before saving |
| Converts to less than 0.01 | "This is less than ₹0.01 in INR"; Save disabled |
| Manual rate | "your rate" label; expense detail shows "Rate set by Rahul" |
| Rate table updating | nothing visible (background) |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Rates move after an expense is saved | No change: the rate is frozen (fixture G6, PRD A.2 #5). |
| Two members log the same IDR expense on different days | Each gets its own frozen rate; the duplicate prompt still compares amounts in the expense currency. |
| Expense logged with a back-dated `spent_at` | Uses the cached rate for that date if present; else the nearest earlier cached date, labelled. |
| JPY (exponent 0) or KWD (exponent 3) | Handled by the table; fixture G10. |
| Currency not covered by either provider | Manual rate required ("Enter the rate you got"); picker marks it "manual rate". Saves offline like any other expense (review M-6). |
| 1 VND on an INR trip | Converts to ₹0.00, so it's blocked: "This is less than ₹0.01 in INR" (`amount_too_small`). |
| A cross rate with many digits (IRR → KWD) | Rounded half-up to 12 significant digits before freezing, so the stored rate never overflows. |
| A currency is redenominated or withdrawn | Old expenses keep their frozen rate; the code stays in the table for display. |
| Base currency is not INR | UPI links unavailable; mark as paid only (rule 12). |
| Very small rates (1 IDR = 0.0053 INR) | Stored as `"0.0053"`, used as the exact fraction `53/10000`; no precision loss. |
| Multi-payer foreign expense | Payer amounts in the expense currency, converted once with `allocate()`. |
| Itemised foreign bill (scan) | Same rules; items are in the bill currency. |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can log in any currency and set the rate on expenses they can edit; only an organiser can change the base currency, and only before the first expense.

**System access:** any signed-in user (incl. anonymous) can read `fx_rates`. Only the `fx-ingest` Edge Function (service role, inside Supabase) writes it; clients never do.

## 13. Offline behaviour

- Entry, display and balances are fully offline.
- The phone keeps 30 days of rates plus the dates of existing expenses in `fx_cache`, so edits to older expenses also work offline.
- The label always shows the rate date, so an offline week in Bali is honest about which rate it used.

## 14. Sync behaviour

- The frozen fraction travels **inside the op**. The server never recalculates it from its own table, so an offline phone with an older rate produces the same balances on every device.
- `fx_rates` is not part of the trip op log; it is pulled separately and is the same for every user.
- Conflicts: currency, rate and amount are all in the expense's **money group**. If two phones change any of them, the last money edit the server receives wins **as a whole** (never field by field), and the other editor is told ([D-019](../decisions/D-019-money-edit-group.md), [06 §5](../06-syncing.md)).

---

## 15. Analytics

| Event | Properties | Source |
|---|---|---|
| `expense_added` | `currency`, `offline` | PRD §19 |
| `fx_rate_overridden` | `currency`, `rate_age_days` | proposed |
| `fx_rate_stale_shown` | `currency`, `rate_age_days` | proposed |

No amounts or rates are sent.

## 16. Error handling

| Error | Handling |
|---|---|
| `400 currency_unsupported` | Only for a code that isn't in the engine's ISO 4217 table: "We can't use {code} yet. Pick another currency." A valid code the providers don't cover needs a manual rate instead (rule 14) |
| `amount_too_small` on push | Unresolved changes: "This is less than ₹0.01 in INR. Change the amount or currency." (the phone normally blocks it first) |
| Server recomputed base amount ≠ sent | server result wins; Sentry ([06 §6](../06-syncing.md)) |
| Rate fetch fails on the phone | keep the cache; no user-facing error |
| Cron: both providers down | no write; Sentry alert; phones show rate dates |
| Manual rate unparsable or 0 | inline "Enter a rate above 0" |

## 17. Testing

- Engine: cross-rate fractions, rounding to 12 significant digits, exponent adjustment, `roundHalfUp`, identity for same currency, `amount_too_small` (1 VND on INR); property tests over very large (VND, IDR, IRR) and very small (KWD) rates; fixtures G6 (IDR on INR trip, rates move → balances unchanged) and G10 (JPY, KWD) ([07 §14](../07-calculation-engine.md)).
- Property test: invariant 7 ("a frozen FX rate never changes when `fx_rates` changes").
- Parser tests for manual rates in both directions, with and without grouping separators.
- Cron tests against recorded provider responses, including a provider outage and a 20% jump.
- E2E: offline, log in IDR with a 10-day-old cached rate → warning shown → save → sync → same base amount on a second phone.

## 18. Cost and free-tier impact

| Item | Limit | Expected usage | Breaking point |
|---|---|---|---|
| Frankfurter / fawazahmed0 | free, no key, no SLA | 1–2 fetches a day, shared by all users | provider shutdown → switch provider in `fx-ingest`, no app update |
| Edge Function invocations | 500k/month | 1 cron run a day | none |
| Postgres rows | 500 MB free | ~170 quotes × up to 2 sources × 365 days ≈ 125k rows/year (a few MB) | none soon; prune rows older than 2 years that no expense references |
| Phone pulls | Supabase egress 5 GB/month | small daily deltas | none soon |

## 19. Future considerations

- Show the card's actual charged amount from a bank SMS or statement (post-v1).
- Per-trip default manual rate ("we changed money at ₹1 = IDR 190 for the whole trip").
- Settling in a second currency for mixed-nationality groups.

## 20. Open questions

**Resolved:**
- **Who fetches rates:** pg_cron calls the `fx-ingest` Edge Function inside Supabase; the Worker has no service key and no FX job ([04 §10.1](../04-api-schema.md), [09 §2.4](../09-security.md)).
- **Rate storage:** a 12-significant-digit decimal string in `fx_rate` ([07 §4.2](../07-calculation-engine.md), review DB-6).
- **Tiny amounts:** rejected with `amount_too_small` (review B-10).
- **Unsupported currencies:** manual rate required (review M-6).
- **Changing the base currency:** allowed before the first expense, organiser only ([06 §4](../06-syncing.md), review C-13).
- **UPI:** INR trips only; other base currencies use Mark as paid ([04 §5.1](../04-api-schema.md)).

**Still open (feature-level):**
1. **Coverage check:** confirm that Frankfurter v2 plus fawazahmed0 together cover 150+ currencies for daily rates, and list any that are manual-only.
2. **Grouping for foreign currencies:** does `formatMoney()` use Indian grouping (3,50,000) for every currency when the app locale is `en-IN`, or each currency's own convention (350,000)? [07 §12](../07-calculation-engine.md) only specifies INR.
3. Is a 7-day stale threshold right, or should it depend on whether the user was offline?
