# Changelog

---

## [2026-05-25 - Session 10] - Hermetic Door rebuild + Highlight system foundation

> **Context**: User feedback dari sesi review: 9 issues per produk + permintaan kreasikan animasi 90° (PbLead pattern) untuk semua produk + tambahan fitur highlight/dim ketika sorot/klik label↔part. Sesi ini eksekusi Item 1 (hermetic door) + Item 2A (highlight system foundation + pilot). Run dipecah agar tidak hit context limit.

### Research

**Created (3 reports, ~100 KB total):**
- `docs/research/2026-05-24-highlight-dim-pattern.md` — 8 approach comparison, recommendation: material-property tween + scale-up + CSS class (no postprocessing). Rejects OutlinePass + selective bloom karena conflict dengan on-demand renderer + `shadowMap.autoUpdate=false`.
- `docs/research/2026-05-24-scenario-animations-per-product.md` — per-product animation strategy untuk 13 products. Implementation order: pacs-cabinet → ceiling-panel → hermetic-door → pass-box → laf-system → scrub-sink → hvac-system. Shared primitive: `useScenario` + 6 cluster controllers.
- `docs/research/2026-05-24-3d-viewer-ux-patterns.md` — 15 UX patterns (Apple/Sketchfab/Tesla benchmarks), 12 anti-patterns, full interaction grammar, onboarding spec.

### Item 1 — Hermetic Door rebuild

**Modified:**
- `src/app/components/HermeticDoorAssembled3D.tsx` — wall belakang door (`wallMesh` 192×226×2 di Z=-50) **dihapus** karena menghalangi scenario open/close mode (Item 2B nanti). `matWall` retained sebagai reference (void-tagged).
- `src/app/components/HermeticDoorExploded3D.tsx` — full rewrite (267 → 369 lines). Sebelum: hanya 5 panel cross-section + glass. Sesudah: **semua komponen exploded** (panel 5-layer cross-section, glass forward, frame radial outward, housing up, track rail, handle, sensor, floor guide, Pb stripe, EPDM gasket) dengan dashed connector ke posisi assembled.
- `src/app/products/hermetic-door.ts` — camera presets diperluas (Isometric 220→320, 160→200, 300→420; Tampak Depan z 350→500; Samping x 350→500; Atas y 450→600). `explodedCameraStart` 320,80,520 → 380,100,580 untuk fit semua exploded components.

**Visual verified**: 8 screenshots di `visual-inspection-screenshots-item1-after/`. Build green, zero pageerror, gzip 2.78 KB exploded (no growth).

### Item 2A — Highlight system foundation + Hermetic pilot

**Created:**
- `src/app/lib/viz-interaction-tokens.ts` (98 lines) — single source of truth untuk timing (DURATION.highlight=250ms, cameraFly=350ms), easing (EASING_CSS.standard, EASE.outCubic JS fn), HIGHLIGHT (emissiveIntensity 0.35, scale 1.04), DIM (opacity 0.25), TOUCH (targetMin 44px), Z_INDEX layers, `prefersReducedMotion()`/`isCoarsePointer()` helpers.
- `src/app/lib/highlight-controller.ts` (379 lines) — class `HighlightController` dengan: scanScene (walk userData.partId), label sync via `data-part-id`, raycaster throttled 33ms, single rAF tween loop, material clone-on-first-highlight (skip sentinel-shared materials), Escape keybinding, public API (setHover/pin/togglePin/clearPin), full disposal restore originals.
- `src/app/hooks/useHighlightController.ts` (87 lines) — React hook `attachHighlight(refs)` callable di `onInit` setelah scene built. Auto-disposes on unmount/deps change.
- `src/app/styles/highlight.css` (98 lines) — label state CSS via `data-highlight-state` attr (idle/hover/pinned/dim). Pinned state inverted dark + × clear button (CSS `::after`). `prefers-reduced-motion` collapses transitions; `(pointer: coarse)` enlarges padding to 44px touch target.

**Modified:**
- `src/app/lib/three-scene.ts` — `createLabel()` extended dengan optional `partId` param; sets `dataset.partId` + adds `.viz-label` class. `placeAnnotations()` items[] now accepts `partId?: string`, threaded through to createLabel.
- `src/styles/index.css` — import `../app/styles/highlight.css`.
- `src/app/components/HermeticDoorAssembled3D.tsx` — pilot integration:
  - Tag 7 mesh dengan `userData.partId`: frame (sill+jambL+jambR), door-panel, lead-glass, pb-stripe, handle (bar+brackets), housing (D-profile+LED indicator), sensor (boxes+green/amber LEDs), track.
  - 7 annotation items receive matching `partId`.
  - `useHighlightController` hook integrated; `attachHighlight(refs)` called di onInit setelah `applyCameraPreset`.

**Visual verified** (`visual-inspection-screenshots-item2a-highlight/`):
- Hover label "Lead Glass Pb 5mm" → label putih+border cyan elevated, mesh emissive boost, 6 lain dim opacity 0.35.
- Hover label "Handle SS" → handle bar+brackets bright+scale 1.04.
- Click label "Electric Motor Housing" → pinned state (label inverted dark+× button), housing fokus, 6 lain dim.
- Press Escape → unpin, semua kembali idle, console log confirms 7 labels state idle.

**Build size**: CSS 119→121 KB (gzip 19.84→20.18 KB), Hermetic Assembled 5.44→13.00 KB (gzip 2.38→4.70 KB). Total +4.3 KB gzip (acceptable).

### Hard rules added

- ❌ **Jangan tambah `wallMesh` di hermetic** — di-delete intentional Session 10 untuk enable scenario open mode.
- ✅ **Tag mesh dengan `userData.partId = string`** untuk semua mesh yang punya annotation.
- ✅ **Thread `partId` ke `placeAnnotations` items** untuk auto-sync label↔mesh.
- ✅ **Call `attachHighlight(refs)` di onInit** setelah scene built. Hook auto-disposes.

---

## [2026-05-24 - Session 9] - Kritik Empirical Audit + Critical Code Fixes

> **Context**: Pasca handoff doc deep-read (309 MD files diserap), banyak demand kritik v1-v5 (HVAC, PbLead, ScrubSink) yang menurut handoff masih open ternyata **sudah dieksekusi** di Session 7-8. Sesi ini mengoreksi catatan, mengeksekusi sisa demand yang valid, dan membersihkan technical debt yang teraudit di codebase audit 2026-05-23.

### TASK 6 — Empirical kritik audit

**Created:**
- `arahan-baru/kritik_status_2026-05-24.md` (~9 KB) — line-per-line audit kritik v1-v5 vs kode aktual. Verdict: HVAC 24 DONE / 11 PARTIAL / 8 MISSING dari 43 demand. PbLead 16 DONE / 4 PARTIAL / 4 MISSING dari 24. ScrubSink 17 DONE / 3 PARTIAL / 3 MISSING dari 23. Total: 57 DONE / 18 PARTIAL / 15 MISSING dari 90 demand.
- File ini menjadi sumber otoritas baru, menggantikan 6 kritik file lama.

