# Screen · Welcome

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1a |
| **Source** | `ui-refrence/Toli App.dc.html` → `<!-- WELCOME -->` block (lines 86–109). Direction chosen from `ui-refrence/Toli Welcome Variants.dc.html` option **1b "The screen is the ticket"** |
| **Related** | [D-015 Welcome direction](../decisions/D-015-welcome-direction.md) · [D-007 Auth](../decisions/D-007-auth.md) · [D-016 Testing distribution](../decisions/D-016-testing-distribution.md) · [13 §1, §7](../13-design-system.md) · [features/auth-and-identity](../features/auth-and-identity.md) · [features/invites-and-joining](../features/invites-and-joining.md) · [create-trip](create-trip.md) · [join-in-app](join-in-app.md) · [sign-in](sign-in.md) · [09 §10 consent](../09-security.md) |

---

## Purpose
**Why:** a first-time user needs to know in one glance what Toli is. They opened it to start a trip, because a friend sent them one, or because they already use Toli on another phone.
**What:** a full-width lime "ticket" top half with the tagline, one line of value, two main actions, and a small **I already have an account** link.
**How:** no sign-up wall. An anonymous account is created silently ([D-007](../decisions/D-007-auth.md)). Every button goes straight into the task.

## User goal
- Organiser: "Let me start a trip right now."
- Participant: "A friend sent me a link / code; get me into that trip."
- Returning user: "I have a new phone; give me my trips back."

## Entry points
| From | Trigger |
|---|---|
| [Splash](splash.md) | First run (no trips on the phone, onboarding flag not set) |
| [Trips list](trips-list.md) | n/a: once a user has a trip they never see Welcome again. Assumption: if the user leaves every trip, Trips list shows its own empty state, not Welcome. |

