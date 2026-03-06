# 3D Product Catalog - AI Coding Instructions

## Project Overview
React + Three.js + TypeScript — print-quality 3D visualizations of medical facility building products.
`npm run dev` (Vite, port 5173/5174) | `npm run build`

---

## Architecture (as of 2026-03-06)

```
src/app/
  data/
    products.ts          ← TYPE DEFINITIONS only (Layer, Product, ViewType, etc.)
  products/
    index.ts             ← PRODUCT REGISTRY — only file to edit when adding a product
    sandwich-radiasi.ts
    sandwich-standard.ts
    cleanroom.ts
    hermetic-door.ts     ← Custom viewerType: 'hermetic-door'
    curving-r40.ts       ← Custom viewerType: 'curving'
  lib/
    three-scene.ts       ← SHARED Three.js engine (renderer, lights, controls, helpers)
  hooks/
    useThreeScene.ts     ← Scene lifecycle hook (init on mount, dispose on unmount)
  components/
    Sidebar.tsx                  ← Left nav (260px), category grouping, search
    ProductViewer.tsx            ← Orchestrator: routes viewerType, tabs per product.views
    AssembledPanel3D.tsx         ← Default assembled view (panel products)
    ExplodedPanel3D.tsx          ← Default exploded view (panel products)
    CurvingAssembled3D.tsx       ← Curving R40 assembled
    CurvingExploded3D.tsx        ← Curving R40 exploded
    HermeticDoorAssembled3D.tsx  ← Hermetic door assembled (D-profile housing)
    HermeticDoorExploded3D.tsx   ← Hermetic door exploded (panel layers)
    HermeticDoorLegend.tsx       ← Color swatches (standalone, not inside viewer)
    ViewerControls.tsx           ← Reusable camera preset + download bar
    WallPanelViewer.tsx          ← Legacy 2D canvas viewer (do not touch)
  App.tsx                ← Shell layout: flex h-screen Sidebar + main
```

---

## Scale Convention

**1 scene unit ≈ 10mm**
- Door 1600×2100mm → `DW=160, DH=210`
- Panel 1200mm wide → `sceneWidth=120`
- Always store real-world mm in product data; scale only in viewer code

---

## Adding a Standard Panel Product

1. Create `src/app/products/<slug>.ts` (no `viewerType` field = default panel viewer):

```typescript
import type { Product } from '../data/products';
const MY_PANEL: Product = {
  id: 'my-panel',
  name: 'Nama Singkat',
  fullName: 'Nama Lengkap',
  description: '...',
  category: 'Panel Dinding',
  views: ['assembled', 'exploded'],
  layers: [
    { name: 'Baja AZ100', thickness: 0.5, color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
  ],
  dimensions: { widthMm: 1200, heightMm: 3000, sceneWidth: 120, sceneHeight: 300 },
  specs: [{ label: 'Aplikasi', value: 'Ruang Operasi' }],
  cameraPresets: [
    { name: 'Front Isometric', position: [250, 180, 350], target: [0, 0, 0] },
  ],
  assembledCameraStart: [250, 180, 350],
  explodedCameraStart:  [350, 200, 450],
};
export default MY_PANEL;
```

2. Register in `src/app/products/index.ts`. **No other files need changing.**

---

## Adding a Custom Viewer Type

For products that need their own 3D scene (not a panel layer stack):

1. Add literal to `viewerType` union in `src/app/data/products.ts`
2. Add `viewerType: 'my-type'` to product file
3. Create `src/app/components/MyTypeAssembled3D.tsx` and `MyTypeExploded3D.tsx`
4. Add routing in `src/app/components/ProductViewer.tsx`
5. Register product in `src/app/products/index.ts`

**Reference:** `hermetic-door` product + `HermeticDoorAssembled3D.tsx`

---

## Shared Engine: `lib/three-scene.ts`

| Export | Purpose |
|--------|---------|
| `createScene({ container, cameraStart, minDistance?, maxDistance? })` | Renderer, camera, 4-point lights, OrbitControls, ResizeObserver. Returns `SceneRefs`. |
| `startRenderLoop(refs)` | RAF loop. Returns `stop()` fn. |
| `disposeScene(refs, container)` | Full cleanup — call in useEffect cleanup. |
| `applyCameraPreset(refs, position, target)` | Moves camera to preset. |
| `visualThickness(layer)` | Scales thin layers for visibility. |
| `buildLayerMesh(layer, w, h, t)` | `THREE.Group` with MeshStandardMaterial + EdgesGeometry. |
| `createLabel(scene, position, text)` | CSS2DObject label (always faces camera). Lightweight: no border, no shadow. |
| `createAnnotationDot(pos)` | Blue (`0x3b82f6`) sphere at anchor. depthTest:false, renderOrder:999. |
| `createAnnotationLine(scene, from, to)` | Gray leader line. depthTest:false, renderOrder:998. |
| `placeAnnotations(scene, items, labelX, yRange)` | **PRIMARY API** — place all annotations at once. See below. |
| `downloadPNG(renderer, filename)` | Save canvas as PNG. |

