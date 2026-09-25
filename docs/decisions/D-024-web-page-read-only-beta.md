# D-024 · Web invite page is read-only in the beta; limited web membership later
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
A browser claim made the viewer a full member, able to read every trip table, download ID documents and get the invite token (review S-01, critical).

## Decision
- **R1a:** the web page is **read-only**:
  - trip name, dates and total;
  - "Which one are you?";
  - that member's own lines and the amount they owe.
  - No claim, no UPI, no "I paid". The page ends with **Get the Toli app**.
- **R1b:** web payments come back through a **limited web membership** (`trip_members.claimed_via = 'web'`):
  - `is_trip_member()` is **false** for it;
  - it may only call `/invite-member-view`, `/upi-link` and `/web-settlement` for **its own** debt, capped at the suggested amount;
  - web settlements are **pending until the payee confirms**;
  - Turnstile protects the page, web claims are limited per trip per hour, and the organiser is notified and can Release, including in bulk.
- `/invite-preview` returns **only names and the trip total**. Per-member numbers come only from `/invite-member-view`.

## Impact
[04 §3, §5.1b](../04-api-schema.md), [09](../09-security.md), [screens/invite-web](../screens/invite-web.md), [features/invites-and-joining](../features/invites-and-joining.md).
