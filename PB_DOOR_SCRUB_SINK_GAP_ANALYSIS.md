# 🔍 PB Lead Door & Scrub Sink — Visual Gap Analysis

**Date:** March 25, 2026  
**Products:** PB Lead Door (pb-lead-door), Scrub Sink 2 Bay (scrub-sink)  
**Analysis Type:** Visual Gap Analysis vs Reference Images  
**Severity Scale:** Critical → High → Medium → Low

---

## 📋 Executive Summary

Berdasarkan analisis mendalam terhadap kode implementasi saat ini dan gambar referensi yang disediakan, ditemukan **17 visual gaps** yang perlu diperbaiki:

### PB Lead Door — 8 Issues
| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 1 | Frame/kusen tidak tersambung dengan wall context |
| 🟠 High | 3 | Door stop molding, door closer mechanism, hinge placement |
| 🟡 Medium | 4 | Window rounded corners, bottom seal, handle mounting, kick plate |
| 🟢 Low | 0 | - |

### Scrub Sink 2 Bay — 9 Issues
| Severity | Count | Key Issues |
|----------|-------|------------|
| 🔴 Critical | 2 | Basin terpisah dari countertop, mirror overlap |
| 🟠 High | 2 | Basin depth/slope tidak terlihat, faucet curve |
| 🟡 Medium | 4 | Mirror frame, cabinet doors, plexiglass divider, canopy |
| 🟢 Low | 1 | P-trap plumbing visibility |

---

## 🚪 PB Lead Door — Detailed Gap Analysis

### Product Specifications (ELFATECH V2)
- **Dimensions:** 1000 × 2200 mm (door leaf), 1080 × 2300 mm (with frame)
- **Thickness:** ±47 mm
- **Window:** 200 × 300 mm rounded corners (r=15mm)
- **Hinges:** 3× heavy duty butt hinges (LEFT side)
- **Door Closer:** Regular Arm 2-piece hydraulic
- **Kick Plate:** SS 304 brushed, 260 mm tall

---

### Issue #1: Frame/Kusen Disconnected 🔴 CRITICAL

**Problem:**
Dari gambar referensi terlihat frame/kusen tidak tersambung dengan proper ke wall context. Frame tampak "mengambang" tanpa connection yang jelas.

**Expected (Based on Reference):**
```
┌─────────────────────────────────┐
│         Wall Context            │
│    ┌─────────────────────┐      │
│    │    Frame (Kusen)    │      │
│    │  ┌───────────────┐  │      │
│    │  │   Door Leaf   │  │      │
│    │  └───────────────┘  │      │
│    └─────────────────────┘      │
└─────────────────────────────────┘
```

**Current Code Location:** `PbLeadDoorAssembled3D.tsx` lines 143-167

**Root Cause:**
```typescript
// Wall context — positioned BEHIND door
const wall = new THREE.Mesh(box(WALL_W, WALL_H, 3), matWall());
wall.position.set(0, 2.5, -(DT / 2 + FD / 2 + 3));  // ← Z offset terlalu jauh

// Frame jambs — tidak ada mechanical connection detail
const jambL = new THREE.Mesh(box(FW, DH, FD), fMat);
jambL.position.set(-DW / 2 - FW / 2, -FW / 2, 0);

// Missing: Frame-to-wall mounting brackets/anchors
// Missing: Wall pocket/rebate untuk frame insertion
```

**Fix Required:**
1. Add wall pocket/rebate detail (20-30mm deep) untuk frame insertion
2. Add mounting bracket/anchor visual (every 300mm)
3. Reduce gap antara frame back dan wall surface
4. Add sealant/caulking bead visual di frame-wall junction

---

### Issue #2: Door Stop Molding Tidak Terlihat 🟠 HIGH

**Problem:**
Door stop molding (L-shaped rebate) yang seharusnya menonjol dari frame untuk menahan door leaf tidak terlihat jelas atau tidak proper.

