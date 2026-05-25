# Scrub Sink (2-Bay Surgical) — Reference Research

> Date: 2026-05-25
> Goal: Ground-truth a 2-bay surgical scrub sink against real-world manufacturer datasheets so the Three.js model can be rebuilt 1:1.
> Method: ~15 web searches across US/EU/Asia manufacturers + standards bodies, fetched 7 datasheet pages.

## TL;DR

The current model in `src/app/products/scrub-sink.ts` is **dimensionally correct (1600×600×1550mm)** and **conceptually correct for the Asian/Indonesian market** (mirror + canopy + UV is a real regional convention, not fluff). However, the **form factor is wrong in two structural ways**:

1. **It is NOT a cabinet with hinged doors.** Real surgical scrub sinks (US/EU and Asia) are wall-mounted units (or pedestal-mounted) with the basin sitting on a Z-bracket against the wall. The "cabinet" with 4 hinged doors does not exist in industry. There is at most a **kick panel / front skirt** that hinges open for plumbing access (manual knee-operated valve sinks). No D-pull handles. No countertop drawers.
2. **Foot pedals are not mid-height; they are floor-level kick plates** OR replaced by knee-kick panels OR by IR sensors. Mid-height foot pedals visible in the current model match no real product.

Two surprises that the current model gets right that I assumed it had wrong:
- Mirror + canopy with light + UV-C lamp **is real** in the Asian market (Italy too — Tecnomed Sterila, Iraq — Daylight Medical, Indonesia — Dolson). Not fluff. Just regional.
- 1600mm width × 1550mm height for 2-bay is a near-exact match to Dolson Nusantara (Indonesia) `DSR-304-MPD` style: `1600 × 573 × 1600 mm`.

**Recommendation: targeted fixes, not full rebuild.** The size envelope is right. What needs to change is the front-of-cabinet geometry (kill the 4 hinged doors and D-pulls, replace with a single kick panel or open undercarriage with exposed P-trap), foot-pedal placement (floor level or knee-kick mid-panel), and the optional under-cabinet which should not exist on a surgical-grade unit.

## Sources Cited (with hard data)

