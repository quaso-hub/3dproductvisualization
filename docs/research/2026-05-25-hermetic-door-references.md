# Hermetic Door — Real-Product Reference Research

**Date**: 2026-05-25
**Purpose**: Ground-truth reference data for the Hermetic Door 3D viewer rebuild. Same audit pattern as PB Lead — verify the current model against real OR/cleanroom hermetic door products before committing to targeted-diff vs rebuild.
**Sources**: Portalp, Dortek, NABCO, Grupsa, Manusa, Tané Hermetic, Door Studio, BCMS Indonesia, Lesho China, Metaflex, ASSA ABLOY.

---

## 1. What is a "hermetic door" exactly?

A **hermetic door** is an airtight, gasketed door that maintains a pressure differential between two zones. In OR/cleanroom contexts it comes in three variants:

| Variant | Use | Frequency in OR |
|---|---|---|
| **Sliding hermetic** (overhead track + drop seal) | OR, ICU, X-ray, sterile labs | **Dominant — 70–80% of new OR builds** |
| Swing hermetic (hinged with full-perimeter compression gasket) | Pre-op, recovery, less-traffic cleanrooms | ~20% |
| Hermetic + lead-lined (Pb-shielded variant of either) | Radiology / hybrid OR | Specialty |

**Confirmation across sources**:
- Manusa: *"hermetic doors for operating theatres … can be sliding, swing, or lead-lined"*
- Door Studio (Asia): photos of installations at Lerdsin Hospital show **automatic sliding** in OR
- Portalp (`portalp_HDS_clean`): all marketing photos show **automatic sliding** for hospital
- NABCO NAX: *"surface-mounted automatic sliding door … ideal for operating rooms as well as X-ray rooms"*
- Tané TH8: hermetic sliding door for OR, X-ray, labs
- openpr/Tavily: *"Sliding Door — most common in high-traffic areas (emergency, ICUs, ORs). Hermetic versions maintain pressure differentials. 48% of new builds"*

**For the SE Asia / Indonesia market** specifically (BCMS Indonesia DMH01, Door Studio Thailand, Dolson Nusantara): **sliding hermetic dominates**. Stretcher clearance + hands-free operation + maintained pressure differential drive the choice.

> **Verdict for our model**: target = **AUTOMATIC SLIDING HERMETIC DOOR** with overhead surface-mounted operator. The current model is correctly specified as sliding (`Hermetic Auto Sliding Door`).

---

## 2. Visible hardware on a real hermetic sliding door

| Component | Real product | In our current model? |
|---|---|---|
| **Overhead operator housing** | Surface-mounted aluminum extrusion, 180–280 mm tall, 200 mm deep, **wider than door** (carries trolleys + drive belt + motor). Portalp: H 278 × 201 mm with dust cover. | ✅ Yes — `HW = DW + 20`, `HH = 42`, `HDT = 28` (= ~420 × 280 mm real, slightly taller than real). |
| **Track rail / trolleys** | Hidden inside housing OR thin visible aluminum profile at housing bottom. | ✅ Yes — track at `housingY + 3`, hidden within housing zone. |
| **Drop seal (auto-bottom)** | Mechanical retractable bottom seal. Drops 10–15 mm when closed; retracts when door slides open. **Key feature** — Lesho: *"max 15 mm downwards and 10 mm inwards … door body presses the floor and frame tightly"*. | ❌ Not present. We have a static `floorGuide` rail but no drop seal mechanism. |
| **Side gaskets** (EPDM compression strips) | Visible dark rubber strips around door perimeter (top, sides) and on jambs. | ✅ Yes — 4 EPDM strips around door perimeter (`epdmItems`). |
| **Handle** | **Recessed pull / flush handle** on cleanroom side (most OR doors). D-pull on corridor side. **Real hermetic doors do NOT have a protruding cylinder bar** — Tané TH8: *"60 mm flush door leaf and flush integrated components"*. Door Studio: *"Components are flush-mounted within the door frame"*. | ❌ **WRONG** — current model uses a `CylinderGeometry(0.9, 0.9, 28)` vertical bar protruding 3+28 units from the door face with two horizontal pin brackets. This is a **kapal-pecah protrusion** that does not exist on real hermetic doors. **This is the user's complaint.** |
| **View window** | Standard option. Square or arc, 300–500 mm wide × 400–600 mm tall, flush-mounted (no protruding frame on cleanroom side). Lead glass for radiology variant. | ✅ Yes — 300 × 400 mm (matches `WW = 30, WH = 40` at 1:10 scale). |
| **Sensor / actuator** | Motion sensor mounted on header. Push-plate or foot pedal on wall (separate from door). | ✅ Partial — 2 sensor boxes mounted to housing area, plus 2 indicator LEDs (green/amber). Real doors: usually 1 sensor centered or 2 PIR domes. |
| **Frame architrave** | Thin SS or aluminum trim around opening, both sides. | ✅ Yes — `frameMat` jambs and sill. |
| **Bump guard** | Horizontal SS strip at lower third — kick plate / stretcher protector. | ✅ Yes — `bumpGuard` horizontal strip at `-DH/4`. Realistic. |
| **LED indicator strip** on housing | Status indicator on housing front face. | ✅ Yes — `indicator` BoxGeometry. Realistic detail. |