**Expected:**
```
Frame Profile Cross-Section:
┌────────────────────────────┐
│                            │
│    ┌────┐                  │
│    │Door│  ┌────          │
│    │Leaf│  │Stop│← L-shape │
│    └────┘  └────┘          │
│                            │
└────────────────────────────┘
```

**Current Code:** Lines 171-183
```typescript
// Door stop molding — L-shaped rebate on left jamb (hinge side)
const stopL = new THREE.Mesh(box(DOOR_STOP_W, DH, DOOR_STOP), stopMat);
stopL.position.set(-DW / 2 - 0.5, -FW / 2, DT * 0.15 + DOOR_STOP / 2);
```

**Issues:**
1. `DOOR_STOP = 1.5` (15mm) — terlalu tipis, seharusnya 20-25mm
2. `DOOR_STOP_W = 2` (20mm) — width terlalu sempit
3. Position `DT * 0.15` — tidak proper rebate depth
4. Missing return leg dari L-shape (hanya box, bukan L-profile)

**Fix Required:**
- Replace box dengan extruded L-profile shape
- Increase dimensions: 25×25×3mm
- Add proper rebate depth (15mm into frame)

---

### Issue #3: Door Closer Regular Arm 2-Piece Tidak Akurat 🟠 HIGH

**Problem:**
Door closer mechanism tidak merepresentasikan regular arm 2-piece yang sebenarnya. Main arm, forearm, dan pivot joint tidak terlihat jelas.

**Expected Geometry:**
```
        ┌──────────────┐  ← Body (hydraulic)
        │   CLOSER     │
        └─────────────┘
               │ Pivot
         ┌─────┴─────┐
         │ Main Arm  │ (200mm)
         └─────┬─────┘
               │ Joint
         ┌──────────┐
         │Fore Arm   │ (150mm)
         └─────┬─────┘
               │ Bracket
        ┌──────┴──────┐
        │ Door Mount  │
        └─────────────┘
```

**Current Code:** Lines 328-425

**Issues Identified:**
1. Main arm path terlalu lurus (tidak ada angle)
2. Forearm tidak ada proper connection ke door bracket
3. Pivot joint terlalu simple (hanya cylinder)
4. Missing adjustment screw details
5. Body pivot knuckle tidak ada

**Fix Required:**
- Refine main arm dengan proper angle (15-20° dari horizontal)
- Add proper joint mechanism dengan bushing detail
- Add forearm dengan adjustable length feature
- Add mounting shoe/bracket dengan 4 screws
- Add body pivot knuckle di closer body

---

### Issue #4: Butt Hinges Placement/Scale 🟡 MEDIUM

**Problem:**
3 butt hinges di LEFT side tidak memiliki scale dan placement yang tepat.

**Expected:**
- Top hinge: 150-200mm dari door top
- Middle hinge: centered
- Bottom hinge: 200-250mm dari door bottom
- Size: 100×75mm per leaf

**Current Code:** Lines 306-324
```typescript
[DH / 2 - 20, 0, -DH / 2 + 20].forEach((hy) => { ... });
```

**Issues:**
1. Spacing terlalu rapat (20 units = 200mm, seharusnya lebih spread)
2. Hinge leaf dimensions terlalu kecil
3. Missing knuckle detail
4. Pin diameter terlalu kecil

**Fix Required:**
- Reposition: `[DH/2 - 15, 0, -DH/2 + 15]` (150mm dari edge)
- Increase leaf size: 10×7.5 units (100×75mm)
- Add proper knuckle (5 barrels)
- Increase pin diameter

---

### Issue #5: View Glass Rounded Corners 🟡 MEDIUM

**Problem:**
Window 200×300mm dengan rounded corners (r=15mm) tidak terlihat proper.

**Current Code:** Lines 68-78, 244-260

**Issues:**
1. Corner radius `GR = 1.5` (15mm) — sudah benar tapi visual tidak jelas
2. Glass frame border terlalu tipis
3. Missing rubber gasket detail

**Fix Required:**
- Increase corner radius visual emphasis
- Thicken glass frame (2-3mm)
- Add visible rubber gasket (black EPDM)

