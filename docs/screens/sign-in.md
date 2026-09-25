# Screen · Sign in ("I already have an account")

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a |
| **Source** | **Assumption — not in UI reference; follows [13 Design system](../13-design-system.md).** Added for [review U-1](../14-pre-development-review.md#8-ux-problems) (someone on a new phone couldn't get back in) and [D-018](../decisions/D-018-r1a-r1b-scope.md) |
| **Related** | [features/auth-and-identity](../features/auth-and-identity.md) · [welcome](welcome.md) · [settings-profile](settings-profile.md) · [skeleton-loading](skeleton-loading.md) · [trips-list](trips-list.md) · [D-007 Auth](../decisions/D-007-auth.md) · [09 §1](../09-security.md) · [04 §1, §2.3](../04-api-schema.md) · [06 §3.3, §8](../06-syncing.md) · OQ-P16 in [01](../01-overview.md#open-questions) |

---

## Purpose
**Why:** Toli starts with a silent guest (anonymous) account ([D-007](../decisions/D-007-auth.md)). Someone who saved their account on an old phone needs a way to get the same account, and the same trips, on a new phone.
**What:** a short screen with **Continue with Google**, **Continue with Apple** (iOS) and **Use email instead** (a 6-digit code). After sign-in, the phone downloads each trip.
**How:** Supabase Auth signs in to the saved account. The phone then lists the account's trips and fetches a snapshot for each ([04 §2.3](../04-api-schema.md)), then continues with normal pulls ([06 §3.3](../06-syncing.md)).

## User goal
"I got a new phone. Give me my trips back."

## Entry points
| From | Trigger |
|---|---|
| [Welcome](welcome.md) | **I already have an account** |
| [Settings & profile](settings-profile.md) | **I already have an account** in the Account section |
| [Settings & profile](settings-profile.md) → Save my account error | **"This Google account is already on Toli. Sign in with it instead"** (OQ-P16 interim) → opens here with that provider highlighted |

## Exit points
| To | Trigger |
|---|---|
| [Skeleton loading](skeleton-loading.md) → [Trips list](trips-list.md) | Signed in, trips found |
| [Welcome](welcome.md) (or Trips list empty state) | Signed in, no trips on the account: toast **"Signed in. No trips on this account yet."** |
| Previous screen | `‹` back / **Cancel** |

## UI structure
**Header** (`Header`): back · no title.

**Step 1 · Choose how** (`space.gutter` sides):
| Element | Details and copy |
|---|---|
| Title | `type.title` **"Welcome back"** |
| Body | `type.body` muted **"Sign in with the account you saved on your other phone. Your trips come with you."** |
| Google | `Button` secondary, `size.cta`: **"Continue with Google"** (Google mark) |
| Apple | `Button` secondary: **"Continue with Apple"** (iOS only; required by Apple when Google is offered, [09 §1](../09-security.md)) |
| Email | `Button` ghost: **"Use email instead"** |
| Consent line | `type.small` muted **"By continuing you agree to the Privacy notice (`toli.in/privacy`, [04 §10](../04-api-schema.md))"** (shown on Welcome's path; Settings users already agreed) |

**Step 2 · Email code** (after **Use email instead**):
- Email field (`radius.control`), placeholder **"you@example.com"** → primary **"Send code"**.
- Then: **"We sent a 6-digit code to neha@example.com"** + a 6-box mono code field (`type.monoL`), which accepts paste and SMS/email autofill.
- Helper **"The code works for 10 minutes."** + ghost **"Send a new code"** (enabled after 30 s, Assumption) + ghost **"Use a different email"**.

**Step 3 · Getting your trips** (after sign-in):
- Title **"Getting your trips"**, then one row per trip: trip name + `type.label` **"DOWNLOADING"** → `CloudCheck` **"READY"**.
- The first trip that is ready opens behind [Skeleton loading](skeleton-loading.md); the rest continue in the background.

### Before signing in: this phone's guest account
| Situation | What happens |
|---|---|
| Guest account with **no trips** (the usual case on a new phone) | Nothing to warn about. The guest account is signed out and dropped (the nightly `cleanup` job removes empty guest accounts after 30 days, [04 §10.1](../04-api-schema.md)). |
| **Unsynced changes** on this phone (`outbox` not empty) | Blocked. `Sheet`: **"3 changes aren't synced yet. Connect to the internet first."** ([06 §8](../06-syncing.md)) with **OK**. |
| Guest account **with trips** (Assumption) | Warning `Sheet`: **"Goa Weekend is on this phone's guest account."** / **"If you sign in to another account, this phone loses it. An organiser can release your spot so you can claim it again from the invite link."** → `danger` **"Sign in anyway"** / **"Cancel"**. |
| Already signed in to a **saved** account (from Settings) | Same as signing out first; the outbox rule applies. |

Components: `Screen`, `Header`, `Button`, text input, code input, `Sheet`, `Toast`, `Icon`.

## States
| State | Behaviour |
|---|---|
| Loading | Provider buttons show a spinner while the OS sheet is open. **Send code** / verify show **"Sending…"** / **"Checking…"**. |
| Empty | Step 1 as above. |
| Populated | Step 3 list. |
| Error | Google/Apple cancelled: back to step 1, no message. Provider error: toast **"Couldn't sign in. Try again."** Wrong code: under the field **"That code isn't right. Check the latest email."** Expired: **"That code has expired. Send a new one."** Too many tries (Supabase rate limit): **"Too many tries. Wait a few minutes."** **No Toli account** for that identity: **"There's no Toli account for this Google account. Go back and tap Get started, then save your account."** (Assumption; the sign-in must not silently create a second account.) Snapshot failed: the trip row shows **"Couldn't download · Retry"**. |
| Offline | Buttons disabled with **"Signing in needs internet."** |
| Syncing | Step 3 progress. |
| Success | Trips list with the restored trips; toast **"Welcome back, Neha"** (Assumption). |
| Disabled | Step 1 buttons while a sign-in is running. |
| Partial data | Some snapshots failed: the list shows them with **Retry**; the others open normally. |

## Interactions
| Gesture | Result |
|---|---|
| **Continue with Google / Apple** | Guest-account checks above → OS sign-in sheet → Supabase sign-in → step 3. |
| **Use email instead** → **Send code** | Sends a 6-digit email code (10-minute expiry, [09 §1](../09-security.md)). |
| Enter 6 digits | Verifies automatically when the 6th digit is typed. |
| Back | Previous step, or the previous screen from step 1. |

## Data
- Reads `outbox` count and the local trips list (for the guest-account checks).
- After sign-in: the account's trips from PostgREST (`trips` returns only the caller's app-claimed trips, [04 §9](../04-api-schema.md)), then one `GET /trip-snapshot` per trip.

## API / Database
| Step | Call |
|---|---|
| Google / Apple | Supabase Auth sign-in with ID token (not "link identity") ([04 §1](../04-api-schema.md)) |
| Email | Supabase Auth email OTP send / verify |
| Before sign-in | Local sign-out of the guest: clear secure store and the local SQLite database ([09 §1](../09-security.md)) |
| After sign-in | `devices` upsert (FCM token); `consents` insert if the current privacy version isn't recorded yet (Assumption) |
| Restore | PostgREST `trips` select → `GET /trip-snapshot?trip_id=` per trip → `sync_cursors` rows |

## Edge cases
- **Signed in on two phones:** allowed. Both phones sync the same trips; each has its own outbox.
- **Account was deleted:** sign-in finds no account; same copy as "no Toli account".
- **A trip where you were released or removed:** not returned by RLS, so not restored.
- **Hundreds of trips:** restore the 5 newest first, the rest in the background (Assumption).
- **App killed during restore:** on the next open, missing snapshots are fetched again.

## Analytics
Proposed (not in PRD §19): `sign_in_started` (`method`: google / apple / email, `from`: welcome / settings), `sign_in_completed` (`trips_restored`), `sign_in_failed` (`reason`).

## Accessibility
- Provider buttons have full labels ("Continue with Google").
- The code field is one field for screen readers ("Six-digit code") and supports autofill.
- Errors are announced and shown in text under the field.
- Step 3 rows announce progress politely ("Goa Weekend ready").

## Open questions / assumptions
- **Assumption:** the whole screen and copy.
- **Assumption:** Apple is shown only on iOS (iOS is after the Android beta, [01 §9](../01-overview.md)).
- **OQ-P16 interim** (decided): when **Save my account** finds the identity already on Toli, show **"This Google account is already on Toli. Sign in with it instead"** and route here. A proper merge comes later.
- **Assumption:** the warning and **Sign in anyway** for a guest account that has trips. [features/auth-and-identity](../features/auth-and-identity.md) describes the same risk.
