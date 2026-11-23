# Content — how the curriculum is organised

Everything a learner studies lives here, split so that **no subject is mixed with another**. The app reads nothing else.

## Hierarchy

| Level | Game name | Where it lives | Example |
|---|---|---|---|
| Domain | **World** (island) | `worlds/NN-<world-id>/world.yaml` | `worlds/01-origins/` |
| Subject | **Stage** | `worlds/NN-<world>/NN-<stage-id>/stage.yaml` | `01-origins/02-number-systems/` |
| Unit | Section of a stage | `units:` list inside `stage.yaml` | "Integer Arithmetic" |
| Topic | **Level** | `levels:` list inside a unit | `signed-numbers` |
| Lesson + test (Phase 3+) | Level play | `NN-<stage>/levels/<level-id>/lesson.mdx`, `test.yaml` | — |

`core-path.yaml` lists every stage once, in the order a complete beginner should meet them.

## Rules (enforced by `npm run content`; the build fails if any is broken)

| Rule | Detail |
|---|---|
| Folder names | `NN-id`: `NN` = the item's `order`, `id` = its `id` |
| Stage order | Stage numbers inside a world follow their order in `core-path.yaml` |
| Unique ids | World, stage and level ids are unique across the whole curriculum; unit ids unique within a stage |
| `requires` | Lists the levels that must be **Cleared** (level test passed) before this level unlocks. Any world/stage may be referenced. No cycles |
| Core Path | `core: true` levels may only require other core levels from the same or an earlier stage |
| One level, one idea | A level teaches one topic; its test only covers what its lesson teaches |

## Lessons and level tests

A level becomes playable when its folder exists: `worlds/NN-<world>/NN-<stage>/levels/<level-id>/` with two files.

| File | Content |
|---|---|
| `lesson.mdx` | Markdown + `<Step id section title>` blocks, one idea per step. Sections in this order, each at least once: `hook`, `intuition`, `formal`, `mechanism`, `worked-example`, `tradeoffs`, `pitfalls`, `context`, `references`. Also available: `<Callout kind="note\|tip\|warning">`, `<Simulation id goal>`, GFM tables, `$…$` / `$$…$$` maths (KaTeX), fenced code (Shiki) |
| `test.yaml` | `items:` pool (≥ 6). Formats: `mcq`, `numeric`, `predict-output`, `order-steps`, `spot-the-bug`, `match`. Every item names the step it checks with `teaches: <step-id>` and has an `explain` |

Build checks: folder name is a level of that stage; sections present and in order; unique step ids; known simulation ids; every `teaches` points to a step in a tested section (`intuition` → `pitfalls`); each tested section has an item; answer indices valid; no duplicate options. A test draws up to 10 items, at least one per tested section; 70 % clears (★), 90 % earns ★★.

## Adding a new stage

1. Create `worlds/NN-<world>/NN-<new-stage>/stage.yaml` (copy an existing one).
2. Add the stage id to `core-path.yaml` in the right place.
3. Run `npm run content` and fix any reported error.

## Adding a new world

1. Create `worlds/NN-<new-world>/world.yaml` with the next free `order`.
2. Add its stages as above.
No engine change is needed: the map, Atlas, search and checks all derive from these files.
