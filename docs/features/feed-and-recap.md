# Feature · Trip feed and recap (F14)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R3. **No recap in R1a, R1b or R2**: a settled trip just shows "Everyone's square." ([01 §6](../01-overview.md#6-scope), [03 §6.5](../03-database-schema.md); review C-05) |
| **PRD refs** | F14, F6 (settle → recap), §15 (recap free; custom themes and unbranded sharing are Pro), §19 (`recap_shared`, `trip_settled`), §20 (R3 ship criterion) |
| **Related** | Screens: [feed](../screens/feed.md) · [recap](../screens/recap.md) · [settle-up](../screens/settle-up.md) · [trip-home](../screens/trip-home.md) · Docs: [03 §6.4–6.5, §7.1, §8.1](../03-database-schema.md) · [04 §2, §4, §8a, §10](../04-api-schema.md) · [06 §3–4](../06-syncing.md) · [07 §11](../07-calculation-engine.md) · [13 §5–6](../13-design-system.md) · Features: [settle-up](settle-up.md) · [pro-pass](pro-pass.md) · [itinerary-and-places](itinerary-and-places.md) · Decisions: [D-008](../decisions/D-008-invite-links.md), [D-023](../decisions/D-023-auto-settle-timing.md), [D-031](../decisions/D-031-permission-matrix.md) |

---

## 1. Purpose

- **Feed:** one reverse-chronological story of the trip: spends, settlements, kitty top-ups, joins, plan changes, photos and notes. There is no in-app notification inbox in v1, so the feed is also the history of what happened ([04 §8a](../04-api-schema.md)).
- **Recap:** when the trip settles, turn the ledger into a memory: a branded card and a public read-only link the group wants to share.
- **Before R3:** the Feed tab doesn't exist yet (R1 tab bar is Trip · (+) · Members, OQ-P11 in [01](../01-overview.md#open-questions)), and a settled trip just shows "Everyone's square." with no recap ([03 §6.5](../03-database-schema.md)).

## 2. User problem

- After the trip, the ledger is just numbers; the fun part lives in scattered WhatsApp photos.
- "What happened on day two?" has no single answer.
- Some people don't want their personal spend shown to the world.

## 3. Business goal

- A **deliberate viral surface** at the moment of peak positive sentiment (PRD F14): every shared recap carries an install call-to-action.
- **R3 ship criterion:** recap shared from ≥ 40% of settled trips (PRD §20).
- Adds to the trip archive, which creates switching costs (PRD §3).

---

## 4. User flow

**Feed**
1. The user opens the **Feed** tab. Items are grouped by day ("SUN 13 OCT · TODAY", "SAT 12 OCT"), newest first.
2. Each item has a mark tile (₹ expense, K kitty, ✓ settlement, ✈ trip start, initials for people), a one-line text ("Rahul paid ₹800 · Cab to Baga"), an optional photo, and a mono time. Money events use the lime tile.
3. **+ Post** lets the user add a note ("scuba moved to 12:00, pickup at Baga jetty") or a photo with an optional caption, without attaching it to an expense.
4. Tapping a money item opens that expense ([expense-detail](../screens/expense-detail.md)) or settlement.

