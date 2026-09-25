# Feature · Bookings and document vault (F13)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R3 (the Vault tab appears in R3; OQ-P11 in [01](../01-overview.md#open-questions); [01 §6](../01-overview.md#6-scope)) |
| **PRD refs** | F13, F8 (committed spend), §15 (1 GB free / Pro unlimited), §18 (encryption, access), §17 (offline) |
| **Related** | Screens: [vault](../screens/vault.md) · [trip-home](../screens/trip-home.md) · [add-expense](../screens/add-expense.md) · Docs: [03 §6.3, §7.1, §10](../03-database-schema.md) · [04 §4](../04-api-schema.md) · [06 §4](../06-syncing.md) · [02 §6](../02-architecture.md) · Features: [budget](budget.md) · [pro-pass](pro-pass.md) · [itinerary-and-places](itinerary-and-places.md) · Decisions: [D-006](../decisions/D-006-append-only-money.md), [D-011](../decisions/D-011-server-writes.md) |

---

## 1. Purpose

Hold every booking, PNR, ticket and trip document in one place, available **with no signal**, and let a pre-paid booking also be the split expense, so it is entered once.

## 2. User problem

- The person holding everyone's tickets digs through email, WhatsApp and screenshots at the airport, often with no network.
- The hotel booked months ago is entered twice: once as "the booking" and once as "who owes what".
- IDs, visas and insurance get forwarded around a WhatsApp group with no control over who can see them.

## 3. Business goal

- Pillar D of v1 ("Trip vault") and part of the trip **archive** that creates switching costs (PRD §3 defensibility).
- Feeds **committed spend** into the budget so day one doesn't look catastrophic (PRD F8).
- Storage beyond **1 GB per trip** is a Pro feature with real marginal cost (PRD §15).

---

## 4. User flow

**Add a booking**
1. On the **Vault** tab, tap **+ Booking**.
2. Pick a type: Flight, Train, Bus, Hotel, Cab, Activity, Other.
3. Enter a title (e.g. "GOI → BLR"), provider (e.g. IndiGo), reference/PNR (e.g. M3P9TR), details (e.g. "6E-5318 · Seats 14A–14D"), start and end date-times, cost and currency, **who it covers** (default: everyone), and notes (flight number, seats, gate, check-out time).
4. **Also add as a split expense** is on by default when a cost is entered. Choose who paid (default: you).
5. Optional: attach the ticket (PDF or photo).
6. Save writes `expense.create` (if the toggle is on) and `booking.upsert` with `linked_expense_id` in the **same local transaction**. The link lives only on the booking ([03 §5.9 note](../03-database-schema.md)). If the booking starts after today, the expense is marked **Booked before the trip** (`is_committed`).

**Link an existing expense**
1. On a booking with no expense ("Not yet linked to an expense"), tap **Link expense** and pick one, or **Add as expense** to create it. Linking or unlinking is a planning edit (`booking.upsert`, field-LWW), never a money revision.

**Add a trip document**
1. In **Documents**, tap **+ Document**, pick a PDF or photo (IDs, visa, insurance, waiver), give it a name (`attachments.display_name`).
2. Choose who can see it: **Everyone on the trip** (default, `visibility = trip`) or **Only me** (`visibility = owner`, e.g. your own passport or Aadhaar).
3. The phone uploads it via `/upload-url` → R2 → `/upload-confirm` and keeps the local copy, so it is offline straight away on this phone.

