# 13 · Design System

| | |
|---|---|
| **Status** | Draft v2: review fixes applied (exact tokens, icons, status colours, compact layout) |
| **Last updated** | 2026-09-25 |
| **Source** | `ui-refrence/` (Toli App, Tear to Split, Welcome Variants, Logo Explorations, toli-film ToliKit, palette image) · [review §9](14-pre-development-review.md#9-ui--design-problems) |
| **Package** | `packages/design-system` |

**Rule:** no screen may contain a raw colour, size, radius, shadow, easing or duration. Everything comes from the tokens below, and **every token has exactly one value**. A lint rule fails any raw hex, px or `cubic-bezier` in `apps/`. Change a token here, and it changes everywhere. If a screen needs a value that isn't here, **add a token first**.

---

## 1. Visual idea: "the trip is a ticket"

Toli's look comes from **tickets and stubs**:
- Lime cards with a dashed **perforation** line.
- Semicircle **notches** on the sides.
- A **torn zigzag edge** when a share is sent.
- A rotated rubber **stamp** (SETTLED / PAID / SQUARE).

Every expense "prints a ticket", and saving it **tears stubs** for each person. It's a dark, calm UI with one loud colour: lime.

---

## 2. Colour tokens

From the palette image (`uploads/pasted-…837`) and the prototype.

| Token | Value | Use |
|---|---|---|
| `color.bg.base` | `#2B2F36` | screen background |
| `color.bg.card` | `#212429` | cards, lists, keypad keys, inputs on base |
| `color.bg.raised` | `#393E47` | buttons, chips, avatars, banners |
| `color.bg.shimmer` | `#474D57` | skeleton highlight |
| `color.bg.bezel` | `#0E0F11` | camera frame, deep surfaces |
| `color.bg.overlayNotch` | `#16181B` | notches cut into tickets on the tear overlay |
| `color.accent` | `#D4F26A` | lime: hero tickets, primary CTA, active chip, **positive** balance |
| `color.onAccent` | `#1F2A00` | text and icons on lime |
| `color.onAccentPressed` | `#000000` | pressed state of dark buttons on lime |
| `color.text` | `#F2F4F6` | primary text; secondary button background |
| `color.textMuted` | `#A3A9B3` | labels, hints, secondary text |
| `color.divider` | alias of `color.bg.base` | 1 px row separators inside cards |
| `color.warning` | `#F2B54A` | **needs attention**: over budget, kitty low, over estimate. Always paired with an icon and a word |
| `color.onWarning` | `#2A1C00` | text on warning |
| `color.danger` | `#FF7A6B` | destructive actions (Delete, Void, Remove), errors. 5.6:1 on `bg.card` |
| `color.focus` | `#D4F26A` at 2 px outline, 2 px offset | keyboard / switch focus ring |
| `color.scrim` | `rgba(14,15,17,.70)` | bottom-sheet backdrop |
| `color.scrimStrong` | `rgba(20,22,25,.90)` | tear overlay backdrop |
| `color.perforation` | `rgba(31,42,0,.35)` | dashed line on lime (**the only perforation opacity**) |
| `color.onAccentSoft` | `rgba(31,42,0,.12)` | secondary buttons on lime |
| `opacity.disabled` | `0.45` | disabled controls, excluded split rows, claimed-but-not-selectable rows |

- **Lime means "good or active", never "bad"** (review U-10). Over budget, kitty low and over estimate use **`color.warning`**. A negative Net uses `color.text`.
- **Themes:** v1 is **dark only**. Tokens are named by role, so a light theme (logo option 1p) can be added later.
- **Contrast:**

  | Pair | Ratio |
  |---|---|
  | `text` on `bg.base` | ≈ 11:1 |
  | `textMuted` on `bg.card` | ≈ 7:1 |
  | `onAccent` on lime | ≈ 13:1 |
  | `onWarning` on warning | ≈ 10:1 |

  All pass 4.5:1.
- **Money and colour:** positive = lime + "+" + "gets back". Negative = text colour + "−" + "owes". Colour is never the only signal.

---

## 3. Typography

One size per token. Screens must pick a token, never a raw size.

| Token | Font | Size / weight / tracking / line | Use |
|---|---|---|---|
| `type.hero` | Bricolage Grotesque | 72 / 800 / −0.04em / 0.9 | "5 → 3" payments count |
| `type.amountXL` | Bricolage | 64 / 800 / −0.04em / 1.0 | keypad amount |
| `type.currencyXL` | Bricolage | 34 / 600 / 0 / 1.0, `textMuted` | the "₹" before `amountXL` |
| `type.display` | Bricolage | 52 / 800 / −0.04em / 0.95 | welcome lines, hero balance ("₹3,400") |
| `type.amountL` | Bricolage | 48 / 800 / −0.03em / 1.0 | balance trace, budget, kitty hero |
| `type.amountM` | Bricolage | 40 / 800 / −0.03em / 1.0 | settled card "Everyone's square.", web page amount |
| `type.titleL` | Bricolage | 36 / 800 / −0.03em / 1.0 | web invite trip name |
| `type.title` | Bricolage | 28 / 800 / −0.02em / 1.1 | tab screen titles, trip ticket name |
| `type.amountS` | Bricolage | 22 / 800 / −0.02em / 1.1 | settle row amount, kitty ring centre |
| `type.header` | Bricolage | 20 / 600 / 0 / 1.2 | pushed-screen headers, section heads on sheets |
| `type.subhead` | Bricolage | 18 / 600 / 0 / 1.3 | "Which one are you?", sheet titles |
| `type.bodyStrong` | Bricolage | 15 / 600 / 0 / 1.35 | list row titles |
| `type.body` | Bricolage | 14 / 400 / 0 / 1.45 | body text, inputs |
| `type.caption` | Bricolage | 13 / 400 / 0 / 1.4 | helper text, subtitles |
| `type.small` | Bricolage | 12 / 400 / 0 / 1.4 | row subtitles, footnotes |
| `type.micro` | Bricolage | 11 / 400 / 0 / 1.3 | tiny meta ("yours ₹300") |
| `type.monoL` | JetBrains Mono | 16 / 700 / 0 | net amounts in lists, codes |
| `type.mono` | JetBrains Mono | 14 / 700 / 0 | **every money value in rows** |
| `type.monoS` | JetBrains Mono | 13 / 500 / 0 | per-person line under the keypad ("₹300 each · 4 people") |
| `type.label` | JetBrains Mono | 11 / 700 / +0.12em, uppercase | "LIVE", "ACTIVE · DAY 2 OF 4", "PRO" |
| `type.labelS` | JetBrains Mono | 10 / 700 / +0.10em, uppercase | chip tags ("PAID BY", "SPLIT"), map label |

- **Numbers:** always `tabular-nums`.
- **Dynamic type:** scales with the OS setting, capped at 1.3× for `amountXL`, `display` and `hero` so they stay on one line.
- **Hindi** (R1b): Bricolage has no Devanagari, so the fallback is **Noto Sans Devanagari** at the same weights.

---

## 4. Spacing, radius, size

**Spacing scale (px):** `space.2=2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40`. Use these names:

| Token | px | Use |
|---|---|---|
| `space.gutter` | 18 | screen side padding |
| `space.cardPad` | 16 | card inner padding (list cards) |
| `space.heroPad` | 20 | hero ticket inner padding |
| `space.stack` | 12 | gap between cards |
| `space.stackTight` | 8 | gap between chips and buttons in a row |

| Radius token | px | Use |
|---|---|---|
| `radius.badge` | 8 | checkboxes, small badges, cost chips |
| `radius.chip` | 12 | small buttons, list chips, category tiles, icon tiles |
| `radius.control` | 14 | icon buttons (back), secondary buttons, inputs |
| `radius.key` | 16 | keypad keys, toasts, banners |
| `radius.cta` | 18 | primary CTA |
| `radius.cardS` | 20 | small cards (kitty/budget tiles), timeline cards |
| `radius.row` | 22 | settle rows, vault tickets |
| `radius.card` | 24 | hero ticket, list cards, tab bar |
| `radius.sheet` | 28 (top corners only) | bottom sheets |
| `radius.stub` | `4 4 16 16` | torn stubs |
| `radius.pill` | 999 | chips, pills, avatars |

| Size token | px |
|---|---|
| `size.iconButton` | 44 × 44 |
| `size.cta` | 56 high |
| `size.buttonM` | 44 high |
| `size.buttonS` | 36 high |
| `size.row` | 52 high (list rows) |
| `size.rowTall` | 58 high (rows with a subtitle) |
| `size.avatar` | 34 (lists), `size.avatarL` 40 (settle), `size.avatarS` 28 (chips), `size.avatarXL` 52 (overlay) |
| `size.key` | fills a 3-column grid, gap 8; **minimum 48 high** |
| `size.fab` | 60 × 60, radius 22, raised 16 above the tab bar |
| `size.tabBar` | 64 high, radius 24, 14 from the edges |
| `size.stampBorder` | 3 |

**Shadows (elevation)**

| Token | Value | Use |
|---|---|---|
| `shadow.fab` | `0 12 24 rgba(0,0,0,.35)` | FAB |
| `shadow.toast` | `0 16 32 rgba(0,0,0,.40)` | toast |
| `shadow.stub` | `0 18 30 rgba(0,0,0,.40)` | flying stubs |

Everything else is flat.

---

## 5. Icons

The prototype uses text glyphs (‹ ✂ ↻ ✕ ⋯ ✈). The app uses **one open-source icon set: [Phosphor Icons](https://phosphoricons.com)** (MIT), in the "bold" weight, drawn through a single `Icon` component.

| Token | Size | Use |
|---|---|---|
| `icon.s` | 16 | inline with captions |
| `icon.m` | 20 | buttons, rows, chips |
| `icon.l` | 24 | headers, tab bar, empty states |

| Meaning | Icon |
|---|---|
| back | `CaretLeft` |
| close | `X` |
| more | `DotsThree` |
| tear / send stubs | `Scissors` |
| repeat last | `ArrowCounterClockwise` |
| members | `UsersThree` |
| settings | `GearSix` |
| scan | `Scan` |
| attach photo | `Camera` |
| warning | `WarningCircle` |
| offline | `CloudSlash` |
| synced | `CloudCheck` |
| delete | `Trash` |
| flight | `AirplaneTilt` |
| UPI / pay | `CurrencyInr` |

The **notification small icon** (Android) is a white, single-colour version of the ticket mark, 24 dp.

---

## 6. Core components (`packages/design-system`)

| Component | Description |
|---|---|
| `Screen` | base background, safe areas, `space.gutter` |
| `Header` | back `Icon` button (`size.iconButton`, raised) + title/subtitle + optional right actions (e.g. ⋯ → Trip settings) |
| `TicketCard` | **the signature card.** Lime, `radius.card`, optional perforation, side notches (20 px circles in the base colour), optional `Stamp`. Variants: `hero`, `trip`, `payment`, `recap` |
| `Stub` | torn piece: zigzag top edge (9 × 6 teeth), `radius.stub`, avatar + name + amount |
| `StubBanner` | the **in-app notification** in the exact Tear-to-Split design: lime stub, zigzag top, `type.labelS` header "TOLI · GOA WEEKEND · NOW", text, `amountS`, optional **Pay via UPI** button. Drops in with `ease.pop` |
| `Stamp` | rotated −12°, `size.stampBorder`, `type.monoL`, uppercase |
| `Card` | `bg.card`, `radius.card`, rows separated by 1 px `color.divider` |
| `Row` | avatar/icon tile · title/subtitle · right-aligned `type.mono` amount + caption |
| `Avatar` | initials on `bg.raised`; lime for "you" or active |
| `Button` | `primary` (lime), `secondary` (text colour on dark), `tonal` (raised), `ghost`, `onAccent`, **`danger`** (`color.danger` text on `bg.card`, for Delete/Void/Remove) |
| `HoldButton` | fills lime left to right over `dur.hold`, with haptic ticks at 25/50/75/100%. Releasing early cancels. **Accessible mode** (screen reader, Switch Access, voice control, or the "Tap instead of hold" setting): a tap opens a confirm `Sheet` |
| `Chip` / `Segmented` | category chips, split modes (mono tag: ₹ % ×; **no PRO tag on Itemised**, [D-017](decisions/D-017-itemised-free-scan-pro.md)), Simplified/Direct toggle |
| `Switch` | 46 × 28 track, 22 thumb; on = lime, off = raised |
| `Keypad` | 1–9, 00 (or "." for decimal currencies), 0, ⌫; `bg.card` keys → `bg.raised` + scale .96 on press; `type.title` digits |
| `AmountDisplay` | `currencyXL` + `amountXL` + blinking lime caret |
| `DateCurrencyChip` | "Today · ₹ ▾" on Add expense; opens a sheet with date/time, currency, "Booked before trip" |
| `PayerSheet` | payer picker: recent payers first, search when there are more than 8 members, **+ Add payer** for multiple payers |
| `ProgressBar` / `Ring` | 6 px bars; kitty ring 140, stroke 14, round cap. Warning state uses `color.warning` |
| `BurnDownChart` | budget line chart (R2) |
| `TripMap` | MapLibre wrapper with lime teardrop pins (R2) |
| `Banner` | offline / low kitty / info on `bg.raised`, `radius.key`; `warning` variant |
| `Toast` | `text` background, `bg.card` text, bottom 112, `dur.toast`, optional **Undo** |
| `Sheet` | bottom sheet, `radius.sheet`, scrim `color.scrim`, traps focus |
| `Skeleton` | shimmer `bg.raised → bg.shimmer → bg.raised`, 1.3 s linear |
| `TabBar` | tab list is config. **R1a/R1b:** Trip · (+) · Members. **R2:** Trip · Plan · (+) · Members. **R3:** Trip · Plan · (+) · Vault · Feed (Members moves to the Trip home header). Active = lime text + 5 px dot |
| `SyncPill` | spinner + "Syncing Goa Weekend · 3 changes" |
| `TearOverlay` | the tear-stubs sequence (§7.3), laid out in **relative units** (percent of screen width), never fixed pixels |
| `Wordmark` | "toli" drawn twice and clipped on a zigzag (§8) |

---

## 7. Motion

### 7.1 Easings (the only ones allowed)
| Token | Curve | Use |
|---|---|---|
| `ease.enter` | `(.33,1,.68,1)` easeOutCubic | things appearing |
| `ease.move` | `(.65,0,.35,1)` easeInOutCubic | moving between places, progress bars |
| `ease.pop` | `(.34,1.56,.64,1)` easeOutBack | stamps, stubs landing, banners dropping in |
| `ease.screen` | `(.2,.9,.3,1)` | screen push/pop, ticket transition |

(The prototype's `(.2,.9,.3,1.3)`, `(.2,.9,.3,1.2)` and `(.4,0,.2,1)` map to `ease.pop`, `ease.pop` and `ease.move`.)

### 7.2 Durations
| Token | ms | Use |
|---|---|---|
| `dur.tap` | 180 | key press, chip select |
| `dur.fast` | 280 | fades, toasts in, tab switch |
| `dur.base` | 380 | screen push/pop (slide 56) |
| `dur.count` | 400 | numbers counting up |
| `dur.ticket` | 500 | ticket transition, stamp |
| `dur.hold` | 900 | HoldButton fill |
| `dur.toast` | 2800 | toast visible (5000 when it has **Undo**) |

### 7.3 Signature sequences
- **Splash:** icon pops (600), stub tears off (700 at 1000), wordmark rises (at 1300), 3 px lime loader "LOADING YOUR TRIPS".
  - **First launch only:** it plays in full.
  - **Later launches:** the splash leaves as soon as local data is ready, with **no minimum**, protecting the ≤ 1.5 s cold start (review U-13).
- **Tear stubs** (after saving an expense or settling up):
  1. The ticket rises (500).
  2. The perforation tears (550).
  3. The pieces split (950).
  4. The stubs fly to the avatars (780, staggered 130).
  5. The avatars turn lime and show amounts.
  6. The headline goes **"TEARING" → "STUBS READY"**.
  7. The toast is built from reality: "Rahul and Neha will get a stub · Share with Jay on WhatsApp", or "Saved · sending when you're online" when offline (review U-2).
  - It never blocks, and a tap skips it.
- **Stamp:** scale 2.4 → 0.92 → 1, rotate −30° → −12°, `dur.ticket`, `ease.pop`.
- **Numbers count up; they never fade.** No blur, no confetti, no typewriter effect.
- **Reduce Motion:** every sequence becomes a 200 ms crossfade. The tear overlay is replaced by the toast.

### 7.4 Page transitions
**Slide** (default) · **Ticket** · **Fade**. Tabs crossfade.

---

## 8. Brand

- **Wordmark "Torn"** (logo option 3a): "toli" in Bricolage 800, −0.06em, drawn twice and clipped on a zigzag at 55%/62% height. The top half is `text`; the bottom half is lime, offset (0.067·size, 0.085·size) and rotated 3°. On lime, both halves are `onAccent`, with the lower half at 50%.
- **App icon:** option **1b**: the `#2B2F36` rounded square with a lime ticket, notches and a dashed tear line. Accepted by default (OQ-P4); a final designer pass is due before the store listing.
- **Name line:** टोली, "a group that moves together".
- **Tagline:** "**Trip money, sorted.**" (OQ-P3, accepted by default).
- **Voice:** short, warm, a little dry.
  - Say plainly that **Toli never holds money or sees payments**.
  - Say "owes" and "gets back", never "debt".
  - **Never claim something happened before it did** ("sent", "delivered", "notified" only after the server confirms).

---

## 9. Layout and responsiveness

- **Reference frame:** the UI reference screen is **370 × 780 inside a 390 × 800 device frame**. Design at 390 wide.
- **Supported from 360 px wide.** Below **380 px** the **compact layout** applies (review U-12):
  - `type.display` → 44, `type.amountXL` → 54;
  - the keypad keeps `size.key` ≥ 48 high by shrinking the gaps above it;
  - template tiles wrap to 2 columns;
  - `space.gutter` → 16.
- Scrollable content always leaves **110 px** at the bottom for the floating tab bar.
- Long names are truncated with an ellipsis, never wrapped, in headers and rows. Amounts are never truncated.
- Tablets and landscape are out of scope for v1; the app is locked to portrait.
- The invite web page uses the same tokens as CSS variables, mobile-first, max width 480 px.

---

## 10. Accessibility checklist

- Every money value has a screen-reader label ("Rahul owes one thousand two hundred rupees").
- Tap targets ≥ 44 × 44 (keypad keys ≥ 48 high).
- **HoldButton accessible mode** (§6): tap → confirm, for screen readers, Switch Access, voice control, or the "Tap instead of hold" setting.
- Focus ring `color.focus`. Focus order follows reading order. Sheets trap focus.
- Contrast ≥ 4.5:1 (§2). Money is never shown by colour alone, and warnings always have an icon and a word.
