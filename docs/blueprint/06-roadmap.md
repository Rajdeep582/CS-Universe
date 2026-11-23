# 06 — Phase Roadmap

> Headings and outcomes only. Each phase's detailed plan is written at the start of that phase, using what was learned.

| Phase | Name | Lead personas | Outcome | Gate (must be true to finish) |
|---|---|---|---|---|
| **0** | Vision & Blueprint | Architect, Learning Scientist, Game Designer, Technical Artist | This folder | Approved by you |
| **1** | Foundation & Design System | Frontend Architect, UI/UX & Motion | Vite + React + TS scaffold, lint/test/E2E tooling, tokens, glass + 3D-button library, HUD shell, routes, curriculum migrated to `content/graph/` with Zod validation in the build | `npm run build`, tests, E2E smoke pass; component gallery screenshots match spec |
| **2** | World Engine (Isles) | 3D Engineer, Technical Artist | World Map, islands, stage roads and level pedestals from build-time layout; terrain + water shaders; instanced prop kit; camera glides, picking, label solver, search fly-to, quality tiers, 2D Atlas | 60 fps Balanced on your laptop with full graph; 1,000-node stress graph smooth |
| **3** | Lesson Experience & Simulation Framework | UX Designer, Educational Technologist | Lesson chamber, step rail, MDX/KaTeX/Shiki, simulation framework, quiz engine (all formats) | One demo lesson exercising every section and challenge format |
| **4** | Progression & Rewards | Game Systems Designer | XP, ranks, states, FSRS, streaks, achievements, celebration hierarchy, journey log, world lit by progress | Event-replay tests; each celebration level visibly larger; ethics checklist passes |
| **5** | First Complete Region | CS Professor, Technical Writer | Origins (Tier 0) + Operating Systems, production lessons, simulations, bosses | Every lesson passes accuracy review; every sim module has textbook tests |
| **6** | Code Challenge Runtimes | Runtime / Sandboxing Engineer | Sandboxed JS, Python (Pyodide), SQL (PGlite), evaluated C option, test-based grading, CodeMirror UI | Sandbox tests (timeouts, infinite loops, memory) pass |
| **7** | Polish, Sound, Performance, A11y, PWA | Perf & A11y Engineer, Motion & Sound | All budgets met, audio layer, offline PWA, final polish | Lighthouse + fps + WCAG AA + hallway test pass |
| **8** | Content Expansion System | Learning Scientist, DX Engineer | Authoring guide, templates, tooling, PR workflow, remaining subjects in reviewed batches | A new subject added with content files only |
| **9** | Optional Cloud & Launch | Backend/DevOps | Optional free-tier sync (only if no card needed), share cards, deploy to free static hosting, launch checklist | Live URL, ₹0 cost |
