# D-008 · Invite links
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
- The PRD wants **one shareable trip link** that shows balances before install (F2, §13).
- The master brief wants invite links that are **secure, expiring and single-purpose**.
- Testers sharing an APK need a way to join that works without store attribution.

## Options considered
1. A permanent link per trip: easy, but it can never be revoked.
2. One link per person: the organiser has to share many links, which fits WhatsApp groups badly.
3. **One active trip invite at a time: a long random token (URL) plus a short human code; it expires and can be rotated** (chosen).

## Decision
- `toli.in/t/<token>`: the token is 128-bit random and stored only as a hash. The code looks like `GOA-7K2PXQ`: a cosmetic trip prefix plus 6 random characters (about 887 million combinations), with no ambiguous characters.
- **UPI IDs** are only revealed after the viewer has **claimed** the debtor's spot, whether in the browser (anonymous sign-in) or in the app ([04 §3.3](../04-api-schema.md)).
- **Expiry:** 30 days after the trip's end date (or 60 days after creation if there's no end date). The organiser can **rotate** it at any time, which invalidates the old one.
- **Single purpose:** it can only preview this trip and join or claim within it. It never exposes internal IDs beyond member IDs, and never shows phone numbers, emails or UPI IDs.
- Guessing is rate-limited: 10 wrong codes per IP per hour, plus a global alarm at 500 per hour.

## Amendments (2026-09-25)
- **Typing the code:** the 3-letter prefix is cosmetic. The app accepts the **6 random characters alone** (e.g. `7K2PXQ`), and ignores a typed prefix. This fixes "GOA contains O, which the alphabet bans" (review B-14).
- **Web page:** read-only in the beta ([D-024](D-024-web-page-read-only-beta.md)). `/invite-preview` returns only names + the trip total.

## Why
It meets the PRD's "one link in the WhatsApp group" and the brief's security needs. The code handles APK testers and iOS without deferred deep links.

## Trade-offs
- Anyone holding the link can see the members' names and balances. That's accepted by the PRD and disclosed in the privacy notice.
- Rotation is the fix if the link leaks.

## Impact
[04 §3](../04-api-schema.md), [features/invites-and-joining](../features/invites-and-joining.md), [09](../09-security.md).
