You are a senior product designer. Design a high-fidelity mobile app UI (iOS + Android, React Native) for **Toli — a trip-first money manager for groups of friends in India**.

## PRODUCT IN ONE PARAGRAPH
Four friends go to Goa. They create a trip, add everyone, and log expenses as they happen. Aditya pays ₹4,000 for the hotel — split 4 ways. He pays ₹1,200 for dinner — but only he and Rahul ate, so it splits 2 ways. Rahul pays ₹800 for a cab — all 4 were in it. Balances update live. At the end, the app collapses 60 messy expenses into three payments — "Neha pays Aditya ₹1,200" — and hands each person a UPI deep link to actually pay. Around that core it also holds the trip's budget, itinerary, saved places, bookings, tickets, and a timeline that becomes a shareable recap.

## WHO USES IT
- **The Organiser** (26, Bengaluru): books the hotel, fronts the money, currently does the maths in a Google Sheet. Power user. Opens the app 8×/day during a trip.
- **The Participant** (24): didn't choose this app, got a WhatsApp link. Opens it twice: once to see what she owes, once to pay. Every extra tap loses her.
- Real conditions: mid-range Android, cracked screen, 4G that drops in the hills, one hand, standing at a restaurant counter, slightly drunk, at 1am.

## THE NAME
**Toli** (टोली) is a Hindi word meaning *a group, a band, a troop of people who move together*. It names the friend group, not the maths — every competitor is named after arithmetic and the product is deliberately not. Design the wordmark lowercase or sentence case, warm and typographic, never a cute mascot and never a rupee symbol or a pie chart. The app icon should be a confident single form that reads at 40px on a cluttered Android home screen. Note that "kitty" appears inside the app as the name of the common-pool feature — that is a feature label, not the brand, and the two must never be confused in the UI.

## THE ONE METRIC THAT BEATS EVERY OTHER DECISION
**Five seconds from app icon to saved expense.** If a layout is beautiful but adds a tap to expense entry, the layout is wrong. Design for thumb reach on a 6.7" screen — all primary actions in the bottom third.

---

# ART DIRECTION

**The feeling: a well-kept travel ledger, not a banking app and not a fintech dashboard.** Warm paper and ink, with the precision of an accounting sheet. Money is presented with the calm authority of a printed statement; everything around it is soft, human and trip-like. The tension between those two is the whole personality.

**Explicitly avoid:** purple-to-blue gradient blobs; glassmorphism; neon-on-near-black "fintech" styling; floating 3D cards with heavy drop shadows; generic Inter-everything with no hierarchy; stock illustrations of people high-fiving; emoji as a substitute for iconography; pastel gradient mesh backgrounds; card layouts where every element is a rounded white rectangle on grey. If the result could be any SaaS product with the logo swapped, it has failed.

**Instead:** flat warm surfaces with hairline rules doing the structural work. Type carries the hierarchy, not shadows. Generous whitespace around numbers. One saturated accent used sparingly so it always means something. Borders over shadows. Ledger rules, tabular alignment, and the quiet confidence of a document.

## TOKENS

**Color — light (default):**
- `bg` #FBF8F3 (warm paper) · `surface` #FFFFFF · `surface-sunken` #F4EFE7
- `ink` #191714 (near-black, warm) · `ink-muted` #6B655C · `ink-faint` #9A9187
- `rule` #E4DCD0 (hairline borders — 1px, used everywhere)
- `accent` #0F5F4D (deep teal — primary actions, active states, brand)
- `accent-soft` #DCEDE7
- `credit` #0F6B3F (you are owed / positive) · `debit` #B0341F (you owe / negative)
- `warn` #B5741A

**Color — dark:**
- `bg` #14120F · `surface` #1E1B17 · `surface-sunken` #0E0C0A
- `ink` #F5F0E8 · `ink-muted` #A79F93 · `rule` #302B24
- `accent` #4FBFA0 · `credit` #52C08A · `debit` #E8735C

Dark mode is a first-class design, not an inversion. Never convey money direction by color alone — always pair with a sign (+/−) and a word ("you are owed" / "you owe").

**Type:**
- UI/text: a neutral grotesque (Inter, Geist or similar). Weights 400/500/600 only.
- **Money: ALWAYS tabular lining numerals**, slightly tighter tracking, 600 weight. Amounts in a column must align on the decimal. This single rule does more for credibility than anything else.
- Optional display face for the trip name on the trip header and the recap card — a warm serif or a condensed grotesque, one place only.
- Scale: 40/32/24/20/17/15/13/11. Body 15. Money hero 40. Row money 17.
- Indian numbering: **₹1,23,456** (lakh grouping, not ₹123,456). Never abbreviate money in balances; "₹1.2L" is acceptable only in analytics charts.

