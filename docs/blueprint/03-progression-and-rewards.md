# 03 — Progression & Reward Design

> Persona: **Game Systems Designer** (lead), Learning Scientist (spaced repetition, ethics).

## 1. Level states (a level is cleared only by passing its test)

| State | Rule | Visual |
|---|---|---|
| Locked | ≥ 1 prerequisite level not yet **Cleared** | Grey medallion + padlock; card lists missing prerequisites with links |
| Available | Every prerequisite level is Cleared | Gold rim glows, gentle breathing |
| In progress | Lesson started, not finished | Medallion ring fills clockwise with step progress |
| Studied | All lesson steps done; **level test now open** | Full ring, "Take the test" on the level card. No star yet |
| **★ Cleared** | Level test passed with **≥ 70 %** | 1 star; LEVEL CLEAR! plays; dependants unlock |
| **★★ Excellent** | Best level-test score **≥ 90 %** | 2 stars |
| **★★★ Mastered** | Cleared + a spaced-review test passed **≥ 3 days** later | 3 stars, pedestal turns gold |
| Review due | FSRS says the review is due | Repeat badge on the medallion; counted in Today's goals |

Level test rules:

| Rule | Decision |
|---|---|
| Source | Every item is tied to a specific step of *that* level's lesson (`teaches` link); the validator rejects items that test content the level did not teach |
| Coverage | Every teaching section of the lesson has ≥ 1 item |
| Size | 5–10 items, mixed formats (predict-output, order-steps, spot-the-bug, match, numeric, multiple choice, code where the stage has a runtime) |
| Pass mark | 70 % to clear; 90 % for the second star |
| Retakes | Unlimited; items re-drawn/shuffled from a larger pool; the failed items link back to the exact step to re-study |
| Skipping | "Prove it" lets a learner take the test without studying; passing clears the level normally |
| Stage boss | A stage test covering all its levels; unlocks when every core level of the stage is Cleared; clearing it completes the stage |
| World | A world completes when all its stage bosses are beaten |

Failing a review never deletes progress: the third star dims to outline until the next successful review.

## 2. XP economy

| Source | XP | Notes |
|---|---|---|
| Lesson step completed | 5 | ~10 steps per lesson |
| Simulation goal reached | 20 | 1–2 per lesson |
| Test item correct (first try / after retry) | 10 / 5 | No XP for revealing the answer |
| Level studied (all steps) | +25 | |
| Level Cleared (test ≥ 70 %) | +50 | |
| Second star (test ≥ 90 %) | +25 | |
| Level Mastered (review test) | +75 | |
| Review passed | +10 | Keeps reviews worthwhile |
| Boss cleared | +400 | One per subject |
| Stage complete (boss beaten) | +250 | |
| World complete | +1,000 | |
| "Prove it" test passed without studying | Cleared + item XP; no study XP | |

Estimate: ≈ 305 XP per fully mastered level → ≈ 177k from levels + 16.4k bosses + 10.3k stages + 12k worlds ≈ **216k XP** for the full current graph. No XP decay, no XP purchase, no XP for idle time.

## 3. Ranks (16, themed bottom-up through the machine)

| # | Rank | XP | ≈ When reached |
|---|---|---|---|
| 1 | Bit | 0 | Start |
| 2 | Nibble | 150 | First lesson |
| 3 | Byte | 500 | First 2 topics |
| 4 | Word | 1,200 | ~4 topics |
| 5 | Register | 2,500 | First subject done |
| 6 | Pointer | 4,500 | |
| 7 | Stack Frame | 7,500 | Origins complete |
| 8 | Process | 12,000 | |
| 9 | Kernel | 18,000 | |
| 10 | Protocol | 26,000 | ~9 Core Path subjects |
| 11 | Compiler | 36,000 | |
| 12 | Cluster | 50,000 | |
| 13 | Consensus | 68,000 | |
| 14 | Architect | 92,000 | |
| 15 | Turing | 125,000 | |
| 16 | Universal | 170,000 | ~85 % of the universe |

Early ranks come fast (habit forming); later ones track real breadth. Each rank-up: cinematic badge forge (2.5 s, skippable), badge added to the HUD.

## 4. Spaced repetition (FSRS)

| Item | Decision |
|---|---|
| Library | `ts-fsrs` (MIT) |
| Card | One per level once Cleared; review = 3–5 items drawn from that level's test pool (varied formats) |
| Target retention | 0.90 (user-adjustable 0.80–0.95) |
| Grade mapping | All correct first try → Good/Easy (by time); any retry → Hard; failed → Again |
| Daily load | Due reviews capped (default 15/day); overflow rolls over without penalty |
| World signal | Due stars flicker; minimap shows count; "Review" mode flies a short tour of due stars |

