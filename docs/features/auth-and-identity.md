# Feature · Auth and identity

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | **R1a:** silent anonymous account; **Save my account** (Google / Apple / email); **I already have an account** (sign in); sign out; minimum client version. Phone OTP later ([D-018][d018]) |
| **PRD refs** | §13 (organiser onboarding: "optional, skippable… account creation prompted only when they invite someone or approach a second device"), §16 (Auth), §18 (privacy, deletion), §5 principle 3 |
| **Related** | Screens: [welcome](../screens/welcome.md) · [splash](../screens/splash.md) · [sign-in](../screens/sign-in.md) · [settings-profile](../screens/settings-profile.md) · [join-in-app](../screens/join-in-app.md) — Docs: [02 §4, §6][arch] · [03 §3.1 `profiles`, §3.2 `devices`, §10, §11][db] · [04 §1, §8, §9][api] · [06 §8][sync] · [09 §1, §2.3 permission matrix][perm] — Decisions: [D-001][d001] · [D-007][d007] · [D-016][d016] · [D-026][d026] · [D-027][d027] — Features: [members-and-ghosts](members-and-ghosts.md) · [invites-and-joining](invites-and-joining.md) · [account-and-privacy](account-and-privacy.md) |

---

## 1. Purpose

Gives every person a stable identity **without a sign-up screen**. On first open, the app silently creates an **anonymous Supabase account**. Later, the person can **"Save my account"** by linking Google, Apple or an email code. Linking keeps the **same user ID**, so nothing moves. On a new phone, **I already have an account** signs back in. Phone OTP comes later.

## 2. User problem

- "I just want to log the cab. Why is it asking for my number?"
- "I got a new phone. Where did my trips go?"
- "I reinstalled Toli and now I'm not in the trip."

## 3. Business goal

- **G1:** no login step between install and first expense (≤ 90 s).
- **$0 at launch:** anonymous, Google, Apple and email are free; SMS/WhatsApp OTP costs money per message ([D-007][d007]).
- **Retention:** saved accounts survive new phones, so trip history (the switching cost in PRD §3) survives too.

## 4. User flow

**First open**
1. Splash → Welcome. In the background the app calls anonymous sign-in and stores the session encrypted (§6.4). No screen, no wait.
2. **Get started** → create a trip. Or **I have an invite link** → join. Privacy consent is recorded here (continue = accept the notice, OQ-P21).

**Save my account** (prompted, never forced)
1. At the right moment (§6.2), a sheet appears: "**Save your account** so you don't lose your trips if you change phones." Buttons: **Continue with Google**, **Continue with Apple** (iOS), **Use email**, **Not now**.
2. Google/Apple: the provider's sign-in opens, and the identity is **linked** to the current anonymous user.
3. Email: type the address → get a 6-digit code (sent through Resend) → type it → linked.
4. Toast: "Account saved. Your trips are safe."

**New phone / reinstall (saved account)**
1. Welcome → **I already have an account** (also in Settings → Account) → [Sign in](../screens/sign-in.md) with the same method.
2. The app downloads each trip with `/trip-snapshot` ([06 §8][sync]).

**Reinstall without saving (the risk)**
1. The app creates a **new** anonymous user. The old spot in the trip is still tied to the old user.
2. The person asks the organiser. Organiser → members → **Release spot** ([members-and-ghosts](members-and-ghosts.md)).
3. The person joins with the code and claims their name again. History is intact.

**Sign out**
1. Settings → Account → **Sign out**.
2. If this phone has unsynced changes, sign-out is **blocked**: "3 changes aren't synced yet. Connect to the internet first." ([06 §8][sync]).
3. Otherwise the app warns and signs out; this phone's copy of the trips is removed.

## 5. Requirements

