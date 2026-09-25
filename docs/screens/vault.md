# Screen · Vault (bookings and documents)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R3 (Vault tab in the R3 tab bar) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- VAULT -->` block (lines 742–787), `BOOK` const (lines 953–958), `// vault` logic (lines 1269–1272). Tab bar "Vault" (line 873). Sidebar: "R3 · VAULT + MEMORY → Bookings vault". |
| **Related** | [features/vault](../features/vault.md) · [features/expenses](../features/expenses.md) · [features/budget](../features/budget.md) · [features/pro-pass](../features/pro-pass.md) · [03 §6.3 bookings, §7.1 attachments](../03-database-schema.md) · [04 §4 files](../04-api-schema.md) · [06 §4 booking.*, attachment.register, attachment.delete; §5 settled allow-list](../06-syncing.md) · [09 §5 storage](../09-security.md) · [permission matrix](../09-security.md#permission-matrix) · [13 §6](../13-design-system.md) |

---

## Purpose
**Why:** at the airport gate with no signal, someone needs the PNR, and it's in a PDF in someone else's email. The vault's whole point is **offline access** (PRD F13).
**What:** every booking as a ticket (flight, train, bus, hotel, cab, activity), a **NEXT UP** card for what's coming, and trip documents (IDs, insurance, waivers), all marked available offline.
**How:** bookings are `bookings` rows (field-LWW), files are `attachments` in private R2, downloaded once via signed URL and kept on the phone.

## User goal
"Show me the ticket for what's next, right now, even without internet."

## Entry points
| From | Trigger |
|---|---|
| `TabBar` | **Vault** tab |
| Trips list | Assumption: the PLANNING card subtitle "3 bookings" |
| Budget / expense | Assumption: "Linked to booking" on an expense opens that booking expanded |

## Exit points
| To | Trigger |
|---|---|
| Other tabs | Trip · Plan · Feed, or **+** |
| Document viewer | Tap a document (Assumption: full-screen PDF/image viewer) |
| Linked expense | Tap the link line of an expanded booking (Assumption) |
| Add / edit booking sheet | Assumption: header action or long press |

## UI structure

### Header (tab screen)
- Left: **"Vault"** in `type.title` (28/800).
- Right: badge **"✓ ALL OFFLINE"** (mono 11/700, `color.accent` text on `bg.card`, radius 10, padding 6 × 10). Shown only when every attachment is downloaded (see States).

### Content (scroll, padding 0 18 110, gap 12)
1. **NEXT UP card** (`Banner` look: `bg.raised`, radius 20, padding 14 × 16):
   - A 10 px lime dot with a pulsing ring (1.6 s loop, `ease.move`; Reduce Motion stops it).
   - Middle: 11 px muted **"NEXT UP · in 1h 20m"**, then 15/600 **"Scuba · Grande Island, 12:00"**.
   - Right: the reference in mono 12/700 **"SCB-4471"**.
2. **Booking tickets**, one per booking. A `TicketCard` variant (radius 22):
   - **Collapsed:** `bg.card` background, text colour. Padding 14 × 16, gap 6:
     - Top line (mono 10/700, +0.1em, 70% opacity): **"FLIGHT · IndiGo"** left, **"TUE 15 OCT · 17:25"** right.
     - Title row: **"GOI → BLR"** 20/800 left, cost **"₹16,800"** mono 13/700 right.
     - Meta (12 px, 75% opacity): **"PNR M3P9TR"** · **"4 travellers"**.
   - **Expanded** (one at a time): background turns **lime** with `color.onAccent` text (250 ms). Below the header: a dashed perforation (`color.perforation`, 2 px, inset 14), then padding 14 16 16:
     - A **QR / barcode** square 84 × 84, radius 10, `color.onAccent` background. The reference shows the text **"QR placeholder"** (mono 10/700 lime).
     - To the right: the PNR large (mono 22/700, +0.06em, **"M3P9TR"**), the detail line (12 px, **"6E-5318 · Seats 14A–14D · Gate opens 16:40"**), and the link line at 70% opacity:
       | Link line copy | When |
       |---|---|
       | **"Paid by Aditya before the trip"** | linked expense is `is_committed` |
       | **"Linked to expense · split 4 ways"** | linked to an expense |
       | **"Not yet linked to an expense"** | no linked expense |
   - Reference bookings: IndiGo GOI → BLR (PNR M3P9TR) · Casa Anjuna "2 rooms · 3 nights" (Conf HT-88213, "4 guests", "Check-out 11:00 · Breakfast included") · Goa Dive Co. "Scuba · Grande Island" (Voucher SCB-4471, "4 divers", "Pickup 10:30 from Baga jetty") · IndiGo BLR → GOI (PNR X7K2LQ, "6E-2143 · Completed").
   - Reference labels per type for the reference line: **PNR** (flight/train/bus), **Conf** (hotel), **Voucher** (activity). Assumption: cab/other use "Ref".
3. **Documents card** (`Card`, radius 22, padding 8 × 16): title **"Documents"** 15/600, then 52 px rows:
   - File tile 34 × 40, radius 6, `bg.raised`, type label at the bottom (mono 8/700 muted **"PDF"**; Assumption: **"IMG"** for images).
   - Name 14 px (**"Aadhaar · 4 copies"**, **"Travel insurance"**, **"Scuba waiver"**) and meta 11 px muted (**"PDF · 2.1 MB · all members"**, **"PDF · 640 KB · ICICI Lombard"**, **"PDF · 180 KB · signed"**).
   - Right: **"✓ OFFLINE"** (`type.labelS`, lime, with the `CloudCheck` icon).
   - **Visibility** ([03 §7.1](../03-database-schema.md) `attachments.visibility`): **"all members"** (`trip`, the default) or **"only you"** (`owner`: only the uploader can see it, e.g. a personal ID). An `owner` file shows a small lock and the meta **"only you"**. Other members never see the row: RLS and `/download-url` both hide it, and its `attachment.register` op is private (`trip_ops.visible_to_member_id`), so it isn't even pulled to their phones.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the expanded ticket stacks the QR square above the PNR.

Components: `Screen`, `Banner` (next up), `TicketCard` (booking variant with expand), `Card`, `Row`, `TabBar`, `Sheet`, `Toast`, `Icon`, `Button` (`danger` for Delete).

## States
| State | Behaviour |
|---|---|
| Loading | n/a for bookings (SQLite). Documents not yet on the phone show a spinner in place of "✓ OFFLINE" while downloading. |
| Empty | Assumption: no NEXT UP card; a dashed card **"No bookings yet"** with "Add flights, hotels and tickets so they're here without signal." and **"+ Add booking"**; Documents card shows **"+ Add a document"**. |
| Populated | As above. |
| Error | Download failed: the row shows **"Tap to retry"** in muted mono instead of "✓ OFFLINE". Upload failed: "Not uploaded · retry". |
| Offline | Everything already downloaded opens normally. A document not yet downloaded shows **"NOT ON THIS PHONE"** (muted) and can't open; the header badge is hidden (Assumption). |
| Syncing | A new document added by someone else appears with a download spinner, then "✓ OFFLINE". Auto-download follows the Wi-Fi rule (Assumption: documents < 5 MB download on any network, because offline access is the point). |
| Success | After adding a booking: toast **"Booking saved · works offline"** (Assumption). |
| Disabled | **Settled trips:** booking and document edits are not on the settled-trip allow-list ([06 §5](../06-syncing.md)), so they're rejected (`trip_settled`); add/edit/delete are hidden and documents stay readable offline. Who can add or delete what: [permission matrix](../09-security.md#permission-matrix). |
| Partial data | Booking without a cost: cost hidden. Without a time: `when` shows the date only (**"12–15 OCT"**). Without a reference: meta shows only "covers". Without a QR/ticket image: the square shows the booking type icon (Assumption). No upcoming bookings: NEXT UP card hidden. |

## Interactions
| Gesture | Result |
|---|---|
| Tap a booking | Expands it (lime) and collapses any other; tap again collapses. |
| Tap the NEXT UP card | Expands that booking and scrolls to it (Assumption). |
| Tap the PNR | Copies it; toast **"PNR copied"** (Assumption). |
| Tap the QR square | Full-screen ticket at maximum brightness for scanning (Assumption). |
| Tap a document | Opens the local file in a viewer. |
| Long press a booking / document | Edit · Link to expense · Delete (Assumption). |
| "+ Add" (Assumption: header action next to the badge) | Sheet: Booking (type, provider, reference, dates/times, cost, who it covers, attach ticket) or Document (pick file/photo, name, and **Who can see it: All members / Only me**). |
| Delete a document (long press → **Delete**, `danger`) | Confirm sheet **"Delete Travel insurance for everyone?"** → `attachment.delete`. The row disappears everywhere after sync; the file stays in the phone cache only until it's evicted (Assumption). |

**Order** (Assumption; the reference order is not chronological): upcoming bookings by `starts_at` ascending, then completed ones at the bottom with "· Completed" in the detail line. The **first upcoming booking is expanded by default**.

**NEXT UP** = the booking (Assumption: or itinerary item) with the nearest future `starts_at` within the next 24 hours. The countdown reads "in 1h 20m", "in 45m", "now".

## Data
| Value | Source (SQLite) |
|---|---|
| Bookings | `bookings` (type, provider, `title`, reference, `details`, starts_at, ends_at, cost_minor, currency, linked_expense_id, notes), not deleted ([03 §6.3](../03-database-schema.md)) |
| "4 travellers" / "4 guests" / "4 divers" | count of `booking_members` for the booking; noun by type (Assumption) |
| Link line | `linked_expense_id` → current revision (`is_committed`, payer, participant count) |
| Documents | `attachments` where `owner_type = trip` (and `booking` for ticket files), `display_name`, `mime`, `bytes`, `visibility` (`trip` / `owner`), `uploaded_by_user`, `state` |
| Offline status | local `file_cache` row for the attachment (`local_uri`, `bytes`, `downloaded_at`, `pinned`). Vault documents are **`pinned = true`**, so they're never evicted ([03 §10](../03-database-schema.md)) |

## API / Database
| Action | Op / endpoint |
|---|---|
| Add / edit booking | `booking.upsert` (field-LWW), with covers → `booking_members` |
| Delete booking | `booking.delete` (soft) |
| Link booking to an expense | `booking.upsert` patch `linked_expense_id`; or "Create the expense" → `expense.create` (with `is_committed` if before the trip), then `booking.upsert` setting `linked_expense_id` (PRD F13: entered once). The link lives only on the booking; it never creates a money revision ([03 §5.9 note](../03-database-schema.md)) |
| Attach a file | `attachment.register` (with `display_name` and `visibility`) + `POST /upload-url` → PUT R2 → `POST /upload-confirm` (the server then writes `attachment.uploaded`). Max 10 MB per file. An `owner` file's op is stored with `visible_to_member_id` ([06 §4](../06-syncing.md)). A row still `pending` after 24 h is removed by the nightly `cleanup` job |
| Delete a file | `attachment.delete { id }`: by the uploader or an organiser (see the [permission matrix](../09-security.md#permission-matrix)). Soft delete; the R2 object is removed by the `cleanup` job ([06 §4](../06-syncing.md)). The local `file_cache` row is dropped when the delete arrives |
| Download for offline | `POST /download-url` → GET (5-minute signed URL; the server checks membership **and** visibility) → saved in the app's private storage and recorded in `file_cache` with `pinned = true` ([04 §4.3](../04-api-schema.md)) |
| Storage limit | Free trip: 1 GB of vault storage (receipts never count); Pro trips get more. Over the limit, `/upload-url` answers 413 `quota_exceeded` and the [Pro sheet](pro-sheet.md) opens (`pro_paywall_viewed`, `feature: vault_storage`) ([04 §1](../04-api-schema.md)) |

## Edge cases
- **Signed URL expires mid-download** (5 min): request a new one and resume.
- **Phone storage full:** download fails with "Not enough space on this phone".
- **Aadhaar and IDs:** encrypted at rest (PRD F13, §18). The uploader chooses **All members** or **Only me** (`attachments.visibility = owner`); Assumption: the sheet suggests **Only me** when the name contains "Aadhaar", "passport" or "PAN".
- **Organiser deletes someone else's document:** allowed per the permission matrix; the uploader sees it gone after the next pull.
- **A member leaves the trip:** they lose access to new signed URLs; files already downloaded on their phone remain until the trip is removed from the phone (Assumption).
- **Booking in another currency:** shown in its currency; linking to an expense freezes FX on the expense.
- **Time zones** (international flights): `starts_at` is stored in UTC; shown in the phone's local time (Assumption: plus the airport's zone in detail later).
- **Deleted linked expense:** link line falls back to "Not yet linked to an expense".

## Analytics
No PRD §19 event. Proposed (Assumption): `booking_added` (`type`, `linked_expense`), `document_added` (`mime`), `vault_opened_offline` (to prove the offline use case).

## Accessibility
- Each booking reads "Flight, IndiGo, Goa to Bengaluru, Tuesday 15 October 17:25, PNR M 3 P 9 T R, four travellers. Collapsed. Double-tap to show ticket."
- PNRs are spelled out character by character for screen readers.
- "✓ OFFLINE" is read as "Available offline".
- The pulsing dot is decorative; Reduce Motion stops the pulse.
- Expanded lime card keeps 13:1 contrast (`color.onAccent` on lime).
- "Only you" documents are announced as "Only visible to you".

## Open questions / assumptions
- Resolved: `bookings.title` ("GOI → BLR") and `bookings.details` ("6E-5318 · Seats 14A–14D") exist ([03 §6.3](../03-database-schema.md)).
- Resolved: `attachments.display_name` holds "Travel insurance" etc. ([03 §7.1](../03-database-schema.md)).
- Resolved: the local `file_cache` table tracks downloaded files; vault documents are pinned ([03 §10](../03-database-schema.md)).
- **Resolved:** on a settled trip, booking and document edits are rejected; the one allow-list is [06 §5](../06-syncing.md).
- **Resolved:** documents have `visibility` `trip` / `owner` ([03 §7.1](../03-database-schema.md)); owner-only ops are private in `trip_ops` (review S-07).
- **Resolved:** deleting a file is the `attachment.delete` op (review DB-7).
- **Open:** where does the QR come from? Assumption: from an attached ticket image or PDF; Toli doesn't generate QR codes.