**Space:** 4pt base. Screen gutter 20. Row vertical padding 14. Section gap 28.
**Radius:** 10 standard, 14 sheets/modals, 999 pills/avatars. Never more than 16 — big radii read as toy.
**Elevation:** almost none. Sheets get a single soft shadow. Everything else uses `rule` borders.
**Icons:** one consistent stroke set, 1.5px, 20/24px, rounded joins. Currency and category icons must be legible at 20px.
**Motion:** 180–220ms, standard ease. Numbers animate by counting up, never by fading. The only cinematic moment in the entire app is the settle-up reveal (see below) — everywhere else motion is invisible.

---

# SCREENS TO DESIGN

Design all of these, light mode, plus dark mode for screens 3, 4 and 8.

### 1. Trips list (home)
Warm paper background. A list of trip cards with the trip name in display face, destination and date range small below, and — the most important element — **the user's net position on that trip** right-aligned in tabular numerals, green "+₹3,400" or red "−₹1,200". Active trips at the top with a subtle live indicator. Settled trips below, visually quieter with a thin "settled" tick. Bottom-right FAB: "New trip". Empty state: a single warm line of copy and one button, no illustration.

### 2. Create trip
A short sheet, not a full screen. **Only the name field is required** and it is already focused with the keyboard up. Below it, optional chips that expand inline: destination, dates, base currency, and a row of trip templates (Beach, Road trip, Trek, Wedding, Offsite). The primary button stays enabled from the first character typed. Show that this takes 8 seconds.

### 3. Trip home — the screen people live in
- **Balance header:** the user's net position as the hero number, 40pt tabular, with the sentence "You are owed" above it in muted ink. Below, one line of context: "₹24,800 total spent · 4 people". This header collapses to a compact bar as the feed scrolls.
- **Expense feed:** a ledger, not cards. Rows separated by hairline rules, grouped under sticky day headers ("Sat, 4 Oct"). Each row: category icon, description + "Aditya paid" in muted ink beneath, then the amount right-aligned tabular, with the user's own share in smaller muted type under it ("your share ₹600"). Rows where the user isn't a participant are visibly de-emphasised.
- **Kitty strip** (if enabled): a slim horizontal bar under the header showing the common pool — "Kitty ₹8,400 left of ₹20,000" with a thin progress rule that turns amber below 20%.
- **Bottom bar:** a large, unmissable "+" primary action, with secondary tabs for Balances, Plan, and More.

### 4. Add expense — THE HERO SCREEN, design this most carefully
Full-screen, opens instantly with a **large custom numeric keypad already up and the amount field focused**. The amount renders huge (40pt+) in tabular numerals as it's typed, with ₹ prefix.

Directly beneath the amount, a single always-visible line updates live as the user types: **"Split 4 ways · ₹1,000 each"**. Tapping that line is the one tap to the split editor.

Below that, collapsed to a single compact row: payer (defaults to "You paid"), date ("Today"), and an optional description field. A category chip strip sits above the keypad. Receipt camera button in the corner.

The save button is a wide bar directly above the keypad, reachable by thumb, enabled the moment an amount exists. **A user must be able to enter an amount and save without touching anything else.** Show this state clearly in the design.

Also design: the **duplicate-detected** variant, where a quiet inline banner appears — "Rahul added ₹1,200 Dinner 4 minutes ago. Same expense?" with "It's different" / "Cancel" actions. Never a blocking modal.

### 5. Split editor
A bottom sheet, tall but not full-screen. Seven modes as a scrollable segmented control: **Equal · Exact · Percent · Shares · Itemised · Adjust · Multiple payers**.