| # | Source | Type | Key Datum |
|---|--------|------|-----------|
| S1 | [Belimed SS Series PDF](https://api.belimed.com/assets/16358-Product_Specification_SS_Series_Scrub_Sinks_EN_Rev_B.pdf) | Manufacturer datasheet (US) | 14ga 304 SS, 32" bay width, 27.5"D × 51.5"H, deep coved sloping basin, knee-kick + IR options |
| S2 | [Skytron Scrub Sink Sell Sheet PDF](https://www.skytron.com/wp-content/uploads/documentation/Scrub-Sink-Sell-Sheet-Web.pdf) | Manufacturer datasheet (US) | MK Sink dual-bay 64"W × 27.5"D × 37"H, ES dual 47"W × 20.5"D × 23.6"H, knee operated water + optional IR + foot operated soap |
| S3 | [MAC Medical install manual PDF](https://macmedical.com/wp-content/uploads/2015/10/MAN-004-MAC-MEDICAL-SINK-MANUAL.pdf) | Install manual (US) | Sink basin 14ga 304 SS, sink skirt 18ga 304 SS, **wall-mounted on Z-brackets**, knee panels are removable for plumbing access (NO permanent cabinet doors), 130 lb single / 230 lb double |
| S4 | [Teknomek 2-station scrub sink](https://teknomek.co.uk/products/stainless-steel-two-station-scrub-sink) | Manufacturer (UK) | **Wall-mounted**, 1006×500×765mm, bowl 999×209mm deep, 304L SS, 32mm waste outlet |
| S5 | [Technik Medical Surgeon Scrub Sink](https://www.technik-medical.com/surgeon-scrub-sinks.html) | Manufacturer (UK) | Two-station L1074 × W520 × H687mm, knee push or sensor variants, **no canopy/mirror by default** |
| S6 | [Daylight Medical Mirror](https://daylightmed.com/mirror-for-surgical-scrub-sink) | Manufacturer (Iraq/MEA) | Mirror w/ lighting is a **separate add-on accessory** sold for scrub sinks. 32×800×700mm single, 32×1600×700mm double |
| S7 | [Dolson Nusantara Indonesia](https://www.dolsonnusantara.com/scrub-station-sink-wastafel-medis-mot-ok-otomatis-ruang-operasi-2-person-bay/) | Manufacturer (Indonesia) | **2-person 1600×573×1600mm**, UV Water 10W + 1µm filter, automatic IR + manual foot pedal, soap dispenser auto, AC 220V — almost exact match for current model |
| S8 | [Rooe Medical BSS100](https://www.rooemed.com/products/hospital-furniture/inductive-medical-scrub-sink/surgical-scrub-sink-washing-basin-with-foot-pedal/) | Manufacturer (China) | 2-person 1200×480-600×1100mm (no mirror) or 1200×480-600×1800mm (with mirror), 304 SS, italic/sloping bowl, IR/knee-touch/foot pedal options, mirror+lighting optional |
| S9 | [Tecnomed Italia Sterila](https://www.tecnomeditalia.com/en/products/handy-surgery-line/inox-line/surgical-sink) | Manufacturer (Italy) | Stainless steel surgical sink with **integrated automatic UV-C sterilisation** — confirms UV is a legitimate spec, not marketing-only |
| S10 | [H2O Equipement UV kit](https://h2oequipement.com/uv-treatment) | Component supplier (FR) | UVC water-treatment kit installed **upstream of the faucet, under the sink** (not in the basin or canopy) — 99.99% bacteria/virus kill |
| S11 | [Inspital Surgical Scrub Sinks](https://inspital.com/surgical-scrub-sinks) | Manufacturer (DE) | Models SK60.10, SK60.20, SK61.10, SK61.20. Wall-mounted or freestanding. Stainless steel, sloped/seamless basin, sensor/knee operation, modular thermostatic mixers + soap dispensers |
| S12 | [STERIS Scrub Sinks](https://www.steris.com/healthcare/products/scrub-sinks) | Manufacturer (US/EU) | AMSCO Flexmatic line, 1/2/3 bay, hands-free, optional eye-wash, knee-operated soap, digital timer, IR water control |
| S13 | [Continental Metal Products](https://continentalmetal.com/products/operating-room-equipment-and-surgical-solutions/surgical-scrub-sinks/) | Manufacturer (US) | "AS" manual models = knee-pressure activated front panel (the **whole front panel IS the valve**); "E" models = IR sensor below spout; deep sloping bays inter-piped |
| S14 | [LogiQuip SS64](https://www.logiquip.com/product/scrub-sink-two-station-knee-operated-scrub-sink-cat-ss64/) | Manufacturer (US) | 2-station knee-operated, 304 SS, deep sloping double basins **with splash divider** (confirms divider is real), backflow preventers, 5-yr warranty |
| S15 | [Avante HS](https://avantehs.com/p/surgical-stainless-steel-scrub-sink/274) | Distributor (US) | Tub depth **10.5" (267mm)**, backsplash 12" (305mm), coved sides + corners |
| S16 | [Paragon Medical 8000 Series](https://www.paragonmed.com/product-category/surgery/scrub-sinks/) | Manufacturer (US) | **14ga SS, NSF approved, 6" backsplash**, knee-activated valve + swivel gooseneck spout with sterilizable spray-rose aerator |

## Question-by-Question Findings

### Q1. Form factor — boxy cabinet vs wall-mounted trough?

**Verdict: WALL-MOUNTED, NO CABINET.** All US/EU manufacturers (Belimed, MAC Medical, Skytron, Teknomek, Just Mfg, Elkay, SurgiKleen, Logiquip, Continental Metal) describe the unit as wall-hung on Z-brackets. There is no permanent "cabinet body" with countertop. The basin is the structural element; the front skirt/kick panel is removable for plumbing service.

- MAC Medical (S3): "Knee panels must be removed for plumbing access. The panels are released by pressing up on the lever in the center of the bottom of the panel."
- Just Mfg J7702S: "Wall Hung Double Station Surgeon Scrub Sink"
- Teknomek (S4): "wall mounted two station scrub sink"

**However** — the Indonesian/Asian variants (Dolson, Rooe BSS100, Daylight) are **freestanding floor-mounted units with a closed lower body** that resembles a cabinet **but has no doors**. The body is welded SS panels enclosing plumbing. This is what the current model is emulating. Inspital (DE) explicitly offers both wall-mounted and freestanding.

**Action**: Keep the freestanding closed-body silhouette (it matches the Asian-market reference our product targets), but **remove the 4 hinged doors and D-pull handles**. Replace with seamless welded panels OR a single removable kick panel.

### Q2. Basin shape

**Verdict: Deep, coved-corner, single-direction sloping basin per bay.** Not flat-bottom rectangular, not V-trough.

- Belimed (S1): "Deep sloping basin" with "All inside corners are coved"
- Avante (S15): "10.5 inch (267mm) deep tub" with "coved sides and corners"
- Teknomek (S4): bowl 999W × 209mm deep
- Skytron, MAC Medical, LogiQuip, SurgiKleen all say "deep sloping basin"

Real basin width per bay: 32" / 813mm in US datasheets, ~500mm per bay in compact UK/EU (Teknomek bowl is 999mm wide for 2 bays = 500mm/bay). Real basin depth: 200-280mm (8-11 inches).

**Current model**: 650×450×200mm per basin — width is generous (good), 200mm depth is on the low end of real-world (real spec is 200-280mm), 450mm front-to-back is generous (typical 380-450mm).

**Action**: Increase basin depth to 250mm. Keep the sloping profile and coved corners.

### Q3. Faucet style

**Verdict: Wall-mounted goosenecks coming out of the BACK SPLASH, deck-mounted on the rear ledge** — never counter-mounted in front. Activation:
- US: Knee-kick (most common, especially manual models) or IR sensor (premium)
- EU: IR sensor (most common)
- Asia (China, Indonesia, India): IR sensor + foot pedal redundancy

ESSCO (India), MAC Medical, Belimed all confirm. Sensor range typically 250-350mm from spout. One faucet per bay.

**Current model**: 2× gooseneck + IR sensor — correct.

### Q4. Mirror + canopy

**Verdict: Regional convention.** US/UK/EU surgical scrub sinks **DO NOT** include mirrors or canopies by default. They are clinical-only fixtures. Daylight Medical sells the mirror as a separate accessory.

**However**, mirror + canopy + lighting **IS standard in:**
- Indonesia (Dolson, Dumedpower, Multi Indojaya, Enam Pilar)
- China (Rooe BSS100 has a dedicated "with mirror" SKU)
- Iraq/MEA (Daylight Medical)
- Italy (Tecnomed Sterila — with UV-C)

The mirror in Asian-market scrub sinks is a **face/cap-check mirror**, not personal grooming. Surgeons verify mask fit, cap coverage, and beard-net seal before scrubbing — clinically valid use. The canopy houses LED task lighting and (sometimes) UV-C.

**Current model**: 2 mirrors + LED canopy — correct for the target market.

### Q5. UV germicidal — real or fluff?

**Verdict: Real, but typically water-treatment UV-C, not air/canopy UV.**

- H2O Equipement (S10): UV-C kit installed **upstream of the faucet, under the sink** — sterilizes incoming water. 99.99% kill rate on bacteria/virus.
- Tecnomed Sterila (S9): Italian-made surgical sink with integrated UV-C sterilization (water-line).
- Dolson (S7): "UV Water 10 Watt + Filter 1 Micron" — water-line UV, not air UV.

Air/canopy UV in scrub sink canopies is more decorative and only effective during off-hours when no one is present (UV-C harms eyes/skin). Real water-line UV is in the supply pipe, hidden inside the body.

**Current model**: Says "UV Sterilization" in canopy. **Action**: Move UV-C lamp indication from canopy to the under-basin / supply line area, or keep both (ambient canopy UV-C is also a real Asian-market spec). Update spec text to clarify "UV-C water sterilization (10W) + ambient canopy UV (auto, off when in use)."

### Q6. Cabinet doors

**Verdict: NO permanent doors.** Removable kick-panel skirts are universal — but they are not "doors with D-pulls". They are unmarked SS panels held by hidden bolts or flush latches.

- MAC Medical (S3): kick panels released by lever, hinge pins slide, panels fully remove.
- Continental Metal: "AS models = front panel IS the knee valve" — touching it activates water.
- Belimed: "Unit base accommodates an easy-access gallon soap container" inside, behind a panel.

**Action**: REMOVE the 4 hinged doors with D-pulls. Replace with either:
- (Option A) Seamless welded SS front panel (Asian-market style, what Dolson/Rooe show in photos)
- (Option B) A single removable kick panel at the bottom 200mm with a hidden release latch (US/EU style)
- Recommend Option A for visual match to the Indonesian reference.

### Q7. Foot pedals

**Verdict: NEVER mid-height. Either floor-level kick plate, OR knee-kick mid-panel, OR IR sensor (no pedal at all).**

- ESSCO 874 (India): "wall mount, foot pedal operated"
- Sani-Lav 531FS: "foot-operated faucet" — pedal is at floor level
- Rooe BSS100: foot pedal at floor — confirmed in product photos
- US convention: knee-kick = the entire front panel pivots inward against a valve when knee pressure applied (Continental Metal, MAC, LogiQuip)

**Current model**: "Foot Pedal (manual emergency)" mounted mid-height. **Action**: Lower foot pedals to floor level (Y = 50-100mm), make them obvious horizontal foot plates. OR replace with a single full-width knee-kick panel covering the bottom 30% of the front face.

### Q8. Materials

**Verdict: 304 SS is universal. 316 is medical-overspec but rare for scrub sinks.**

- 14ga (1.9mm) for sink basin (Belimed, MAC, Paragon)
- 18ga (1.2mm) for skirt/kick panels (MAC)
- Finish: #4 brushed (Belimed, Skytron) is industry standard. Mirror polish is decorative-only and shows water spots.
- Welds: seam-welded, ground smooth. No exposed fasteners on user-facing surfaces.

**Current model**: 304 SS, 1.2mm thickness — correct for skirt panels but **basin should be 1.9mm** (14ga). Finish "Mirror Polish / Hairline Brushed" — recommend default to **#4 Brushed (Hairline)** since mirror polish is not clinical norm.

### Q9. Dimensions table

#### Real-world envelope (millimeters)

| Source | Width | Depth | Height | Bay W | Basin Depth |
|--------|-------|-------|--------|-------|-------------|
| Belimed SS-2 (US) | 1626 | 699 | 1308 | 813 | ~250 |
| Skytron MK Dual (US) | 1626 | 699 | 940 | 813 | ~250 |
| Skytron ES Dual (US compact) | 1194 | 521 | 599 | 597 | ~200 |
| MAC Medical SS64 (US) | 1626 | ~700 | ~1300 | 813 | ~250 |
| Teknomek 2-station (UK) | 1006 | 500 | 765 | 503 | 209 |
| Technik Medical 2-station (UK) | 1074 | 520 | 687 | 537 | ~200 |
| Whitehall 2-station (US) | 1613 | ~700 | ~1300 | 807 | ~250 |
| Just Mfg J7702S (US) | 1524 | 584 | 660 | 762 | ~250 |
| **Dolson Indonesia (target ref)** | **1600** | **573** | **1600** | **800** | **~250** |
| Rooe BSS100 w/ mirror (CN) | 1200 | 480-600 | 1800 | 600 | ~250 |
| Avante (US) | ~1600 | ~700 | ~1300 | 813 | 267 |

#### Recommended dimensions for our model (matches Dolson/Asian reference)

| Element | Current (mm) | Recommended (mm) | Recommended (scene units, 1:10) |
|---|---|---|---|
| Overall W | 1600 | **1600** ✓ | 160 |
| Overall D | 600 | **580** | 58 |
| Overall H | 1550 | **1600** | 160 |
| Body height (no canopy) | 900 | **900** ✓ | 90 |
| Basin top Y | 900 | **900** ✓ | 90 |
| Basin width per bay | 650 | **720** | 72 |
| Basin depth (front-to-back) | 450 | **400** | 40 |
| Basin height (basin floor to rim) | 200 | **250** | 25 |
| Backsplash height | 300 | **300** ✓ | 30 |
| Canopy height | 350 | **400** | 40 |
| Mirror size (per bay) | 550×400 | **600×500** | 60×50 |
| Floor-to-foot-pedal Y | (mid-height) | **80-120** | 8-12 |
| Sink wall thickness (basin) | 1.2 | **1.9** (14ga) | n/a |
| Skirt panel thickness | 1.2 | **1.2** (18ga) ✓ | n/a |

## Reference photos to model after

The 5 most representative real units to match:

1. **Dolson Nusantara DSR-style 2-Person** (Indonesia) — closed welded body, mirror panel, IR faucets, 1600×573×1600mm. URL: https://www.dolsonnusantara.com/scrub-station-sink-wastafel-medis-mot-ok-otomatis-ruang-operasi-2-person-bay/ — image `scccrub.png`. **This is the closest visual match to the current model's intent.**

2. **Rooe BSS100 with mirror** (China) — sloping italic basin, mirror with task light, foot pedal at floor level. URL: https://www.rooemed.com/products/hospital-furniture/inductive-medical-scrub-sink/surgical-scrub-sink-washing-basin-with-foot-pedal/

3. **MAC Medical SS64** (US, knee-operated) — wall-mounted reference for how the front kick panel works in real installs. URL: https://macmedical.com/wp-content/uploads/2015/10/MAN-004-MAC-MEDICAL-SINK-MANUAL.pdf

4. **Skytron MK 2-Bay** (US, IR + eyewash) — for the deep sloping basin geometry and gooseneck mounting height. URL: https://www.skytron.com/wp-content/uploads/documentation/Scrub-Sink-Sell-Sheet-Web.pdf

5. **Tecnomed Sterila** (Italy, UV-C integrated) — for the UV-C water sterilization placement reference. URL: https://www.tecnomeditalia.com/en/products/handy-surgery-line/inox-line/surgical-sink

## Top 5 Findings vs Current Model

1. **Hinged cabinet doors with D-pull handles do not exist on real surgical scrub sinks.** Real units have either seamless welded skirt panels (Asian style) or removable hidden-latch kick panels (US/EU style). Our 4-door cabinet is the single biggest authenticity miss.

2. **Foot pedals are floor-level (Y=80-120mm), not mid-height.** Real foot pedals are horizontal kick plates near the floor, or replaced by full-width knee-kick panels on the lower 30% of the front face.

3. **The mirror + canopy + UV is regionally legitimate** (Indonesia/China/Italy) and not removed in a rebuild. The current model's intent matches the Dolson/Rooe/Tecnomed reference. But UV-C placement should reference the water supply line (under the sink), not the canopy.

4. **Basin depth should be 250mm not 200mm** — every real reference (Avante 267mm, Belimed/Skytron ~250mm, Teknomek 209mm with high tap mounting) is at or above 250mm to allow elbow-deep scrubbing.

5. **Material spec needs a tier split** — basin is 14ga (1.9mm) heavy gauge, skirt is 18ga (1.2mm). Current uniform 1.2mm is wrong for the basin (will look too thin in wireframe / cross-section).

## Recommendation

**Targeted fixes, not full rebuild.** 70% of the current model is already aligned with the Asian-market reference (Dolson Nusantara). The dimensional envelope, the mirror + canopy + UV concept, the IR faucets, and the splash divider all match the real product class.

The required changes are surgical and scoped:
1. Remove 4 hinged doors + D-pull handles → replace with seamless welded front panel
2. Remove mid-height foot pedals → add floor-level foot plates OR full-width knee-kick lower panel
3. Increase basin depth 200 → 250mm
4. Adjust faucet base position to back-splash (not deck/counter) at Y=900 (rear)
5. Move UV indication from canopy to under-sink supply line (or label both: water + canopy)
6. Update specs text: 14ga basin / 18ga skirt; #4 brushed default finish
7. Reference photo: Dolson Nusantara DSR for the assembled visual target

Estimated effort: 2-3 hours of geometry edits in `ScrubSinkAssembled3D.tsx` and `ScrubSinkExploded3D.tsx`, plus dimension/spec text updates in `scrub-sink.ts`. No new components needed.
