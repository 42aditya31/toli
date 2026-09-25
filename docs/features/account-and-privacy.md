# Feature · Account, privacy and data rights (§18, DPDP)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (launch-blocking: privacy notice, consent record, deletion, export). **No contacts matching in v1** ([D-025](../decisions/D-025-no-contacts-matching-v1.md)) |
| **PRD refs** | §18 (privacy, security, compliance), F2 (contacts), F6 / §14 (UPI IDs), §5.6 (we never hold money), §15 (no selling data), §19 |
| **Related** | Screens: [settings-profile](../screens/settings-profile.md) · [notifications](../screens/notifications.md) · [settle-up](../screens/settle-up.md) · [invite-web](../screens/invite-web.md) · Docs: [03 §3, §9, §11](../03-database-schema.md) · [04 §3.2–3.3, §5.1, §8, §9, §10](../04-api-schema.md) · [02 §6](../02-architecture.md) · [09 Security](../09-security.md) · Features: [auth-and-identity](auth-and-identity.md) · [invites-and-joining](invites-and-joining.md) · [notifications](notifications.md) · [export](export.md) · Decisions: [D-006](../decisions/D-006-append-only-money.md), [D-007](../decisions/D-007-auth.md), [D-008](../decisions/D-008-invite-links.md), [D-024](../decisions/D-024-web-page-read-only-beta.md), [D-025](../decisions/D-025-no-contacts-matching-v1.md), [D-027](../decisions/D-027-environments-and-backups.md), [D-031](../decisions/D-031-permission-matrix.md) |

---

## 1. Purpose

Give every user clear control over their data: what we collect and why, who can see their UPI ID, what shows on their lock screen, a copy of everything, and a real way to delete their account. At the same time, shared trip ledgers must stay correct for everyone else.

## 2. User problem

- A money app sees who you travel with and what you spend. People worry it will be sold, shown to strangers, or used for ads.
- Sharing a UPI ID with a group feels risky. People only want it shown to those who owe them.
- A push saying "Rahul added ₹4,000 · you owe ₹1,000" on a locked phone can be seen by anyone nearby.
- "Delete my account" must not break a friend's trip balances.

## 3. Business goal

- **Launch-blocking compliance:** India's **DPDP Act, 2023** (and its Rules, being phased in) requires consent, purpose limitation, minimisation, access/correction/erasure rights, breach notification, and a plain-language notice (PRD §18).
- **Store requirements:** Apple and Google both require in-app account deletion. Google also requires a web deletion link.
- **Trust** is the product: "Toli only keeps count" and "never sold, never ads" (PRD §15).

---

## 4. User flow

**First run and consent**
1. On first open the app creates an anonymous account silently ([D-007](../decisions/D-007-auth.md)). The welcome screen links **How Toli uses your data** (the privacy notice).
2. Tapping **Get started**, or joining a trip from an invite, means accepting the notice. The app records one `consents` row: `kind = privacy_notice`, with the `version` of the notice shown (OQ-P21, [03 §9](../03-database-schema.md)). This is the only consent kind in v1.
3. OS permissions are asked **only at the moment they're needed**, each with a short reason: contacts (when tapping **Add from contacts**), camera (first receipt photo), notifications (after the first trip is created), photos (saving an image).

**Add from contacts (names only)**
1. Tapping **Add from contacts** opens the **system contact picker**. The user picks one or more people.
2. Only the chosen contacts' **names** are copied, on the phone, and become ghost members. **No phone number or hash is stored or uploaded** ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
3. There is no "Find friends on Toli" and no "Rahul is already on Toli" hint in v1.

**Control UPI ID visibility**
1. In **Settings → Profile → UPI ID**, the user adds `aditya@okhdfc` (optional).
2. **Who can see it:** *Only people who owe me* (default) · *Nobody* (then no UPI links are built for them). UPI links exist only on trips with an INR base currency ([04 §5.1](../04-api-schema.md)).

