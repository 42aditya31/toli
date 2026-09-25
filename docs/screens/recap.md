# Screen · Trip recap

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R3 (recap card, sharing and the public link). In R1a/R1b/R2 there is no recap: the settled state shows "Everyone's square." ([03 §6.5](../03-database-schema.md)) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- RECAP -->` block (lines 818–863) and `// recap` logic (lines 1287–1298). Entry from Settle up "done" state (line 529) and Feed header (line 794). Sidebar: "R3 · VAULT + MEMORY → Recap card". |
| **Related** | [features/feed-and-recap](../features/feed-and-recap.md) · [features/settle-up](../features/settle-up.md) · [features/pro-pass](../features/pro-pass.md) · [03 §6.5 recaps](../03-database-schema.md) · [04 §8a recap-publish / recap-revoke / recap-preview, §10 Worker `/r/:token`, `/og/r/:token.png`](../04-api-schema.md) · [06 §4 `recap.update`, §5 settled trips](../06-syncing.md) · [pro-sheet](pro-sheet.md) · [07 §11 analytics numbers](../07-calculation-engine.md) · [13 §6 TicketCard recap, Switch](../13-design-system.md) · [D-023 settle timing](../decisions/D-023-auto-settle-timing.md) · [permission matrix](../09-security.md#permission-matrix) · [settle-up](settle-up.md) · [feed](feed.md) |

---

## Purpose
**Why:** the end of the trip is the moment of peak good feeling, and the best moment for the group to show Toli to others (PRD F14: a deliberate viral surface).
**What:** one lime ticket card summing up the trip: total spent, biggest spend, busiest day, top category, what each person spent, and photos, with the Toli footer. It can be shared to WhatsApp or saved as an image, with per-person amounts hidden if the group prefers.
**How:** numbers are frozen into `recaps.snapshot` when the trip becomes settled (after **Close trip**, or 24 h after the end date, [D-023](../decisions/D-023-auto-settle-timing.md)). Sharing makes an image on the phone and a public read-only link (`toli.in/r/<token>`, from `/recap-publish`) served by the Worker.

## User goal
"Show the trip off to the group (and others) without exposing how much each of us spent, unless we want to."

## Entry points
| From | Trigger |
|---|---|
| [Settle up](settle-up.md) (done state) | **"Open the trip recap →"** under "Everyone's square." |
| [Feed](feed.md) | Header button **"Recap"** |
| Push `trip_ended` | Assumption: once settled, the notification links here |
| Trips list | Assumption: tapping an **ARCHIVED / SETTLED** trip card |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | Back "‹" |
| WhatsApp (share sheet) | **"Share to WhatsApp"** |
| Photos | **"Save"** |

## UI structure

### Header
`Header`: back (`CaretLeft`) and title **"Trip recap"**.

### Recap card (`TicketCard` recap variant)
Lime, `color.onAccent` text, `radius.card`, rises in (`dur.ticket`, `ease.enter`).
1. **Top** (padding `space.heroPad`):
   - `type.label`: **"<TRIP NAME> · <DATES>"**, e.g. **"Goa Weekend · 12–15 OCT"**.
   - Total spent, `type.display`: **"₹18,000"** (prototype 54 px).
   - Sub `type.caption`, 75% opacity: **"4 friends · 7 expenses · 3 settled"** (friends · expenses incl. kitty spends · settlements recorded). **When the settlement count is 0, that part is hidden** ("4 friends · 7 expenses"), because "0 settled" on a settled trip reads oddly (review U-14).
2. **Stats strip**: 3 equal cells separated by 1 px `color.perforation` lines; each cell: key `type.labelS` 70%, value `type.bodyStrong` at 800, sub `type.micro` 70%:
   | Key | Value | Sub |
   |---|---|---|
   | **"Biggest"** | ₹4,600 | "Scooter rentals" (description up to " ·") |
   | **"Busiest day"** | "Saturday" | ₹10,200 |
   | **"Top category"** | "Travel" | ₹5,400 |
3. **Per-person bars** (padding 12 20, gap 6): name (56 px, `type.caption` at 600) · an 8 px bar (track `color.onAccentSoft`, fill `color.onAccent`, width relative to the top spender, grows in 0.9 s after 0.3 s, `ease.move`) · amount (`type.monoS`, 64 px, right-aligned).
4. **Photo montage**: 3 tiles in a `2fr 1fr 1fr` grid, 84 px high, `radius.chip`. Reference placeholders show **"photo"** on a lime stripe; the app uses the trip's feed photos (Assumption: the three most recent, or picked by the user). Owner-only files are never used.
5. **Brand footer**: `color.onAccent` background, lime text, padding 12 × 20: the `Wordmark` left, **"Split your next trip · <domain>"** (`type.label`, no uppercase) right. The domain is still open (OQ-P5).

### Under the card
- **Toggle row** (`bg.card`, `radius.cardS`, padding 12 × 16): **"Hide per-person amounts"** + the design-system `Switch` (46 × 28, on = lime, off = raised, [13 §6](../13-design-system.md)).
  - When on: amounts become **"•••"** and every bar is full width, so relative spend is hidden too.
- **"Stop sharing link"** row (once a link exists), in `color.danger` text.

### Footer (padding 6 `space.gutter` 22, gap `space.stackTight`)
- Primary `Button` (flex 1, `size.cta`, `radius.cta`, lime): **"Share to WhatsApp"**.
- Tonal `Button` (100 px wide, `size.cta`, `bg.raised`): **"Save"**.

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `type.display` → 44; `space.gutter` → 16; the stats strip keeps 3 cells, subs truncate with an ellipsis.

Components: `Screen`, `Header`, `TicketCard` (recap), `ProgressBar` (on-lime variant), `Switch`, `Wordmark`, `Button` (incl. `danger` text), `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | Share: a brief spinner on the button while the image renders and (first time) the public link is created. |
| Empty | Trip with no expenses: Assumption: the card shows "₹0" and "Nothing spent yet"; stats cells show "—"; Share is disabled. |
| Populated | As above. |
| Error | Link creation failed (offline or server): share the **image only** and toast "Shared the card. The link will be ready when you're online." (Assumption). |
| Offline | Card renders from local data. Save works. Share to WhatsApp shares the image only (no link). |
| Syncing | n/a. |
| Success | Share → toast **"Recap card + link ready for WhatsApp"** then the system share sheet. Save → toast **"Saved to Photos"**. |
| Disabled | Share is disabled while the image is rendering. |
| Partial data | **Before the trip is settled** (opened from Feed): Assumption: the card is live, not frozen, and the label reads **"<TRIP> · SO FAR"**; sharing gives the image only; the public link is offered only after settlement. **No photos:** montage row hidden. **No dates:** label shows the trip name only. |

## Interactions
| Gesture | Result |
|---|---|
| Tap the toggle row (anywhere) | Flips **Hide per-person amounts**; card updates instantly. Saved for the group (`recap.update`, see API). Turning it off asks first: **"Show everyone's amounts again?"** (Assumption copy). Who may turn it on, off, publish or revoke: the [permission matrix](../09-security.md#permission-matrix). |
| Tap **Share to WhatsApp** | Renders the card to PNG (on the phone), gets/creates the public link, opens the share sheet with WhatsApp first, text: "Our Goa Weekend on Toli: ₹18,000, 4 friends. toli.in/r/…" (Assumption). |
| Tap **Save** | Saves the PNG to Photos (asks for media permission once). |
| Tap a photo tile | Assumption: pick which photos appear. |
| Long press the card | Assumption: choose a recap theme (Pro; on a free trip this opens the [Pro sheet](pro-sheet.md)). |
| **Stop sharing link** (row under the toggle, shown once a link exists) | Confirm → `POST /recap-revoke`; the old link then shows "This recap is no longer shared". Sharing again later creates a **new** link ([04 §8a](../04-api-schema.md)). |

## Data
| Value | Source |
|---|---|
| Frozen numbers (settled trips) | `recaps.snapshot` (SQLite copy) |
| Live numbers (not settled) | engine over current revisions: total = Σ `base_amount_minor`; biggest = max; busiest day = max Σ per `spent_at` day; top category = max Σ per category; per person = Σ `base_shares` ([07 §11](../07-calculation-engine.md)) |
| Counts | `trip_members` (friends), expenses, settlements (not voided) |
| Hide amounts, theme | `recaps.hide_amounts`, `recaps.theme` |
| Photos | `feed_posts` (kind photo) + `attachments` |
| Pro (themes, unbranded) | `trips.is_pro` |

## API / Database
| Action | Write / endpoint |
|---|---|
| Recap generated | Server-side when the trip becomes `settled` (server-only `trip.transition`, after `trip.close` or by the daily `lifecycle` job, [D-023](../decisions/D-023-auto-settle-timing.md)), writing `recaps.snapshot`. The nightly `balance-audit` rebuilds a missing snapshot ([04 §10.1](../04-api-schema.md)) |
| Toggle hide amounts / theme | op **`recap.update`** (field-LWW: `hide_amounts`, `theme`). Allowed on settled trips (on the one allow-list in [06 §5](../06-syncing.md)) |
| Create public link | `POST /recap-publish { trip_id }` → creates or returns the token (kept encrypted so the same link comes back) → `{ url: "https://toli.in/r/<token>" }`. Settled trips only ([04 §8a](../04-api-schema.md)) |
| Revoke link | `POST /recap-revoke { trip_id }` → sets `revoked_at` |
| Public page | Worker `GET /r/:token` (data from `/recap-preview`) renders the same card; amounts hidden when `hide_amounts`. It never includes UPI IDs, phone numbers, emails, expense descriptions or receipts |
| WhatsApp preview image | `GET /og/r/:token.png`. **Not drawn in the Worker** (its 10 ms CPU limit is too small): either a static branded template with the trip name overlaid as text, or an image rendered once by an Edge Function and cached in R2. It respects `hide_amounts` ([04 §10](../04-api-schema.md)) |
| Unbranded / themes | Pro only: the footer can be removed and a theme chosen (PRD §15). |

## Edge cases
- **Someone toggles "hide" after the link was shared:** the public page follows the current value (it reads `hide_amounts` on each view), but images already shared can't be changed.
- **A member deletes their account:** they show as "Former member" (anonymised, [03 §11](../03-database-schema.md)); their per-person amount still counts.
- **Trip reopened after settlement:** the public link **keeps the old snapshot** and is labelled **"Recap from 15 Oct"** until the trip settles again and a new snapshot is made (review C-14).
- **Settlement voided on a settled trip:** the trip moves back to settling ([06 §5](../06-syncing.md)); same as a reopen for the recap.
- **Kitty trips:** per-person spend is their share of every expense (including kitty-paid), not what they put in.
- **Multi-currency:** everything in the base currency.
- **Long names:** truncated with an ellipsis in the 56 px name column; amounts never truncated.
- **More than ~8 members:** Assumption: show the top 7 and "+3 more".

## Analytics
| Event | When | Properties |
|---|---|---|
| `recap_shared` | Share or Save completes | `channel` (`whatsapp` / `save` / `other`), Assumption: `hide_amounts` |
| `pro_paywall_viewed` | Tapping themes/unbranded without Pro | `feature: recap_theme` |

## Accessibility
- The card is read as a summary: "Goa Weekend, 12 to 15 October. Eighteen thousand rupees spent by 4 friends. Biggest: four thousand six hundred, Scooter rentals. Busiest day: Saturday. Top category: Travel."
- Per-person rows read "Rahul, three thousand …"; when hidden, "amount hidden".
- The switch is a real switch: "Hide per-person amounts, off".
- The generated image includes the same text for the WhatsApp preview; the public page has real text, not only an image.
- Reduce Motion: the card and bars appear without the rise and grow.

## Open questions / assumptions
- **Resolved:** `recap.update` ([06 §4](../06-syncing.md)) and `/recap-publish` / `/recap-revoke` ([04 §8a](../04-api-schema.md)) cover hiding, themes and the public link. Who can do what is in the [permission matrix](../09-security.md#permission-matrix).
- **Resolved:** the "0 settled" counter is hidden (review U-14); a reopened trip's public link keeps the old snapshot, labelled with its date (review C-14); the OG image is not drawn in the Worker.
- **Open:** domain. The reference shows **toli.app** (recap footer, invite URL `toli.app/t/goa-wknd`); [04](../04-api-schema.md) uses **toli.in**. See OQ-P5 in [01](../01-overview.md#open-questions).
- **Gap:** PRD F14 lists a **map of places visited** in the recap; the reference has no map. Kept as the reference (no map) for v1.
- **Resolved:** PRD F6 (R1) says settling "generates the recap (F14)", but there's no recap in R1: the settled state shows "Everyone's square." and the recap arrives in R3 ([03 §6.5](../03-database-schema.md)).
