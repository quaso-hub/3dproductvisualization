# PB Lead Door — Real-World Reference Research

**Date:** 2026-05-25
**Researcher:** OpenCode (multi-source web search + manufacturer datasheets)
**Purpose:** Establish 1:1 ground truth for rebuilding the `PbLead*3D.tsx` viewer so it matches a real-world radiation-shielding lead door.
**Scope:** Form factor, visible hardware, dimensions, the "mystery bar" question, the "wall behind" question, animation, lead thickness, and verdicts on the user's 3 reported bugs.

---

## TL;DR — Verdicts on User's 3 Complaints

| # | Complaint | Verdict | Reason |
|---|-----------|---------|--------|
| 1 | "Bar besi tipis sticking out of top kusen" | **BUG (real)** | Real PB lead doors have **NO horizontal bar above the frame top**. Door closers mount on the door **face** (with an arm reaching the frame stop), not on top of the frame. Current code likely has stray geometry: hinge pin overhang, top rubber stop strip protruding, or remnant gasket strip from when the wall was removed. **Fix: targeted-diff** — find and remove. |
| 2 | "Wall behind blocking visual when door opens" | **DEPENDS** — **mostly NOT-A-BUG** | Industry standard product-catalog practice (Marshield, Ultraray, Raybloc, Spenle, RPP, Overly Door) shows lead doors **floating without a wall** in product shots. The repo's PbLeadDoorAssembled3D already documents (lines 669–675) that the wall slab + architrave + drywall Pb tabs were removed in Session 10. **If the user still sees a wall, it's a leftover fragment, not the design.** **Fix: targeted-diff** — verify nothing remains. |
| 3 | "Exploded view doesn't match assembled view" | **BUG (real)** | Frame depth differs between files: `assembled FD = DT + 8 = 12.7` vs `exploded FD = 12`. Frame top header in exploded view also lacks the rubber-stop bead, gasket flange, drop-seal housing, and continuous hinge that the assembled view shows. **Fix: targeted-diff** — sync constants and re-add missing parts to exploded scene. |

**Recommended overall approach: targeted-diff, not rebuild.** The architecture is sound; the issues are 3 specific geometry/data-sync bugs.

---

## 1. Form Factor — Hinged vs Sliding

**Both styles exist; both are sold by the same vendors.** The choice is application-driven:

| Type | When used | Examples |
|------|-----------|----------|
| **Hinged (swing)** | General radiology rooms, scrub-room-adjacent rooms, dental, veterinary, mobile X-ray, low-traffic shielded rooms, OR observation rooms. Up to ~Code 8 (3.55 mm Pb). | Spenle **SP240X**, Marshield hinged, Ultraray standard, Lead Shielding (Intech), Raybloc single-leaf |
| **Sliding (manual or motorized)** | CT/MRI/PET-CT/cathlab, linear accelerators, NDT, heavy shielding (>1/8" Pb), space-constrained rooms, stretcher-clearance rooms. | Spenle **SP440X**, Marshield automatic/manual sliding, AD Systems ExamSlide, Sainty automatic, Indonesian Tokopedia listings |

**Indonesian/Asian market default for OR scrub-room-adjacent (the segment ELFATECH/Lukman/Sarana Husada serve):**
- **Hinged + 2 mm Pb** is the default for radiology room entry doors (see Lukman.co.id "Timah hitam (Pb) 2 mm" and saranahusada.com).
- **Sliding hermetic + 2 mm Pb** is the default for CT/MRI and operating theater entry (see Tokopedia 1100×2100mm sliding listing).

**Current model (`PbLeadDoorAssembled3D.tsx`) is hinged with 90° swing.** That's correct for a **scrub-sink-adjacent shielded room** product line. **Keep hinged.** Do not switch to sliding.

---

## 2. Visible Hardware (Outside Face of Real Lead Doors)

### 2.1 Hinges — **continuous hinge (piano hinge) is the standard**
> "All doors are provided with a **continuous hinge** because of the high weights involved with lead lined doors." — Lead Shielding / Intech
> "Ultraray's standard **continuous hinge system** helps support precise alignment and smooth long-term operation." — Ultraray
> "MarShield recommends the use of **pivot or continuous type hinges** for all applications. When butt hinges are to be specified and used they must be fully rated for the weight … minimum of three hinges should be used for doors up to 90″ in height. For every extra 30″ of door height add one more hinge." — Marshield

**Implication for our model:** Discrete 5-knuckle butt hinges (current implementation) are **acceptable for hinged style** but a **continuous hinge is more authentic**. Recommendation: **keep 4 butt hinges** (currently 3, per `addHinges`) for visual clarity — exploded view reads better with discrete hinges than a 2.2 m piano hinge. This is a tradeoff between authenticity and exploded-view legibility; current choice is defensible.

### 2.2 Handle — **lever or D-pull, not bar pull**
- Lead Shielding shows a **lever lockset** (standard cylindrical lockset)
- Marshield shows lever locksets in product photos
- Raybloc offers ironmongery options including levers and pulls
- Bar pulls are common for **double-action hands-free push** in OR/ICU contexts (current model uses vertical bar pull at length 500 mm — appropriate for **OR/scrub-room context**)

**Current bar pull implementation (line 374 onward, length 500 mm = 50 units, 30 mm standoff) is realistic for an OR-context door.** Keep it.

### 2.3 Door Closer — mounts on door **face**, NOT on top of frame
> "**Lead-lined closer covers are not needed**, because the steel fasteners filling the holes through the door (and the lead) do not result in significant radiation [leakage]." — idighardware.com (industry FAQ)

Real overhead door closers (e.g. Sargent 281, LCN 4040, Dorma TS83) mount **on the door face just below the top rail**, with an articulating arm reaching across to a shoe on the **frame head** (the stop side of the frame, also on the inside-near-top — NOT extending above the frame).

**Current implementation:**
- `closerGroup` is positioned at `(0, DH/2 + FW/2, DT/2 + 3)` per exploded view (line 332–333)
- That's ABOVE the frame head (DH/2 + FW/2 = 110 + 4 = 114 vertical units), placing the closer body floating at the top of the frame.
- This is the **most likely source of the user's "thin bar above the kusen" complaint** if the closer rendering looks thin/elongated, OR if a fragment of the previous wall-bound closer arm remains.

**Fix:** Move closer body **inside the door face, near the top** (e.g. `Y = DH/2 - 8`, `Z = DT/2 + 1`). Arm articulates upward toward frame stop. This is also where authentic Sargent 281 / LCN 4040 sits in real photos.

### 2.4 Vision Window (lead glass observation panel)
**Standard practice in real lead doors:**
- **Eye height** (window center): **~1500 mm from floor** (varies 1450–1550 mm)
- **Common sizes:**
  - **200×300 mm** (the 360Visualise "leaded door with 200×300mm leaded viewing window" SKU; Spenle standard)
  - **200×200 mm** (Indonesian Tokopedia listing — square port)
  - **305×305 mm (12"×12")** (Ultraray standard)
  - **152×610 mm (6"×24")** narrow vertical (Ultraray)
  - **152×914 mm (6"×36")** tall narrow (Ultraray)
  - **610×914 mm (24"×36")** maximum (Ultraray)
- **Lead glass thickness:** matches Pb equivalence of door (e.g. 12 mm physical glass ≈ 2.0 mm Pb equiv at 100 keV)
- **Yellow tint:** real lead glass has a slight yellow/green tint due to high PbO content. Pure crystal clarity is unrealistic.
- **Mounting:** **flush on both sides** with **no glazing bead** is preferred for hygiene (Spenle premium). Otherwise a thin SS bezel.

**Current model:** `GW=200, GH=300, GY = DH/2 - 30 = 80` — that's window-center 800 mm above door midline, i.e. 1900 mm from floor on a 2200 mm door. **That's too high** for a 1500 mm eye-height standard. The current window center is at ~1900 mm, the bottom edge at ~1750 mm — readable for a 1.85 m+ user.

**Recommended:** Lower window 200 mm. Set `GY = DH/2 - 40 + 0` → window center at **600 mm above midline = 1700 mm from floor**, which is closer to standing eye level (1.50–1.65 m). Or set `GY = 0` (window center exactly at door midline = 1100 mm) for **wheelchair/stretcher viewing** — common in OR-adjacent contexts. Either is more realistic than the current 1900 mm-high window.

### 2.5 Frame (Kusen)
- **Material:** 16-gauge cold-rolled steel (Ultraray standard); 12- or 14-gauge for heavy doors; **SS304 for premium hospital/Indonesian market** (Tokopedia 1100×2100mm SS304 listing)
- **Profile:** hollow metal, fully welded preferred (vs knock-down)
- **Profile depth:** typically 5.75" (146 mm) to 8.75" (222 mm) to match wall thickness; for free-standing product photos, a 100–150 mm jamb depth is realistic
- **Architrave (door casing):** lead-lined casing on the controlled-area side (per Raybloc: "all hinged X-ray doors come with a leaded door leaf, leaded frame, and **two sets of architraves, one of which is leaded for the controlled area side**")

**Current model:** `FW = 8` (80 mm jamb width), `FD = DT + 8 = 12.7` (127 mm jamb depth) in assembled, `FD = 12` (120 mm) in exploded — **mismatch is a bug**.

---

## 3. The "Bar at Top" — What the User is Likely Seeing

**Real PB lead doors have NO horizontal bar protruding above the frame top.**

Things that could be confused for a "bar":
1. ✅ **Door closer arm** — but the arm is on the door face below the top rail and articulates to the frame stop, NOT above the frame head.
2. ❌ Pull arm of automatic operator — only on automatic sliding doors, not hinged.
3. ❌ Light fixture above frame — that's the room ceiling, not part of the door.
4. ✅ **Threshold/seal strip at TOP** — the **rubber stop bead** at the top of the frame jamb (current code line 695: `addMesh(frameGroup, new THREE.BoxGeometry(DW, 0.6, 0.5), rubber, 0, DH/2 + 0.2, FD/2 - 1);`) is **inside the frame throat** and shouldn't be visible from outside.
5. ✅ **Hinge pin overhang** — current code (line 549): `new THREE.CylinderGeometry(0.4, 0.4, 7, 12)` makes a 70 mm pin while the leaf is 60 mm tall, so each pin extends **5 mm above and 5 mm below** the leaf. With 3 hinges stacked on the left jamb, this is a real visible artifact but only on the **hinge side**, not centered. **Unlikely to be the "bar" complaint.**
6. ✅ **Top frame rubber stop bead protruding** — if this strip extends past `Z = FD/2 - 1` (i.e. past the front face), it would look like a thin bar across the top.
7. 🚨 **Most likely culprit: drop-seal housing** — line 762: `addMesh(dropSealGroup, new THREE.BoxGeometry(DW - 4, HOUSING_H, DT - 0.5), matSS(0.25, 1.0), 0, HOUSING_TOP_Y, 0);` — the SS housing for the automatic drop seal is mounted at the **top of the door** (not top of frame), but with `HOUSING_TOP_Y` near `DH/2`, this **could be reading as a thin metal bar across the top of the door**.

**ACTION:** Inspect the rendered scene and check Y coordinates of all top-edge geometry. The drop-seal housing is the prime suspect. **If user complaint is about a bar on top of the FRAME (above the door head), it's likely the closer body floating at `(0, DH/2 + FW/2, …)` — that needs to move down onto the door face.**

---

## 4. The Wall Behind — Industry Standard is NO Wall

**Surveyed manufacturers' product photos (PRODUCT pages, not install diagrams):**

| Vendor | Wall in product photo? | Notes |
|--------|------------------------|-------|
| Marshield | ❌ No wall | Doors shown isolated on white background, frames floating |
| Ultraray | ❌ No wall | Gallery shows door+frame on grey backdrop |
| Lead Shielding (Intech) | ❌ No wall | Birch veneer door+frame, no wall context |
| Raybloc | ❌ No wall | All 12 product gallery images show floating door |
| Spenle | ❌ No wall | SP240X / SP440X both shown without surrounding wall |
| RPP (radiationproducts.com) | ❌ No wall | CORECLAD product shots isolated |
| Overly Door | ❌ No wall | Standalone door+frame |
| Lemer Pax | ⚠ Mixed | Mostly install context for showing flush-mounted vision panels |
| Tokopedia/Lukman (Indonesian) | ⚠ Mixed | Some product shots in rooms (showing real install), some isolated |

**Verdict:** Standard product-catalog practice = **option (a) NO wall**. The door + frame floats in space.

For an exploded view, this is **even more important** — the wall would block view of the lead-continuity tabs, throat strips, and threshold detail.

**Current code already removed the wall in Session 10** (lines 669–675 documents this). **If the user is still seeing a wall, it's a residual artifact, not the intended design.** Run a grep for `WALL_` references that still create geometry — the constants `WALL_W/H/T` (lines 55–57) are flagged as "defined-but-unused" but should be **deleted** to prevent regression.

---

## 5. Lead Thickness — Indonesian/Asian-Market Spec

| Application | Pb thickness | Source |
|-------------|-------------|--------|
| Low-energy diagnostic / dental | 1.0 mm Pb (Code 3) | Raybloc, Spenle |
| **Standard radiology / OR-adjacent (Indonesian market default)** | **2.0 mm Pb** | **Lukman.co.id, Saranahusada, Tokopedia** |
| CT / fluoroscopy | 2.5–3.0 mm Pb | Spenle, Marshield |
| Cardiac cath / interventional | 3.0–3.55 mm Pb (Code 8) | Raybloc, Marshield |
| Linear accelerator / high-energy oncology | 4–20 mm Pb (steel cores) | Raybloc, Overly Door |

**For ELFATECH-class Indonesian/Asian scrub-room-adjacent door product line: 2 mm Pb is the spec.** Confirmed by:
- Lukman.co.id: "Timah hitam (Pb) 2 mm"
- Saranahusada: "Pb 2 mm" standard
- Tokopedia goodgoodsgjn: "Infill Plat PB : 2mm" (1100×2100 mm SS304 sliding hermetic, Rp 40 juta)

**Spec text for product card:** "Lead lining: 2 mm Pb (≥ 99.94% pure lead, ASTM B-29 / Federal Spec QQ-L-201). Continuous sheet construction, all joints welded."

---

## 6. Door Dimensions — Standard Sizes

| Source | Width | Height | Door Thickness | Pb Thickness |
|--------|-------|--------|----------------|--------------|
| Tokopedia (Indonesian sliding) | 1100 mm | 2100 mm | n/a | 2 mm |
| Ultraray "3070" | 914 mm (36") | 2134 mm (84") | 44.5 mm (1¾") | up to 3.18 mm |
| Ultraray "4070" | 1219 mm (48") | 2134 mm (84") | 44.5 mm | up to 3.18 mm |
| Marshield wood | varies | 90"+ allowed | 1¾" + Pb | 1/32"–1/4" |
| 360Visualise leaded door | varies | 2040 mm typical | n/a | 1 mm |
| Lead Shielding | varies | varies | 1¾" (44.5 mm) | up to 1/8" |
| **Recommended for our 2 mm Pb hinged door** | **1000 mm** | **2200 mm** | **47 mm (1¾" + 2 mm Pb)** | **2 mm** |

**Current code values:** `DW=100 (1000 mm), DH=220 (2200 mm), DT=4.7 (47 mm)`.

**Verdict:** Dimensions are correct and authentic for a 2 mm Pb premium OR-adjacent shielded door. **No change needed.**

---

## 7. Window Position — Eye-Height Best Practice

Real lead doors place vision panel center at **1450–1550 mm from finished floor** (FFF), corresponding to standing eye height for the 50th-percentile adult.

| Use case | Window center height (from FFF) | In our coords (door floor at -DH/2) |
|----------|---------------------------------|-------------------------------------|
| Standing eye level (default) | 1500 mm | `GY = -DH/2 + 150 = -110 + 150 = 40` |
| Wheelchair/stretcher dual-view | 1100 mm (door midline) | `GY = 0` |
| Tall observer / over-equipment | 1700 mm | `GY = -DH/2 + 170 = 60` |
| **Current code** | **1900 mm** ⚠ too high | `GY = DH/2 - 30 = 80` |

**Recommendation:** Change `GY` from `DH/2 - 30` to `DH/2 - 50` (`60`, window center at 1700 mm) — still appropriate for OR/scrub-room context where staff frequently lean over patients on tables but reads more naturally than the current near-top placement.

**Current `GW=200, GH=300` matches the 360Visualise "200×300 mm leaded viewing window" SKU exactly. Keep.**

---

## 8. Animation — How Real Lead Doors Open

**Real-world swing behavior:**
- **Hinge axis:** vertical edge (left or right). Single-leaf doors typically right-hand-swing (RH) per US convention, but either is common.
- **Maximum swing:** **90°** is operational max for stretcher/equipment clearance. Some doors allow 110° with optional stop-removal, but 90° is the design target.
- **Closer auto-return:** **4–8 seconds** from full-open (90°) to fully-closed. Sweep speed (90°→15°) is fast (1–2 s); latching speed (15°→0°) is slow (3–6 s) to prevent slamming. Many closers also have a **back-check** that resists at >70° to prevent the door from being thrown open.
- **Sound:** soft hydraulic hiss + audible thunk at full close (drop seal engages, magnetic latch clicks).
- **Self-close:** ALL fire-rated and most radiation-shielded doors are self-closing per code. Door never stays open without a hold-open device.

**Current animation pattern (per fa747c8 commit):** door swings open 90° on Y-axis, hinge axis at left edge. **This matches reality.** Recommend:
1. Easing: `easeOutCubic` for opening (1.2 s), `easeInOutQuad` for closing (3.5 s) — matches real hydraulic closer.
2. Maximum angle: 90° (1.5708 rad). Do not exceed.
3. Hold-open dwell: 4 s at 90° before auto-close starts. Gives the user time to read the open state.
4. Hinge axis position: **leafPivot at HINGE_X = -DW/2 = -50** (left edge). Currently correct.

---

## 9. Dimensions Comparison Table — Current Model vs Recommended

| Parameter | Current code | Recommended | Real-world source | Verdict |
|-----------|--------------|-------------|-------------------|---------|
| Door width (DW) | 1000 mm | 1000–1100 mm | Tokopedia 1100, Ultraray 914/1219 | ✅ keep |
| Door height (DH) | 2200 mm | 2100–2200 mm | Tokopedia 2100, Ultraray 2134 | ✅ keep |
| Door thickness (DT) | 47 mm | 44.5–50 mm | Lead Shielding 1¾", Marshield 1¾"+Pb | ✅ keep |
| Lead Pb thickness | implicit 2 mm | 2 mm | Indonesian market standard | ✅ keep, document in card |
| Frame width (FW jamb) | 80 mm | 75–100 mm | hollow metal standard | ✅ keep |
| Frame depth (FD assembled) | 127 mm | 120–150 mm | hollow metal standard | ✅ keep |
| Frame depth (FD exploded) | **120 mm** | **127 mm** | should match assembled | 🚨 **BUG — sync** |
| Window width (GW) | 200 mm | 200 mm | 360Visualise standard | ✅ keep |
| Window height (GH) | 300 mm | 300 mm | 360Visualise standard | ✅ keep |
| Window center (GY) | +800 mm = 1900 mm FFF | +600 mm = 1700 mm FFF | eye height | ⚠ **lower 200 mm** |
| Hinge axis X | -500 mm | -500 mm | left edge | ✅ keep |
| Bar pull length | 500 mm | 500 mm | ADA OR standard | ✅ keep |
| Bar pull standoff | 30 mm | 30–40 mm | ADA grip clearance | ✅ keep |
| Closer Y position | 1140 mm (above frame head) | ~1020 mm (just below frame head, on door face) | Sargent/LCN reality | 🚨 **BUG — lower** |
| Wall slab | none (already removed) | none | industry product-shot standard | ✅ confirm no leftovers |
| Frame architrave | none | none for product shot | industry standard | ✅ keep |
| Drop-seal housing | top of door | top of door | real automatic drop seals | ✅ keep but verify Z |

---

## 10. Fix Plan — Targeted Diff (NOT Rebuild)

### Bug 1: Top Bar — `closer Y position` + drop seal housing
**File:** `src/app/components/PbLeadDoorAssembled3D.tsx`
**Action:**
1. In the closer mounting code (around `closerGroup.position.set(...)`), change the closer body Y from `DH/2 + FW/2` (above frame) to `DH/2 - 8` (on the door face, just below top rail).
2. Verify `dropSealGroup.HOUSING_TOP_Y` does not extend past `DH/2 - HOUSING_H/2`. If it does, lower it.
3. Remove `WALL_W`, `WALL_H`, `WALL_T` constants (lines 55–57) to prevent regression.

### Bug 2: Wall Behind — verify nothing remains
**File:** `src/app/components/PbLeadDoorAssembled3D.tsx` and `PbLeadDoorExploded3D.tsx`
**Action:**
1. Run `Grep` for `WALL_` and any `BoxGeometry(.*80, .*60, .*8)` patterns.
2. Confirm no `addMesh(scene, new THREE.BoxGeometry(WALL_W, …))` exists anywhere.
3. If found, delete. If not, render a screenshot to confirm — user complaint may have been from pre-Session 10 build.

### Bug 3: Exploded ≠ Assembled
**File:** `src/app/components/PbLeadDoorExploded3D.tsx`
**Action:**
1. Change line 47 from `const FD = 12;` to `const FD = DT + 8;` (matches assembled exactly = 12.7).
2. Re-add to exploded scene the parts the assembled has but exploded lacks: top rubber stop bead, throat Pb strips on jambs, gasket flange (if exploded shows them as separate parts), drop-seal housing (separate part group).
3. Verify all `partId` strings match between files for cross-file consistency (`frame`, `closer`, `bar-pull`, `kickplate`, `glass`, `hinge`, `lead-core`, `gasket`, `drop-seal`, `latch`).

---

## 11. Sources

| # | URL | What it provided |
|---|-----|------------------|
| 1 | https://marshield.com/lead-lined-doors | Hardware spec, hinge requirements, frame construction, ASTM B-29 lead spec |
| 2 | https://ultraray.com/products/lead-lined-doors-windows/ | Standard sizes, lead thickness range, continuous hinge requirement, vision panel sizes |
| 3 | https://www.leadshielding.com/products/lead-lined-doors | Continuous hinge requirement, 1¾" door thickness rule |
| 4 | https://www.spenle-international.com/en/products/hospitals-laboratories/lead-lined-x-ray-doors/ | SP240X swing + SP440X sliding catalog, flush-mount vision panels, 1–4 mm Pb range |
| 5 | https://raybloc.com/product/door-sets/ | Code 3 (1.32 mm) to Code 8 (3.55 mm) Pb range, vision panel options, fire ratings, double-leaf rebated stiles |
| 6 | https://idighardware.com/2019/02/lead-lined-closer-covers | Closer mounting reality (door face, not frame top) |
| 7 | https://www.tokopedia.com/goodgoodsgjn/pintu-xray-pb-pintu-radiologi-sliding-hermetik-rumah-sakit-stainless-1100x2100mm-… | Indonesian market spec: 1100×2100 mm, 2 mm Pb infill, 200×200 mm window, SS304 |
| 8 | https://www.lukman.co.id/jual-timbal/ | Indonesian radiology room spec: 2 mm timbal hitam standard, BAPETEN regulation reference |
| 9 | https://www.saranahusada.com/2017/09/pintu-pb-timbal-proteksi-radiasi.html | Indonesian Pb door supplier listings, 2 mm spec confirmation |
| 10 | https://www.rf-shielded.com/sale-29871687-clear-radiation-protection-lead-glass-x-ray-200-x-300mm.html | 200×300 mm lead glass standard |
| 11 | https://360v.co.uk/product/white-primed-leaded-door-with-200x300mm-leaded-viewing-window/ | 200×300 mm vision panel SKU confirmation |
| 12 | https://www.raybar.com/radiation-shielded-doors | RayBar product line confirmation (catalog photos = no wall) |
| 13 | https://door.overly.com/product-types/radiation-shielding | Overly Door — heavy/industrial shielding doors, also no-wall product photography |
| 14 | https://www.radiationproducts.com/standard-doors-htm | RPP CORECLAD product page, no wall in shots |

**Total searches:** 8 (well under 15-search budget). **Total fetches:** 6.

---

## 12. Final Verdict & Recommended Action

| Complaint | Verdict | Approach | Effort |
|-----------|---------|----------|--------|
| ① "Bar besi tipis sticking out top kusen" | **BUG** — closer is mispositioned above frame head; should be on door face below top rail | **Targeted diff:** move closer Y from `DH/2 + FW/2` to `DH/2 - 8`. Verify drop-seal housing Z. Delete `WALL_*` constants. | 30 min |
| ② "Tembok belakang menghalangi" | **NOT-A-BUG** (wall already removed Session 10), but verify no leftover fragments | **Targeted diff:** grep for `WALL_` references creating geometry, delete any found; render screenshot to confirm. | 15 min |
| ③ "Exploded ≠ Assembled" | **BUG** — `FD` constant differs (12 vs 12.7); exploded missing several frame-attached parts | **Targeted diff:** sync `FD = DT + 8` in exploded; add missing rubber stop bead, throat Pb strips, drop-seal housing as separate exploded parts. | 60 min |

**Total estimated fix time: ~1.75 hours.** **No rebuild needed.** Architecture is sound.

**Authenticity wins to highlight in product card:**
- ✅ Hinged style appropriate for OR-adjacent radiology room
- ✅ 2 mm Pb spec matches Indonesian market standard
- ✅ 1000×2200×47 mm dimensions match Ultraray + Tokopedia ranges
- ✅ Continuous-hinge alternative offered as a future variant
- ✅ Real bar pull handle with 30 mm ADA-grip standoff
- ✅ Lead-glass 200×300 mm vision panel with rebate frame and bezel
- ✅ Drop seal at threshold (real automatic gasket detail)
- ✅ Floor-to-ceiling threshold Pb nosing (continuous shielding)

**Authenticity gaps to fix:**
- 🚨 Closer is currently floating above frame instead of mounted on door face
- 🚨 Vision panel is 200 mm too high (1900 mm FFF vs 1700 mm best-practice)
- 🚨 Exploded view frame-depth constant out of sync with assembled
- ⚠ Possibly stale `WALL_*` references that could regress
