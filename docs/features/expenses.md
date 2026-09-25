# Feature · Expenses

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a** (keypad entry, defaults, repeat-last, duplicates, edit/delete as revisions, categories, receipt photos, All expenses). **R1b:** Refund type ([D-029][d029]). **R2:** other currencies, receipt scanning, category suggestions from receipts ([D-018][d018]) |
| **PRD refs** | [F3][prd] (the critical path), F4 (receipt photos free), F9 (categories, auto-suggest), §5 principle 2 ("five seconds to log"), §8 (Expense, Payer, Participant), §11.6, §12 (duplicates on sync), §17 (save ≤ 100 ms), §18 (audit log), §19 (`expense_added.duration_ms`) |
| **Related** | Screens: [add-expense](../screens/add-expense.md) · [split-editor](../screens/split-editor.md) · [tear-overlay](../screens/tear-overlay.md) · [trip-home](../screens/trip-home.md) · [all-expenses](../screens/all-expenses.md) · [expense-detail](../screens/expense-detail.md) · [empty-trip](../screens/empty-trip.md) · [receipt-scan](../screens/receipt-scan.md) · [unresolved-changes](../screens/unresolved-changes.md) — Docs: [02 §5.1][arch] · [03 §5.1–5.4, §5.8, §7.1, §10][db] · [04 §2, §4, §5.1a][api] · [06 §4–5][sync] · [07 §2–5][engine] · [09 §2.3 permission matrix][perm] — Decisions: [D-006][d006] · [D-013][d013] · [D-014][d014] · [D-019][d019] · [D-028][d028] · [D-029][d029] · [D-030][d030] — Features: [splitting](splitting.md) · [kitty](kitty.md) · [receipt-scan](receipt-scan.md) · [multi-currency](multi-currency.md) |

---

## 1. Purpose

Logging a spend, **while standing at the counter**, in under five seconds. The screen opens on a number pad; the amount is the only thing needed. Everything else has a sensible default and can be fixed later.

This doc covers entry, defaults, repeat-last, duplicate detection, editing and deleting (as revisions), refunds, categories, free receipt photos and the **All expenses** list. How the amount is divided is in [splitting](splitting.md).

## 2. User problem

If logging takes more than a few seconds at a restaurant counter, it doesn't get logged, and the trip's numbers are wrong from then on. The second most common failure: **two people log the same dinner.**

## 3. Business goal

- **Time-to-log p50 ≤ 5.0 s** (PRD §6.2), instrumented by `expense_added.duration_ms`.
- **Expenses per active trip ≥ 18** (median).
- **Zero balance-correctness incidents** (G5): every edit and delete is exact and auditable.

## 4. User flow

**Add (the 5-second path)**
1. Tap the lime **+** in the tab bar. The keypad screen opens with the amount field active.
2. Type `1200`. The line under the amount updates live: "₹300 each · 4 people".
3. Tap **Save & tear stubs ✂**. The expense is saved on the phone at once. The tear overlay plays (skippable), and the toast says what will really happen, for example "**Rahul and Neha will get a stub · share with Jay on WhatsApp**". Offline, it says "**Saved · sending when you're online**".

