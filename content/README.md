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

## Adding a new stage

1. Create `worlds/NN-<world>/NN-<new-stage>/stage.yaml` (copy an existing one).
2. Add the stage id to `core-path.yaml` in the right place.
3. Run `npm run content` and fix any reported error.

## Adding a new world

1. Create `worlds/NN-<new-world>/world.yaml` with the next free `order`.
2. Add its stages as above.
No engine change is needed: the map, Atlas, search and checks all derive from these files.