## Exit points
| To | Trigger |
|---|---|
| [Create trip](create-trip.md) | **Get started** |
| [Join in app](join-in-app.md) | **I have an invite link** (the prototype routes this to the invite web view as a demo; the app opens the in-app join flow per [D-016](../decisions/D-016-testing-distribution.md)) |
| [Sign in](sign-in.md) | **I already have an account** ([review U-1](../14-pre-development-review.md#8-ux-problems)) |
| Deep-link target | If an invite link opens the app while Welcome is showing, go straight to Join in app with the token filled in |

## UI structure
The screen draws under the status bar (starts at −44 px). The status bar text switches to `color.onAccent` on this screen.

**Top half: the ticket** (500 px high, 400 px min on short screens, `color.accent` background, `color.onAccent` text, padding 74 / 28 / 34):
| Element | Details |
|---|---|
| Wordmark | `Wordmark` on-lime variant, 56 px (108 × 60 box): both halves `color.onAccent`, lower half at 50% opacity, offset (4, 5) |
| Tag | Top-right: **"ADMIT ALL"** in `type.label` (mono 11/700, +0.12em) |
| Headline | Three lines, `type.display` (52/800, −0.04em, line 0.95; **44** in the compact layout below 380 px, [13 §9](../13-design-system.md)), staggered rise-in at 0.15 s / 0.3 s / 0.45 s: **"One trip."** / **"One tab."** / **"Zero awkward."** |
| Perforation | 2 px dashed line (10 px dash, 10 px gap, `color.perforation`) along the bottom edge, 28 px insets, animated marching left (1.2 s loop) |
| Notches | 32 px circles in `color.bg.base` at the bottom-left and bottom-right corners |

**Bottom half** (`color.bg.base`, padding 26 / 28 / 30):
| Element | Details |
|---|---|
| Value line | 15 px, line 1.45, `color.textMuted`: **"Unlimited expenses and every kind of split, free. Toli works out who pays whom."** |
| Primary button | `Button` secondary variant (text colour on dark): `size.cta`, `radius.cta`, `color.text` bg, `color.bg.card` text: **"Get started"**. Press: lime with `color.onAccent` text. |
| Text button | `Button` ghost, `size.buttonM`, `type.body`, muted: **"I have an invite link"** |
| Small link | `Button` ghost, `size.buttonS`, `type.caption`, muted: **"I already have an account"** → [Sign in](sign-in.md) |
| Consent line | `type.small`, `color.textMuted`, centred: **"By continuing you agree to the Privacy notice"** ("Privacy notice" is a link to `/privacy`, [04 §10](../04-api-schema.md)) |

Components: `Screen`, `Wordmark`, `TicketCard` (full-bleed variant), `Button`.

## States
| State | Behaviour |
|---|---|
| Loading | n/a: static screen. The anonymous sign-in runs in the background and never blocks. |
| Empty | n/a. |
| Populated | The only state. |
| Error | Anonymous sign-in failure is silent here; it is retried later. Nothing is shown. |
| Offline | Works identically. Both paths work offline: a trip can be created locally; joining needs the network and [Join in app](join-in-app.md) explains that. |
| Syncing | n/a. |
| Success | n/a. |
| Disabled | n/a. |
| Partial data | n/a. |

## Interactions
| Gesture | Result |
|---|---|
| Tap **Get started** | Push to Create trip (slide). |
| Tap **I have an invite link** | Push to Join in app. |
| Tap **I already have an account** | Push to [Sign in](sign-in.md). |
| Tap **Privacy notice** | Opens `/privacy` in the in-app browser. |
| Back (Android) | Exits the app. |
| Long press / swipe | None. |

Reduce Motion: headline lines appear together with a 200 ms fade; the perforation stops marching.

## Data
Reads nothing from trip tables. Reads `kv` onboarding flag only to decide whether to show this screen (done by Splash).

## API / Database
- None directly.
- Background: Supabase anonymous sign-in if no session exists ([04 §1](../04-api-schema.md), [D-007](../decisions/D-007-auth.md)); creates a `profiles` row with `is_anonymous = true`.
- Sets `kv.onboarding_seen = true` when the user taps **Get started** or **I have an invite link** (Assumption).
- **Consent:** tapping **Get started** or **I have an invite link** records privacy consent as a `consents` row with the current `/privacy` version (OQ-P21 in [01](../01-overview.md#open-questions), [09 §10](../09-security.md)). It's queued locally if offline.

## Edge cases
- **Invite link tapped while the app is fresh:** skip Welcome entirely and open Join in app with the token.
- **User creates a trip, then comes back:** they never see Welcome again.
- **Very small screen (360 × 640):** the compact layout applies ([13 §9](../13-design-system.md)); the ticket height shrinks (Assumption: 60% of screen height, min 400 px) so all buttons and the consent line stay above the fold.

## Analytics
No PRD §19 event fires here. Assumption (proposed, not in PRD): `welcome_viewed`, `welcome_cta_tapped` (`create` | `invite` | `sign_in`) to measure the first step of install → first expense (design for 60 s, accept 90 s; OQ-P2 in [01](../01-overview.md#open-questions)).

## Accessibility
- Headline is read as one sentence: "One trip. One tab. Zero awkward."
- "ADMIT ALL" and the perforation are decorative (hidden from screen readers).
- All buttons ≥ 44 × 44 tap targets; muted text on `color.bg.base` is about 6.5:1.
- The consent link is a real link with the label "Privacy notice, opens in browser".
- Dynamic type: headline capped at 1.3× so the three lines never wrap into four.

## Open questions / assumptions
- "I have an invite link" opens the in-app join flow ([join-in-app](join-in-app.md)), not the web page.
- PRD §13 mentions an "optional phone OTP, skippable" at open. Per [D-007](../decisions/D-007-auth.md) there is no sign-up step on Welcome; the "Save my account" prompt appears later. Returning users use **I already have an account**.
- **Assumption:** the placement and style of the small link and the consent line (not in the UI reference).