### `placeAnnotations()` — PRIMARY Annotation API

**ALWAYS use this. NEVER call createAnnotationDot/Line/Label individually for layer annotations.**

```typescript
placeAnnotations(
  scene: THREE.Scene,
  items: Array<{ anchor: THREE.Vector3; label: string; labelZ?: number }>,
  labelX: number,      // X position of label column (right side of geometry)
  yRange: [number, number], // [yMin, yMax] — vertical spread range for labels
): void
```

**How it works:**
1. Sorts items by `anchor.y` descending (top anchor → top label)
2. Distributes labels evenly across `yRange`
3. Draws **two-segment elbow**: `anchor → knee(labelX-12, labelY) → label(labelX, labelY)`
4. Both segments: `depthTest:false`, `renderOrder:998`
5. Calls `createAnnotationDot(anchor)` + `createLabel(scene, labelPos, label)`

**Usage pattern:**
```typescript
const annotItems: { anchor: THREE.Vector3; label: string; labelZ?: number }[] = [];

layers.forEach((layer, i) => {
  const z = /* layer center Z */;
  annotItems.push({
    anchor: new THREE.Vector3(geometryRightEdge, 0, z),
    label: layer.name,
    labelZ: z,   // optional: forces label Z to match layer (use in exploded views)
  });
});

placeAnnotations(scene, annotItems, geometryRightEdge + 70, [yMin, yMax]);
```

**Per-viewer labelX and yRange values:**
| Viewer | labelX | yRange |
|--------|--------|--------|
| AssembledPanel3D | `pw/2 + 68` | `[-ph/3, ph/3]` |
| ExplodedPanel3D | `pw/2 + 68` | `[-ph/3, ph/3]` |
| CurvingAssembled3D | `W + 60` | `[-W*0.8, W*1.2]` |
| CurvingExploded3D | `W + 65` | `[-W*0.8, W*1.2]` |
| HermeticDoorAssembled3D | `HW/2 + 35` | `[-DH/2+10, DH/2+HH+10]` |
| HermeticDoorExploded3D | `DW/2 + 70` | `[-DH/2-15, DH/2+15]` |

### ⚠️ DO NOT use `spreadAnnotationLabels()` for new code
`spreadAnnotationLabels` mutates `labelPos.y` but keeps `anchor` fixed → lines become random diagonals at ugly angles from any non-front camera. It was tried and failed 3+ times. It remains in the codebase for backward compat only — **don't use it**.

### Visual Thickness Scaling (do not change)
```typescript
if (layer.thickness < 1) return layer.thickness * 20;  // coatings/foil
if (layer.thickness < 5) return layer.thickness * 8;   // lead, thin sheets
return layer.thickness;                                  // normal — no scale
```

### Standard Renderer Config
```typescript
{ antialias: true, alpha: true, preserveDrawingBuffer: true }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMappingExposure = 1.2;
```

### 4-Point Lighting
Ambient 0.6 + Key DirectionalLight top-front 1.8 (shadow 4096px) + Cool fill left 1.0 + Warm rim back-right 0.6.

### RoomEnvironment (use in custom viewers)
```typescript
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
```

---

## Hermetic Door — Key Details

File: `src/app/components/HermeticDoorAssembled3D.tsx`

### Constants (scene units)
```
DW=160, DH=210, DT=10   — door panel
HW=DW+20=180, HH=42, HDT=28  — housing (D-profile aluminum extrusion)
FT=8                     — frame jamb thickness
DOOR_OFFSET=0            — closed position
```

### Housing Shape (ExtrudeGeometry — CRITICAL axis math)
Housing cross-section is a D-profile (rounded front corners, flat back):
```typescript
const hProf = new THREE.Shape();
// shape.x = world Z (depth), shape.y = world Y (height)
hProf.moveTo(-HDT/2, 0);
hProf.lineTo(-HDT/2, HH);
hProf.lineTo(HDT/2 - HR, HH);
hProf.quadraticCurveTo(HDT/2, HH, HDT/2, HH-HR);
hProf.lineTo(HDT/2, HR);
hProf.quadraticCurveTo(HDT/2, 0, HDT/2-HR, 0);
hProf.lineTo(-HDT/2, 0);

const housingGeo = new THREE.ExtrudeGeometry(hProf, { depth: HW, bevelEnabled: false });
housingGeo.rotateY(-Math.PI / 2);   // extrusion Z → world -X; profile X → world Z
housingGeo.translate(HW / 2, 0, 0); // center along world X

const housing = new THREE.Mesh(housingGeo, mat);
housing.position.set(0, DH/2, DT/2 - 4);  // protrudes FORWARD (+Z), bottom flush with door top
```