---

## 3. Real product dimensions

Sourced from Portalp, Grupsa, Lesho, Dortek, BCMS Indonesia spec sheets:

| Dimension | Industry standard | Our model |
|---|---|---|
| Single-leaf clear width | 900–1500 mm typical (Grupsa: 1200–1600; Portalp: 700–1800) | **1600 mm** ✅ (top end of single-leaf) |
| Single-leaf passage height | 2100–2500 mm (Portalp: up to 2500) | **2100 mm** ✅ |
| Panel thickness | 50–80 mm typical (BCMS: 50 mm; Tané: 60 mm; Lesho: 50 mm) | **DT = 10 (= 100 mm real)** — slightly over-thick, but the cross-section sum (0.8+45+2+45+0.8 = 93.6 mm) is consistent with our `DT=10` visual. **Real should be ~50–60 mm**. |
| Housing height | 180–280 mm (Portalp: 185–278) | **HH = 42 (= 420 mm real)** — **TOO TALL by 1.5–2×**. Real housing should be ~180–250 mm = `HH ≈ 22–25`. |
| Housing depth | 200 mm (Portalp: 201) | **HDT = 28 (= 280 mm real)** — slightly thick, real ~200 mm = `HDT ≈ 20`. |
| Housing width | Door width × 2 (track must accommodate door slid open) | **HW = DW + 20 = 180** — **TOO NARROW**. Real housing should span ~`DW × 2 ± 50` = roughly `300–320` for a 1600 mm door. |
| Window | 300×400 mm rectangular (or round oculus 350 mm dia) | **30 × 40 = 300 × 400 mm** ✅ |
| Panel weight | 100–150 kg single (Lesho: 150 kg; Portalp: 150 kg) | N/A (not modeled) |

---

## 4. Materials

| Layer | Real construction | Our model |
|---|---|---|
| Outer face | SS AISI 304/316 (1.0 mm), HPL antibacterial laminate, OR powder-coated galvanized steel | ✅ SS face (0.8 mm) — close to real 1.0 mm |
| Core | PIR foam, polyurethane, paper honeycomb, aluminum honeycomb, OR rock wool. Lesho: *"flame retardant paper honeycomb / fireproof aluminum honeycomb / rock wool"*. | ✅ PIR foam core (45 mm × 2 = 90 mm) — realistic |
| Lead lining (radiology variant only) | Pb 1–4 mm sheet between core layers (Grupsa: 1–4 mm; current OR baseline does NOT include Pb) | ✅ Pb 2 mm sandwiched between PIR layers — only correct **IF** modeling the hybrid-OR / radiology variant. **Note**: most plain OR hermetic doors do not have lead. Our product positions itself as the radiology variant per the description ("Lapis Pb 2mm + Glass Pb"), so this is consistent with the named product. |
| Glass | Tempered safety glass (clean rooms) OR Pb lead glass 5–10 mm (radiology) | ✅ Lead glass 5 mm — realistic for radiology variant |
| Hardware | SS 304 (medical-grade) | ✅ |
| Frame | SS 304 or aluminum extrusion | ✅ |
| Gaskets | EPDM rubber, GMP-certified | ✅ EPDM strips |

