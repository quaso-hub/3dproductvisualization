# 3D Product Catalog - AI Coding Instructions

## Project Overview
React + Three.js + TypeScript — print-quality 3D visualizations of medical facility sandwich panels.
`npm run dev` (Vite, port 5173/5174) | `npm run build`

---

## Architecture (as of 2026-03-04)

```
src/app/
  data/
    products.ts          ← TYPE DEFINITIONS only (Layer, Product, ViewType, etc.)
  products/
    index.ts             ← PRODUCT REGISTRY — only file to edit when adding a product
    sandwich-radiasi.ts  ← Individual product file
    sandwich-standard.ts ← Individual product file
    cleanroom.ts         ← Individual product file
  lib/
    three-scene.ts       ← SHARED Three.js engine (renderer, lights, controls, helpers)
  components/
    Sidebar.tsx          ← Left nav (260px), category grouping, search
    ProductViewer.tsx    ← Orchestrator: tabs per product.views, spec panel
    AssembledPanel3D.tsx ← 3D assembled view  (uses lib/three-scene)
    ExplodedPanel3D.tsx  ← 3D exploded view   (uses lib/three-scene)
    WallPanelViewer.tsx  ← Legacy 2D canvas viewer (standalone, untouched)
  App.tsx                ← Shell layout: flex h-screen Sidebar + main
```

---

## Adding a New Product (THE ONLY WORKFLOW)

1. Create `src/app/products/<slug>.ts`:

```typescript
import type { Product } from '../data/products';

const MY_PANEL: Product = {
  id: 'my-panel',           // unique slug — used in download filenames
  name: 'Nama Singkat',     // shown in sidebar
  fullName: 'Nama Lengkap',
  description: '...',
  category: 'Panel Dinding', // 'Panel Dinding' | 'Cleanroom' | 'Plafon' | 'Lantai' | 'Pintu & Partisi' | 'Lainnya'
  badge: 'Label',            // optional
  badgeColor: 'bg-green-100 text-green-700', // optional Tailwind pair
  views: ['assembled', 'exploded'], // omit 'exploded' if not needed
  layers: [
    { name: 'Baja AZ100', thickness: 0.5, color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
    // up to N layers — use real-world mm values, scaling is automatic
  ],
  dimensions: { widthMm: 1200, heightMm: 3000, sceneWidth: 120, sceneHeight: 300 },
  specs: [{ label: 'Aplikasi', value: 'Ruang Operasi' }],
  cameraPresets: [
    { name: 'Front Isometric', position: [250, 180, 350], target: [0, 0, 0] },
    { name: 'Side Detail',     position: [400, 100, 50],  target: [0, 0, 0] },
    { name: 'Top View',        position: [0, 450, 0],     target: [0, 0, 0] },
    { name: 'Layer Detail',    position: [150, 80, 280],  target: [0, 0, 0] },
    { name: 'Front Elevation', position: [0, 0, 400],     target: [0, 0, 0] },
    { name: 'Side Elevation',  position: [400, 0, 0],     target: [0, 0, 0] },
  ],
  assembledCameraStart: [250, 180, 350],
  explodedCameraStart:  [350, 200, 450],
};

export default MY_PANEL;
```

2. Register in `src/app/products/index.ts`:
```typescript
import myPanel from './my-panel';
export const PRODUCTS: Product[] = [ ..., myPanel ];
```

**No other files need to be changed.**

---

## Shared Engine: `lib/three-scene.ts`

All boilerplate lives here. Viewer components just call:

| Export | Purpose |
|--------|---------|
| `createScene({ container, cameraStart })` | Bootstraps renderer, camera, 4-point lights, OrbitControls. Returns `SceneRefs`. |
| `startRenderLoop(refs)` | RAF loop. Returns `stop()` function. |
| `disposeScene(refs, container)` | Full cleanup — call in useEffect cleanup. |
| `applyCameraPreset(refs, position, target)` | Animates camera to preset. |
| `visualThickness(layer)` | Scales thin layers for visibility (see below). |
| `buildLayerMesh(layer, w, h, t)` | Returns `THREE.Group` with MeshStandardMaterial + EdgesGeometry outline. |
| `createAnnotationSprite(text)` | 850x200 canvas sprite (depthTest:false). |
| `createAnnotationDot(pos)` | Black sphere dot at panel edge. |
| `createAnnotationLine(from, to)` | Black line from dot to label. |
| `downloadPNG(renderer, filename)` | Saves current canvas as PNG. |

### Visual Thickness Scaling (CRITICAL — do not change)
```typescript
if (layer.thickness < 1) return layer.thickness * 20;  // coatings
if (layer.thickness < 5) return layer.thickness * 8;   // lead etc.
return layer.thickness;                                  // normal layers
```
Always store **real-world mm values** in product files. Scaling is automatic.

### Renderer Config (always these settings)
```typescript
{ antialias: true, alpha: true, preserveDrawingBuffer: true }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

### 4-Point Lighting (standard)
Ambient 0.6 + Key DirectionalLight top-front 1.8 (shadow 4096px) + Cool fill left 1.0 + Warm rim back-right 0.6.

---

## Component Contracts

### `AssembledPanel3D` / `ExplodedPanel3D`
- Accept single `product: Product` prop
- Use `refsRef = useRef<ReturnType<typeof createScene>>()` pattern (not individual scene/camera/renderer refs)
- `useEffect([product])` — full scene rebuild on product change
- Parent uses `key={product.id}` to force remount on product switch

### `ViewerControls` (exported from `AssembledPanel3D.tsx`)
- Reusable camera preset buttons + download buttons
- Imported by `ExplodedPanel3D` too

### `Sidebar`
- Props: `products`, `selected`, `onSelect`
- Groups by `product.category` using `CATEGORY_ORDER` constant
- Collapsible sections, search filter, color swatch from first layer

### `ProductViewer`
- Reads `product.views` — only renders tabs for declared views
- A product with `views: ['assembled']` shows NO exploded tab
- Resets active tab to `product.views[0]` on product change

---

## Types (`src/app/data/products.ts` — types only, no data)

```typescript
type ViewType        = 'assembled' | 'exploded';
type ProductCategory = 'Panel Dinding' | 'Cleanroom' | 'Plafon' | 'Lantai' | 'Pintu & Partisi' | 'Lainnya';

interface Product {
  id: string; name: string; fullName: string; description: string;
  category: ProductCategory;
  badge?: string; badgeColor?: string;
  views: ViewType[];
  layers: Layer[];
  dimensions: PanelDimensions;
  specs: ProductSpec[];
  cameraPresets: CameraPreset[];
  assembledCameraStart: [number, number, number];
  explodedCameraStart:  [number, number, number];
}
```

---

## Conventions
- All UI text and specs in **Indonesian**
- `sceneWidth/sceneHeight` = Three.js units (`120 ≈ 1200mm`)
- Download filenames: `{product.id}-assembled-{angle}.png` / `{product.id}-exploded-{angle}.png`
- Never combine assembled/exploded logic into one component
- No auto-rotation — manual OrbitControls only
- `WallPanelViewer.tsx` is legacy — do not modify unless explicitly asked

---

## Current Products (3)

| id | Name | Category | Views |
|----|------|----------|-------|
| `sandwich-radiasi` | Sandwich + Radiasi | Panel Dinding | assembled, exploded |
| `sandwich-standard` | Sandwich Standard | Panel Dinding | assembled, exploded |
| `cleanroom` | Cleanroom Panel | Cleanroom | assembled, exploded |
