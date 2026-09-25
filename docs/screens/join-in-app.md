# Screen · Join in app (link or code → "Which one are you?" → claim)

| | |
|---|---|
| **Status** | Draft |
| **Last updated** | 2026-09-25 |
| **Release** | R1 (needed from the APK testing phase) |
| **Source** | **Assumption — not in the UI reference.** Designed from [D-016](../decisions/D-016-testing-distribution.md) (APK testers join by code) and [D-008](../decisions/D-008-invite-links.md). Reuses copy and layout from `ui-refrence/Toli App.dc.html` → `<!-- INVITE WEB VIEW -->` (header, "Which one are you?") and the Welcome button **"I have an invite link"** |
| **Related** | [features/invites-and-joining](../features/invites-and-joining.md) · [features/members-and-ghosts](../features/members-and-ghosts.md) · [features/auth-and-identity](../features/auth-and-identity.md) · [04 §3.2 invite-preview, §3.4 join, §2.3 trip-snapshot](../04-api-schema.md) · [03 §4.3 trip_invites](../03-database-schema.md) · [D-007](../decisions/D-007-auth.md) · [D-008](../decisions/D-008-invite-links.md) · [D-016](../decisions/D-016-testing-distribution.md) · [invite-web](invite-web.md) · [welcome](welcome.md) · [skeleton-loading](skeleton-loading.md) · PRD F2, §13 |

---


> **Updated rules (2026-09-25, after the [pre-development review](../14-pre-development-review.md)).** These points **override** anything below that disagrees. The body text will be tidied in a later pass.
>
> - **Code entry:** type only the **6 random characters** (e.g. `7K2PXQ`). A typed prefix like "GOA-" is ignored, which fixes the O/L alphabet clash ([D-008](../decisions/D-008-invite-links.md)). The field shows the prefix as grey, non-editable text when it's known from a pasted link.

## Purpose
**Why:** during testing, the app is shared as an APK, not from the Play Store, so there is no install referrer to carry a trip through the install ([D-016](../decisions/D-016-testing-distribution.md)). People need a way inside the app to say "I have an invite". It's also the fallback on iOS and whenever a deep link fails.
**What:** a three-step flow: **(1)** paste the link or type the code (e.g. **GOA-7K2PXQ**), **(2)** see the trip and pick **"Which one are you?"**, **(3)** confirm and claim. Then the trip downloads.
**How:** the preview uses the public `invite-preview` endpoint. Claiming uses `POST /join` with the anonymous account created on first open ([D-007](../decisions/D-007-auth.md)). The first claim wins.

## User goal
"Neha sent me a code. Get me into Goa Weekend as Neha, with my balance."

## Entry points
| From | Trigger |
|---|---|
| [Welcome](welcome.md) | **I have an invite link** |
| [Trips list](trips-list.md) | **Join a trip** (Assumption; overflow or empty state) |
| App Link `toli.in/t/<token>` or `/j/<code>` | Opens directly at **step 2** with the token/code filled in |
| [Invite web](invite-web.md) | **Get the Toli app** → after install, open the app and paste/type (testing phase) |

## Exit points
| To | Trigger |
|---|---|
| [Skeleton loading](skeleton-loading.md) → [Trip home](trip-home.md) | Join succeeds; toast **"Welcome, Neha"** (Assumption) |
| Previous screen | `‹` back from step 1 |
| Step 1 | `‹` back from step 2 |

## UI structure (all copy is an Assumption unless marked "prototype")

### Step 1 · Enter link or code
- **Header:** back `‹` · title **"Join a trip"**.
- Intro 15 muted: **"Paste the invite link or type the code your friend shared."**
- **Code field:** large mono input (JetBrains Mono 28/700, +0.06em, uppercase), placeholder **"GOA-7K2PXQ"**, lime 2 px underline like the Create trip name field. Auto-uppercases, auto-inserts the hyphen after the prefix, ignores spaces. A 3-letter prefix plus 6 characters; only allowed characters (no 0/O/1/I/L, [03 §4.3](../03-database-schema.md)).
- **Or paste link:** tonal `Button` **"Paste invite link"**. If the clipboard holds a `toli.in/t/…` (or `*.workers.dev`) link, a lime `Chip` appears: **"Use link from clipboard"**.
- Footer primary `Button` 56 px lime: **"Find trip"** (disabled until a full code or a valid link is present).
- Helper 12 muted: **"No link? Ask whoever made the trip to tap Invite."**

### Step 2 · "Which one are you?"
Same content as the invite web page (prototype copy):
- **"Aditya added you to"** (14 muted) · trip name 36/800 **"Goa Weekend"** · **"12 – 15 Oct · 4 people · ₹17,000 spent"** (13 muted).
- **"Which one are you?"** (18/600).
- One 56 px row per member (radius 16, `color.bg.card`): 34 px avatar · name 16/600 · **"›"**. Ghosts are tappable. Already-claimed members are shown at 45% with **"On Toli"** and are not tappable (Assumption).
- Last row (Assumption): **"I'm not on the list"** → name field **"Your name"** + **"Join as new member"**.

