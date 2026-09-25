# Feature · Settle up

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **PRD refs** | [F6][prd] (the value moment), §9.5 (simplification, simplified/direct), §9.6 (partial, overpayment), §14 (never touch money; `upi://pay`; no confirmation callback), §6.2 (settlement rate, UPI link conversion), §21 (reminders as harassment risk), F14 (recap on settlement) |
| **Related** | Screens: [settle-up](../screens/settle-up.md) · [tear-overlay](../screens/tear-overlay.md) · [balance-trace](../screens/balance-trace.md) · [invite-web](../screens/invite-web.md) · [recap](../screens/recap.md) · [notifications](../screens/notifications.md) — Docs: [07 §8 settlement][engine] · [03 §5.6 `settlements`, §9 `reminders`][db] · [04 §5.1 `/upi-link`, §5.2 `/reminder-send`, §11][api] · [06 §4–5][sync] — Decisions: [D-012][d012] · [D-006][d006] · [D-009][d009] · [D-010][d010] — Features: [balances-and-trace](balances-and-trace.md) · [kitty](kitty.md) · [trips](trips.md) · [feed-and-recap](feed-and-recap.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **R1a:** Simplified only. **Direct** (exact north-west-corner pairing) is **R1b** ([D-020](../decisions/D-020-direct-mode-exact-pairing.md)).
> - **Exact Mark as paid + rounding adjustment under ₹1 when closing** ([D-021](../decisions/D-021-rounding-adjustment.md)).
> - **Settled** = all zero **and** (end date + 24 h, or **Close trip**). **Request reopen** for members ([D-023](../decisions/D-023-auto-settle-timing.md)). No mid-trip locking.
> - **Duplicate settlements** (same pair and amount within 24 h, by two people) trigger "Already recorded?" ([06 §5](../06-syncing.md)).
> - **UPI over ₹1 lakh** is split into several links ([07 §8.5](../07-calculation-engine.md)). UPI is INR-only.
> - **Web payments** are **R1b only**, pending until the payee confirms ([D-024](../decisions/D-024-web-page-read-only-beta.md)).
> - Recorded payments list with Void: [screens/recorded-payments](../screens/recorded-payments.md). Permissions: [matrix](../09-security.md#permission-matrix).

## 1. Purpose

Turns everyone's balance into **the fewest possible payments** ("12 payments → 3"), gets each payer a one-tap way to pay in **their own UPI app**, records what was paid, and closes the trip when everyone's square.

Toli **never touches money** and **can't see payments**. People confirm them.

## 2. User problem

Knowing Rahul owes ₹1,000 isn't the same as Rahul having paid. Chasing a friend is awkward, so people quietly eat the loss. And some groups object to "pay someone you never transacted with".

## 3. Business goal

- **North star: trips settled per week.**
- **G2:** ≥ 80% of trips with 5+ expenses fully settled within 14 days of the end date.
- **UPI link conversion:** ≥ 45% of derived payments settled through the in-app UPI link.

## 4. User flow

**Organiser closes the trip**
1. Trip home → **Settle up →**.
2. The top card shows "~~6~~ → **3** payments" and a **Simplified | Direct** toggle with one line of help.
3. Each derived payment is a lime ticket: avatar, "Neha pays Aditya", the "why" line ("Room ₹1,000 + Cab ₹200"), amount; buttons **Remind**, **Mark as paid**, **Their view**. Tapping the ticket opens the trace.
4. If there's a kitty with leftovers: "Kitty leftovers (₹3,000) are handed back by Rahul in proportion to contributions."
5. **Hold to tear & send stubs ✂** (hold 900 ms; "Keep holding…") calls `/stubs-send` ([04 §5.1a][api]). The tear overlay plays; each payer on Toli gets a stub push. The toast names anyone who couldn't be pushed: "Sent to Rahul, Neha. Share with Jay on WhatsApp." Helper line: "Each person gets a stub that opens their own UPI app. Toli never holds the money and can't see payments, so payers confirm them."
6. **WhatsApp** (top right) shares the summary text and image card to the group.

**Payer pays**
1. Neha opens her stub (notification, app, or web link) → **Pay ₹1,200 via UPI** (INR-base trips only; otherwise only **Mark as paid**).
2. The app asks the server for the link (`/upi-link`) and opens her UPI app with Aditya's UPI ID, name, amount and "Toli · Goa Weekend" filled in.
3. She pays with her PIN in her own app.
4. Back in Toli: "**Did the payment go through?**" — "Toli can't see UPI payments, so we record whatever you tell us. Aditya sees it straight away." → **Yes, I paid** / **Not yet**.
5. Yes → a settlement (method `upi`) is recorded (on the web page, through `/web-settlement`, [04 §5.1b][api]). Aditya gets "Neha paid you ₹1,200".

**Mark as paid (cash, bank, anything else)**
1. On a payment → **Mark as paid** → sheet: amount (defaults to the full amount, editable for partial), method (Cash / Bank / UPI / Other), optional note → **Record**.
2. Toast "Neha → Aditya ₹1,200 recorded".

**Everyone's square**
1. When the server auto-settles the trip (§6.8), the screen shows a lime card: trip name, "**Everyone's square.**", "3 payments recorded. The trip is now read-only.", stamp **SETTLED**.
2. From R3: **Open the trip recap →**. R1 has no recap ([03 §6.5][db]).

## 5. Requirements

| ID | Requirement | Level | PRD |
|---|---|---|---|
| SU-1 | Produce the simplified payment list, with a **direct / simplified** toggle. | MUST | F6, §9.5 |
| SU-2 | Show the payment-count reduction prominently ("12 payments → 3"). | MUST | F6, §9.5 |
| SU-3 | Every derived payment is tappable to its derivation ("covers your ₹1,000 room share and ₹200 cab share"). Never present it as a debt the user "has". | MUST | §9.5 |
| SU-4 | For payees with a saved UPI ID, generate a `upi://pay` link prefilled with payee VPA, name, amount and a note with the trip name. | MUST | F6, §14 |
| SU-5 | On return from the UPI app, ask "Did the payment go through?" and record a settlement on confirmation. **Never imply verification.** | MUST | F6, §14 |
| SU-6 | Manual **mark as paid** for cash, bank transfer or off-app payments, with an optional note. | MUST | F6 |
| SU-7 | Partial settlement of any amount. Overpayment allowed, with a warning. | MUST | F6, §9.6 |
| SU-8 | Any member can send a **settlement summary** to WhatsApp as clean text plus an image card. | MUST | F6 |
| SU-9 | **Reminders** as a push and shareable to WhatsApp; **one per member per 48 hours**. | MUST | F6, §21 |
| SU-10 | The server marks the trip `settled` automatically when the derived payments reach zero (OQ-P13, §6.8). The recap is generated from R3. | MUST | F6 |
| SU-11 | Never touch, hold, route, pool or transmit funds. | MUST | F6, §14 |
| SU-12 | Stubs are sent with **hold-to-tear** (`/stubs-send`); screen-reader double-tap performs it directly. | MUST | [D-012][d012], [13 §9][ds] |
| SU-13 | A payee's UPI ID is only revealed, through `/upi-link`, to a claimed member who currently owes them; never on the invite page before a claim. | MUST | §14, §18 |

## 6. Business rules

### 6.1 Derived payments ([07 §8][engine])
- **Simplified (default):** greedy — largest debtor pays largest creditor `min(|debt|, credit)`; ties by member ID; at most `n − 1` payments.
- **Direct:** payments only between people with an actual pairwise debt, netted per pair. Kitty-paid expenses: participants owe the kitty holder; contributions: the holder owes the contributor.
- **"Before → after":** before = number of direct-mode payments; after = number in the current mode. Shown only when before > after.
- A derived payment is a **suggestion**. It only becomes real as a `settlements` row.
- Simplification never changes anyone's balance (property-tested).
- Mode help (reference copy):
  - Simplified: "Debts are rerouted so 6 pairwise payments become 3. Nobody's total changes."
  - Direct: "Only people who actually owe each other pay each other. More payments, no rerouting."
- The "why" line lists the payer's largest shares of expenses others paid (up to 2), e.g. "Room ₹1,000 + Cab ₹200"; fallback "Net of shared expenses".

### 6.2 Hold to tear ([D-012][d012], [04 §5.1a][api])
- Any claimed member (usually the organiser). 900 ms hold fills the button lime; releasing early cancels.
- The hold calls `POST /stubs-send { trip_id, mode }`. The server recomputes the derived payments, queues one `stub_received` push (Payments channel) per payer who's on Toli, with **Pay via UPI** / **Mark as paid** actions, and moves the trip to `settling` if it was `active`.
- The response lists each payment with `pushed: true/false` and a `whatsapp_text`. Ghosts and people without the app get nothing automatically; the toast names them ("Share with Jay on WhatsApp.").
- "STUBS DELIVERED" in the overlay means handed to Toli's server for delivery. The overlay never blocks.
- Limit: 1 per trip per 10 minutes.

### 6.3 UPI link ([04 §5.1][api])
- Built **on the server** so the VPA only goes to a member who is the payer in a current derived payment to that payee.
- Format: `upi://pay?pa=<vpa>&pn=<name>&am=<amount with 2 decimals>&cu=INR&tn=Toli · <trip name>`.
- **INR only.** For a non-INR base currency `/upi-link` returns `{ url: null, reason: "not_inr" }`, and the app shows only **Mark as paid**.
- If the payee hasn't set a UPI ID: `{ url: null, reason: "no_upi_id" }` → "Aditya hasn't added a UPI ID yet. Pay another way, then mark it as paid." + **Ask Aditya to add it** (proposed).
- The app opens the link with the OS; Android shows the UPI app chooser.

### 6.4 "Did the payment go through?"
- Shown when the app returns to the foreground after opening a UPI link (and on the web page after the UPI app returns).
- **Yes, I paid** → `settlement.create` with `method = upi`, amount = the link amount, `recorded_by_user` = the payer. On the web page it goes through `/web-settlement` after the anonymous claim ([04 §5.1b][api], OQ-P8).
- **Not yet** → nothing recorded; the payment stays open.
- Copy must say Toli can't see UPI payments. Never "verified", "confirmed by bank", or a green tick implying proof. The trace subtitle is "UPI · confirmed by payer".

### 6.5 Settlements ([03 §5.6][db], [D-006][d006])
- `from_member_id ≠ to_member_id`; `amount_minor > 0`, in the trip currency; method `upi | cash | bank | other`; optional note.
- **Immutable.** Undo = **void** (`settlement.void` with a reason). Voiding twice is a no-op.
- **Partial:** any amount; derived payments recompute.
- **Overpayment:** allowed; warn first: "That's ₹200 more than Neha owes Aditya. Aditya will then owe Neha ₹200." ([07 §8.3][engine]).
- Any claimed member can mark a payment as paid, as payer or payee; payments to or from ghosts are recorded by someone on Toli. The payee is notified.
- **Void:** whoever recorded the settlement, or an organiser (OQ-P12 in [01](../01-overview.md#open-questions)). Voiding on a settled trip puts it back to `settling` (OQ-P13).

### 6.6 Reminders ([04 §5.2][api])
- **Remind** on a payment → `POST /reminder-send`. Limit: **1 per recipient per trip per 48 hours**, counted in `reminders`.
- The recipient gets a `reminder` push with **Pay ₹1,000 via UPI** and **Mark as paid**; the response always includes WhatsApp share text, so ghosts can be nudged by hand.
- After sending, the button reads "Reminded · 48h"; tapping again shows "One reminder per 48 hours. Keeps it friendly."
- Copy is neutral and never accusatory ("A friendly nudge from Aditya: ₹1,000 for Goa Weekend"). The recipient can mute Reminders.

### 6.7 WhatsApp summary
Generated on the phone (no endpoint), shared with the native share sheet as text plus an image card. Example text:
```
Goa Weekend · settle up (3 payments)
Neha pays Aditya ₹1,200
Jay pays Aditya ₹1,200
Rahul pays Aditya ₹1,000
See your part and pay by UPI: https://toli.in/t/…
```

### 6.8 Settled
- **Auto-settle, on the server** (OQ-P13): when the derived payments reach zero after the trip's end date or after a `/stubs-send`, the server writes `trip.transition → settled` ([06 §4][sync], [trips](trips.md)). From R3 it also writes the recap snapshot.
- Money and member ops are then rejected with `trip_settled` until the organiser reopens it (logged). Feed posts and `recap.update` are still allowed ([06 §5][sync]).

### 6.9 Kitty
With a kitty, the holder's balance absorbs the leftover cash ([D-010][d010]), so the holder appears as a payer ("Rahul pays Neha ₹600") and the leftovers flow back through normal settle-up, proportional to contributions ([kitty](kitty.md)).

## 7. Data model

| Table ([03][db]) | Columns |
|---|---|
| `settlements` | `id`, `trip_id`, `from_member_id`, `to_member_id`, `amount_minor`, `method`, `note`, `recorded_by_user`, `recorded_at`, `voided_at`, `voided_by_user`, `void_reason`, `op_id`, `last_seq` |
| `reminders` | `trip_id`, `from_member_id`, `to_member_id`, `sent_at` (48 h limit) |
| `trips` | `settle_mode`, `status` |
| `profiles` | `upi_vpa`, `upi_visible_to` (`debtors_only` / `nobody`; read only by `/upi-link`) |
| `recaps` | snapshot on settlement (R3) |
| `notification_outbox` | stubs, reminders, "paid you" pushes |

## 8. API requirements

| Op / endpoint | Source | Notes |
|---|---|---|
| `settlement.create` | [06 §4][sync] | from, to, amount, method, note |
| `settlement.void` | [06 §4][sync] | id, reason; second void is a no-op |
| `trip.update` | [06 §4][sync] | `settle_mode` (organiser only) |
| `trip.transition` | [06 §4][sync] | `settling` (set by `/stubs-send`), `settled` (server only, OQ-P13), `reopen` (organiser) |
| `POST /stubs-send` | [04 §5.1a][api] | `{ trip_id, mode }` → `{ payments[] with pushed, whatsapp_text }`; 1 per trip per 10 min |
| `POST /upi-link` | [04 §5.1][api] | `{ trip_id, to_member_id, amount_minor }` → `{ url, payee_name }`, or `{ url: null, reason: "no_upi_id" \| "not_inr" }` |
| `POST /web-settlement` | [04 §5.1b][api] | web "Yes, I paid" after an anonymous claim |
| `POST /reminder-send` | [04 §5.2][api] | 429 with `next_allowed_at` when limited |
| Push kinds ([04 §11][api]) | | `stub_received`, `payment_recorded`, `reminder`; actions `pay_upi` (only when the recipient owes the actor, else `see_split`), `mark_paid`, `view_trip`. No push records a payment by itself |

## 9. UI requirements

[settle-up](../screens/settle-up.md) (reference copy):
- Header "Settle up" + **WhatsApp** button.
- Count card: struck-through "before" (56/800 muted) → "after" (72/800 lime) "payments"; segmented **Simplified | Direct**; help line.
- Payment tickets (lime, perforation, notches): avatar 40, "Neha pays Aditya" (or "pays you"), why line, amount 22/800; actions **Remind** / "Reminded · 48h", **Mark as paid**, **Their view** (opens the payer's web-style view).
- Kitty note when leftovers exist.
- `HoldButton` "Hold to tear & send stubs ✂" / "Keep holding…".
- Honesty line under the button.
- Done state: lime card, trip name label, "Everyone's square.", "N payments recorded. The trip is now read-only.", **SETTLED** stamp (pop animation); **Open the trip recap →** from R3.

"Did the payment go through?" sheet: title, honesty line, **Yes, I paid** (lime) / **Not yet**.

Mark-as-paid sheet: amount field (keypad), method chips, note, **Record**; overpayment warning inline.

## 10. States

| State | Display |
|---|---|
| Nothing to settle (no expenses) | "Nothing to settle yet." |
| Open payments | count card + tickets + hold button |
| Stubs sent (`settling`) | tickets show "Stub sent" / "Notified"; hold button becomes **Send again** (proposed; limited to 1 per 10 minutes) |
| Partly paid | recorded payments disappear from the list; count updates |
| Waiting for confirmation | "Did the payment go through?" sheet |
| Settled | done card ("Everyone's square."); recap link from R3 |
| Offline | tickets and Mark as paid work; the hold button shows **"Needs internet"**; **Pay via UPI** and **Remind** say "Needs a connection" |

## 11. Edge cases

- **No UPI app installed:** opening the link fails → "No UPI app found. Pay another way, then mark it as paid."
- **UPI app declines the intent** (some apps restrict prefilled P2P links for security): Toli can't tell. The "Did the payment go through?" sheet still appears; **Not yet** keeps it open.
- **User pays a different amount in the UPI app** (edits the amount): they tap **Yes, I paid**, which records the link amount. Offer **I paid a different amount** → mark-as-paid sheet (proposed).
- **Both payer and payee record the same payment** (payer via UPI, payee via Mark as paid): two settlements → overpayment. Proposed: warn on the second one if a settlement of the same pair and amount exists within 24 hours ("Neha already recorded ₹1,200 to you. Record another?").
- **Balances change after stubs were sent** (a late expense): derived payments recompute; old stubs may show stale amounts. The stub deep link always opens the **current** amount.
- **Direct ↔ simplified switched after some payments recorded:** settlements are real and stay; only the remaining suggestions change.
- **Overpaid by mistake:** void the settlement, or record a settlement back.
- **Last settlement arrives offline on two phones at once:** the server applies both in order; the second may overpay; the trip settles only if all balances are exactly 0.
- **Settled trip, someone finds an unlogged bill:** organiser reopens ([trips](trips.md)).
- **Payee has UPI visible to "nobody"** (`upi_visible_to = nobody`): no link; manual only.
- **Non-INR base currency:** UPI isn't available; Mark as paid only.
- **Reminder to a ghost:** no push; WhatsApp text only; still counted for the 48 h rule.

## 12. Permissions

| Action | Organiser | Member | Ghost | Web viewer |
|---|---|---|---|---|
| See derived payments | ✓ | ✓ | — | Own line (picked member) |
| Toggle simplified/direct for the trip | ✓ | Preview only (proposed) | — | — |
| Hold to tear & send stubs | ✓ | ✓ ([04 §5.1a][api]) | — | — |
| Pay via UPI (INR trips) | as payer | as payer | — | after claiming the payer's spot ([04 §3.3][api]) |
| Mark as paid | as payer or payee | as payer or payee | — (others record for them) | "Yes, I paid" via `/web-settlement`, after claiming |
| Void a settlement | ✓ | if they recorded it | — | — |
| Remind | ✓ | ✓ | — | — |
| Share WhatsApp summary | ✓ | ✓ | — | — |

## 13. Offline behaviour

- Derived payments, the count, toggles, traces and **Mark as paid** work offline (settlement ops queue).
- **Pay via UPI** needs the server for the link (the VPA is never cached on non-debtors' phones). Offline: "You need a connection to open UPI. You can still mark it as paid."
- **Remind** and **hold-to-tear** need the network; offline the hold button shows "Needs internet" ([04 §5.1a][api]).
- The WhatsApp summary can be shared offline (it's local text + image); WhatsApp sends it later.

## 14. Sync behaviour

- `settlement.create` and `settlement.void` are append-only money ops; no field conflicts.
- The server checks per-op zero-sum and trip status; `trip_settled` rejects late settlement ops on a settled trip.
- The auto-settle transition happens server-side (a server-only op), so every phone sees "Everyone's square." after the same `seq`. A later void writes the move back to `settling`.
- Payee phones get a Realtime nudge and a `payment_recorded` push.

## 15. Analytics

| Event (PRD §19) | Properties |
|---|---|
| `settlement_viewed` | `mode` (simplified \| direct), `payment_count`, `payments_saved` |
| `upi_link_tapped` | (proposed: `surface`: app, push, web) |
| `settlement_recorded` | `method` (upi \| manual), `partial?` |
| `reminder_sent` | (proposed: `channel`: push, whatsapp) |
| `trip_settled` | `days_to_settle` |
| `recap_shared` | `channel` ([feed-and-recap](feed-and-recap.md)) |

"UPI link conversion" = settlements recorded after a `upi_link_tapped` ÷ all settlements.

## 16. Error handling

| Code / case | Message |
|---|---|
| `no_upi_id` | "Aditya hasn't added a UPI ID yet. Pay another way, then mark it as paid." |
| `not_inr` | UPI button hidden; only **Mark as paid** |
| `rate_limited` (`/stubs-send`, 429) | "Stubs were just sent. Try again in a few minutes." |
| `rate_limited` (reminder, 429) | "One reminder per 48 hours. Keeps it friendly." (+ next time) |
| `trip_settled` | "This trip is settled. Reopen to edit." |
| `not_a_member` on `/upi-link` (not a current payer) | "This payment has changed. Pull to refresh." |
| No UPI app | "No UPI app found. Pay another way, then mark it as paid." |
| Overpayment | warning sheet, then allowed |

## 17. Testing

- **Engine:** G1 (one creditor → simplified = direct = 3 payments); property tests: simplification never changes any balance, ≤ n − 1 payments, nobody both pays and receives; direct mode nets pairs correctly with multi-payer and kitty ([07 §13][engine]).
- **Partial / overpayment:** random partial settlements converge to settled; overpayment flips sign and warns.
- **UPI link:** URL encoding of names and notes (spaces, `·`, Hindi); amount formatting `1200.00`; VPA never returned to a non-debtor (server test).
- **Real devices:** GPay, PhonePe, Paytm, BHIM and a bank app on Android; return-to-app detection; the confirm sheet appears exactly once.
- **Reminders:** 48 h limit per recipient per trip; WhatsApp text always returned.
- **Auto-settle:** exactly once; not for zero-expense trips; reopen → settle again works.
- **Hold button:** release before 900 ms cancels; screen-reader double-tap performs directly; Reduce Motion replaces the overlay with the toast.

## 18. Future considerations

- Verified in-app settlement through a licensed PA/PSP partner (post-v1, PRD §14).
- UPI QR display for in-person payment ("show my QR").
- Other rails (PayNow, Venmo…) behind the pluggable payment-rail interface for international trips (PRD §1).
- Settle-up across trips for the same group.

## 19. Open questions

Resolved: stub delivery is `/stubs-send` ([04 §5.1a][api]); settle mode and void rights follow OQ-P12; UPI is for INR-base trips only (`not_inr`); web "Yes, I paid" is `/web-settlement` (OQ-P8); reminders are limited per recipient per trip ([04 §5.2][api]); auto-settle follows OQ-P13. See [01](../01-overview.md#open-questions).

1. **Double recording** (payer and payee both record): warn, or auto-detect and ask?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[engine]: ../07-calculation-engine.md
[ds]: ../13-design-system.md
[d006]: ../decisions/D-006-append-only-money.md
[d009]: ../decisions/D-009-notifications.md
[d010]: ../decisions/D-010-kitty-folding.md
[d012]: ../decisions/D-012-hold-to-tear.md