| ID | Requirement | Level | Release | Source |
|---|---|---|---|---|
| AU-1 | No account step before creating a trip or logging an expense. | MUST | R1a | PRD §13, §5 |
| AU-2 | Create an anonymous Supabase user silently on first open. | MUST | R1a | [D-007][d007] |
| AU-3 | Offer **Save my account** with Google, Sign in with Apple, and email code. Linking keeps the same user ID. | MUST | R1a | [D-007][d007] |
| AU-4 | Offer Sign in with Apple wherever Google is offered on iOS. | MUST | iOS beta | App Store rule, [D-007][d007] |
| AU-5 | Prompt to save **after the first shared trip action** (inviting someone, or the first expense someone else can see), when **joining from a second device**, and **after the first trip settles**. Organisers get a stronger nudge. Never block. | MUST | R1a | PRD §13, [D-007][d007], review R-01 |
| AU-6 | Keep the session (access and refresh tokens) **encrypted**: an AES-256 key in **`expo-secure-store`**, the encrypted session in app storage. The device ID lives in secure store. Never plain text or plain AsyncStorage. Refresh through **one** code path only. | MUST | R1a | [02 §4, §6][arch], review R-01 |
| AU-7 | The organiser can release a member whose person lost their anonymous account. | MUST | R1a | [D-007][d007], [04 §3.5][api] |
| AU-8 | **I already have an account** on Welcome and in Settings, to sign in on a new phone ([sign-in](../screens/sign-in.md)). | MUST | R1a | review U-1 |
| AU-9 | Sign out is **blocked while this phone has unsynced changes**. An anonymous user with no trips can sign out. | MUST | R1a | review U-1, M-11 |
| AU-10 | Sign out and account deletion exist and are clear about consequences. | MUST | R1a | PRD §18 |
| AU-11 | Below the server's **minimum client version**, the app shows **Update Toli** (`426 upgrade_required`). | MUST | R1a | [D-026][d026] |
| AU-12 | During the APK test, "Save my account with Google" is optional and offered once. Before the Play Store switch, testers are prompted to save their account (OQ-P19). | SHOULD | R1a | [D-016][d016] |
| AU-13 | Phone OTP via Supabase's **Send SMS hook** (WhatsApp authentication messages ~₹0.12 each, or MSG91). | SHOULD | later | PRD §16, [tech stack §5.5][stack] |

## 6. Business rules

### 6.1 Identity model
- **`auth.users` ↔ `profiles` is 1:1.** A `profiles` row is created on first sign-in, including anonymous ([03 §3.1][db]). `profiles.is_anonymous` mirrors Supabase.
- A person's spot in a trip is a `trip_members` row with their `user_id`. Linking an identity doesn't change `user_id`, so no trip data changes.
- Anonymous users have a normal JWT. Sync, RLS and invites all work for them ([04 §1][api]).
- `profiles.display_name` is the person's default name. Each trip has its own `trip_members.display_name`, which can differ.

### 6.2 When to prompt "Save my account"

| Moment | Why | Prompt |
|---|---|---|
| After the first shared trip action (sharing an invite, or the first expense others can see) | Others now depend on this person's spot. Organisers get a stronger nudge (OQ-P20) | Sheet, once |
| Joining a trip on a second device | Only a saved account can be on two phones | Required path: **I already have an account** |
| After the first trip is settled | They now have history worth keeping | Sheet on the settled trip ("Everyone's square."), once |
| Before the Play Store switch (testers) | The reinstall would lose an unsaved account (OQ-P19) | Sheet, once |
| Settings → Account | Anytime | Always available |

"Not now" hides the prompt for that moment. Don't ask more than once per moment. **No prompt blocks** a money action.

### 6.3 Linking and signing in
- Google and Apple use Supabase identity **linking** onto the current anonymous user (manual linking must be enabled in the Supabase project).
- Email uses an email-change-with-code flow on the anonymous user, then verification.
- If the chosen identity **already belongs to another Toli user**, linking fails with: "This Google account is already on Toli. Sign in with it instead." The button opens **I already have an account** (OQ-P16). A proper merge comes later.
- **Signing in** with **I already have an account** replaces this phone's anonymous account with the saved one:
  - If the anonymous account has no trips, it just signs in.
  - If it has trips, the app warns first: "Trips on this phone belong to an unsaved account. They'll be left behind unless an organiser releases your spot." Unsynced changes block it, as with sign-out.
