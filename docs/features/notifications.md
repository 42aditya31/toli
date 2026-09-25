# Feature · Notifications

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 (budget alerts arrive with Budget in R2) |
| **PRD refs** | [F16][prd] (triggers, digest > 5 in 30 min, no marketing, Toli's own design, channels), F5 (notify on balance change > ₹1), F6 (reminders, 48 h), F7 (kitty low), F8 (budget 75%/100%), §17 (no background polling), §21 (reminders as harassment) |
| **Related** | Screens: [notifications](../screens/notifications.md) · [settings-profile](../screens/settings-profile.md) · [tear-overlay](../screens/tear-overlay.md) · [settle-up](../screens/settle-up.md) — Docs: [04 §5.2, §11 push payloads][api] · [03 §3.2 `devices`, §3.3 `notification_preferences`, §9 `notification_outbox`, `reminders`][db] · [06 §6 step 7][sync] · [02 §4][arch] · [13][ds] · [tech stack §5.8][stack] — Decisions: [D-009][d009] · [D-012][d012] — Features: [settle-up](settle-up.md) · [balances-and-trace](balances-and-trace.md) · [kitty](kitty.md) · [budget](budget.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **R1a:** the exact ticket-stub design **inside the app** (`StubBanner`) + **plain** system pushes (title, text, Toli icon and colour; tap opens the right screen). **R1b:** custom Android styles and action buttons, and push reminders ([D-018](../decisions/D-018-r1a-r1b-scope.md), [D-009](../decisions/D-009-notifications.md)).
> - New kinds: `payment_to_confirm` (R1b), `reopen_requested`, `member_claimed`. `digest` opens **Trip home** until R3.
> - **Hide amounts on lock screen** (`profiles.hide_lockscreen_amounts`) is applied on the server.
> - Pushes are sent from `sync-push` after commit. The cron only calls `notify-sender` when rows are due ([04 §10.1](../04-api-schema.md)).

## 1. Purpose

Tells people only what they need to know about **their** money on a trip: a stub for their share, a payment to them, a friendly reminder, a kitty running low. It uses **Toli's own ticket-stub design** as far as each platform allows, and it sends **fewer, better** notifications.

## 2. User problem

- "I didn't know Rahul added the dinner, so I didn't know I owed ₹600."
- "Neha said she paid, but I never saw it."
- And the opposite: "This app pinged me 40 times last night." That's how notifications get turned off, or the app uninstalled.

## 3. Business goal

- **Completion (G2):** stubs and reminders drive settlement; payers are one tap from **Pay via UPI**.
- **Trust:** every push is transactional and about the user. No marketing through these channels (PRD F16).

## 4. User flow

1. Aditya saves "Dinner at Thalassa ₹4,800, equal 4". His tear overlay sends stubs.
2. Neha's phone (app closed) shows a Toli notification: header "TOLI · GOA WEEKEND · NOW", text "Aditya tore you a stub for **Dinner at Thalassa**", amount **₹1,200**, actions **Pay via UPI** (shown because Neha currently owes Aditya) / **Not me**.
3. Neha taps **Pay via UPI** → Toli opens → UPI app → "Did the payment go through?" → **Yes, I paid**.
4. Aditya gets "Neha paid you ₹1,200" with Neha's avatar and **View trip**.
5. If Neha's app is open when the stub arrives, she sees the **exact stub design** as an in-app banner (lime, torn zigzag top, mono header).
6. In Settings → Notifications, Neha can switch off **Expenses** but keep **Payments** and **Reminders**, or mute one trip.

## 5. Requirements

| ID | Requirement | Level | PRD / decision |
|---|---|---|---|
| NT-1 | Push when: an expense involving you is added; an expense affecting your balance is edited or deleted; you're added to a trip; a settlement to you is recorded; a settle-up reminder; budget thresholds; trip start and end. | MUST | F16 |
| NT-2 | Granular control; never a push per expense in a busy trip: **batch into a digest above 5 events in 30 minutes**. | MUST | F16 |
| NT-3 | No growth or marketing pushes on the transactional channels. | MUST | F16 |
| NT-4 | Toli's own design: brand colour and icon, the other person's avatar, the amount in the title, action buttons ("Pay ₹1,000 via UPI", "Mark as paid", "See split"). | MUST | F16, [D-009][d009] |
| NT-5 | Reminders and kitty/budget alerts show a **progress bar**; digests use a **grouped inbox** style. | SHOULD | F16 |
| NT-6 | Separate Android channels: **Payments, Expenses, Reminders, Trip updates**, each mutable. | MUST | F16 |
| NT-7 | Balance-change pushes only when the change is **more than ₹1**. | MUST | F5 |
| NT-8 | Reminders at most **1 per recipient per trip per 48 hours**; recipient can mute. | MUST | F6, §21 |
| NT-9 | Push tokens stored **per device**; invalid tokens cleaned up. | MUST | [03 §3.2][db] |
| NT-10 | Delivery via **FCM** (APNs on iOS); drawn on the phone by **react-native-notify-kit** behind one `notify.ts` wrapper. | MUST | [D-009][d009], [tech stack §5.8][stack] |

## 6. Business rules

### 6.1 What we send

| Trigger | `kind` ([04 §11][api]) | Channel | Who | Title / body (example) | Actions |
|---|---|---|---|---|---|
| Expense added, you have a share | `stub_received` | Expenses | each participant with share > 0, except the actor | "₹1,200 · Dinner at Thalassa" / "Aditya tore you a stub for Dinner at Thalassa" | `pay_upi` only if you currently owe the actor (a derived payment exists), else `see_split`; plus `not_me` |
| Settle-up stubs sent (hold to tear, `/stubs-send`) | `stub_received` | Payments | each payer on Toli | "Pay Aditya ₹1,200" / "Goa Weekend is settling up" | `pay_upi`, `mark_paid` |
| Expense edited/deleted, your balance moved > ₹1 | `expense_changed` | Expenses | affected members, except the actor | "Your share changed: ₹600 → ₹450" / "Rahul edited Dinner" | `see_split` |
| Settlement to you recorded | `payment_recorded` | Payments | the payee (and the payer, if someone else recorded it) | "Neha paid you ₹1,200" / "Recorded by Neha. Toli doesn't see UPI payments." | `view_trip` |
| Reminder | `reminder` | Reminders | the recipient | "Pay Aditya ₹1,000" / "A friendly nudge for Goa Weekend" + progress bar (paid so far) | `pay_upi`, `mark_paid` |
| Kitty low | `kitty_low` | Trip updates | all members | "Kitty 82% used — ₹2,400 left" + progress bar | `top_up` |
| Budget 75% / 100% (R2) | `budget_75` / `budget_100` | Trip updates | all members, once each (`trip_budgets.alert_75_at` / `alert_100_at`); a personal budget alerts only its member | "Goa Weekend has used 75% of its budget" + progress bar | `view_budget` |
| Trip starts / ends | `trip_started` / `trip_ended` | Trip updates | all members | "Goa Weekend starts today" / "Goa Weekend is over. Time to settle up?" | `view_trip` |
| Added to a trip | `added_to_trip` | Trip updates | the new member (only if they have an account) | "Aditya added you to Goa Weekend" | `view_trip` |
| > 5 events for you in 30 min | `digest` | the dominant channel (proposed) | the user | "Goa Weekend · 7 updates" + inbox lines | `view_trip` |

### 6.2 Send fewer, better
1. **Never notify the actor** about their own change.
2. **Ghosts get nothing** (no devices). Organisers can share WhatsApp text for them instead.
3. **Only about you:** a new expense you're not in doesn't notify you.
4. **Threshold:** balance changes at or below `profiles.notify_threshold_minor` (default ₹1) are silent ([03 §3.1][db]).
5. **Digest:** when a user would get a 6th event for the same trip within 30 minutes, the pending ones collapse into one `digest` (inbox style, latest lines first). Later events in the window update the same digest (same notification ID) instead of adding new ones.
6. **Collapse repeats:** several edits to the same expense within a short window become one push (`dedupe_key` per expense and user; proposed window 2 minutes).
7. **Respect settings:** global and per-trip mutes (`notification_preferences`) are checked **on the server** before queuing, and channels are also mutable in the OS.
8. **Foreground:** if the app is open on that trip, show the in-app stub banner instead of a system notification.
9. **No marketing, ever,** on these channels (a separate "News" channel, off by default, if ever needed).
10. **No push performs a money action by itself.** Every action opens the app and asks for confirmation ([04 §11][api]).
11. **No in-app notification inbox in v1.** The Trip feed is the history of what happened ([04 §8a][api]).

**Actions** ([04 §11][api]): `pay_upi` opens Toli, calls `/upi-link`, then the UPI app. `mark_paid` opens the settle row pre-filled; confirming writes `settlement.create`. `not_me` opens the expense with "Not part of this? Remove yourself"; confirming writes an `expense.edit` that removes you. `top_up` opens the Kitty with the suggested top-up. `view_budget` opens Budget.

### 6.3 Design in three levels ([D-009][d009])

| Where | What we show |
|---|---|
| **App open** (in-app banner) | The exact ticket-stub design: lime `#D4F26A`, torn zigzag top (9 × 6 px teeth), mono header "TOLI · GOA WEEKEND · NOW", body, amount 28/800, **Pay via UPI** in `onAccent`. A React Native component from the design system (`Stub`). |
| **Android, app closed** | System notification styled as far as Android allows: lime accent colour, Toli small icon, the actor's avatar as the large icon, amount in the title, body text, action buttons (**Pay via UPI** / **Mark as paid** / **View trip**), progress bar for kitty/budget/reminders, inbox style for digests. The zigzag shape and full lime background **aren't possible** (Android draws the frame; custom layouts are restricted from Android 12). |
| **iOS, app closed** | System banner with the avatar image (added by a Notification Service Extension) and action buttons (notification categories). **Later:** a Notification Content Extension (Swift) can show the full stub when the notification is expanded. |

The lock-screen look can't match the mockup exactly. We say so honestly and don't fake it with images of text (accepted as proposed in OQ-P10, [01](../01-overview.md#open-questions)).

### 6.4 Delivery ([D-009][d009], [tech stack §5.8][stack])
- After each applied op, `sync-push` queues rows in `notification_outbox` ([06 §6 step 7][sync]) with a `dedupe_key`; a pg_cron sender batches, applies digest rules and sends through the **FCM HTTP v1 API** from an Edge Function.
- **Android:** data-only, high-priority messages. notify-kit receives them (even with the app closed) and draws the notification.
- **Fallback (`devices.push_mode = notification`):** for makers that kill background apps (Xiaomi, Oppo, Vivo, Realme, OnePlus) and for any device that misses 2 delivery receipts, the server sends system-drawn notification payloads instead. They always arrive but have the standard Android look and no custom actions; tapping still opens the right screen. Delivery beats design ([D-009][d009]).
- **iOS:** alert messages with `mutable-content: 1`; the Service Extension adds images. Requires an **APNs auth key (.p8) uploaded to the Firebase project**, and push capability in the app's entitlements.
- Payloads are Zod-validated on the phone before display ([04 §11][api]).
- Tapping a notification or action deep-links (`toli://trip/<id>/...`). Android 12+ blocks notification "trampolines", so actions that open UI launch the app's activity directly; **Pay via UPI** opens Toli, which then opens the UPI app.

### 6.5 Tokens, per device ([03 §3.2][db])
- Each phone is a `devices` row (ID from secure storage). The FCM token is saved after push permission is granted, and updated whenever FCM refreshes it (and on each app start if changed).
- A user with two phones gets pushes on both.
- When FCM answers `UNREGISTERED` (or an invalid-token error), set `invalidated_at`; the sender skips invalidated devices. Devices unseen for a long time (e.g. 90 days) are also skipped (proposed).
- Signing out clears this device's token on the server.

### 6.6 Permission
- Android 13+ and iOS require asking. **Don't ask on first open.** Ask at a moment that explains itself (proposed): right after the user's first expense ("Get a stub when someone splits a bill with you?") or after joining a trip.
- If denied: the in-app banner still works while the app is open; Settings shows "Notifications are off for Toli · Turn on".

## 7. Data model

| Table ([03][db]) | Columns |
|---|---|
| `devices` | `id`, `user_id`, `platform`, `fcm_token`, `app_version`, `runtime_version`, `last_seen_at`, `invalidated_at`, `push_mode` (`data` / `notification`) |
| `profiles.notify_threshold_minor` | default 100 (₹1): the balance-change threshold |
| `notification_preferences` | `user_id`, `trip_id` (null = global), `category`, `enabled`, `updated_at` |
| `notification_outbox` | `id`, `user_id`, `trip_id`, `category`, `dedupe_key` (unique), `payload`, `send_after`, `sent_at`, `attempts`, `last_error`; rows deleted after 30 days |
| `reminders` | `trip_id`, `from_member_id`, `to_member_id`, `sent_at` |
| enum `notif_category` | `payments`, `expenses`, `reminders`, `trip_updates` |

## 8. API requirements

| Surface | Use |
|---|---|
| PostgREST `devices` ([04 §9][api]) | insert/update own rows (register and refresh the FCM token) |
| PostgREST `notification_preferences` | select/upsert own rows |
| `POST /reminder-send` ([04 §5.2][api]) | reminders, 48 h limit, WhatsApp text in the response |
| `POST /stubs-send` ([04 §5.1a][api]) | hold to tear: queues one `stub_received` per payer on Toli; the response says who was `pushed`, so the toast can say "Sent to Rahul, Neha. Share with Jay on WhatsApp." |
| Push payload ([04 §11][api]) | `{ v, category, trip_id, trip_name, kind, title, body, amount_minor?, currency?, actor_name?, actor_avatar_url? (signed, 24 h), image_url? (e.g. a receipt thumbnail), actions?, deep_link }` |
| FCM HTTP v1 | server → Google (service account key in Edge Function secrets) |

## 9. UI requirements

| Screen | Needs |
|---|---|
| [notifications](../screens/notifications.md) | the three design levels; in-app stub banner (drop animation `tsDrop`, auto-dismiss, swipe away); paid state "✓ Paid · Aditya notified" |
| [settings-profile](../screens/settings-profile.md) | Notifications: four toggles (Payments, Expenses, Reminders, Trip updates) with one-line descriptions; per-trip mute in the trip menu; OS permission state + **Turn on** |
| Channel names (Android) | Payments — "When someone pays you or you need to pay" · Expenses — "Stubs and changes to your share" · Reminders — "Friendly nudges to settle up" · Trip updates — "Kitty, budget, trip start and end" |

## 10. States

| State | Behaviour |
|---|---|
| Permission not asked | nothing sent to this device (no token) |
| Granted | normal |
| Denied | in-app banners only; settings nudge |
| Category muted | server skips; OS channel may also be off |
| Trip muted | server skips that trip |
| Token invalid | device skipped until a new token registers |
| Foreground on trip | in-app stub instead of a system notification |

## 11. Edge cases

- **Indian OEM battery managers** (Xiaomi/HyperOS, Oppo/Realme ColorOS, Vivo, some Samsung settings) can delay or drop data-only messages when the app is killed or "cleaned". Those devices get `push_mode = notification` (§6.4). A force-stopped Android app receives no FCM messages at all; a small "Allow Toli in the background" help page for affected brands is still worth testing.
- **Offline phone:** FCM holds messages for a while; the digest/collapse keys avoid a flood when it reconnects.
- **Pay via UPI from a notification while offline:** the UPI link needs the server; Toli opens and says "You need a connection to open UPI. You can still mark it as paid."
- **Stub for an expense that was deleted before the push was sent:** the sender drops it (check the expense is still current when sending).
- **Stale amount** (balance changed after the push): the deep link always shows the current amount.
- **User on two phones:** both get it; dismissing on one doesn't dismiss on the other (fine for v1).
- **Released/removed member:** stop sending for that trip at once.
- **Account deleted:** devices erased; nothing more is sent.
- **Language:** payload strings are built in the recipient's `profiles.locale` (en-IN / hi-IN).

## 12. Permissions

| Action | Organiser | Member | Ghost | Web viewer |
|---|---|---|---|---|
| Receive pushes | ✓ | ✓ | — | — |
| Mute categories / trips (own) | ✓ | ✓ | — | — |
| Send a reminder | ✓ | ✓ | — | — |
| Trigger settle-up stubs (hold to tear, `/stubs-send`) | ✓ | ✓ | — | — |

## 13. Offline behaviour

- Pushes are server-sent; the phone just displays them. The actor's offline changes notify others only after they sync.
- In-app stub banners for pulled changes can show when a pull brings new stubs while the app is open (proposed).
- Settings changes to preferences queue locally and sync when online (PostgREST write).

## 14. Sync behaviour

- Notifications are queued **after** an op commits, never before, so no one is told about a change the server rejected.
- The same op applied twice (`duplicate`) never queues twice (`dedupe_key` includes `op_id`).
- A push is also a hint to pull: opening it runs a pull for that trip.

## 15. Analytics

PRD §19 has `reminder_sent` only. Proposed (confirm before adding): `notification_permission` (`granted`/`denied`, `moment`), `notification_opened` (`kind`, `action`), `notification_muted` (`category`, `scope`), `digest_sent` (`event_count`). Delivery counts come from the sender's logs, not the phone.

## 16. Error handling

| Case | Handling |
|---|---|
| FCM `UNREGISTERED` / invalid token | set `devices.invalidated_at`; skip |
| FCM quota / 5xx | retry with backoff; `attempts`, `last_error` in `notification_outbox` |
| Payload fails Zod on the phone | don't show; report to Sentry |
| Reminder limited (429) | "One reminder per 48 hours. Keeps it friendly." |
| notify-kit fails to draw | fall back to a plain notification through the same `notify.ts` wrapper |

## 17. Testing

- **On real devices only** for delivery: FCM data-only behaviour and killed-app states can't be trusted on emulators/simulators. Matrix: Android 9, 12, 13, 14, 15 on at least Xiaomi, Samsung, Oppo/Realme, Vivo and a Pixel; iOS 15+ on a real iPhone (after the APNs key is uploaded).
- **States:** foreground, background, killed, force-stopped, Doze, battery saver, notifications denied, channel muted.
- **Rules:** actor never notified; ghosts skipped; ₹1 threshold; the 6th event in 30 min becomes a digest; collapse of repeated edits; per-trip and global mutes; 48 h reminder limit.
- **Actions:** each action button deep-links correctly (Android 12+ trampoline rules); **Pay via UPI** reaches the UPI app and the confirm sheet.
- **Tokens:** refresh updates the row; `UNREGISTERED` marks the device; two devices both receive.
- **Design review:** screenshots of every `kind` on Android and iOS against the reference.

## 18. Future considerations

- iOS Notification Content Extension (Swift) for the full stub design on expand.
- Android home-screen widget showing "You owe ₹1,200".
- Quiet hours.
- Swap notify-kit for `expo-notifications` behind `notify.ts` if the fork stalls ([D-009][d009]).

## 19. Open questions

Resolved by [04 §11][api] and [D-009][d009]: the `added_to_trip` kind; `pay_upi` on expense stubs only when a derived payment to the actor exists (else `see_split`); `not_me` writes a confirmed `expense.edit`; the `push_mode = notification` fallback for OEM killers; `actor_avatar_url` / `image_url` fields; the UPI link is never in the payload (`pay_upi` calls `/upi-link`).

1. **Digest channel:** which Android channel does a mixed digest use?

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[stack]: ../superpowers/specs/2026-09-24-toli-tech-stack.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[ds]: ../13-design-system.md
[d009]: ../decisions/D-009-notifications.md
[d012]: ../decisions/D-012-hold-to-tear.md
