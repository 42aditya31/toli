# Component screen · Tear overlay ("tear stubs")

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 |
| **Source** | `ui-refrence/Toli App.dc.html` → overlay block `ovOn` (lines 883–926); logic `tear()`, `commit()`, the `ov` object in `renderVals()` (lines 1309–1338). Concept and friend-phone stubs in `ui-refrence/Tear to Split.dc.html` (the App prototype wins on timing) |
| **Related** | [13 §1, §5 TearOverlay / Stub / TicketCard, §6.3 Tear stubs](../13-design-system.md) · [D-012 Hold to tear](../decisions/D-012-hold-to-tear.md) · [D-009 Notifications](../decisions/D-009-notifications.md) · [features/notifications](../features/notifications.md) · [features/expenses](../features/expenses.md) · [features/settle-up](../features/settle-up.md) · [add-expense](add-expense.md) · [settle-up](settle-up.md) · [receipt-scan](receipt-scan.md) · [notifications](notifications.md) |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - Headline sequence: **"TEARING" → "STUBS READY"** (never "delivered").
> - The toast is built from reality: "Rahul and Neha will get a stub · Share with Jay on WhatsApp", or "Saved · sending when you're online".
> - The layout is in **relative units** (percent of screen width). The reference screen is 370 wide inside a 390 frame ([13 §9](../13-design-system.md)).

## Purpose
**Why:** asking a friend for money is awkward (PRD §2.2). Turning "you owe me" into a ticket that tears and hands each person their stub makes it neutral, even fun. It is Toli's signature brand moment.
**What:** a full-screen animation: a lime ticket rises, its perforation tears, the pieces split and fly to each person's avatar, and the avatars turn lime with their amount.
**How:** it plays **after** the data is already saved. It never blocks, can be skipped with a tap, and is replaced by a toast when Reduce Motion is on or the phone is offline.

## User goal
"See that my friends got their share." (Emotional confirmation, not a step.)