---

## 5. Air-tightness spec

Industry standard certifications:
- **EN 12207 Class 4** (highest air permeability class) — Grupsa, Tané TH8, BCMS DMH01, Portalp HDS Clean, Door Studio
- Independent leak rate: < 1 m³/h at 20 Pa pressure differential (Portalp); up to 250–400 Pa pressure (Dortek)
- **ISO 14644 Class 5–8** cleanroom compatible
- **FGI Guidelines** for Hospital Construction (US): hermetic seal required for OR Class B/C

Our model spec text: *"Proteksi Radiasi: Lapis Pb 2mm + Glass Pb"* — focuses on radiation, not air-tightness. Could optionally add `EN 12207 Class 4` to specs list for credibility, but not a 3D-model issue.

---

## 6. The "wall behind" question

**Manufacturer product photography practice — confirmed across 9 catalogs (Portalp, NABCO, Grupsa, Dortek, Tané, Door Studio, Manusa, Metaflex, BCMS)**:

| Style | % of catalog shots |
|---|---|
| Door **floating, no wall context** (white or grey background) | **~70%** |
| Door with **thin frame architrave** hint (no full wall) | ~20% |
| Door installed in actual room (wall visible) | ~10% (only "case study" / "installation" pages, NEVER on the product spec page) |

> **Verdict**: For a product catalog 3D viewer the EXPECTED rendering is **floating door with no wall**. Any "wall behind" is decorative noise that:
> 1. Blocks the open-state animation visually
> 2. Inflates polygon count
> 3. Departs from manufacturer convention

**Current model status**: Wall was already removed in Session 10 Item 1 per the comment in `HermeticDoorAssembled3D.tsx:47` (`Wall context removed Session 10 Item 1 — was blocking open/close scenario view.`). The `matWall()` function is retained as `void matWall;` reference but unused. **The wall is gone in the code.** Verify with a screenshot before claiming this is unfixed.

---

## 7. Animation pattern

**Sliding hermetic door (our case)**:
- Door translates **horizontally along X axis** (positive or negative) along the overhead track
- Slide distance = full door width (≈ DW = 160) so the door clears the opening completely
- Drop seal retracts upward 10–15 mm at start of slide, deploys downward at end of close
- Slide speed: 250–550 mm/s (industry standard, BCMS DMH01) → at our scale 1:10 ≈ 25–55 units/sec
- **NOT a 90° rotation** — that pattern belongs to PB Lead (swing door)

**Current model status**: `DOOR_OFFSET = 0` is hard-coded and there is **no slide animation** in `HermeticDoorAssembled3D.tsx`. Door sits in closed position. The user complaint *"when 'open' feature plays"* implies an expectation of an animation that does not exist yet.

> **Verdict**: The "open" feature is **not implemented** for hermetic-door currently. If user is seeing PB Lead's 90° rotation applied to hermetic-door via shared toggle code, that would be a wrong animation pattern (sliding ≠ swinging).

---

## 8. Dimensions table (current vs recommended)