**Hide amounts on the lock screen**
1. **Settings → Notifications → Hide amounts on lock screen** (default off).
2. When on, the server removes amounts and names from the push text itself ([04 §11](../04-api-schema.md), `profiles.hide_lockscreen_amounts`). The phone also uses Android's private lock-screen visibility and iOS hidden previews (review S-05). The full details show once the phone is unlocked and the app is open.

**Download my data**
1. **Settings → Privacy → Download my data** → `POST /account-export`.
2. When ready (seconds to a minute), the app shows **Download** (link valid 24 hours) and shares the file to Files/Drive.

**Delete my account**
1. **Settings → Privacy → Delete my account**.
2. The app explains, in plain language:
   - Your profile, UPI ID, devices and login are erased.
   - **Shared expenses stay** so your friends' balances still add up. On those trips your name becomes "**Former member**".
   - Outstanding balances: "You still owe ₹1,200 on Goa Weekend" (shown, not blocking).
   - Trips where you're the only member are deleted.
   - Backups are kept for 30 days, so your data is fully gone from them within 30 days.
   - You can download your data first.
3. The user types **DELETE** → `POST /account-delete { confirm: "DELETE" }`.
4. The phone signs out and wipes local data (SQLite, secure store, cached files, FCM token).

---

## 5. Requirements

| ID | Requirement | Level | PRD / law |
|---|---|---|---|
| AP-01 | A **plain-language privacy notice** (English in R1a; Hindi in R1b), in the app and on the web, before launch. | MUST (launch-blocking) | §18, DPDP, [D-018](../decisions/D-018-r1a-r1b-scope.md) |
| AP-02 | A working **account and data deletion** path, in the app. | MUST (launch-blocking) | §18, Apple 5.1.1(v), Google Play |
| AP-03 | A **web page** to request account deletion without the app (Google Play requirement). | MUST (before Play launch) | Google Play User Data policy |
| AP-04 | Deleting an account **anonymises** the member in past trips ("Former member") rather than deleting shared expenses, and this is **disclosed at deletion time**. | MUST | §18 |
| AP-05 | **Data export** of all the user's data (`/account-export`), free, always. | MUST | §18 (right to access) |
| AP-06 | Users can **correct** their profile data (name, avatar, UPI ID, locale) at any time. | MUST | §18 (right to correct) |
| AP-07 | Contacts: the system picker only; **names only** are kept; raw contact books, phone numbers and hashes are **never uploaded or stored**. No contacts matching in v1. | MUST | §18, F2, [D-025](../decisions/D-025-no-contacts-matching-v1.md) |
| AP-08 | **UPI IDs** are opt-in, and visible only to members who owe that person by default (`debtors_only`); the user can change it. | MUST | §14, §18 |
| AP-09 | **Phone numbers** (only once phone login exists, later) are visible to co-trip-members only. | MUST | §18 |
| AP-10 | An **audit log** on every expense (created by, every edit, deleted by), kept for the trip's life, answerable in the app. | MUST | §18 |
| AP-11 | Financial data is **never sold**, never shared with advertisers, and **never used to train third-party models**. Receipt images go to a provider under a zero-retention agreement. | MUST | §15, §18 |
| AP-12 | Receipts and vault documents are encrypted at rest and served only through short-lived signed URLs to trip members. | MUST | §18 |
| AP-13 | Analytics and crash reports contain **no** names, descriptions, amounts, UPI IDs, phone numbers or receipt content. | MUST | §18 (minimisation) |
| AP-14 | A breach-response process that can notify the Data Protection Board and affected users. | MUST | DPDP |
| AP-15 | A published contact for privacy questions and grievances. | MUST | DPDP |
| AP-16 | The privacy-notice consent is **recorded** (`consents.kind = privacy_notice`, versioned) at **Get started** or on joining. | MUST | DPDP, OQ-P21 |
| AP-17 | A **Hide amounts on lock screen** setting that removes amounts and names from push text on the server. | SHOULD | review S-05 |
| AP-18 | Backups are kept **30 days** only, so deleted data leaves backups within 30 days. | MUST | [D-027](../decisions/D-027-environments-and-backups.md) |
| AP-19 | Anonymous accounts that belong to **no trip** are deleted after **30 days** of inactivity. | MUST | [03 §11](../03-database-schema.md), review S-10 |

