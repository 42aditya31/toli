# Screen · Invite web page (public)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- INVITE WEB VIEW -->` block (lines 535–601); logic `inv` object (phases `pick` / `owe` / `upi` / `confirm` / `done`) |
| **Related** | [features/invites-and-joining](../features/invites-and-joining.md) · [features/settle-up](../features/settle-up.md) · [04 §3.2 invite-preview, §3.3 invite-member-view, §3.4 join, §5.1 upi-link, §5.1b web-settlement, §10 Worker routes](../04-api-schema.md) · [03 §4.3 trip_invites, §8.3 trip_balances](../03-database-schema.md) · [02 §5.2](../02-architecture.md) · [13 §8 (web: CSS variables, max width 480)](../13-design-system.md) · [D-008](../decisions/D-008-invite-links.md) · [join-in-app](join-in-app.md) · [settle-up](settle-up.md) · PRD F2, §13, §14 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **R1a (beta): read-only** ([D-024](../decisions/D-024-web-page-read-only-beta.md)): trip name, dates and total → **Which one are you?** → that person's own lines and amount → **Get the Toli app**. No claim, no UPI, no "I paid" from the browser.
> - `/invite-preview` returns **only names and the total**. Per-person numbers come only after picking a name, from `/invite-member-view`.
> - **R1b:** paying from the web through a **limited web membership** (Turnstile; can pay only its own debt, up to the suggested amount; recorded as **pending until the payee confirms**; the organiser is notified and can Release).

## Purpose
**Why:** the Participant ("Neha") didn't choose Toli; she got a WhatsApp link. She will not install anything before she sees what she owes. Showing the balance **before install** is the single highest-leverage adoption decision in the product (PRD F2, §13).
**What:** a lightweight public web page: who added you, the trip, **"Which one are you?"**, what you owe and why, a **Pay via UPI** button, and a "Did the payment go through?" confirmation.
**How:** served by the Cloudflare Worker at `/t/:token` (or `/j/:code`), server-rendered, ~20 KB. The Worker calls only the public 🌐 endpoints and holds no user data ([04 §10](../04-api-schema.md)). Seeing what you owe needs no account, no install, no wall. Paying signs the browser in anonymously and claims the spot first ([04 §3.3](../04-api-schema.md)).

## User goal
"What do I owe, and let me pay it right now."

## Entry points
| From | Trigger |
|---|---|
| WhatsApp / any chat | Tap the invite link (preview card from `/og/t/:token.png`: trip name, total, **"See what you owe"**) |
| Short link | `/j/GOA-7K2PXQ` |
| In-app [Settle up](settle-up.md) | **Their view** opens this page in the `owe` state for that payer (read-only preview inside the app) |
| Reminder / stub on WhatsApp | Link in the shared text |

## Exit points
| To | Trigger |
|---|---|
| Payer's UPI app | **Pay ₹1,200 via UPI** |
| App install / app (App Link) | **Get the Toli app** → Play Store (or the test APK during [D-016](../decisions/D-016-testing-distribution.md)); if installed, the App Link opens [Join in app](join-in-app.md) at step 2 |
| Close | Prototype **✕** in the address-bar strip (only in the in-app preview; a browser tab just closes) |

## UI structure
Mobile-first, max width 480 px, same tokens as CSS variables ([13 §8](../13-design-system.md)).

**Address strip** (prototype, in-app preview only): 38 px bar, radius 12, `color.bg.card`, mono 12 muted **"toli.app/t/goa-wknd"** + 28 px **✕**. (Real URL is `toli.in/t/<token>`; see Open questions.)

**Trip header** (always visible, padding 22 / 20):
- **"Aditya added you to"** (14 muted) — organiser's first name.
- **"Goa Weekend"** (36/800, −0.03em).
- **"12 – 15 Oct · 4 people · ₹17,000 spent"** (13 muted).

**Phase content** (gap 18):