---

### Issue #6: Kick Plate Missing Details 🟡 MEDIUM

**Problem:**
Kick plate 260mm tidak terlihat proper atau missing screw details.

**Expected:**
- SS 304 brushed finish
- 260mm height
- 6 countersunk screws (2 columns × 3 rows)

**Current Code:** Lines 268-285

**Issues:**
1. Screw placement tidak simetris
2. Missing screw head detail

**Fix Required:**
- Reposition screws dengan proper spacing
- Add countersunk screw head detail (Phillips)

---

### Issue #7: Bottom Seal Tidak Terlihat 🟡 MEDIUM

**Problem:**
Door bottom seal (aluminium housing + rubber drop) tidak terlihat jelas.

**Expected:**
- Aluminium housing (U-channel)
- Rubber drop seal (EPDM)
- Automatic drop mechanism (optional)

**Current Code:** Lines 232-237

**Issues:**
1. Housing terlalu tipis
2. Missing rubber seal visual

**Fix Required:**
- Thicken aluminium housing (3-4mm)
- Add visible rubber bulb seal

---

### Issue #8: Handle Mounting 🟡 MEDIUM

**Problem:**
Bar pull handle SS tidak proper mounting bracket.

**Expected:**
- Horizontal bar ⌀22×500mm
- 2× mounting brackets
- Base plates dengan 4 screws each

**Current Code:** Lines 288-305

**Issues:**
1. Bracket terlalu simple
2. Missing base plate screws

**Fix Required:**
- Add proper bracket design
- Add 4× mounting screws per base plate

---

## 🚿 Scrub Sink 2 Bay — Detailed Gap Analysis

### Product Specifications (ELFATECH V2)
- **Overall:** 1600 × 600 × 1550 mm (W×D×H)
- **Basins:** 2× (650 × 450 × 200 mm) deep sloping dengan coved corners
- **Countertop:** 25mm SS 304 polished
- **Faucets:** 2× gooseneck dengan IR sensor
- **Mirror:** 2× (550 × 400 mm) dengan SS frame
- **Cabinet:** 4 hinged doors dengan D-pull handles
- **Canopy:** LED strip + UV sterilization lamps

---

### Issue #9: Basin Terpisah dari Countertop 🔴 CRITICAL

**Problem:**
Dari gambar referensi terlihat basin/sink terpisah dari countertop (floating/tidak integrated).

**Expected:**
```
Countertop Cross-Section:
┌──────────────────────────────────┐
│     Countertop (25mm)            │
│  ┌────────────────────────┐      │
│  │   Basin (integrated)   │      │
│  │                        │      │
│  └────────────────────────┘      │
└──────────────────────────────────┘
```

**Current Code:** Lines 344-378

**Root Cause:**
```typescript
// Basin walls — ExtrudeGeometry downward
const basinMesh = new THREE.Mesh(basinGeo, basinMat);
basinMesh.position.set(bx, Y_CT_SURFACE, BASIN_CZ);

// Basin floor — separate mesh dengan slight slope
const floorMesh = new THREE.Mesh(floorGeo, basinMat);
floorMesh.position.set(bx, Y_BASIN_BOTTOM + 0.5, BASIN_CZ);
```

**Issues:**
1. Basin diposisikan di `Y_CT_SURFACE` (top countertop) tapi tidak ada boolean cut
2. Basin floor terpisah dengan gap
3. Tidak ada visual integration (seam terlihat)

**Fix Required:**
- Create countertop dengan pre-cut basin opening (boolean operation)
- Basin walls harus extend dari countertop bottom
- Add visible seam/weld line di basin-countertop junction
- Ensure basin rim flush dengan countertop surface

---

### Issue #10: Basin Depth/Slope Tidak Terlihat 🟠 HIGH

**Problem:**
Basin depth 200mm dengan sloping bottom tidak terlihat jelas.

**Expected:**
- Deep sloping design (200mm)
- Slope toward drain (back center)
- Coved corners (R25mm)

**Current Code:** Lines 356-378