---

## 6. Business rules

1. **Collect the minimum.** Profile: display name, optional avatar, optional UPI ID, locale, and notification settings. No date of birth, no address, no contacts upload, no phone hash, no location (EXIF/GPS is stripped from photos, [02 §4](../02-architecture.md)).
2. **Contacts (v1):** use the **system contact picker**, so the app reads only what the user picks, on the device. Android needs no `READ_CONTACTS` permission for the picker. Only the name the user saves becomes a ghost `display_name`. There is no phone number, `contact_hash` or discovery setting anywhere ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
3. **No contacts matching in v1.** There is no `/contacts-match` endpoint, no `profiles.phone_hash`, no `profiles.discoverable` and no `trip_members.contact_hash`. Matching may come back only with phone login and a new decision. A phone-number hash with a published salt can be reversed in seconds, so it would need a stronger design.
4. **Consent:** one kind in v1, `privacy_notice`, recorded with the notice version when the user taps **Get started** or joins a trip ([03 §9](../03-database-schema.md)). If the notice changes, the app shows the new version once and records a new row. Rows are never updated; withdrawing inserts a row with `withdrawn_at` ([04 §9](../04-api-schema.md)). The analytics opt-out is a Settings toggle, not a consent row.
5. **UPI visibility** (`profiles.upi_visible_to`):
   - `debtors_only` (default): only an app-claimed member who is the payer in a **current derived payment** to this person can get their UPI link ([04 §5.1](../04-api-schema.md)).
   - `nobody`: no UPI links; others use **Mark as paid**.
   - The VPA is never returned by PostgREST, by the invite page or by push payloads. Only `/upi-link` builds the link.
   - Non-INR base trips: `/upi-link` returns `reason: "not_inr"` and only **Mark as paid** is shown.
6. **What the public invite page can show** ([D-024](../decisions/D-024-web-page-read-only-beta.md), [04 §3.2–3.3](../04-api-schema.md)):
   - **R1a (beta): the page is read-only.** No claim, no UPI, no "I paid". It ends with **Get the Toli app**.
   - First view (`/invite-preview`): trip name, dates, total spent, member count, the organiser's first name and member display names. **No per-person numbers.**
   - After "Which one are you?" (`/invite-member-view`): **that member's** net amount, the lines that make it up, and whom they owe.
   - **Never:** phone numbers, emails, user IDs, UPI IDs, receipts or other people's expense lines.
   - Anyone holding the link can pick any name, so a leaked link shows that much (accepted by the PRD, [D-008](../decisions/D-008-invite-links.md)). The notice says so, and the organiser can rotate the link.
   - R1b adds paying from the web through a limited web membership that can see only its own lines ([D-024](../decisions/D-024-web-page-read-only-beta.md)).