## Entry points (who uses this component)
| Caller | Label pill | Title | Amount | Sub | Pieces |
|---|---|---|---|---|---|
| [Add expense](add-expense.md) save | **"New expense"** | expense title, e.g. **"Dinner at Thalassa"** | total, e.g. **"₹4,800"** | **"{Payer} paid · split {k} ways"** (e.g. "You paid · split 4 ways"; prototype uses the payer's name) | each participant with a share > 0 who isn't a payer, with their share |
| [Add expense](add-expense.md) save with an itemised split (R1 by hand; also after [Receipt scan](receipt-scan.md), R2) | **"Itemised bill"** | **"Thalassa · itemised"** | total | **"You paid · 5 items split by who ate what"** | as above |
| [Settle up](settle-up.md) hold, after `POST /stubs-send` answers ([04 §5.1a](../04-api-schema.md)) | **"Settlement"** | **"{n} payments to close the trip"** | Σ of payments | **"Simplified · fewest payments"** / **"Direct · no rerouting"** | each payer, with the amount they pay |

## Exit points
| When | Then |
|---|---|
| Sequence ends (or tap to skip) | Expense callers: navigate to [Trip home](trip-home.md) + toast **"Rahul and Neha will get a stub · Share with Jay on WhatsApp"** (built from who can actually be pushed). Settlement: stay on Settle up + a toast built from the `pushed` flags in the `/stubs-send` response: **"Rahul and Neha will get a stub · Share with Jay on WhatsApp"** (built from who can actually be pushed) when all were pushed, otherwise it names who couldn't be, e.g. **"Sent to Rahul, Neha. Share with Jay on WhatsApp."** ([04 §5.1a](../04-api-schema.md)) |
| No pieces (nobody else owes) | The overlay is not shown; toast **"Saved"** instead |

## UI structure
Full-screen layer above everything (z 20), backdrop `color.scrimStrong` (`rgba(20,22,25,.9)`).

| Part | Position / size | Details |
|---|---|---|
| **Headline** | top 58, centred | mono 11/700, +0.14em, muted: **"TEARING"** → **"STUBS READY"** |
| **Avatar row** | top 80 | One 52 px `Avatar` per piece, centred around x = 185, spacing `min(76, 320 / k)`. Name 12/600 below; label mono 11/700 below that: **"·"** (muted) until the stub lands, then the amount in lime. On landing: avatar turns lime (`color.onAccent` text) and pops to 1.12×. |
| **Main ticket** | left 30, top 234, 310 × 190 | `TicketCard`: lime, radius 24 24 0 0, padding 18 / 20, gap 8. Top row: dark pill (`color.onAccent` bg, lime text, 11/600, radius 999) with the **label**, and the trip name mono 11 at 70%. Title 20/600 (ellipsis). Amount 46/800. Sub 12 at 75%. Bottom: dashed perforation before the tear; a zigzag torn edge (9 × 6 px teeth) after. 24 × 12 half-circle notches at the bottom corners. |
| **Pieces (stubs)** | top 424, height 110, total width 310 split evenly | `Stub`: lime, zigzag top edge once torn, 30 px dark avatar with lime initial, name 12/600, amount mono 13/700. Radius: only the outer bottom corners at first; `4 4 16 16` with `shadow.stub` once split. |

Components: `TearOverlay`, `TicketCard`, `Stub`, `Avatar`.

## Sequence (timing from the App prototype; all × 1/speed, [13 §6.3](../13-design-system.md))
| t (ms) | Phase | What moves |
|---|---|---|
| 0 | **print** | Whole layer rises in (0.5 s, from 160 px below, scale .9). Perforation visible. Headline "TEARING". |
| 550 | **tear** | Main ticket lifts 8 px; each piece drops `14 + 4i` px and tilts 2°; torn zigzag edges appear. |
| 950 | **split** | Pieces spread apart (`(i − mid) × 14` px sideways, 30 px down, `(i − mid) × 7°`), get the stub radius and shadow. |
| 1350 | **fly** | Headline "SENDING STUBS". Each piece flies to its avatar: 780 ms, staggered 130 ms, sideways `ease.move`, up with an overshoot curve, rotating and shrinking to 0.34. |
| 1350 + 780 + 130·i | land | Piece i fades out; avatar i turns lime and shows the amount. When all land: "STUBS READY". |
| + 800 after last | **done** | Layer fades out (0.4 s). |
| + 420 | end | Overlay removed; caller's callback (navigate + toast). |

Total ≈ 2.5–3 s for 3 pieces.

## States
| State | Behaviour |
|---|---|
| Loading | n/a. |
| Empty | No pieces → not shown (toast "Saved"). |
| Populated | 1–k pieces. |
| Error | n/a: data is already committed; a later sync rejection surfaces in [Unresolved changes](unresolved-changes.md), not here. |
| Offline | Assumption: not shown for expenses; toast **"Saved on this phone"** instead (stubs can't be delivered yet). Settle up: never plays offline, because the hold button shows **"Needs internet"** and can't be held; **Mark as paid** still works offline ([04 §5.1a](../04-api-schema.md)). |
| Syncing | n/a. |
| Success | "STUBS READY" + caller's toast. |
| Disabled | While playing, a second hold/save is ignored (prototype checks `ov` before starting). |
| Partial data | n/a. |

## Interactions
| Gesture | Result |
|---|---|
| Tap anywhere | Skips to the end: immediate fade and callback ([13 §6.3](../13-design-system.md) "a tap skips the animation"). |
| Back (Android) | Same as tap-to-skip (Assumption). |
| Other gestures | Ignored. |

**Reduce Motion:** the overlay is replaced by the caller's toast only ([13 §6.3](../13-design-system.md)).

## Data
Receives props from the caller: `label`, `title`, `amount` (formatted), `sub`, `pieces[] { name, initial, amount }`, trip name. Reads nothing from SQLite itself.

## API / Database
Writes nothing. The save or send has already happened before the overlay starts. **"STUBS READY" means the stubs are ready and will be sent by Toli's server after sync**, not received on the friend's phone ([04 §5.1a](../04-api-schema.md)). For expenses the real pushes are queued by the server after sync; for Settle up, `/stubs-send` queues one `stub_received` push per payer who is on Toli ([D-009](../decisions/D-009-notifications.md)). The friend-side stub design (lime, torn top, **"TOLI · GOA WEEKEND · NOW"**, **"Aditya tore you a stub for Dinner at Thalassa"**, **₹1,200**, **"Pay via UPI"**) is documented in [notifications](notifications.md).

## Edge cases
- **Many pieces** (e.g. 12 people): 310 ÷ 12 ≈ 25 px stubs are too thin. Assumption: show at most 6 stubs; the 6th reads **"+6 more"**; the toast lists **"Rahul, Neha and 10 others will get a stub"**.
- **Long names** in avatar labels: truncate to 8 characters with an ellipsis (Assumption).
- **Multiple payers:** pieces go to participants who are not payers (Assumption).
- **Ghost members / people without the app:** still get a stub in the animation. On Settle up the toast names them ("Share with Jay on WhatsApp.") and the `whatsapp_text` from `/stubs-send` is offered for sharing ([04 §5.1a](../04-api-schema.md)).
- **App backgrounded mid-animation:** on return, skip to the end.

## Analytics
None in PRD §19. Assumption (proposed): `tear_skipped` to learn whether people find it slow.

## Accessibility
- Announce once, politely: **"Stubs ready for Rahul, Neha and Jay."** Decorative motion is hidden from screen readers.
- Respect Reduce Motion (toast only).
- The overlay is dismissible by any tap, so it never traps a user.

## Open questions / assumptions
- Timing differs between Tear to Split (450 / 950 ms, 820 ms flight, 150 ms stagger) and the App prototype (550 / 950 / 1350 ms, 780 ms, 130 ms); **the App prototype is used**.
- Tear to Split's **"SENT 3/3"** / **"SETTLED"** stamp on the main ticket isn't in the App overlay; not used in-app.
- Resolved: the headline is "STUBS READY" (never "delivered"); the pushes are sent by the server after sync; anyone who couldn't be pushed is named in the toast ([04 §5.1a](../04-api-schema.md)).
