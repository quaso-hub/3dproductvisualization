# 🎯 PB Lead Door & Scrub Sink — Comprehensive Fix Plan

**Date:** March 25, 2026  
**Analysis Reference:** `PB_DOOR_SCRUB_SINK_GAP_ANALYSIS.md`  
**Total Issues:** 17 (3 Critical, 5 High, 8 Medium, 1 Low)  
**Estimated Time:** 20-27 hours

---

## 🧠 Sequential Thinking Approach

### Step 1: Understand Root Causes

Setelah menganalisis kode dan gambar referensi, saya menemukan **3 root causes utama**:

#### Root Cause A: Geometry Construction Issues (40% of problems)
- **Problem:** Meshes dibangun terpisah tanpa proper boolean operations
- **Examples:** 
  - Basin floating above countertop (no cutout)
  - Frame disconnected from wall (no pocket/rebate)
  - Mirror overlapping canopy (no clearance check)

#### Root Cause B: Profile Extrusion Issues (35% of problems)
- **Problem:** Menggunakan BoxGeometry untuk profiles yang seharusnya extruded
- **Examples:**
  - Door stop sebagai box (bukan L-profile)
  - Frame profiles tanpa rebate detail
  - Mirror frame tanpa mitered corners

#### Root Cause C: Assembly/Connection Details (25% of problems)
- **Problem:** Missing mechanical connection details
- **Examples:**
  - No mounting brackets
  - No fasteners/screws visible
  - No sealant/gasket details

---

## 📋 Fix Sequence Strategy

### Phase 0: Preparation (30 minutes)
**Goal:** Setup workflow dan verification system

#### Tasks:
1. ✅ Run dev server
2. ✅ Run visual inspection script (baseline capture)
3. ✅ Open reference images di image viewer
4. ✅ Setup split-screen: code editor + browser + reference

#### Commands:
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Visual inspection
node inspect-products.mjs

# Terminal 3: Git (for commits)
git status
```

---

## 🔴 PHASE 1: Critical Fixes (4-6 hours)

**Goal:** Fix showstopper issues yang membuat product tidak usable

### Fix 1.1: PB Door — Frame-to-Wall Connection
**Time:** 90 minutes  
**File:** `src/app/components/PbLeadDoorAssembled3D.tsx`

#### Sequential Steps:

**Step A: Analyze current wall position**
```typescript
// Current (line 145):
wall.position.set(0, 2.5, -(DT / 2 + FD / 2 + 3));
// Problem: Wall 3 units behind frame — terlalu jauh
```

**Step B: Create wall pocket/rebate**
```typescript
// New: Wall dengan rebate untuk frame insertion
const wallRebateDepth = 2; // 20mm
const wallRebateHeight = DH + FW * 2;
const wallRebateWidth = DW + FW * 2;

// Pocket cutout (boolean operation via shape hole)
const wallShape = new THREE.Shape();
wallShape.moveTo(-WALL_W / 2, -WALL_H / 2);
wallShape.lineTo(WALL_W / 2, -WALL_H / 2);
wallShape.lineTo(WALL_W / 2, WALL_H / 2);
wallShape.lineTo(-WALL_W / 2, WALL_H / 2);
wallShape.closePath();

// Frame pocket (recessed area)
const pocketShape = new THREE.Path();
pocketShape.moveTo(-wallRebateWidth / 2, -wallRebateHeight / 2);
pocketShape.lineTo(wallRebateWidth / 2, -wallRebateHeight / 2);
pocketShape.lineTo(wallRebateWidth / 2, wallRebateHeight / 2);
pocketShape.lineTo(-wallRebateWidth / 2, wallRebateHeight / 2);
pocketShape.closePath();
wallShape.holes.push(pocketShape);