**Use it offline**
1. On other members' phones, **trip-visible** documents download on Wi-Fi in the background (and on demand when tapped) into the local `file_cache`, pinned so they're never evicted ([03 §10](../03-database-schema.md)). Each shows **✓ OFFLINE** once saved.
2. At the airport with no signal, the user opens Vault: the **Next up** card, the booking card with the big PNR, and the attached ticket all open from the phone.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| VA-01 | Booking records typed Flight, Train, Bus, Hotel, Cab, Activity, Other, with provider, confirmation/PNR, dates and times, cost, and who it covers. | MUST | F13 |
| VA-02 | Link a booking to an expense so a pre-paid booking is also a split expense, **entered once**. | MUST | F13 |
| VA-03 | Attach files (PDF, image) to bookings and to the trip generally: tickets, IDs, visas, insurance. | MUST | F13 |
| VA-04 | All attached documents are **available offline once downloaded**. | MUST | F13 |
| VA-05 | Documents are encrypted at rest and access is restricted to trip members, served only through short-lived signed URLs. | MUST | F13, §18 |
| VA-06 | No automatic parsing of email inboxes for bookings. | MUST NOT | F13 |
| VA-07 | Show upcoming bookings as a **Next up** card during the trip. | SHOULD | F13 |
| VA-08 | Free tier: 1 GB of vault documents per trip. Pro: unlimited. | MUST | §15 |
| VA-09 | Receipt photos are **never** blocked by the vault quota (receipt photos are free, always). | MUST | F4, §15 |
| VA-10 | Download all of a trip's documents on Wi-Fi automatically when the trip becomes active or a booking starts within 48 hours. | SHOULD | F13 |
| VA-11 | A document can be **Only me** (`visibility = owner`). Nobody else can list it, download it or pull its op. | MUST | §18, review S-07 |
| VA-12 | Documents can be deleted (`attachment.delete`); the file is removed from R2 by the cleanup job. | MUST | review DB-7 |

---

## 6. Business rules

1. **Money lives in the expense, not the booking.** Once linked, the expense is the source of truth for who paid and who owes. The booking's `cost_minor` is display information.
2. **Editing a linked booking's cost** asks "Update the expense too?" → yes writes an `expense.edit` (new revision). No → the booking shows "Cost differs from the expense".
3. **Who it covers** (`booking_members`) becomes the expense's default participants when creating the linked expense. Editing coverage later does **not** change the expense automatically; the app offers to.
4. **Committed:** a linked expense is `is_committed = true` when the booking was made before the trip start date (i.e. the expense is created before `start_date`), so the budget treats it as pre-trip spend.
5. **Deleting a linked booking** asks whether to also delete the expense. The default is **keep the expense** (money is never removed silently).
6. **Deleting a linked expense** leaves the booking and shows "Not linked to an expense".
7. **Files:** PDF, JPEG, WebP only; 10 MB max each ([04 §4.1](../04-api-schema.md)). Images are compressed and EXIF-stripped on the phone; PDFs are uploaded as-is.
8. **Quota (free trips):** the Σ `bytes` of non-deleted attachments with `owner_type` `booking` or `trip` may not exceed 1 GB. Receipts (`expense`) never count. Feed photos: see Open question 3. Over the limit, uploads fail with `413 quota_exceeded`. Pro trips: no quota (a fair-use cap may be set later, see §18).
9. **Access:** only app-claimed, non-removed members of the trip can list attachments (RLS) or get a download URL (`/download-url`). URLs expire in 5 minutes. Web viewers never pass this check ([D-024](../decisions/D-024-web-page-read-only-beta.md)).
10. **Visibility** (`attachments.visibility`, [03 §7.1](../03-database-schema.md)):
    - `trip` (default): every app-claimed member can see and download it.
    - `owner`: only the uploader. The RLS select policy **and** `/download-url` both enforce it.
    - The `attachment.register` op for an owner-only file is stored with `trip_ops.visible_to_member_id` = the uploader, so **other members' phones never pull it**, not even its name (review S-07, [06 §4](../06-syncing.md)).
    - Owner-only files are only downloaded and cached on the uploader's own phones.
11. **Deleting a document** writes `attachment.delete` (soft delete). The R2 object is removed later by the nightly `cleanup` job ([06 §4](../06-syncing.md)). Who may delete is in the permission matrix (§12).
12. **Unfinished uploads:** an `attachments` row still `pending` after **24 hours** is deleted by the nightly `cleanup` job, together with any R2 object ([03 §7.1](../03-database-schema.md), [04 §10.1](../04-api-schema.md)). The phone's `file_queue` still has the file, so it registers and uploads again next time.
13. **Removed members** lose server access immediately. Their phone deletes that trip's cached documents on the next sync (best effort; see Open question 2).
14. **Next up** = the soonest booking with `starts_at` in the future, or the next itinerary item today with a time, whichever is sooner. It uses the phone's clock and is computed locally.
15. **No QR generation from PNRs.** The QR shown on a ticket comes from the attached ticket file. The booking card shows the big mono PNR for manual check-in.

