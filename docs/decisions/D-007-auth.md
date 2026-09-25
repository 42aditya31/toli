# D-007 · Authentication
| Status | Under Review | Date | 2026-09-24 |
|---|---|---|---|

## Problem
The PRD requires no sign-up wall (§13): create a trip before having an account. It also requires phone OTP eventually, and $0 cost at launch. SMS and WhatsApp OTPs cost money per message.

## Options considered
1. **Supabase anonymous sign-in on first open, then link Google, Sign in with Apple, or email OTP when needed; phone OTP later via the Send SMS hook** (chosen).
2. Phone OTP from day one: costs money per login, and the DLT registration is needed for SMS.
3. Local-only until the first invite, with no account at all: sync can't work, and the trip can't be shared.

## Decision
- On first open, the app silently creates an **anonymous Supabase user**.
- An account prompt ("Save my account") appears when the user invites someone, joins from a second device, or after their first trip.
- Linking keeps the same user ID, so no data moves.
- **Phone OTP** comes later, through WhatsApp authentication messages (about ₹0.12 each) or MSG91.

## Why
- $0 at launch.
- The fastest time to the first expense.
- Anonymous users still get an ID, so sync, RLS and invites all work.

## Trade-offs
- An anonymous user who reinstalls without linking loses their identity. Mitigation: the organiser can **release** the member so the person re-claims it; history is kept ([features/auth](../features/auth-and-identity.md)).
- Apple requires Sign in with Apple if Google login is offered.

## Impact
[features/auth-and-identity](../features/auth-and-identity.md), [09](../09-security.md).