| Phase | Content and exact copy |
|---|---|
| **pick** | **"Which one are you?"** (18/600). One 56 px row per member except the organiser (radius 16, `color.bg.card`, hover raised): 34 px avatar · name 16/600 · **"›"**. Footer 12 muted: **"No app or account needed to see what you owe."** |
| **owe** | Lime `TicketCard` (radius 24): **"{Name}, you owe Aditya"** (14) + amount 52/800 **"₹1,200"**; dashed perforation; line list (13 px rows, mono values): each expense paid by someone else that includes them, e.g. **"Casa Anjuna · 2 rooms ₹1,000"**, **"Cab to Baga ₹200"**; expenses they paid show as **"You paid {title}"** with **"−₹X"** (the part others owe them). Below: lime 56 px button **"Pay ₹1,200 via UPI"** + 12 muted centred **"Opens your UPI app with Aditya's UPI ID and the amount filled in."** |
| **upi** | `Card` (radius 24, padding 32 / 20, centred): 44 px spinner (lime top) · **"Opening your UPI app…"** (16/600) · mono 11 muted link text **"upi://pay?pa=aditya@okhdfc&am=1200&tn=Goa Weekend"**. Advances to confirm after ~1.4 s or when the page regains focus. |
| **confirm** | Raised card (radius 24, padding 22 / 20): **"Did the payment go through?"** (22/600) · **"Toli can't see UPI payments, so we record whatever you tell us. Aditya sees it straight away."** (13 muted) · buttons 50 px: lime **"Yes, I paid"** · dark **"Not yet"** (back to owe). |
| **done** | `Card` radius 24 with a lime `Stamp` top-right (3 px lime border, mono 13/700, pop). Paid: title **"Recorded."** (26/800), text **"Aditya has been notified. This is based on your confirmation, since Toli never sees the payment itself."**, stamp **"PAID"**. Nothing owed: title **"You're all square."**, text **"Nothing to pay on this trip right now."**, stamp **"SQUARE"**. Then lime 56 px **"Get the Toli app"** + 12 muted **"Your history comes with you when you claim your spot."** |

Assumption: an extra **owed** variant of the done card for creditors (the prototype shows "all square" to anyone with no payment to make, even if they are owed money): title **"You get back ₹3,400."**, text **"Rahul, Neha and Jay will pay you. Get the app to see when they do."**, no stamp.

Components (web equivalents): `TicketCard`, `Card`, `Row`, `Avatar`, `Button`, `Stamp`, spinner.

## States
| State | Behaviour |
|---|---|
| Loading | Server-rendered, so the first paint has data. Phase changes are instant (member lines come with `invite-member-view`). Assumption: 300 ms spinner in the owe card if the member call is slow. |
| Empty | Trip with no expenses: header shows **"₹0 spent"**; after picking, done card **"You're all square."** |
| Populated | pick → owe → upi → confirm → done. |
| Error | `invite_invalid` → page **"This invite link doesn't work anymore"** / **"Ask the person who shared it for a new one."** `invite_expired` → **"This invite has expired"** + same line. `rate_limited` → **"Too many tries. Try again in a few minutes."** Payee has no UPI ID (`no_upi_id`) → the Pay button is replaced by text **"Aditya hasn't added a UPI ID. Pay by cash or bank transfer, then tap below."** + **"I've paid"** (claims the spot as above, then confirm). Trip not in INR (`not_inr`, [04 §5.1](../04-api-schema.md)) → no UPI button, only **"I've paid"**. Spot already claimed by someone else (`already_claimed`) → **"This spot is taken. Open the Toli app or ask the organiser."** ([04 §3.3](../04-api-schema.md)). (Other copy is Assumption.) |
| Offline | The browser shows its own offline page; nothing to cache (Assumption). |
| Syncing | n/a. |
| Success | done / PAID. |
| Disabled | **Pay via UPI** on desktop browsers (no UPI apps): Assumption: show **"Open this page on your phone to pay with UPI."** |
| Partial data | Direct mode with two payments for one person: one owe card per payee (Assumption). Member already paid everything: done / SQUARE. |

