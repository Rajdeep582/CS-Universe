# 00 — Vision

> Personas: **Principal Product Architect** (lead), Learning Scientist, Game Systems Designer.

## One line

**CS Universe** is a free, browser-based 3D island-adventure game where computer science is a place: 12 island worlds, each subject a stage with a winding road of levels, each level a topic you play, master for up to 3 stars, and use to unlock the next. Islands come out of the mist and bloom with colour as you understand them.

## Product pillars

| # | Pillar | What it means in practice | Anti-goal |
|---|---|---|---|
| 1 | **Explore, don't enrol** | Entry is a world, not a syllabus. Any unlocked star can be visited at any time. | Chapter lists, "Module 3 of 12" framing |
| 2 | **Always oriented** | One primary focus on screen; stage header, Atlas card and a single "Continue" level answer *where am I* and *what now* in < 2 s. | Getting lost on the map |
| 3 | **Textbook-grade truth** | Every claim traceable to a canonical source; every simulation backed by a unit-tested algorithm module. | Pop-science simplifications that are wrong |
| 4 | **Learn by manipulating** | The interactive simulation is the heart of every lesson; text supports it. | Walls of text, video lectures |
| 5 | **Earned delight** | Rewards escalate (step → topic → subject → domain) and always change the world itself. | Loss-framed guilt, fake urgency, slot-machine loops |
| 6 | **Runs on a ₹0 budget and a weak GPU** | Static hosting, local-first data, 60 fps on integrated Radeon, Lite tier for phones. | Paid APIs, servers, credit-card signups |
| 7 | **Grows forever** | A new field = new content files. Layout, colors, navigation and validation derive from data. | Engine changes per subject |

## Who it is for

| Learner | Starts at | Wants | How the product serves them |
|---|---|---|---|
| Curious beginner | Origin Star | To understand how computers really work | Core Path + "Continue journey"; tier-0 lessons assume nothing |
| CS student | Any subject | Intuition and visuals for hard course topics | Search (Ctrl K), deep links, simulations, textbook refs |
| Self-taught developer | Systems / Algorithms | Fill gaps behind daily work | "Prove it" placement checks unlock prerequisites quickly |
| Interview / revision user | Mastered nodes | Retain what they learned | FSRS reviews; "review due" stars flicker gently |

## Primary feeling (design north star)

> *"I'm exploring something vast and beautiful, I always know where I am and what to do next, and every time I finish something I feel genuinely rewarded."*

Every feature in later phases is accepted or rejected against this sentence.

## The core loop

| Step | Learner action | System response | Felt as |
|---|---|---|---|
| 1 | Taps CONTINUE / picks any open level or bonus chest | Camera glides to the pedestal, world blurs, level opens | Curiosity |
| 2 | Moves through 6–12 small lesson steps | Tick + spark per step, XP flies to HUD | Momentum |
| 3 | Plays the simulation, reaches its goal | Goal chime, state inspector confirms | Insight |
| 4 | Passes the level test (≥ 70 %, built only from that level's lesson) | LEVEL CLEAR! — stars stamp in, XP counts up, next level and bonus chest unlock | Achievement |
| 5 | Returns days later for a spaced review | Third star earned (Mastered) | Ownership |
| 6 | Beats a stage's castle boss | Flag rises on the castle, road glows, camera pulls back over the island | Triumph |

## Scope of the whole product (for orientation only — phases detail it)

| Area | Included |
|---|---|
| World | Isles of Computing (see 01): World Map → Island → Stage → Level → Level play, plus 2D Atlas mode |
| Content | 12 domains, 41 subjects, 581 topics designed (see 02); authored in batches from Phase 5 |
| Lessons | 10-section lesson model, MDX + KaTeX + Shiki, simulation framework, 5+ challenge formats |
| Game layer | XP, 16 ranks, 3 mastery tiers, FSRS reviews, streak with freezes, achievements, 41 bosses, journey log |
| Code | Sandboxed JS, Python, SQL (C evaluated) with test-based grading |
| Platform | Local-first (IndexedDB), export/import, PWA offline, optional free-tier sync late |

## What success looks like (Definition of Done, restated as measurable checks)

| Check | Target |
|---|---|
| First-visit orientation | New user starts first lesson in ≤ 30 s without instructions (Phase 7 hallway test, 5 people) |
| Frame rate | ≥ 60 fps universe view on Ryzen 5 7530U iGPU at Balanced tier; ≥ 30 fps mid-range phone at Lite |
| First view | < 3 s on decent broadband, cold cache |
| Accuracy | 100 % of shipped lessons pass review checklist; every simulation module has textbook-example tests |
| Extensibility | Adding a subject touches only `content/` (proved in Phase 8) |
| Cost | ₹0 running cost |

## Assumptions made (no blocking questions were needed)

| # | Assumption | Impact if wrong |
|---|---|---|
| 1 | UI and content language: **English** only at launch; strings kept in one place so i18n is possible later | Low — Phase 1 adds an i18n-ready string layer anyway |
| 2 | No accounts until Phase 9; all progress local with export/import | Low |
| 3 | Primary code-task language **Python** for beginners, JS/SQL/C where the subject needs it | Medium — affects Phase 6 effort |
| 4 | Assembly lessons use **RISC-V** (open ISA, matches Patterson & Hennessy RISC-V ed.) | Low |
| 5 | Vertical slice (Phase 5) = **Tier 0 + Operating Systems** |
| 6 | World theme = **3D islands** instead of the master prompt's space world (owner direction, 2026-11-23) | — decided | Medium — swap to Data Structures if you prefer (decision D5) |
