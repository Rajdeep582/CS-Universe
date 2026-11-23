# Phase 0 — Vision & Blueprint (report)

> Personas: Principal Product Architect · Learning Scientist / CS Professor · Game Systems Designer · Technical Artist (+ UI/UX, Frontend Architect for 04).
> Status: **complete, waiting for approval.** No app code written.

## Deliverables

| # | Deliverable | File |
|---|---|---|
| 1 | Vision document | [00-vision.md](00-vision.md) |
| 2 | 3 world-metaphor concepts with sketches + recommendation (Stellar Arbor), zoom levels, camera, visual language, HUD, lesson chamber, Atlas | [01-world-and-experience.md](01-world-and-experience.md), [sketches/](sketches/) |
| 3 | Full curriculum graph — machine-readable | [curriculum.graph.yaml](curriculum.graph.yaml) |
| 4 | Full curriculum graph — readable (domains → subjects → units → topics → prereqs, Core Path, bosses, sources) | [02-curriculum.md](02-curriculum.md) |
| 5 | Reward & progression design | [03-progression-and-rewards.md](03-progression-and-rewards.md) |
| 6 | Architecture, tech decisions, license audit | [04-architecture.md](04-architecture.md) |
| 7 | Risk list | [05-risks.md](05-risks.md) |
| 8 | Phase roadmap | [06-roadmap.md](06-roadmap.md) |

## Acceptance checklist

| Criterion (master prompt) | Verified how | ✓ |
|---|---|---|
| No app code in Phase 0 | Repo contains only docs, data and sketches | ✓ |
| 2–3 metaphor concepts with sketches and reasoning | 3 concepts, scored on 6 criteria, rendered from the real graph | ✓ |
| One recommendation | Stellar Arbor, mapped against every §2 required property | ✓ |
| Graph is a DAG with multi-parent edges | Validator: 0 cycles (topic and subject level), 806 edges, 260 cross-subject | ✓ |
| ≥ 4 zoom levels | Universe → Domain → Subject → Topic → Lesson | ✓ |
| Coverage of all prompt tiers 0–5 | 12 domains / 41 subjects / 581 topics; Frontiers reserved | ✓ |
| Core Path for a zero-knowledge start | 337 core topics; closure check proves no core topic needs an off-path or later topic; single root `what-is-computer` | ✓ |
| Each subject: topics, prereqs, Core Path, boss | 41/41 subjects have all four | ✓ |
| Reward/progression design | XP table, 16 ranks with thresholds, mastery tiers, FSRS, streaks, celebrations, bosses, achievements, ethics | ✓ |
| Architecture & tech decisions | Module map, contracts, routes, persistence, perf & a11y strategy, quality gates | ✓ |
| Library current versions & licenses checked | `npm view` on 44 packages (2026-11-23); 2 rejected, 2 need approval | ✓ |
| Risk list | 16 risks with mitigation and owning phase | ✓ |
| Phase roadmap (headings only) | 06-roadmap.md | ✓ |
| Sketches checked visually | Rendered to PNG and reviewed; LRU mock trace re-computed against the textbook trace | ✓ |
| Local git commit with your identity | See commit log | ✓ |

## Known issues / honest gaps

| Item | Note |
|---|---|
| Book references | Book-level per subject. Chapter/section references are added and checked per lesson when written (Phase 5+). |
| Sketches | Design sketches in 2D SVG, not the final 3D look. Real shaders/lighting come in Phase 2. |
| XP totals | Estimated from an assumed ~10 steps per lesson; re-tuned in Phase 4 with real lesson data. |
| Topic estimates | `estMinutes` per topic not yet set; filled in when lessons are written. |
| 1,000+ node scale | Current graph has 581 topics; Phase 2 adds a synthetic 1,000+ stress graph to prove the budget. |

## Decisions I need from you

| ID | Question | My recommendation |
|---|---|---|
| D1 | Allow Zlib license (`postprocessing`)? | Yes |
| D2 | Allow MPL-2.0 (Pyodide, unmodified)? | Yes |
| D3 | Approve Stellar Arbor world? | Yes |
| D4 | CodeMirror 6 instead of Monaco? | Yes |
| D5 | Vertical slice = Origins + Operating Systems? | Yes |

## What Phase 1 will do

Scaffold Vite + React + TypeScript (strict) with ESLint, Prettier, Vitest and Playwright; build the design-token system and the premium glass/3D component library; ship the HUD shell and deep-link routes; move `curriculum.graph.yaml` into `content/graph/` behind a Zod schema so the build fails on any broken edge, cycle or Core Path violation. Exact install commands will be listed for you to run.
