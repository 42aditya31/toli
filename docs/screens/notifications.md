# Screen · Notifications (push + in-app banner)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a:** the in-app `StubBanner` in the exact design + **plain** system pushes (`added_to_trip`, `member_claimed`, `stub_received`, `payment_recorded`, `expense_changed`, `kitty_low`, `trip_started`, `trip_ended`, `reopen_requested`) · **R1b:** custom Android styles and action buttons, `reminder` pushes, `digest`, `payment_to_confirm`, the kitty top-up line · **R2:** `budget_75`, `budget_100` · **Later:** the iOS Content Extension ([D-018](../decisions/D-018-r1a-r1b-scope.md)) |
| **Source** | `ui-refrence/Tear to Split.dc.html` → friend phones block (lines 106–138: the lime stub notification, `tsDrop` keyframes line 17) and logic (lines 219–230). `ui-refrence/toli-film.jsx` lines 579–583 (payer/payee variants "Coming back to you" / "Your share, ready to pay"). Android/iOS closed designs: **Assumption: not in the UI reference**, derived from [D-009](../decisions/D-009-notifications.md) and [tech stack §5.8](../superpowers/specs/2026-09-24-toli-tech-stack.md). |
| **Related** | [D-009 Notifications](../decisions/D-009-notifications.md) · [D-018 R1a/R1b](../decisions/D-018-r1a-r1b-scope.md) · [D-012 Hold to tear](../decisions/D-012-hold-to-tear.md) · [D-023 settle timing](../decisions/D-023-auto-settle-timing.md) · [D-024 web page](../decisions/D-024-web-page-read-only-beta.md) · [features/notifications](../features/notifications.md) · [features/settle-up](../features/settle-up.md) · [features/kitty](../features/kitty.md) · [features/budget](../features/budget.md) · [03 §3.1 profiles, §3.2 devices, §3.3 notification_preferences, §9 notification_outbox, reminders](../03-database-schema.md) · [04 §5 upi-link, reminder-send, §10.1 jobs, §11 push payloads](../04-api-schema.md) · [13 §6 StubBanner](../13-design-system.md) · [settings-profile](settings-profile.md) · [settle-up](settle-up.md) · [recorded-payments](recorded-payments.md) · [kitty](kitty.md) · [balance-trace](balance-trace.md) · [budget](budget.md) |

---

## Purpose
**Why:** nobody should have to chase a friend for ₹1,200. Toli does the asking, in a neutral voice, and puts **Pay via UPI** one tap away.
**What:** every push Toli sends and how it looks in three places:
- **in the app:** our exact ticket-stub design (`StubBanner`), from R1a;
- **Android with the app closed:** a **plain** system notification in R1a; the custom styles and action buttons in R1b;
- **iOS with the app closed:** a system banner (iOS beta is later); the full stub later still.

**How:** the server queues a push in `notification_outbox` and sends it **from `sync-push` right after the commit**. A pg_cron job checks the outbox in SQL and calls `notify-sender` only when rows are due (retries, digests) ([D-026](../decisions/D-026-write-path-and-compat.md), [04 §10.1](../04-api-schema.md)). Delivery is FCM (APNs on iOS). The phone validates the payload ([04 §11](../04-api-schema.md)) and shows it, or shows our own `StubBanner` when the app is open ([D-009](../decisions/D-009-notifications.md)).

## User goal
"Tell me only what matters to me: what I owe, what I'm getting back, and what changed my share. Let me pay in one tap."

## Entry points
A notification is not navigated to; it arrives. Triggers are server-side, after an op is applied ([06 §6](../06-syncing.md) step 9), or from the daily `lifecycle` job:

| Event | Kind | Release |
|---|---|---|
| Someone adds you to a trip (PRD F16) | `added_to_trip` | R1a |
| Someone claims a spot in a trip you organise ("Neha claimed her spot"). No approval is needed; you can **Release** a wrong claim (OQ-P14) | `member_claimed` (to organisers) | R1a |
| An expense you're in (and didn't pay) is saved | `stub_received` (payer view) | R1a |
| Someone else logs an expense **you paid** | `stub_received` (payee view: "Coming back to you") | R1a |
| Someone holds **Hold to tear & send stubs** on Settle up (`POST /stubs-send`, [04 §5.1a](../04-api-schema.md)) | `stub_received` (settlement stub) | R1a |
| A settlement to you is recorded | `payment_recorded` | R1a |
| A web viewer says "Yes, I paid" to you on the invite page; it stays **pending** until you confirm ([D-024](../decisions/D-024-web-page-read-only-beta.md)) | `payment_to_confirm` | R1b |
| An expense involving you is edited or deleted and your balance moves by more than `profiles.notify_threshold_major` **major units** of the trip currency (default 1, so ₹1 / $1 / ¥1, PRD F5). The server converts it to minor units | `expense_changed` | R1a |
| Someone's money edit replaced your newer money edit on the same expense ([D-019](../decisions/D-019-money-edit-group.md)) | `expense_changed` ("Rahul changed the amount and split after you") | R1a |
| Someone taps **Remind** (max 1 per 48 h per person per trip). In R1a, Remind is a **WhatsApp share only** | `reminder` | R1b |
| Kitty remaining ≤ 20% of contributions | `kitty_low` | R1a (top-up amount in R1b) |
| Trip spend reaches 75% / 100% of the budget (once each, re-armed if the budget is raised) | `budget_75` / `budget_100` | R2 |
| More than 5 events for you in 30 minutes on one trip | `digest` | R1b |
| Trip start date arrives / end date passes (daily `lifecycle` job) | `trip_started` / `trip_ended` | R1a |
| A non-organiser taps **Request reopen** on a settled trip ([D-023](../decisions/D-023-auto-settle-timing.md)) | `reopen_requested` (to organisers) | R1a |

Unknown `kind` values (from a newer server) show as a plain notification that opens Trip home ([04 §11](../04-api-schema.md)).

## Exit points
Every notification opens its `deep_link`. Tapping the body always goes to the deep link; action buttons (R1b on Android) go where the action table says.

| Deep link | Screen |
|---|---|
| `toli://trip/<id>` | Trip home |
| `toli://trip/<id>/expense/<expense_id>` | [Expense detail](expense-detail.md) |
| `toli://trip/<id>/settle` | [Settle up](settle-up.md) |
| `toli://trip/<id>/pay/<to_member_id>` | Pay flow (upi-link → UPI app → "Did the payment go through?") |
| `toli://trip/<id>/balance/<member_id>` | Balance trace |
| `toli://trip/<id>/payments` | [Recorded payments](recorded-payments.md) (Confirm for `payment_to_confirm`) |
| `toli://trip/<id>/members` | [Members](members.md) (Release for `member_claimed`) |
| `toli://trip/<id>/settings` | [Trip settings](trip-settings.md) (Reopen for `reopen_requested`) |
| `toli://trip/<id>/kitty` | [Kitty](kitty.md) |
| `toli://trip/<id>/budget` | [Budget](budget.md) (R2) |
| `toli://trip/<id>/feed` | [Feed](feed.md) (R3) |

(Assumption: path names after `toli://trip/<id>/` are proposed here; [04 §11](../04-api-schema.md) only fixes the prefix.)

**`digest` opens Trip home in R1 and R2**, and the Feed only from R3, because the Feed doesn't exist before R3 ([04 §11](../04-api-schema.md), review U-7).

---

## UI structure

### Level 1 · In-app banner: the exact stub design (R1a)
Shown when the app is in the foreground. It's the design-system component **`StubBanner`** ([13 §6](../13-design-system.md)). The system notification is suppressed.

