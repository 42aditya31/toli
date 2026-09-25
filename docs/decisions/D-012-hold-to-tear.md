# D-012 · Settle up: hold to tear
| Status | Draft | Date | 2026-09-24 |
|---|---|---|---|

## Problem
The references disagree:
- **Toli App** (the clickable prototype) and **Tear to Split** use a **"Hold to tear & send stubs"** button (900 ms hold).
- The launch film shows a tap on "Pay ₹1,200 via UPI" opening a UPI sheet.

## Decision
- The **clickable prototype is the source of truth for in-app behaviour.** The film is marketing.
- **Settle up screen (any claimed member):** hold to tear, which calls `/stubs-send` and sends each payer their stub (a push, or WhatsApp text for people not on Toli). Limited to once per trip per 10 minutes.
- **Payer's view** (a stub, an invite page or the app): a **Pay via UPI** button that opens their own UPI app. The "UPI sheet" in the film is the external UPI app, not Toli UI.
- **Accessibility alternative (amended 2026-09-25):** when a screen reader, Switch Access or voice control is on, **or** the in-app setting "Tap instead of hold" is enabled, the button becomes **tap → confirm sheet**. Holding gives haptic feedback as it fills.

## Why
Holding prevents accidental sends to the whole group. It's also the brand moment.

## Impact
[screens/settle-up](../screens/settle-up.md), [features/settle-up](../features/settle-up.md).