const wallWithPocket = new THREE.Mesh(
  new THREE.ExtrudeGeometry(wallShape, { depth: 3, bevelEnabled: false }),
  matWall()
);
```

**Step C: Add mounting brackets**
```typescript
// Mounting brackets (every 300mm)
const bracketPositions = [
  // Left jamb: 4 brackets
  [-DW / 2 - FW / 2, -DH / 2 + 5, -(DT / 2 + FD)],
  [-DW / 2 - FW / 2, -DH / 2 + 35, -(DT / 2 + FD)],
  [-DW / 2 - FW / 2, -DH / 2 + 65, -(DT / 2 + FD)],
  [-DW / 2 - FW / 2, -DH / 2 + 95, -(DT / 2 + FD)],
  // Right jamb: 4 brackets
  [DW / 2 + FW / 2, -DH / 2 + 5, -(DT / 2 + FD)],
  [DW / 2 + FW / 2, -DH / 2 + 35, -(DT / 2 + FD)],
  [DW / 2 + FW / 2, -DH / 2 + 65, -(DT / 2 + FD)],
  [DW / 2 + FW / 2, -DH / 2 + 95, -(DT / 2 + FD)],
  // Header: 3 brackets
  [-DW / 4, DH / 2 + FW / 2, -(DT / 2 + FD)],
  [0, DH / 2 + FW / 2, -(DT / 2 + FD)],
  [DW / 4, DH / 2 + FW / 2, -(DT / 2 + FD)],
];

bracketPositions.forEach(([x, y, z]) => {
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(4, 6, 1.5),
    matAluminium()
  );
  bracket.position.set(x, y, z);
  scene.add(bracket);
  
  // Mounting screw (hex head)
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.5, 6),
    matSS()
  );
  screw.rotation.x = Math.PI / 2;
  screw.position.set(x, y, z - 0.8);
  scene.add(screw);
});
```

**Step D: Add sealant bead**
```typescript
// Sealant/caulking bead di frame-wall junction
const sealantPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-DW / 2 - FW / 2, -DH / 2, -(DT / 2 + FD / 2)),
  new THREE.Vector3(-DW / 2 - FW / 2, DH / 2, -(DT / 2 + FD / 2)),
  new THREE.Vector3(DW / 2 + FW / 2, DH / 2, -(DT / 2 + FD / 2)),
  new THREE.Vector3(DW / 2 + FW / 2, -DH / 2, -(DT / 2 + FD / 2)),
]);
const sealantGeo = new THREE.TubeGeometry(sealantPath, 64, 0.3, 8, false);
const sealant = new THREE.Mesh(sealantGeo, matRubber());
scene.add(sealant);
```

**Verification:**
- [ ] Frame terlihat connected dengan wall
- [ ] Mounting brackets visible (8 jamb + 3 header)
- [ ] Sealant bead terlihat di junction
- [ ] Screenshot dari 3 angles (front, side, isometric)

---

### Fix 1.2: Scrub Sink — Basin-Countertop Integration
**Time:** 120 minutes  
**File:** `src/app/components/ScrubSinkAssembled3D.tsx`

#### Sequential Steps:

**Step A: Create countertop dengan cutout**
```typescript
// Current: Countertop sebagai box solid (line 344-352)
// Problem: Basin diposisikan di atas tanpa cutout

// New: Countertop dengan basin cutout
const ctShape = new THREE.Shape();
ctShape.moveTo(-W / 2, -D / 2);
ctShape.lineTo(W / 2, -D / 2);
ctShape.lineTo(W / 2, D / 2);
ctShape.lineTo(-W / 2, D / 2);
ctShape.closePath();

// Basin cutout (left)
const basinCutoutL = roundedRectShape(BASIN_W + 0.5, BASIN_D + 0.5, 3);
const cutoutPathL = new THREE.Path();
const ptsL = basinCutoutL.getPoints(32);
cutoutPathL.setFromPoints(ptsL.map(p => new THREE.Vector2(p.x + BAY_CX_L, p.y + BASIN_CZ)));
ctShape.holes.push(cutoutPathL);