Member rows with avatar, name, an on/off toggle for participation, and a right-aligned editable amount. A running validation line pinned at the bottom: **"₹120 unassigned"** in amber with a one-tap "Split the rest equally" action, turning to a green "Balanced" when it resolves. Ghost members (people who haven't installed the app) appear with a dotted-outline avatar and their initial — identical in every other way.

Design the **Shares** mode specifically, with stepper controls (a couple = 2 shares), and the **Itemised** mode showing scanned receipt line items with small member avatars assignable to each line.

### 6. Balances
Two segments: **"Who owes whom"** (default) and **"Everyone's balance"**.

Balance view: a member list, avatar and name left, net amount right in tabular numerals with sign and color. Tapping any row opens a derivation sheet listing every expense that produced that number — this is the trust mechanic, design it properly, not as a plain list.

### 7. Kitty (common pool)
A dedicated screen for the very Indian pattern of everyone putting cash in a pot. A large remaining-balance number, a horizontal contributed/spent/remaining breakdown, per-member contribution rows with "top up" actions, and a feed of expenses paid from the pot. When low, a prominent but non-alarming card: "Running low — ₹2,500 each tops it back up."

### 8. Settle up — THE PAYOFF SCREEN
This is the emotional peak of the product. Design it as a reveal, not a list.

Open with a single confident line: **"12 payments → 3"**. Then three large payment rows, each with payer avatar → payee avatar, the amount in large tabular numerals, and a wide **"Pay ₹1,200 via UPI"** button that opens the user's UPI app. Payments the user isn't involved in are shown, but visually recessive.

Each row expands to show its derivation ("covers your ₹1,000 room share and ₹200 cab"). A "Mark as paid" secondary action for cash. A "Send summary to WhatsApp" action at the bottom — this is how the group actually communicates, so give it real prominence, not a buried share icon.

Also design: the **post-payment confirmation** — returning from the UPI app, a sheet asking "Did the payment go through?" This must be honest, never implying the app verified the payment.

Also design: the toggle between **Simplified** and **Direct** settlement, with one line explaining the difference.

### 9. Invite — the growth surface
Two pieces:
(a) An **in-app invite sheet** built around one big "Share trip link" button styled for WhatsApp, plus a copyable link and the member list showing who has and hasn't joined.
(b) A **mobile web preview page** the invited person sees before installing anything — the trip name, total spent, and in the largest type on the page, **what they personally owe**. One install button. No signup wall, no app-store interstitial. This page converts strangers into users; treat it as a landing page, not a fallback.

### 10. Itinerary
Day-by-day vertical timeline with a thin time rail. Items show title, time, place, and an estimated cost right-aligned in muted tabular type. When an item is linked to a real expense, show both: "est ₹3,000 → actual ₹3,600" with the delta colored. A pinned summary at the top: "Planned ₹48,000 of ₹60,000 budget."

### 11. Budget
A burn-down, not a pie chart. A line showing spend against days elapsed with a projected finish, plus a plain-language verdict — "At this rate you'll finish 18% over." Below, a category breakdown as horizontal bars with tabular amounts. Separate "booked before the trip" from "spent on the trip" so day one doesn't look catastrophic.

### 12. Trip recap (shareable)
A 4:5 image card generated when a trip settles: trip name in display face, dates, total spent, number of people, biggest expense, a small map of places visited, and a photo collage. Warm, print-poster feel — something a 24-year-old would actually post. A subtle brand mark. Design a variant with per-person amounts hidden, since not everyone wants their spend public.

### 13. States — design these, don't skip them
- **Offline:** a slim persistent strip, "Offline — 3 expenses will sync". Reassuring, never alarming. The app is fully usable offline; the design must communicate that nothing is broken.
- **Empty trip:** one warm line of copy plus a pulsing "+" pointing at the entry action.
- **Loading:** skeleton rows matching the ledger rhythm. Never spinners on money.
- **Error:** inline, in place, with a retry. Never a modal over a balance.

---

# CROSS-CUTTING RULES

- **Free vs Pro:** the money path is never gated. Expenses, all seven split modes, multiple payers, balances, settlement, UPI links and multi-currency show no locks, no upsells, no counters, ever. Only receipt *scanning*, analytics, export and vault storage carry a small, polite Pro affordance. Never design a paywall that interrupts expense entry — that is the exact failure that makes users hate the incumbent.
- **Ghost members** (added by name, no account) appear everywhere a real member does, with a dotted-outline avatar. They must never look broken or second-class.
- **Accessibility:** 4.5:1 minimum contrast in both themes; every money value has a screen-reader label spelling out direction ("you are owed three thousand four hundred rupees"); dynamic type up to 200% without layout collapse; tap targets ≥44pt.
- **Localisation:** design every screen to survive Hindi strings roughly 30% longer than English. No fixed-width labels.
- **Performance honesty:** this runs on a three-year-old ₹15,000 Android. No blur, no heavy transparency, no continuous animation.

# DELIVER
Screen designs at 390×844, light mode for all screens and dark mode for screens 3, 4 and 8. Include a compact style sheet showing color tokens, the type scale with tabular numerals demonstrated, and the core reusable components: ledger row, money display, member avatar (real and ghost), split-mode selector, primary button, and the validation line.

Start with screen 4 (add expense) and screen 8 (settle up). If those two are not excellent, nothing else matters.