### TASK 2 — Cleanup stale directives + Wastafel duplicate

**Deleted (orphan):**
- `src/app/components/WastafelScrub.jsx` (9.5 KB) — duplikat dari `mentahan/WastafelScrub.jsx` (hash match). Predecessor R3F dari `ScrubSinkAssembled3D.tsx` Session 8. Verified zero importers.
- `src/app/components/WastafelScrub.md` (companion doc)

**Moved to archive:**
- `arahan-baru/HvacSystemBIM3D_V7_COMPLETE.tsx` (44.8 KB) → `mentahan/HvacSystemBIM3D_V7_COMPLETE.tsx.archived`. V7 = 1021-line monolithic regression yang akan delete seluruh `hvac-bim-v2/` engineering layer (4865 LOC dengan MetricStatus, ProvenanceSource, ComplianceGate, AirBalance, PressureLadder). `.archived` extension prevents accidental imports.

**Created:**
- `mentahan/README.md` — inventory + rules untuk archive folder.

**Banner added (SUPERSEDED 2026-05-24):**
- `arahan-baru/kritik_hvac.md`, `kritik_hvac_v2.md`, `kritik_hvac_v3.md`, `kritik_hvac_v4.md`, `kritik_hvac_v5.md`, `kritik_pb-lead-door_scrub_sink_bay_v1.md` — semua redirect ke `kritik_status_2026-05-24.md`.

### TASK 4 — ScrubSink specs numerical performance

**Modified `src/app/products/scrub-sink.ts`:**
- Tambah `Flow Rate`: 6–8 L/min per faucet (regulated, hands-free)
- Tambah `Temp Range`: 38–42 °C TMV setpoint (NHS HTM 04-01 compliant warm water)
- Upgrade `Anti-Scald`: Thermostatic Mixing Valve, max 46 °C cut-off + cold-failsafe
- Tambah `Sensor IR`: Hands-free activation, 50–80 mm range, 30 s auto-shutoff

Addresses kritik v1 §3.8 "regulatory parameter".

### TASK 1 — PbLead continuity annotations 3D

**Modified `src/app/components/PbLeadDoorAssembled3D.tsx`:**
- Tambah 6 CSS2DObject annotations di tier "continuity" (auditable shielding narrative):
  - `2 mmPb continuous · Top Edge`
  - `2 mmPb continuous · Bottom Edge`
  - `2 mmPb continuous · Hinge Edge (no break at knuckle cutout)`
  - `2 mmPb continuous · Latch Edge (mortise pocket lined)`
  - `Pb rebate frame · View Glass overlap`
  - `Frame-Wall overlap · Pb tab wraps drywall`

Total: 14 annotations (8 hardware identification + 6 continuity). Addresses kritik v1 §1-3 "edge continuity" + "frame-wall interface".

### TASK 5 — PbLead open/close scenario mode

**Modified `src/app/components/PbLeadDoorAssembled3D.tsx`:**
- Refactor `buildScene` return `{ leafPivot, closerGroup }` SceneHandles
- Created `THREE.Group` `leafPivot` di hinge axis (HINGE_X, 0, 0)
- Routed all door-mounted geometry ke `leafGroup` child:
  - Door leaf sculpted bevel + window aperture
  - Lead continuity 4 perimeter stripes
  - 4 EPDM gasket (top/bottom/hinge/latch)
  - Drop seal housing + sweep + activation pin
  - View glass + Pb rebate frame + SS bezel
  - Kickplate + 8 screws
  - Bar pull + mortise + door-side hinge leaves + door-side hinge screws
- Frame jambs + wall + architrave + threshold + rubber stop bead + frame-side hinge leaves/pin/knuckles/screws + lead-lined jamb continuity tetap di scene root (static)
- Closer geometry (Sargent 281 articulated) di `closerGroup` — hidden saat open scenario karena articulation tidak dimodelkan
- React state `scenarioMode: 'closed' | 'open'` dengan animation effect (`easeInOutCubic`, 900ms, 0° ↔ 90°)
- UI toggle 2 button di bar atas viewer ("Closed (audit view)" + "Open 90°")

Addresses kritik v1 §6 "operability & safety state".

### TASK 3 — Codebase audit critical fixes

**TASK 3a — B1 disposeScene closure** (`docs/research/2026-05-23-codebase-audit.md` Finding B1):
4 standalone viewer non-hook menggunakan `containerRef.current` di cleanup closure (race window di concurrent React). Replace dengan captured `container` local + null `refsRef.current` post-dispose.
- `src/app/components/XrayViewerAssembled3D.tsx`
- `src/app/components/XrayViewerExploded3D.tsx`
- `src/app/components/SurgicalControlPanelAssembled3D.tsx`
- `src/app/components/SurgicalControlPanelExploded3D.tsx`

**TASK 3b — B2 shared materials sentinel** (Finding B2):
`disposeScene` di `three-scene.ts` traverse semua mesh dan dispose materials, termasuk singleton dari `lib/materials.ts`. Latent crash kalau `mat.*` diadopsi cross-viewer.
- `src/app/lib/materials.ts`: tambah `SHARED_MATERIAL_SENTINEL` (Symbol.for) + `Object.defineProperty` non-enumerable di tiap material di `mat`. Export `isSharedMaterial(m): boolean` guard.
- `src/app/lib/three-scene.ts`: `disposeScene` panggil `isSharedMaterial(m)` skip-and-don't-dispose-textures-of shared materials.

**TASK 3c — F1 dual registry investigation** (Finding F1):
Audit klaim "dual registry undermines code-splitting" — actually misread. Realitas:
- `viewerRegistry.ts` (eager) zero importers — dead code
- `ProductViewer.tsx` zero importers — dead code
- Per-viewer chunks tetap ter-split correctly (build proof: PbLead 13.27 KB, ScrubSink 14.51 KB, dst.)

Cleanup orphan:
- Deleted `src/app/data/viewerRegistry.ts`
- Deleted `src/app/components/ProductViewer.tsx`
- `src/app/components/index.ts`: removed `ProductViewer` re-export
- `src/app/data/index.ts`: replaced `VIEWER_REGISTRY` re-exports dengan `LAZY_VIEWER_REGISTRY`

### Bonus — Sidebar regression fix

**Found during visual verify:** X-Ray Viewer + Surgical Control Panel **invisible di sidebar** karena `CATEGORY_ORDER` di `Sidebar.tsx` tidak include `'Peralatan Medis'` + `'Peralatan Kontrol'`. Type `ProductCategory` juga tidak include keduanya — produk lolos compile karena project tidak punya `tsconfig.json` (no type-check di build).