// Basin cutout (right)
const basinCutoutR = roundedRectShape(BASIN_W + 0.5, BASIN_D + 0.5, 3);
const cutoutPathR = new THREE.Path();
const ptsR = basinCutoutR.getPoints(32);
cutoutPathR.setFromPoints(ptsR.map(p => new THREE.Vector2(p.x + BAY_CX_R, p.y + BASIN_CZ)));
ctShape.holes.push(cutoutPathR);

const countertopGeo = new THREE.ExtrudeGeometry(ctShape, {
  depth: CT_SLAB,
  bevelEnabled: false,
});
const countertop = new THREE.Mesh(countertopGeo, ctMat);
countertop.position.set(0, Y_CT_BOTTOM, 0);
scene.add(countertop);
```

**Step B: Create basin walls dari countertop bottom**
```typescript
// Basin walls extend downward dari countertop
const basinWallHeight = BASIN_DEPTH;
const basinWallShape = roundedRectShape(BASIN_W, BASIN_D, 2.5);
const basinWallGeo = new THREE.ExtrudeGeometry(basinWallShape, {
  depth: basinWallHeight,
  bevelEnabled: false,
});
basinWallGeo.rotateX(Math.PI / 2);

// Position: countertop bottom (Y_CT_BOTTOM) extend downward
const basinWallL = new THREE.Mesh(basinWallGeo, basinMat);
basinWallL.position.set(BAY_CX_L, Y_CT_BOTTOM, BASIN_CZ);
scene.add(basinWallL);

const basinWallR = new THREE.Mesh(basinWallGeo, basinMat);
basinWallR.position.set(BAY_CX_R, Y_CT_BOTTOM, BASIN_CZ);
scene.add(basinWallR);
```

**Step C: Add basin floor (sloping)**
```typescript
// Basin floor dengan slope toward drain
const floorShape = roundedRectShape(BASIN_W - 2, BASIN_D - 2, 2);
const floorGeo = new THREE.PlaneGeometry(BASIN_W - 2, BASIN_D - 2);

// Create sloped floor (rotate X-axis)
const floorL = new THREE.Mesh(floorGeo, basinMat);
floorL.rotation.x = -Math.PI / 2 + 0.08; // 5° slope
floorL.position.set(BAY_CX_L, Y_BASIN_BOTTOM + 1, BASIN_CZ - 2); // offset toward drain
scene.add(floorL);

const floorR = new THREE.Mesh(floorGeo, basinMat);
floorR.rotation.x = -Math.PI / 2 + 0.08;
floorR.position.set(BAY_CX_R, Y_BASIN_BOTTOM + 1, BASIN_CZ - 2);
scene.add(floorR);
```

**Step D: Add weld seam di junction**
```typescript
// Weld seam (visible integration)
const seamPathL = new THREE.EllipseCurve(
  BAY_CX_L, Y_CT_BOTTOM, BASIN_W / 2, BASIN_D / 2, 0, 2 * Math.PI
);
const seamPointsL = seamPathL.getPoints(64);
const seamGeoL = new THREE.BufferGeometry().setFromPoints(
  seamPointsL.map(p => new THREE.Vector3(p.x, p.y, BASIN_CZ))
);
const seamL = new THREE.Line(seamGeoL, new THREE.LineBasicMaterial({ color: 0x8898a8 }));
scene.add(seamL);

// Repeat for right basin
```

**Verification:**
- [ ] Basin integrated dengan countertop (no gap)
- [ ] Basin walls extend downward dari countertop
- [ ] Floor slope terlihat (5°)
- [ ] Weld seam visible di junction
- [ ] Screenshot dari 4 angles (front, side, top, isometric)

---

### Fix 1.3: Scrub Sink — Mirror Repositioning
**Time:** 60 minutes  
**File:** `src/app/components/ScrubSinkAssembled3D.tsx`

#### Sequential Steps:

**Step A: Calculate proper mirror position**
```typescript
// Current (line 478):
const mirrorCY = Y_BS_TOP + (Y_CANOPY_TOP - canopyH - Y_BS_TOP) / 2;
// Problem: mirrorCY = 135.5, terlalu dekat dengan canopy

