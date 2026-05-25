# Scenario Animations Per Product — Research & Implementation Plan

**Date:** 2026-05-24
**Author:** Research pass for Elfatech / PT Teknomed Indo Timur 3D catalog
**Audience:** Engineering team owning the Three.js viewer in `src/app/components/*Assembled3D.tsx`
**Reference implementation:** `PbLeadDoorAssembled3D.tsx` (lines 612–998) — already ships a 90° open/close swing scenario with `leafPivot` group, `ease-in-out cubic` tween over 900 ms, and a `closerGroup` that hides during open mode because the closer arm articulation is not modelled.

---

## 1. Goals & non-goals

**Goal:** for each of the 12 non-PbLeadDoor products, design a believable, *product-specific* runtime scenario animation that mirrors how the real piece of equipment behaves in an OR/cleanroom. The animation must be triggerable from the existing viewer toolbar, must not regress static (audit) view fidelity, and must respect the project's hard performance discipline (DPR cap, on-demand rendering, dispose hygiene).

**Non-goals.** Cinematic camera animation (handled separately by `animateCameraTo`), physics simulation, particle systems north of ~2k particles, and anything that would require WebGPU. Scenario mode is **not** a substitute for the EXPLODED view; it complements it.

---

## 2. Per-product scenario table

| # | Product | Real-world motion | Three.js strategy | Pivot / axis / driver | Effort vs. PbLead 90° | Tween library | UX trigger | Works in EXPLODED? | Reference |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **sandwich-radiasi** | Static wall panel cross-section. The "motion" worth showing is layer assembly: GI skin → PIR core → Pb 2 mm → finish layer. | **Layer-peel sequencer**: tween each layer's `position.z` and `material.opacity` (0 → 1) on a delayed timeline. Builds the panel in front of the viewer. | No pivot; only Z-axis translation per layer (already used by ExplodedPanel3D — reuse offsets). | Low | vanilla rAF (timing already proven) | Single button: **"Build / Reset"**, also auto-runs once on mount in assembled view | ❌ Replaces EXPLODED conceptually — keep mutually exclusive | Manufacturer cross-section diagrams (reuse existing layer data) |
| 2 | **curving** (R40 corner) | Static dust-coving profile. Real "behavior" is **airflow with no dust trap**. | **Airflow streamlines**: ~120 instanced spheres (`InstancedMesh`) traversing a precomputed Catmull-Rom curve that hugs the radius; loop with phase offset. Add a translucent radius-overlay that fades in. | Curve sampled along corner. No mesh rotation. | Low–Med | vanilla rAF | Toggle: **"Show airflow"** | ✅ also useful in exploded — particles can fade through gaps | Cleanroom airflow visualisation, ASTM E3379-25 (store.astm.org/e3379-25a.html); ACH cleanroom return-air guide (achengineering.com/feeds/blog/clean-room-low-wall-return) |
| 3 | **hermetic-door** | Two-leaf bi-parting *or* single-leaf telescopic auto sliding door. KAST/Veze/Swico publish 0.7 m/s single-leaf, 1.4 m/s two-leaf typical speeds. Sensor LED pulses, motor drives leaves on linear rail. | **Horizontal translate**: each leaf as its own `THREE.Group` translated along `+X / −X` (or single leaf `+X` for single-leaf variant). Sensor mast LED → emissive pulse via `MeshStandardMaterial.emissiveIntensity` sine wave. Door speed must match real spec (≈ 0.85 s open). | Pivot: rail anchor at floor centre. Axis: world X. Stroke = `(DW/2 − overlap)` per leaf. | Med | **anime.js** (already in deps; needs simultaneous tween on 2 leaves + emissive) | Toggle: **"Open / Close"** + secondary chip **"Foot switch"** that triggers same anim with delayed sensor pulse | ✅ if leaves modelled separately in exploded; visual is still meaningful | KAST hermetic ICU (kastdoor.com/product-hermetic-icu-automatic-sliding-doors.html); Veze hospital hermetic (vezedoor.com/hospital-hermetic-sliding-door.html); Swico Sonha (sonha.com/en/san-pham/swico-hermetic-sliding-door-korea) |
| 4 | **pb-lead-door** | Swing 90° outward, hinge axis at door edge. | ✅ **DONE** — `leafPivot` rotation Y, ease-in-out cubic, 900 ms, closer hidden in open mode. | `HINGE_X, py, 0` | — | vanilla rAF | toggle | ✅ already verified | — |
| 5 | **scrub-sink** | TMV mixes hot/cold to ~38 °C; IR sensor (12–14" range, 2 s on/off delay per LogiQuip) starts/stops water; foot pedal as manual fallback; UV sterilizer cycle. | **Multi-cue choreography**: ① hand approaches sensor → emissive on sensor LED. ② Water stream = column of ~80 instanced light-blue spheres falling along `−Y` for each of 2 bays. ③ Foot pedal = small `+Y` to `−Y` rotation around its hinge. ④ TMV dial: textured cylinder rotates ~20°. ⑤ UV lamp glow toggle (emissive intensity). | Foot pedal: hinge axis at pedal back edge, ~−15° tilt. Faucet: stationary; particles spawn at spout. | Med–High (4 sub-actions) | **anime.js timeline** (multiple parallel tweens) | Three chips: **"Sensor on"**, **"Foot pedal"**, **"UV cycle"** | ✅ pedal/dial work in exploded; particles look weird in exploded — gate to assembled | LogiQuip (logiquip.com/scrub-sinks); InnerSpace TMV (innerspacehealthcare.com/medical-storage/scrub-sink-single-basin); MAC Medical PDF (macmedical.com/wp-content/uploads/2019/03/MAN-009-Rev-D.pdf); Paragon IR sensor sinks (paragonmed.com/product-category/stainless-ware/scrub-sinks-stainless-ware) |
| 6 | **pass-box** | Mechanical/electronic *interlock*: opening door A locks door B (LuxMed, Airkey, Youthfilter all confirm). UV lamp pulses for sterilization cycle (typical 15–30 min in real life — compress to 4 s on screen). Optional magnetic indicator LED red/green. | **Interlock state machine**: doors are two `Group`s with rotation-Y around hinge; `door.userData.locked = boolean`. Indicator strips above each door change material colour (red ↔ green) via Lerp. UV cycle = emissive pulse + faint volumetric glow inside box. | Door pivots: each at outer edge of cabinet, axis Y. UV lamp: stationary inside, emissive only. | Med | **anime.js** (state machine + chained timelines for cycle) | Two chips: **"Open exterior"**, **"Open interior"** (try-and-fail visibly: clicking the locked one shakes it 4 px and flashes red); third **"UV cycle"** | ✅ exploded shows interlock plate too; doors still work | Youthfilter pass-box working principles (youthfilter.com/news/pass-box-working-principles-explained-interlock-mechanisms-airflow-dynamics-and-uv-sterilization-cycle-design-for-cleanroom-applications); Airkey guide (airkeyx.com/about/detail/comprehensive-guide-to-pass-box); LuxMed YouTube demo (youtube.com/watch?v=XInqYgR5zt0) |
| 7 | **pacs-cabinet** | SUS-304 medical records / radiology film cabinet. Real models have either **swing doors** with locking handle, or **lateral pull-out drawers** on slide rails. Verbatim spec doesn't pin which — recommend doors. | **Door swing**: each leaf a `Group` rotated Y around its outer hinge, 110° outward. Reveal interior shelves (already modelled — currently hidden behind opaque doors). | Hinge axes: `±cabinetWidth/2, 0, depth/2` | Low–Med (essentially PbLead pattern × 2 leaves) | vanilla rAF (reuse PbLead easing) | Toggle: **"Open doors"** | ✅ exploded already shows interior — scenario provides the *narrative* of opening | Southwest Solutions med-records (southwestsolutions.com/divisions/healthcare/medical-record-storage-systems/medical-records-storage); Medicus Health (medicus-health.com/document-management/medical-file-storage-cabinets.html) |
| 8 | **return-air-grille** | Adjustable louver / opposed-blade damper to set return airflow rate. Some have spring-return or actuator-driven blades. | **Louver tilt**: each blade is a `Mesh` whose `rotation.x` (or Z, depending on blade orientation) tweens 0° → 45°. Then add airflow particle stream entering the grille (instanced spheres flowing `−Y` to grille face, then disappearing — represents extraction). | Per-blade pivot at blade centre. | Low–Med | vanilla rAF (looped) | Slider 0–100% **"Damper position"** + chip **"Airflow"** | ✅ both views — louvers are visible in exploded too | ACH cleanroom return air design (achengineering.com/feeds/blog/clean-room-low-wall-return); EAB cascading cleanroom (eabcoinc.com/technical-article/solving-return-airflow-pathways-in-a-cascading-cleanroom); Titus critical environment guide (titus-hvac.com/file/3948/critical%20environment%20_2024_V2_opt.pdf) |
| 9 | **laf-system** | Ceiling LAF unit. EN1822-class HEPA filter pack pushes laminar (unidirectional) air downward, 0.3–0.45 m/s typical. Filters slide out for service via integrated rails. | **Vertical laminar particle stream** (~200 instanced spheres descending uniformly with subtle x-jitter ≤ 1 cm). Filter cartridge slide-out: a sub-`Group` translates `+Z` (toward viewer) by filter depth. Optional gauge needle rotation showing differential pressure. | Particles spawn under HEPA face, fall to floor over 1.6 s. Filter pivot: rail axis Z. | Med | anime.js (timeline: airflow always on; filter slide is a one-shot) | Two chips: **"Airflow on/off"** (default on), **"Service filter"** | ✅ exploded should pause particles — too noisy alongside layer offsets | Ossila laminar flow (ossila.com/pages/laminar-flow-hood-filters); Airtècnics LamiFlow (airtecnics.com/products/lamiflow-filter); Mikropor LAF brochure (mikropor.com/wp-content/uploads/2022/04/041_MIKROPOR%20LAF%20BROSUR%20ING%20120122.pdf); Testronix LAF principles (testronixinstruments.com/blog/laminar-air-flow) |
| 10 | **ceiling-panel** | Modular OR ceiling, walkable on top side (Mecart, Clean Rooms West, ACH walkable ceilings). Single panel can be **lifted out** from below for service or **dropped down** on safety chains. | **Panel drop**: pick one panel, animate `position.y` downward by ~30 cm, also `rotation.x` slight tilt. On scenario "off" panel returns. Optionally show a thin volumetric beam from above (light strip exposed) to imply maintenance access. | One panel `Group`, hinged on its long edge. Y translate plus 8° rotation. | Low | vanilla rAF | Toggle: **"Service one panel"** | ✅ exploded already shows individual panels | Clean Rooms West walkable grid (cleanroomswest.com/ready-to-build-components/walkable-ceiling-grid); ACH walkable (achengineering.com/cleanroom-solutions/walkable-ceilings); Mecart (mecart-cleanrooms.com/cleanrooms/ceiling-system) |
| 11 | **xray-viewer** | LED double-screen film viewer with dimmer 20–100 % and on/off toggle (per spec sheet). Some models have a sprung clip to hold film at top edge. | **Emissive ramp**: backlight plane `material.emissiveIntensity` tweens 0 → 1 (dim → max). Bloom post-processing already configured for the project — verify it picks up. Optional film-clip lift: tiny rotation around clip's pivot. | Backlight is a flat `PlaneGeometry`; clip rotates Z around its mount edge. | Low | vanilla rAF (linear for dimmer; ease-out for clip) | Slider 0–100 % **"Brightness"** + chip **"Insert film"** (animates a dummy film translucent plane in from `+Y`) | ✅ both views; emissive ramp is independent of geometry layout | Abimed AM-ULX-RAYA10S (abimed.com/ultraslim-xray-film-viewer/am-ulx-raya10s); Biox LED viewbox (biox.co.in/led-x-ray-view-box); Lifex 14×17 sensor + dimmer (dentalmantraa.com/products/lifex-led-x-ray-view-box-single-film-14x17-with-automatic-sensor-and-dimmer); Mplent ZG-3B (cdn.mplent.com/products/side-lit-led-film-viewer-155.html) |
| 12 | **surgical-control-panel** | Touchscreen for OR control: HVAC, lights, gas alarms, HEPA pressure, temperature, calls. CureVision / AmcareMed / Tri-Tech panels show pressure dials, gas LEDs, dimmable scene lights. | **Wake-up sequence**: ① bezel emissive ramps to indicate power. ② HUD layer (sprite or `CSS2DRenderer` overlay) fades in with mock dashboard. ③ Periodic LED indicator pulse (gas valves green, alarm amber). ④ Optional: tapping a button on the panel triggers a status toggle (e.g. OR light slider responds, lamp brightness elsewhere in the scene rises). | No mesh transformation; everything is emissive + DOM overlay or sprite billboard. | Low (emissive only) — Med if cross-product wiring is added | anime.js (clean for sequenced fade-ins) | Toggle: **"Power on"**, then chips for **"Lights"**, **"HVAC"**, **"Gas alarms"** that flicker indicators | ✅ both views | CureVision ORC-417 (curevision.ca/product/en/orc-417-series); AmcareMed LCD OR panel (amcaremed.com/products/lcd-operating-room-control-panel); Tri-Tech master alarm (tri-techmedical.com/medical-gas-pipeline-equipment/medical-gas-alarm-panel); Tri-Tech area alarm (tri-techmedical.com/medical-gas-pipeline-equipment/medical-gas-area-alarm) |
| 13 | **hvac-system** | Full BIM. Real-world: outside-air damper opens, fan ramps up, supply air flows through ducts to LAF, return air flows back to AHU, refrigerant loop circulates, filter cassette slides out for change. | **Composite scenario** built from 4 atomic actions: ① **Damper actuator rotation** of OAD blade groups. ② **Fan blade spin** (continuous rotation Z while running). ③ **Filter cassette slide-out** of access hatch (one-shot). ④ **Airflow particle modes** already partly modelled — extend with refrigerant pipe colour shift hot/cold. | Damper blades: per-blade pivot. Fan: shaft Z-axis. Filter: rail along X. | High (scenario is composite, but each atomic is small) | **anime.js timeline** with named keyframes; reuse atoms separately for individual modes | Existing mode bar already exists for HVAC (`full-system`/`supply-air`/`return-air`/`refrigerant`/`floor-plan`/`exploded`) — add a **"Run cycle"** play button that auto-orchestrates atomic actions over ~12 s with optional pause | ❌ exploded is its own mode — scenario only in non-exploded BIM modes | YouTube AHU damper anatomy (youtube.com/watch?v=tipdu6pM_zs); AHU working animation (youtube.com/watch?v=2zPhtokX4ow); Johnson Controls Metasys damper control v50 (docs.johnsoncontrols.com/bas/r/Metasys/en-US/Controller-Tool-Help/16.0/Output-Control-Modules/Damper-Control-AHU-Econ/Damper-Control-for-Relief-Fan-v50); HVAC damper types (youtube.com/watch?v=JYg3uJsSNTo) |

### 2.1 Motion-pattern clusters (for code reuse)

| Cluster | Members | Shared primitive |
|---|---|---|
| **Hinge swing** | pb-lead-door ✅, pacs-cabinet, pass-box | `HingeSwingScenario(group, axis, angleRad, ms)` — direct lift of `leafPivot` pattern in `PbLeadDoorAssembled3D.tsx:734-742` |
| **Linear slide** | hermetic-door (2 leaves), laf-system filter, ceiling-panel drop, hvac filter cassette | `LinearSlideScenario(group, axis, distance, ms)` — single tween of `position[axis]` |
| **Particle stream** | curving, scrub-sink, return-air-grille (airflow), laf-system | `ParticleStreamScenario(spawnArea, direction, count, lifeMs)` using `InstancedMesh` of low-poly spheres |
| **Emissive ramp** | xray-viewer, surgical-control-panel, hermetic-door (sensor LED), pass-box (UV) | `EmissiveScenario(materials[], targetIntensity, ms, mode: 'pulse'|'ramp')` |
| **Layer assemble** | sandwich-radiasi | One-off; reuses exploded offsets in reverse |
| **Compound timeline** | hvac-system | anime.js timeline composing the above primitives |

This means **6 cluster primitives cover all 12 scenarios** — strong case for the shared controller in §3.

---

## 3. Architecture recommendation: `useScenario` hook + `ScenarioController`

### 3.1 Today's pattern (PbLead) — strengths and limits

`PbLeadDoorAssembled3D.tsx:881-944` is small and honest:

- One `useState<DoorScenario>('closed' | 'open')`.
- One `useEffect` that cancels any in-flight rAF, snapshots `fromAngle`, computes `toAngle`, runs an ease-in-out cubic on `requestAnimationFrame`, and toggles `closerGroup.visible`.
- Scene exposes a `SceneHandles` object of refs to the moving groups, returned from `buildScene`.

Limits when generalised to 12 products:

1. Each product would re-implement the same rAF lifecycle.
2. State machines (pass-box interlock, scrub-sink choreography, hvac compound) need *parallel and chained* tweens, not just a single from→to.
3. Camera-preset switches mid-animation should not snap state.
4. Switching products must dispose any in-flight rAF / anime.js timelines (otherwise GC pressure + ghost frames).

### 3.2 Proposed shared module

Create `src/app/hooks/useScenario.ts` and `src/app/lib/scenarios.ts`. Keep both small.

```ts
// src/app/lib/scenarios.ts
export type ScenarioStep =
  | { kind: 'rotate'; target: THREE.Object3D; axis: 'x' | 'y' | 'z'; toRad: number; ms: number; ease?: EasingFn }
  | { kind: 'translate'; target: THREE.Object3D; axis: 'x' | 'y' | 'z'; toUnit: number; ms: number; ease?: EasingFn }
  | { kind: 'emissive'; mats: THREE.MeshStandardMaterial[]; toIntensity: number; ms: number }
  | { kind: 'visibility'; target: THREE.Object3D; visible: boolean }
  | { kind: 'particles'; system: ParticleSystem; on: boolean }
  | { kind: 'wait'; ms: number };

export interface ScenarioDef {
  id: string;          // e.g. 'open', 'close', 'sensor-on', 'service-filter'
  label: string;       // button label
  steps: ScenarioStep[]; // sequential by default; use parallel groups for concurrent
  parallel?: ScenarioStep[][]; // alt: arrays of steps that run together
}

export interface ScenarioController {
  play(id: string): Promise<void>;
  stop(): void;          // cancels rAF / clears timeline
  reset(): void;         // back to base pose
  current(): string | null;
  isPlaying(): boolean;
}
```

```ts
// src/app/hooks/useScenario.ts
export function useScenario(
  refs: SceneRefs | null,
  defs: ScenarioDef[],
): { controller: ScenarioController; activeId: string | null } {
  // Manages a single rAF (or anime.js timeline) at a time.
  // On unmount or product switch: stop() + reset().
  // Returns stable controller via useRef.
}
```

### 3.3 Why anime.js for compound, vanilla rAF for atomics

`anime.js` is already in `package.json` (dev deps for HVAC). For single-axis tweens (PbLead, ceiling-panel, pacs-cabinet) vanilla rAF with `easeInOutCubic` is *honest* — the existing PbLead loop is 14 lines and proven. For compound flows (scrub-sink, hvac, pass-box state machine), anime.js timelines are dramatically clearer than hand-rolled chained promises.

Rule of thumb in the report:
- ≤ 1 simultaneous tween → vanilla rAF.
- ≥ 2 simultaneous tweens or a timeline with delays → anime.js.

### 3.4 UI integration

Add a thin `ScenarioBar` component beside the existing `ViewerControls`:

```
┌──────────────────────────────────────────────────────────┐
│ Scenario:  [● Closed]  [Open 90°]   [Pause]              │  ← exists for PbLead
├──────────────────────────────────────────────────────────┤
│ Scenario:  [Sensor on]  [Foot pedal]  [UV cycle]         │  ← scrub-sink
├──────────────────────────────────────────────────────────┤
│ Scenario:  [▶ Run cycle]   ┌─ progress ──────┐           │  ← hvac
└──────────────────────────────────────────────────────────┘
```

- One scenario active at a time per viewer (mutual exclusion).
- Buttons mirror the existing PbLead style (`.bg-foreground.text-background` for active; `aria-pressed`).
- For continuous loops (airflow, fan spin, surgical-panel pulse) show a **toggle**; for one-shots (door swing, filter slide) show a **chip** that re-runs on each click and is disabled while playing.

### 3.5 Camera + scenario interaction

- Camera preset clicks **must not stop a scenario in progress** — they animate independently via `animateCameraTo`. The PbLead implementation already proves they coexist.
- Switching products: `useScenario` must `stop()` and `reset()` in its cleanup. Without this, anime.js timelines outlive the WebGL context — known cause of ghost geometry per the existing `viz-performance-discipline` skill.
- Switching ASSEMBLED ↔ EXPLODED: by default, `stop() + reset()` to base pose. Some scenarios (HVAC airflow, LAF airflow) can persist if explicitly flagged `persistAcrossViews: true`.
- Scenario state should **not persist across product switches** (researched by user; same default as PbLead today).

### 3.6 Performance budget

Each scenario must respect the project DPR cap and on-demand rendering rules (see `viz-performance-discipline` skill). Concretely:

| Scenario type | Particle / instance budget | Frame impact target |
|---|---|---|
| Hinge / linear slide | 0 instances; only group transform | < 0.2 ms / frame |
| Emissive ramp | material updates only | negligible |
| Particle stream (steady) | ≤ 200 InstancedMesh instances per stream, single material | < 0.6 ms / frame |
| HVAC compound | 4 atomics in parallel | ≤ 1.5 ms / frame |

When a scenario triggers continuous animation, the renderer's idle-frame skip must be **disabled** for the duration of the scenario (set a `needsRender = true` per frame); on stop, hand back to event-driven rendering.

---

## 4. Implementation order

Ranked by demo value / effort ratio. Each phase is ~1 PR.

### Phase 1 — extract the primitive (1 PR)

1. `pacs-cabinet` (door swing). **Why first:** it's a near-clone of PbLead — perfect crucible for the `HingeSwingScenario` extraction. After this, PbLead can be retrofitted to use the shared primitive.
2. `ceiling-panel` (single panel drop). Validates `LinearSlideScenario` on the simplest case.

### Phase 2 — high-impact actions (1–2 PRs)

3. **`hermetic-door` (sliding open/close).** Highest narrative payoff in the catalog: customers will recognize the auto-door immediately. Two-leaf parallel slide via anime.js. Confirms the "≥ 2 parallel tweens → anime.js" rule.
4. **`pass-box` (interlock state machine).** The interlock is the *whole point* of the product — animation makes the spec self-documenting. Reuses `HingeSwingScenario` × 2 plus state machine.

### Phase 3 — particle primitive (1 PR)

5. `laf-system` (vertical laminar airflow + filter slide-out). Gives us `ParticleStreamScenario` and `LinearSlideScenario` together. Highest "wow factor" for cleanroom buyers.
6. `return-air-grille` (louver tilt + airflow). Cheap once particle stream exists.
7. `curving` (corner airflow). Pure reuse of particle stream.

### Phase 4 — polished detail (1–2 PRs)

8. `scrub-sink` (sensor + pedal + TMV + UV). The richest choreography. Build it last so all primitives are mature.
9. `xray-viewer` (LED ramp + film clip). Tiny, but feels finished.
10. `surgical-control-panel` (panel wake-up). Tiny.
11. `sandwich-radiasi` (layer-peel build). Reuses exploded offsets in reverse — almost free.

### Phase 5 — composite (1 PR)

12. `hvac-system` (full cycle). Compose all atomic primitives. The complexity is integration with the existing BIM mode bar, not the animation itself.

### Why this order

- It validates the shared `useScenario` hook on a near-clone of the only production reference (PbLead → pacs-cabinet) before generalising.
- Particle primitive arrives in Phase 3 once the simpler primitives are stable, so debugging doesn't conflate transform bugs with particle-system bugs.
- HVAC ships last because its scenario is a composition of others; building it earlier would force us to define abstractions we don't yet need.

### Reuse matrix (final)

| Phase | Net new primitive | Reused primitives |
|---|---|---|
| 1 | `HingeSwingScenario`, `LinearSlideScenario` | — |
| 2 | parallel-tween wiring (anime.js timeline plumbing) | hinge × 2, slide × 2 |
| 3 | `ParticleStreamScenario` | slide |
| 4 | `EmissiveScenario` | hinge, slide, particle |
| 5 | compound-timeline glue | all of the above |

After Phase 5: ~70 % of scenario code is shared, per-product files only declare a `ScenarioDef[]` array and pass it to `useScenario(refs, defs)`.

---

## 5. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Particles in scrub-sink/LAF push frame time on low-end devices | Cap instances; auto-pause when tab hidden; fall back to "infographic" arrows on `prefers-reduced-motion` |
| Pass-box interlock false-pressed (user spams open while running) | `controller.isPlaying()` guard; disable buttons during play |
| Camera preset mid-scenario looks janky | Already handled by PbLead; verify in tests |
| `anime.js` and vanilla rAF both touching same `Object3D` | Single controller per viewer; controller owns the rAF id |
| Reduced motion accessibility | Respect `prefers-reduced-motion`: skip tween, snap to end pose |
| Memory leak from particles on product switch | `useScenario` cleanup must dispose `InstancedMesh` geometries it owns |

---

## 6. Citations (one consolidated list)

- Hermetic sliding door — KAST ICU: https://www.kastdoor.com/product-hermetic-icu-automatic-sliding-doors.html
- Hermetic sliding door — KAST hospital: https://www.kastdoor.com/product-hospital-hermetic-automatic-sliding-doors.html
- Hermetic sliding door — Veze: https://www.vezedoor.com/hospital-hermetic-sliding-door.html
- Hermetic sliding door — Swico Sonha: https://sonha.com/en/san-pham/swico-hermetic-sliding-door-korea/
- Hermetic sliding door — Ownic: https://en.ownic.com.cn/products_detail/c-_detailId%3D1383879381901529088.html
- Pass-box interlock — Youthfilter: https://youthfilter.com/news/pass-box-working-principles-explained-interlock-mechanisms-airflow-dynamics-and-uv-sterilization-cycle-design-for-cleanroom-applications
- Pass-box interlock — Airkey: https://www.airkeyx.com/about/detail/comprehensive-guide-to-pass-box
- Pass-box interlock — LuxMed YouTube: https://www.youtube.com/watch?v=XInqYgR5zt0
- Pass-box interlock — manuals.plus: https://manuals.plus/video/ce78927e8fd8181256402aece88d80031e4dce17ca66743e7814a8cc363bce3b
- Scrub sink IR sensor — LogiQuip: https://www.logiquip.com/scrub-sinks
- Scrub sink TMV — InnerSpace: https://innerspacehealthcare.com/medical-storage/scrub-sink-single-basin
- Scrub sink TMV manual — MAC Medical PDF: https://macmedical.com/wp-content/uploads/2019/03/MAN-009-Rev-D.pdf
- Scrub sink IR sensor models — Paragon: https://www.paragonmed.com/product-category/stainless-ware/scrub-sinks-stainless-ware
- Scrub sink foot pedal — Sani-Lav: https://www.globalindustrial.com/p/532f1-floor-mount-scrub-sink-with-double-foot-pedal-valve
- LAF airflow — Ossila: https://www.ossila.com/pages/laminar-flow-hood-filters
- LAF HEPA — Airtècnics LamiFlow: https://www.airtecnics.com/products/lamiflow-filter
- LAF principles — Testronix: https://www.testronixinstruments.com/blog/laminar-air-flow/
- LAF brochure — Mikropor PDF: https://www.mikropor.com/wp-content/uploads/2022/04/041_MIKROPOR%20LAF%20BROSUR%20ING%20120122.pdf
- LAF — Lamsys: https://www.lamsys.com/articles/equipment2/laminar-flow-cabinet-filtration/
- AHU damper anatomy — YouTube: https://www.youtube.com/watch?v=tipdu6pM_zs
- AHU animation — YouTube: https://www.youtube.com/watch?v=2zPhtokX4ow
- Damper control logic — Johnson Controls Metasys: https://docs.johnsoncontrols.com/bas/r/Metasys/en-US/Controller-Tool-Help/16.0/Output-Control-Modules/Damper-Control-AHU-Econ/Damper-Control-for-Relief-Fan-v50
- HVAC damper types — YouTube: https://www.youtube.com/watch?v=JYg3uJsSNTo
- X-ray viewer — Abimed: https://www.abimed.com/ultraslim-xray-film-viewer/am-ulx-raya10s
- X-ray viewer — Biox: https://www.biox.co.in/led-x-ray-view-box/
- X-ray viewer dimmer + sensor — Lifex: https://www.dentalmantraa.com/products/lifex-led-x-ray-view-box-single-film-14x17-with-automatic-sensor-and-dimmer
- X-ray viewer — Mplent ZG-3B: https://cdn.mplent.com/products/side-lit-led-film-viewer-155.html
- Walkable ceiling — Clean Rooms West: https://www.cleanroomswest.com/ready-to-build-components/walkable-ceiling-grid
- Walkable ceiling — ACH: https://www.achengineering.com/cleanroom-solutions/walkable-ceilings
- Walkable ceiling — CleanAir Specialists: https://www.cleanroomspecialists.com/ceilings/walkable-cleanroom-ceiling
- Walkable ceiling — Mecart: https://www.mecart-cleanrooms.com/cleanrooms/ceiling-system
- Walkable ceiling — Delta-2000: https://www.delta-2000.com/en/walkable-false-ceilings-clean-rooms
- Return-air design — ACH cleanroom guide: https://www.achengineering.com/feeds/blog/clean-room-low-wall-return
- Cascading return airflow — EAB: https://www.eabcoinc.com/technical-article/solving-return-airflow-pathways-in-a-cascading-cleanroom/
- Critical-environment grille catalog — Titus PDF: https://www.titus-hvac.com/file/3948/critical%20environment%20_2024_V2_opt.pdf
- Airflow visualisation standard — ASTM E3379-25: https://store.astm.org/e3379-25a.html
- OR control panel — CureVision ORC-417: https://www.curevision.ca/product/en/orc-417-series
- OR control panel — AmcareMed: https://amcaremed.com/products/lcd-operating-room-control-panel/
- Medical-gas master alarm — Tri-Tech: https://tri-techmedical.com/medical-gas-pipeline-equipment/medical-gas-alarm-panel/
- Medical-gas area alarm — Tri-Tech: https://tri-techmedical.com/medical-gas-pipeline-equipment/medical-gas-area-alarm/
- Medical-gas control panels — Hospital FS: https://www.hospitalfs.com/medical-gas-control-panels-p-104.html
- PACS cabinet (medical-records) — Southwest Solutions: https://www.southwestsolutions.com/divisions/healthcare/medical-record-storage-systems/medical-records-storage/
- PACS cabinet — Medicus Health: https://www.medicus-health.com/document-management/medical-file-storage-cabinets.html