---

## 7. Data model

From [03](../03-database-schema.md):

| Table | Columns used |
|---|---|
| `bookings` | `id`, `trip_id`, `type` (`booking_type`), `provider`, `title` ("GOI → BLR", "2 rooms · 3 nights"), `reference`, `details`, `starts_at`, `ends_at`, `cost_minor`, `currency`, `linked_expense_id` (the only place the link is stored), `notes`, timestamps, `deleted_at`, `last_seq` |
| `booking_members` | `(booking_id, member_id)`: who it covers |
| `attachments` | `owner_type` `booking` / `trip`, `owner_id`, `display_name` ("Travel insurance.pdf"), `visibility` (`trip` / `owner`), `r2_key` (`trips/{trip_id}/{attachment_id}.{ext}`), `mime`, `bytes`, `sha256`, `state` (`pending` / `uploaded` / `failed`), `deleted_at` |
| `trip_ops` | `visible_to_member_id` for owner-only files, so the op is private |
| `expense_revisions` | `is_committed` |
| `trips` | `is_pro` (quota) |
| `file_queue` (phone) | pending uploads |
| `file_cache` (phone) | downloaded files: `local_uri`, `bytes`, `pinned` (vault documents are pinned, never evicted) |

---

## 8. API requirements

| Call | Detail |
|---|---|
| `booking.upsert` / `booking.delete` | field-LWW ops via `/sync-push`; payload includes covered member IDs ([06 §4](../06-syncing.md)) |
| `expense.create` / `expense.edit` | for the linked expense (money, append-only) |
| `attachment.register` | registers the file row (`owner_type`, `owner_id`, `mime`, `bytes`, `sha256`, `display_name`, `visibility`); the server writes `attachment.uploaded` after `/upload-confirm` ([06 §4](../06-syncing.md)). With `visibility = owner`, the op is stored with `visible_to_member_id` |
| `attachment.delete` | `{ id }`: soft delete; the R2 object is removed by the `cleanup` job ([06 §4](../06-syncing.md)) |
| `cleanup` job (nightly) | removes deleted files from R2 and `pending` rows older than 24 h ([04 §10.1](../04-api-schema.md)) |
| `POST /upload-url` → PUT → `POST /upload-confirm` | [04 §4.1–4.2](../04-api-schema.md). `/upload-url` must also check the **1 GB quota** for free trips |
| `POST /download-url` | `{ attachment_id }` → `{ get_url, expires_in: 300 }`; refuses owner-only files for anyone but the uploader; the phone caches the file after the first download ([04 §4.3](../04-api-schema.md)) |

**Quota error:** `413 quota_exceeded` (free trip vault over 1 GB; receipts never count, [04 §1](../04-api-schema.md)).

---

## 9. UI requirements

Screen doc: [screens/vault](../screens/vault.md). From the UI reference (VAULT section):

- **Header:** "Vault" (`type.title`) and a mono pill **✓ ALL OFFLINE** (lime text) when every document is cached; otherwise "3 of 5 offline".
- **Next up card** (`bg.raised`): pulsing lime dot, "NEXT UP · in 1h 20m", title "Scuba · Grande Island, 12:00", mono reference "SCB-4471".
- **Booking cards** (tap to expand; the open card turns lime):
  - Mono header "FLIGHT · INDIGO" and the time "TUE 15 OCT · 17:25".
  - Title (e.g. "GOI → BLR") and mono cost.
  - Line: reference ("PNR M3P9TR") · coverage ("4 travellers").
  - Expanded (below a perforation): the ticket preview/QR area (84 px), the big mono PNR (22/700), details, and the link line: "Paid by Aditya before the trip", "Linked to expense · split 4 ways", or "Not yet linked to an expense".