**Modified:**
- `src/app/data/products.ts`: `ProductCategory` union tambah `'Peralatan Medis'` + `'Peralatan Kontrol'`
- `src/app/components/Sidebar.tsx`: `CATEGORY_ORDER` tambah 2 entri + `CATEGORY_ICONS` (Stethoscope + SlidersHorizontal)

Both products sekarang tampil di sidebar.

### Bonus — stopRender bug fix (pre-existing, surfaced by B1)

**Found during stress test:** `TypeError: t is not a function` saat rapid switch X-Ray → Surgical Panel. Root cause:
- `startRenderLoop` di `three-scene.ts` mengembalikan `{ stop, invalidate }` object
- 4 viewer (XrayViewer × 2, SurgicalControlPanel × 2) salah perlakukan return value sebagai function: `let stopRender: (() => void) | undefined; stopRender = startRenderLoop(refs); ... stopRender?.();`
- Bug pre-existing, tetapi **tidak terlihat** sebelum B1 fix karena cleanup sering skip akibat null `containerRef.current`. B1 fix bikin cleanup reliable → bug surface.

**Fix:**
- Type annotation jadi `let stopRender: { stop: () => void; invalidate: () => void } | undefined`
- Call site jadi `stopRender?.stop()`

### Visual verification

**Created `verify-session9.cjs`** (replaced `screenshot-check.cjs` for this session):
- 7 screenshots di `visual-inspection-screenshots-session9/`
- 6 product captures + 1 rapid-switch stress capture (B1+B2 paths exercised)
- Zero `pageerror` dalam final run
- Hash check: open scenario distinct dari closed (rotation rendered correctly)
- Toggle bidirectional: closed → open → closed restores byte-identical state

### Build metrics

| Metric | Before Session 9 | After Session 9 |
|---|---|---|
| Initial bundle gzip | 47.36 KB | 47.94 KB (+580 B for stopRender type + sentinel guard + scenario UI) |
| PbLead chunk gzip | 4.83 KB | 4.99 KB (+160 B for 6 annotations + open/close pivot logic) |
| ScrubSink chunk gzip | 5.24 KB | 5.23 KB (no change — only spec text edits) |
| Build time | ~6.5s | ~5.6-6.2s |
| Build status | green | green |

### Files touched

**Source code (10):**
- `src/app/components/PbLeadDoorAssembled3D.tsx` — annotations + open/close
- `src/app/components/Sidebar.tsx` — CATEGORY_ORDER fix
- `src/app/components/SurgicalControlPanelAssembled3D.tsx` — B1 + stopRender
- `src/app/components/SurgicalControlPanelExploded3D.tsx` — B1 + stopRender
- `src/app/components/XrayViewerAssembled3D.tsx` — B1 + stopRender
- `src/app/components/XrayViewerExploded3D.tsx` — B1 + stopRender
- `src/app/components/index.ts` — barrel cleanup
- `src/app/data/index.ts` — registry re-export rewire
- `src/app/data/products.ts` — ProductCategory union
- `src/app/lib/materials.ts` — SHARED_MATERIAL_SENTINEL
- `src/app/lib/three-scene.ts` — disposeScene guard
- `src/app/products/scrub-sink.ts` — specs numerical

**Files deleted (4):**
- `src/app/components/ProductViewer.tsx` (orphan)
- `src/app/components/WastafelScrub.jsx` (duplicate of mentahan/)
- `src/app/components/WastafelScrub.md`
- `src/app/data/viewerRegistry.ts` (orphan)

**Files moved (1):**
- `arahan-baru/HvacSystemBIM3D_V7_COMPLETE.tsx` → `mentahan/HvacSystemBIM3D_V7_COMPLETE.tsx.archived`

**Documents (8):**
- `arahan-baru/kritik_status_2026-05-24.md` (NEW)
- `arahan-baru/kritik_hvac.md` (banner)
- `arahan-baru/kritik_hvac_v2.md` (banner)
- `arahan-baru/kritik_hvac_v3.md` (banner)
- `arahan-baru/kritik_hvac_v4.md` (banner)
- `arahan-baru/kritik_hvac_v5.md` (banner)
- `arahan-baru/kritik_pb-lead-door_scrub_sink_bay_v1.md` (banner)
- `mentahan/README.md` (NEW)

**Verification (1):**
- `verify-session9.cjs` (NEW) + `visual-inspection-screenshots-session9/` (7 PNGs)

### Risk + future work

