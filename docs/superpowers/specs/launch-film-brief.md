# Toli — Launch Film Production Brief

| | |
|---|---|
| **Deliverables** | 78s hero film · 30s cutdown · 15s vertical social |
| **Format** | 2.39:1 hero (letterboxed 16:9 master) · 9:16 vertical versions |
| **Audio** | **No voiceover, no dialogue. Music only.** All narration is on-screen typography. |
| **Audience** | Motion designer / editor working with AI video generation |
| **Date** | 23 September 2026 |

---

## 0. READ THIS FIRST — THE ONE RULE THAT DECIDES WHETHER THIS WORKS

**Never let an AI video model render your UI.** Every model — Veo, Sora, Kling, Runway, Higgsfield — will hallucinate the interface: garbled text, invented numbers, wrong rupee symbols, melting buttons. A demo film with fake UI reads as fake in under a second, and it is the single most common reason AI-made product films look cheap.

**The workflow is hybrid. Three layers:**

1. **Live-action layer — AI generated.** People, places, cars, beaches, airports, hands, light. Everything that isn't a screen.
2. **UI layer — rendered separately, never generated.** Screen-record the real prototype (or animate the Claude-made designs in After Effects / Rive / Figma prototype capture) at 3× device resolution.
3. **Composite.** Generate phone shots with the screen **blank, dark, or a flat green rectangle**, then corner-pin / screen-track the real UI in. In every phone prompt below, the screen is explicitly specified as blank for this reason.

**Character consistency:** AI video cannot hold four faces across twenty shots. Before generating any video, produce **four locked character reference stills** (Midjourney / Flux / Nano Banana) — Aditya, Rahul, Neha, Jay — and drive every shot image-to-video from those references. Text-to-video for the people shots will give you four different casts.

**Because there is no voiceover:** the typography is not decoration, it is the script. Section 4 specifies it as rigorously as the camera work. Get the type wrong and the film has no narrator at all.

---

## 1. THE IDEA

The film is not about splitting expenses. Splitting expenses is boring and every competitor's film is about it.

**The film is about the thing in the PRD that actually hurts:** *people will eat a ₹1,200 loss to avoid the awkwardness of chasing a friend.*

So the story is: **the trip was perfect, and the money is the only thing that can spoil it.** The product's job is to make the money invisible so the friendship survives intact.

**Opening image:** someone types "so guys, hisaab?" into a WhatsApp group — and deletes it.
**Closing card:** "Nobody has to ask."

That plant-and-payoff is the spine. Everything else serves it.

**Tone:** warm, confident, unhurried. Not zany, not startup-hype, no whip-pans, no stock-music build with a fake drop. The reference points are Linear's launch films and Apple's quieter product work — long enough holds that the viewer trusts you, cuts that land on the beat, and silence used as punctuation.

**The silent format is a feature, not a constraint.** Over half of social views are watched muted, and voiced films die there. This one is built to be fully legible with the sound off — which means the version people actually see is the version you designed.

---

## 2. THE SCRIPT — 78-SECOND HERO FILM

**No voiceover. No dialogue.** Every line below is on-screen type, specified as either a **`CARD`** (full-frame type on warm paper, its own shot, interrupts the picture) or an **`OVERLAY`** (type over footage, bottom-left). Treatments and timing rules are in §4.

**Total word count across the entire film: 48 words.** Resist adding more. On-screen text is read, not heard, and every extra word costs a hold.

---

### ACT I — THE ACHE (0:00–0:14)

| Time | Shot | Type |
|---|---|---|
| 0:00 | **Black.** Two seconds of it. Hold. | — |
| 0:02 | **INT. CAR, NIGHT.** Back seat of an SUV on a wet highway. Three friends asleep, heads against windows. Sodium streetlights streak past. One person awake, face lit only by a phone. Handheld, 35mm, available light. | — |
| 0:07 | **CLOSE — PHONE (composite).** WhatsApp group "GOA FINAL 🌴". The thumb types: *"so guys, hisaab?"* A pause. Then deletes it, character by character. Screen goes dark. | *(the typed message is diegetic UI, not a caption — it must read as a real phone)* |
| 0:11 | Back to his face in the dark. He looks out the window. Hold. | **`CARD`** — 2.8s<br>**Nobody wants to be<br>the one who asks.** |

