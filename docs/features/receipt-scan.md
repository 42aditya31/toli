# Feature · Receipt scan and itemised split (F4)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R2, Pro.** Receipt **photos** are R1a and free. The itemised split **by hand** is R1b and free. Only **scanning** is R2 and Pro ([D-017](../decisions/D-017-itemised-free-scan-pro.md), [D-018](../decisions/D-018-r1a-r1b-scope.md)) |
| **PRD refs** | F4, F3 (photos, duplicates), F9 (category suggestion), §9.1 (itemised mode), §15 (Pro), §16 (third-party, testing), §18 (zero retention), §19, §21 (risk "Receipt extraction disappoints") |
| **Related** | Screens: [receipt-scan](../screens/receipt-scan.md) · [split-editor](../screens/split-editor.md) · [pro-sheet](../screens/pro-sheet.md) · [expense-detail](../screens/expense-detail.md) · [add-expense](../screens/add-expense.md) · [trip-home](../screens/trip-home.md) · Docs: [03 §5.2–5.5, §7.1](../03-database-schema.md) · [04 §4, §7](../04-api-schema.md) · [06 §4](../06-syncing.md) · [07 §5.1](../07-calculation-engine.md) · [02 §5.3](../02-architecture.md) · Features: [pro-pass](pro-pass.md) · Decisions: [D-006](../decisions/D-006-append-only-money.md), [D-011](../decisions/D-011-server-writes.md), [D-013](../decisions/D-013-keypad-entry.md), [D-017](../decisions/D-017-itemised-free-scan-pro.md) |

---

## 1. Purpose

Let the person holding a restaurant bill take one photo, get the line items read for them, tap faces to say who had what, and save a fair itemised expense. Tax, service charge and tip are shared by what each person ate, not by head count.

## 2. User problem

- A dinner bill has 10–15 lines. Typing them on a phone at the table does not happen, so groups fall back to "just split it equally", which is visibly unfair to the person who had a soda while others had beer.
- Doing the tax maths by hand ("GST 5% plus 10% service, on my share only") is error-prone and slow.
- If an app "reads" the bill wrongly and saves it silently, trust in every number is gone (PRD §5.7).

## 3. Business goal

- The headline **Pro** feature: "highest perceived magic" and the only Pro feature with a real per-use cost (PRD §15). It is bought mid-trip, at peak pain, by the Organiser.
- Inference cost is **always paired with revenue** because scanning is Pro-only (PRD §21).
- Supports the R2 ship criterion "Pro attach rate measurable" (PRD §20).

---

## 4. User flow

**Happy path (Pro trip, online)**