**Add with more detail (still one screen)**
- "What for? (optional)" text field.
- **PAID BY** tile: tap to open the **payer sheet** (recent payers first, search above 8 members, **+ Add payer** for more than one payer, **Kitty** if it's on).
- **SPLIT** tile ("Equal · 4 ›"): one tap to the [split editor](splitting.md).
- **BILL** tile: a small choice, **Attach photo** (free) or **Scan (PRO)** (R2, [receipt-scan](receipt-scan.md)).
- **Today · ₹ ▾** chip: a sheet with the date and time, **Booked before trip**, and the currency (other currencies from R2, [multi-currency](multi-currency.md)).
- **Refund** switch (R1b): "Money came back, like a hotel refund" ([D-029][d029]).
- Category chips: Food, Drinks, Travel, Stay, Activities, Shopping, Fuel, Misc (scrollable; more in "More").
- **↻ Cab ₹800** chip at the top: repeat last expense.

**Duplicate check**
1. On save, if a probable duplicate exists: sheet "**Already logged?**" — "Neha already logged ₹1,200 for "Dinner" within 10 minutes of this one. Two people logging the same bill is common."
2. **Same one, skip** (don't save) or **Save anyway**.

**Find, edit, delete**
1. Trip home → **See all** → [All expenses](../screens/all-expenses.md): every expense, newest first, with search and filters by person and category.
2. Tap an expense → [expense detail](../screens/expense-detail.md) → **Edit** (same keypad screen, prefilled) or **Delete**.
3. Delete shows a toast "Deleted · **Undo**".
4. Detail → **History** shows every revision: "Rahul changed the amount ₹1,200 → ₹1,300 · Sun 13 Oct 22:05".

## 5. Requirements

| ID | Requirement | Level | Release | PRD |
|---|---|---|---|---|
| EX-1 | Open to an **amount-first numeric keypad**. Amount is the first and only required field. | MUST | R1a | F3 |
| EX-2 | Defaults: payer = current user; participants = all members active on that date; split = equal; date = now; currency = trip base. | MUST | R1a | F3 |
| EX-3 | Save with amount alone. Description, category and receipt are optional and editable later. | MUST | R1a | F3 |
| EX-4 | Show the per-person amount **live** while typing. | MUST | R1a | F3 |
| EX-5 | Reach the participant/split editor in **one tap**. | MUST | R1a | F3 |
| EX-6 | Every split mode and multiple payers, no limits, no paywall ([splitting](splitting.md)). R1a: Equal, Selected-equal, Exact, Percent, Shares, multiple payers. **R1b:** Adjustment and Itemised. | MUST | R1a / **R1b** (moved) | F3, §9.1 |
| EX-7 | Attach **up to 5 receipt photos**, compressed on the phone, uploaded lazily in the background. **Free.** | MUST | R1a | F3, F4 |
| EX-8 | Work fully offline, queueing for sync. | MUST | R1a | F3, §12 |
| EX-9 | **Repeat last expense** shortcut. | MUST | R1a | F3 |
| EX-10 | Detect probable duplicates (same amount and currency, `spent_at` within 10 minutes, by a different member) and **prompt**, never silently merge or duplicate. Also on sync. | MUST | R1a | F3, §12 |
| EX-11 | Edits and deletes are **revisions**; history answers "who changed my share". | MUST | R1a | §18, [D-006][d006] |
| EX-12 | Deleting an expense restores every balance exactly. | MUST | R1a | §11.6 |
| EX-13 | Local save ≤ 100 ms. Zero data loss on force-quit mid-entry. | MUST | R1a | §17 |
| EX-14 | Default categories Stay, Travel, Food, Drinks, Activities, Shopping, Fuel, Tolls, Tips, Misc, with template defaults; custom categories per trip. | MUST | R1a | F9 |
| EX-15 | An **All expenses** list with search and filters by person and category ([all-expenses](../screens/all-expenses.md)). | MUST | R1a | review M-1 |
| EX-16 | A date and "booked before trip" control on Add expense (**Today · ₹ ▾**). | MUST | R1a | review U-4 |
| EX-17 | Copy after saving says only what really happened: who will get a stub, who to share with on WhatsApp, and "sending when you're online" while offline. | MUST | R1a | review U-2 |
| EX-18 | A **Refund** expense type: stored as a positive amount; the engine flips the direction ([D-029][d029]). | MUST | **R1b** | F3 (PRD v1.1 #13) |
| EX-19 | Auto-suggest a category from the description using an on-device keyword map. | MUST | R2 (per F9) | F9 |
| EX-20 | Voice entry ("twelve hundred for dinner, me and Rahul"). | SHOULD | later | F3 |
| EX-21 | Quick-add widget and share-sheet target. | SHOULD | later | F3 |

## 6. Business rules

### 6.1 Amount entry ([D-013][d013])
- **INR** (and IDR, JPY, VND): whole rupees. Keys `1–9, 00, 0, ⌫`. Paise can be set later on the detail screen if ever needed.
- **Decimal currencies:** the `00` key becomes `.`, up to the currency's exponent.
- Leading zeros are dropped. Cap: 9,99,99,999 major units (8 digits).
- **Zero is never saved:** "Type an amount first".
- The amount is turned into a `bigint` of minor units immediately. No floats ([07 §1][engine]).
- **On the phone**, money is stored in SQLite as `INTEGER` and read and written **only** through `data/money-codec.ts`, which turns it into `Minor` (a branded `bigint`). No other code touches raw money numbers ([D-028][d028]).
- Display uses Indian grouping (`₹1,23,456`) from the engine's formatter, never the phone's `Intl` ([07 §12][engine]).

### 6.2 Defaults
| Field | Default |
|---|---|
| Payer | the current user's member (shown "You") |
| Participants | every non-removed member with `joined_from` null or ≤ the expense date |
| Split | Equal |
| Date (`spent_at`) | now; editable through **Today · ₹ ▾**. Changing the date re-applies the participant default **only if the user hasn't touched participants** |
| Booked before trip (`is_committed`) | off; **on by default** when the date is before the trip's start date |
| Currency | trip base (other currencies: [multi-currency](multi-currency.md), R2) |
| Category | none (stored null, shown as Misc) until picked (OQ-P15). The prototype's pre-selected Food is not used. |
| Description | empty; the list shows the category name instead |

**Dates outside the trip:** allowed. After the end date, a small warning asks "After the trip ended?" (review M-5). Day boundaries use the trip's `time_zone` ([03 §4.1][db]).

### 6.3 The 5-second rule
- Nothing on the path may wait for the network, a permission prompt, or a spinner.
- `duration_ms` = time from the add-expense screen appearing to the local save committing. Cold start is tracked separately (≤ 1.5 s). See Open questions.
- The tear overlay plays **after** the save and never blocks; a tap skips it; Reduce Motion replaces it with the toast ([13 §6.3][ds]).

### 6.4 Honest save copy (review U-2)
The toast is built from what is true **at that moment**:
- Participants with a share who are on Toli (and aren't you) "will get a stub".
- Ghosts and people without push are named with "share with … on WhatsApp".
- Nobody else owes a share: "Saved".
- Offline or still in the outbox: "Saved · sending when you're online". Never "sent".

### 6.5 Repeat last
- The chip shows the last expense **this user added in this trip** ("↻ Cab ₹800"); fallback: the trip's last expense.
- Tapping copies amount, description, category and participant set. Payer stays whatever is selected; date = now.
- It fills the draft; the user still taps Save.

### 6.6 Duplicate detection ([06 §5][sync])
**Rule (PRD F3):** another non-deleted expense in the same trip with
1. the **same amount and currency**,
2. **`spent_at` within 10 minutes** of this one (in the trip's time zone), and
3. **created by a different member** (`created_by_member_id`).

- It compares **`spent_at`**, not the time the server received it, so two phones that logged the same dinner offline and synced hours apart are still caught (review B-08).
- **On save** (the other entry is already on this phone): "Already logged?" → **Same one, skip** / **Save anyway**.
- **On pull** (both were saved offline): the later creator sees **Same one, delete mine** / **Keep both**.
- It's never a sync conflict and never auto-merged. "Keep both" is remembered for that pair on this phone (in `kv`).
- Duplicate **settlements** have their own prompt ([settle-up](settle-up.md)).

### 6.7 Edit and delete ([D-006][d006], [D-019][d019])
- `expenses` is a stable header; each create, edit and delete adds an `expense_revisions` row with its own payers and shares.
- **Edit** sends `base_revision_id` plus a patch.
  - **Money group** (`amount_minor`, `currency`, `fx_*`, `is_refund`, `payers`, `split_mode`, `split_input`, `paid_from_kitty`, `items`): the last money edit the server receives **replaces the whole group**. It's never merged field by field, because the fields depend on each other. The earlier editor is told ("Rahul changed the amount and split after you"), and both versions stay in the history.
  - **Other fields** (`description`, `category_id`, `spent_at`, `is_committed`) merge field by field.
- **Delete** adds a `delete` revision (copying the previous values) and sets `is_deleted`. All balances return exactly to their prior values.
- **Undo** within the toast: if the delete op is still in the outbox, remove it (cancel locally). If it has already synced, "Undo" creates a **new** expense with the same values (there's no "undelete" op).
- Editing is rejected in `settled`/`archived` (`trip_settled`) until the trip is reopened ([06 §5 allow-list][sync]).
- **Removed members** ([D-030][d030]): an edit or delete that would change a removed member's balance is rejected with `removed_member_balance` ("This changes Jay's balance. Add Jay back first.").
- A **Not me** push action opens the expense with "Not part of this? Remove yourself"; only confirming writes an `expense.edit` that removes you ([04 §11][api]).
- The expense's logical `id` never changes, so rounding stays stable across edits ([07 §3][engine]).

### 6.8 Refunds (R1b, [D-029][d029])
- Turn on **Refund** when money comes back (the hotel returns ₹2,000).
- The amount is stored **positive** with `is_refund = true`. The engine computes shares and payers as normal, then **flips both**: the payer "received" the refund, and each participant gets their share back ([07 §5][engine], fixture G15).
- Refunds are part of the money group. Zero is still blocked.

### 6.9 Categories
- Seeded per trip from the template into `trip_categories` (`food`, `drinks`, `travel`, `stay`, `activities`, `shopping`, `fuel`, `tolls`, `tips`, `misc`, or `custom:*`).
- Custom categories: `category.upsert` / `category.delete` (soft delete; old expenses keep showing the name).
- **Auto-suggest** (R2; on-device keyword map; never overrides a chip the user tapped). Examples: dinner/lunch/breakfast/thali → Food; beer/bar/pub → Drinks; cab/uber/ola/auto/flight/train/bus → Travel; hotel/airbnb/oyo/room → Stay; petrol/diesel/fuel → Fuel; toll/fastag → Tolls; tip → Tips.

### 6.10 Receipt photos (free)
- Up to **5** per expense (the server rejects more with `attachment_limit`), max 10 MB per file ([04 §2.1][api]). Camera or gallery. Receipts never count against the vault quota.
- On the phone: resize to 1600 px, JPEG q0.7 (~150 KB), **strip EXIF/GPS** ([02 §4][arch]).
- An `attachment.register` op plus a `file_queue` row; uploads **on Wi-Fi only by default** (user can override). A photo sent for a Pro scan uploads immediately (OQ-P17).
- Never lose a photo: failed uploads retry; the local file is kept until `upload-confirm` succeeds.
- Deleting a photo is `attachment.delete` (the uploader or an organiser). The file is removed later by the cleanup job.

## 7. Data model

| Table ([03][db]) | Columns |
|---|---|
| `expenses` | `id` (rounding seed), `trip_id`, `current_revision_id`, `is_deleted`, `created_by_user`, `created_by_member_id`, `created_at`, `last_seq` |
| `expense_revisions` | `revision_no`, `kind` (create/edit/delete), `amount_minor`, `currency`, `fx_rate` (decimal string, ≤ 12 significant digits), `fx_source`, `fx_rate_date`, `base_amount_minor`, `is_refund` (R1b), `engine_version`, `spent_at`, `category_id`, `description` (≤ 120), `split_mode`, `split_input`, `paid_from_kitty`, `is_committed`, `op_id`, `created_by_user`, `created_at` |
| `expense_payers` | `revision_id`, `member_id`, `amount_minor`, `base_minor` |
| `expense_shares` | `revision_id`, `member_id`, `share_minor`, `base_minor` |
| `trip_categories` | `key`, `label`, `position`, `is_default` |
| `attachments` | `owner_type = expense`, `owner_id`, `r2_key`, `mime`, `bytes`, `sha256`, `state` |
| Local | only the **current** revision is stored by default; older revisions load on demand. Money columns are `INTEGER`, converted by the money codec ([D-028][d028]). `local_state` (synced/pending/failed), `outbox`, `file_queue`, `kv` (dismissed duplicate pairs) |

Links to an itinerary item or booking live only on the planning side (`linked_expense_id`); linking never adds a revision.

## 8. API requirements

| Op / endpoint | Source | Notes |
|---|---|---|
| `expense.create` | [06 §4][sync] | full revision: amount, currency, rate, `is_refund`, payers, `split_input`, items, shares |
| `expense.edit` | [06 §4][sync] | `base_revision_id` + patch; the money group is replaced as a whole ([D-019][d019]) |
| `expense.delete` | [06 §4][sync] | `base_revision_id` |
| `category.upsert` / `category.delete` | [06 §4][sync] | last write wins per field |
| `attachment.register` / `attachment.delete` | [06 §4][sync] | id, owner, mime, bytes, sha256 / id |
| `POST /sync-push` | [04 §2.1][api] | server re-runs `@toli/engine`; rejects `split_mismatch` (shares don't add up), `amount_too_small`, `entity_deleted`, `trip_settled`, `base_revision_missing`, `removed_member_balance`, `attachment_limit` |
| `POST /upload-url` → PUT to R2 → `POST /upload-confirm` | [04 §4][api] | receipt photos |
| `POST /download-url` | [04 §4.3][api] | viewing a receipt on another phone |
| Revision history | read through PostgREST (`expense_revisions`, select only) | loaded on demand |

Money in every payload is a **string of integer minor units** ([D-014][d014]).

## 9. UI requirements

| Screen | Needs (reference copy) |
|---|---|
| [add-expense](../screens/add-expense.md) | Header "Add expense" + **↻ repeat** chip; "₹" + amount + blinking lime caret; live line in mono lime: "Amount is the only thing you need" → "₹300 each · 4 people" / "Split 4 ways · Exact" / "Split needs fixing"; "What for? (optional)"; tiles PAID BY (opens `PayerSheet`) / SPLIT / BILL (**Attach photo** / **Scan (PRO)**); `DateCurrencyChip` "Today · ₹ ▾"; category chips; keypad `1–9, 00, 0, ⌫`; **Save & tear stubs ✂** (lime when valid, raised grey when not). Toasts: "Type an amount first", "₹120 still unassigned". |
| Duplicate sheet | "Already logged?" + "…within 10 minutes of this one"; **Same one, skip** (lime) / **Save anyway** |
| [tear-overlay](../screens/tear-overlay.md) | Ticket with label "New expense", title, amount, "Aditya paid · split 4 ways"; stubs fly to each person who owes a share; honest toast (§6.4). |
| [trip-home](../screens/trip-home.md) | Recent list (last 5) + **See all**: category mark tile, title, "Rahul paid · 4 people", amount (mono), "yours ₹200" or "not in this"; pending rows show "SAVED ON PHONE · WILL SYNC" |
| [all-expenses](../screens/all-expenses.md) | Every expense, grouped by day; search; filter by person and category; same row design as Recent |
| [expense-detail](../screens/expense-detail.md) | amount, payer(s), shares (removed members greyed **Removed**), category, date, receipts, **Edit**, **Delete**, **History** (older revisions load on demand); a Refund tag (R1b) |

## 10. States

| State | Display |
|---|---|
| Draft empty | amount "0" in raised grey; Save disabled |
| Draft valid | Save lime |
| Draft invalid split | Save grey; live line "Split needs fixing" |
| Saved, pending sync | row subtitle "SAVED ON PHONE · WILL SYNC"; toast "Saved · sending when you're online" |
| Synced | normal row |
| Failed | row badge + item in Unresolved changes |
| Edited | "Edited" tag; history available |
| Refund (R1b) | "Refund" tag; amount shown with "back" |
| Deleted | gone from lists; visible in history and the feed |
| Photo uploading / waiting for Wi-Fi / failed | small indicator on the receipt thumbnail |
| Unknown field from a newer server | "Update the app to see this" (lenient parsing, [D-026][d026]) |

## 11. Edge cases

- **App killed mid-entry:** the saved expense and its outbox op are atomic ([06 §8][sync]). Proposed: persist the draft in `kv` so a half-typed amount survives a kill.
- **Payer is not a participant** (Aditya pays for a cab he isn't in): allowed in every mode ([splitting](splitting.md)).
- **Only participant is the payer:** saves; no stubs; toast "Saved".
- **Expense paid from the kitty:** the payer shows "Kitty"; see [kitty](kitty.md).
- **Two people edit the same expense offline:** description/category/date changes both survive; if both changed money fields, the last one received wins as a whole group, and the earlier editor is told ([D-019][d019]).
- **Edit vs delete:** delete wins; the edit lands in Unresolved changes with **Restore as new expense**.
- **Edit an old expense that included a removed member:** the removed member is greyed out; any change to their share is rejected (`removed_member_balance`).
- **Editing the amount after exact splits were set:** the split becomes invalid until fixed ("₹200 unassigned").
- **Tiny foreign amount** (1 VND on an INR trip, R2): rejected with "This is less than ₹0.01 in INR" (`amount_too_small`).
- **Dated before the trip starts:** "Booked before trip" turns on by default.
- **Dated after the trip ends:** "After the trip ended?" warning; still allowed.
- **Duplicate check for offline phones:** compared on `spent_at`, so a dinner logged on two phones offline and synced 3 hours apart still prompts on pull.
- **Genuine repeat** (two ₹800 cabs 5 minutes apart, by different people): **Save anyway**; the pair isn't asked about again.
- **More than 5 photos:** the add button disappears at 5.
- **Photo on a phone with no Wi-Fi for days:** "Waiting for Wi-Fi · Upload now" on the thumbnail.
- **Settled trip:** the + button is hidden; deep links to add-expense show "This trip is settled. Reopen to edit."

## 12. Permissions

Who can add, edit and delete expenses, attach or delete photos and add categories is defined **only** in the [permission matrix, 09 §2.3][perm] ([D-031][d031]). In short: any claimed member can add, edit or delete **any** expense (every change is in the history and notified); photo delete is the uploader or an organiser. Ghosts are recorded by others; web viewers can't change expenses.

## 13. Offline behaviour

- The whole flow works offline. Balances update locally in well under 100 ms ([06 §3.1][sync]).
- The duplicate check on save uses local data; the pull check catches the rest.
- Photos queue until Wi-Fi (or any network if the user overrides).
- The save toast never claims something was sent while it's still on the phone.

## 14. Sync behaviour

- Each save = one op in the outbox, drained oldest first, ≤ 50 per request.
- The server recomputes shares from `split_input`. If the phone's shares **don't add up**, the op is rejected with `split_mismatch`. If they add up but **differ** from the server's (an older engine), **the server's result wins**, is written locally, and the difference goes to Sentry ([06 §6][sync]).
- On pull, results replace local rows; pending local edits on the same expense are rebased on top.
- After a pull, run the duplicate check for newly arrived expenses against this user's own recent expenses.
- The phone parses server data **leniently**: unknown fields are ignored ([D-026][d026]).

## 15. Analytics

| Event (PRD §19) | Properties |
|---|---|
| `expense_added` | `split_mode`, `payer_count`, `currency`, `offline?`, `entry_method` (keypad, repeat, scan, voice), **`duration_ms`** (main dashboard) |
| `split_mode_changed` | see [splitting](splitting.md) |
| `receipt_scanned` | Pro scans only ([receipt-scan](receipt-scan.md)) |
| `sync_conflict` | `type` (edit_edit, money_group, edit_delete, duplicate), `resolution` |

Proposed, not in PRD §19: `duplicate_prompt_shown` (`on: save|pull`, `choice`), `expense_edited`, `expense_deleted`, `refund_added` (R1b), `all_expenses_opened`.

## 16. Error handling

| Case | Message |
|---|---|
| Save with no amount | Toast "Type an amount first" |
| Invalid split | Toast "₹120 still unassigned" / "5% still unassigned" |
| `split_mismatch` from server | Unresolved change: "This split didn't add up, so it wasn't saved." + **Fix split** |
| Valid but different shares (older engine) | Silent: server result wins; row updates; Sentry report |
| `amount_too_small` | "This is less than ₹0.01 in INR." |
| `entity_deleted` (edit after delete) | Unresolved: "Neha deleted *Dinner*. Your edit wasn't saved." + **Restore as new expense** |
| `removed_member_balance` | "This changes Jay's balance. Add Jay back first." |
| `trip_settled` | "This trip is settled. Reopen to edit." |
| Photo too large / wrong type | "That file can't be attached. Try a photo or PDF under 10 MB." |
| `attachment_limit` | "An expense can have up to 5 photos." |
| Upload failed | Thumbnail badge "Couldn't upload · Retry"; photo kept |

## 17. Testing

- **Golden fixtures** ([07 §14][engine]): G1 (Appendix A), G2 (₹1,000 ÷ 3), G3 (multi-payer), G4 (late joiner), G7 (delete restores exactly), G14 (removed member), G15 (refund, R1b).
- **Property tests (fast-check):** any sequence of create/edit/delete keeps Σ balances = 0; deleting restores every balance; description edits never change shares; every saved expense has `base_amount ≥ 1`.
- **Money group:** two phones change amount and split offline → the result is one whole, valid revision; the earlier editor is told.
- **Duplicate rule:** amount/currency/`spent_at`/creator combinations, on save and on pull; two offline devices syncing 3 hours apart still prompt; "Keep both" not re-asked.
- **Money codec:** every money read/write goes through `money-codec.ts`; values above `Number.MAX_SAFE_INTEGER` assert; lint bans `number` money elsewhere ([D-028][d028]).
- **Copy:** the save toast matches reality (ghosts named for WhatsApp; offline says "sending when you're online").
- **Performance:** local save ≤ 100 ms and balance recompute ≤ 50 ms on a 500-expense trip on a ₹15,000 Android.
- **Kill tests:** kill during save and during push: no loss, no duplicates ([06 §9][sync]).
- **Keypad:** INR `00` key; decimal currencies' `.` key; 8-digit cap; screen-reader labels ("one thousand two hundred rupees").
- **E2E:** measure `duration_ms` on a real mid-range phone; p50 ≤ 5 s with defaults.

## 18. Future considerations

- Voice entry parsed into a draft (SHOULD).
- Home-screen quick-add widget and share-sheet target (SHOULD).
- SMS/UPI auto-capture: deferred beyond v1 (Play policy).
- Negative adjustments (a discount for one person): not in v1.
- Recurring expenses (for non-trip groups, post-v1).

## 19. Open questions

Resolved:
- Duplicate rule: PRD rule compared on `spent_at`, both sheets as in §6.6 ([06 §5][sync]).
- Default category: none, saved without = Misc (OQ-P15).
- Who may edit or delete someone else's expense: any claimed member ([permission matrix][perm]).
- Two money edits at once: the money group wins as a whole ([D-019][d019]).
- Refunds: a Refund type in R1b ([D-029][d029]).
- "Same day" across time zones: the trip's `time_zone` ([03 §4.1][db]).
- A full list of expenses: [All expenses](../screens/all-expenses.md) in R1a.
- Date / booked-before control: **Today · ₹ ▾** (review U-4).
- Payer entry: the payer sheet with **+ Add payer** (review U-8).
- Receipt photo limit: enforced by the server (`attachment_limit`).

Still open:
1. **Category chips:** the prototype shows 8 chips (no Tolls, Tips), but the kitty list uses "Tolls". Show all 10?
2. **`duration_ms` start point:** PRD §5 measures "from app icon tap"; the metric table says "app-open → expense saved". Proposed: measure from the add screen, and track cold start separately.

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[ds]: ../13-design-system.md
[perm]: ../09-security.md#permission-matrix
[d006]: ../decisions/D-006-append-only-money.md
[d013]: ../decisions/D-013-keypad-entry.md
[d014]: ../decisions/D-014-ids-and-wire-money.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d019]: ../decisions/D-019-money-edit-group.md
[d026]: ../decisions/D-026-write-path-and-compat.md
[d028]: ../decisions/D-028-money-in-sqlite.md
[d029]: ../decisions/D-029-refund-expense.md
[d030]: ../decisions/D-030-removed-members-locked.md
[d031]: ../decisions/D-031-permission-matrix.md
