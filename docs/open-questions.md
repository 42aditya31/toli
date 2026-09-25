# Toli · Open Questions

| | |
|---|---|
| **Status** | Answered by default on 2026-09-25: every suggestion was accepted because none was rejected. Still open: **13** (domain) and **16** (trademark) |
| **Last updated** | 2026-09-25 |
| **Full detail** | [01 Overview → Open questions](01-overview.md#open-questions) |

**What this file is now:** each question shows the suggestion and the **answer that was applied** to the docs. Two answers (5 and 18) were **changed by the [pre-development review](14-pre-development-review.md)**, which found problems with the original suggestion.

---

## A. Must answer before we start building

### 1. Who is allowed to do what? (OQ-P12)
In a group trip, someone has to be allowed to delete or change things.

**Suggested:**
- **Anyone in the trip** can add, edit or delete any expense (every change is saved in the history, so nothing is secretly lost). They can also mark a payment as paid, add and rename ghost members, and edit the budget.
- **Only the organiser** can remove people, reopen a finished trip, reset the invite link, change the settle mode (Simplified or Direct), and make someone else organiser.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 2. What goes on the bottom bar in the first version? (OQ-P11)
The design shows Trip · Plan · + · Vault · Feed, but Plan, Vault and Feed come in later versions.

**Suggested:** first version shows **Trip · + · Members**. The other tabs appear when those features are built.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 3. The kitty "equal refund" option (OQ-E1)
The PRD says the group can choose to split the leftover kitty cash **equally** instead of by how much each person put in. Splitting equally would quietly move money from some people to others.

**Suggested:** **remove the equal option.** Leftovers always go back in proportion to what each person put in.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 4. How to handle the extra paisa (OQ-E2)
₹100 split 3 ways leaves 1 paisa over. The PRD picks who gets it at random, but the same way on every phone. We suggest one small improvement: whoever is closest to getting the extra paisa gets it first, and the random order is only a tie-breaker. The result is exactly the same for equal splits, and a bit fairer for unequal ones.

**Suggested:** ✅ accept the improvement.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 5. When is a trip "finished"? (OQ-P13)
**Suggested:** the app marks it **settled** by itself when everyone has paid everything. If someone undoes a payment, it opens again automatically.

**Answer:** ✅ Accepted, **refined by the review**: it settles only when everything is paid **and** either the end date passed more than 24 hours ago, or someone taps **Close trip**, so it can't lock in the middle of the trip. Leftover paise under ₹1 are written off as "Rounding". Members can **Request reopen**. ([D-023](decisions/D-023-auto-settle-timing.md), [D-021](decisions/D-021-rounding-adjustment.md))

### 6. Do people need approval to claim their name? (OQ-P14)
When Neha joins and taps "I'm Neha", should the organiser have to approve it?

**Suggested:** **no approval.** The organiser gets a message ("Neha claimed her spot") and can undo it if it's wrong.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 7. Should a new expense start with a category? (OQ-P15)
The design pre-selects "Food". The PRD says category is optional.

**Suggested:** **no category selected.** The app suggests one from what you type. Anything left empty shows as "Misc".

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

---

## B. Product and business

### 8. Main success number (OQ-P1)
What one number tells us Toli is working?
- PRD: **trips settled per week**
- Brief: **groups with 3+ expenses in their first week**

**Suggested:** trips settled per week as the main number; track the other one too.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 9. How fast should a new user log their first expense? (OQ-P2)
The PRD says 90 seconds, the brief says 60.

**Suggested:** aim for 60, accept 90.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 10. Pro price (OQ-P7)
**Suggested:** test ₹99, ₹149 and ₹199 with beta users before deciding.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 11. Import from Splitwise (OQ-P6)
Must we have it at launch, or is it a nice-to-have?

**Suggested:** nice-to-have, in version 2.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 12. Is the budget chart free? (OQ-P18)
**Suggested:** yes, the budget and its chart are free. Pro only adds extra charts (day-by-day, category trends).

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

---

## C. Brand and launch

### 13. Website domain (OQ-P5)
**toli.in** (about ₹800/year) or **toli.app** (about $14/year)? The design shows toli.app. Invite links use this domain, so buy it early.

**Answer: STILL OPEN.** Buy toli.in or toli.app before invite links leave the testing group. Until then, the free workers.dev address is used.

### 14. App icon (OQ-P4)
The logo explorations never picked a final icon. The closest one is **1b**: a lime ticket on dark grey.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 15. Tagline (OQ-P3)
"**Trip money, sorted.**" or "**Trip expenses, settled.**"?

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 16. Trademark check for the name "Toli" (OQ-P9)
This needs a legal check before the store launch.

**Answer: STILL OPEN.** Aditya to arrange the legal check before the store launch.

---

## D. Notifications and the web page

### 17. Lock-screen notification look (OQ-P10)
Inside the app, notifications look **exactly** like the lime ticket in the design. When the app is closed, Android doesn't allow that exact shape, so it's shown as close as Android allows. On some phones (Xiaomi, Oppo, Vivo) it's a plain notification, so it always arrives.

**Suggested:** accept this.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 18. Paying from the invite web page (OQ-P8)
Can someone who hasn't installed the app tap **"Yes, I paid"** on the web page?

**Suggested:** yes. They first tap their name, so the payment is recorded under the right person.

**Answer:** **Changed by the review (security).** In the **beta**, the web page is **read-only**: see your name and what you owe, then **Get the Toli app**. In **R1b**, web payments come back safely: the browser gets a **limited** spot that can only pay its own debt, and the payment stays **pending until the person being paid confirms it**. ([D-024](decisions/D-024-web-page-read-only-beta.md))

---

## E. Accounts and testing

### 19. The only organiser loses their account (OQ-P20)
If the organiser never saved their account and deletes the app, nobody can manage the trip.

**Suggested:** the app asks organisers to save their account as soon as they invite anyone. If no organiser is active for 30 days, the longest-standing member can take over.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 20. Google account already on Toli (OQ-P16)
If someone taps "Save with Google" but that Google account already has Toli trips, what happens?

**Suggested:** for now, show "This Google account is already on Toli. Sign in with it instead." A proper "merge both" option comes later.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 21. Receipt photos on mobile data (OQ-P17)
If "Wi-Fi only" is on, normal receipt photos wait for Wi-Fi.

**Suggested:** a **scan** (Pro) uploads right away, because you asked for it.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

### 22. Do testers' trips carry over to the real launch? (OQ-P19)
**Suggested:** yes. Testers use the real server from day one, so nothing is lost. They'll reinstall once when we move to the Play Store, so the app asks them to save their account first.

**Answer:** ✅ Accepted (the suggestion). See [01 Overview](01-overview.md#open-questions) for the linked decision.

---

## F. Small rules (one answer covers all of these) (OQ-P21)

**Suggested:**
- A deleted person's spot ("Former member") **can't** be claimed by anyone.
- A member can **leave** a trip themselves, but only when they owe nothing and are owed nothing.
- You can set your **own** "joined from" day; organisers can set anyone's.
- If two phones add a ghost with the same name while offline, the second becomes "Rahul 2" and people are told.
- Beta testers get Pro **free**, given by us, with no store purchase.
- The film showed payer cards like "HDFC CARD ••42". We're **not** building that; payers show names only.
- A feed post can be deleted by the person who posted it, or by an organiser.
- The kitty holder can be changed by an organiser or by the current holder.

**Answer:** ✅ Accepted (all of them). Recorded in [01 Overview OQ-P21](01-overview.md#open-questions).

---

## What happens now
These answers are now decisions ([decisions log](decisions/README.md)). To change one, say which number and your new answer. It will be recorded as a new decision, and the docs will be updated.