## 5. Streaks (non-punishing)

| Rule | Decision |
|---|---|
| Counts | Any lesson step or review on a local calendar day |
| Freeze tokens | +1 per 7 streak days, max 3, auto-applied on a missed day |
| Break message | Neutral: "New streak started — your best is 12 days." Never "You lost…" |
| Alternative | Optional weekly goal (e.g. 3 days/week) for people who dislike daily streaks |
| No | Streak-saving purchases, push guilt, countdown timers |

## 6. Celebration hierarchy (each level clearly bigger)

| Level | Trigger | Visual | Sound | Duration | Camera |
|---|---|---|---|---|---|
| **Micro** | Step done, correct answer | Rail tick + spark, XP chip flies to HUD | Soft tick | 0.4 s | None |
| **Level** | Level test passed (new star earned) | LEVEL CLEAR! modal: stars stamp in one by one, XP rows count up, unlocked level + bonus chest cards, confetti (see 01 render) | Rising 3-note chime per star | 2–3 s | Glide to next pedestal after closing |
| **Stage** | Boss cleared | Castle gate opens, flag rises, fireworks over the castle, road glows end to end, XP cascade, rank check | Layered chord + fanfare | 4–6 s, skippable | Pull back to the whole island |
| **World** | All stages of an island complete | Island fully blooms, giant banner unfurls, sea-route to the next island turns gold, world trophy card | Full motif | 8–10 s, skippable | Rise to World Map, sweep along the route |

Reduced motion: same information as static overlays + sound (if enabled); no camera moves.

## 7. Bosses

One capstone per subject (41 listed in 02). Format = a scenario combining the subject's topics: simulation goals, multi-step challenges, and coding where the subject has a runtime. Unlocks when every core level of the stage is Cleared (a stage test drawing on all its levels). Retry is unlimited; partial progress is kept. Clearing it raises the castle flag and completes the stage.

## 8. Achievements (sample of the full set, ≈ 60 at launch)

| Badge | Condition | Hidden |
|---|---|---|
| First Light | Complete your first lesson | |
| Two's Complement | Finish Number Systems & Arithmetic | |
| Gatekeeper | Clear the Boolean Logic boss | |
| Off by One | Fix the loop-bound bug in a spot-the-bug challenge | ✓ |
| Stack Overflow | Recurse past the simulator's frame limit on purpose | ✓ |
| Cache Whisperer | Reach 90 % hit rate in the cache simulator | |
| Deadlock Survivor | Clear the Banker's Algorithm challenge without hints | |
| Belady's Ghost | Reproduce Belady's anomaly with FIFO | ✓ |
| Three-Way Handshake | Complete TCP Segments & the Handshake | |
| Byzantine Diplomat | Clear the Consensus boss | |
| Halting Problem | Open the Halting Problem lesson and leave it open for 10 min | ✓ |
| Turing Complete | Master every Core Path topic | |
| Night Owl / Early Bird | Study after 23:00 / before 06:00 (local) | ✓ |
| Cartographer | Visit every domain at Domain zoom | ✓ |
| Polyglot | Pass coding tasks in 3 languages | |
| Deep Diver | Master 10 off-path topics | |
| Spaced Out | Pass 100 reviews | |

## 9. Recommendation (the CONTINUE level)

| Signal | Weight (initial) |
|---|---|
| Next Core Path topic | high |
| Review due (overdue first) | high |
| Weak topic (low challenge accuracy) | medium |
| Near-complete subject (finish what you started) | medium |
| Proximity to current camera focus | low |

Exactly **one** CONTINUE target at a time. A small "other suggestions" list (max 3) sits in the level card. Weights tuned in Phase 4 from simulated learner traces.

## 10. Today's goals (optional)

Three small daily goals (e.g. clear 3 levels, review 5 due levels, reach a simulation goal), +50–60 XP each. Missing them costs nothing; they reset at local midnight; no streak or rank depends on them.

## 11. Journey log & share card

Timeline of Cleared/Excellent/Mastered events, bosses and ranks, grouped by week. Share card = a PNG rendered client-side of *your* World Map with rank, stars and counts (no personal data beyond what the user chooses to show).

## 12. Ethics rules (non-negotiable)

| Never | Instead |
|---|---|
| Loss-framed or guilt messages | Neutral facts, invitations |
| Fake urgency / countdowns | Calm due dates |
| Infinite feeds, autoplay chains | Natural stopping points after each node celebration |
| Variable-ratio loot rewards | Deterministic, explained rewards |
| Dark patterns around streaks | Freezes, weekly goal option |
| Hiding the off switch | Sound, motion, celebrations and streaks individually toggleable |
