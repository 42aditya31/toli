# D-023 · When a trip becomes settled
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
Auto-settling as soon as payments reach 0 can lock a trip mid-trip. A trip with no end date never settles (review §5.3).

## Decision
- A trip becomes **settled** when every derived payment is 0 (after the dust rule, [D-021](D-021-rounding-adjustment.md)) **and** one of these is true:
  - **(a)** at least 24 hours have passed since `end_date` (checked by the daily `lifecycle` job);
  - **(b)** any claimed member taps **Close trip** on Settle up.
- A trip with no end date only settles through Close trip.
- **Request reopen:** a non-organiser can ask, and an organiser gets a push with **Reopen**.
- Voiding a settlement on a settled trip moves it back to `settling` (logged).

## Impact
Replaces the old OQ-P13 proposal. [04 §10.1](../04-api-schema.md) gets a `lifecycle` job. [features/trips](../features/trips.md).
