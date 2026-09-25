# D-017 · Itemised splitting is free; receipt scanning is Pro
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
The sources disagree:
- PRD §9.1 and F3 say **all seven split modes are free, in R1**.
- F4 and §15 say "itemisation is Pro".
- The UI reference tags the Itemised chip **PRO**, and tapping it opens the scanner.

## Decision
- **Itemised split by hand is free** and ships in R1: add line items, assign faces, and tax, service and tip are prorated by subtotal ([07 §5.1](../07-calculation-engine.md)).
- **Receipt scanning** (AI extraction of the items from a photo) is **Pro** and ships in R2.
- **UI:**
  - The **Itemised** chip opens a manual item list with a **Scan bill · PRO** button at the top.
  - The PRO tag moves from the chip to the scan button.
  - On a free trip, tapping Scan opens the Pro sheet. The manual flow always works.

## Why
- "Money features are free, forever" (PRD principle 1).
- The scan has a real cost (AI calls). Splitting by items has none.

## Impact
[screens/split-editor](../screens/split-editor.md), [screens/receipt-scan](../screens/receipt-scan.md), [features/splitting](../features/splitting.md), [features/receipt-scan](../features/receipt-scan.md), [features/pro-pass](../features/pro-pass.md), [03 §5.5](../03-database-schema.md) (now R1).