- **Documents card:** rows with a PDF/image icon, name, "PDF · 2.1 MB · all members" (or "only you" with a lock icon for owner-only files), and **✓ OFFLINE** (lime mono) or a download icon.
- **Next up on Trip home** (SHOULD) during an active trip.
- Quota bar in Documents on free trips near the limit: "820 MB of 1 GB · Pro removes the limit".
- Accessibility: PNRs are read character by character ("M, 3, P, 9, T, R").

---

## 10. States

| State | Display |
|---|---|
| Empty vault | "Tickets, PNRs and IDs, in one place and offline." + **+ Booking** / **+ Document** |
| Booking without expense | "Not yet linked to an expense" + **Add as expense** |
| Document uploading | progress ring; "Saved on this phone · uploading" |
| Document not yet downloaded | download icon; tap to fetch (online) |
| Document downloaded | ✓ OFFLINE |
| Offline, not downloaded | "Download this when you're back online" |
| Quota near / reached (free) | bar / Pro sheet when adding |
| No upcoming bookings | Next up card hidden |
| Owner-only document | lock icon + "only you"; not shown on other phones at all |
| Upload never finished (24 h) | the server row is cleaned up; the phone retries from `file_queue` |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Booking paid by two people (two cards) | The linked expense supports multiple payers; set them on the expense. |
| Booking in foreign currency | Linked expense freezes the rate at creation ([multi-currency](multi-currency.md)). |
| Hotel booked by Aditya covers only 3 people | Coverage → default participants of the expense. |
| Refunded or cancelled booking | Delete the booking; the app asks about the expense (default keep, so the group decides). |
| Same PDF uploaded twice | `sha256` match → "Already in the vault" (no second upload). |
| 12 MB PDF | Rejected: "Files up to 10 MB. Try a compressed PDF." |
| Phone storage full when downloading | "Not enough space on this phone"; nothing partial is kept. |
| Member removed from the trip | Loses server access; local copies deleted on next sync. |
| Trip deleted by the organiser | Files marked deleted; removed from R2 by cleanup ([03 §11](../03-database-schema.md)). |
| Uploader of an owner-only file deletes their account | The file goes with the account if the trip has no other members ([03 §11](../03-database-schema.md)); otherwise nobody else can see it anyway. See Open question 4. |
| Upload started but the app was uninstalled | The `pending` row and any partial R2 object are deleted after 24 h. |
| Flight changed (new time) | Edit `starts_at`; Next up updates; feed shows the change. |
| Time zones (flight BLR → Bali) | `starts_at`/`ends_at` are `timestamptz`; display in the device's time zone with the zone label when it differs from India. |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can add bookings and documents and download trip-visible ones; a member deletes their own documents and an organiser can delete any; owner-only files are for the uploader only. Web viewers, ghosts, removed members and deleted accounts have no access.

## 13. Offline behaviour

- Bookings (all fields) are in SQLite: fully offline.
- Documents are offline **after download** (VA-04), kept in the pinned `file_cache`. Uploads made on this phone are offline immediately (the local file is kept).
- Adding a booking and a document offline works: the booking syncs through the outbox; the file waits in `file_queue` (Wi-Fi only by default, with **Upload now** to override).
- Encryption on the phone: files live in the app's private storage, protected by the OS (Android file-based encryption; iOS Data Protection). See Open question 1.

## 14. Sync behaviour

- `booking.upsert`/`booking.delete` are field-LWW ([06 §5](../06-syncing.md)); the linked expense follows money rules (append-only, server-verified).
- "Booking + expense" are two ops queued in order in one transaction (expense first); if the expense is rejected (e.g. trip settled), the booking still exists and shows "Not linked".
- Attachment rows sync as metadata; bytes move only through signed URLs.
- **Private ops:** `attachment.register` for an owner-only file carries `visible_to_member_id`, so RLS and the pull path (`trip_ops` through PostgREST) never return it to other members. `/trip-snapshot` leaves it out for them too.
- `attachment.delete` is a normal op; other phones drop the row and their cached copy on pull.

---

## 15. Analytics

PRD §19 has no vault events. Proposed additions:

