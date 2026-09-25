# Screen · Profile and settings

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a (profile, Save my account, **I already have an account**, UPI ID, notifications incl. lock-screen privacy and threshold, "Tap instead of hold", uploads, data export, delete account, sign out) · R1b (Hindi) |
| **Source** | **Assumption: not in the UI reference.** Built from the design system ([13](../13-design-system.md)) and the patterns of existing screens (Header, Card + Row lists, Banner, Sheet, Segmented, Switch, Toast). |
| **Related** | [features/account-and-privacy](../features/account-and-privacy.md) · [features/auth-and-identity](../features/auth-and-identity.md) · [features/notifications](../features/notifications.md) · [features/settle-up](../features/settle-up.md) · [D-007 Auth](../decisions/D-007-auth.md) · [D-025 no contacts matching](../decisions/D-025-no-contacts-matching-v1.md) · [03 §3 profiles, devices, notification_preferences; §11 deletion](../03-database-schema.md) · [04 §1 Auth, §8 account, §9 PostgREST](../04-api-schema.md) · [06 §8 sign out](../06-syncing.md) · [09 §8 UPI rules](../09-security.md) · [sign-in](sign-in.md) · [notifications](notifications.md) · [trips-list](trips-list.md) |

---

## Purpose
**Why:** a few things belong to the person, not the trip: their name and photo, their UPI ID (so friends can pay them), keeping their account safe and getting back into it on a new phone, which notifications they get and what shows on the lock screen, and their rights over their data (DPDP Act, PRD §18: export and deletion are launch-blocking).
**What:** one scrollable screen, grouped in cards: profile, save my account / sign in, payments (UPI ID), notifications, app (accessibility, uploads, language), your data, about.
**How:** profile, devices and preferences are the only tables the phone writes directly (PostgREST, owner-only RLS, [D-011](../decisions/D-011-server-writes.md)). Account linking uses Supabase Auth. Export and delete are Edge Functions.

## User goal
- "Add my UPI ID so people can pay me in one tap."
- "Make sure I don't lose my trips if I change phones." / "I'm on a new phone: get my trips back."
- "Stop the reminders" / "Don't show amounts on my lock screen" / "Let me tap instead of hold" / "Delete my data."

## Entry points
| From | Trigger |
|---|---|
| [Trips list](trips-list.md) | Assumption: a round **avatar button** (`size.avatarL`; your initial on `bg.raised`, or photo) at the left of **"+ New"** in the "Your trips" header |
| Settle up / pay sheet | "Add your UPI ID so people can pay you" prompt when you're owed money and have none (Assumption) |
| "Save my account" prompt | After the first shared trip action (the first invite, or the first expense someone else can see); organisers get it at their **first invite**, with a stronger nudge (OQ-P20, review R-01, [D-007](../decisions/D-007-auth.md)). The prompt's button opens this screen scrolled to the Save card |
| Push permission denied | "Turn on notifications" row |

## Exit points
| To | Trigger |
|---|---|
| Previous screen | Back (`CaretLeft`) |
| [Sign in](sign-in.md) | **"I already have an account"** link (in the Save card, or the Sign in row) |
| Google / Apple sign-in sheet (system) | **Continue with Google / Apple** |
| Email code sheet | **Use email** |
| OS notification settings | **Turn on notifications** |
| Share sheet | Export ready |
| Welcome (fresh state) | After account deletion completes, or after **Sign out** |
| Web pages | Privacy notice, Terms |

## UI structure

### Header
`Header`: back (`CaretLeft`), title **"You"** (Assumption).

### Content (scroll, padding 0 `space.gutter` 24, gap `space.14`)

**1 · Profile card** (`Card`, `radius.card`, padding `space.cardPad`, row layout)
- `Avatar` `size.avatarXL`, lime variant ("you") with your initial, or your photo.
- Name `type.header` (**"Aditya"**) and a caption `type.small` muted with account status: **"Saved · aditya@gmail.com"** or **"Not saved yet · only on this phone"**.
- Right: `Button` tonal `size.buttonM` **"Edit"** → name + photo `Sheet`.

