# Screen · Receipt scan (itemised bill)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R2, Pro.** Receipt **photos** are free from R1a. The **itemised split typed by hand** is free from R1b. Only **scanning** is Pro ([D-017](../decisions/D-017-itemised-free-scan-pro.md), [D-018](../decisions/D-018-r1a-r1b-scope.md)) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- SCAN -->` block (lines 603–655) and the `// scan` logic (lines 1242–1253, `SCAN` const line 945). Sidebar group "R2 · CONTEXT + PLANNING → Receipt scan". |
| **Related** | [features/receipt-scan](../features/receipt-scan.md) · [features/splitting](../features/splitting.md) · [features/pro-pass](../features/pro-pass.md) · [D-017](../decisions/D-017-itemised-free-scan-pro.md) · [pro-sheet](pro-sheet.md) · [03 §5.5 expense_items, §7.1 attachments](../03-database-schema.md) · [04 §4 files, §7 receipt-extract](../04-api-schema.md) · [06 §4 op types](../06-syncing.md) · [07 §5.1 itemised](../07-calculation-engine.md) · [13 §5 icons, §6 components](../13-design-system.md) · [add-expense](add-expense.md) · [split-editor](split-editor.md) · [tear-overlay](tear-overlay.md) |

---

## Purpose
**Why:** typing fourteen lines from a restaurant bill is the moment people give up. Splitting a bill evenly when Neha only had a lime soda is visibly unfair.
**What:** photograph the bill, get an **editable draft** of the items, tap faces to say who had what, and save it as one itemised expense. Tax and service follow each person's subtotal, not heads.
**How:** the photo is compressed and uploaded, `POST /receipt-extract` returns a draft that fills the same itemised item list you can also type by hand, the user fixes and assigns it, and **Confirm & tear stubs** saves one `expense.create` with `split_mode = itemised`. Nothing is ever saved without the user confirming (PRD F4).

## User goal
"I'm holding the bill. Let me snap it and assign items to people instead of typing."

## Entry points
| From | Trigger |
|---|---|
| [Trip home](trip-home.md) | **"Scan a bill"** link in the header of the **Recent** card (R2) |
| [Add expense](add-expense.md) | The **BILL** tile next to PAID BY / SPLIT opens a small choice sheet (review U-6): **Attach photo** (free, `Camera` icon: adds a receipt photo, no scan) / **Scan (PRO)** (`Scan` icon: this screen). On a free trip, **Scan (PRO)** opens the [Pro sheet](pro-sheet.md); **Attach photo** never does |
| [Split editor](split-editor.md) | The **Scan bill · PRO** button at the top of the Itemised manual item list (R1b+; the Itemised chip itself is free and has no PRO tag, [D-017](../decisions/D-017-itemised-free-scan-pro.md)) |

## Exit points
| To | Trigger |
|---|---|
| Tear overlay → [Trip home](trip-home.md) | **Confirm & tear stubs ✂**. The back stack is reset to Home (prototype sets `hist: ['home']`). |
| Previous screen | Back (`CaretLeft`) (a confirm sheet appears if the draft has been edited; Assumption) |
| [Add expense](add-expense.md) with the photo attached | Extraction failed or offline |
| [Pro sheet](pro-sheet.md) | Tapping **Scan (PRO)** on a trip that isn't Pro (before the camera opens) |

## UI structure

### Header (both phases)
`Header`: back button (`CaretLeft`, `size.iconButton`, `bg.raised`), title, and a **PRO** badge on the right (`type.labelS`, `color.accent` background, `color.onAccent` text, `radius.badge`).
| Phase | Title |
|---|---|
| Camera | **"Scan bill"** |
| Draft | **"<Merchant> · review"**, e.g. **"Thalassa · review"** (merchant from the draft; Assumption: "Bill · review" if no merchant was read) |