7. **Lock-screen privacy** (`profiles.hide_lockscreen_amounts`, default false): when true, the server builds push text without amounts or names ("New expense on Goa Weekend"). Inside the app, the stub banner still shows full details. Turning it on or off is the user's own setting.
8. **Audit log** = `trip_ops` + `expense_revisions` (append-only, [D-006](../decisions/D-006-append-only-money.md)). The expense screen shows "Created by Rahul · Edited by Neha (amount ₹1,200 → ₹1,300)". Kept for the life of the trip. **Private ops** (a personal budget, an owner-only file) are stored with `visible_to_member_id`, so other members never pull them (review S-07).
9. **Account deletion** ([03 §11](../03-database-schema.md), [04 §8](../04-api-schema.md)):
   - Erase `profiles`, `devices`, `notification_preferences`, the auth user and linked identities (and revoke Sign in with Apple tokens).
   - Each `trip_members` row: `user_id` set to null and `display_name` set to "**Former member**" (numbered if there are several in one trip). Balances are unchanged. The server writes a `member.anonymised` op so every phone updates ([06 §4](../06-syncing.md)).
   - A "Former member" spot **can't be claimed** again (OQ-P21).
   - Trips where the user was the only member: deleted, with their attachments.
   - Attachments the user uploaded to trips that still have other members: kept (they're part of the shared trip). Attachments on trips with no remaining members: deleted from R2.
   - `deletion_requests` records `requested_at` and `completed_at`.
   - Analytics: request deletion of the user's PostHog person and Sentry user data.
10. **Organiser leaving via deletion:** if another organiser exists (via `member.set_role`), nothing changes. The phone asks a last organiser to hand over the role first ([D-030](../decisions/D-030-removed-members-locked.md)). If they don't, the trip has no active organiser, and after 30 days the longest-standing member is offered the role (OQ-P20, [01](../01-overview.md#open-questions)).
11. **Anonymous accounts** can export and delete too. Deleting one follows the same steps. An anonymous account that belongs to **no trip** is deleted automatically after **30 days** of inactivity by the nightly `cleanup` job ([04 §10.1](../04-api-schema.md)), so it doesn't count toward the 50k monthly-user limit.
12. **Export contents** (`/account-export`, JSON + CSV, link valid 24 h, 3 per day): profile; every trip the user is in with members (names only), expenses (current revisions), shares, settlements, kitty contributions, itinerary, bookings, feed posts; the user's own private items (personal budgets, owner-only files); a list of attachments with download links valid for the same 24 h. Other members' UPI IDs and private items are **not** included. The file is recorded in `data_exports` with `kind = account` ([03 §9](../03-database-schema.md)). The Pro trip export (`trip_csv` / `trip_pdf`) is a different feature ([export](export.md)).
13. **Retention:**
    - Trips are kept while any member still has an account ([03 §11](../03-database-schema.md)); `trip_ops` for the life of the trip.
    - `notification_outbox`: 30 days. `rate_limit_buckets`: 1 day. Exports: deleted from R2 after 24 h.
    - Anonymous users with no trips: deleted after 30 days of inactivity.
    - **Backups:** nightly, encrypted, **kept 30 days** ([D-027](../decisions/D-027-environments-and-backups.md)). Deleted data is gone from backups within 30 days, and the notice says so.
14. **Processors disclosed in the notice:** Supabase (Mumbai), Cloudflare (R2, Workers), Google (FCM), Apple (APNs), PostHog (EU or US region, stated in the notice), Sentry, Resend, Geoapify, the receipt LLM provider, FX providers (no personal data). Where data leaves India, the notice says so.
15. **Children:** see Open question 1.

---

## 7. Data model

| Table | Use | Status |
|---|---|---|
| `profiles` | `display_name`, `avatar_key`, `upi_vpa`, `upi_visible_to` (`debtors_only` / `nobody`), `locale`, `hide_lockscreen_amounts`, `notify_threshold_major`, `is_anonymous` ([03 §3.1](../03-database-schema.md)) | exists |
| `devices` | push tokens per device; erased on deletion | exists |
| `notification_preferences` | per-category and per-trip mutes | exists |
| `trip_members` | `user_id` nulled and `display_name` set to "Former member" on deletion. No contact data of any kind | exists |
| `trip_ops`, `expense_revisions` | audit trail; `trip_ops.visible_to_member_id` keeps private ops private | exist |
| `deletion_requests` | `user_id` PK, `requested_at`, `completed_at` | exists |
| `data_exports` | `id`, `user_id`, `kind` (`account` / `trip_csv` / `trip_pdf`), `trip_id` null, `r2_key`, `expires_at` (24 h), `created_at` | exists |
| `consents` | `kind` (`privacy_notice` only in v1), `version` (the notice version accepted), `granted_at`, `withdrawn_at` ([03 §9](../03-database-schema.md)) | exists |

**Removed in v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)):** `profiles.phone_hash`, `profiles.discoverable`, `trip_members.contact_hash`, and the `discoverable` / `contacts_matching` consent kinds.