**2 · Save my account** (only when `is_anonymous`): `Banner` (`bg.raised`, `radius.key`, padding `space.cardPad`, gap `space.10`)
- Title `type.bodyStrong`: **"Save my account"**
- Body `type.caption` muted: **"Right now this phone is your only key. Link an account so you can get your trips back on a new phone."**
- Buttons (stacked, `size.buttonM`, `radius.control`): **"Continue with Google"** (secondary: `color.text` background), **"Continue with Apple"** (secondary; always shown on iOS, Assumption: also on Android), **"Use email instead"** (ghost).
- Link below the buttons, `type.caption`: **"I already have an account"** → [Sign in](sign-in.md). For someone who used Toli on another phone and wants **that** account here, not a new one (review U-1, OQ-P16).
- Once linked, this card disappears and the profile caption shows the provider.

**2a · Sign in row** (only when `is_anonymous`, below the Save card): Row **"Sign in to another account"** · subtitle "I already have an account" → [Sign in](sign-in.md). Same destination as the link; kept as a row so it's easy to find.

**3 · Payments card** (`Card` with `Row`s, `size.row` / `size.rowTall`, `color.divider`)
- Title row `type.bodyStrong` **"Payments"**.
- Row **"UPI ID"** · value `type.mono` **"aditya@okhdfc"** or muted **"Add"** → `Sheet` with a text field (placeholder **"name@bank"**) and **"Save"**.
- Row **"Who can see it"** → `Segmented` with **only two options** ([03 §3.1](../03-database-schema.md), [09 §8](../09-security.md)):
  | Label | `upi_visible_to` |
  |---|---|
  | **"People who owe me"** (default) | `debtors_only` |
  | **"Nobody"** | `nobody` |
  There is **no** "Everyone on my trips" option.
- Helper `type.small` muted: **"Toli only puts your UPI ID inside a pay link for friends who owe you, on trips in rupees. Toli never holds money or sees payments."** (UPI links are INR-only; other trips offer only Mark as paid, [04 §5.1](../04-api-schema.md).)

**4 · Notifications card**
- Title **"Notifications"**.
- If OS permission is off: a first row **"Notifications are off for Toli"** + `Button` tonal **"Turn on"**.
- Four toggle rows (`Switch`, [13 §6](../13-design-system.md)), each with a `type.micro` muted subtitle:
  | Row | Subtitle | Category |
  |---|---|---|
  | **"Payments"** | "Stubs to pay, and when someone pays you" | `payments` |
  | **"Expenses"** | "New spends you're in, and changes to your share" | `expenses` |
  | **"Reminders"** | "Friendly nudges to settle up" (pushes from R1b; R1a reminders are WhatsApp shares) | `reminders` |
  | **"Trip updates"** | "Kitty, trip start and end, reopen requests" (+ budget from R2) | `trip_updates` |
- Row **"Hide amounts on lock screen"** + `Switch` (default off). Subtitle: **"Pushes say 'Goa Weekend · new expense' without names or amounts."** Saved to `profiles.hide_lockscreen_amounts`; **the server** strips amounts and names from the push text before sending, so it also works on phones that use plain system notifications ([notifications](notifications.md)).
- Row **"Only tell me about changes over"** · value **"1"** in the trip's currency (e.g. "₹1 / $1") → `Sheet` with a small number field (whole units, 0–10,000; Assumption). Saved to `profiles.notify_threshold_major` (**major units**, default 1). The server converts it per trip currency (PRD F5).
- Footnote `type.small` muted: **"Mute a single trip from its ⋯ menu."** From R1b, when digests ship, it adds: **"Busy trips are bundled into one update."** (Assumption: per-trip mute lives on the trip.)

**5 · App card**
- Row **"Tap instead of hold"** + `Switch` (default off). Subtitle: **"Hold buttons (like Hold to tear) open a confirm step instead."** Turns on the `HoldButton` accessible mode everywhere ([13 §6, §10](../13-design-system.md), review U-5). It's also on automatically with a screen reader, Switch Access or voice control.
- Row **"Upload photos on Wi-Fi only"** + `Switch` (default on, PRD §17). Subtitle: **"Scanning a bill always uploads right away."** (OQ-P17)
- Row **"Language"** (R1b) → `Segmented`: **"English"** / **"हिन्दी"** (Hindi label in Noto Sans Devanagari). **Hidden in R1a**, which is English only ([D-018](../decisions/D-018-r1a-r1b-scope.md)).

