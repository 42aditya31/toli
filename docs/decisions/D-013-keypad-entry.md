# D-013 · Keypad amount entry
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
The reference keypad has `1–9, 00, 0, ⌫` and **no decimal key**. Indian trip spends are almost always whole rupees. Other currencies (USD, EUR, THB) need cents.

## Decision
- For **INR** (and other currencies where whole units are normal, such as IDR, JPY and VND), the keypad enters **whole major units**, with the `00` key as in the reference. Paise can be set on the expense detail screen if ever needed.
- For **decimal currencies**, the `00` key becomes `.`, allowing up to the currency's exponent.
- The amount is capped at 9,99,99,999 major units (the reference caps at 6 digits; we allow 8).

## Why
Matches the design and the 5-second rule, and stays correct for other currencies.

## Trade-offs
Paise can't be typed on the fast INR path. That's rare in practice.

## Impact
[screens/add-expense](../screens/add-expense.md), [07 §4](../07-calculation-engine.md).