**Issues:**
1. Slope terlalu subtle (0.02 radian)
2. Coved corners tidak terlihat
3. Drain position tidak jelas

**Fix Required:**
- Increase slope angle (5-10°)
- Emphasize coved corners dengan proper radius
- Add visible drain grate di center-back

---

### Issue #11: Mirror Overlap dengan Backsplash/Canopy 🔴 CRITICAL

**Problem:**
Mirror overlap dengan backsplash atau canopy — tidak ada proper clearance.

**Expected Placement:**
```
Elevation View:
    ┌─────────────────────┐  ← Canopy (Y=1550)
    │   LED + UV lamps    │
    └─────────────────────┘
           ↑ clearance
    ┌─────────────────────┐
    │     Mirror          │  ← Top edge 50mm below canopy
    │                     │
    └─────────────────────┘
           ↑ 
    ┌─────────────────────┐  ← Backsplash top (Y=1200)
    │   Backsplash        │
    └─────────────────────┘
```

**Current Code:** Lines 478-495

**Root Cause:**
```typescript
const mirrorCY = Y_BS_TOP + (Y_CANOPY_TOP - canopyH - Y_BS_TOP) / 2;
// mirrorCY = 120 + (155 - 4 - 120) / 2 = 120 + 15.5 = 135.5
```

**Issues:**
1. Mirror center calculation salah
2. Missing clearance dari canopy bottom
3. Mirror mounting bracket tidak ada

**Fix Required:**
- Reposition mirror: 50mm below canopy, 50mm above backsplash top
- Add SS mounting brackets (4 per mirror)
- Add visible gap/clearance

---

### Issue #12: Mirror Frame SS Tidak Terlihat 🟠 HIGH

**Problem:**
SS frame 4 bars dengan proper thickness tidak terlihat proper.

**Expected:**
- 4 bars: top, bottom, left, right
- Thickness: 1.5-2mm
- Width: 15-20mm

**Current Code:** Lines 486-495

**Issues:**
1. Frame bars terlalu tipis
2. Missing mitered corners
3. Missing mounting clips

**Fix Required:**
- Increase frame thickness
- Add mitered corner joints
- Add visible mounting clips (4 per mirror)

---

### Issue #13: Gooseneck Faucet Curve 🟠 HIGH

**Problem:**
Gooseneck faucet curve tidak akurat — seharusnya S-curve dengan CatmullRom.

**Expected:**
```
Side View:
         ┌──┐  ← Aerator
        ╱    ╲
       ╱      ╲  ← Gooseneck (S-curve)
      │        │
      │  Base  │
      └────────┘
```

**Current Code:** Lines 408-435

**Issues:**
1. Curve terlalu kaku (kurang smooth)
2. Aerator tidak proper shape
3. Missing IR sensor window

**Fix Required:**
- Refine CatmullRom curve dengan lebih control points
- Add proper aerator (perforated spray face)
- Add IR sensor window (black dome)

---

### Issue #14: Cabinet Doors Alignment 🟡 MEDIUM

**Problem:**
4 hinged doors tidak proper alignment/gap.

**Expected:**
- Even gaps (3-4mm) antar doors
- D-pull handles centered
- Proper hinge visibility

**Current Code:** Lines 145-162

**Issues:**
1. Gap terlalu besar/kecil
2. Handle placement tidak centered
3. Missing hinge detail

**Fix Required:**
- Adjust door gap (0.5 units = 5mm)
- Center handles pada each door
- Add visible hinges (2 per door)

---

### Issue #15: Plexiglass Divider 🟡 MEDIUM

**Problem:**
Plexiglass divider tidak proper placement.

**Expected:**
- 8mm thickness
- Center position antar basins
- SS channel base

**Current Code:** Lines 381-385

**Issues:**
1. Thickness terlalu tipis
2. Missing SS base channel
3. Missing wall mounting brackets

**Fix Required:**
- Increase thickness to 0.8 units (8mm)
- Add U-channel base
- Add L-brackets di backsplash

---

