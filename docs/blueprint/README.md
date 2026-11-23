# Phase 0 — Vision & Blueprint (report)

> Personas: Principal Product Architect · Learning Scientist / CS Professor · Game Systems Designer · Technical Artist · UI/UX & Motion Designer.
> Status: **revision D complete, waiting for approval.** No app code written (design renders come from throwaway tooling in `design/prototype/`).

## Deliverables

| # | Deliverable | File |
|---|---|---|
| 1 | Vision document | [00-vision.md](00-vision.md) |
| 2 | World direction **Isles of Computing**: decision log, curriculum→game mapping, biomes, visual language, HUD, camera, layout | [01-world-and-experience.md](01-world-and-experience.md) |
| 3 | Premium 3D renders: World Map, Stage Map, Level Clear | [renders/](renders/) |
| 4 | Full curriculum graph — machine-readable | [curriculum.graph.yaml](curriculum.graph.yaml) |
| 5 | Full curriculum graph — readable | [02-curriculum.md](02-curriculum.md) |
| 6 | Reward & progression design (stars = mastery tiers, celebrations, goals) | [03-progression-and-rewards.md](03-progression-and-rewards.md) |
| 7 | Architecture, tech decisions, license audit | [04-architecture.md](04-architecture.md) |
| 8 | Risk list | [05-risks.md](05-risks.md) |
| 9 | Phase roadmap | [06-roadmap.md](06-roadmap.md) |
| 10 | Render source + curriculum validator (design tooling) | [../../design/prototype/](../../design/prototype/) |

## Acceptance checklist

| Criterion | Verified how | ✓ |
|---|---|---|
| No app code in Phase 0 | `src/` does not exist; prototype is isolated design tooling with its own README | ✓ |
| Concepts evaluated, one recommended | 4 revisions logged (01 §1); Isles of Computing recommended; island theme accepted by owner | ✓ |
| Game feel: level map, progression, bright colours | World Map + Stage Map + Level Clear renders; numbered levels, 3-star tiers, bonus chests, boss castle, XP, ranks, streak, goals | ✓ |
| Premium, detailed, not cartoon | Real-time lit 3D (soft shadows, water shader, foam, fog of war, instanced props) + frosted-glass UI; checked frame by frame, overlaps fixed by a label solver | ✓ |
| DAG with multi-parent edges | Validator: 0 cycles (topic and subject level), 806 edges, 260 cross-subject | ✓ |
| ≥ 4 zoom levels | World Map → Island → Stage → Level → Level play | ✓ |
| Coverage of all prompt tiers | 12 domains / 41 subjects / 581 topics; 4 expansion islands reserved | ✓ |
| Core Path for a zero-knowledge start | 337 core topics; closure check; single root `what-is-computer` | ✓ |
| Each subject: topics, prereqs, Core Path, boss | 41/41 | ✓ |
| Data in renders is real | Star counts, level titles, boss text, XP economy all generated from the graph and 03 tables | ✓ |
| Library versions & licenses checked | `npm view` on every candidate package (2026-11-23) | ✓ |
| Local git commit with your identity | See log | ✓ |

## Known issues / honest gaps

| Item | Note |
|---|---|
| Renders vs. product | Renders are a single frame from a prototype with software WebGL. Phase 2 must hit the same look at 60 fps on the Radeon iGPU; tiers in 04 §7. |
| Not yet rendered | Island zoom (stages as regions), level play chamber in the new style, stage/world celebrations, Atlas mode — designed in text, rendered in Phases 2–4. |
| Book references | Book-level per subject; chapter/section refs added per lesson from Phase 5. |
| XP totals | Estimated (~10 steps per lesson); re-tuned in Phase 4. |

## Decisions I need from you

| ID | Question | My recommendation |
|---|---|---|
| D1 | Allow Zlib license (`postprocessing`)? | Yes |
| D2 | Allow MPL-2.0 (Pyodide, unmodified)? | Yes |
| D3 | Approve the Isles of Computing look in the renders? | Yes |
| D4 | CodeMirror 6 instead of Monaco? | Yes |
| D5 | Vertical slice = Origins (Sunny Shores) + Operating Systems? | Yes |

## What Phase 1 will do

Scaffold Vite + React + TypeScript (strict) with ESLint, Prettier, Vitest and Playwright; build design tokens and the glass/gem component library matching the renders (profile card, chips, tool buttons, CTA, cards, modal); HUD shell and deep-link routes; move `curriculum.graph.yaml` into `content/graph/` behind a Zod schema that fails the build on broken edges, cycles or Core Path violations. Exact install commands will be listed for you to run.
