# Macrozy — Launch Film Prompt

Paste everything below the line into a new chat in the Macrozy project (attach `Macrozy Redesign.dc.html` as context).

---

Make a **premium, minimal product launch film** for **Macrozy**, a calorie and macro tracker built for Indian food. Treat it like an Apple product film: black stage, huge type, the real app UI in a floating 3D phone, one accent colour, and silence used as punctuation. No stock footage, no people, no AI-generated UI, no voiceover. Every frame is either **type** or **the real product**.

## Format
- 1920×1080, 16:9, ~60 seconds, plays once.
- Build on the `animations_v3.jsx` engine with a scene list so I can retime scenes on the timeline and export to video.
- Music-only film (I'll add the track later). Leave one full beat of black before the product reveal.

## Use the real design — do not invent a new look
Pull every screen from `Macrozy Redesign.dc.html`. Recreate them as components; never draw new UI.
- **Font:** Plus Jakarta Sans, weights 500–800. Tabular numerals for every number.
- **Stage:** `#0A0A0B` black. Phone screens use the app's radial background (`#1C222B → #101318 → #0A0B0E`).
- **Cards:** `linear-gradient(180deg,#191D23,#12151A)`, 1px `#FFFFFF12` border, 22px radius.
- **Accent (the only brand colour):** blue `#5A8DEF`, button gradient `#77A3FF → #4C7FE4`, dark text on it `#06080C`.
- **Text:** `#F4F4F6` / `#F7F8FA`. **Muted:** `#9A9AA4`.
- **Macro colours (data only, never decoration):** protein `#EE7285`, carbs `#E8A93F`, fat `#5CBEDE`. Progress green `#63C08A`. Calorie flame `#E58A3C`.
- **Hero data to keep consistent:** user "aditya", goal "Lose fat", 75 kg now → 70 kg goal, pace −0.70 kg/week, daily target 1,917 kcal · 120 g protein. Food example: **Paneer, raw, 100 g = 305 kcal · 19 g P · 2 g C · 25 g F**. Breakfast totals move **1,120 → 1,425 kcal** and **42 g → 61 g protein** after logging it. Weight card: **73.4 kg, −1.6 kg**, goal line at 70 kg.

## Story — problem → turn → solution → proof → close

**1. The problem (0–12s).** Black. Masked line reveals, centred, 84–120px:
- "Every calorie app was built for someone else."
- Then a slow drift of foreign food names in muted grey (bagel, burrito, protein bar, Caesar salad) with one line cutting through: **"Where's the katori?"**
- Beat: "So you guess. And you stop."

**2. The silence (12–13s).** One full second of black. Nothing moves.

**3. The reveal (13–19s).** A thin blue ring draws itself (the app's circular progress language), fills, and resolves into the **Macrozy** wordmark, 200px, weight 800, tight tracking. Under it, muted: "Macros, the way India eats."

**4. The hero (19–26s).** The phone rises from below in 3D (rotateX from ~55° to ~14°, slow Y rotation) showing the **Today** screen with the calorie ring and the three macro bars. Headline above: "Your whole day." / blue: "One number."

**5. Logging (26–38s). The key moment.** Phone slides right; type on the left: "Search it." → "Paneer." Show the Food details screen (use option **3e**, the compact stack):
- Portion chips animate: **g → small katori → katori** (select "katori").
- The stepper counts up **50 → 100 g** with a pop on each digit.
- The macro split bar and 305 kcal resolve live.
- Tap **"Log for Breakfast · +305 kcal"**. The "After logging" bars sweep: **1,120 → 1,425 kcal**, **42 → 61 g protein**.
- Left-side type changes to: "Katori, not guesswork." (blue on "Katori").

**6. The numbers (38–46s).** Full-screen typography, no phone. A giant tabular **"305"** in white, then the macro split bar draws beneath it in the three macro colours, labelled **19 P · 2 C · 25 F**. Line: "Every macro. Every meal. Every day."

**7. Progress (46–53s).** Phone returns with the **Progress / weight** card. The blue weight curve draws left to right, the dashed green goal line at 70 kg fades in, the **73.4 kg** marker drops onto the line, and the green **−1.6 kg** chip pops. Type: "Watch it move." / blue: "Week by week."

**8. Feature run (53–57s).** Six one-word cards, 0.6s each, alternating white and blue, with a small mono subline and a progress dot row: **Indian portions · Macros · Weight · Health · Reminders · Streaks.**

**9. Close (57–60s).** "Eat like you. Track like a pro." Then the Macrozy wordmark, "Free on iOS and Android." in muted, and a small blue URL.

## Motion rules
- Exactly three easings: enter (ease-out cubic), move (ease-in-out cubic), pop (ease-out back). Nothing else.
- Type enters by **rising out of a mask** (0.6–0.7s); exits are opacity-only (0.35s). No typewriter, no blur, no glitch, no letter-spacing animation.
- **Numbers count, they never fade.** Every number change is a count-up or a digit pop.
- Something always moves: slow camera push (2–4%), phone drift, or a line drawing. A static frame reads as a bug.
- Tap moments show a soft white touch dot plus a blue ripple.
- A faint blue floor glow under the phone is the only lighting effect. No gradients as backgrounds, no particles, no confetti.
- Minimum holds: 0.4s per word + 0.6s. Headline type never below 72px; sublines never below 26px.

## Deliverable
- `Macrozy Launch Film.dc.html` plus its `.jsx` scene file, with a scene per story beat and a one-line description for each.
- Tweaks: motion-editor toggle, accent intensity (subtle / standard), and a 2.39:1 letterbox toggle.
- Before finishing, scrub every scene boundary (±0.15s) and fix any pop, overlap, or text collision.