---

### ACT II — THE HARD WAY (0:14–0:29)

Montage. Cuts land on beat, roughly 1.3s each. Desaturated, slightly cold — the only unwarm section of the film.

| Time | Shot | Type |
|---|---|---|
| 0:14 | Crumpled receipts spilling across a rumpled hotel bed. Overhead, static. | — |
| 0:16 | Laptop screen, a spreadsheet — a column of numbers and one cell reading `#REF!`. Screen glow on a tired face. | **`OVERLAY`** — 1.8s<br>A sheet nobody updates. |
| 0:19 | Generic app modal: *"Daily limit reached. Upgrade to add more expenses."* Thumb taps it away, irritated. **Do not name or show a competitor.** | — |
| 0:21 | A hand doing sums on a napkin with a leaking pen. Crosses it out. Starts again. | — |
| 0:23 | Four phones face-up on a restaurant table, four different screens, nobody agreeing. | — |
| 0:25 | A bank app screenshot being sent. Then a "typing…" indicator that starts, and stops. | **`CARD`** — 2.0s<br>**Or you eat the ₹1,200.** |
| 0:27 | | **`CARD`** — 1.6s<br>**And say nothing.** |
| 0:28.5 | **Cut to black. One full beat of silence.** | — |

> The two cards at 0:25 and 0:27 are a deliberate hard cut between them, no transition. ₹1,200 is set in tabular lining numerals — it should look like it came out of the app.

---

### ACT III — THE TURN (0:29–0:39)

| Time | Shot | Type |
|---|---|---|
| 0:29 | **Hard cut to warm white.** Overexposed morning light through a beach shack window. Macro, shallow. A thumb enters frame and taps **+**. | — |
| 0:31 | **UI HERO (full-screen, no phone bezel).** The keypad. `1` `2` `0` `0` — numerals land large and tabular, one per musical beat. Beneath, the live line resolves: **"Split 4 ways · ₹300 each"** | *(diegetic UI — this is the product speaking for itself, no caption over it)* |
| 0:35 | Thumb hits Save. The row drops into the ledger. | — |
| 0:37 | Pull back: he's already put the phone down and rejoined the table. Nobody noticed he did anything. | **`CARD`** — 1.8s<br>**Or you just add it.** |

**This is the most important ten seconds in the film.** It must feel effortless and fast. If the viewer thinks "that looks like work," the film has failed regardless of everything else. Let the UI carry it — do not put type over the keypad beat.

---

### ACT IV — THE BUILD (0:39–0:59)

Alternate **UI / life / UI / life**. Each UI beat answers a complaint planted in Act II. Life shots are golden-hour Goa, warm and slightly overexposed.

All five captions here are `OVERLAY`, same position, same size, hard cut in and out. **They are grammatically parallel on purpose** — that repetition is the rhythm section of the film, and it substitutes for the cadence a voice would have given.