**Traps:**
- `position.z = -HDT/2` → goes into wall (WRONG)
- `HW > DW+40` → visible flat end-cap artifact from angled camera
- No separate top frame head — housing IS the top structure

### Materials
```
SS:    0xd0dde6, metalness 0.92, roughness 0.08
Glass: 0x9ed4e8, metalness 0.0,  roughness 0.03, opacity 0.45
Lead:  0x7a7f85, metalness 0.75, roughness 0.35
Frame: 0x505860, metalness 0.72, roughness 0.28
```

---

## Component Contracts

### `useThreeScene` hook
```typescript
const mountRef = useRef<HTMLDivElement>(null);
useThreeScene(mountRef, (scene, renderer) => {
  // build your scene here — called once container has real dimensions
  return () => { /* cleanup */ };
});
```

### `ViewerControls`
```typescript
<ViewerControls
  presets={product.cameraPresets}
  activePreset={activePreset}
  onPreset={(p) => applyCameraPreset(refs, p.position, p.target)}
  onDownload={(name) => downloadPNG(renderer, `${product.id}-${name}.png`)}
  onDownloadAll={() => { /* loop presets */ }}
/>
```

### Viewer layout pattern
```tsx
<div className="w-full h-full flex flex-col">
  <ViewerControls ... />
  <div className="flex-1 min-h-0">
    <div ref={mountRef} className="w-full h-full" />
  </div>
</div>
```
**Do not put anything inside the `flex-1` div besides the mount ref** — legend/info panels outside compress canvas height.

---

## CSS2D Annotations

All annotations use `CSS2DRenderer` (already set up in `createScene`).

```typescript
// All annotations on the same side (right), spread by Y
const LABEL_X = HW / 2 + 30;
annotList.forEach(({ pos, label }) => {
  const labelPos = new THREE.Vector3(LABEL_X, pos.y, 0);
  scene.add(createAnnotationDot(pos));
  createAnnotationLine(scene, pos, labelPos);
  createLabel(scene, labelPos, label);
});
```

**Known issue:** When multiple annotations have similar Y values, labels overlap. Stagger `labelPos.y` if needed.

---

## Skills to Always Activate

When working on this codebase, **always load the relevant skills** before coding.
Skills live in `C:\Users\warma\.claude\skills\` (Claude Code) and `C:\Users\warma\.gemini\antigravity\skills\` (Gemini/other agents).

### 3D / Three.js Work
| Task | Skill |
|------|-------|
| Any Three.js scene, geometry, renderer | `@threejs-skills` |
| 3D product configurator, interactive 3D, WebGL | `@3d-web-experience` |
| GLSL shaders, custom materials, post-processing | `@shader-programming-glsl` |

### UI / Design Work
| Task | Skill |
|------|-------|
| Building or styling any React component / page | `@frontend-design` |
| Color palettes, typography, UX patterns, a11y audit | `@ui-ux-pro-max` |
| Web accessibility & UI compliance review | `@web-design-guidelines` |
| Creating UI screens in Google Stitch | `@stitch-ui-design` |
| Creating poster / static visual art (PNG/PDF) | `@canvas-design` |
| Synthesizing DESIGN.md from Stitch project | `@design-md` |
| Orchestrating multi-step design workflow | `@design-orchestration` |

### Code Quality
| Task | Skill |
|------|-------|
| React / Next.js performance review | `@react-best-practices` |
| TypeScript types, patterns, strict mode | `@typescript-expert` |

### When to use multiple skills
- New 3D viewer component → `@threejs-skills` + `@3d-web-experience` + `@frontend-design`
- UI overhaul / redesign → `@ui-ux-pro-max` + `@frontend-design` + `@web-design-guidelines`
- Shader / custom material → `@shader-programming-glsl` + `@threejs-skills`
- Stitch design → `@stitch-ui-design` + `@design-md` + `@design-orchestration`

---

## Conventions
- All UI text and specs in **Indonesian**
- No auto-rotation — manual OrbitControls only
- Download filenames: `{product.id}-{view}-{angle}.png`
- Never combine assembled/exploded logic into one component
- `WallPanelViewer.tsx` is legacy — do not modify

---

## Current Products (5)

| id | Name | Category | viewerType | Views |
|----|------|----------|------------|-------|
| `sandwich-radiasi` | Sandwich + Radiasi | Panel Dinding | panel (default) | assembled, exploded |
| `sandwich-standard` | Sandwich Standard | Panel Dinding | panel (default) | assembled, exploded |
| `cleanroom` | Cleanroom Panel | Cleanroom | panel (default) | assembled, exploded |
| `curving-r40` | Curving R40 | Pintu & Partisi | curving | assembled, exploded |
| `hermetic-door` | Hermetic Auto Sliding Door | Pintu & Partisi | hermetic-door | assembled, exploded |