- After linking, `is_anonymous = false`.

### 6.4 Sessions and storage
- Supabase session and refresh token: encrypted in app storage, with the random AES-256 key in `expo-secure-store` (iOS Keychain, Android Keystore). This avoids the secure-store size limit ([02 §4][arch]).
- Device ID (`devices.id`): generated once, kept in secure storage, used in every op (`device_id`) ([03 §3.2][db]).
- **One refresh path:** only one piece of code refreshes the token, so two refreshes at once can't trip Supabase's reuse detection and lose the session (review R-01).
- If refresh fails with a revoked session, the app keeps all local data and asks the user to sign in again (a saved account) or explains the reinstall path (anonymous).
- **Sign-out** clears the secure store and this phone's SQLite copy of the trips ([09 §1][perm-auth]). It's blocked while the outbox has changes.

### 6.5 Account hygiene
- Anonymous sign-in limits per IP are raised above Supabase's default, because many Indian mobile users share one IP (carrier NAT). Cloudflare Turnstile protects the **web page**, not the app's silent first open (review S-10).
- The nightly `cleanup` job deletes **anonymous users with no trips after 30 days** ([04 §10.1][api], [03 §11][db]).
- The app uses the new `sb_publishable_…` key; the secret key stays in Edge Functions ([D-027][d027]).

### 6.6 Phone OTP (later)
- Supabase Auth's **Send SMS hook** calls our Edge Function, which sends the code through WhatsApp authentication templates or MSG91 SMS. DLT registration is needed for SMS in India.
- Phone login is optional and rate-limited; it's the only method with a per-message cost.

## 7. Data model

| Table | Columns |
|---|---|
| `auth.users` (Supabase) | `id`, `is_anonymous`, linked identities |
| `profiles` ([03 §3.1][db]) | `id`, `display_name`, `avatar_key`, `upi_vpa`, `upi_visible_to`, `locale`, `hide_lockscreen_amounts`, `notify_threshold_major`, `is_anonymous`, `created_at`, `updated_at`, `deleted_at` |
| `devices` ([03 §3.2][db]) | `id`, `user_id`, `platform`, `fcm_token`, `app_version`, `runtime_version`, `last_seen_at`, `invalidated_at`, `push_mode` |
| `trip_members` | `user_id` (the link between identity and trip spot), `last_active_at` (organiser takeover) |
| `consents` | `privacy_notice` recorded at Get started or join |
| `deletion_requests` | account deletion |
| Phone | `expo-secure-store`: the session encryption key and the device ID. App storage: the encrypted session. `kv`: onboarding and prompt flags. |

## 8. API requirements

| Surface | Calls |
|---|---|
| Supabase Auth ([04 §1][api]) | anonymous sign-in; link identity (Google, Apple); email OTP send/verify; sign in (**I already have an account**); refresh; sign out |
| PostgREST ([04 §9][api]) | `profiles` select/update own row; `devices` insert/update own rows |
| `POST /member-release` | organiser frees a lost spot |
| `POST /join` | re-claim after reinstall |
| `POST /account-delete`, `POST /account-export` ([04 §8][api]) | see [account-and-privacy](account-and-privacy.md) |
| Header on every Edge Function call | `Authorization: Bearer <JWT>`, `Toli-Client: <app_version>/<runtime_version>`; below the minimum version the server answers `426` ([D-026][d026]) |

## 9. UI requirements

| Screen | Needs |
|---|---|
| [splash](../screens/splash.md) | Anonymous sign-in runs here without delaying the splash |
| [welcome](../screens/welcome.md) | **Get started**, **I have an invite link**, and a small **I already have an account** link |
| [sign-in](../screens/sign-in.md) | Google / Apple / email; the "trips on this phone will be left behind" warning when needed; the unsynced-changes block |
| Save-account sheet | Title "Save your account"; one line why; Google / Apple / email buttons; **Not now**. Plain words, no "register". |
| [settings-profile](../screens/settings-profile.md) | Account section: status ("Not saved: this phone only" / "Saved with Google · aditya@…"); **Save my account**; **I already have an account**; **Sign out**; **Delete account**. Profile: name, avatar, UPI ID and who can see it. |
| Email code screen | 6 boxes, auto-advance, paste support, "Resend in 30 s" |
| Update screen | "Update Toli to keep syncing." + **Update** (shown on `426`) |

