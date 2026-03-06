# Changelog

## [2026-03-06] — Annotation System Overhaul: `placeAnnotations()`

### Problem (Root Cause)
The previous `spreadAnnotationLabels()` approach was fundamentally broken:
- It mutated `labelPos.y` (pushing labels up/down) but left `anchor` at the original fixed position
- Result: leader lines became random diagonal angles — ugly from every camera view
- Heavy label CSS (border, box-shadow, semi-bold font) made labels feel clinical/rigid
- Simple ±30 Y alternation was too small for dense label clusters; labels still overlapped

### Solution
Replaced the entire annotation system with `placeAnnotations()` in `three-scene.ts`:

**New API:**
```typescript
placeAnnotations(
  scene: THREE.Scene,
  items: Array<{ anchor: THREE.Vector3; label: string; labelZ?: number }>,
  labelX: number,
  yRange: [number, number],
): void
```

**What it does differently:**
- Sorts items by `anchor.y` descending → top anchor gets top label (predictable)
- Evenly distributes labels across explicit `yRange` → guaranteed no overlap
- **Two-segment elbow line per annotation** — `anchor → knee (labelX-12, labelY) → label (labelX, labelY)` — structured, readable from any camera angle
- Both line segments: `depthTest:false`, `depthWrite:false`, `renderOrder:998`
- Annotation dots: `SphereGeometry(1.5)`, blue `0x3b82f6`, `renderOrder:999`
- Lightweight labels: `rgba(255,255,255,0.78)` bg, no border, no shadow, `font:400 10px/1.55 Inter`

### Kebodohan / Mistakes Made
1. **Spread-only approach doesn't work** — moving label Y without moving anchor creates diagonal lines. You MUST move both ends of the line together, or use an elbow where the horizontal segment is always at the label Y. We tried `spreadAnnotationLabels` 3 times across multiple sessions before figuring this out.
2. **`Object.assign` on position prop** — `Object.assign(new THREE.LineSegments(), { position: ... })` throws because `Object3D.position` is a read-only getter. Always use `.position.set()` or `.position.copy()`.
3. **Summarization mid-edit** — Token budget was hit exactly while editing the last file (`HermeticDoorExploded3D.tsx`), leaving it with broken imports. Continuation required reading the summarized context carefully.

### Changed
- `three-scene.ts` — Full rewrite of annotation section. New exports: `placeAnnotations`. Kept `spreadAnnotationLabels` + `createAnnotationLine/Dot/Label` as backward-compat utilities.
- All 6 viewer components migrated:
  - `AssembledPanel3D.tsx` → `placeAnnotations(scene, items, pw/2+68, [-ph/3, ph/3])`
  - `ExplodedPanel3D.tsx` → `placeAnnotations(scene, items, pw/2+68, [-ph/3, ph/3])`
  - `CurvingAssembled3D.tsx` → `placeAnnotations(scene, items, W+60, [-W*0.8, W*1.2])`
  - `CurvingExploded3D.tsx` → `placeAnnotations(scene, items, W+65, [-W*0.8, W*1.2])`
  - `HermeticDoorAssembled3D.tsx` → `placeAnnotations(scene, items, HW/2+35, [-DH/2+10, DH/2+HH+10])`
  - `HermeticDoorExploded3D.tsx` → `placeAnnotations(scene, items, DW/2+70, [-DH/2-15, DH/2+15])`

---

## [2026-03-06] — Hermetic Door: D-Profile Housing Overhaul