// New: Proper clearance
const mirrorHeight = MIRROR_H; // 40 units
const canopyBottom = Y_CANOPY_TOP - canopyH; // 151
const backsplashTop = Y_BS_TOP; // 120

// Mirror position: 50mm clearance dari canopy dan backsplash
const mirrorClearanceTop = 5; // 50mm
const mirrorClearanceBottom = 5; // 50mm

const availableHeight = canopyBottom - mirrorClearanceTop - backsplashTop - mirrorClearanceBottom;
// availableHeight = 151 - 5 - 120 - 5 = 21 units

const mirrorCY = backsplashTop + mirrorClearanceBottom + mirrorHeight / 2;
// mirrorCY = 120 + 5 + 20 = 145
```

**Step B: Reposition mirror**
```typescript
// Replace line 483-484:
const mirrorZ = bsZ + 4;
const mirrorCY = 145; // Fixed position dengan proper clearance

([BAY_CX_L, BAY_CX_R]).forEach((mx) => {
  // Mirror glass
  addBox(scene, MIRROR_W, MIRROR_H, 0.8, mx, mirrorCY, mirrorZ, mirrorMat, false);
  
  // ... frame code remains
});
```

**Step C: Add mounting brackets**
```typescript
// Mirror mounting brackets (4 per mirror)
const bracketPositions = [
  [-3, 3], [3, 3], [-3, -3], [3, -3] // offsets from mirror center
];

([BAY_CX_L, BAY_CX_R]).forEach((mx) => {
  bracketPositions.forEach(([ox, oy]) => {
    const bracket = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 2, 8),
      matSS()
    );
    bracket.rotation.x = Math.PI / 2;
    bracket.position.set(mx + ox, mirrorCY + oy, mirrorZ + 1);
    scene.add(bracket);
    
    // Screw head
    const screw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.3, 6),
      matSS()
    );
    screw.rotation.x = Math.PI / 2;
    screw.position.set(mx + ox, mirrorCY + oy, mirrorZ + 2);
    scene.add(screw);
  });
});
```

**Verification:**
- [ ] Mirror 50mm below canopy bottom
- [ ] Mirror 50mm above backsplash top
- [ ] Mounting brackets visible (4 per mirror)
- [ ] Screenshot dari front dan side angles

---

## 🟠 PHASE 2: High Priority Fixes (6-8 hours)

### Fix 2.1: PB Door — Door Stop L-Profile
**Time:** 60 minutes  
**File:** `PbLeadDoorAssembled3D.tsx`

#### Steps:
1. Create L-profile shape dengan Shape + ExtrudeGeometry
2. Replace box dengan extruded L-profile
3. Add proper dimensions (25×25×3mm)
4. Add rebate depth (15mm into frame)

```typescript
// L-profile shape
const lShape = new THREE.Shape();
lShape.moveTo(0, 0);
lShape.lineTo(2.5, 0);  // 25mm horizontal
lShape.lineTo(2.5, 0.3); // 3mm thickness
lShape.lineTo(0.3, 0.3);
lShape.lineTo(0.3, 2.5); // 25mm vertical
lShape.lineTo(0, 2.5);
lShape.lineTo(0, 0);
lShape.closePath();

