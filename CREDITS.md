# Credits & Licenses

Every third-party library, font, icon set or asset used by CS Universe, with its license. Allowed: MIT, Apache-2.0, BSD, ISC, OFL, CC0, CC-BY, public-domain dedications (Unlicense), plus owner-approved exceptions: **Zlib** (D1) and **MPL-2.0 for Pyodide only** (D2). Enforced by `npm run check:licenses`.

## Shipped libraries (production dependencies)

| Package | Version | License | Use |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | UI |
| @tanstack/react-router | 1.170.46 | MIT | Routing (pulls in isbot — Unlicense) |
| zustand | 5.1.0 | MIT | State |
| motion | 14.14.0 | MIT | UI springs |
| @radix-ui/react-dialog, @radix-ui/react-tooltip | 1.3.1, 1.4.1 | MIT | Accessible dialog/tooltip primitives |
| cmdk | 1.1.1 | MIT | Command palette |
| lucide-react | 1.78.0 | ISC | Icons |
| clsx | 2.1.1 | MIT | Class names |
| three | 0.187.0 | MIT | 3D engine |
| @react-three/fiber | 9.8.2 | MIT | React renderer for three.js |
| @react-three/drei | 10.7.9 | MIT | CameraControls, PerformanceMonitor (pulls in camera-controls MIT, three-stdlib MIT, detect-gpu MIT, webgl-constants MIT, hls.js Apache-2.0, @mediapipe/tasks-vision Apache-2.0) |
| @react-three/postprocessing | 3.2.2 | MIT | Bloom (High tier) |
| postprocessing | 6.39.6 | **Zlib** (approved D1) | Effect passes |
| @fontsource-variable/outfit, /inter, /jetbrains-mono | 5.3.0 | OFL-1.1 | Self-hosted fonts |
| ts-fsrs | 5.4.2 | MIT | FSRS spaced-review scheduler (no dependencies) |
| katex | 0.19.1 | MIT | Maths stylesheet and KaTeX fonts (MIT) for lessons; formulas are rendered at build time (pulls in commander — MIT) |

Transitive production packages: 127 in total, all checked by the script.

## Build & test tooling (not shipped)

Vite (MIT), @vitejs/plugin-react (MIT), TypeScript (Apache-2.0), @types/three (MIT), Tailwind CSS + @tailwindcss/vite (MIT), Zod (MIT), yaml (ISC), tsx (MIT), Vitest (MIT), jsdom (MIT), Testing Library (MIT), ESLint + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-jsx-a11y (MIT), globals (MIT), Prettier (MIT), Playwright (Apache-2.0).

Lesson compilation (build time only; the output is plain HTML/JSX, no runtime code shipped): @mdx-js/rollup 3.1.1 (MIT), remark-gfm 4.0.1 (MIT), remark-math 6.0.0 (MIT), rehype-katex 7.0.1 (MIT), shiki 4.6.0 and @shikijs/rehype 4.6.0 (MIT; theme `github-dark-default` MIT; TextMate grammars from the Shiki bundle are MIT-licensed and used only to colour code at build time), @types/mdx 2.0.14 (MIT).

## Fonts

| Font | Author | License |
|---|---|---|
| Outfit | Rodrigo Fuenzalida | SIL OFL 1.1 |
| Inter | Rasmus Andersson | SIL OFL 1.1 |
| JetBrains Mono | JetBrains | SIL OFL 1.1 |

## Images

| Asset | Source | License |
|---|---|---|
| `public/islands/*.webp`, `public/bg/archipelago.webp`, `docs/blueprint/renders/*` | Rendered by this project (`design/prototype/`, three.js) | Project's own |

## Design tooling (Phase 0 renders, not shipped)

three 0.187.0 (MIT), lucide-static 1.78.0 (ISC), @fontsource-variable/outfit & inter 5.3.0 (OFL-1.1).