### Fixed
- **Housing shape mismatch (critical)** — Replaced `BoxGeometry` housing with `ExtrudeGeometry` using a true D-profile cross-section (rounded front corners, flat back) matching real medical hermetic door references. Previous flat box looked like "a sticker on top of a frame", not an integrated sliding mechanism housing.
- **Housing extrudes forward, not backward** — `ExtrudeGeometry` axis math: after `rotateY(-PI/2)` + `translate(HW/2, 0, 0)`, housing depth goes along Z; set `position.z = DT/2 - 4` so housing protrudes forward (+Z) from door face, not into wall.
- **Side-face artifact removed** — Reduced `HW` from `DW+80=240` → `DW+20=180`. Wide housing created a large flat end-cap face visible from angled views as an artifact.
- **Double top structure removed** — Deleted separate top frame `head` mesh; housing IS the top structure now, matching real hermetic doors.
- **Track rail floating** — Repositioned track to `housingY + 3` (just inside housing bottom) and added housing bottom flange spanning full frame width to visually bridge housing to jambs.
- **Rollers/ribs removed** — Replaced with cleaner track geometry; rollers were not visible at normal camera distances and added noise.
- **LED indicator Z position** — Updated sensor/indicator Z from complex formula to `sensorFaceZ = 0.15` (housing front face).

### Changed
- `HW` = DW+20 (180), `HH` = 42 (≈420mm real world), `HDT` = 28 (deep D-profile)
- Housing corner radius `HR = 7` — front corners rounded, back edge sharp
- Housing position: `set(0, DH/2, DT/2 - 4)` — bottom flush with door top, center at Z=1

---

## [2026-03-06] — Hermetic Door: Geometry Reference Accuracy

### Fixed
- **Door centered** (`DOOR_OFFSET = 0`) — closed position instead of sliding-open offset
- **Handle orientation** — Changed from horizontal D-bar to vertical bar (CylinderGeometry, no rotation.z) at right edge, centered height
- **EPDM rubber seals** — Added dark thin strips around all 4 door perimeter edges
- **Bump guard** — SS horizontal strip on front face, lower third
- **Floor guide rail** — Small SS channel at floor level

---

## [2026-03-04] — Annotation, Canvas Sizing & Sidebar Polish

### Fixed
- **Annotation lines** — Replaced diagonal leader lines in `AssembledPanel3D` and `ExplodedPanel3D` with clean orthogonal elbow leaders using `createAnnotationFull()`. Labels now spread evenly along panel height (assembled) or per-layer Z position (exploded). Removed `ANNOTATION_OFFSETS` lookup table.
- **Canvas height squeeze** — Root cause: `container.clientHeight` returned 0 when flex layout hadn't settled. Fixed by switching all 4 viewer components from `setTimeout(100ms)` race-condition pattern to `ResizeObserver`-based `init()` that fires only when container has nonzero `clientWidth` and `clientHeight`.
- **Canvas invisible after position:absolute attempt** — Reverted absolute-canvas approach; container had no intrinsic height so canvas rendered at 0×0. Correct fix: `canvas.style.width/height = '100%'` (CSS fills container) + `renderer.setSize(w, h)` via ResizeObserver `entry.contentRect`.
- **TypeError on LineSegments** — `Object.assign(new THREE.LineSegments(), { position: … })` throws because `Object3D.position` is a read-only getter/setter. Fixed with direct `edgeLines.position.z = zPos[1]`.
- **Deprecated shadow map** — Changed `PCFSoftShadowMap` → `THREE.VSMShadowMap` across all scenes.

### Added
- **Collapsible sidebar** — `Sidebar.tsx` rewritten: 56px collapsed (icons + active dot) / 260px expanded. Hover to auto-expand when pinned closed; pin toggle button. State lifted to `App.tsx` via `isOpen` + `onToggle` props.
- **`curving` viewer type** — New `viewerType: 'curving'` field on `Product`. `ProductViewer` routes to `CurvingAssembled3D` / `CurvingExploded3D` when set.
- **`CurvingAssembled3D.tsx`** — L-profile aluminium angle viewer: main body + vertical flange + anodized coating + silicone bead + pop rivet holes + annotation elbow leaders.
- **`CurvingExploded3D.tsx`** — Exploded view of same L-profile, layers stacked in Z with gap.
- **`curving.ts` product** — New product entry: Aluminium Angle 40×40, category `Pintu & Partisi`, views assembled + exploded.
- **`createAnnotationFull()`** exported from `lib/three-scene.ts` — all-in-one: dot + elbow line + sprite, elbow goes anchor → elbow → labelPos (orthogonal).