---

## 8. API requirements

| Call | Status | Detail |
|---|---|---|
| `PATCH /rest/v1/profiles` (own row) | exists ([04 §9](../04-api-schema.md)) | name, avatar, UPI ID, visibility, locale, `hide_lockscreen_amounts`, `notify_threshold_major` |
| `POST /rest/v1/consents` (own rows) | exists ([04 §9](../04-api-schema.md)) | insert the `privacy_notice` row at Get started / join; never updated |
| `POST /upi-link` | exists ([04 §5.1](../04-api-schema.md)) | enforces `upi_visible_to` and INR only |
| `POST /account-export` | exists ([04 §8](../04-api-schema.md)) | `{ url, expires_at }`, 3/day |
| `POST /account-delete` | exists ([04 §8](../04-api-schema.md)) | `{ confirm: "DELETE" }` → `{ ok }` |
| `GET /delete-account` (Worker) | exists ([04 §10](../04-api-schema.md)) | public deletion request page required by Google Play: explains what is deleted, links to the in-app flow, and posts an email address to the 🌐 `account-delete-request` function, which emails a confirmation link (Resend). The Worker stores nothing |
| `GET /privacy` · `GET /terms` (Worker) | exists ([04 §10](../04-api-schema.md)) | versioned notice matching `consents.version` |
| 🌐 `/invite-preview`, `/invite-member-view` | exist ([04 §3.2–3.3](../04-api-schema.md)) | what the public invite page may show (§6 rule 6) |
| `cleanup` job | exists ([04 §10.1](../04-api-schema.md)) | expired exports; anonymous users with no trips after 30 days |

There is **no** `/contacts-match` endpoint in v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).

---

## 9. UI requirements

Screen docs: [settings-profile](../screens/settings-profile.md) (profile, UPI, privacy, export, delete), [notifications](../screens/notifications.md) (categories, lock-screen setting) and [invite-web](../screens/invite-web.md) (the public page).

- **Profile:** name, avatar, **UPI ID** field with regex validation and a **Who can see it** segmented control (default *Only people who owe me*), with a helper line: "Toli never sees or moves your money. Your UPI ID only fills in the payment for friends who owe you."
- **Notifications:** a **Hide amounts on lock screen** switch with the helper "Notifications won't show names or amounts until you open Toli."
- **Privacy section:** How Toli uses your data (notice) · Download my data · Delete my account · Contact us.
- **Permission explainers:** one short sheet before each OS prompt ("Pick who's coming from your contacts. Only the names you pick are saved. Your contact list never leaves your phone.").
- **Delete flow:** a full screen (not a sheet), plain bullets from §4, a list of trips with balances, **Download my data first** (tonal), a text field "Type DELETE", and a `danger` button ([13](../13-design-system.md)). Copy uses "owes"/"gets back", never "debt" ([13 §7](../13-design-system.md)).
- **Expense history** ("Created by…, edited by…") reachable from each expense.
- Everything is readable by screen readers; the delete confirmation is not a hold gesture.

---

## 10. States