| Part | Spec (Tear to Split, mapped to tokens) |
|---|---|
| Position | Top of the screen, under the status bar, inset `space.12` from the sides (reference: 10 px in a 214 px mock). Above everything except the tear overlay. |
| Torn top edge | The `Stub` zigzag: 9 × 6 px teeth, inset 8 px each side, in the card colour |
| Card | `radius.stub` (4 4 16 16), padding `space.12`, gap `space.stackTight`, background `color.accent`, text `color.onAccent` |
| Header row | `type.labelS` at 70% opacity: left **"TOLI · GOA WEEKEND"** (`TOLI · <TRIP NAME>` uppercase), right **"NOW"** (then "2M", "1H"; Assumption) |
| Message | `type.caption`: **"Aditya tore you a stub for <b>Dinner at Thalassa</b>"**; the expense name is bold |
| Amount | `type.amountS`: **"₹1,200"** (the prototype used 28 px; the token wins, [13 §6](../13-design-system.md)) |
| Action button | `Button` variant `onAccent`, `size.buttonM`, `radius.chip`: **"Pay via UPI"** (pressed: `color.onAccentPressed`). Icon `CurrencyInr` (`icon.m`) |
| Paid state | Card background turns `color.bg.raised` with `color.text` (`dur.fast`). The button is replaced by an outlined box (1.5 px `color.textMuted`, `radius.chip`): see "Honest paid copy" below |
| Entrance | Drops in with **`ease.pop`**, `dur.ticket`: from `translateY(-40px) scale(.86)`, opacity 0 → overshoot → rest (the prototype's `(.2,.9,.3,1.2)` maps to `ease.pop`, [13 §7.1](../13-design-system.md)) |
| Dismiss | Swipe up, or auto-dismiss after 6 s (Assumption). Never auto-dismisses while a screen reader is focused on it. |

**Honest paid copy** ([13 §8](../13-design-system.md): never say "notified" before the server confirms):
- Saved on the phone, not synced yet: **"✓ Marked as paid · sending when you're online"**.
- Applied by the server, and the payee is on Toli: **"✓ Paid · Aditya will see it"**.
- Applied, and the payee is a ghost: **"✓ Paid · recorded"**.

**Variants of the in-app stub** (same shell; message, amount and button change):
| Variant | Message | Amount | Button |
|---|---|---|---|
| Added to trip | "**Aditya** added you to **Goa Weekend**" | — | **View trip** (`bg.raised` shell, like alerts) |
| Spot claimed (organisers) | "**Neha** claimed her spot on **Goa Weekend**" | — | **View** (opens Members, where **Release** is) |
| Expense stub, you owe | "**Aditya** tore you a stub for **Dinner at Thalassa**" | your share | **Pay via UPI** (only if valid, see "Pay rule") else **See split** |
| Settlement stub (from Settle up) | "Your share, ready to pay" (film copy) + "Aditya · Goa Weekend" | the derived payment | **Pay via UPI** (INR trips; otherwise **Mark as paid**) |
| Payee view (you paid) | "Coming back to you" (film copy) + "Rahul logged **Dinner at Thalassa**" | Σ others' shares | **View trip** (`ghost` button on lime) |
| Payment recorded | "**Neha** marked a payment to you" | amount | **View trip** |
| Payment to confirm (R1b) | "**Neha** says she paid you from the web page" | amount | **Check and confirm** (opens Recorded payments) |
| Reminder (R1b) | "**Aditya** sent a friendly nudge" | amount you owe them | **Pay via UPI** |
| Reopen requested (organisers) | "**Neha** asked to reopen **Goa Weekend**" | — | **Review** (opens Trip settings with **Reopen**) |
| Alerts (kitty, budget, trip start/end, digest, expense changed) | The same stub shell in `color.bg.raised` (not lime), since they're information, not money asks. A warning (kitty low, over budget) shows the `WarningCircle` icon in **`color.warning`** plus a word; never lime ([13 §2](../13-design-system.md)) | as listed | as listed |

> Film vs Tear to Split: the film's stub uses 9 px header, 12 px message, 26 px amount and radius 4 4 16 16. **The design-system tokens above are the spec**; the film is marketing ([D-012](../decisions/D-012-hold-to-tear.md) precedent).

> The phone labels **"LOCKED" / "1 NEW" / "PAID"** in Tear to Split are demo captions above each mock phone, **not app UI**.

### Level 2 · Android, app closed

**R1a: plain system notifications** ([D-018](../decisions/D-018-r1a-r1b-scope.md), [04 §11](../04-api-schema.md)):
| Element | Value |
|---|---|
| Small icon | The white, single-colour ticket mark, 24 dp ([13 §5](../13-design-system.md)) |
| Accent colour | `color.accent` (not colorized) |
| Sub-text | Trip name |
| Title | **Amount first** (PRD F16), per kind below |
| Body | Per kind below, one line or `BigTextStyle` |
| Actions | **None in R1a.** Tapping opens the right screen |
| Grouping | `groupId = trip_id`, with a per-trip summary when 2+ are showing (Assumption) |
| Channel | per kind (below): **Payments** (high), **Expenses** (default), **Reminders** (high), **Trip updates** (default). IDs: `payments`, `expenses`, `reminders`, `trip_updates` = `notif_category` |

**R1b: custom Android styles** (notify-kit, drawn from data-only messages):
| Element | Value |
|---|---|
| Large icon | The actor's avatar from `actor_avatar_url` (signed, 24 h), or initials drawn on `color.bg.raised` as a bitmap |
| Style | `BigPictureStyle` for expense stubs with a receipt photo (`image_url`); a progress bar for kitty, budget and reminder (`progress_bp`); `InboxStyle` for digest |
| Actions | Up to 3, per kind |

The zigzag and the full lime background **aren't possible** on Android at any level ([D-009](../decisions/D-009-notifications.md)).

**Fallback (`devices.push_mode = notification`):** on Xiaomi, Oppo, Vivo, Realme and OnePlus phones, or after 2 missed delivery receipts, the server sends **system-drawn notification payloads** instead of data-only messages. They show the title, body, Toli icon and accent colour, with **no custom actions**; tapping still opens the deep link. Delivery beats design ([D-009](../decisions/D-009-notifications.md)).
- In **R1a** every push already looks like this, so the fallback changes only how the message is delivered, not how it looks.
- From **R1b**, the fallback phones keep this plain look while other phones get the custom styles.

### Level 3 · iOS, app closed (iOS beta is later, [01 §9](../01-overview.md))
| First iOS release | Later |
|---|---|
| System banner: title, subtitle = trip name, body. The **Notification Service Extension** attaches the actor's avatar (or the receipt photo). Action buttons appear on long-press, from a registered **category** (below). No progress bar: the % goes in the body text. | A **Notification Content Extension** (native Swift) draws the full lime stub (zigzag, mono header, amount, Pay via UPI) when the notification is long-pressed or expanded. |

iOS categories (Assumption): `TOLI_PAY` (pay_upi, mark_paid, view_trip), `TOLI_EXPENSE` (see_split, not_me), `TOLI_INFO` (view_trip, plus top_up for kitty and view_budget for budget). Every action that needs the app uses the "foreground" option.

### "Hide amounts on lock screen"
When `profiles.hide_lockscreen_amounts` is on ([settings-profile](settings-profile.md)), **the server** removes amounts and names from the push title and body before sending. It isn't hidden by the phone, so it works at every level and with the `push_mode` fallback.
- Example: **"Goa Weekend · new expense"** / **"Open Toli to see your share."**
- `amount_minor`, `actor_name` and `actor_avatar_url` are left out of the payload.
- Assumption: Android visibility is also set to private, and iOS uses hidden previews.
- The **in-app** `StubBanner` still shows amounts, because the phone is unlocked and the app is open.

---

## Per-kind catalogue
Copy uses the Goa Weekend fixture. `<>` = variable. Amounts use `formatMoney` (Indian grouping, true minus). Voice: neutral, "owes" / "gets back", never "debt" ([13 §8](../13-design-system.md)). The **Actions** column applies from R1b; in R1a only the tap target is used.

| Kind | Category / channel | Title (closed) | Body (closed) | Actions (R1b) | Tap / deep link |
|---|---|---|---|---|---|
| `added_to_trip` | `trip_updates` | **"You're on Goa Weekend"** | "Aditya added you. See what's been spent so far." (Assumption copy) | `view_trip` | `/` (Trip home) |
| `member_claimed` | `trip_updates` | **"Neha claimed her spot"** | "On Goa Weekend. Not Neha? You can release the spot." | `view_trip` | `/members` |
| `stub_received` · expense, you owe | `expenses` | **"Your share: ₹1,200"** | "Aditya tore you a stub for Dinner at Thalassa" | `pay_upi`* · `see_split` · `not_me` | `/expense/<id>` |
| `stub_received` · you paid (payee) | `expenses` | **"₹3,600 coming back to you"** | "Rahul logged Dinner at Thalassa, which you paid for" | `see_split` · `view_trip` | `/expense/<id>` |
| `stub_received` · settlement stub | `payments` | **"Pay Aditya ₹1,200"** | "Your share, ready to pay. Opens your own UPI app." | `pay_upi` · `mark_paid` · `view_trip` | `/pay/<to_member_id>` |
| `payment_recorded` | `payments` | **"Neha marked ₹1,200 paid to you"** | "Marked as paid via UPI. Toli can't see payments, so check your UPI app." (for cash: "…marked as paid in cash.") | `view_trip` | `/balance/<you>` |
| `payment_to_confirm` (R1b) | `payments` | **"Neha says she paid you ₹1,200"** | "From the Goa Weekend web page. It counts once you confirm." | `view_trip` | `/payments` |
| `expense_changed` · edited | `expenses` | **"Your share is now ₹650"** | "Rahul changed Dinner at Thalassa (was ₹600)" | `see_split` · `view_trip` | `/expense/<id>` |
| `expense_changed` · deleted | `expenses` | **"Dinner at Thalassa was deleted"** | "Rahul deleted it. Your balance moved by ₹600." | `view_trip` | `/balance/<you>` |
| `reminder` (R1b) | `reminders` | **"Pay Aditya ₹1,000"** | "A friendly nudge from Aditya for Goa Weekend." Progress: "2 of 3 payments done" | `pay_upi` · `mark_paid` | `/pay/<to_member_id>` |
| `kitty_low` | `trip_updates` | **"Kitty: ₹2,400 left"** | "Running low: 16% left." R1b adds "Top-up needed: ₹500 each." | `top_up` · `view_trip` | `/kitty` |
| `budget_75` (R2) | `trip_updates` | **"75% of the budget used"** | "₹22,500 of ₹30,000 · day 2 of 4. At this rate you'll finish 7% over." | `view_budget` · `view_trip` | `/budget` |
| `budget_100` (R2) | `trip_updates` | **"Budget reached: ₹30,000"** | "Goa Weekend has spent ₹30,400 · day 3 of 4." | `view_budget` · `view_trip` | `/budget` |
| `digest` (R1b) | `expenses` | **"Goa Weekend · 7 updates"** | Inbox lines (max 5): "Rahul paid ₹800 · Cab to Baga", "Kitty paid ₹2,400 · Breakfast at Artjuna", … Summary: "You get back ₹3,400" | `view_trip` | `/` (Trip home) in R1/R2; `/feed` from R3 |
| `trip_started` | `trip_updates` | **"Goa Weekend starts today"** | "Day 1 of 4. Tap + the moment someone pays." | `view_trip` | `/` (Trip home) |
| `trip_ended` | `trip_updates` | **"Goa Weekend is over"** | "3 payments to square up. You get back ₹3,400." (or "You owe ₹1,200.") | `view_trip` | `/settle` |
| `reopen_requested` | `trip_updates` | **"Neha asked to reopen Goa Weekend"** | "Reopen it so people can edit again." (+ the note, if any) | `view_trip` (Assumption: no `reopen` action exists in [04 §11](../04-api-schema.md)) | `/settings` |

With **Hide amounts on lock screen** on, every title and body above is replaced by the trip name and a neutral line (see above).

\* **Pay rule ([04 §11](../04-api-schema.md)):** `pay_upi` is only included when the recipient currently owes the actor (a derived payment exists); otherwise the action is **See split**. On a trip whose base currency isn't INR, `/upi-link` returns `reason: "not_inr"`, so there is no UPI button and only **Mark as paid** is offered ([04 §5.1](../04-api-schema.md)). Assumption: the amount shown on an expense stub's button is `min(share, derived payment)`.

### What each action does
In R1a these run from the **in-app** `StubBanner` and from the screen a plain push opens. From R1b they are also Android action buttons.

| Action | Label | Behaviour |
|---|---|---|
| `pay_upi` | **"Pay via UPI"** (Android/iOS: **"Pay ₹1,200 via UPI"**) | Opens the app → `POST /upi-link` → launches the UPI intent → on return, the sheet **"Did the payment go through?"** with **"Yes, I paid"** / **"Not yet"**. "Yes" records the settlement with the **exact** amount pre-filled ([D-021](../decisions/D-021-rounding-adjustment.md)); the stub switches to the honest paid copy above. Over ₹1,00,000 the link is split into several parts ([04 §5.1](../04-api-schema.md)). |
| `mark_paid` | **"Mark as paid"** | Opens the settle row pre-filled with the exact amount (method cash/bank/other, optional note). The user confirms, then `settlement.create` is written. |
| `see_split` | **"See split"** | [Expense detail](expense-detail.md) with the split. |
| `not_me` | **"Not me"** | Opens the expense with the hint **"Not part of this? Remove yourself"**. Confirming writes `expense.edit` removing you from the participants. |
| `top_up` | **"Top up"** | Opens [Kitty](kitty.md) with the suggested top-up (R1b). |
| `view_budget` | **"View budget"** | Opens [Budget](budget.md) (R2). |
| `view_trip` | **"View trip"** | Opens the deep link. |

**No push ever performs a money action by itself.** Every action opens the app and asks for confirmation ([04 §11](../04-api-schema.md)). Who may do each action is in the [permission matrix](../09-security.md#permission-matrix).

## States
| State | Behaviour |
|---|---|
| Loading | Tapped a notification for data not yet on the phone: open the target with the skeleton, pull, then render. If still missing after sync, toast "This was changed or removed." (Assumption). |
| Empty | n/a. There is no in-app notification inbox in v1; the [Trip feed](feed.md) (R3) is the history ([04 §8a](../04-api-schema.md)). |
| Populated | As designed per level. |
| Error | Invalid payload (Zod fails): show a generic "Goa Weekend was updated" (trip_updates) and report to Sentry. Unknown `kind` or newer `v`: a plain notification that opens Trip home ([D-026](../decisions/D-026-write-path-and-compat.md) lenient parsing). `upi-link` returns `no_upi_id`: the pay sheet says "Aditya hasn't added a UPI ID. Pay another way, then mark it as paid." `not_inr`: only **Mark as paid** is shown. |
| Offline | Pushes don't arrive; nothing to show. Actions tapped while offline: `pay_upi` can't build the link → "You're offline. Pay from your UPI app, then mark it as paid." `mark_paid` works (queued in the outbox). |
| Syncing | Receiving a push also triggers a pull for that trip (through PostgREST, [06 §3.3](../06-syncing.md)). |
| Success | Paid state on the in-app stub, with the honest paid copy above. |
| Disabled | Category muted in Settings (or the Android channel off): the server doesn't queue it (Assumption: the server checks `notification_preferences`; Android channel mute is also respected by the OS). Push permission denied: nothing is shown; Settings shows a "Turn on notifications" row. |
| Partial data | No avatar → initials. No description → category ("Food"). No UPI ID → no `pay_upi`. Ghost recipients get nothing (no device); the sender gets WhatsApp share text instead ([04 §5.2](../04-api-schema.md)). |

## Interactions
| Gesture | Result |
|---|---|
| Tap banner body | Opens the deep link; the banner dismisses. |
| Tap the banner button | Runs the action (table above). |
| Swipe up on the banner | Dismisses. |
| Two banners arrive together | Queue: one at a time, newest first; same trip + same kind collapse (Assumption). |
| Already on the target screen | Banner suppressed; the screen just updates (Assumption). |
| Long-press (iOS closed) | Shows actions; later, the Content Extension stub. |

## Data
| Read | From |
|---|---|
| Payload | FCM data (`v, category, trip_id, trip_name, kind, title, body, amount_minor, currency, actor_name, actor_avatar_url, image_url, progress_bp, actions, deep_link`), validated by Zod, **leniently** (unknown fields ignored, [04 §11](../04-api-schema.md)) |
| Avatar, names | SQLite `trip_members` / `member_profiles` (in-app); for closed notifications, `actor_avatar_url` (signed, 24 h; R1b large icon) |
| Pay eligibility (in-app) | Local engine derived payments for the trip (settle view) |
| Preferences | `notification_preferences` (global + per-trip mute) |

## API / Database
| Action | Write / endpoint |
|---|---|
| Register for push | `devices` upsert (`fcm_token`) via PostgREST after permission is granted and on token refresh ([04 §9](../04-api-schema.md)) |
| Server queue | `notification_outbox` row with `category`, `dedupe_key` (e.g. `budget_75:<trip>`, `kitty_low:<trip>:<day>`), `send_after` (digest window). Sent from `sync-push` after commit; the cron only calls `notify-sender` when rows are due |
| Lock-screen privacy | the server reads `profiles.hide_lockscreen_amounts` when it builds the title and body |
| Threshold | the server reads `profiles.notify_threshold_major` and converts it with the trip currency's exponent |
| Digest (R1b) | Assumption: only `expenses` category events are digested; `payments` and `reminders` are always sent individually |
| Reminder (R1b push) | `POST /reminder-send` (sender side); `reminders` row enforces 48 h. R1a: WhatsApp share text only |
| Pay | `POST /upi-link`, then `settlement.create` (`method = upi`) on "Yes, I paid" |
| Mark paid | `settlement.create` (`method = cash/bank/other`) |
| Confirm a web payment (R1b) | `settlement.confirm` from [Recorded payments](recorded-payments.md) |
| Not me | `expense.edit` removing you, only after you confirm |
| Settle-up stubs | `POST /stubs-send` (sender side) queues one `stub_received` per payer on Toli ([04 §5.1a](../04-api-schema.md)) |
| Trip start / end, auto-settle | daily `lifecycle` job ([04 §10.1](../04-api-schema.md)) |
| Reopen request | `trip.request_reopen` op → `reopen_requested` to organisers ([04 §5.1c](../04-api-schema.md)) |
| Dead token | FCM `UNREGISTERED` → `devices.invalidated_at` |
| Delivery mode | `devices.push_mode` `data` / `notification` (fallback above) |

## Edge cases
- **You made the change:** you never get a push about your own action (other devices of yours also skip it; Assumption).
- **Expense stub for a payer who isn't a participant** (Aditya paid a cab he wasn't in): payee view only.
- **Kitty-paid expense:** no payee view (the kitty isn't a person); participants get the expense stub with **See split** (no pay).
- **Balance change at or below `notify_threshold_major`** (default 1 major unit, e.g. ₹1): no `expense_changed`.
- **Budget crossed twice** (R2): each level fires once. It's **re-armed** only when `budget.set` raises the amount so that spend falls back below that level ([03 §5.9](../03-database-schema.md), [budget](budget.md)).
- **Trip settled:** `payment_recorded` for the last payment is followed by nothing else; `trip_ended` is not re-sent. Settling needs Close trip or end date + 24 h ([D-023](../decisions/D-023-auto-settle-timing.md)).
- **Rounding adjustment** (dust rule, `method = rounding`): no `payment_recorded` push; it's written by the server when the trip closes ([D-021](../decisions/D-021-rounding-adjustment.md)).
- **Reinstall / new phone:** new `devices` row; old token invalidated on first failure.
- **Hide amounts on, in a digest:** lines become "3 new expenses · 1 payment" without names or amounts.
- **Hindi locale (R1b):** title/body are built on the server in the recipient's `profiles.locale` (Assumption).
- **Quiet hours:** not in the PRD; Android/iOS Do Not Disturb applies.

## Analytics
| Event | Where |
|---|---|
| `upi_link_tapped` | `pay_upi` action or banner button |
| `settlement_recorded` (`method`: `upi`\|`cash`\|`bank`\|`other`, `partial?`) | after "Yes, I paid" / mark as paid (review API-6: uses the database values) |
| `reminder_sent` | sender side, on Settle up |
| Proposed (Assumption, not in PRD §19): `notification_opened` (`kind`, `action`, `level: in_app/android/ios`), `notification_permission` (`granted`) | |

## Accessibility
- The in-app banner is an alert live region: "Goa Weekend. Aditya tore you a stub for Dinner at Thalassa. One thousand two hundred rupees. Pay via UPI button."
- Action buttons carry the amount and person: "Pay one thousand two hundred rupees to Aditya via UPI".
- The paid state is announced with the same honest words as the text ("Paid. Aditya will see it.").
- Warnings always have an icon and a word, never colour alone ([13 §10](../13-design-system.md)).
- The zigzag edge is decorative.
- Reduce Motion: the banner fades in (200 ms) instead of dropping.
- Contrast: `color.onAccent` on lime ≈ 13:1; paid state `color.text` on `color.bg.raised` passes 4.5:1.

## Open questions / assumptions
- **Resolved:** `added_to_trip`, `member_claimed`, `payment_to_confirm`, `reopen_requested`, `top_up`, `view_budget`, `not_me` and the Pay rule are defined in [04 §11](../04-api-schema.md).
- **Resolved:** no in-app notification inbox in v1; the Trip feed is the history ([04 §8a](../04-api-schema.md)).
- **Resolved (OQ-P10):** the exact design is shown in the app; R1a sends plain system notifications; custom Android styles arrive in R1b ([D-018](../decisions/D-018-r1a-r1b-scope.md)).
- **Resolved:** `digest` opens Trip home until the Feed ships in R3.
- **Open:** do `stub_received` pushes for expenses go out one per expense, or only via the digest in a busy trip? Assumed: individual until the 5-in-30-min threshold (digest is R1b; in R1a every event is sent individually).
- **Assumption:** `reopen_requested` has no action button (04 §11 has no `reopen` action); the tap opens Trip settings, where the organiser taps **Reopen**.