### Phase 1: Camera ("Reading the bill…")
- A frame filling the screen (margin 0 `space.gutter` 24, `radius.sheet`, `color.bg.bezel`).
- Prototype shows a stylised receipt (200 × 340, `color.text`, rotated −3°) with muted bars. **In the app this is the live camera preview**, then the captured photo frozen in place while reading.
- A lime **scan line** (3 px, `color.accent`, with a soft lime glow) sweeps top 8% → 86% → 8% on a 1.8 s loop (`ease.move`). Assumption: the glow and the guide border below become tokens (`shadow.scanLine`, `color.scanGuide`) in 13 before build, because the prototype used raw values.
- An inner guide border (inset 24, 2 px, `color.text` at 25%, `radius.cardS`).
- Caption at the bottom (`type.bodyStrong`): **"Reading the bill…"**
- Assumption (not in the reference, needed for a real camera): a round shutter button, a **gallery** button (pick an existing photo), and a flash toggle, shown before capture. After capture the caption and scan line appear.

### Phase 2: Draft review
Scrollable content (padding 0 `space.gutter` 16, gap `space.stack`), fades in (`dur.fast`, `ease.enter`).

1. **Helper text** (`type.caption`, muted): **"Draft from your photo. Tap faces to assign each item. Tax and service follow each person's subtotal."**
2. **Items card** (`Card`, `bg.card`, `radius.card`, padding 6 × 14). One block per line item, separated by `color.divider`:
   - Row: item name (`type.bodyStrong`) left, amount (`type.mono`) right. E.g. **"Mezze platter" ₹850**, **"Lamb souvlaki" ₹720**, **"Grilled prawns" ₹1,100**, **"Kingfisher × 4" ₹800**, **"Fresh lime soda × 2" ₹240**.
   - Row of **face toggles**: one `size.avatarS` circular `Avatar` per trip member. Assigned = `color.accent` background + `color.onAccent` text. Not assigned = `bg.raised` + muted text. Transition `dur.tap`.
   - **Extras row** (`type.caption` muted): the tax/service label left and the combined amount right, e.g. **"GST 5% + service 10%" ₹557**.
   - **Total row** (`type.bodyStrong`): **"Total"** and the amount, e.g. **₹4,267**.
   - **Mismatch row** (only when the draft's `total_mismatch_minor` ≠ 0): `WarningCircle` icon in `color.warning` + **"₹43 doesn't match the bill total. Fix a line."** (see States).
3. **Per-person tiles**: a 4-column grid (gap 6) of `bg.raised` tiles (`radius.chip`, padding 10 × 6): member name (`type.small` muted) above their total share (`type.monoS`). Updates live on every face tap.
4. **Footer** (fixed, padding 6 `space.gutter` 22): primary `Button`, `size.cta`, `radius.cta`, lime: **"Confirm & tear stubs"** with the `Scissors` icon.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; per-person tiles wrap to **2 columns**; face rows scroll horizontally.

Components: `Screen`, `Header`, `Card`, `Row`, `Avatar` (toggle variant), `Button` (primary), `Sheet` (edit item, paywall, discard), `Toast`, `TearOverlay`, `Icon`.

**Worked example (the prototype's default assignment):** subtotal ₹3,710, extras ₹557 (GST 5% ₹186 + service 10% ₹371), total ₹4,267. Tiles: **Aditya ₹1,183 · Rahul ₹1,381 · Neha ₹520 · Jay ₹1,183**. The prototype rounds to whole rupees and gives the leftover to the largest share. **The real app uses `allocate()` in paise** ([07 §5.1](../07-calculation-engine.md)), so paise may land differently. The engine rule wins.

## States
| State | Behaviour |
|---|---|
| Loading | Camera phase with the scan line and **"Reading the bill…"** while the photo uploads and `receipt-extract` runs. Assumption: after 8 s, the caption changes to "Still reading… long bills take a moment." |
| Empty | Draft came back with **no line items** but a total: show the total and one editable line "Bill" assigned to everyone, with the helper "We couldn't read the items. Add them, or split the total." (Assumption). |
| Populated | Draft review as above. |
| Total doesn't add up | **Not an error.** The draft comes back normally with **`total_mismatch_minor`** (items + extras − discounts minus the printed total). The mismatch row shows the difference and Confirm stays disabled until the user fixes a line ([04 §1](../04-api-schema.md), [07 §5.1](../07-calculation-engine.md)). |
| Error | Extraction failed (`422 extraction_failed`, reason `unreadable` / `not_a_receipt` / `provider_unavailable` / `timeout`): `Sheet` titled **"Couldn't read this bill"** with "Your photo is saved. Type the amount instead." and one action **"Enter it by hand"** → Add expense with the photo already attached. **The photo is never lost** (PRD F4), and a failed scan doesn't count against the 30-a-day limit ([04 §1](../04-api-schema.md)). |
| Offline | Scanning needs the internet. On capture, show the same sheet with "You're offline. Your photo is saved on this phone and will upload later." → **"Enter it by hand"**. The photo goes into `file_queue`. |
| Syncing | n/a on this screen. After confirm, the new expense shows the usual pending row on Trip home ("SAVED ON PHONE · WILL SYNC"). |
| Success | Tear overlay: label **"Itemised bill"**, title **"<Merchant> · itemised"** (e.g. "Thalassa · itemised"), sub **"You paid · 5 items split by who ate what"**, headline **"STUBS READY"**. Then Trip home and a toast built from reality ([13 §7.3](../13-design-system.md), review U-2): **"Rahul and Neha will get a stub · Share with Jay on WhatsApp"** (Jay is a ghost), or **"Saved · sending when you're online"** if the op hasn't synced. Never "sent" before the server confirms. |
| Disabled | **Confirm** is disabled (`bg.raised`, muted text, as on Add expense) while any item has **no face assigned**, or while items + extras − discounts ≠ the bill total (`total_mismatch_minor` ≠ 0 after edits). The status reason is shown above the button (Assumption): "Assign Lamb souvlaki to someone" / "₹43 doesn't match the bill total". |
| Partial data | Low-confidence fields (from `confidence`) are shown with a muted dotted underline and "check" hint (Assumption). A missing merchant falls back to "Bill". A missing tax line simply has no extras row. |

## Interactions
| Gesture | Result |
|---|---|
| Tap a face | Toggles that member on the item. Item splits equally among its faces. Tiles recompute instantly. |
| Tap an item name or amount | Opens an edit `Sheet` (name + keypad amount + delete). Assumption: the reference only shows face toggles, but PRD F4 requires an editable draft. |
| Tap the extras row | Expands to one row per extra (GST, service, tip, discount), each editable. Assumption. |
| "+ Add item" row at the end of the card | Adds a blank line. Assumption. |
| Tap **Confirm & tear stubs** | Saves the expense locally, plays `TearOverlay`, returns Home. Tap skips the animation. |
| Back | If edited: `Sheet` "Discard this scan?" with **Discard** / **Keep editing**. The photo stays attached to nothing and is cleaned up (Assumption). |
| Non-Pro trip, tap **Scan (PRO)** | Opens the [Pro sheet](pro-sheet.md) instead of the camera ([D-017](../decisions/D-017-itemised-free-scan-pro.md)). Closing it leaves you where you were; the manual itemised list and **Attach photo** always work. Fires `pro_paywall_viewed` (`feature: receipt_scan`). Beta testers' trips are Pro **by grant**, so they go straight to the camera. |

Default payer is the draft's payer from Add expense, or **you** when opened from Home (prototype: "You paid"). Assumption: a "PAID BY" chip above the Confirm button lets it be changed, like Add expense.

## Data
| Reads | From |
|---|---|
| Trip members and initials (face toggles, tiles) | `trip_members` (SQLite), non-removed, ordered by position |
| Is the trip Pro? | `trips.is_pro` |
| Base currency, category | `trips.base_currency`, `trip_categories`. No default category: one is auto-suggested from the description/merchant, and an expense saved without one shows as "Misc" (OQ-P15) |
| The draft | In-memory Zustand draft, seeded from the `receipt-extract` response |

## API / Database
| Step | Call / write |
|---|---|
| 1. Capture | Compress to 1600 px JPEG, strip EXIF ([02 §4](../02-architecture.md)). Local `attachments` row (`owner_type = expense`, `state = pending`) + `file_queue` entry. |
| 2. Upload | `POST /upload-url` → PUT to R2 → `POST /upload-confirm` ([04 §4](../04-api-schema.md)). **Scanning uploads immediately, even when "upload on Wi-Fi only" is on**, because the user asked for it (OQ-P17). |
| 3. Extract | `POST /receipt-extract { trip_id, attachment_id }` → `{ draft: { merchant, date, currency, items[], extras[], total_minor, total_mismatch_minor }, confidence }`, or `422 extraction_failed` with a `reason` (`unreadable`, `not_a_receipt`, `provider_unavailable`, `timeout`). A total that doesn't add up is **not** a 422; it comes back in the draft as `total_mismatch_minor` ([04 §1](../04-api-schema.md)). Pro trips only (`403 pro_required`), 30 per trip per day (`429 rate_limited` → treat as failure). |
| 4. Confirm | One SQLite transaction: `expense.create` op with `split_mode = itemised`, `split_input` = items + assignees + extras, `description` = "<Merchant> · itemised", payers, and shares from `@toli/engine` §5.1; `expense_items` rows (`kind` item/tax/service/tip/discount/round_off, `assignee_member_ids`); `attachment.register` for the receipt with `owner_id` = the new expense. |
| 5. Sync | Outbox → `POST /sync-push`. The server recomputes shares and rejects `split_mismatch` if items + extras ≠ amount ([06 §6](../06-syncing.md)). |

## Edge cases
- **Scanned total doesn't match the items** (misread line): the draft arrives with `total_mismatch_minor`; Confirm stays disabled, the difference is shown with a warning icon, the user fixes a line. We never save a mismatch ([07 §5.1](../07-calculation-engine.md)).
- **Removed member on the trip:** not shown as a face; they can't be assigned ([D-030](../decisions/D-030-removed-members-locked.md)).
- **An item nobody is assigned to** (prototype would silently drop it): blocked, see Disabled.
- **Bill in another currency** (Bali): the draft's `currency` is used; FX is frozen on confirm as with any expense ([07 §4](../07-calculation-engine.md)).
- **Discount line**: subtracted in proportion to subtotals.
- **Tip written by hand**: not read by extraction; the user adds it as an extra.
- **More than 4 members**: tiles wrap to more rows of 4; face rows scroll horizontally past ~8 faces (Assumption).
- **Member left out of every item**: gets no share and no stub.
- **Same bill logged twice** (another member added the same amount within 10 minutes): the duplicate check from Add expense runs on confirm and shows **"Already logged?"** with **"Same one, skip"** / **"Save anyway"** ([06 §5](../06-syncing.md)).
- **Extraction limit hit** (30/day): same as failure; the photo is kept.
- **Photo limits:** at most 5 receipt photos per expense (`attachment_limit`) and 10 MB per file ([04 §2.1](../04-api-schema.md)).
- **Pro bought mid-scan on another phone**: `is_pro` arrives by sync; retry works.

## Analytics
| Event | When | Properties |
|---|---|---|
| `receipt_scanned` | Extraction returns | `success`, `confidence`, `edited_after` (set on confirm: did the user change any item?) |
| `expense_added` | Confirm | `split_mode: itemised`, `payer_count`, `currency`, `offline?`, `entry_method: receipt_scan`, `duration_ms` |
| `pro_paywall_viewed` | Non-Pro trip | `feature: receipt_scan` |

## Accessibility
- Each face toggle is a checkbox: "Neha, not on Lamb souvlaki. Double-tap to add."
- Each item is read as "Grilled prawns, one thousand one hundred rupees, shared by Aditya and Jay."
- Tiles read "Rahul pays one thousand three hundred eighty-one rupees."
- The scan line is decorative; the status "Reading the bill" is announced as a live region.
- Reduce Motion: the scan line is replaced by a static frame and a spinner; the tear overlay is replaced by the toast.
- Face toggles are 32 px visually; the hit area is padded to 44 × 44.

## Open questions / assumptions
- **Assumption:** the draft is fully editable (names, amounts, add/delete lines, extras). The reference shows only face toggles.
- **Assumption:** the extras are shown on one combined row as in the reference, expandable to edit.
- **Resolved:** scanning bypasses "Wi-Fi only" (OQ-P17 in [01](../01-overview.md#open-questions)).
- **Resolved:** no default category; auto-suggested, else "Misc" (OQ-P15).
- **Resolved:** the BILL tile offers **Attach photo** / **Scan (PRO)**, so a free trip never hides the free photo attach behind a paywall (review U-6).
- **Resolved:** `total_mismatch` is not a failure reason; the draft carries `total_mismatch_minor` (review C-10).
- **Note:** the Tear to Split reference shows "Dinner at Thalassa ₹4,800, Equal · 4 people" while the scan draft totals ₹4,267 itemised. These are separate demos; the numbers are illustrative only.
