# CS Universe — Isles of Computing

A free, browser-based 3D island-adventure game for learning the foundations of computer science. Every topic is a level on a winding road across 12 island worlds: study it, pass its level test to clear it, earn up to 3 stars, beat each stage's castle boss.

| Status | Phase 3 — Lesson Experience & Level Test (awaiting approval) |
|---|---|
| Phase reports | [Phase 0](docs/blueprint/README.md) · [Phase 1](docs/phases/phase-1.md) · [Phase 2](docs/phases/phase-2.md) · [Phase 3](docs/phases/phase-3.md) |
| Curriculum | [docs/blueprint/02-curriculum.md](docs/blueprint/02-curriculum.md) · source: [content/](content/) (one folder per world, one per stage) |
| World concept + renders | [docs/blueprint/01-world-and-experience.md](docs/blueprint/01-world-and-experience.md) |
| Credits & licenses | [CREDITS.md](CREDITS.md) |

## Run it (Windows PowerShell)

Requires Node.js 22 or newer.

```powershell
cd "C:\Users\brajd\Desktop\CS UNIVERSE"
npm ci
npm run dev
```
Open the URL Vite prints (normally `http://localhost:5173`). `/` is the 3D World Map, `/atlas` the 2D Atlas. Press **F3** in the 3D world for the performance overlay; graphics quality is under Settings (gear icon).

| Command | What it does |
|---|---|
| `npm run content` | Validates every file in `content/` and lessons, and compiles `src/generated/curriculum.json` + `lessons.json` (runs automatically before dev, build, test) |
| `npm run content:doc` | Same, and regenerates `docs/blueprint/02-curriculum.md` |
| `npm run build` | Content check → type check → production build in `dist/` |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Static checks |
| `npm test` | Unit + component tests (Vitest) |
| `npx playwright install chromium` then `npm run test:e2e` | End-to-end tests (builds must exist: run `npm run build` first) |
| `npm run check:licenses` | Fails if a shipped dependency has a disallowed license |

Cost to run: ₹0.
