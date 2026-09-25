# D-022 · Kitty: two balance views and an explicit hand-over
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Problem
- Folding the kitty into the holder's balance ([D-010](D-010-kitty-folding.md)) is right at settle-up, but during the trip it shows the holder "owing ₹10,000" (review B-07).
- Changing the holder through a plain `trip.update` moves money outside the money rules (review B-05).

## Decision
- The engine returns **two views**:
  - **Trip view** (Trip home, trace, kitty screen): balances with a separate line **"Kitty cash with Rahul: ₹3,000"**. Members + that line sum to 0.
  - **Settle view** (Settle up): the folded balances from D-010.
- Holder changes use a new money op, **`kitty.handover { from_member_id, to_member_id, remaining_minor }`**. It's append-only and shown in the trace ("Kitty cash handed to Neha · ₹3,000"). It's rejected on settled trips. It can be done by an organiser or the current holder.
- `trips.kitty_holder_member_id` becomes a **cached value** derived from the latest hand-over.

## Impact
[07 §6–7](../07-calculation-engine.md), [03 §5.7a](../03-database-schema.md) (new `kitty_handovers` table), [06 §4](../06-syncing.md).