**Recap**
1. When the server settles the trip (every derived payment is 0 after the rounding adjustment, **and** either the end date + 24 h has passed or someone tapped **Close trip**, [D-023](../decisions/D-023-auto-settle-timing.md)), Settle up shows "Everyone's square." with a SETTLED stamp and **Open the trip recap →** (UI reference).
2. The recap screen shows the lime recap card: trip name and dates, **total spent**, "4 friends · 18 expenses · 3 settled" (the "settled" counter is hidden when it's 0, review U-14), three stats (**Biggest**, **Busiest day**, **Top category**), per-person bars with amounts, a photo montage, and the footer "toli · Split your next trip · toli.in".
3. Below: a **Hide per-person amounts** switch. When on, amounts show as "•••" on the card and on the public page.
4. **Share to WhatsApp** creates the public link if needed (`/recap-publish`) and shares the image card plus the link; **Save** saves the image to Photos.
5. The group's friends open `toli.in/r/<token>`: a read-only recap page with a **Get the Toli app** button.

---

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| FD-01 | A reverse-chronological trip feed: expenses, settlements, kitty top-ups, member joins, itinerary changes, photos and free-text notes. | MUST | F14 |
| FD-02 | The feed is **derived** from the trip op log (`trip_ops`) plus `feed_posts`; money events are not stored twice. | MUST | [03 §6.4](../03-database-schema.md) |
| FD-03 | Members can post photos and notes to the feed without attaching them to an expense. | MUST | F14 |
| FD-04 | The feed is readable offline. | MUST | §12 |
| RC-01 | On settlement, generate a recap: total spent, per-person totals, biggest expense, spend by category, busiest day, a map of places visited, and a photo montage. | MUST | F14, F6 |
| RC-02 | Render the recap as a shareable **image card** and a **public read-only link**, both branded, both with an install call-to-action. | MUST | F14 |
| RC-03 | The group can **exclude per-person amounts** from the shared version. | MUST | F14 |
| RC-04 | The recap's numbers are **frozen** when the trip settles (`recaps.snapshot`), so everyone sees the same card. | MUST | [03 §6.5](../03-database-schema.md) |
| RC-05 | The public link can be revoked. | MUST | §18 (proposal) |
| RC-06 | Custom recap themes and unbranded sharing are Pro. The standard branded recap is free. | MUST | §15 |
| RC-07 | The public page never shows phone numbers, UPI IDs, emails, expense-level details or receipts. | MUST | §18 |

---

## 6. Business rules

**Feed**
1. **Sources:** `trip_ops` op types → feed items: `expense.create/edit/delete`, `settlement.create/void/confirm` (including "Rounding · ₹0.33" rows, [D-021](../decisions/D-021-rounding-adjustment.md)), `kitty.contribute/void/handover`, `member.add/claim/release/anonymised`, `trip.transition` (started, settled, reopened), `trip.close`, `trip.request_reopen`, `itinerary.*` and `booking.*` (plan changes); plus `feed_posts` (`note`, `photo`). On the phone these come from the local `activity` table ([03 §10](../03-database-schema.md)).
   - **Private ops never appear in anyone else's feed.** A personal `budget.set` or an owner-only `attachment.register` has `trip_ops.visible_to_member_id` set, so other members never pull it ([06 §4](../06-syncing.md); review S-07).
2. **Event time:** expenses use `spent_at` (when it was spent); everything else uses the op's `server_ts`. Ties by `seq`. Days are the trip's local dates.
3. **Grouping noise:** consecutive plan changes by the same person within 30 minutes collapse into one line ("Rahul updated the plan · 3 changes"). Expense edits show as "Neha edited *Dinner* (amount ₹1,200 → ₹1,300)".
4. **Deleted expenses** stay in the feed as "Neha deleted *Dinner* (₹1,200)" (the audit trail is visible, PRD §18).
5. **Pending local items** appear immediately with "SAVED ON PHONE".
6. **Posts:** a note is ≤ 500 characters; a photo post has one photo (compressed, EXIF-stripped) plus an optional caption. Who can delete a post is in the permission matrix (§12). Posts are still allowed on a settled trip ([06 §5](../06-syncing.md) allow-list).
7. **Feed text never shows other people's shares** beyond what the expense screen already shows.

**Recap**
8. **When:** generated by the server when it applies the server-only `trip.transition → settled` ([06 §4](../06-syncing.md)). That happens when every derived payment is 0 (after the rounding adjustment) **and** either the daily `lifecycle` job finds `end_date` + 24 h has passed, or a member taps **Close trip** ([D-023](../decisions/D-023-auto-settle-timing.md), OQ-P13). It uses `@toli/engine` so every phone shows identical numbers. If the snapshot is missing, the nightly `balance-audit` job rebuilds it ([04 §10.1](../04-api-schema.md)). Phones may render a provisional recap from local data until the snapshot arrives.
9. **Numbers** (all base currency, display-only, [07 §11](../07-calculation-engine.md)):
   - **Total spent** = Σ `base_amount_minor` of current, non-deleted expenses (including kitty-paid).
   - **Per-person total** = Σ that member's `base_minor` shares (what they consumed, not what they paid).
   - **Biggest expense** = the largest single expense (title + amount).
   - **Busiest day** = the trip day with the highest total spend.
   - **Top category / by category** = Σ per category.
   - **Places visited** = saved places with coordinates (and itinerary items with places).
   - **Photo montage** = up to 6 feed photos, most recent or most "liked" (v1: most recent).
10. **Reopen:** if a settled trip is reopened (organiser, logged), or a settlement is voided (back to `settling`), the public page **keeps the old snapshot** and labels it "Recap from 15 Oct" (review C-14). When the trip settles again, the snapshot is regenerated. The public token stays the same unless revoked.
11. **Hide per-person amounts** (`recaps.hide_amounts`, op `recap.update`) affects the image card **and** the public page. Switching it **off** again asks for confirmation ([03 §6.5](../03-database-schema.md)). `recap.update` is still allowed on a settled trip ([06 §5](../06-syncing.md) allow-list).
12. **How the recap changes:** only through the op `recap.update` (field-LWW: `hide_amounts`, `theme`) and the two endpoints `/recap-publish` (create or return the link) and `/recap-revoke` ([04 §8a](../04-api-schema.md)).
    - The token is 128-bit random. It is stored twice, like invites ([D-008](../decisions/D-008-invite-links.md)): `recaps.public_token_hash` (SHA-256, for lookups) and `recaps.public_token_encrypted` (decryptable only by Edge Functions).
    - Because the token is stored encrypted, `/recap-publish` returns the **same link** every time, so any member can re-share it without creating a new one.
    - Revoking sets `revoked_at`; the page then shows "This recap is no longer shared". Publishing again after a revoke creates a **new** token.
13. **Names on the public page:** members' display names as entered (first names in practice). No avatars from profiles, no member IDs.
14. **Branding:** the free recap always has the Toli footer and the install CTA. Pro unlocks themes and an **unbranded** card (the public page still shows a small "Made with Toli" link; see Open question 2).
15. **What the public page can show** (from `/recap-preview`, [04 §8a](../04-api-schema.md)): trip name, dates, total, member display names, per-person totals (unless `hide_amounts`), the stats, and photo thumbnails signed for 1 hour. It **never** shows UPI IDs, phone numbers, emails, expense descriptions or receipts.
16. **Preview image (OG card):** **not drawn in the Worker**, because its 10 ms CPU limit is too small. It is either a static branded template with the trip name overlaid as text, or an image rendered once by an Edge Function and cached in R2 ([04 §10](../04-api-schema.md)). It respects `hide_amounts`.

---

## 7. Data model

From [03](../03-database-schema.md):

| Table | Use |
|---|---|
| `trip_ops` | the source of feed events (`type`, `entity_id`, `result`, `user_id`, `member_id`, `server_ts`) |
| `feed_posts` | `id`, `trip_id`, `author_member_id`, `kind` (`note`/`photo`), `text`, timestamps, `deleted_at`, `last_seq` |
| `attachments` | photos for posts: `owner_type = feed_post` |
| `recaps` | `trip_id` PK, `snapshot` jsonb, `hide_amounts`, `theme` (Pro), `public_token_hash`, `public_token_encrypted` (so the same link can be re-shared), `generated_at`, `revoked_at`, `updated_at`, `last_seq` |
| Local `activity` | the phone's copy of the op history that drives the feed: `trip_id`, `seq`, `type`, `entity_id`, `actor_member_id`, `summary`, `server_ts` ([03 §10](../03-database-schema.md)) |
| expenses, settlements, kitty, members, places | inputs to the snapshot |

**Feed history on a new phone or for a late joiner:** `/trip-snapshot` includes the last 500 ops as `activity[]`, and older history loads on scroll through `/trip-activity` ([04 §2.3](../04-api-schema.md)).

---

## 8. API requirements

| Call | Status | Detail |
|---|---|---|
| `feed.post` / `feed.delete` | exists ([06 §4](../06-syncing.md)) | field-LWW |
| `attachment.register`, `/upload-url`, `/upload-confirm`, `/download-url` | exist ([04 §4](../04-api-schema.md)) | feed photos |
| Pull `trip_ops` through PostgREST (fallback `/sync-pull`), and `catch_up` in the `/sync-push` response | exists ([04 §2.2](../04-api-schema.md), [D-026](../decisions/D-026-write-path-and-compat.md)) | delivers new ops, which become feed items; RLS leaves out other people's private ops |
| `/trip-snapshot` `activity[]`, `GET /trip-activity?trip_id=&before_seq=` | exist ([04 §2.3](../04-api-schema.md)) | last 500 ops on join; 200 older rows per page on scroll |
| `trip.transition` → `settled` | exists (server-only) | triggers recap generation on the server |
| `recap.update { hide_amounts?, theme? }` | exists ([06 §4](../06-syncing.md)) | field-LWW |
| `POST /recap-publish`, `POST /recap-revoke` | exist ([04 §8a](../04-api-schema.md)) | create or return the **same** public link (`https://toli.in/r/<token>`, decrypted from `public_token_encrypted`); revoke it (any member) |
| 🌐 `GET /recap-preview?token=` | exists ([04 §8a](../04-api-schema.md)) | the trimmed snapshot for the Worker; photo thumbnails signed for 1 h; 30/min per IP |
| `GET /r/:token`, `GET /og/r/:token.png` (Worker) | exist ([04 §10](../04-api-schema.md)) | public recap page and WhatsApp preview card; both respect `hide_amounts`. The Worker serves the OG image but doesn't draw it (rule 16) |

---

## 9. UI requirements

Screen docs: [screens/feed](../screens/feed.md), [screens/recap](../screens/recap.md).

**Feed (UI reference FEED section)**
- Header "Trip feed" (`type.title`) + **Recap** button (raised).
- Day labels in `type.label` mono ("SUN 13 OCT · TODAY").
- Rows: 36 px mark tile (lime for money events, raised otherwise), text 14 px, optional 140 px photo, mono time.
- **+ Post** (sheet: note or photo).

**Recap (UI reference RECAP section)**
- Lime card (radius 26, rises in with `tsRise`): mono "GOA WEEKEND · 12–15 OCT", total (`type.display`), sub-line, 3-column stats strip, per-person bars (dark on lime; amounts mono; "•••" when hidden), 3-tile photo montage, dark footer "toli · Split your next trip · toli.in".
- **Hide per-person amounts** switch row.
- Actions: **Share to WhatsApp** (primary) and **Save** (tonal).
- Image card export: rendered from the same component at 1080 px wide (portrait), as PNG.
- Public page (Worker): same tokens as CSS variables, max width 480 px ([13 §8](../13-design-system.md)), ~20 KB, **Get the Toli app** button, no login.
- Numbers count up; no confetti ([13 §6.3](../13-design-system.md)).

---

## 10. States

| State | Display |
|---|---|
| Empty feed | "The trip story starts with the first expense." |
| Feed offline | full local feed; new posts marked "SAVED ON PHONE" |
| Photo still uploading | local image with a small progress ring |
| Recap before settlement | Recap button shows "Your recap appears when everyone's square" with a provisional preview |
| Recap provisional (snapshot not synced yet) | card rendered locally; share disabled until synced |
| Recap ready | card + share |
| Amounts hidden | "•••" on bars; public page the same |
| Link revoked | public page: "This recap is no longer shared" |
| Trip reopened | in the app: recap marked "Out of date · settles again when everyone's square"; public page: the old snapshot labelled "Recap from 15 Oct" |
| No recap yet (R1a–R2) | Settle up shows only "Everyone's square." |

---

## 11. Edge cases

| Case | Handling |
|---|---|
| Trip with no photos | montage replaced by a places map or a category bar row |
| Trip with no places | no map section |
| One-person trip | no per-person bars; "You spent ₹X" |
| Deleted account in the group | recap shows the anonymised member name ([account-and-privacy](account-and-privacy.md)) |
| Very long trip names | truncated with ellipsis on the card; full on the page |
| Busiest day tie | earliest day wins (deterministic) |
| Offline trips with hundreds of ops | feed paged locally, 50 items at a time |
| Someone posts an inappropriate photo | author or organiser can delete; deleted photos are removed from R2 and the recap montage |
| A member wants off the public page | turning on **Hide per-person amounts** hides amounts; names still show (see Open question 1) |
| Settled with foreign-currency expenses | all recap numbers in base currency |

---

## 12. Permissions

Who can do what is defined only in the [permission matrix](../09-security.md#permission-matrix) ([D-031](../decisions/D-031-permission-matrix.md)). In short: any app-claimed member can read the feed, post, publish and share the recap, turn hide amounts on (off asks to confirm) and **revoke** the link (privacy beats sharing); members delete their own posts and organisers can delete any. Anyone with the recap link can view the public page, read-only. Themes and unbranded sharing need a Pro trip.

## 13. Offline behaviour

- The feed is built from the local `activity` table and works offline; posts queue in the outbox, photos in `file_queue`. Scrolling past the last 500 ops needs the network (`/trip-activity`).
- The recap card can be viewed and **saved as an image** offline once the snapshot is on the phone.
- Creating the public link and sharing it need the network (WhatsApp does too).

## 14. Sync behaviour

- New ops from the pull (PostgREST, or `catch_up` in the push response) become feed items in `seq` order; Realtime makes other members' posts appear within seconds while the feed is open.
- `feed.post`/`feed.delete` and `recap.update` are field-LWW.
- The recap snapshot is written by the server in the same transaction that applies the server-only `trip.transition → settled`, then pulled like any other row.

---

## 15. Analytics

| Event | Properties | Source |
|---|---|---|
| `trip_settled` | `days_to_settle` | PRD §19 |
| `recap_shared` | `channel` (whatsapp / other / save_image / link_copy), `hide_amounts`, `is_pro_theme` | PRD §19 |
| `feed_post_created` | `kind` (note / photo) | proposed |
| `recap_viewed` | `source` (settle / feed / notification) | proposed |
| `recap_link_opened` (Worker) | `installed` (bool, where known) | proposed; mirrors `invite_link_opened` |

The recap link open → install is a key virality metric; attribute installs from `/r/` like invite installs.

## 16. Error handling

| Error | Handling |
|---|---|
| Photo upload fails | stays queued; post shows locally with "uploading" |
| Snapshot generation fails on the server | trip still settles; the nightly `balance-audit` job rebuilds the missing snapshot ([04 §10.1](../04-api-schema.md)); Sentry alert |
| Public page token invalid/revoked | friendly page with the install CTA |
| Image export fails (low memory) | retry at a lower resolution |

## 17. Testing

- Unit: op → feed item mapping for every op type; grouping of plan changes; event-time ordering.
- Engine: recap numbers from golden fixtures (G1 trip: total ₹6,000; per-person A ₹1,800, R ₹1,800, N ₹1,200, J ₹1,200; biggest "Hotel ₹4,000").
- Server: settle → snapshot written once; reopen → public page keeps the old snapshot; settle again → regenerated with the same token.
- Server: `/recap-publish` twice returns the same URL; after `/recap-revoke`, publishing gives a new token.
- Privacy: another member's feed never contains a private op (personal budget, owner-only file).
- Privacy: public page never contains UPI IDs, phone numbers, emails, expense descriptions or receipt images; `hide_amounts` removes every per-person amount (including in the OG image).
- E2E: settle → recap → share → open link in a browser without the app.

## 18. Cost and free-tier impact

| Item | Limit | Expected usage | Breaking point |
|---|---|---|---|
| Worker (public page, serving the OG image) | 100k requests/day; 10 ms CPU per request | a few dozen views per shared recap | the OG image is never drawn in the Worker: a static template with text, or a PNG rendered once by an Edge Function and cached in R2 |
| R2 | 10 GB | feed photos ~150 KB each | tens of thousands of photos |
| Edge Functions | 500k invocations/month | 1 snapshot per settled trip | none |
| Image rendering | on the phone | — | — |

## 19. Future considerations

- Reactions on feed items.
- Year-in-trips recap across a user's trips (Pro annual).
- Video montage.
- Printable photo book partner (affiliate).

## 20. Open questions

**Resolved:**
- **Who can revoke the public link:** any member ([04 §8a](../04-api-schema.md), [permission matrix](../09-security.md#permission-matrix)).
- **When the recap is made:** on settle, per [D-023](../decisions/D-023-auto-settle-timing.md) (end date + 24 h, or Close trip).
- **Re-sharing the same link:** the token is stored encrypted, so `/recap-publish` returns it again ([03 §6.5](../03-database-schema.md)).
- **Public recap after a reopen:** keeps the old snapshot with a date label (review C-14).
- **OG image:** not drawn in the Worker ([04 §10](../04-api-schema.md)).
- **Recap in R1:** none; it arrives in R3 (review C-05).

**Still open (feature-level):**
1. **Names on the public page:** should the public recap show member names at all, or only "4 friends"? PRD only requires hiding amounts.
2. **Unbranded Pro recap vs the viral CTA:** does "unbranded" remove the install CTA from the public page too? That reduces the viral surface for exactly the most engaged groups.
3. **Photos on the public page:** `/recap-preview` includes photo thumbnails ([04 §8a](../04-api-schema.md)). Should the group be able to turn them off? Photos of people on a public URL is a privacy risk.