### Step 3 · Confirm claim (`Sheet`)
- Title **"You're Neha?"**
- Body 14 muted: **"You'll see everything Neha paid and owes on this trip. Your history comes with you."** (echoes the prototype's "Your history comes with you when you claim your spot.")
- Buttons: lime **"Yes, I'm Neha"** · dark **"Pick again"**.
- While joining: button shows a spinner and **"Joining…"**.

Components: `Screen`, `Header`, text input (code variant), `Chip`, `Button`, `Row`, `Avatar`, `Sheet`, `Toast`.

## States
| State | Behaviour |
|---|---|
| Loading | Step 1 → 2: button spinner **"Finding trip…"**. Step 3: **"Joining…"**. |
| Empty | Step 1 with an empty field: Find trip disabled. |
| Populated | Steps 2 and 3 as above. |
| Error | Copy per API error ([04 §1, §3](../04-api-schema.md)): `invite_invalid` → **"That code doesn't match a trip. Check it with Aditya."** (or "…with your friend." when unknown) · `invite_expired` → **"This invite has expired. Ask for a new one."** · `already_claimed` → **"Someone already claimed Neha. If that wasn't you, ask the organiser to release the spot."** · `rate_limited` → **"Too many tries. Wait a few minutes and try again."** · network → **"Couldn't reach Toli. Check your connection."** |
| Offline | Step 1 works but **Find trip** shows **"Joining needs internet. Try again when you're back online."** Status bar **OFFLINE**. |
| Syncing | After join, [Skeleton loading](skeleton-loading.md) handles the snapshot. |
| Success | Navigate to the trip + toast. If the user is anonymous, Assumption: after the first screen, show the **"Save my account"** prompt ([D-007](../decisions/D-007-auth.md)). |
| Disabled | Claimed members in the list. |
| Partial data | Trip with no ghosts left: only **"I'm not on the list"** is shown, with text **"Everyone on this trip has claimed their spot."** |

## Interactions
| Interaction | Result |
|---|---|
| Type code | Live formatting; Find trip enables at full length. |
| Paste link / clipboard chip | Extracts the token; goes straight to step 2 on success. |
| Tap a ghost row | Step 3 sheet. |
| **Yes, I'm Neha** | `POST /join` with `claim_member_id`. |
| **Pick again** / tap scrim | Close the sheet. |
| **I'm not on the list** → **Join as new member** | `POST /join` with `display_name`; unique name check (server). |
| Back | Previous step. |

## Data
- Step 2 reads the `invite-preview` response (not SQLite): trip name, dates, currency, total spent, organiser first name, members `{ member_id, display_name, is_ghost }`.
- After join: everything comes from the snapshot into SQLite.

## API / Database
| Step | Call |
|---|---|
| Find trip | `GET /invite-preview?code=` or `?token=` (public, 30/min per IP, 10 wrong codes per IP per hour, global alarm at 500 wrong codes per hour) |
| Claim | `POST /join { code \| token, claim_member_id }` → `{ trip_id, member_id }`; server writes `member.claim` to `trip_ops` and notifies the organiser ("Neha claimed her spot") |
| New member | `POST /join { code \| token, display_name }` |
| Then | `GET /trip-snapshot?trip_id=` ([skeleton-loading](skeleton-loading.md)) |
| Locally | `sync_cursors` row; `profiles.display_name` set to the claimed name if empty (Assumption) |

Joining is idempotent: joining again returns the same member ([04 §3.4](../04-api-schema.md)).

## Edge cases
- **Already a member of this trip:** `/join` returns the existing member; go straight to the trip with toast **"You're already on Goa Weekend"**.
- **Two people claim the same ghost at once:** first wins; the second gets `already_claimed` and returns to step 2 with that row now "On Toli".
- **Reinstalled app (lost anonymous account):** their old name shows "On Toli"; the organiser must **Release** it ([members](members.md)), then they claim again. The `already_claimed` copy explains this.
- **Rotated invite** (old code): `invite_invalid`.
- **Code typed in lowercase or with spaces:** normalised.
- **Picked the wrong person:** the organiser releases it (`/member-release`, OQ-P14); no self-service "unclaim" in v1.
- **Trip full** (50 members): joining as a new member is refused (`member_limit`, [04 §2.1](../04-api-schema.md)); copy **"This trip is full (50 people)."** (Assumption).

## Analytics
| Event | When | Properties |
|---|---|---|
| `invite_link_opened` | invite-preview succeeds from the app | `installed: true`, `via: code \| link` (Assumption property) |
| `member_claimed` | `/join` with a claim succeeds | — |
| `member_added` | `/join` as a new member | `type: claimed` |

## Accessibility
- Code field label: "Invite code, for example G O A dash 7 K 2 P X Q".
- Member rows: "Neha, not claimed yet. Double-tap to choose." Claimed rows: "Rahul, already on Toli, unavailable."
- Errors announced as alerts and shown under the field (not colour only).

## Open questions / assumptions
- **The whole screen is an assumption** per [D-016](../decisions/D-016-testing-distribution.md); the UI reference only has the web version.
- PRD §13 step 3 says claiming uses **phone OTP**; [D-007](../decisions/D-007-auth.md) uses the anonymous account instead. We follow D-007.
- **Claim approval:** resolved by OQ-P14 in [01](../01-overview.md#open-questions): no approval in v1; the organiser is notified and can **Release** a wrong claim.
