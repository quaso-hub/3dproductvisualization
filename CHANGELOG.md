# Changelog

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