### Changed
- **`ProductViewer.tsx`** — Removed redundant inner `h3`/`p` view-title header. Viewer card is now `flex-1 min-h-0 overflow-hidden` — viewer component fills it directly, no extra padding.
- **`ViewerControls` / `CurvingViewerControls`** — Removed `p-3 rounded-lg shadow mb-3`. Replaced with `px-3 py-2 border-b border-gray-100 flex-shrink-0` — flatter bar, zero bottom margin stealing canvas height.
- **`App.tsx`** — Outer padding reduced from `p-4` → `p-3`, saving vertical space.
- **All 4 viewer `useEffect`s** — Full ResizeObserver init pattern:
  ```ts
  const init = () => {
    if (initialized || container.clientWidth < 1 || container.clientHeight < 1) return;
    initialized = true;
    ro.disconnect();
    // … createScene, build, startRenderLoop
  };
  const ro = new ResizeObserver(init);
  ro.observe(container);
  init(); // try immediately if already sized
  ```

---

## [2026-03-04] — Major Architecture Refactor

### Added
- `src/app/lib/three-scene.ts` — Shared Three.js engine. Exports: `createScene`, `startRenderLoop`, `disposeScene`, `applyCameraPreset`, `visualThickness`, `buildLayerMesh`, `createAnnotationSprite`, `createAnnotationDot`, `createAnnotationLine`, `downloadPNG`.
- `src/app/data/products.ts` — Pure type definitions only (no product data). Types: `Layer`, `CameraPreset`, `PanelDimensions`, `ProductSpec`, `ViewType`, `ProductCategory`, `Product`.
- `src/app/products/index.ts` — Product registry. `PRODUCTS[]` array + `getProductById()`. Only file to edit when registering a new product.
- `src/app/products/sandwich-radiasi.ts` — Panel Dinding, 5 layers (includes Timbal 2mm lead shielding), views: assembled + exploded.
- `src/app/products/sandwich-standard.ts` — Panel Dinding, 4 layers (no lead), views: assembled + exploded.
- `src/app/products/cleanroom.ts` — Cleanroom category, 4 layers (HPL + Mineral Wool), views: assembled + exploded.
- `src/app/components/Sidebar.tsx` — Left navigation (260px). Groups products by `product.category`, collapsible sections, live search/filter, color swatch from first layer.
- `src/app/components/ProductViewer.tsx` — Viewer orchestrator. Tabs rendered only for views in `product.views`. Product info header with layer list + spec table.

### Changed
- `src/app/components/AssembledPanel3D.tsx` — Fully refactored to use shared engine (`lib/three-scene.ts`). Removed ~200 lines of boilerplate. Added `ViewerControls` as a named export (reusable).
- `src/app/components/ExplodedPanel3D.tsx` — Fully refactored to use shared engine. Imports `ViewerControls` from `AssembledPanel3D`.
- `src/app/App.tsx` — Rewritten from horizontal card UI to `flex h-screen` sidebar layout using `<Sidebar>` + `<ProductViewer>`. Products imported from `./products/index`.
- `.github/copilot-instructions.md` — Fully rewritten to reflect new architecture (was describing old inline-product pattern).

### Architecture Notes
- **Per-product file pattern**: Each product lives in its own `src/app/products/<slug>.ts` with `export default`. This keeps product files independent and avoids any single file bloat.
- **Shared engine pattern**: All Three.js boilerplate (~150 lines) is centralised in `lib/three-scene.ts`. Adding a new viewer type costs ~50 lines, not 200.
- **Feature flags per product**: `views: ViewType[]` on each product controls which tabs appear — no conditionals needed in viewer components.
- **Category grouping**: `product.category` drives sidebar grouping. Add a new `ProductCategory` string literal in `data/products.ts` if a new category is needed.

---

## [Pre-2026-03-04] — Initial Multi-Product Support

### Added
- `product` prop on `AssembledPanel3D` and `ExplodedPanel3D` (replaced hardcoded `LAYERS` arrays).
- Inline `PRODUCTS` array in `data/products.ts` with 3 products.
- Horizontal product selector cards in `App.tsx`.
