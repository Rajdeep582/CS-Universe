# Design prototype (Phase 0 renders)

Throwaway design tooling that produced `docs/blueprint/renders/*.png`. **Not app code and not shipped.** Phase 2 may reuse its ideas (terrain heightfield, water shader, instanced decor) but rewrites them properly in `src/engine/world/`.

| File | Purpose |
|---|---|
| `scene.js` | three.js scene: procedural islands, water shader, instanced trees/rocks/buildings, castle, level pedestals; HTML/CSS overlay UI |
| `ui.css` | Premium glass HUD, labels, level-clear modal |
| `data.js` | Data generated from `curriculum.graph.yaml` (worlds, star counts, Number Systems stage) |
| `validate_graph.py` | Phase 0 curriculum validator (DAG, refs, Core Path closure) |
| `shot.py` | Headless capture (Playwright, Python) |

## View it (PowerShell)

```powershell
cd "design\prototype"
npm install three@0.187.0 @fontsource-variable/outfit@5.3.0 @fontsource-variable/inter@5.3.0 lucide-static@1.78.0
python -m http.server 8765
```

Open `http://localhost:8765/?view=world`, `?view=stage` or `?view=clear` (window must be 1600×900 CSS px for the intended framing).

## Validate the curriculum

```powershell
python design\prototype\validate_graph.py docs\blueprint\curriculum.graph.yaml graph.json
```
Needs `pip install pyyaml`.
