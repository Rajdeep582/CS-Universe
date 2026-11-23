# 05 — Risk Register

> Persona: **Principal Product Architect**. L = likelihood, I = impact (H/M/L).

| # | Risk | L | I | Mitigation | Owner phase |
|---|---|---|---|---|---|
| R1 | **Content volume**: 581 production-quality lessons with simulations is the largest cost in the project | H | H | Vertical slice first (Phase 5) to fix the template and real cost per lesson; reusable simulation framework; batches of subjects with review in Phase 8; ship regions progressively (unauthored stars show "charting in progress" in the Atlas only, never fake lessons) | 5, 8 |
| R2 | **Factual errors** in lessons or simulations | M | H | Pure algorithm modules with textbook-example tests; per-lesson review checklist; refs at chapter level; `needs-review` flag blocks publishing | 3, 5, 8 |
| R3 | **iGPU frame rate** below 60 fps with shadows, water shader, glass blur and dense props | M | H | Instancing, baked heightfields, shadow-map size per tier, backdrop-blur off in Lite, quality tiers with auto-downgrade, perf probe in CI, profile on your Ryzen 5 7530U each phase | 2, 7 |
| R4 | **Disorientation** in 3D despite aids | L | H | Road-based levels, constrained camera, one CONTINUE target, stage header, Atlas fallback; hallway test with 5 people in Phase 7 | 2, 7 |
| R5 | Label clutter / unreadable text in 3D | M | M | DOM glass labels, collision solver with leader lines (proved in prototype), min 12 px | 2 |
| R6 | Pyodide / PGlite download size (several MB) | H | M | Lazy-load only inside coding steps, show progress, cache via service worker, sql.js fallback | 6 |
| R7 | Sandbox escape or runaway learner code | L | M | Worker isolation, no network, terminate on timeout, memory cap, sandboxed iframe with no same-origin for JS DOM tasks | 6 |
| R8 | Fast-moving deps (R3F, Vite 8, TS 7) break APIs | M | M | Pin exact versions, Renovate-style manual upgrades between phases only, re-check API docs at each phase start | 1–9 |
| R9 | TypeScript 7 tooling gaps (lint plugins) | M | L | Decide in Phase 1 after a smoke test; fall back to latest 5.x/6.x | 1 |
| R10 | Gamification turning manipulative | L | H | Ethics rules in 03 §11 are acceptance criteria, not guidelines | 4 |
| R11 | Local-only data loss (browser storage cleared) | M | M | Persistent storage request, prominent export, auto-export reminder after milestones (opt-in) | 4 |
| R12 | Layout instability when content grows (stars jump between versions) | M | M | Seeded layout + "anchors": existing nodes keep positions within tolerance; new nodes placed around them | 2, 8 |
| R13 | Copyrighted material creeping into lessons (figures, text from textbooks) | M | H | Original writing and original diagrams only; cite, never copy; review checklist item | 5, 8 |
| R14 | Mobile touch + WebGL quirks on mid-range phones | M | M | Lite tier default on mobile, touch-first controls, Playwright mobile emulation + one real-device check | 7 |
| R15 | Free hosting limits change | L | M | Pure static build works on Cloudflare Pages *and* GitHub Pages; no vendor lock-in | 9 |
| R17 | **Art scope**: 12 premium biomes + castles + props | H | M | Procedural terrain + one instanced prop kit recoloured per biome (proved in prototype); signature props only where they carry meaning | 2, 7 |
| R18 | Premium look drifting back to "cartoon" | M | M | Renders in 01 are the acceptance reference; Playwright screenshot diffs against them from Phase 2 | 2, 7 |
| R16 | Scope creep (new regions before foundations are good) | M | M | Phase gates; Frontier regions stay reserved until Phase 8 | all |