**6 · Your data card**
- Row **"Export my data"** · subtitle "All your trips as JSON + CSV" → runs export.
- Row **"Delete my account"** in `color.danger` with a muted subtitle "Removes your profile. Shared trips show you as 'Former member'." → delete `Sheet`.
- No contacts row: Toli never uploads or matches your contacts, and there is no "Let friends find me" setting in v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).

**7 · About card**
- Rows: **"Privacy notice"**, **"Terms"**, **"How Toli handles money"** (opens a short page: "Toli only keeps count. Banks and UPI apps move the money."), **"Contact support"**.
- Last row, muted `type.label`: **"Toli 1.0.0 · runtime 3"** (app and runtime version).
- ghost `Button` **"Sign out of this phone"**, shown when:
  - the account is linked (Google, Apple or email); or
  - the account is anonymous **and has no trips** (nothing to lose; review U-1).
  - Hidden for an anonymous account with trips, because signing out would lose the account. Those users see **Save my account** instead.
- **Sign out is blocked while changes aren't synced** ([06 §8](../06-syncing.md)): the button stays visible, and tapping it shows **"3 changes aren't synced yet. Connect to the internet first."** with **OK**. It only proceeds when the outbox is empty (no `queued`, `sending`, `retrying` or `rejected` ops; Assumption: rejected ops must be resolved or discarded in [Unresolved changes](unresolved-changes.md) first).

### Sheets
| Sheet | Content |
|---|---|
| Edit profile | Photo (camera / gallery / remove), name field (1–30 chars), **Save**. After saving a new name: follow-up **"Use 'Aditya K' on your trips too?"** with **"Yes, rename me"** / **"Just my profile"** (Assumption). |
| UPI ID | Field, inline error **"That doesn't look like a UPI ID"**, **Save**, and **"Remove"** when one exists. |
| Email link | Email field → **"Send code"** → 6-digit code field → **"Verify"**. |
| Delete account | Title **"Delete your account?"** · body **"Your profile, UPI ID and phones are erased. Shared expenses stay for the others, and you show as 'Former member', so everyone's balances still add up. This can't be undone."** · if you still owe or get back money: a line **"You still owe ₹1,200 on Goa Weekend."** · field **"Type DELETE to confirm"** · `Button` variant **`danger`** **"Delete my account"** (enabled only when the field says DELETE). |
| Change threshold | Title **"Only tell me about changes over"** · number field (whole units) · helper **"Applies in each trip's own currency. 1 means ₹1 on a rupee trip, $1 on a dollar trip."** · **Save**. |
| Sign out blocked | Title **"Not synced yet"** · body **"3 changes aren't synced yet. Connect to the internet first."** · **OK**. |

**Compact layout** (< 380 px, [13 §9](../13-design-system.md)): `space.gutter` → 16; the Profile card's **Edit** button moves under the name (Assumption); row titles truncate with an ellipsis.