const lProfileGeo = new THREE.ExtrudeGeometry(lShape, {
  depth: DH,
  bevelEnabled: false,
});
const lProfile = new THREE.Mesh(lProfileGeo, matFrame());
lProfile.rotation.z = Math.PI / 2; // Rotate to proper orientation
lProfile.position.set(-DW / 2, 0, DT * 0.15);
scene.add(lProfile);
```

---

### Fix 2.2: PB Door — Door Closer Mechanism Refinement
**Time:** 90 minutes  
**File:** `PbLeadDoorAssembled3D.tsx`

#### Steps:
1. Refine main arm dengan proper angle (15-20°)
2. Add proper joint mechanism dengan bushing
3. Add adjustable forearm
4. Add mounting shoe dengan 4 screws

```typescript
// Main arm dengan angle
const mainArmStart = new THREE.Vector3(pivotBodyX, pivotBodyY, pivotBodyZ);
const mainArmJoint = new THREE.Vector3(
  pivotBodyX + 15, // 150mm forward
  pivotBodyY - 3,  // 30mm down
  pivotBodyZ + 2   // 20mm toward strike side
);
const mainArmPath = new THREE.LineCurve3(mainArmStart, mainArmJoint);
const mainArmGeo = new THREE.TubeGeometry(mainArmPath, 1, 0.8, 12, false);
```

---

### Fix 2.3: Scrub Sink — Basin Slope & Coved Corners
**Time:** 60 minutes  
**File:** `ScrubSinkAssembled3D.tsx`

#### Steps:
1. Increase slope angle (5-10°)
2. Emphasize coved corners (R25mm)
3. Add visible drain grate

```typescript
// Coved corner shape
const covedShape = new THREE.Shape();
// ... dengan quadraticCurveTo untuk rounded corners
```

---

### Fix 2.4: Scrub Sink — Faucet Curve Refinement
**Time:** 60 minutes  
**File:** `ScrubSinkAssembled3D.tsx`

#### Steps:
1. Add more control points untuk smooth S-curve
2. Add proper aerator dengan perforated face
3. Add IR sensor dome

```typescript
const neckPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(fX, fBaseY + 8, fBaseZ),
  new THREE.Vector3(fX, fBaseY + 15, fBaseZ + 3),
  new THREE.Vector3(fX, fBaseY + 22, fBaseZ + 8),
  new THREE.Vector3(fX, fBaseY + 24, fBaseZ + 15),
  new THREE.Vector3(fX, fBaseY + 22, fBaseZ + 20),
  new THREE.Vector3(fX, fBaseY + 20, fBaseZ + 22),
], false, 'catmullrom', 0.5);
```

---

### Fix 2.5: Scrub Sink — Mirror Frame Thickening
**Time:** 45 minutes  
**File:** `ScrubSinkAssembled3D.tsx`

#### Steps:
1. Increase frame thickness (1.5 → 2mm)
2. Add mitered corners (45° cut)
3. Add visible mounting clips

---

## 🟡 PHASE 3: Medium Priority Fixes (8-10 hours)

### Fix 3.1-3.8: Remaining Medium Issues

**Time per fix:** 45-75 minutes each

1. **PB Door Hinges** (60 min) — Reposition, increase size, add knuckle detail
2. **PB Door Window** (45 min) — Emphasize rounded corners, add gasket
3. **PB Door Kick Plate** (45 min) — Fix screw pattern, add countersunk detail
4. **PB Door Bottom Seal** (45 min) — Thicken housing, add rubber bulb
5. **PB Door Handle** (60 min) — Add proper bracket, mounting screws
6. **Scrub Sink Cabinet Doors** (60 min) — Adjust gaps, center handles, add hinges
7. **Scrub Sink Plexiglass Divider** (45 min) — Add U-channel base, L-brackets
8. **Scrub Sink Canopy** (75 min) — Refine LED housing, UV tube diffusers

---

## 🟢 PHASE 4: Low Priority Fixes (2-3 hours)

### Fix 4.1: Scrub Sink P-Trap Refinement
**Time:** 60 minutes  
**File:** `ScrubSinkAssembled3D.tsx`

#### Steps:
1. Refine P-trap curve dengan lebih control points
2. Add wall outlet flange
3. Add cleanout cap detail

---

### Fix 4.2: Final Polish
**Time:** 60-90 minutes

#### Tasks:
1. Run visual inspection script lagi
2. Compare before/after screenshots
3. Fix any remaining minor issues
4. Update documentation
5. Commit changes

---

## 📊 Verification Checklist

### After Each Fix:
- [ ] Code compiles tanpa errors
- [ ] Three.js scene renders tanpa console errors
- [ ] Visual appearance matches reference
- [ ] Screenshot captured dari multiple angles
- [ ] Annotation labels masih readable
- [ ] Camera presets masih berfungsi

### After Each Phase:
- [ ] Run `npm run build` — no TypeScript errors
- [ ] Run visual inspection script
- [ ] Compare screenshots dengan baseline
- [ ] Update gap analysis document
- [ ] Commit to git dengan descriptive message

---

## 🎯 Success Criteria

### Critical Fixes Complete When:
- ✅ PB door frame connected dengan wall (no floating)
- ✅ Scrub sink basin integrated dengan countertop (no gap)
- ✅ Scrub sink mirror has proper clearance (no overlap)

### High Priority Complete When:
- ✅ All 5 high issues fixed dan verified
- ✅ Visual quality 80%+ match dengan reference
- ✅ No obvious geometry errors

### Medium Priority Complete When:
- ✅ All 8 medium issues addressed
- ✅ Visual quality 90%+ match dengan reference
- ✅ Details look professional

### Low Priority Complete When:
- ✅ All 17 issues fixed
- ✅ Visual quality 95%+ match dengan reference
- ✅ Ready for client presentation

---

## 📝 Git Commit Strategy

### Commit Messages:
```bash
# Phase 1
git commit -m "fix(pb-door): add frame-to-wall connection with mounting brackets"
git commit -m "fix(scrub-sink): integrate basin with countertop using boolean cutout"
git commit -m "fix(scrub-sink): reposition mirror with proper canopy clearance"