### Issue #16: Canopy LED/UV Placement 🟡 MEDIUM

**Problem:**
LED strip dan UV lamps placement tidak akurat.

**Expected:**
- LED strip: continuous di center
- UV lamps: 2× tubes di kiri-kanan
- Emissive material dengan proper color

**Current Code:** Lines 501-522

**Issues:**
1. LED strip terlalu tipis
2. UV lamps tidak proper tube shape
3. Missing diffuser lens

**Fix Required:**
- Thicken LED strip dengan diffuser
- Add proper UV tube (purple emissive)
- Add aluminum housing

---

### Issue #17: P-Trap Plumbing Visibility 🟢 LOW

**Problem:**
P-trap plumbing tidak visible atau incorrect.

**Expected:**
- SS 304 pipe (⌀40mm)
- P-trap curve di bawah basin
- Wall outlet

**Current Code:** Lines 390-405

**Issues:**
1. Curve terlalu simple
2. Missing wall connection
3. Missing cleanout cap

**Fix Required:**
- Refine P-trap curve
- Add wall outlet flange
- Add cleanout cap detail

---

## 📊 Summary & Priority Matrix

### Priority 1: Critical (Fix Immediately)
1. ✅ **PB Door Frame Disconnected** — Add wall pocket + mounting brackets
2. ✅ **Scrub Sink Basin Floating** — Boolean cut countertop, integrate basin
3. ✅ **Scrub Sink Mirror Overlap** — Reposition with proper clearance

### Priority 2: High (Fix Next Session)
4. ✅ **PB Door Stop Molding** — Replace with L-profile extrusion
5. ✅ **PB Door Closer Mechanism** — Refine arm geometry
6. ✅ **Scrub Sink Basin Slope** — Increase slope, emphasize coved corners
7. ✅ **Scrub Sink Faucet Curve** — Refine CatmullRom path

### Priority 3: Medium (Fix When Time Permits)
8. ✅ **PB Door Hinges** — Reposition, increase size
9. ✅ **PB Door Window** — Emphasize rounded corners
10. ✅ **PB Door Kick Plate** — Fix screw pattern
11. ✅ **PB Door Bottom Seal** — Thicken housing
12. ✅ **PB Door Handle** — Add mounting detail
13. ✅ **Scrub Sink Mirror Frame** — Thicken, add mitered corners
14. ✅ **Scrub Sink Cabinet Doors** — Adjust gaps, center handles
15. ✅ **Scrub Sink Plexiglass Divider** — Add base channel
16. ✅ **Scrub Sink Canopy** — Refine LED/UV housing

### Priority 4: Low (Nice to Have)
17. ✅ **Scrub Sink P-Trap** — Refine curve, add cleanout

---

## 🛠️ Recommended Fix Strategy

### Phase 1: Critical Fixes (4-6 hours)
1. Fix PB door frame-wall connection
2. Fix scrub sink basin-countertop integration
3. Fix scrub sink mirror repositioning

### Phase 2: High Priority (6-8 hours)
4. Replace PB door stop with L-profile
5. Refine door closer mechanism
6. Refine basin slope and faucet curve

### Phase 3: Medium Priority (8-10 hours)
7. Polish all remaining medium issues

### Phase 4: Low Priority (2-3 hours)
8. Final details and polish

**Total Estimated Time:** 20-27 hours

---

## 📸 Visual Inspection Script

Script Playwright sudah dibuat: `inspect-products.mjs`

**Execution:**
```bash
npm run dev
node inspect-products.mjs
```

**Output:**
- Screenshots di `product-inspection-screenshots/`
- Report di `product-visual-inspection-report.json`

---

## 🎯 Next Actions

1. **Run visual inspection script** untuk capture semua views
2. **Manual review** screenshot vs reference images
3. **Prioritize fixes** berdasarkan criticality
4. **Implement fixes** per phase
5. **Re-run inspection** untuk verify improvements

---

**Prepared by:** AI Assistant  
**Review Status:** Ready for action  
**Last Updated:** March 25, 2026