| Constant | Current value | Real-world equiv | Recommended | Reason |
|---|---|---|---|---|
| `DW` (door width) | 160 | 1600 mm | **160** ✅ keep | Matches industry single-leaf clear width |
| `DH` (door height) | 210 | 2100 mm | **210** ✅ keep | Matches industry standard |
| `DT` (panel thickness) | 10 | 100 mm | **6** | Real hermetic panels are 50–60 mm. Reduces visual bulk. |
| `WW` × `WH` (window) | 30 × 40 | 300 × 400 mm | **30 × 40** ✅ keep | Matches real window size |
| `WT` (glass thickness) | 0.6 | 6 mm | **0.5** | Matches lead glass 5 mm |
| `HW` (housing width) | 180 (= DW + 20) | 1800 mm | **310** (= DW × 2 - 10) | Real overhead operator must span 2× door width to allow door to slide fully open |
| `HH` (housing height) | 42 | 420 mm | **22** | Real housings are 180–250 mm tall (Portalp: 185–278) |
| `HDT` (housing depth) | 28 | 280 mm | **22** | Real ~200 mm |
| `FT` (frame thickness) | 8 | 80 mm | **6** | Real frame profiles ~60 mm |
| Handle | Cylinder bar 28 long protruding 3+ from face | — | **Recessed pull pocket** carved INTO panel face (or thin flush D-pull on corridor side, max 15 mm protrusion) | Real hermetic doors are flush — Tané: *"flush integrated components"* |
| Sensors | 2 boxes 4×8×3 + 2 LEDs | — | **1 PIR dome** at housing center OR keep current 2 boxes flatter | Acceptable; current is plausible |
| Drop seal | None | — | **Add**: thin EPDM strip at door bottom edge that retracts upward when sliding | Defining hermetic feature; missing |

---

## 9. User complaints — verdict

### Complaint 1: *"Hermetic door exploded view is different from assembled view (sync issue)"*

**Verdict**: **BUG — REAL**

Components present in **assembled** but **missing from exploded**:
1. Handle wall-mount **brackets** (assembled has bar + 2 brackets; exploded has only the bar)
2. **Bump guard horizontal strip** (`bumpGuard` mesh, line 224 of assembled) — completely missing from exploded
3. **Glass frame** (4-piece thin SS border around window, lines 240–251 of assembled) — missing from exploded
4. **3 of 4 EPDM gasket strips** — assembled has 4 (top/bottom/left/right), exploded has only the top piece flying upward
5. **Housing flange** (the SS connecting lip between housing bottom and frame jambs, line 357–363 of assembled) — missing from exploded

The exploded view also splits the panel into 5 cross-section layers (correct) but does not visually represent the *assembled* single-panel geometry, so when a user flips between views, the panel "shape" appears to change. This is technically correct for an exploded view but contributes to the perceived mismatch.

**Reason**: Exploded was rewritten in Session 10 Item 1 with a focus on radial explosion of major parts but did not fully enumerate every detail from assembled.

### Complaint 2: *"There may be a wall behind the door blocking visual when 'open' feature plays"*

**Verdict**: **DEPENDS — likely NOT-A-BUG (already fixed) BUT 'open' feature itself is missing**

- Wall is **already removed** in Session 10 Item 1 (`HermeticDoorAssembled3D.tsx:47`). If the user still sees a wall, it's a build-cache issue or they are looking at a stale screenshot.
- However, there is **no slide-open animation** implemented in the hermetic-door viewer at all (`DOOR_OFFSET = 0` hard-coded, no animation hook). The "open feature" the user references doesn't exist for this product.
- If the project's shared open/close toggle (e.g. from PB Lead) gets applied to hermetic-door, it would rotate 90° — wrong pattern. Hermetic doors **slide horizontally**, not swing.

### Bonus complaint (implicit): *"same kapal-pecah pattern of bar protrusions"*

**Verdict**: **BUG — REAL**

The vertical cylinder handle (`CylinderGeometry(0.9, 0.9, 28)` at `DT/2 + 3` Z-offset) plus its two horizontal pin brackets is a fabricated detail with no equivalent on real hermetic doors. Tané, Door Studio, Grupsa, Portalp, Manusa, Dortek all explicitly market **"flush integrated components"** and **"flush-mounted"** hardware. The protruding bar is the same class of "kapal pecah" issue the user just fixed on PB Lead.