# Phase 2
git commit -m "fix(pb-door): replace door stop box with L-profile extrusion"
git commit -m "fix(pb-door): refine door closer arm geometry"
git commit -m "fix(scrub-sink): increase basin slope and emphasize coved corners"
git commit -m "fix(scrub-sink): refine faucet gooseneck curve"
git commit -m "fix(scrub-sink): thicken mirror frame with mitered corners"

# Phase 3
git commit -m "fix(pb-door): reposition hinges and increase size"
git commit -m "fix(pb-door): emphasize window rounded corners"
# ... etc

# Phase 4
git commit -m "fix(scrub-sink): refine P-trap plumbing geometry"
git commit -m "chore: final polish and visual verification"
```

---

## 🚀 Quick Start Commands

```bash
# 1. Start dev server
npm run dev

# 2. Run visual inspection (baseline)
node inspect-products.mjs

# 3. Edit files (per fix above)

# 4. Verify in browser (http://localhost:5173)

# 5. Run build check
npm run build

# 6. Commit changes
git add .
git commit -m "fix(...): ..."

# 7. Repeat untuk next fix
```

---

## 📞 Support Resources

### Documentation:
- `PB_DOOR_SCRUB_SINK_GAP_ANALYSIS.md` — Detailed issue breakdown
- `VISUALIZATION_3D_GUIDE.md` — Three.js patterns
- `.github/copilot-instructions.md` — AI coding guidelines

### Reference Images:
- `clipboard-1774452592381-*.png` — PB door reference
- `clipboard-1774452592385-*.png` — Scrub sink reference

### Code References:
- `lib/three-scene.ts` — Shared utilities
- `hvac-system.ts` — Example of complex geometry
- `laf-system.ts` — Example of ceiling-mounted product

---

**Ready to start?** Begin dengan Phase 1, Fix 1.1 (PB door frame connection). Good luck! 🎯
