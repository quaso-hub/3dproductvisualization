# Highlight + Dim/Blur Bidirectional Pattern — Research Report

**Date:** 2026-05-24
**Repo:** `3dproductvisualization` (Vite 6 + React 18 + raw Three.js 0.183 + CSS2DRenderer)
**Goal:** Best 2026 SOTA pattern for hover-link between CSS2D labels ↔ 3D parts: highlight target, dim non-targets, animate ~250ms, work on mobile, integrate with the existing on-demand render loop.

---

## TL;DR

Use **Approach A (Material-property tween) + Hybrid H (CSS class on labels)**, not OutlinePass.

The repo already has every ingredient: each `placeAnnotations` item knows the anchor mesh, materials are mostly per-mesh `MeshStandardMaterial` (cheap to mutate), the renderer uses on-demand rendering (`invalidate()`), and we already cap DPR on mobile. Adding `EffectComposer` would force full-frame rendering every tick, blow the on-demand savings, double the GPU memory (extra render targets), and break the mobile DPR strategy.

A `HighlightController` that mutates `emissiveIntensity` (highlight) + `opacity`/`material.color` luminance (dim) over a 250 ms eased tween hits all five goals, costs <1 KB extra JS, requires zero post-processing, and degrades gracefully under `prefers-reduced-motion`.

---

## Section 1 — Approaches Comparison

### A. Material property tween (emissive boost + opacity dim) — RECOMMENDED ★

**How:** For each highlightable mesh, store its base material's original `emissive`, `emissiveIntensity`, `opacity`, `color` (luminance) on `mesh.userData.baseMat`. On highlight, tween:

- target mesh: `emissiveIntensity` 0 → 0.35, scale 1.0 → 1.04, optionally `color.multiplyScalar(1.1)`
- other meshes: `material.opacity` 1 → 0.25, `transparent: true`, optionally desaturate via `color.lerp(grey)`

| Metric | Value |
|---|---|
| Setup cost | None — works with existing materials |
| Runtime cost | 1× material property write per mesh per frame during tween (~250 ms), zero after settle |
| GPU cost | +0 ms / frame (no extra passes, no extra render targets) |
| Memory cost | +0 (mutates in place) or +N materials if you clone (recommended) |
| Bundle cost | <500 B for the controller |
| Works with on-demand renderer | ✅ Just call `invalidate()` per tween tick |
| Mobile-safe | ✅ |
| Visually punchy | Medium — clear but not "wow". Use scale boost + emissive together for read |
| Risk | Mutating a shared material affects all viewers — must clone or guard via `isSharedMaterial` (already in `lib/materials.ts`) |

**Pros:** Cheapest, simplest, works on mobile, plays nicely with shadow-map `autoUpdate=false`, plays nicely with the on-demand render loop, works inside `useThreeScene`'s lifecycle.

**Cons:** Less "outline-y" — there's no crisp 1-px stroke around the part. Compensate with scale-up (1.04× on highlight) + a stronger emissive bump.