- **Annotations static during leaf rotation**: anchors di door-leaf relative coords akan drift saat scenario `open`. Acceptable trade-off — buttons clearly label "audit view" vs "Open 90°"; user inspect geometry visually di open mode, audit di closed mode.
- **Open mode hides closer**: Sargent 281 closer arm articulation tidak dimodelkan (3-bar linkage realtime kinematic = scope creep). Cleanly hidden, with comment in code.
- **HVAC visual annotations** (kritik MISSING items #1-8 dari `kritik_status_2026-05-24.md`): sensor pin di geometry, equipment code label 3D, AGSS dedicated stack, drain pan, humidifier, N+1 fan visual, elevation tag, CFM-anchored arrows — semua tetap defer (4-8 jam, higher risk).
- **PbLead + ScrubSink compliance gate pattern porting** dari HVAC: defer (4-6 jam).
- **`tsconfig.json` absent** — TypeScript type errors lolos. Add tsconfig pre-deploy untuk catch ProductCategory-style issues earlier.

---

## [2026-05-19 - Session 7] - Documentation Auto-Aware System

### Documentation System

**Created auto-linked documentation:**
- `docs/INDEX.md` - Navigation hub (181 lines)
- `docs/CONTEXT.md` - Live state, auto-updated (313 lines)
- `README.md` - Project overview with doc links

**Auto-sync system:**
- `docs/sync-context.js` - Node script for auto-update
- `.git/hooks/pre-commit` - Git hook to sync before commit
- `npm run sync-docs` - Manual sync command

**Cross-references:**
- All docs link to each other
- INDEX.md as navigation entry point
- CONTEXT.md tracks live state
- README.md points to docs folder

### NPM Scripts Added

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "sync-docs": "node docs/sync-context.js"
}
```

---

## [2026-05-19 - Session 6] - Documentation Complete

### Documentation Added

**Created comprehensive documentation suite:**
- `docs/PRD.md` - Product Requirements Document (10.6 KB)
- `docs/SRD.md` - System Requirements Document (15.3 KB)
- `docs/MEMORY.md` - Memory Bank / Context (10.4 KB)
- `docs/HANDOFF.md` - Handoff Guide (13.4 KB)

**Documentation Coverage:**
- Product scope (12 products)
- Technical architecture
- Component specifications
- Performance baseline
- Testing checklist
- Troubleshooting guide
- Deployment instructions

---

## [2026-05-18 - Session 5] - HVAC Mobile Overhaul & Rendering Polish

### HVAC Mobile Responsive Overhaul

**New Mobile Drawer System:**
- Added slide-up drawer from bottom for mobile devices
- Toggle button fixed at bottom-right corner
- Compact status summary in drawer
- Quick subsystem action buttons
- Drawer handles 70% viewport height max

**Desktop vs Mobile Separation:**
- All desktop controls use `hidden sm:flex/block`
- Mobile controls use `sm:hidden`
- Legend, Trust Banner: Desktop only
- Mode tabs: Desktop sidebar vs Mobile bottom strip

**Performance Improvements:**
- HVAC bundle: 27.06 KB → 22.03 KB (-18%)
- Simplified overlay components
- Removed redundant UI elements

### Camera Animation System

**New `animateCameraTo()` utility:**
- Smooth ease-out cubic interpolation
- Configurable duration (default 800ms)
- Promise-based for chaining
- Used for mode/view transitions

### Rendering Quality Fixes

**Three.js Scene Improvements:**
- Better shadow map quality (PCFSoftShadowMap)
- Enhanced 6-point lighting with hemisphere
- Shadow radius for soft edges
- Limited pixel ratio to 2x for performance

---

## [2026-05-18 - Session 4] - Product Cleanup & Mobile Fixes

### Product Cleanup

**Archived duplicate products:**
- Removed Sandwich Standard from PRODUCTS array (same viewer as Radiasi)
- Removed Cleanroom Panel from PRODUCTS array (same viewer as Radiasi)
- Files kept for backup: sandwich-standard.ts, cleanroom.ts
- Now only 12 unique products displayed (down from 14)

### AI Slop Typography Fixes

**Removed em-dash (AI indicator) from all files:**
- Fixed 35+ component files using bulk replacement
- Replaced all em-dash (U+2014) with regular hyphen (U+002D)
- Files affected: All components in src/app/components/*.tsx
- Removed AI-style javadoc comments with em-dashes

### Mobile Responsive Fixes

**HVAC BIM Viewer (HvacSystemBIM3D.tsx):**
- Mode buttons: Hidden on mobile, shown on tablet+
- Added mobile mode tabs at bottom (3 modes)
- Scenario selector: Responsive width, smaller fonts
- Headline KPI strip: Hidden on mobile
- Focus pins: Hidden on mobile
- All border-radius set to 0 (MONO theme)

**HVAC Overlay (overlay.tsx):**
- Legend: Hidden on mobile (sm:block)
- Trust banner: Hidden on mobile
- Right panel: Scrollable on mobile, max-width responsive
- Smaller fonts for mobile (text-[9px] vs text-[10px])

---

## [2026-05-18 - Session 3.5] - Bug Fixes & Rendering Polish

### Critical Bug Fixes

**Blank Page Issue Fixed:**
- Removed duplicate `surgical-panel` entry from viewer registry
- Fixed missing import for `SurgicalPanelAssembled3D`
- Cleaned up barrel exports (components/index.ts)
- Fixed infinite loop in `ProductViewerLazy` useEffect
- Added error boundary at root level (main.tsx)
- Fixed viewerType reference in surgical-panel.ts

### 🎨 Rendering Quality Improvements

**Three.js Renderer:**
- Limited pixel ratio to max 2x for performance
- Changed shadow map to `PCFSoftShadowMap` for softer shadows
- Added shadow radius for smooth shadow edges
- Disabled stencil buffer for performance
- Manual render info reset for debugging

**Lighting (Professional 6-point setup):**
- Hemisphere light for natural sky/ground bounce
- Key light with soft shadow edges (shadow radius = 4)
- Fill light from left (cool tone)
- Rim light from back-right (warm tone)
- Top soft fill
- Front fill for medical equipment detail
- Balanced shadow map size (2048x2048 for performance)

### 📱 Mobile Responsive Updates

- Mobile viewport detection in Sidebar
- Touch device optimizations (44px minimum targets)
- Active state instead of hover on touch devices
- Landscape phone styling
- Container queries support
- Reduced font-size for small screens

---

## [2026-05-18 — Session 3] — Performance Optimization & Code-Splitting

### 🚀 Performance Improvements (MAJOR)

**Bundle Size Reduction:**
- Initial bundle: 275 KB → **115 KB** (-58%)
- Three.js core: 542 KB → **139 KB** (chunked)
- Each viewer: 0.8 KB → 9 KB (on-demand)

**Code-Splitting Implementation:**
- 38 individual chunks for lazy loading
- Three.js core + addons separated
- React + ReactDOM as vendor chunk
- Lucide icons as separate chunk
- Each 3D viewer loads on-demand

**New Performance Features:**
- `lazyViewerRegistry.ts` — Lazy-loaded viewer registry
- `ViewerSkeleton.tsx` — Animated loading skeleton
- `ViewerErrorBoundary.tsx` — Graceful error handling
- `ProductViewerLazy.tsx` — Optimistic UI + lazy loading
- Preload on hover (instant navigation)
- Keyboard navigation (J/K or Arrow Up/Down)
- Predictive prefetching (adjacent products)

**Bundle Breakdown:**
```
Initial Load (gzip):
├── HTML: 0.37 KB
├── CSS: 19.72 KB
├── Main JS: 47.09 KB
├── React: 43.22 KB
├── Lucide: 3.86 KB
└── Total: ~115 KB