1. The user starts a scan from one of three places:
   - the **BILL** tile on Add expense. It opens a small choice: **Attach photo** (free) or **Scan (PRO)** (review U-6). The user picks **Scan (PRO)**;
   - **Scan a bill** on the Trip home Recent card;
   - **Scan bill · PRO** at the top of the manual item list (the split editor's **Itemised** chip, [D-017](../decisions/D-017-itemised-free-scan-pro.md)).
2. If the trip is not Pro, the [Pro sheet](../screens/pro-sheet.md) opens (see §10 States). The user can buy, choose **Just attach the photo** (free), or type the items by hand (free). The free photo attach is never hidden behind the Pro sheet.
3. The camera opens with a frame guide. The user takes the photo (or picks one from the gallery).
4. The phone compresses the image (1600 px, JPEG q0.7) and **strips EXIF/GPS** ([02 §4](../02-architecture.md)). It creates the `attachments` row locally, with a new expense ID as the owner.
5. The phone uploads it straight away through `/upload-url` → PUT to R2 → `/upload-confirm`. A scan is a user-initiated action, so it **ignores the Wi-Fi-only upload default** for this one photo (OQ-P17 in [01](../01-overview.md#open-questions)).
6. The phone calls `POST /receipt-extract { trip_id, attachment_id }`. The screen shows the "Reading the bill…" scan-line animation.
7. The server sends the image to the extraction provider, validates the JSON with Zod, converts every amount to integer minor units, and returns `{ draft, confidence }`. If the lines don't add up to the printed total, that is **not a failure**: the draft comes back with `total_mismatch_minor` (the difference) so the user can fix it ([04 §1](../04-api-schema.md)).
8. The **review screen** opens (title: merchant name + "· review"): every line item with face chips, the extras line (e.g. "GST 5% + service 10%"), the total, and a live per-person strip.
9. The user taps faces to assign each item. Every field in the draft is editable: merchant, date, currency, item names and amounts, extras, total, payer.
10. When items + extras − discounts = total and every item has at least one person, **Confirm & tear stubs** turns lime.
11. On confirm, the phone runs the itemised split through `@toli/engine` ([07 §5.1](../07-calculation-engine.md)), runs the duplicate check, and writes one `expense.create` op (split mode `itemised`) in one SQLite transaction.
12. The tear-stubs animation plays; the toast says who got stubs. The photo stays on the expense.

**Failure path**

1. Extraction fails (`422 extraction_failed` with a `reason`, [04 §1](../04-api-schema.md)), times out, or the phone is offline.
2. The app says: "Couldn't read this bill. Your photo is saved. Type the total and we'll split it." and opens the Add expense keypad with the photo already attached.
3. The failed attempt does **not** count against the trip's daily scan limit (§6).

**Scan an existing photo later**

1. On an expense that already has a receipt photo (e.g. taken offline), [expense detail](../screens/expense-detail.md) shows **Scan this receipt** (Pro).
2. Steps 6–10 run the same way. Confirm writes an `expense.edit` (a new revision), not a new expense.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| RS-01 | Receipt **photo** attachment (up to 5 per expense) is available on every trip, free, always. | MUST | F4, F3, §15 |
| RS-02 | On a Pro trip, extract merchant, date, currency, total, tax, service charge, tip, discounts and line items from a photo into structured JSON. | MUST | F4 |
| RS-03 | Extraction runs **server-side only** through `/receipt-extract`. No provider key is ever in the app. | MUST | §16 |
| RS-04 | Production uses a **paid** LLM vision tier whose terms say our data is **not used for training**. The Gemini **free** tier is never used, in any environment that sees real user photos. | MUST | §16, §18 |
| RS-05 | A **zero-retention** agreement with the provider is verified contractually and recorded before F4 ships. | MUST (release-blocking) | §18 |
| RS-06 | Show extraction as an **editable draft**. Never write an expense from extraction without the user's confirmation. | MUST | F4 |
| RS-07 | Each line item can be assigned to one or more people; an item is split equally among its assignees. | MUST | F4 |
| RS-08 | Tax, service charge and tip are prorated **by assigned subtotal**, not by head; discounts likewise ([07 §5.1](../07-calculation-engine.md)). | MUST | F4 |
| RS-09 | Never save when items + extras − discounts ≠ total. Show the difference and let the user fix it. | MUST | F4, [07 §5.1](../07-calculation-engine.md) |
| RS-10 | On any failure, keep the photo and fall back to manual entry with a clear message. Never lose the photo. | MUST | F4 |
| RS-11 | A 200-receipt Indian benchmark exists **before ship**, and the feature meets ≥ 95% accuracy on total and ≥ 85% on line items against it. | MUST (release-blocking) | F4, §16 |
| RS-12 | Accuracy is re-measured on every release and on every provider or model change. | MUST | §16 |
| RS-13 | Never "charge" for a failed scan: failures don't use up the daily scan allowance, and a trip whose scans systematically fail is eligible for a refund of the pass (see [pro-pass](pro-pass.md)). | MUST | §21 |
| RS-14 | Use the extracted merchant to suggest a category when the on-device keyword map has no match. | SHOULD | F9 |
| RS-15 | Highlight low-confidence fields in the draft so the user checks them first. | SHOULD | F4 |
| RS-16 | Log `receipt_scanned` with success, confidence and whether the user edited the draft. | MUST | §19 |

---

## 6. Business rules

1. **Pro check:** extraction is allowed only when `trips.is_pro = true`. The server is the gate (`403 pro_required`); the phone only hides the entry point.
2. **Limit:** 30 extractions per trip per day ([04 §7](../04-api-schema.md)). Only **successful** extractions count. Failures (`unreadable`, `not_a_receipt`, `provider_unavailable`, `timeout`) do not ([04 §1](../04-api-schema.md)). A draft whose total doesn't match is a **success**, not a failure: it carries `total_mismatch_minor`.
3. **Draft is never money.** Nothing reaches `expense_revisions` until the user taps Confirm.
4. **Default assignment:** every item starts assigned to all participants active on that date (the same default as a normal expense, PRD F3). Doing nothing gives an equal split of items, which is safe. The user untaps faces to narrow it.
5. **Every item needs at least one person** before Confirm is enabled.
6. **Money is integers.** The provider returns decimal strings; the server parses them into minor units using the currency exponent from the engine's ISO 4217 table. Floats are rejected by the Zod schema.
7. **Extras mapping** to `expense_items.kind`: tax lines (GST, CGST, SGST, VAT) → `tax`; service charge → `service`; tip → `tip`; discount/offer → `discount`; the bill's "round off" line (±) → `round_off`, prorated like an extra ([03 §5.5](../03-database-schema.md)).
8. **Currency:** if the bill currency differs from the trip base, the normal FX rules apply: the rate is frozen at confirm ([multi-currency](multi-currency.md)).
9. **Payer** defaults to the scanning user, as with any expense.
10. **Duplicate check** (PRD F3) runs on confirm, exactly like a keypad expense.
11. **Refund of the pass** does not remove itemised expenses already saved. Money is never paywalled (PRD §5.1).
12. **Manual itemised entry and editing** is free on every trip, Pro or not, from R1b ([D-017](../decisions/D-017-itemised-free-scan-pro.md), [D-018](../decisions/D-018-r1a-r1b-scope.md)). Only the scan that fills the list is Pro.
13. **Item IDs:** every item gets its own ID. Rounding for an item is seeded with that ID, so reordering items never moves paise ([07 §5.1](../07-calculation-engine.md)).
14. **Money group:** the items belong to the expense's money group. If two phones edit the items, amount or payers, the last money edit wins as a whole ([D-019](../decisions/D-019-money-edit-group.md)).

---

## 7. Data model

All tables are in [03](../03-database-schema.md). No new tables are proposed.

| Table | Use here |
|---|---|
| `attachments` | the photo: `owner_type = expense`, `owner_id` = the expense ID, `mime = image/jpeg`, `state` pending → uploaded |
| `expenses` / `expense_revisions` | the saved expense: `split_mode = itemised`, `split_input` holds the items and extras exactly as entered |
| `expense_items` | one row per item/extra: `id` (the rounding seed), `kind`, `label`, `amount_minor`, `assignee_member_ids` (items only), `position` (display order only) |
| `expense_payers`, `expense_shares` | the engine's output, as for every expense |
| `trips.is_pro`, `pro_passes` | the Pro gate |
| `rate_limit_buckets` | the 30-per-trip-per-day counter, key `receipt-extract:trip:<id>` |
| `file_queue` (phone only) | the upload; for a scan, `wifi_only = false` |

**Not stored:** the raw extraction draft and its confidence scores. Only the confirmed expense is saved. This keeps receipt contents out of our database beyond what the user confirmed (data minimisation, PRD §18). See Open question 1 for the accuracy-tracking trade-off.

---

## 8. API requirements

| Call | Detail |
|---|---|
| `POST /upload-url`, PUT to R2, `POST /upload-confirm` | [04 §4](../04-api-schema.md). The upload must be confirmed before extraction. |
| `POST /receipt-extract` | `{ trip_id, attachment_id }` → `{ draft: { merchant, date, currency, items[], extras[], total_minor, total_mismatch_minor }, confidence }`, or **422 `extraction_failed`** with a `reason`. Auth: member of a Pro trip. Limit 30/trip/day. [04 §7](../04-api-schema.md) |
| `expense.create` op | via `/sync-push`, split mode `itemised`, with `expense_items` in the payload ([06 §4](../06-syncing.md)) |
| `expense.edit` op | for "Scan this receipt" on an existing expense |

**Server pipeline inside `/receipt-extract`**
1. Check membership and `is_pro`; check the limit.
2. Check the attachment belongs to this trip, is `uploaded`, and is an image.
3. Get the image from R2 (server-side), send it to the provider with a strict JSON schema prompt.
4. Validate the response with Zod. Reject anything that isn't the schema → 422 `extraction_failed`, `reason: "unreadable"`.
5. Convert amounts to minor units. Compute `items + extras − discounts` and return the difference from the printed total as `total_mismatch_minor` (0 when it matches), so the phone can show a mismatch immediately. A mismatch is never a 422.
6. Log latency, provider, model version and success to Sentry/PostHog (no receipt content).

**Provider interface.** The Edge Function calls one internal `ReceiptExtractor` interface. Switching provider or model is a server deploy, never an app update.

| Environment | Provider | Data allowed |
|---|---|---|
| Development | Cloudflare Workers AI (free, ~130 receipts/day) or Groq free tier | **Test receipts only** (team's own and benchmark), never real user photos |
| Preview (internal QA) | the production provider (paid tier) | seed and test receipts only; never given to testers ([D-016](../decisions/D-016-testing-distribution.md)) |
| Production (includes the beta tester APK, [D-016](../decisions/D-016-testing-distribution.md)) | paid tier with no-training terms and zero retention, e.g. Gemini Flash-Lite (paid) or Mistral Small ([tech stack §5.11](../superpowers/specs/2026-09-24-toli-tech-stack.md)) | real photos |

Failure `reason` values are defined in [04 §1](../04-api-schema.md): `unreadable`, `not_a_receipt`, `provider_unavailable`, `timeout`. A total that doesn't add up is not one of them (see step 5).

---

## 9. UI requirements

Screen doc: [screens/receipt-scan](../screens/receipt-scan.md). From the UI reference (SCAN section):

- **Header:** back button, title "Scan bill" (camera) or "{Merchant} · review" (draft), and a lime **PRO** label.
- **Camera phase:** dark bezel (`color.bg.bezel`), a frame guide, a lime scan line moving top to bottom (1.8 s), caption "Reading the bill…".
- **Draft phase:**
  - Helper line: "Draft from your photo. Tap faces to assign each item. Tax and service follow each person's subtotal."
  - A card of items: name + mono amount, then a row of 32 px face chips (lime = assigned).
  - Extras line (muted): e.g. "GST 5% + service 10%" with its amount. Total line (bold).
  - A per-person strip: one tile per member with their live total (mono).
  - Primary CTA **Confirm & tear stubs ✂**, disabled (raised colour) until valid.
- **Mismatch banner** (shown when `total_mismatch_minor ≠ 0`): "Items add up to ₹3,480, bill says ₹3,520. ₹40 unassigned." with **Edit total** and **Add a line**.
- **Low-confidence fields** get a dotted underline and "Check this".
- **Split editor:** the **Itemised** chip (no PRO tag) opens the free manual item list; the mono `PRO` tag sits on its **Scan bill · PRO** button. On a non-Pro trip that button opens the [Pro sheet](../screens/pro-sheet.md) ([D-017](../decisions/D-017-itemised-free-scan-pro.md)).
- **Add expense:** the **BILL** tile opens a choice sheet: **Attach photo** (free) / **Scan (PRO)**, with the mono `PRO` tag on the scan option only (review U-6). **Trip home:** "Scan a bill" link on the Recent card.
- Accessibility: each face chip is labelled "Neha, assigned to Grilled prawns" / "not assigned"; money values have spoken labels ([13 §9](../13-design-system.md)).
- Reduce Motion: the scan line becomes a static frame with a spinner.

---

## 10. States

| State | What the user sees |
|---|---|
| Not Pro | [Pro sheet](../screens/pro-sheet.md): what scanning does, "₹149 · covers all 4 of you", **Unlock Pro**, and **Just attach the photo**; the manual item list stays usable |
| Camera permission not granted | Explanation + **Allow camera**, and **Pick from gallery** |
| Uploading | "Reading the bill…" (upload and extraction are one wait for the user) |
| Extracting | Scan-line animation; after 8 s, a line "Still reading. Long bills take a moment." |
| Draft, valid | Confirm enabled |
| Draft, mismatch | Banner with the difference; Confirm disabled |
| Draft, item with nobody | That item is outlined; "Pick at least one person" |
| Failed | Message + keypad with photo attached |
| Offline | **Scan (PRO)** shows "Needs internet". **Attach photo** stays available; later "Scan this receipt" |
| Daily limit reached | "30 scans today on this trip. Try again tomorrow, or type it in." |
| Saved (pending sync) | Normal expense row with "SAVED ON PHONE · WILL SYNC" |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Very long bill that needs two photos | v1 extracts one photo at a time. The user can add a second scan's lines into the same draft (**Add from another photo**), or edit manually. See Open question 2. |
| "Kingfisher × 4" as one line | One item; the user assigns the people who drank. Per-unit splitting is future (§19). |
| Prices already include tax (MRP grocery bill) | No extras; items sum to total. |
| Handwritten tip or cash tip not on the bill | The user adds a `tip` line or edits the total. |
| Bill in another currency (Bali) | Draft currency = detected currency; FX frozen at confirm. |
| Regional-language item names | Kept as printed; the user may rename. Part of the benchmark. |
| Photo is not a receipt | `reason: not_a_receipt`; doesn't count against the limit. |
| Scanned total is wrong but items are right | Mismatch banner; the user edits the total. |
| Two people scan the same bill | "Already logged?" sheet on confirm (**Same one, skip** / **Save anyway**), or on pull if both were offline ([06 §5](../06-syncing.md)). |
| Pass refunded mid-trip | New scans are blocked; saved itemised expenses stay unchanged. |
| A member in the draft is removed before confirm | Their chips disappear; items left with nobody must be reassigned. |
| Trip settled while the draft is open | Confirm is rejected (`trip_settled`); the draft is kept on the phone until the trip is reopened or discarded. |
| Old app sends floats | Rejected by Zod; server engine result wins ([06 §6](../06-syncing.md)). |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can add expenses and attach photos, and scan on a Pro trip; web viewers and ghosts can't. The server gate for scanning is `trips.is_pro` (`403 pro_required`).

**OS permissions:** camera (asked at first scan, with an explanation); photo library read only if the user picks from the gallery.

---

## 13. Offline behaviour

- **Scanning needs the network** (upload + server extraction). This is the one F4 step that cannot work offline.
- Offline, the user can still take the photo and save a keypad expense with it attached; the photo uploads later from `file_queue`.
- Once back online, **Scan this receipt** on that expense runs extraction and produces an `expense.edit`.
- Confirming a draft is a local write, so a draft received just before signal drops can still be confirmed and saved offline.

## 14. Sync behaviour

- The confirmed expense is a normal `expense.create` (or `expense.edit`) op: append-only revision, server recomputes shares from `split_input` and rejects any mismatch ([06 §6](../06-syncing.md)).
- The attachment syncs by `attachment.register` and the file queue; the expense can sync before the file finishes uploading.
- Conflicts follow [D-004](../decisions/D-004-conflict-strategy.md) and [D-019](../decisions/D-019-money-edit-group.md): if someone deletes the expense while another person re-scans it, delete wins and the edit goes to Unresolved changes. Two money edits (items, amount, payers) never merge line by line: the last one wins as a whole.

---

## 15. Analytics

| Event | Properties | Source |
|---|---|---|
| `receipt_scanned` | `success`, `confidence` (bucketed), `edited_after` (did the user change any extracted value), `reason` on failure, `latency_ms`, `item_count` | PRD §19 |
| `expense_added` | `split_mode = itemised`, `entry_method = scan`, `duration_ms` | PRD §19 |
| `pro_paywall_viewed` | `feature = receipt_scan` | PRD §19 |

Never send receipt contents, merchant names or amounts to analytics.

---

## 16. Error handling

| Error | User message | System |
|---|---|---|
| `403 pro_required` | Pro sheet | — |
| `429 rate_limited` | "30 scans today on this trip…" | `Retry-After` |
| `422 extraction_failed` (`unreadable`, `not_a_receipt`, `provider_unavailable`) | "Couldn't read this bill. Your photo is saved…" | not counted |
| Draft with `total_mismatch_minor ≠ 0` | Mismatch banner; Confirm disabled until fixed | a success; counted |
| `timeout` (provider > 20 s) | same as above | not counted; Sentry breadcrumb |
| Upload failed | "Photo will upload when you're back online." | stays in `file_queue` |
| `split_mismatch` on push | Unresolved changes entry | should not happen (client validates) |
| Provider returns invalid JSON | treated as `unreadable` | Sentry event with model version, no image |

---

## 17. Testing

- **Benchmark corpus (release gate):** 200 real Indian receipts: restaurants, bars and groceries, with thermal-print fade, regional-language items, crumpled and angled captures, CGST/SGST splits, service charge, round-off lines, discounts. Each has hand-labelled ground truth.
  - Collected with written consent from the team and beta users, redacted (card numbers, phone numbers), stored in a **private** R2 bucket, not in the Git repo.
  - Metrics: **total accuracy** = share of receipts where `total_minor` matches exactly; **line-item accuracy** = item-level F1 (amount exact, label fuzzy-matched).
  - Targets: ≥ 95% total, ≥ 85% line items. Results are tracked per release and per model version.
- **Engine:** golden fixture G9 (GST 5% + service 10%) plus property tests: Σ shares = total for random items, assignees and extras ([07 §13–14](../07-calculation-engine.md)).
- **Contract tests:** the Edge Function against a mocked provider: valid JSON, garbage JSON, floats, missing fields, timeouts.
- **Privacy tests:** uploaded images have no EXIF/GPS; logs contain no receipt text.
- **E2E (Maestro):** scan → assign → confirm → stubs; failure → keypad with photo attached; offline → attach only.
- **Limit test:** 31st successful scan returns 429; failures don't count.

---

## 18. Cost and free-tier impact

| Item | Limit / price | Expected usage | Breaking point | Upgrade |
|---|---|---|---|---|
| LLM extraction (prod) | ~₹0.05–0.15 per receipt (paid tier) | ~10–40 scans per Pro trip | max 30/day/trip → a 4-day trip costs ≤ ₹18 against a ₹149 pass | none needed; revenue-paired |
| Workers AI (dev) | ~130 receipts/day free | team testing | heavy benchmark runs | run the benchmark in batches, or on the paid provider |
| R2 storage | 10 GB free | ~150 KB per photo | ~65,000 photos | $0.015/GB-month |
| Edge Functions | 500k invocations/month | 3 calls per scan (upload-url, confirm, extract) | not a concern at launch | Supabase Pro $25/month |

---

## 19. Future considerations

- Split one line by quantity ("Kingfisher × 4": 2 for Rahul, 1 each for Jay and Aditya).
- Multi-photo stitching for long bills.
- On-device OCR as a first pass to cut cost and allow offline drafts.
- Remembered assignments ("Neha doesn't drink" pre-unassigns drinks).
- Scan UPI/card payment screenshots for amount + merchant.

## 20. Open questions

**Resolved:**
- Manual itemised entry is free (R1b); scanning is Pro and R2 ([D-017](../decisions/D-017-itemised-free-scan-pro.md), [D-018](../decisions/D-018-r1a-r1b-scope.md)).
- Failure reasons and "failures don't count" are in [04 §1](../04-api-schema.md). A total mismatch is not a failure; the draft carries `total_mismatch_minor`.
- `round_off` is an `expense_items` kind ([03 §5.5](../03-database-schema.md)).
- The BILL tile offers **Attach photo** / **Scan (PRO)** (review U-6).
- Scans upload immediately, even with "Wi-Fi only" on (OQ-P17, [01](../01-overview.md#open-questions)).

**Still open (feature-level, not blocking R2 planning):**

1. **Accuracy in production:** we don't store drafts, so we can only measure real-world accuracy through `edited_after`. Is that enough, or do we want opt-in draft retention for quality review?
2. **Two-photo bills:** is "Add from another photo" in scope for R2, or future?
3. **Which paid provider?** Gemini Flash-Lite (paid) vs Mistral Small: pick after running both on the benchmark, and only one whose zero-retention terms are signed.
4. **Refund policy for systematic scan failure** (RS-13): automatic, or on request through priority support?