## 10. States

| State | Meaning | Shown as |
|---|---|---|
| No session yet | First open, no network | App works locally; sync paused; only the offline banner shows |
| Anonymous | Normal first state | Settings: "Not saved: this phone only" |
| Linking / signing in | Provider sheet open | Spinner on the button |
| Saved | Linked identity | "Saved with Google" |
| Session expired / revoked | Refresh failed | Banner "Sign in again to keep syncing" (saved) |
| Update required | Below the minimum client version | **Update Toli**; local data kept, outbox waits |
| Sign-out blocked | Outbox not empty | "3 changes aren't synced yet. Connect to the internet first." |
| Signed out | No session | Welcome screen; local data removed |
| Deleted | Account erased | Welcome screen |

## 11. Edge cases

- **First open with no internet:** anonymous sign-in can't run. The user can still create a trip and log expenses locally; ops wait in the outbox. The app signs in when the network returns, then pushes. `trip.create` then carries this new user as organiser.
- **Linking to an identity that already has a Toli account** (e.g. Aditya used Google on his old phone): linking fails; the app offers **Sign in with it instead** (OQ-P16). Trips created on this phone under the anonymous account are left behind unless an organiser releases the spot and he re-claims it. A server-side merge comes later.
- **Reinstall on Android without saving:** the Keystore entry is gone, so a new anonymous user is created. Recovery = organiser release + re-claim.
- **Organiser reinstalls without saving:** a co-organiser can release the spot. If there is none, the longest-standing member is offered the role after 30 days with no active organiser (OQ-P20).
- **Two phones, same saved account:** allowed. Each phone is its own `devices` row with its own push token and `device_id`.
- **Sign out on a shared phone with pending changes:** blocked until they sync, so nothing is lost.
- **Secure-store size limit:** some platforms reject secure-store values above ~2 KB, and a Supabase session can be larger. That's why only the key lives in secure store ([02 §4][arch]).
- **Many testers on one Wi-Fi or mobile network:** the per-IP anonymous limit is set high enough that a group doesn't hit it.
- **Old sideloaded APK:** below the minimum version, sync stops with **Update Toli**; nothing local is deleted.
- **Apple "Hide my email":** the relay address is fine; we never email marketing.
- **Clock wrong on the phone:** JWT checks can fail; show "Your phone's time looks wrong" if refresh errors say so.

## 12. Permissions

Account actions are the user's own. Trip actions (like releasing a lost spot) follow the [permission matrix, 09 §2.3][perm] ([D-031][d031]): only an organiser can release a spot. Ghosts have no account; web viewers need none.

## 13. Offline behaviour

- Everything except the sign-in calls themselves works offline.
- Linking, signing in and email codes need a connection: "Connect to save your account."
- Sign-out while offline with pending changes is blocked (see above).
- An expired access token while offline doesn't block anything; the app refreshes when back online.

## 14. Sync behaviour

- Sync (push, pull, snapshot) needs a valid JWT. With no session, the outbox waits.
- Every op carries `device_id` from secure storage, so the server can tell two phones of the same user apart.
- After signing in on a new phone: snapshot every trip the user is a member of, then pull as normal.
- A released user's pushes return `not_a_member`; pending ops go to Unresolved changes ([offline-and-sync](offline-and-sync.md)).
- Below the minimum client version, every push returns `426`; the outbox is kept and migrated after the update ([06 §8][sync]).

## 15. Analytics

PRD §19 has no auth events. Proposed (confirm before adding):