## Interactions
| Interaction | Result |
|---|---|
| Tap a member row | Load their view (`invite-member-view`) → owe (or done if nothing owed). |
| Tap **Pay … via UPI** | Sign the browser in anonymously → `POST /join` with `claim_member_id` (first claim wins) → `POST /upi-link` → open the `upi://pay` link → upi phase → confirm ([04 §3.3](../04-api-schema.md)). |
| **Yes, I paid** | `POST /web-settlement` (method `upi`, `Idempotency-Key`) → done / PAID. The payee is notified ([04 §5.1b](../04-api-schema.md), OQ-P8). |
| **Not yet** | Back to owe. |
| **Get the Toli app** | Store / APK link, or App Link into the app if installed. |
| Browser back | Previous phase (Assumption: phases are pushed to history). |

## Data
| UI | Source |
|---|---|
| Header | `GET /invite-preview` → `trip { name, start_date, end_date, base_currency, total_spent_minor }`, `organiser_first_name`, member count |
| Member list | `invite-preview.members[]` (`display_name`, `is_ghost`) |
| Owe card, lines | `GET /invite-member-view?token=&member_id=` ([04 §3.3](../04-api-schema.md)); balances from `trip_balances` cache ([03 §8.3](../03-database-schema.md)) |
| UPI link | `POST /upi-link`, only after the browser has claimed the spot; never from `invite-member-view` |

Never shows phone numbers, emails, user IDs, or UPI IDs before the claim ([04 §3.2–3.3](../04-api-schema.md)).

## API / Database
- Reads: `invite-preview`, `invite-member-view` (public, rate-limited; 10 wrong codes per IP per hour).
- Pay: anonymous sign-in (supabase-js) → `POST /join { token, claim_member_id }` (writes `member.claim`) → `POST /upi-link`.
- **"Yes, I paid"**: `POST /web-settlement { trip_id, to_member_id, amount_minor, method: "upi" }`, which writes `settlement.create` through the same path as `sync-push` ([04 §5.1b](../04-api-schema.md)).

## Edge cases
- **Someone picks the wrong name:** they see that person's lines (accepted by [D-008](../decisions/D-008-invite-links.md)); they can go back and pick again. Tapping Pay claims that spot; there's no approval, the organiser is notified and can **Release** a wrong claim (OQ-P14 in [01](../01-overview.md#open-questions)). A wrong settlement can be voided by the recorder or an organiser (OQ-P12).
- **Organiser opens their own link:** they aren't in the pick list; Assumption: a footer link **"Made this trip? Open it in the app."**
- **Trip settled:** header adds a **SETTLED** stamp; every member's view is done / SQUARE.
- **Link rotated while page is open:** next call fails with `invite_invalid`.
- **Amount formatting:** Indian grouping and "₹" always ([07 §12](../07-calculation-engine.md)); UPI link amount uses 2 decimals (`am=1200.00`, [04 §5.1](../04-api-schema.md)).

## Analytics
| Event | When | Properties |
|---|---|---|
| `invite_link_opened` | Page load | `installed: false` |
| `upi_link_tapped` | Pay via UPI | `surface: web` (Assumption) |
| `settlement_recorded` | Yes, I paid | `method: upi`, `partial: false` |

Web analytics must use no cookies beyond what the privacy notice allows (Assumption; PRD §18).

## Accessibility
- Semantic HTML: the trip name is `h1`; phases are live regions.
- Member rows are buttons: "I'm Neha".
- Owe card read as "Neha, you owe Aditya one thousand two hundred rupees."
- Buttons ≥ 44 px; contrast from the same tokens (≥ 4.5:1).
- Works without JavaScript for the pick and owe phases (server-rendered links), Assumption.

## Open questions / assumptions
- **Domain:** the prototype shows **toli.app/t/goa-wknd**; [04](../04-api-schema.md) and [D-008](../decisions/D-008-invite-links.md) use **toli.in/t/<token>** (a random token, not a readable slug). See OQ-P5 in [01](../01-overview.md#open-questions).
- **Web payment recording:** resolved by `/web-settlement` after an anonymous claim ([04 §5.1b](../04-api-schema.md), OQ-P8).
- The **upi** phase prints the raw `upi://` link, including the payee's UPI ID. That's allowed once the debtor has claimed the spot, but it may be better to hide it.
- **Creditors** have no "you get back" state in the prototype.
- Only the organiser's name appears ("Aditya added you to", "you owe Aditya"), because the prototype has one creditor. With several creditors the payee name must come from the payment.