| Time | Shot | Type |
|---|---|---|
| 0:39 | UI: split editor. Two of four avatars tap off. The per-person number recalculates live. | **`OVERLAY`** — 1.5s<br>Only two of you ate. |
| 0:41 | LIFE: two people eating prawns at a plastic-table shack, the other two absent. | — |
| 0:43 | UI: offline strip — *"Offline · 3 expenses will sync"* — an expense saves anyway. | **`OVERLAY`** — 1.2s<br>No signal. |
| 0:45 | LIFE: a scooter on a red-dirt road, no towers, nothing but palms. | — |
| 0:47 | UI: a member row reading *"joined day 2"*; the earlier night's split shows 3 people, not 4. | **`OVERLAY`** — 1.6s<br>Someone joined on day two. |
| 0:49 | LIFE: a fourth friend walking out of an arrivals gate, bag over shoulder, grinning. | — |
| 0:51 | UI: the Kitty screen — **₹8,400 left of ₹20,000**, the bar easing down. | **`OVERLAY`** — 1.5s<br>Everyone threw in ₹5,000. |
| 0:53 | LIFE: four hands putting folded notes into a zip pouch on a car bonnet. | — |
| 0:55 | UI: multiple payers — one bill, two cards, two amounts. | **`OVERLAY`** — 1.4s<br>One bill. Two cards. |
| 0:57 | LIFE: wide, drone, low over water at golden hour — the whole group small on the sand. | — *(music opens up; let the image breathe with no type)* |

---

### ACT V — THE PAYOFF (0:59–1:11)

