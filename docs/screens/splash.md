# Screen · Splash

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | System (ships with R1a) |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- SPLASH -->` block (lines 69–84); timing in `autoAdvance()`; sidebar group "SYSTEM STATES · Splash + loading" |
| **Related** | [13 §7.3 Splash](../13-design-system.md) · [13 §8 Wordmark](../13-design-system.md) · [02 §7 Performance budgets](../02-architecture.md) · [features/auth-and-identity](../features/auth-and-identity.md) · [welcome](welcome.md) · [trips-list](trips-list.md) · [D-007](../decisions/D-007-auth.md) · [review U-13](../14-pre-development-review.md#8-ux-problems) |

---

## Purpose
**Why:** the app needs a moment on cold start to open SQLite, restore the session and decide where to go. This screen fills that moment with the brand instead of a blank screen.
**What:** a lime ticket icon whose stub tears off, the "toli" wordmark, and a thin loading bar.
**How:** it is shown only while startup work runs.
- **First launch only:** the full sequence plays once (about 1.9 s), so the brand is seen.
- **Every later launch:** there is **no minimum**. The splash leaves as soon as local data is ready, to protect the ≤ 1.5 s cold start ([13 §7.3](../13-design-system.md), review U-13). Maximum 2.9 s, then [Skeleton loading](skeleton-loading.md).

## User goal
None directly. The user wants to get into their trips fast. The splash must never feel like waiting.

## Entry points
| From | Trigger |
|---|---|
| OS launcher | Cold start of the app |
| Push notification / deep link (cold start) | App was not running; the splash shows before routing to the deep-link target |

Not shown on warm resume (app returning from background).

## Exit points
| To | When |
|---|---|
| [Welcome](welcome.md) | First run: no trips in SQLite and the onboarding flag in `kv` is not set |
| [Trips list](trips-list.md) | Returning user with one or more trips, or a signed-in user with none (Assumption: the prototype always goes to Welcome because it is a demo; real returning users skip Welcome) |
| [Trip home](trip-home.md) | Returning user whose last-opened trip is active (Assumption; see Open questions) |
| Deep-link target (e.g. [Settle up](settle-up.md), [Join in app](join-in-app.md)) | App opened from a notification or invite link |

## UI structure
Full screen on `color.bg.base` (`#2B2F36`). Status bar shows time and network label.

| Part | Details |
|---|---|
| **Ticket icon** | Centred. 150 × 92 px. Left body 108 × 92 lime (`color.accent`), radius `radius.cta` (18) on the left corners. Right stub 42 × 92 lime, `radius.cta` on the right corners, with a 3 px dashed `color.perforation` left border (the perforation). Two 16 px notches in `color.bg.base` at the top and bottom of the tear line. (Assumption: these icon sizes become `splash.*` tokens in 13 before build, per the "add a token first" rule.) |
| **Wordmark** | `Wordmark` component, 80 px size (154 × 85 box): "toli" top half `color.text`, bottom half lime offset (0.067·size, 0.085·size) and rotated 3° ([13 §8](../13-design-system.md)). `space.40` gap below the icon (prototype: 36). |
| **Loader** | Pinned 64 px from the bottom, 80 px side insets. Label **"LOADING YOUR TRIPS"** in `type.label` (mono 11/700, +0.12em, uppercase, `color.textMuted`). Below it a 3 px bar: track `color.bg.raised`, fill lime growing left to right. |

Components: `Screen`, `Wordmark`, `ProgressBar` (3 px variant).

**Compact layout** (< 380 px wide, [13 §9](../13-design-system.md)): same layout; `space.gutter` → 16. Nothing else changes.

## States
| State | Behaviour |
|---|---|
| Loading | The only state. The bar fills over 2.4 s (`ease.move`) but the screen leaves as soon as data is ready (no minimum after the first launch). |
| Empty | n/a: there is no data on this screen. |
| Populated | n/a. |
| Error | Assumption: if SQLite fails to open or a migration fails, replace the loader label with **"Something went wrong opening your trips"** and a tonal **Try again** button; report to Sentry. Local data is never deleted. |
| Offline | Same as normal. Startup never touches the network ([02 §7](../02-architecture.md)). Status bar shows **OFFLINE**. |
| Syncing | n/a: sync starts after the first screen appears. |
| Success | Routes to the next screen with a fade. |
| Disabled | n/a. |
| Partial data | n/a. |

## Interactions
| Gesture | Result |
|---|---|
| Tap | Nothing. The splash cannot be skipped (it is already as short as possible). |
| Back (Android) | Exits the app. |

**Motion** ([13 §7.3](../13-design-system.md)):
1. 0 s: ticket icon pops in (0.6 s, `ease.pop`, scale .6 → 1, rotate −8° → 0).
2. 0.5 s: loader fades in (0.4 s, `ease.enter`).
3. 1.0 s: stub tears off (0.7 s): rotates 14° and drops (12, 10) px from its bottom-left corner.
4. 1.3 s: wordmark rises (0.6 s, `ease.enter`).
- **First launch:** all four steps play. The onboarding flag `kv.splash_played` is set once they finish.
- **Later launches:** the same sequence starts, but the screen is cut off as soon as data is ready, often before the tear. That's fine: speed matters more than the animation.
- **Reduce Motion:** show the final frame (icon with stub torn, wordmark) with a 200 ms crossfade; no pop or tear.

## Data
Reads (local only):
- `kv`: onboarding flag, `splash_played` flag, device ID, last-opened trip ID.
- `trips` (count of non-deleted trips) to choose Welcome vs Trips list.
- Supabase session (restored, not validated online): the AES-256 key comes from `expo-secure-store` and decrypts the session kept in app storage (the "large secure store" pattern, [02 §4](../02-architecture.md)).

## API / Database
Writes nothing except the local `kv.splash_played` flag. If there is no session at all, the app creates the **anonymous Supabase user** in the background after the splash, not during it ([D-007](../decisions/D-007-auth.md)); failure to do so offline is fine.

## Edge cases
- **Very fast device:** data ready in 300 ms → on the **first launch**, hold until the sequence ends so the tear plays once. On **later launches**, leave at 300 ms with a `dur.fast` fade (no minimum, review U-13), so there's no flash.
- **Splash interrupted on first launch** (app killed mid-animation): `splash_played` isn't set, so the full sequence plays next time.
- **Slow device:** at 2.9 s leave anyway to the next screen; if data still isn't ready, show [Skeleton loading](skeleton-loading.md).
- **App killed during a previous save:** SQLite transaction is atomic ([06 §8](../06-syncing.md)); nothing to repair here.
- **Pending migration after an app update:** runs during the splash; if it takes longer than 2.9 s, the loader stays until it finishes (never route with an unmigrated DB).

## Analytics
No PRD §19 event. Assumption: record cold-start duration as a performance metric (Sentry / PostHog `$app_start` property), not a funnel event. Target ≤ 1.5 s p90 to trip list ([02 §7](../02-architecture.md)).

## Accessibility
- The screen announces **"Toli. Loading your trips."** once.
- Animation respects Reduce Motion.
- No interactive elements, so no focus order.

## Open questions / assumptions
- **Assumption:** returning users skip Welcome and go straight to Trips list. Whether to open the last active trip directly is open (faster for "5 seconds to log", but hides other trips).
- The prototype auto-advances at 2.9 s to Welcome regardless; that is demo behaviour.
- **Resolved:** the old 1.2 s minimum is gone. Only the first launch plays the full sequence ([13 §7.3](../13-design-system.md), review U-13).