Components: `Screen`, `Header`, `Card`, `Row`, `Avatar`, `Banner`, `Button` (incl. `danger`), `Segmented`, `Switch`, `Sheet`, `Toast`, `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | Profile comes from the local cache; first open after install shows the name from `trip_members` if no profile is cached (Assumption). Export shows a spinner row **"Preparing your export…"**. |
| Empty | No name yet (anonymous, never claimed): profile shows **"Add your name"**; no UPI ID: row shows **"Add"**. |
| Populated | As above. |
| Error | Link failed: toast **"Couldn't link that account. Try again."** Account already used by another Toli user: interim message **"This Google account is already on Toli. Sign in with it instead."** with **I already have an account** → [Sign in](sign-in.md) (OQ-P16; a merge comes later). Export failed / rate limited (3 a day): toast **"You can export 3 times a day. Try again tomorrow."** |
| Offline | Profile, UPI ID, notification settings (incl. lock-screen privacy and threshold), linking, sign-in, export and delete need the internet (they aren't outbox ops). These rows show muted **"Needs internet"** and are disabled. **Tap instead of hold**, Wi-Fi only and (R1b) Language are local and still work. Sign out is blocked anyway while changes are pending. |
| Syncing | n/a. |
| Success | Toasts: **"Saved"** (profile), **"UPI ID saved"**, **"Account saved · Google"**, **"Your export is ready"** (then share sheet); language switches immediately (R1b). |
| Disabled | Delete button until DELETE is typed. Sign out hidden for anonymous users with trips; blocked (with the sheet) while the outbox isn't empty. |
| Partial data | No photo → initials. Push token missing (permission denied) → notification toggles still editable (they apply once permission is on). |

## Interactions
| Gesture | Result |
|---|---|
| Tap **Edit** | Edit profile sheet. |
| Tap **UPI ID** | UPI sheet. |
| Change **Who can see it** | Saves immediately; toast "Saved". |
| Tap a notification toggle | Saves immediately (optimistic; reverts with a toast on failure). |
| Tap **Continue with Google / Apple** | System sign-in → Supabase `linkIdentity` (same user ID; nothing moves). |
| Tap **I already have an account** | Push [Sign in](sign-in.md). |
| Toggle **Hide amounts on lock screen** | Saves immediately to the profile (optimistic; reverts with a toast on failure). |
| Tap **Only tell me about changes over** | Threshold sheet. |
| Toggle **Tap instead of hold** | Saves locally; every `HoldButton` switches to tap → confirm straight away. |
| Tap **Sign out of this phone** | If the outbox is empty: confirm **"Sign out? Your trips stay on your account."** → sign out → local data wiped → Welcome. Otherwise the "Not synced yet" sheet. |
| Tap **Export my data** | `POST /account-export` → share sheet with the file link (valid 24 h). |
| Tap **Delete my account** | Delete sheet → `POST /account-delete` → local data wiped → Welcome. |
| Change language (R1b) | App restarts its text in Hindi/English without a full reload (Assumption). |

## Data
| Value | Source |
|---|---|
| Name, photo, UPI ID, visibility, locale, anonymous? | `profiles` (own row, cached locally in `kv`; Assumption) |
| Lock-screen privacy, change threshold | `profiles.hide_lockscreen_amounts`, `profiles.notify_threshold_major` |
| Linked providers / email | Supabase Auth session identities |
| Push permission | OS |
| Notification toggles | `notification_preferences` where `trip_id is null` |
| Tap instead of hold | `kv` (local, per device; Assumption) |
| Wi-Fi only | `file_queue.wifi_only` default in `kv` (Assumption) |
| Unsynced changes (sign-out check) | `outbox` count for all trips |
| Has trips? (sign-out for anonymous users) | `trip_members` rows for me |
| Outstanding balances (delete warning) | local engine over trips on this phone |

## API / Database
| Action | Call |
|---|---|
| Edit name / UPI / visibility / locale / `hide_lockscreen_amounts` / `notify_threshold_major` | PostgREST `PATCH /rest/v1/profiles` (own row) ([04 §9](../04-api-schema.md)) |
| Sign in to an existing account | Supabase Auth sign-in on [Sign in](sign-in.md), then `/trip-snapshot` per trip |
| Sign out | Supabase Auth sign-out, only when `outbox` is empty; then the local database is wiped |
| Rename on trips too | `member.update` op per trip (`display_name`) via the outbox |
| Avatar | `POST /upload-url` with `trip_id = null`, `owner_type = profile` → PUT to R2 → `/upload-confirm`, then `profiles.avatar_key` ([04 §4.1](../04-api-schema.md), [03 §7.1](../03-database-schema.md)) |
| Notification toggles | PostgREST upsert `notification_preferences` |
| Push token | `devices` upsert |
| Link account | Supabase Auth (Google, Apple, email OTP) |
| Export | `POST /account-export` → `{ url, expires_at }` |
| Delete | `POST /account-delete { confirm: "DELETE" }` → member rows become "Former member" (numbered if several) and the server writes a `member.anonymised` op; profile, devices and auth user are erased ([03 §11](../03-database-schema.md)). The public `/delete-account` page (Worker) links here ([04 §10](../04-api-schema.md)) |

## Edge cases
- **Anonymous user tries to delete:** allowed; the same anonymisation applies.
- **Organiser deletes their account:** any co-organiser keeps the trip running. With no other organiser, the longest-standing claimed member can take over after 30 days without an active organiser (OQ-P20). Assumption: the delete sheet suggests making someone else an organiser first.
- **UPI ID changed while a friend's pay link is open:** the link was built earlier by `/upi-link` with the old ID; Assumption: links are rebuilt each time "Pay via UPI" is tapped, so only an already-open UPI app is affected.
- **Visibility "Nobody" while people owe you:** they see "Aditya hasn't added a UPI ID. Pay another way, then mark it as paid."
- **Trip not in INR:** no UPI link at all (`not_inr`); payers see only Mark as paid.
- **Two devices change the same setting:** last write wins (PostgREST).
- **Hindi strings longer than English (R1b):** rows truncate titles with an ellipsis; subtitles wrap.
- **Sign out with unsynced changes:** blocked with "3 changes aren't synced yet. Connect to the internet first." ([06 §8](../06-syncing.md), review M-11).
- **Anonymous user with no trips:** can sign out (nothing to lose), for example to use **I already have an account** instead.
- **Threshold set to 0:** every change that moves your balance notifies you.
- **Hide amounts on, app open:** the in-app stub banner still shows amounts (the phone is unlocked).
- **"Tap instead of hold" off, but a screen reader is on:** the accessible mode still applies ([13 §6](../13-design-system.md)).

## Analytics
No PRD §19 events for this screen. Proposed (Assumption): `account_linked` (`provider`), `sign_in_started` (from settings), `signed_out`, `upi_id_saved` (`visibility`), `notification_pref_changed` (`category`, `enabled`), `lockscreen_amounts_hidden` (`enabled`), `tap_instead_of_hold` (`enabled`), `language_changed` (`locale`), `data_export_requested`, `account_deleted`.

## Accessibility
- Each toggle announces its category and subtitle: "Reminders, friendly nudges to settle up, switch, on".
- The segmented control is a radio group.
- The UPI ID is read character by character on request.
- The delete sheet traps focus; the destructive button says "Delete my account permanently".
- All rows ≥ `size.row`; toggles have 44 × 44 hit areas; focus ring `color.focus`.
- **"Tap instead of hold"** is the setting that makes every hold action usable for people who can't hold ([13 §10](../13-design-system.md)).
- Hindi (R1b) uses Noto Sans Devanagari at the same weights ([13 §3](../13-design-system.md)).

## Open questions / assumptions
- **Assumption:** the whole screen, its entry point (avatar button on Trips list), copy and structure are not in the UI reference.
- **Gap:** profile edits go through PostgREST, which **doesn't work offline** and isn't in the outbox. Either queue them locally or accept "Needs internet".
- **Resolved:** avatars upload with `owner_type = profile` and no trip ([04 §4.1](../04-api-schema.md)).
- **Resolved:** `upi_visible_to` is only `debtors_only` / `nobody` ([03 §3.1](../03-database-schema.md)), so there's no "Everyone on my trips" option.
- **Resolved:** **I already have an account** links to [Sign in](sign-in.md) (review U-1). Sign out is blocked while changes are unsynced (review M-11).
- **Resolved:** lock-screen privacy is a server-side profile setting (`hide_lockscreen_amounts`, review S-05); the threshold is `notify_threshold_major` in major units (review C-09).
- **Resolved:** no contacts discovery or "Let friends find me" in v1 ([D-025](../decisions/D-025-no-contacts-matching-v1.md)).
- **Interim (OQ-P16):** linking a Google account that already has Toli data shows "This Google account is already on Toli. Sign in with it instead." A merge comes later.
- **Open:** does `profiles.display_name` ever flow into trip member names automatically? Assumed: only when the user says yes.
