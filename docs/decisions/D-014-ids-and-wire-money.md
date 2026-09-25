# D-014 · IDs and money on the wire
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Decision
- **Every ID is UUID v7, generated on the device.** It works offline, sorts by time, and never needs auto-increment.
- **Money in JSON is a string of integer minor units** (`"120000"`), parsed into `bigint`. JSON numbers lose precision above 2⁵³, and floats must never appear.
- **Sequence numbers** (`seq`) are strings in JSON for the same reason.

## Impact
[04 §1](../04-api-schema.md), `packages/schema`.