On-Demand (cached):
├── Three.js Core: 138.83 KB
├── Three.js Addons: 6.21 KB
└── Each Viewer: 0.8 - 9 KB
```

### 📦 Product Registry Cleanup

- Removed duplicate `surgical-panel.ts` (same as `surgical-control-panel`)
- Clarified wall panel variants (3 separate products)
- Final count: **15 unique products**

### 🎨 Late Animation Additions

- `spin-slow` — Rotating loading cube
- `spin-reverse` — Counter-rotation effect
- `shimmer` — Progress bar shimmer
- `fade-in` — Smooth content appearance
- `prefers-reduced-motion` support

---

## [2026-05-18 — Session 2] — Complete Product Coverage (16/16 Products)

### 🎯 New 3D Viewers (2 Products Added)

**X-RAY VIEWER** (Double Screen LED Illuminator):
- Dimensions: 880 × 503 × 29mm
- Features: >10,000 LUX brightness, 5,900-9,000K adjustable
- 6 layers: Frame, Diffuser, LED Array, Heatsink, Housing, PSU
- Files: `xray-viewer.ts`, `XrayViewerAssembled3D.tsx`, `XrayViewerExploded3D.tsx`

**SURGICAL CONTROL PANEL TOUCHSCREEN** (Windows Smart Control):
- Dimensions: 600 × 500 × 100mm
- Features: 15.6" IPS LCD, Modbus TCP/IP, Operating Timer
- UI Display: CanvasTexture dengan real-time medical interface
- 8 layers: Housing, PSU, Mainboard, CPU, I/O, Cooling, LCD, Glass
- Files: `surgical-control-panel.ts`, `SurgicalControlPanelAssembled3D.tsx`, `SurgicalControlPanelExploded3D.tsx`

### 📦 Product Registry Updated

- `viewerRegistry.ts`: Added xray-viewer + surgical-control-panel entries
- `products/index.ts`: Added 2 new products to PRODUCTS array

### 📊 Final Count

| Category | Count |
|----------|-------|
| Total Products | 16 |
| Assembled Views | 15 |
| Exploded Views | 15 |
| Custom Views (HVAC) | 1 |
| Total Viewers | 31 |

---

## [2026-05-18] — MONO Theme + Accessibility Audit + Architecture Refactoring

### 🎨 MONO Theme (Tweakcn Inspired)

Complete UI/UX overhaul with minimalist monospace aesthetic:

**Theme Features:**
- Zero border radius (sharp corners throughout)
- JetBrains Mono monospace font
- Monochrome black & white palette
- No shadows (flat design)
- Uppercase labels with letter-spacing

**Files Added:**
- `src/app/data/viewerRegistry.ts` — Central registry for viewer components (replaces switch statement)
- `src/app/hooks/useProductViewer.ts` — Boilerplate abstraction for viewers
- `src/app/hooks/index.ts` — Hook barrel export
- `src/app/data/index.ts` — Data barrel export
- `REFACTORING_GUIDE.md` — Documentation for adding/removing products
- `AUDIT_REPORT_UIUX_3D.md` — Full audit report

**Files Modified:**
- `src/styles/theme.css` — Complete MONO theme + accessibility features
- `src/styles/fonts.css` — JetBrains Mono font loading
- `src/app/App.tsx` — ARIA landmarks + skip link
- `src/app/components/Sidebar.tsx` — MONO styling + ARIA labels
- `src/app/components/ProductViewer.tsx` — MONO styling + ARIA labels (refactored with registry)
- `src/app/components/ViewerControls.tsx` — MONO styling + ARIA labels
- `src/app/components/HermeticDoorLegend.tsx` — MONO styling
- `src/app/components/hvac-bim-v2/overlay.tsx` — MONO styling
- `src/app/components/hvac-bim-v2/scene.ts` — MONO labels
- `src/app/lib/three-scene.ts` — Background fix + MONO annotation labels
- `src/app/data/products.ts` — Added VIEWER_TYPES constant

### ♿ Accessibility Improvements (WCAG 2.1 AA)

- Added skip-to-content link for keyboard users
- Added ARIA landmarks (navigation, main, region)
- Added aria-labels to all interactive elements
- Added aria-pressed to toggle buttons
- Added aria-current to active navigation items
- Changed search input to type="search"
- Added focus-visible styling with 2px outline
- Added @media (prefers-reduced-motion) support
- Added @media (prefers-contrast: high) support
- Added print styles

### 🏗️ Architecture Refactoring

**Problem:** ProductViewer.tsx had 270 lines with nested ternary operators for 12 viewer types.

**Solution:** Registry pattern with type-safe configuration.

**Benefits:**
1. Adding new products: Only edit registry + products/index.ts
2. Removing products: Just delete from registry
3. Type-safe: TypeScript infers all viewer types
4. Maintainable: Clean separation of concerns

**Patterns Added:**
- `VIEWER_REGISTRY` — Maps viewerType → Component
- `VIEWER_TYPES` — Const array for type inference
- `useProductViewer` hook — Abstracts Three.js boilerplate

### 📦 Bundle Stats

- CSS: 117.21 KB (gzip: 19.31 KB)
- JS: 999.12 KB (gzip: 267.87 KB)

---

## [2026-03-24] — HVAC System V3 "Remarkable" — Full Geometry Rewrite

### Architecture: Modular V3 Geometry System

**Problem:** V2 geometry looked "too simple" when zoomed in — AHU was just a box, ductwork lacked visible flanges/joints, no building shell cutaway, no AHU internal sections visible.

**Solution:** Complete geometry rewrite split into 4 modular files, keeping proven V2 architecture (unified BIM component, 7-mode system, camera lerp, particles, raycaster).

**New geometry files (4 + barrel):**
- `hvac-v3-building.ts` (~200 lines) — OR room 6×6×3m, 4 walls (2 glass + 2 solid with EdgesGeometry wireframe), ceiling with 2 LAF openings (Shape+Holes), interstitial space Y=3→5, mechanical room X=6→9, roof wireframe
- `hvac-v3-ahu.ts` (~400 lines) — **HERO**: AHU 1.2×3.0×0.93m with `Material.clippingPlanes` cutaway. Internal sections: inlet louvres (12 slats), G4 pre-filter (InstancedMesh pleats), F8/F9 filter, evaporator coil (InstancedMesh fins + copper tubes), drain pan, 6 heater elements (emissive glow), centrifugal fan (16 blades + scroll housing), UV-C lamp (2 tubes + purple PointLights), section divider baffles, 4 access doors, magnehelic gauge, flex connector
- `hvac-v3-ductwork.ts` (~240 lines) — Supply trunk 0.6×0.4m + 2 branches 0.3×0.3m, return 4-branch + trunk. SMACNA flanges every 1.2m, hanger assemblies (threaded rod + strap + anchor), volume dampers with actuators, aluminium tape joints
- `hvac-v3-equipment.ts` (~460 lines) — 2× LAF units (plenum + 2×3 HEPA H14 + 200 perforation holes InstancedMesh + LED strip), 4× return grilles (14 louver slats each), outdoor unit (200 InstancedMesh fins + Shape+Hole top panel + 3 blades + 4 guard rings), refrigerant piping (CatmullRomCurve3 suction+liquid + foam insulation + copper inner + support clips), OR equipment (operating table + shadowless lamp with SpotLight + 18 LED discs + surgical pendant with 4 gas outlets), 3 configurable airflow particle systems
- `hvac-v3-index.ts` — Barrel re-export

**Modified files:**
- `three-scene.ts` — Added `localClippingEnabled` + `skipDefaultLights` to SceneOptions (backward compatible with defaults)
- `hvac-bim-materials.ts` — +15 new material factories (matFilterG4, matFilterF89, matHeaterElement, matUVLamp, matDrainPan, matBaffle, matPIUDuct, matSMACNAFlange, matAluminiumTape, matGlassWall, matSolidWall, matScrollHousing, matOperatingPad, matLampLED, matGasOutlet)
- `hvac-bim-modes.ts` — Added `ahu_cutaway` mode (7th mode), camera targeting AHU mechanical room
- `HvacSystemBIM3D.tsx` — Full rewrite: V3 imports, custom 6-light setup (ambient + sun w/ shadows + AHU interior + OR room + UV ambient + rooftop), clipping plane for AHU cutaway, 3 independent particle systems (supply cyan, return salmon, refrigerant amber), UV pulsing + heater glow animations, 7-mode panel including AHU Cutaway
- `hvac-system.ts` — Updated camera presets for 6×6m room, added AHU Cutaway preset

**Deleted V1 files:**
- `HvacSystemAssembled3D.tsx` (649 lines) — replaced by unified BIM in V2
- `HvacSystemExploded3D.tsx` (503 lines) — replaced by unified BIM in V2

**Key technical changes:**
- Room: 7×7m → 6×6×3m. AHU at X=7.5 in mechanical room (X=6→9). Outdoor unit on roof at (4, 5.2, 4)
- Clipping: `renderer.localClippingEnabled = true`, only AHU outer shell clipped — internals always visible
- Scale: 1 unit = 1 meter (unchanged)
- 7 modes: Full System, Supply Air, Return Air, Refrigerant, AHU Cutaway, Floor Plan, Exploded

### Later runtime note

The current checked-in runtime has since moved again. As of 2026-03-25, the active viewer in
`src/app/components/HvacSystemBIM3D.tsx` is driven by `src/app/components/hvac-bim-v2/*`,
with 6 runtime modes (`full`, `supply`, `return`, `refrigerant`, `plan`, `exploded`) and
5 operating scenarios (`normal`, `surgery-peak`, `purge`, `setback`, `fault`). Treat this
2026-03-24 entry as historical architecture, not the current source of truth.

---

## [2026-03-19] — HVAC System V2.1 — Atomic Detail Enhancement (LOD + InstancedMesh)

### Zoom-In Believability — All Components

**Problem:** V2 looked great at system-level but "low poly" when zoomed in close to individual components.
**Solution:** THREE.LOD 2-tier system (detail <3m, simplified >=3m) + InstancedMesh for repeated elements. ~7,300 detail polys total, only ~2,500 rendered when zoomed into one component.

**Files added:**
- `src/app/components/hvac-bim-detail-helpers.ts` — 12 atom-level pure builder functions:
  - `createBoltArray()` — InstancedMesh hex bolt arrays (M8, configurable count/positions)
  - `createFilterMedia()` — Pleated filter with InstancedMesh pleats + aluminium frame
  - `createCondenserFinPack()` — Dense InstancedMesh fins + copper tube pass-throughs
  - `createAccessDoor()` — AHU access panel with cam latches, T-handle, rubber gasket
  - `createDuctHanger()` — SMACNA hanger: threaded rods + galvanised strap + clamps
  - `createDuctJoint()` — Angle flange ring + aluminium foil tape at joints
  - `createVolumeDamper()` — Butterfly blades + electric actuator with indicator arc
  - `createPipeSupportClips()` — U-bolt clips at intervals along CatmullRomCurve3
  - `createFlareNut()` — Brass hex flare nut at pipe connections
  - `createReturnGrilleHighDetail()` — InstancedMesh grid bars + frame + screws + gasket
  - `createMagnehelicGauge()` — Round dial gauge with Canvas2D face, needle, glass cover
  - `createVibrationIsolator()` — Spring mount + neoprene pad + top plate
  - `createFlexConnector()` — Accordion bellows with clamp bands

**Files modified:**
- `src/app/components/hvac-bim-geometry.ts` — All 6 major builders enhanced with LOD detail layers:
  - `buildAHUDetailed()` — panel seams, ~80 hex bolts, 3 access doors, magnehelic gauge, 4 vibration isolators, UV inspection window, flex connector, nameplate
  - `buildOutdoorUnit()` — fan guard mesh, motor dome, condenser fin pack, service valves, rubber feet, electrical panel, nameplate
  - `buildControlPanelAHU()` — 3-point cam latches, MCB toggle levers, DIN rail, cable glands, earth bus bar, door lock
  - `buildSupplyDuct()` — SMACNA flange joints (~7), full hanger assemblies, volume damper + actuator, flex connector, access door
  - `buildRefrigerantPiping()` — pipe support clips, flare nuts at endpoints, P-trap drain, insulation tape bands
  - `buildReturnGrilles()` — per-grille LOD with individual grid bars, frame, screws, gasket
  - `buildORCeiling()` LAF — divider bars (2×3 grid), HEPA filter frame edge, test port, cam lock retainers
- `src/app/components/hvac-bim-materials.ts` — 4 new materials: `matRubberGasket`, `matAluminiumFoilTape`, `matBrassValve`, `matWireMesh`
- `src/app/components/HvacSystemBIM3D.tsx` — LOD infrastructure:
  - Camera: `near=0.05`, `far=50`, `minDistance=0.3`, `maxDistance=25`
  - `lodObjectsRef` — collects all LOD objects at init
  - `onTick` — calls `lod.update(camera)` per frame for automatic tier switching

**Performance budget:** ~7,300 polys close-detail total, 29-36 draw calls. LOD ensures only nearby details render.

---

## [2026-03-18] — HVAC System V2 BIM-MEP Viewer (14th Product — Major Revision)

### HVAC System — BIM-MEP Interactive OR Ventilation Diagram

**Status:** V2 complete. Build clean (zero TS errors). 6 view modes, animated, click-to-inspect.

**What changed from V1:**
- V1: simple 2-view assembled/exploded (same as all other products)
- V2: fully reimagined BIM-MEP visualization — first product with unified mode system, animations, and subsystem highlighting

**Product highlights:**
- **Unified BIM Component** — one `HvacSystemBIM3D.tsx` manages 6 internal modes (no tab bar)
- **6 View Modes**: Full System · Supply Air (cyan) · Return Air (salmon) · Refrigerant (amber) · Floor Plan · Exploded
- **Smooth mode transitions**: camera lerp 40 frames easeInOutCubic + instant material swap
- **Subsystem highlighting**: MEP standard colors — cyan #00BCD4 / salmon #FF7043 / amber #FF8F00; non-highlighted groups dimmed to 0.08 opacity
- **Animated fans**: AHU fan +0.03 rad/frame, Outdoor Unit +0.05 rad/frame
- **Supply air particles**: 200 InstancedMesh cyan spheres falling from LAF (1 draw call)
- **Click-to-inspect**: Raycaster `pointerdown` → info panel with component name, system badge, specs table
- **OR room context**: 7×7×3m ghost walls + floor + ceiling + rooftop slab (ASHRAE 170 compliant layout)
- **OR interior**: Operating table, surgical pendant, shadowless lamp
- **Detailed geometry**: AHU with filter/coil/fan/UV/heater sections; CatmullRomCurve3 supply duct; TubeGeometry refrigerant pipes; 4 low sidewall return grilles
- **True meter scale**: 1 unit = 1 meter (vs V1's 1 unit ≈ 50mm)
- **Dark background**: #0B1520 for BIM-style presentation

**Engine extension (backward-compatible):**
- `src/app/lib/three-scene.ts` — added `onTick?: () => void` to `startRenderLoop`
- `src/app/hooks/useThreeScene.ts` — threaded `onTick?` through interface

**Files added:**
- `src/app/components/hvac-bim-materials.ts` — 15 PBR material factories + `createHighlightMaterial()` + `getDimmedMaterial()`
- `src/app/components/hvac-bim-modes.ts` — `MODE_CONFIGS`, `buildMeshRegistry()`, `applyMode()`, `createCameraLerp()`, `tickCameraLerp()`
- `src/app/components/hvac-bim-geometry.ts` — `buildORRoom()`, `buildORInterior()`, `buildORCeiling()`, `buildAHUDetailed()`, `buildOutdoorUnit()`, `buildControlPanelAHU()`, `buildSupplyDuct()`, `buildReturnDucts()`, `buildReturnGrilles()`, `buildRefrigerantPiping()`, `buildRooftopGroup()`, `createSupplyParticles()`
- `src/app/components/HvacSystemBIM3D.tsx` — unified React BIM viewer component

**Files modified:**
- `src/app/lib/three-scene.ts` — `onTick?` param added
- `src/app/hooks/useThreeScene.ts` — `onTick?` threaded through
- `src/app/products/hvac-system.ts` — `views: ['assembled']`, meter-scale camera presets
- `src/app/components/ProductViewer.tsx` — routes to `HvacSystemBIM3D` (replaces old assembled/exploded pair)

**Pending (after visual confirm):** Delete old V1 files — `HvacSystemAssembled3D.tsx`, `HvacSystemExploded3D.tsx`

---

## [2026-03-17] — Surgical Control Panel Room Touchscreen (13th Product)

### Surgical Control Panel — Touchscreen Modbus TCP/IP

**Status:** Assembled + exploded view complete. Build clean (zero TS errors).

**Product highlights:**
- First product with a **screen/UI** — Canvas2D-drawn emissive SCADA interface
- Wall-mounted touchscreen 15.6" Full HD, flush-mount in dinding panel OR
- Housing SUS 304 brushed 450×310×85mm with mounting flange
- Dark medical UI theme: countdown timer (red), clock (green), room environment, medical gas monitoring, alarm indicators, L1/L2 lighting control, ELFATECH branding
- Tempered glass overlay (transparent, subtle reflection)
- 6 function buttons (LED backlit) below screen
- Speaker grill on housing side
- Wall fragment context (HPL white, with cutout)
- Z-axis explosion (5 groups): PCB module → flange → housing → LCD → glass+buttons

**Files added:**
- `src/app/products/surgical-panel.ts` — product definition, 6 camera presets, 13 specs
- `src/app/components/SurgicalPanelAssembled3D.tsx` — assembled view, Canvas2D UI texture, 8 annotations
- `src/app/components/SurgicalPanelExploded3D.tsx` — exploded view, 5 groups, GAP=12, 7 annotations

**Files modified:**
- `src/app/data/products.ts` — added `'surgical-panel'` to viewerType union
- `src/app/products/index.ts` — registered as 13th product
- `src/app/components/ProductViewer.tsx` — added routing branch

---

## [2026-03-17] — Ceiling Panel System (12th Product)

### Ceiling Panel System — PIR Sandwich + LED Grid + LAF Integrated

**Status:** Assembled + exploded view complete. Build clean (zero TS errors).

**Product highlights:**
- First product in **Plafon** category — modular OR ceiling system
- 2×2 grid module: 2400×2400mm (240×240 scene units), 4 panel openings
- LED emissive grid as visual focal point — cool white 6000K strips in all frame bars
- 3 solid PIR panels + 1 LAF diffuser panel (perforated ⌀2.4mm, 13% open area)
- HEPA H14 filter above LAF panel, pendant column SUS 304 extending below
- 4 hanger rods at module corners, mounting plate on top
- Worm's eye camera from below (reuses LAF pattern)
- 4-group Y-axis explosion: rods+plate → frame+LED → panels+HEPA → pendant

**Files added:**
- `src/app/products/ceiling-panel.ts` — product definition, 7 camera presets, 13 specs
- `src/app/components/CeilingPanelAssembled3D.tsx` — assembled view, 9 component groups, 8 annotations
- `src/app/components/CeilingPanelExploded3D.tsx` — exploded view, 4 groups, GAP=40, 7 annotations

**Files modified:**
- `src/app/data/products.ts` — added `'ceiling-panel'` to viewerType union
- `src/app/products/index.ts` — registered as 12th product
- `src/app/components/ProductViewer.tsx` — added routing branch

---

## [2026-03-17] — LAF System (11th Product) + Wall Panel Element Category Revision

### LAF System — Laminar Air Flow (LAF) Ceiling System

**Status:** Assembled + exploded view complete. Build clean (zero TS errors, 5.38s).

**Product highlights:**
- First ceiling-mounted product — camera starts from below (`assembledCameraStart: [80, -100, 120]`)
- Horizontal orientation: 1200×1800mm footprint, only 370mm tall (120×180×37 scene units)
- 6 HEPA H14 filter modules in 2×3 grid layout, ISO Class 5 / Class 100 classification
- Tileable staggered-hex CanvasTexture (24×42px, RepeatWrapping) for perforated face diffuser
- 4-group Y-axis explosion: face diffuser → HEPA filters → plenum box → suspension rods+collar

**Files added:**
- `src/app/products/laf-system.ts` — product definition, 7 camera presets, 12 specs
- `src/app/components/LafSystemAssembled3D.tsx` — assembled view, 9 component groups, 8 annotations
- `src/app/components/LafSystemExploded3D.tsx` — exploded view, 4 groups, GAP=30, 6 annotations

**Files modified:**
- `src/app/data/products.ts` — added `'laf-system'` to viewerType union
- `src/app/products/index.ts` — registered as 11th product
- `src/app/components/ProductViewer.tsx` — added routing branch

**Key lessons → `memory/laf-system-lessons.md`**

### Wall Panel Element Category Revision

**Problem:** Sidebar showed "PANEL DINDING" (Indonesian) for wall panels. Spec catalog (page 2) uses "WALL PANEL ELEMENT" as the official product category name. Also, `Cleanroom` was a separate sidebar group from `Panel Dinding` even though both are wall panel products.

**Fix:** Merged `'Panel Dinding'` + `'Cleanroom'` → single `'Wall Panel Element'` category. Updated all 3 products, `products.ts` type union, and `Sidebar.tsx` hardcoded maps.

**Files modified:**
- `src/app/data/products.ts` — ProductCategory type
- `src/app/products/sandwich-radiasi.ts` — category, fullName, description, specs
- `src/app/products/sandwich-standard.ts` — category, fullName, description, specs
- `src/app/products/cleanroom.ts` — category, fullName, description
- `src/app/components/Sidebar.tsx` — CATEGORY_ORDER, CATEGORY_ICONS

---

## [2026-03-15] — Scrub Sink 2 Bay: Full Geometry Rebuild (Missing Cabinet Body)

### Status Akhir
Assembled + exploded view berfungsi. Cabinet body 700mm terlihat, basins recessed jelas di Y≈80, mirrors dan canopy di upper section. Zero TS errors (`npm run build` clean).

### Root Cause
Zone 2 (700mm main cabinet body) tidak pernah dibangun. Hanya Zone 1 (base trim 60mm) dan Zone 3 (backsplash+mirrors+canopy 750mm) yang ada. Akibatnya:
- Countertop di Y=6→10 (60–100mm dari lantai) bukan di Y=76→80 (760–800mm)
- Basins invisible di isometric view (countertop di ground level)
- Mirrors tampak "melayang" sangat dekat ke lantai

### Iterasi (Kronologi)

| # | Yang dilakukan | Hasilnya |
|---|---|---|
| 1 | Ubah camera preset dan warna basin interior | Tidak ada efek — basins masih invisible |
| 2 | Rebuild penuh: tambah cabinet body T_CAB=70, shift semua geometry atas +70 | ✓ FIXED |

### Fix (Zone Completeness Pattern)
Tambah `T_CAB=70` (700mm cabinet body) antara base trim dan countertop.
Semua geometry countertop-ke-atas digeser +70 units.
Gunakan derived constants: `Y_CAB_TOP = T_BASE + T_CAB = 76`, `Y_CT_TOP = 80`.

### Files Changed
- `src/app/components/ScrubSinkAssembled3D.tsx` — full rebuild, added 700mm cabinet body with sliding doors, door rail, handles
- `src/app/components/ScrubSinkExploded3D.tsx` — full rebuild, 5 assembly groups (G1=0, G2=111, G3=168, G4=228, G5=325)
- `src/app/products/scrub-sink.ts` — camera presets updated, all targets at Y=80

### Lessons Learned
→ Lihat `memory/scrub-sink-lessons.md` untuk detail lengkap.

**Rule:** Sebelum menulis geometry apapun, buat tabel zona + verifikasi sum = total tinggi.

---

## [2026-03-08] — PB Lead Door: Door Closer Mechanism — 9-Iteration Disaster & Final Fix

### Status Akhir
Mechanism sekarang berfungsi: housing flush ke header, rail menempel ke housing, slide block di rail, arm diagonal ke bracket di pintu. **Zero TypeScript errors. Zero runtime crash.**

### Track Record Iterasi (Kronologi Kebodohan)

| # | Yang dilakukan | Bug yang dihasilkan |
|---|---|---|
| 1 | Housing di `hCY = H_TOP_Y + HH/2` | Housing melayang di ATAS header, tidak menempel |
| 2 | Housing pindah ke `H_BOT_Y + HH/2 + 0.2` | Gap 0.2 unit, arm ke frame bukan ke pintu |
| 3 | ZC working plane `H_FRT_Z + 2.0 = 8.4` | Arm near-invisible (dY=0.05), arm masih ke frame |
| 4 | BH 4.0→2.5 fix arm span | Arm tetap ke frame, terlalu silau |
| 5 | Face-mount housing, pivot dari housing front | Math "benar" tapi visual salah — gap tetap ada |
| 6 | `HH = FW` (fill header exactly), `hCY = HDR_CY` | Housing flush ✓ tapi rail `rCY = HDR_BOT - RH/2` drift dari housing |
| 7 | Rail chained langsung: `rTopY = hCY - HH/2` | **Runtime crash** — `scene.add().position.set()` |
| 8 | Fix crash tapi shortcut `Object.assign` masih ada | Crash tetap |
| 9 | Rewrite semua mesh dengan variabel eksplisit | **FIXED** ✓ |

### Root Causes Yang Ditemukan (Terlambat)

**Bug #1 — Geometric drift**: Semua iterasi sebelumnya menghitung `HDR_BOT` secara independen (`DH/2 + FW - FW/2`) bukan dari actual header mesh position `DH/2 + FW/2 - FW/2`. Meski hasilnya sama numerically, pendekatan ini rentan drift bila header formula berubah.

**Bug #2 — `scene.add()` return type**: `scene.add(mesh)` mengembalikan `THREE.Scene`, bukan `THREE.Mesh`. Menulis `scene.add(new THREE.Mesh(...)).position.set(...)` memanggil `.position` pada `Scene` → runtime `TypeError`. TypeScript **tidak menangkap ini** karena `Scene` juga memiliki `.position` (dari `Object3D`), tapi `.set()` pada Scene position tidak crash di tipe — hanya merusak posisi mesh yang tidak pernah ter-set.

**Bug #3 — `Object.assign` pada position**: `Object.assign(mesh, { position: new THREE.Vector3(...) })` mengganti properti `position` dengan object baru tanpa memanggil Three.js internal update machinery. Mesh tetap di origin.

### Penyebab Iterasi Terlalu Banyak
1. **Tidak membaca kode aktual header** sebelum menulis section 7. Semua konstanta (`H_TOP_Y`, `H_BOT_Y`, `H_FRT_Z`) dihitung ulang di section 7 secara independen — tidak cross-check dengan actual `header.position.set(0, DH/2+FW/2, 0)` di section 1.
2. **Math audit via Node.js hanya membuktikan angka, bukan kode**. Audit berulang kali menunjukkan "gap=0" tapi kode aktual punya bug berbeda (shortcut pattern, wrong chain).
3. **Setiap iterasi fix satu bug tapi introduce bug baru** karena tidak membaca seluruh section dari awal — hanya replace bagian tertentu.

### Fix Final (Iterasi 9)
```ts
// Semua posisi di-chain dari header actual position:
const HDR_CY = DH / 2 + FW / 2;   // dari section 1: header.position.y
const hCY    = HDR_CY;             // housing center = header center → HH=FW → top/bot flush
const rTopY  = hCY - HH / 2;      // rail top = housing bottom (chained, zero gap)
const rCY    = rTopY - RH / 2;    // rail center

// Semua mesh: variabel eksplisit, lalu scene.add(mesh) terpisah
const railMesh = new THREE.Mesh(...);
railMesh.position.set(0, rCY, rCZ);
scene.add(railMesh);
```

### Rule Baru Yang Harus Diikuti Selamanya
1. **Baca actual mesh position dari section yang membuatnya** sebelum derive konstanta di section lain
2. **Jangan pernah chain `.position.set()` setelah `scene.add()`** — selalu variabel terpisah
3. **Jangan pakai `Object.assign` untuk set position Three.js mesh**
4. **Math audit via Node.js harus menggunakan formula yang identik karakter per karakter dengan kode**, bukan formula yang "equivalent secara matematis"

### Files Changed
- `src/app/components/PbLeadDoorAssembled3D.tsx` — Section 7 rewritten 9 kali. Final state: 473 lines.

### Biaya
~$200 token terbuang untuk 9 iterasi yang seharusnya selesai dalam 1–2 iterasi jika membaca kode sumber terlebih dahulu.

---

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