| Event | Properties |
|---|---|
| `booking_added` | `type`, `linked_to_expense` (bool), `has_attachment` |
| `document_uploaded` | `mime`, `size_bucket`, `owner_type` |
| `document_opened` | `offline` (bool) |
| `vault_quota_hit` | `used_bucket` (+ `pro_paywall_viewed` with `feature = vault_storage`) |

No names, PNRs or file contents are sent.

## 16. Error handling

| Error | Handling |
|---|---|
| Upload fails | stays in `file_queue`, retried with backoff |
| `upload-confirm` mismatch (size/hash) | re-upload once, then "Upload failed · Try again" |
| Signed URL expired mid-download | request a new one silently |
| `413 quota_exceeded` | [Pro sheet](../screens/pro-sheet.md) with the used amount |
| `not_a_member` | the trip is removed from this phone's list |

## 17. Testing

- Unit: quota counting (only `booking`/`trip`), Next up selection (bookings vs itinerary, time zones).
- Integration: `/upload-url` quota check; `/download-url` refuses non-members and removed members.
- E2E (Maestro): add booking with expense → budget shows committed; airplane mode → open ticket PDF.
- pgTAP / RLS: another member sees no owner-only `attachments` row and no `trip_ops` row for it; `/download-url` refuses it.
- Cleanup job: a `pending` row older than 24 h is deleted with its R2 object; a deleted document's object is removed.
- Security: R2 objects are not reachable without a signed URL; URL expires after 5 minutes; keys aren't guessable ([03 §7.1](../03-database-schema.md)).
- Kill test: app killed between booking and expense ops → both or neither exist.

## 18. Cost and free-tier impact

| Item | Limit | Expected usage | Breaking point | Upgrade |
|---|---|---|---|---|
| R2 storage | 10 GB free **total** | typical vault 10–50 MB per trip (a few PDFs and photos) | ~200–1,000 active trips' vaults, or ~10 trips that each use their full 1 GB | $0.015 per GB-month (1 TB ≈ $15/month); Pro revenue covers heavy users |
| R2 operations | Class A 1M / Class B 10M per month free | uploads + downloads per member | large groups downloading many documents | small per-million fees |
| R2 egress | free | — | — | — |
| Phone storage | user's device | cached PDFs | low-end phones | per-document download on demand; "Remove offline copies" setting |

Consider a Pro fair-use cap (e.g. 10 GB per trip) to bound worst-case cost.

## 19. Future considerations

- Forwarding a booking email to a trip address (explicitly out of v1; high privacy cost).
- Wallet passes (Google Wallet / Apple Wallet) for boarding passes.
- Reminders before check-in or departure.

## 20. Open questions

**Resolved:**
- **Who can delete a document:** the uploader, or an organiser (any) ([permission matrix](../09-security.md#permission-matrix), [D-031](../decisions/D-031-permission-matrix.md)), through `attachment.delete` ([06 §4](../06-syncing.md)).
- **Private documents:** yes, `visibility = owner`, enforced by RLS, `/download-url` and private ops ([03 §7.1](../03-database-schema.md), review S-07).
- **Unfinished uploads:** cleaned up after 24 h ([03 §7.1](../03-database-schema.md), review DB-8).
- The quota error is `413 quota_exceeded` ([04 §1](../04-api-schema.md)); `bookings.title`, `attachments.display_name` and the phone's `file_cache` exist ([03](../03-database-schema.md)).

**Still open (feature-level):**
1. **Encryption at rest:** R2 encrypts every object at rest, and the phone relies on OS storage encryption. Is that enough for ID documents (Aadhaar, passports), or do we need app-level encryption (a per-trip key) on top? [09 Security](../09-security.md) should decide.
2. **Remote wipe of cached documents** on a removed member's phone is best effort only. Is that acceptable for sensitive IDs?
3. **Do feed photos count toward the 1 GB?** PRD §15 says "document vault storage"; feed photos are memories, not documents.
4. **Owner-only files after account deletion** on a trip with other members: [03 §11](../03-database-schema.md) only deletes files from trips with no other members, so an owner-only file nobody can see would stay in R2. Delete it too?