| State | Display |
|---|---|
| Anonymous account | "Save my account" prompt in Settings ([auth-and-identity](auth-and-identity.md)); export and delete still available |
| No UPI ID | "Add your UPI ID so friends can pay you in two taps" |
| UPI visibility `nobody`, or a non-INR trip | Settle up shows only "Mark as paid" for payments to this user |
| Lock-screen amounts hidden | pushes read "New expense on Goa Weekend"; full details inside the app |
| Export preparing / ready / expired | spinner / Download / "Link expired · make a new one" |
| Export limit reached | "You can download your data 3 times a day." |
| Deletion confirmed | signed out, local data wiped, "Your account is deleted." |
| Offline | Export and Delete show "Needs internet" |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| User deletes with outstanding balances | Allowed after disclosure. The balance stays on the "Former member" spot; others can still record settlements with it |
| Someone tries to claim a "Former member" spot | Not allowed (OQ-P21). The person joins as a new member instead |
| Same person has two anonymous accounts (reinstall) | Organiser can release the old member ([04 §3.5](../04-api-schema.md)). The old anonymous account, if it's in no trip, is deleted after 30 days |
| Deletion while ops are still in the outbox | The phone pushes pending ops first (if online), then deletes. If they fail, they're lost with the account, and the flow says so |
| User requests deletion from the web page | Verified by an emailed link (or in-app sign-in); processed like in-app deletion |
| Several deleted members in one trip | Named "Former member 1", "Former member 2" ([03 §11](../03-database-schema.md)) |
| Export of a trip with 2,000 expenses | generated server-side, zipped; within Edge Function limits or split into parts |
| UPI visibility changed while someone has the link | the next `/upi-link` call respects the new setting; links already opened in a UPI app can't be recalled |
| Deleted data still in a backup | Backups age out after 30 days; a restore is only ever into a temporary local database for the monthly drill ([D-027](../decisions/D-027-environments-and-backups.md)) |
| A forwarded invite link | The viewer sees names and the total, and one member's own lines after picking a name. They can't claim, pay or see UPI IDs in the beta ([D-024](../decisions/D-024-web-page-read-only-beta.md)) |

---

## 12. Permissions

Who can do what inside a trip is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short for this feature: each user controls their own profile, UPI visibility, lock-screen setting, export and deletion; co-members see only display names and avatars (`member_profiles` view) and get a UPI link only as the setting allows; web viewers see only what §6 rule 6 lists.

**Outside the matrix:** the server (service role) performs deletion and export. Support staff have no routine access to trip data; access happens only on a user's request and is logged ([09](../09-security.md)).

## 13. Offline behaviour