**References:**
- [JEasing Material Properties — Sean Bradley](https://sbcode.net/threejs/jeasing-material-properties/) — exact pattern of tweening `material.opacity` / `material.color`.
- [Three.js forum — How to update Things](https://threejs.org/manual/en/how-to-update-things.html) — confirms `material.color`, `opacity`, `emissive*` are free to mutate per frame, no shader recompile.
- [Stack Overflow — change mesh color on mouseover (recent answer)](https://stackoverflow.com/questions/38314521/change-color-of-mesh-using-mouseover-in-three-js) — production pattern for raycaster-driven recoloring.
- [ektogamat/mesh-transition-material](https://github.com/ektogamat/mesh-transition-material) — reference for crossfading, more complex than we need but validates the approach.

### B. EffectComposer + OutlinePass — gold standard but expensive

**How:** `composer.addPass(new OutlinePass(...))`, set `outlinePass.selectedObjects = [mesh]`. Adjust `edgeStrength`, `edgeGlow`, `edgeThickness`, `pulsePeriod` for animation.

| Metric | Value |
|---|---|
| Setup cost | Replace `renderer.render()` with `composer.render()` site-wide |
| Runtime cost | Full extra render pass + depth pass + edge filter + maskTexture; ~1.5–4 ms desktop, 6–12 ms mobile mid-tier |
| GPU memory | Extra full-screen render targets, sized at DPR — at DPR 1.5 / 1080p ≈ 12 MB extra |
| Bundle cost | ~30 KB (`postprocessing` + `OutlinePass`) |
| Works with on-demand renderer | Awkward — composer must run every tick the outline animates (pulse) |
| Mobile-safe | ❌ for this repo's DPR-1.5 mobile target |
| Visually | Best-in-class crisp outline + glow |
| Maintenance | OutlinePass / OutlineNode have multiple known perf bugs in 2026 |

**Known issues (2026):**
- [#33188 — OutlineNode.js will affect rendering frame rate (closed Mar 2026)](https://github.com/mrdoob/three.js/issues/33188) — confirmed perf hit with Line2 / many objects.
- [#33355 — WebGPU outline pass unnecessary overhead if no objects are selected (Apr 2026)](https://github.com/mrdoob/three.js/issues/33355) — overhead even when zero objects highlighted.
- [#29220 — OutlinePass: Improve performance of `VisibilityChangeCallBack()` (Aug 2024)](https://github.com/mrdoob/three.js/pull/29220) — perf PR shows the historical state of OutlinePass perf.
- [OutlinePass docs](https://threejs.org/docs/pages/OutlinePass.html), [OutlineNode docs](https://threejs.org/docs/pages/OutlineNode.html).
- [PR #29575 — Add OutlineNode (WebGPU)](https://github.com/mrdoob/three.js/pull/29575) — WebGPU port, brand new; not stable enough for prod yet.

**Verdict:** Reject for this repo. Even on desktop, swapping to a composer means giving up `shadowMap.autoUpdate = false` + on-demand render economics, both of which the repo specifically engineered for switch-product responsiveness.

### C. Stencil-based outline (custom shader / inverted hull)

**How:** For highlighted mesh, render a slightly scaled clone with `BackSide` + flat color + stencil mask so the outline only shows around the silhouette.

| Metric | Value |
|---|---|
| Setup cost | High — manual `material.stencilWrite`, `stencilFunc`, etc. per mesh |
| Runtime cost | 1 extra draw call per highlighted mesh; cheap |
| Bundle cost | 0 (no library) |
| Mobile-safe | ✅ but watch for stencil buffer (we currently set `stencil: false` in the WebGLRenderer config — would need to flip to `stencil: true`, costs ~1 byte/pixel of framebuffer) |
| Visually | Cartoonish/cel-shaded outline — does not match the medical-catalog aesthetic of this repo |

**References:**
- [Stack Overflow — Outline object normal scale + stencil mask three.js](https://stackoverflow.com/questions/23183507/outline-object-normal-scale-stencil-mask-three-js) — canonical answer.
- [Omar Shehata — How to render outlines in WebGL (Medium 2021)](https://omar-shehata.medium.com/how-to-render-outlines-in-webgl-8253c14724f9).
- [Omar Shehata — Better outline rendering using surface IDs (Medium 2022)](https://omar-shehata.medium.com/better-outline-rendering-using-surface-ids-with-webgl-e13cdab1fd94) — fancier but heavier.
- [Three.js outlines — Stack Overflow](https://stackoverflow.com/questions/14561360/three-js-outlines).

**Verdict:** Reject. Aesthetic mismatch + repo currently disables stencil for perf.

### D. Selective bloom (UnrealBloomPass + layers)

**How:** Highlighted mesh → `mesh.layers.enable(BLOOM_LAYER)`. Two-pass render: bloom-only on bloom layer, then composite over the main scene with an additive shader.

| Metric | Value |
|---|---|
| Setup cost | Significant — needs a swap-material-to-black trick during bloom pass, plus a custom composite shader |
| Runtime cost | 2 full passes per frame the highlight is alive |
| Bundle cost | ~25 KB |
| Mobile-safe | ❌ |
| Visually | Beautiful glow — best for parts that should look "lit" (LEDs, sensor indicators) |
| Maintenance | Drei's `<EffectComposer><Bloom selective>` is industry standard but R3F-only; vanilla port is fiddly |

**References:**
- [Selective Bloom in Three.js? — discourse](https://discourse.threejs.org/t/selective-bloom-in-three-js/35345)
- [How to get Selective Bloom to work without layers? — discourse 2024](https://discourse.threejs.org/t/how-to-get-selective-bloom-to-work-without-layers/57728)
- [Wael Yasmina — Unreal Bloom Selective tutorial](https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing)
- [Stack Overflow — ThreeJS Selective Bloom Specific Parts](https://stackoverflow.com/questions/67014085/threejs-selective-bloom-for-specific-parts-of-one-object-using-emission-map)
- [Anderson Mancini — YouTube tutorial](https://www.youtube.com/watch?v=er02gtD8asA)

**Verdict:** Reject for this product catalog. Could be added later as an upgrade for the 2 LED parts (`sGreen`, `sAmber` in `HermeticDoorAssembled3D`) but overkill for the highlight-system itself.

### E. Pure opacity dimming (cheapest fallback)

**How:** Highlighted mesh stays at `opacity:1`. Other meshes get `material.transparent=true; material.opacity=0.2`. No emissive boost, no scale.

| Metric | Value |
|---|---|
| Setup cost | Trivial |
| Runtime cost | Free |
| Bundle cost | 0 |
| Mobile-safe | ✅ |
| Visually | Weakest — relies entirely on the dim, the highlighted part doesn't "pop" |
| Risk | `transparent: true` reorders draw calls and disables depth-write — fine for small scenes, can cause z-fighting in dense ones |

**Verdict:** Use as the `prefers-reduced-motion` fallback — no animation, instant opacity swap, no scale, no emissive.

### F. Per-mesh edge geometry (line-art highlight)

**How:** Pre-generate `EdgesGeometry` for each highlightable mesh, hidden by default. On highlight, `visible = true` + thicken via `LineBasicMaterial.linewidth` (note: `linewidth > 1` ignored on most platforms — would need `Line2`/`LineMaterial` from `examples/jsm/lines/`).

| Metric | Value |
|---|---|
| Setup cost | Build edge geometries up front per highlightable mesh (~1 KB geometry each) |
| Runtime cost | Tiny — toggling visibility of pre-built lines |
| Bundle cost | +`LineMaterial` / `Line2` ≈ 10 KB if you want thick lines |
| Mobile-safe | ✅ |
| Visually | Engineering / blueprint aesthetic — actually fits this repo's medical-catalog tone perfectly |
| Risk | Edges already exist in repo (`buildLayerMesh` adds them at opacity 0.15) — would need to track per-mesh edges separately |

**Verdict:** Strong second choice or stack on top of A. The repo's existing 0.15-opacity edges hint that this aesthetic is welcomed.

### G. CSS-only label highlight (no 3D side effect)

**How:** Hover label → CSS `:hover` adds a class. The 3D model never changes.

**Verdict:** Reject as primary — fails the user's spec ("3D part(s) get highlighted"). Use it for the inverse direction's label half (label CSS class is part of the bidirectional sync).

### H. Hybrid: A (material) + scale-up + label CSS class — RECOMMENDED ★

The chosen pattern. Combines:
1. Material tween on the part (A) — emissive boost + opacity dim of others
2. Tween `mesh.scale` 1.0 → 1.04 on the highlighted part (purely visual, free)
3. CSS class `.label-highlighted` on the matching `CSS2DObject` wrapper div — Tailwind animation: brighter background, ring, scale 1.05, drop-shadow

This gives strong bidirectional read with zero postprocessing cost.

---

## Section 2 — Bidirectional Sync Mechanism

### Data model

Tag every highlightable mesh and every label with the same `partId` string:

```ts
// Mesh side
mesh.userData.partId = 'lead-glass';

// Label side — extend createLabel to accept partId
const wrap = document.createElement('div');
wrap.dataset.partId = 'lead-glass';
wrap.classList.add('viz-label');
const labelObj = new CSS2DObject(wrap);
```

Build a registry of `partId → { meshes: Mesh[]; labelEl: HTMLElement }` during scene construction. The registry lives next to the `SceneRefs`.

### Controller class (pseudo-code)

```ts
type PartId = string;

interface PartEntry {
  meshes: THREE.Mesh[];          // one part can be multiple meshes (e.g. doorMesh + bumpGuard)
  labelEl: HTMLElement;          // CSS2DObject wrapper div
  baseStates: BaseState[];       // captured at register() time, one per mesh
}

interface BaseState {
  material: THREE.MeshStandardMaterial;  // cloned, owned by controller
  emissive: THREE.Color;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  scale: number;                 // mesh.scale.x snapshot (assume uniform)
}

class HighlightController {
  private parts = new Map<PartId, PartEntry>();
  private hoverId: PartId | null = null;
  private pinId:   PartId | null = null;
  private animTargets = new Map<THREE.Mesh, AnimTarget>();
  private invalidate: () => void;   // from startRenderLoop return value

  register(partId: PartId, meshes: THREE.Mesh[], labelEl: HTMLElement) {
    // Clone each material so we never mutate shared singletons.
    const baseStates = meshes.map((m) => {
      const cloned = (m.material as THREE.MeshStandardMaterial).clone();
      m.material = cloned;
      return {
        material: cloned,
        emissive: cloned.emissive.clone(),
        emissiveIntensity: cloned.emissiveIntensity ?? 0,
        opacity: cloned.opacity,
        transparent: cloned.transparent,
        scale: m.scale.x,
      };
    });
    this.parts.set(partId, { meshes, labelEl, baseStates });
  }

  setHover(id: PartId | null) {
    if (this.pinId) return;        // pin wins
    if (this.hoverId === id) return;
    this.hoverId = id;
    this.applyState();
  }

  togglePin(id: PartId) {
    this.pinId = (this.pinId === id) ? null : id;
    this.applyState();
  }

  clear() {
    this.hoverId = null;
    this.pinId   = null;
    this.applyState();
  }

  /** Compute target values for every mesh + label, kick off animation. */
  private applyState() {
    const activeId = this.pinId ?? this.hoverId;
    const reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 0 : 250;

    this.parts.forEach((entry, id) => {
      const isActive  = id === activeId;
      const isDimmed  = activeId !== null && !isActive;
      const targetEm  = isActive ? 0.35 : 0;
      const targetOp  = isDimmed ? 0.22 : 1.0;
      const targetSc  = isActive ? 1.04 : 1.0;
      const targetTrans = isDimmed;  // turn transparent on iff dimmed

      entry.meshes.forEach((m, i) => {
        const base = entry.baseStates[i];
        this.animateTo(m, base, { targetEm, targetOp, targetSc, targetTrans }, dur);
      });

      // Label CSS class — instant, CSS handles the transition.
      entry.labelEl.classList.toggle('label-highlighted', isActive);
      entry.labelEl.classList.toggle('label-dimmed',     isDimmed);
    });

    this.invalidate();   // wake on-demand renderer
  }

  // animateTo uses one shared rAF loop (avoid per-mesh rAF spam)
}
```

### Raycasting on the canvas

Throttle pointermove to ~33 ms (30 fps is plenty for hover). Use `mesh.layers` to limit raycast targets, or filter `intersects` by `userData.partId !== undefined`.

```ts
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let lastMove = 0;

renderer.domElement.addEventListener('pointermove', (e) => {
  const now = performance.now();
  if (now - lastMove < 33) return;
  lastMove = now;

  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(
    ((e.clientX - rect.left) / rect.width)  *  2 - 1,
    ((e.clientY - rect.top)  / rect.height) * -2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);

  const targets = controller.highlightableMeshes();   // exposed cache
  const hits = raycaster.intersectObjects(targets, false);
  const id = hits[0]?.object.userData.partId ?? null;
  controller.setHover(id);
});

renderer.domElement.addEventListener('click', (e) => {
  // raycast same as above, then:
  controller.togglePin(id ?? null);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') controller.clear();
});
```

### Label side (the inverse direction)

The labels themselves are inside `labelRenderer.domElement`, which we already set to `pointerEvents: 'none'` for the **container**. To make labels interactive:

```ts
// In createLabel(), opt-in:
wrap.style.pointerEvents = 'auto';
wrap.style.cursor = 'pointer';

wrap.addEventListener('pointerenter', () => controller.setHover(partId));
wrap.addEventListener('pointerleave', () => controller.setHover(null));
wrap.addEventListener('click', (e) => {
  e.stopPropagation();
  controller.togglePin(partId);
});
```

Important: keep `pointerEvents: 'none'` on the **labelRenderer container** (so OrbitControls drag still works on empty space), but flip it to `'auto'` on each individual label `div`. This is exactly the [css2drenderer-overlay pattern in Threlte](https://threlte.xyz/docs/examples/renderers/css2drenderer-overlay).

### Wiring `placeAnnotations` to emit a registry

The current `placeAnnotations` returns `void`. Refactor to also return:

```ts
return items.map((item, i) => ({
  partId: item.partId,
  labelEl: createdLabels[i].element as HTMLDivElement,
}));
```

Then the viewer (e.g. `HermeticDoorAssembled3D`) calls `controller.register(partId, [meshA, meshB], labelEl)` for each part.

### Animation loop integration

Drive everything off **one** rAF that the controller owns. Each tick: lerp every active animation, write the property, call `invalidate()` so the on-demand render loop picks it up. When all animations settle, stop the rAF.

```ts
private tick = (now: number) => {
  let stillRunning = false;
  this.animTargets.forEach((tgt, mesh) => {
    const t = Math.min(1, (now - tgt.startedAt) / tgt.dur);
    const e = easeOutCubic(t);
    mesh.scale.setScalar(THREE.MathUtils.lerp(tgt.fromSc, tgt.toSc, e));
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = THREE.MathUtils.lerp(tgt.fromEm, tgt.toEm, e);
    mat.opacity           = THREE.MathUtils.lerp(tgt.fromOp, tgt.toOp, e);
    if (tgt.toTrans !== mat.transparent) mat.transparent = tgt.toTrans;
    if (t < 1) stillRunning = true;
    else this.animTargets.delete(mesh);
  });
  this.invalidate();
  if (stillRunning) this.rafId = requestAnimationFrame(this.tick);
  else this.rafId = 0;
};
```

---

## Section 3 — Animation library recommendation

| Library | Bundle (gzip) | API quality for our needs | Three.js track record | Verdict |
|---|---:|---|---|---|
| Vanilla rAF + `THREE.MathUtils.lerp` + custom ease | 0 B | Easy — we only need one curve (easeOutCubic), already used in `animateCameraTo` | First-class | ✅ **CHOOSE** |
| [Tween.js](https://github.com/tweenjs/tween.js) | ~3 KB | Three.js's "house" tweener historically; verbose | Excellent, but old | Skip |
| [Anime.js v4](https://animejs.com) | ~9 KB | Beautiful API; new ES module v4 (May 2024) is tree-shakable | Generic, not 3D-aware | Skip |
| [GSAP](https://gsap.com) | ~25 KB core | Best-in-class API, all plugins now free (Webflow acquisition 2024) | Excellent, [GSAP forum thread](https://gsap.com/community/forums/topic/8790-performance-issues-with-tweening-many-threejs-objects-at-once) confirms perf parity with tween.js | Skip — overkill for one 250 ms tween |

The repo already implements its own tween in `animateCameraTo` (lines 339–377 of `three-scene.ts`) using exactly this pattern (ease-out cubic + rAF + `Promise<void>`). Reuse that style; do not add a dependency.

**Sources:**
- [Plain English — Top 10 JS Animation Libraries](https://javascript.plainenglish.io/top-10-javascript-animation-libraries-f11e9bb6085a)
- [ICS Media — Comparing JS animation libraries 2025](https://ics.media/en/entry/14973)
- [GSAP issue #403 — bundle size discussion](https://github.com/greensock/GSAP/issues/403)

---

## Section 4 — Mobile + accessibility considerations

### Touch model

`@media (hover: none)` is the canonical detector. The repo already uses `matchMedia('(pointer: coarse)')` for DPR; same matcher works.

```ts
const isCoarse = matchMedia('(hover: none)').matches;
```

| Action | Coarse pointer (touch) | Fine pointer (mouse) |
|---|---|---|
| Move / hover | none — touch has no hover | `setHover(id)` |
| Tap on part | `togglePin(id)` | (use click) |
| Tap on label | `togglePin(id)` | (use click) |
| Tap on empty canvas | `clear()` | (use click) |
| Esc key | `clear()` | `clear()` |
| Long-press 600 ms | optional: open detail card | n/a |

Implement with `pointerdown`/`pointerup` and the `pointerType` field — works for mouse, touch, and pen with one handler.

### `prefers-reduced-motion`

Per [Josh Comeau — Accessible Animations in React](https://www.joshwcomeau.com/react/prefers-reduced-motion) and [WebKit demo](https://webkit.org/blog-files/prefers-reduced-motion/prm.htm):

```ts
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dur = reduced ? 0 : 250;
```

`dur=0` makes `animateTo` snap to the target on the first tick — no animation, no flashing scale. The CSS for `.label-highlighted` should also be wrapped:

```css
.label-highlighted { transition: transform 250ms ease-out, background 250ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .label-highlighted { transition: none; }
}
```

### Mobile perf budget

The repo's existing budget (Session 7.5 notes via `viz-performance-discipline`):
- DPR cap 1.5 on coarse pointer
- `shadowMap.autoUpdate = false`
- on-demand render loop
- no postprocessing

This rules out **B** (OutlinePass) and **D** (selective bloom) for mobile. Approach **A** is mobile-safe because each tween only mutates a Float32 and a Color on a handful of materials per frame — well under 1 ms.

Trigger `refs.renderer.shadowMap.needsUpdate = true` only if you tween `mesh.scale` such that the silhouette grows — for a 4 % bump it's barely visible without re-baking, so leave shadows static.

### Sources
- [a11y with Lindsey — Reducing Motion to Improve Accessibility](https://www.a11ywithlindsey.com/blog/reducing-motion-improve-accessibility)
- [Pope.tech — Design accessible animation, Dec 2025](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement)
- [BOIA — What to Know About prefers-reduced-motion](https://www.boia.org/blog/what-to-know-about-the-css-prefers-reduced-motion-feature)

---

## Section 5 — Recommended Pattern for THIS Repo

### One-page architecture

```
                       ┌─ pointermove ──┐
                       │                ▼
   canvas ─────► raycaster ────► HighlightController
                                       │
                                       │ setHover / togglePin / clear
                                       ▼
   labels (div) ──── pointerenter/click ─┤
                                       │
                                       ▼
                       ┌──────────  applyState()  ──────────┐
                       │                                    │
                       ▼                                    ▼
              animateTo(mesh, target)              labelEl.classList.toggle()
                       │                                    │
                       ▼                                    ▼
              one shared rAF loop ────► invalidate()  CSS transition (250 ms)
                       │
                       ▼
              renderer.render(scene, camera)
              labelRenderer.render(scene, camera)
```

### Files to add

1. **`src/app/lib/highlight-controller.ts`** (new, ~200 LOC)
   - `class HighlightController` with the API above
   - Owns: `parts: Map<PartId, PartEntry>`, `animTargets`, internal rAF
   - Exposes: `register`, `setHover`, `togglePin`, `clear`, `dispose`, `attachPointerEvents(domEl, camera, scene)`

2. **`src/app/styles/highlight.css`** (new, ~30 LOC)
   - `.viz-label`, `.label-highlighted`, `.label-dimmed`
   - Tailwind v4 `@theme` tokens or plain CSS — repo uses both, plain CSS is fine

3. **`src/app/hooks/useHighlightController.ts`** (new, ~30 LOC)
   - Thin React wrapper that creates the controller, attaches/detaches pointer events, returns the instance

### Files to modify

1. **`src/app/lib/three-scene.ts`**
   - `createLabel`: add `partId?: string` arg → set `wrap.dataset.partId`, add base class `viz-label`, set `pointerEvents: 'auto'` if `partId` provided.
   - `placeAnnotations`: accept `partId` per item; return `Array<{ partId; labelEl: HTMLDivElement }>` so the viewer can call `controller.register()`.

2. **`src/app/hooks/useThreeScene.ts`**
   - Pass `invalidate` from `startRenderLoop` to `onInit` (or expose via refs) so the controller can wake the renderer.

3. **Each viewer** (e.g. `HermeticDoorAssembled3D.tsx`)
   - Inside `buildScene`, set `mesh.userData.partId = 'lead-glass'` on the meshes that should be highlightable (doorMesh, glassMesh, handle, sensors, etc.).
   - After `placeAnnotations`, iterate the returned label refs and `controller.register(partId, meshes, labelEl)`.

### Material-cloning policy (critical)

The repo has `lib/materials.ts` with `isSharedMaterial(mat)` to skip disposing shared singletons. The controller MUST clone before mutating:

```ts
if (isSharedMaterial(m.material)) {
  m.material = (m.material as THREE.Material).clone();
}
// now safe to write emissiveIntensity / opacity / color
```

This pairs with the existing `disposeScene` logic — the cloned material is per-scene and gets disposed normally on unmount.

### Mode-aware integration

Each viewer registers the parts it owns. When the viewer unmounts, `disposeScene` traverses everything; the controller's per-mesh entries become stale `Mesh` references but they get GC'd because the controller itself is owned by the React component that mounts the scene. Provide `controller.dispose()` to be safe and call from the `useEffect` cleanup.

### Implementation order (single PR)

1. Add `highlight-controller.ts` + CSS + hook (no integration yet).
2. Extend `createLabel` and `placeAnnotations` with `partId`.
3. Wire into `HermeticDoorAssembled3D` only (lowest-risk pilot — 7 labels, well-known meshes).
4. Smoke test: hover label → part glows + others dim. Hover part → label highlights. Click pins. Esc clears.
5. Mobile test on coarse pointer.
6. Roll out to remaining 16 viewers by adding `userData.partId` and the `partId` arg in their `placeAnnotations` calls.

### What NOT to do

- ❌ Add `EffectComposer` — kills on-demand render and mobile DPR strategy.
- ❌ Animate per-mesh with separate rAFs — coalesce into the controller's one loop.
- ❌ Mutate shared singletons from `lib/materials.ts` — always clone first.
- ❌ Toggle `transparent: true` on every mesh just-in-case — it disables depth-write and reorders draws. Only flip it on the dimmed meshes during the dim, flip it back to base on clear.
- ❌ Forget `controller.invalidate()` after every state change or animation tick — the on-demand loop will sit idle and the user will see nothing.

---

## Quick reference — reading order in this repo

- Renderer config and lifecycle: `src/app/lib/three-scene.ts` (1068 lines, especially `createScene` 50–154, `startRenderLoop` 227–263, `placeAnnotations` 509–578, `createLabel` 427–456).
- Lifecycle hook: `src/app/hooks/useThreeScene.ts` (121 lines).
- Reference viewer: `src/app/components/HermeticDoorAssembled3D.tsx` — 7 labels, 7 highlightable parts, ideal pilot.
- Shared materials guard: `src/app/lib/materials.ts` (`isSharedMaterial`).
- Mobile budget memo: `.opencode/skills/viz-performance-discipline/SKILL.md` and `.opencode/skills/viz-pbr-materials-2026/SKILL.md`.

---

## Sources cited (full list)

- https://github.com/mrdoob/three.js/pull/29575 — Add OutlineNode (WebGPU port)
- https://github.com/mrdoob/three.js/pull/29220 — OutlinePass perf PR
- https://github.com/mrdoob/three.js/issues/33188 — OutlineNode FPS bug
- https://github.com/mrdoob/three.js/issues/33355 — WebGPU outline overhead
- https://threejs.org/docs/pages/OutlineNode.html
- https://threejs.org/docs/pages/OutlinePass.html
- https://threejs.org/docs/pages/Raycaster.html
- https://threejs.org/manual/en/how-to-update-things.html
- https://sbcode.net/threejs/jeasing-material-properties/
- https://github.com/ektogamat/mesh-transition-material
- https://discourse.threejs.org/t/crossfade-two-materials-on-a-single-mesh/70043
- https://github.com/MasatoMakino/threejs-interactive-object
- https://stackoverflow.com/questions/77747347/how-to-change-material-of-indivudal-objects-in-three-js-without-the-use-of-separ
- https://stackoverflow.com/questions/38314521/change-color-of-mesh-using-mouseover-in-three-js
- https://stackoverflow.com/questions/23183507/outline-object-normal-scale-stencil-mask-three-js
- https://stackoverflow.com/questions/14561360/three-js-outlines
- https://omar-shehata.medium.com/how-to-render-outlines-in-webgl-8253c14724f9
- https://omar-shehata.medium.com/better-outline-rendering-using-surface-ids-with-webgl-e13cdab1fd94
- https://discourse.threejs.org/t/how-to-get-selective-bloom-to-work-without-layers/57728
- https://discourse.threejs.org/t/selective-bloom-in-three-js/35345
- https://waelyasmina.net/articles/unreal-bloom-selective-threejs-post-processing
- https://stackoverflow.com/questions/67014085/threejs-selective-bloom-for-specific-parts-of-one-object-using-emission-map
- https://www.youtube.com/watch?v=er02gtD8asA
- https://discourse.threejs.org/t/gltf-mesh-css2d-annotation-wrong-position/42584
- https://gist.github.com/fabiovalse/2e8ae04bfce21af400e6
- https://threlte.xyz/docs/examples/renderers/css2drenderer-overlay
- https://r3f.docs.pmnd.rs/api/events
- https://www.reddit.com/r/threejs/comments/vzo32h/raycasting_in_a_scene_with_multiple_meshes/
- https://dustinpfister.github.io/2021/05/18/threejs-raycaster/
- https://ryanschiang.com/threejs-clickable-vertices-tutorial
- https://github.com/greensock/GSAP/issues/403
- https://ics.media/en/entry/14973
- https://javascript.plainenglish.io/top-10-javascript-animation-libraries-f11e9bb6085a
- https://gsap.com/community/forums/topic/8790-performance-issues-with-tweening-many-threejs-objects-at-once
- https://webkit.org/blog-files/prefers-reduced-motion/prm.htm
- https://www.a11ywithlindsey.com/blog/reducing-motion-improve-accessibility
- https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement
- https://www.boia.org/blog/what-to-know-about-the-css-prefers-reduced-motion-feature
- https://www.joshwcomeau.com/react/prefers-reduced-motion
