# D-009 · Notifications
| Status | Approved (default), amended 2026-09-25 | Date | 2026-09-24 |

> **Amendment (2026-09-25, [D-018](D-018-r1a-r1b-scope.md)):** in **R1a**, notifications outside the app are **plain system notifications** (title, text, Toli icon and accent colour; tap opens the right screen), and the exact stub design is shown **inside the app** as the `StubBanner`. The custom Android styles and action buttons described below arrive in **R1b**. The iOS Content Extension comes later.
|---|---|---|---|

## Problem
The UI reference (Tear to Split, the film) shows notifications as **lime ticket stubs with a torn top edge**: "TOLI · GOA WEEKEND · NOW", "Aditya tore you a stub for **Dinner at Thalassa**", **₹1,200**, and a **Pay via UPI** button. The user wants this custom design, for free.

## Options considered
1. Expo Push alone: plain system notifications, with no custom design.
2. **FCM + react-native-notify-kit** (the maintained fork of Notifee, which was archived in April 2026), chosen.
3. A paid service (OneSignal and similar): not needed.

## Decision
- **Delivery:**
  - FCM HTTP v1 from the Edge Function (APNs on iOS).
  - Android gets data-only high-priority messages.
  - iOS gets `mutable-content` alerts, plus a Notification Service Extension for images.
- **Display:** notify-kit on the phone. Channels: Payments, Expenses, Reminders, Trip updates.
- **Design, in three levels. The platforms limit what's possible, and we're honest about it:**

| Where | What we can show |
|---|---|
| **App open (in-app banner)** | **The exact ticket-stub design** from the reference: lime, torn zigzag top, mono header, amount, Pay via UPI. It's our own React Native component. |
| **Android, app closed** | A system notification styled as close as Android allows: lime accent colour, Toli small icon, the actor's avatar as the large icon, amount in the title, "Aditya tore you a stub for Dinner at Thalassa" as the text, and **Pay via UPI** / **Mark as paid** / **View trip** action buttons. The zigzag shape and full lime background **aren't possible**: Android draws the notification frame, and custom layouts are heavily limited from Android 12. |
| **iOS, app closed** | A system banner with the avatar image (added by the Service Extension) and action buttons. **Later:** a Notification Content Extension (native Swift) can show the full stub design when the notification is long-pressed or expanded. |

## Delivery safety net (Indian Android phones)
- Many popular Android brands (Xiaomi, Oppo, Vivo, Realme, OnePlus) kill background apps, so **data-only** messages can be silently dropped when Toli is closed.
- For those makers, and for any device that misses 2 delivery receipts, the server sends **system notification payloads** instead (`devices.push_mode = notification`).
- These always arrive, but they show the standard Android look: title, text and the Toli icon and accent colour. They have no custom actions.
- Tapping still opens the right screen.
- **Delivery beats design.**

## Why
It's the most faithful design that's free and within platform rules. Every notification is something the user needs.

## Trade-offs
- The lock-screen look can't match the mockup 100%.
- notify-kit has a small maintainer team, so it sits behind one `notify.ts` wrapper and can be swapped for `expo-notifications`.

## Impact
[features/notifications](../features/notifications.md), [screens/notifications](../screens/notifications.md), [04 §11](../04-api-schema.md).