- Export and deletion need the network.
- Profile edits (including the lock-screen setting) go through PostgREST, not the outbox. Offline edits are held on the phone and sent when online (proposal; profile changes aren't an op type in [06 §4](../06-syncing.md)).
- Permission prompts and the privacy notice (bundled copy) work offline. A consent accepted offline is recorded when the phone is next online.

## 14. Sync behaviour

- Deletion changes `trip_members` on the server and writes a server-only `member.anonymised` op into each trip's `trip_ops`, so other phones update the member to "Former member" on their next pull ([06 §4](../06-syncing.md), [03 §11](../03-database-schema.md)).
- UPI visibility and the lock-screen setting are on `profiles`, which isn't trip data. They're enforced on the server when a link or push is built, so there's nothing to sync.

---

## 15. Analytics

PRD §19 has no privacy events. Proposed (no personal data in any property):

| Event | Properties |
|---|---|
| `permission_prompted` | `permission` (contacts, camera, notifications, photos), `granted` |
| `upi_id_added` | `visibility` |
| `upi_visibility_changed` | `from`, `to` |
| `lockscreen_amounts_hidden` | `on` (bool) |
| `account_export_requested` | — |
| `account_deletion_started` / `account_deleted` | `had_outstanding_balance` (bool), `is_anonymous` |

## 16. Error handling

| Error | Handling |
|---|---|
| `429 rate_limited` on export | "3 downloads a day. Try again tomorrow." |
| Deletion fails mid-way on the server | `deletion_requests.completed_at` stays null; a pg_cron job retries; the user is told it may take up to a few hours |
| UPI ID fails validation | inline "That doesn't look like a UPI ID (name@bank)" |
| Web deletion link expired | send a new one |
| Consent row can't be written (offline) | kept on the phone and sent when online; the app still works |

## 17. Testing

- RLS tests: another member cannot read `upi_vpa`; `/upi-link` refuses non-debtors under `debtors_only` and everyone under `nobody` ([03 §1](../03-database-schema.md) CI rule).
- Privacy tests: private ops (`visible_to_member_id`) never reach other members; the invite preview returns no per-person numbers.
- Push test: with `hide_lockscreen_amounts` on, no push text contains an amount or a name.
- Deletion test: after deletion, balances on every shared trip are unchanged; profile, devices and auth user are gone; sole-member trips are gone; "Former member" spots can't be claimed; PostHog/Sentry deletion requested.
- Cleanup test: an anonymous user with no trips and 30 days of inactivity is deleted; one with a trip is not.
- Export test: every table the user appears in is represented; no other member's UPI ID or private item leaks.
- Consent test: Get started and join each write one `privacy_notice` row with the current version.
- Analytics lint: events are checked against an allow-list of properties (no free text).
- Contacts: with the system picker, the app never requests `READ_CONTACTS`; no network call carries contact data; nothing but a name is saved.
- Store review checklist: in-app deletion reachable within 3 taps from Settings; web deletion URL entered in Play Console Data safety.

## 18. Cost and free-tier impact

| Item | Impact |
|---|---|
| Export | Edge Function + R2 storage for 24 h; limited to 3/day/user; negligible |
| Deletion | a few queries per trip |
| Anonymous cleanup | keeps the 50k monthly-user allowance free of abandoned accounts |
| Backups | 30 days of encrypted dumps in R2; small |
| Web pages (notice, deletion) | Worker requests; negligible |
| Legal review | not a service cost, but required before launch |

## 19. Future considerations

- Contacts matching, only with phone login and a new, stronger design ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
- A registered Consent Manager integration if DPDP Rules require it for our class.
- A per-trip "hide my spend from the recap" personal setting.
- Two-step deletion with a 7-day grace period (undo).

## 20. Open questions

**Resolved:**
- **Anonymised display name:** "Former member" (numbered), with a `member.anonymised` op ([03 §11](../03-database-schema.md)). Those spots can't be claimed (OQ-P21).
- **Contacts matching:** dropped from v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
- **Consent:** `privacy_notice` only, recorded at Get started / join (OQ-P21, [03 §9](../03-database-schema.md)).
- **Lock-screen privacy:** the "Hide amounts on lock screen" setting (review S-05, [03 §3.1](../03-database-schema.md)).
- **Backups and deletion:** backups kept 30 days ([D-027](../decisions/D-027-environments-and-backups.md)).
- **Anonymous accounts with no trips:** deleted after 30 days ([03 §11](../03-database-schema.md)).
- **Public web page:** read-only in the beta ([D-024](../decisions/D-024-web-page-read-only-beta.md)).
- **Organiser hand-over on deletion:** OQ-P20 ([01](../01-overview.md#open-questions)) and [D-030](../decisions/D-030-removed-members-locked.md).
- **Deletion sync:** the server-only `member.anonymised` op ([06 §4](../06-syncing.md)).

**Still open (feature-level):**
1. **Minors:** DPDP requires verifiable parental consent for users under 18. Family and school trips may include minors. Do we add an age confirmation ("I'm 18 or older") at account creation, and how do ghosts who are minors fit?
2. **Attachments uploaded by a deleted user** to trips with other members are kept. Is that consistent with erasure rights for **their own** photos (e.g. a selfie in the feed)? Proposal: feed photos they posted are deleted; receipts and tickets (shared trip records) stay.
3. **DPDP Rules timing:** confirm with counsel which obligations apply at launch and which in later phases.