| Event | Properties |
|---|---|
| `account_prompt_shown` | `moment` (first_shared_action, second_device, first_trip, pre_store_switch, settings) |
| `account_linked` | `method` (google, apple, email), `days_since_install` |
| `account_link_failed` | `reason` (identity_exists, cancelled, network) |
| `account_signed_in` | `method`, `left_behind_trips` (count) |
| `sign_out_blocked` | `pending_ops` |
| `anonymous_reinstall_detected` | proxy: a `/join` claim right after a `member.release` on the same member |

Analytics identify users by Supabase user ID only; never by email.

## 16. Error handling

| Case | Message |
|---|---|
| Network down during link or sign-in | "Connect to save your account." |
| Identity already used | "This Google account is already on Toli. Sign in with it instead." + **Sign in** (OQ-P16) |
| Sign out or sign in with unsynced changes | "3 changes aren't synced yet. Connect to the internet first." |
| Wrong email code | "That code isn't right. Check the latest email." |
| Code expired | "That code has expired. We've sent a new one." |
| `unauthenticated` (401) | Try refresh; if it fails: "Sign in again to keep syncing." |
| `upgrade_required` (426) | "Update Toli to keep syncing." |

## 17. Testing

- **Unit:** prompt rules (each moment shows once; never on the money path); sign-out blocked when the outbox isn't empty.
- **Integration (local Supabase):** anonymous → link Google/Apple/email keeps the same `auth.uid()`; RLS still returns the same trips after linking; sign in on a second phone gets every trip by snapshot.
- **Refresh:** two concurrent refresh attempts go through the single path and never lose the session.
- **Offline first open:** create trip and 3 expenses with no network → connect → anonymous sign-in → ops applied with the correct `created_by_user`.
- **Reinstall drill (APK test):** uninstall/reinstall → new anonymous user → organiser release → re-claim → balances identical.
- **Version gate:** an app below the minimum gets `426` and shows **Update Toli**; the outbox survives the update.
- **Security:** the session is never in plain text (only the encrypted blob in app storage, key in secure store); the secret API key never ships in the app.
- **iOS review:** Sign in with Apple present with Google; account deletion reachable in-app.

## 18. Future considerations

- Phone OTP through the Send SMS hook (WhatsApp first, MSG91 fallback).
- A server-side **account merge** (anonymous → existing account) so no one has to rely on release.
- Passkeys.
- Contacts matching is **not** planned for v1 ([D-025][d025]).

## 19. Open questions

Resolved:
- Sign-in on a new phone: **I already have an account** on Welcome and in Settings ([sign-in](../screens/sign-in.md), [D-018][d018]).
- Google account already on Toli: interim "Sign in with it instead"; merge later (OQ-P16).
- Sign out: blocked with unsynced changes; otherwise removes this phone's data ([06 §8][sync], [09 §1][perm-auth]).
- Secure-store size: the encrypted "large secure store" pattern ([02 §4][arch]).
- Phone OTP for claiming: not in R1; claims need no approval (OQ-P14, [D-007][d007]).
- Testers' trips carry over; one reinstall at the Play switch with a save prompt (OQ-P19).

[prd]: ../superpowers/specs/2026-09-23-trip-money-manager-prd.md
[stack]: ../superpowers/specs/2026-09-24-toli-tech-stack.md
[arch]: ../02-architecture.md
[db]: ../03-database-schema.md
[api]: ../04-api-schema.md
[sync]: ../06-syncing.md
[perm]: ../09-security.md#permission-matrix
[perm-auth]: ../09-security.md#1-authentication
[d001]: ../decisions/D-001-tech-stack.md
[d007]: ../decisions/D-007-auth.md
[d016]: ../decisions/D-016-testing-distribution.md
[d018]: ../decisions/D-018-r1a-r1b-scope.md
[d025]: ../decisions/D-025-no-contacts-matching-v1.md
[d026]: ../decisions/D-026-write-path-and-compat.md
[d027]: ../decisions/D-027-environments-and-backups.md
[d031]: ../decisions/D-031-permission-matrix.md