| Time | Shot | Type |
|---|---|---|
| 0:59 | **INT. AIRPORT, DAY.** The goodbye. Bags, hugs, the awkward shuffle before people split up. | — |
| 1:01 | **UI HERO.** Settle Up. The headline resolves with a count-up: **"12 payments → 3."** | *(diegetic UI. This is the film's loudest moment and it is silent type inside the product — do not add a caption)* |
| 1:04 | Three payment rows animate in. Avatar → avatar. Amounts in large tabular numerals. | — |
| 1:06 | Thumb taps **"Pay ₹1,200 via UPI."** The UPI sheet slides up. Confirm. | — |
| 1:08 | **Cut — four locations at once:** a metro, a kitchen, an auto, an office desk. Four phones light up. Four small smiles. | **`OVERLAY`** — 1.8s<br>Everyone knows what they owe. |

---

### ACT VI — RESOLUTION (1:11–1:18)

| Time | Shot | Type |
|---|---|---|
| 1:11 | **WEEKS LATER.** The same four on a rooftop somewhere ordinary — Bengaluru, evening. Laughing at something off-camera. **No phones in frame.** Slow push in. | — |
| 1:13 | Hold on the group. Let it breathe. | **`CARD`** — 2.2s<br>**Nobody has to ask.** |
| 1:15.5 | **Cut to warm paper white.** The wordmark draws on, centred, unhurried. Below it, small: *Trip expenses, settled.* | — |
| 1:17 | App Store / Play badges fade in. Hold 1.5s. | — |

> The closing card is the same words, same treatment and same hold length as the opening card at 0:11. That symmetry is the whole film — it should be exact, not approximate.

---

## 3. CUTDOWNS

**30-second version** — drop Act II to two shots (spreadsheet `#REF!`, the deleted message), keep Act III intact, keep only three Act IV overlays (split editor, kitty, offline), go straight to "12 payments → 3" and the endcard. The deleted message, the opening card and the closing card are non-negotiable in every cut.

**15-second vertical (9:16, social)** — open directly on the keypad at 0:00, no setup. `1200` → "Split 4 ways" → Save → hard cut → "12 payments → 3" → three rows → UPI tap → wordmark. Two captions maximum. Reframe every UI shot for vertical; do not letterbox a horizontal crop.

Since the hero film is already silent, **the cutdowns need no audio redesign** — they inherit the same treatment, which is the main practical benefit of building it this way.

---

## 4. TYPOGRAPHY — THE FILM'S NARRATOR

With no voice, this system *is* the script. It is not a subtitle layer and must not look like one.

### The two treatments

**`CARD` — full-frame type.** Its own shot, cutting away from the picture entirely.
- Background: warm paper `#FBF8F3`. Text: ink `#191714`.
- Left-aligned, sitting on the left third, optically centred vertically. **Never centred horizontally.**
- Size: 72px at 1080p (scale proportionally). Weight 500. Line height 1.15.
- Maximum two lines. Break lines on meaning, not on width.
- Used only five times in the whole film: the opener, the two Act II beats, the turn, the closer. Scarcity is what gives them weight.

**`OVERLAY` — type over footage.** Bottom-left, inside a 7% safe margin.
- Text: paper `#FBF8F3` over footage. Weight 500, 40px at 1080p.
- If the plate underneath is too bright, darken the footage locally with a soft gradient — **never add a drop shadow, never add a pill or box.**
- Used for the Act IV rhythm beats and one line in Act V.

### Rules that apply to both

- **Face:** the app's grotesque (Inter / Geist). Weight 500 only — never bold, never italic, never all-caps.
- **Numerals:** tabular lining, always. `₹1,200` and `₹5,000` in the film must be visually identical to `₹1,200` in the app. This is the detail that makes the film and the product feel like one object.
- **Animation in:** 200ms, 8px rise with opacity, standard ease — matching the app's own 180–220ms motion. Or a hard cut. Nothing else.
- **Animation out:** 150ms opacity only. No movement on exit.
- **Forbidden:** typewriter reveals, word-by-word fades, letter-spacing animations, blur-ins, glitch, tracking-in-and-out. Every one of these reads as template motion graphics and will undo the restraint in the rest of the film.
- **Reading time:** 0.4s per word, plus 0.6s hold. Never leave a caption on screen under 1.2s regardless of length. The durations in §2 are already calculated — hold to them, and if a shot has to shorten, cut the caption rather than rushing it.
- **Vertical versions:** reposition, never rescale-and-crop. `CARD` type moves to the upper-middle third; `OVERLAY` moves above the lower UI safe zone so platform chrome doesn't cover it.

### Accessibility

There is no speech, so no subtitle track is required. **Ship a descriptive caption/alt text** with the upload describing the visual narrative, and ensure all burned-in type clears 4.5:1 contrast against its plate — same standard as the app.

---

## 5. MUSIC — THE ONLY AUDIO

**Music only. No voiceover, no dialogue, no ambience beds.** The track carries 100% of the pacing, the emotional turn and the ending. Budget for it accordingly — this is the single largest audio decision in the project and a generic library track will flatten the whole film.

**Character:** warm, minimal, acoustic-electronic. Felt piano or Rhodes, a soft analogue pulse, a live-feeling shaker. Reference points: Tycho, Fabrizio Paterlini, Ólafur Arnalds' quieter work. **Zero** trap hats, zero risers, zero white-noise sweeps, no drop. Roughly 85–95 BPM.

**Structure — the cut must be built to these marks, not the other way round:**

| Time | Music |
|---|---|
| 0:00–0:14 | Near silence. A single sustained low note, barely present. Act I is almost soundless — the deleted message lands in near-total quiet. |
| 0:14 | Sparse piano enters. Single notes, cold, unresolved. No rhythm yet. |
| 0:28.5 | **Full stop. One complete beat of true silence.** Nothing at all. |
| 0:29 | Warm pad enters on the hard cut to white. Still no percussion. |
| 0:35 | **Rhythm arrives on the Save.** Pulse and shaker in. This is the film turning over. |
| 0:39–0:57 | Steady, confident, unchanging. It should feel easy. Act IV cuts land on the beat. |
| 0:57 | Opens fully at the drone shot — the one moment of scale. |
| 1:01 | **Drops back to a single held note** for the settle-up reveal. Restraint here is what makes it land. |
| 1:08 | Warmth returns as the four phones light up. |
| 1:13 | Resolves under the closing card. |
| 1:15.5 | Tails out under the wordmark into silence. |

**The silence at 0:28.5 is the most important sound in the film.** It is what makes the product's arrival feel like relief rather than a feature list. Do not shorten it in the edit, and do not let a colourist or client talk you into filling it.

> **Optional, and only if you want it:** four diegetic micro-sounds would sharpen the key beats — the delete keypress at 0:09, four numeric taps pitched to the score at 0:31, the save *chk* at 0:35, and the UPI confirmation at 1:06. This is a deviation from music-only, so it is offered, not specified. If you use them, use only these four and keep them low in the mix; a half-committed sound design layer is worse than none.

---

## 6. LOOK

**Grade — three distinct states, and the film's emotion lives in the transitions between them:**

| Act | Grade |
|---|---|
| I (car, night) | Cool, low-key. Lifted blacks, teal shadows, sodium-orange highlights. Grain present. |
| II (the mess) | Desaturated, slightly green, flat contrast. Fluorescent and screen light. Deliberately unpleasant. |
| III–VI | Warm and clean. Paper-white highlights, golden-hour skin, gentle halation. Matches the product palette. |

**Pull the grade from the design tokens** so the film and the app are unmistakably the same object: paper `#FBF8F3`, ink `#191714`, accent teal `#0F5F4D`, credit green `#0F6B3F`.

**Camera language:** handheld and intimate for life, locked-off and precise for UI. That contrast is the whole visual thesis — messy life, calm ledger. Shoot life at 35mm and 50mm, shallow. Never move the camera during a UI beat.

**Motion:** numbers count up, they never fade. 180–220ms easing, matching the app. The only animated flourish in the entire film is the settle-up reveal.

---

## 7. AI GENERATION PROMPTS

Use image-to-video from locked character references. `[BLANK SCREEN]` means generate with a dark or flat-green phone screen for compositing — never let the model draw UI.

### Character references (generate as stills first, then reuse in every shot)

```
Photorealistic portrait, Indian man 26, Bengaluru, short unstyled hair, light stubble,
faded olive t-shirt, warm friendly face, natural skin texture with visible pores,
soft window light, shot on 50mm f/1.8, shallow depth of field, neutral grey backdrop,
documentary photography, no makeup, no retouching
```
Repeat with varied age/styling for Rahul (29, glasses, printed shirt), Neha (24, long hair, linen shirt), Jay (25, cap, oversized tee). **Save all four. Reuse in every prompt.**

---

**S01 — Car, night (Act I)**
```
Interior of an SUV at night on a wet Indian highway, three young friends asleep against
the windows, one man awake in the back seat lit only by his phone screen from below,
rain beads on glass, sodium streetlights streaking past in the background, handheld
subtle motion, 35mm, shallow depth of field, available light only, cool teal shadows
with warm orange highlights, cinematic film grain, 2.39:1
Negative: bright interior lighting, clean glass, studio look, visible phone UI, text
```

**S02 — Phone, deleted message (Act I) `[BLANK SCREEN]`**
```
Extreme close-up of a thumb typing on a smartphone in a dark car, screen is a flat blank
dark rectangle, screen glow illuminating the thumb and fingertips, shallow macro focus
on the thumbnail, rain-diffused streetlight bokeh behind, slow subtle handheld drift,
100mm macro, cinematic, moody
Negative: any readable text, any interface, any app, logos, over-lit
```

**S03 — Receipts (Act II)**
```
Overhead static shot of thirty crumpled paper receipts scattered across rumpled white
hotel bedsheets, harsh overhead room lighting, slightly desaturated and green-tinted,
flat contrast, one receipt curling at the edge, documentary still-life, 35mm, no people
Negative: warm light, tidy arrangement, readable text, currency symbols
```

**S04 — Beach shack, the turn (Act III)**
```
Young Indian man at a beach shack table in the late morning, overexposed sunlight
flooding through an open window behind him, he glances down briefly then immediately
looks back up at his friends and laughs, warm white highlights, gentle lens halation,
handheld intimate framing, 50mm f/1.4, golden warm grade, Goa coastal setting
Negative: cold tones, night, phone visible in frame, posed expression
```

**S05 — Scooter, no signal (Act IV)**
```
Wide tracking shot following two friends riding a scooter along a narrow red-dirt road
lined with coconut palms, late golden hour, dust kicked up behind the rear wheel, warm
backlight through the trees creating flare, gentle handheld follow from a vehicle,
35mm, sun-drenched, Goa
Negative: traffic, buildings, power lines, cold grade, drone height
```

**S06 — The kitty (Act IV)**
```
Close-up of four hands placing folded Indian rupee notes into an open zip pouch resting
on a car bonnet, late afternoon sun, warm skin tones, shallow depth of field on the
pouch, casual natural movement, slight handheld, 50mm macro, documentary
Negative: staged symmetry, studio lighting, readable serial numbers, coins
```

**S07 — Drone, golden hour (Act IV)**
```
Aerial drone shot flying low and fast over shallow turquoise water toward a wide empty
beach, four tiny figures walking along the waterline casting long shadows, golden hour
backlight, warm haze, smooth forward push, wide 24mm, cinematic Goa coastline
Negative: crowds, resorts, boats, midday light, jerky motion
```

**S08 — Airport goodbye (Act V)**
```
Four young Indian friends saying goodbye in an airport departures hall, hugs and the
awkward shuffle before splitting up, backpacks and duffel bags, soft diffused daylight
from high windows, warm neutral grade, handheld observational documentary framing at
a slight distance, 50mm, shallow depth of field, background travellers softly blurred
Negative: dramatic emotion, crying, slow motion, empty terminal, signage text
```

**S09 — Four phones light up (Act V) `[BLANK SCREEN]`**
```
Four rapid intercut close-ups of smartphones lighting up in different places — a metro
carriage, a home kitchen, the back of an auto-rickshaw, an office desk — each screen a
flat blank glowing rectangle, a small genuine smile visible at the edge of each frame,
matched warm grade across all four, shallow focus, handheld, 50mm
Negative: readable notifications, any UI, any text, identical backgrounds
```

**S10 — Rooftop, weeks later (Act VI)**
```
Four young Indian friends on a Bengaluru rooftop at blue hour, laughing at something
off-camera, string lights and city glow behind them, absolutely no phones anywhere in
frame, very slow push in, warm intimate grade, 50mm f/1.4, shallow depth of field,
soft rim light from behind, natural unposed documentary feel
Negative: phones, screens, posing to camera, party crowd, harsh light
```

### Global negative prompt — append to every generation

```
distorted hands, extra fingers, warped faces, inconsistent character appearance,
fake or garbled user interface, unreadable gibberish text, watermarks, logos,
oversaturated colours, HDR glow, plastic skin, stock-footage smiles, slow-motion,
lens whip, vertical crop, on-screen subtitles, captions, lower thirds
```

> The global negative now excludes captions and lower thirds — all type is added in post, and a model inventing its own text under a shot will fight the typography system in §4.

---

## 8. PRODUCTION ORDER

1. Generate and lock the four character reference stills. Do not proceed until all four are right.
2. **Licence or commission the music early.** Silent films are cut to music, not scored afterwards — the structure in §5 is a dependency for every edit decision that follows.
3. Build and screen-record every UI beat at 3× resolution, timed to the script. **The UI edit is the spine — cut it first.**
4. Generate live-action shots, image-to-video, 3–4 variants each. Expect to discard most.
5. Assemble picture against the music. Lock the rhythm before touching type or grade.
6. Composite UI into phone shots — corner-pin track, add screen reflection and a slight glow so it sits in the scene rather than on top of it.
7. **Build the typography last**, against locked picture, per §4. Read every caption aloud at normal pace to check the hold is long enough — if you run out of time before finishing the sentence, the caption is too short.
8. Grade in three states per §6. Match the endcard exactly to `#FBF8F3`.
9. Produce the 30s and 15s cutdowns from the locked master, repositioning type for vertical shot by shot.

**Final check before release:** watch it once at full attention, then once on a phone at arm's length. Every caption must be readable on the second pass. If one isn't, it's too small or held too briefly — fix the film, not the viewer.