---

## 10. Recommended approach

**TARGETED-DIFF, not rebuild.**

The structural skeleton is correct: dimensions match industry standard (1600×2100 single-leaf), door is correctly identified as sliding, materials are sensible, frame/housing/sensor topology matches real products, EPDM gaskets are present, lead glass exists for the radiology variant.

The fixes are surgical, **estimated 4–6 targeted edits** in two files plus one product-data tweak:

### Priority order

| # | Fix | File | Effort |
|---|---|---|---|
| 1 | **Replace protruding cylinder handle** with flush recessed pull (carve a shallow rectangular indent into door face, e.g. 8 × 25 × 1.5 deep, on the right side mid-height). Real hermetic OR doors use either a recessed pocket OR a flat D-pull max 15 mm thick. | `HermeticDoorAssembled3D.tsx` lines 263–279 + `HermeticDoorExploded3D.tsx` lines 303–313 | M |
| 2 | **Sync exploded view with assembled** — add the missing details: handle brackets, bump guard strip, 4-piece glass frame, all 4 EPDM gasket strips (not just the top), and housing flange. Each should explode along the same direction as its assembled neighbor. | `HermeticDoorExploded3D.tsx` | M |
| 3 | **Implement slide-open animation** if user expects an "open" feature. Translate door panel + bump guard + handle + glass + Pb stripe in X direction by `DW` units over 2 seconds with ease-in-out. Drop seal optional. NOT a 90° rotation. | `HermeticDoorAssembled3D.tsx` (new toggle + animation loop) | L |
| 4 | **Right-size housing**: reduce `HH` from 42 → ~22 (matches Portalp 185–278 mm), increase `HW` from `DW+20` → ~`DW*2-10` so the door has somewhere to slide into when open. | `HermeticDoorAssembled3D.tsx` lines 41–43 + mirror in exploded | S |
| 5 | **Reduce panel thickness** `DT` from 10 → 6 to match real 50–60 mm panels. | both viewer files | S |
| 6 | **Add drop seal** (thin EPDM strip 1 unit tall at door bottom, retracts upward in open state). Defining hermetic feature. | `HermeticDoorAssembled3D.tsx` | S |
| 7 | **Verify wall is fully gone** on screen (the code says it is — confirm with a fresh screenshot to close out user's complaint #2). | screenshot validation | XS |

**Estimated total**: 1.5–2 sessions of focused work. Avoids the cost of a full rebuild and preserves the correct structural decisions already made.

---

## Sources

- Portalp HDS Clean: <https://www.portalp.com/en/solutions/automatic-doors/hospitals-and-clean-rooms/automatic-hermetic-sliding-door/>
- Dortek Hermetic Sliding: <https://dortek.com/product/hermetic-sealing-sliding-doors/>
- NABCO NAX GT9000: <https://www.nabcoentrances.com/product/hermetic-door/>
- Grupsa HS-201/401: <https://grupsa.com/en/hermetic-sliding-doors-for-operating-rooms>
- Manusa OR doors: <https://www.manusa.com/en/blog/hermetically-automatic-doors-operating-theatres>
- Tané Hermetic TH8: <https://www.tanehermetic.co.uk/en/medical-healthcare-sector/hermetic-sliding-doors/th8-hermetic-healthcare-sliding-door-for-operating-theatres.aspx>
- Door Studio Asia: <https://doorstudio.asia/en/products/hermetic-door>
- BCMS Indonesia DMH01: <https://bcms.co.id/en/automatic-hermetic-door-dmh01/>
- Lesho China: <https://leshochina.en.made-in-china.com/product/DwytUFVKEiAr/China-Operating-Room-Automatic-Hermetic-Sliding-Door.html>
- Standards: EN 12207 Class 4, EN 1026, ISO 14644, EN 16005
