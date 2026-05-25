# 3D Product Viewer UX Patterns — 2026 Research

**Date:** 2026-05-24
**Author:** UX research pass for Item 2A (interaction polish)
**Scope:** Three.js medical equipment catalog (`*Assembled3D.tsx` / `*Exploded3D.tsx`), 13+ products, MONO theme, mobile-first
**Audience:** procurement engineers, facility managers, dosen pembimbing
**Constraints we already enforce:** no auto-rotate (HARD RULE), DPR ≤ 2, dispose hygiene, MONO theme (zero radius, monospace, monochrome), desktop right-rail / mobile bottom-sheet split

---

## Sources studied

Cited inline. Primary references:

- Apple iPhone 17 / iPhone Air pages — `https://www.apple.com/iphone-17/`, `https://www.apple.com/iphone-air/`
- Sketchfab Viewer API — `https://sketchfab.com/developers/viewer/examples?sample=Model+Hover`, `https://sketchfab.com/developers/viewer/examples?sample=Custom+Annotation`
- Sketchfab annotations (Fab) — `https://support.fab.com/s/article/Annotations`
- Sketchfab keyboard shortcuts (K / J / Esc) — `https://www.facebook.com/Sketchfab/videos/.../145515607478821`
- Tesla Model 3 builder heuristic eval (Daniel Lau) — `https://www.daniellau.org/2024/02/13/tesla-model-3-builder/`
- Tesla design configurator — `https://www.tesla.com/model3/design`
- Vectary "5 hotspot alternatives" (Lightology) — `https://3d.lightology.com/3d-modeling-blog/5-tips-for-hotspots-alternatives/`
- Dopple hotspots SDK — `https://docs.dopple.io/development/hotspots/`
- Threedium annotations — `https://documentation.threedium.io/docs/platform/designer/annotations/`
- Google `<model-viewer>` annotations + a11y — `https://github.com/google/model-viewer/discussions/3419`, `.../discussions/1882`, `.../pull/3007`
- Three.js raycaster / picking — `https://threejs.org/docs/pages/Raycaster.html`, `https://threejs.org/manual/en/picking.html`
- Three.js OutlineNode — `https://threejs.org/docs/pages/OutlineNode.html`
- Drei `<Html>` (occlude raycast/blend) — `https://drei.docs.pmnd.rs/misc/html`, discussion `https://discourse.threejs.org/t/dreis-html-elements-flicker/63215`
- Threekit camera transitions — `https://community.threekit.com/learn/workflows/camera-transition-animation`
- WCAG 2.5.5 / 2.5.8 target size — `https://www.w3.org/WAI/WCAG21/Understanding/target-size.html`, `https://testparty.ai/blog/wcag-target-size-guide`
- WCAG 2.3.3 animation from interactions / C39 reduced-motion — `https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html`, `https://www.w3.org/WAI/WCAG22/Techniques/css/C39`
- Pope Tech accessible animation guide — `https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/`
- Material Design easing/duration — `https://m3.material.io/styles/motion/easing-and-duration/tokens-specs`, `https://m1.material.io/motion/duration-easing.html`
- NN/g onboarding tutorials vs contextual help — `https://www.nngroup.com/articles/onboarding-tutorials/`
- Appcues onboarding patterns — `https://www.appcues.com/blog/choosing-the-right-onboarding-ux-pattern`
- Awwwards Bruno Simon case study — `https://www.awwwards.com/brunos-portfolio-case-study.html`
- Speckle viewer right-click context menu PR — `https://github.com/specklesystems/speckle-server/pull/5254`

---

## Section 1 — Pattern catalog

### P1. Cursor-shape feedback for hoverable 3D parts

**What it does.** Changes the canvas `cursor` to `pointer` only when raycaster hits an interactive mesh; reverts to `grab` (idle) / `grabbing` (drag) otherwise. Apple, Tesla, Sketchfab, and `model-viewer` all do this — without it, users don't know the model is clickable.

**When to use.** Always, on every viewer. It's the cheapest interactivity affordance and the one users notice unconsciously.

**Sketch.**

```ts
// Inside the rAF loop, after raycaster.intersectObjects(...)
const hit = intersects.find((i) => i.object.userData.partId);
canvas.style.cursor = hit ? 'pointer' : controls.dragging ? 'grabbing' : 'grab';
```

**Accessibility notes.** Cursor change is *purely* visual; pair it with `role="button"` + `aria-label` on a visually-hidden DOM proxy per part (model-viewer pattern, see P9).

**Mobile variant.** Skip — no cursor on touch. Use **P2 (ghost outline)** as the affordance instead.

---

### P2. Ghost outline on hover (NOT full highlight)

**What it does.** On hover/finger-move, draw a subtle stroke around the silhouette of the hovered part — **not** a full color swap. The Vectary writeup explicitly recommends a "subtle stroke version" over full-part highlight to avoid hiding context. Three.js ships an `OutlineNode` post-process effect for this; cheaper alternative is a duplicated mesh with `BackSide` + slight scale.

**When to use.** Always, paired with P1. This is the visual "this is interactive" signal.

**Sketch (post-process route).**

```ts
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
const outline = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
outline.edgeStrength = 4;
outline.edgeThickness = 1;
outline.visibleEdgeColor.set(0x000000); // MONO theme
outline.hiddenEdgeColor.set(0x000000);
composer.addPass(outline);
// On hover:
outline.selectedObjects = hoveredMesh ? [hoveredMesh] : [];
```

**Accessibility notes.** Outline color must hit ≥ 3:1 against scene background (WCAG 1.4.11). MONO theme (white bg / black foreground) gets 21:1 — easy.

**Mobile variant.** Trigger outline on `pointerover` (which fires on first tap before `pointerdown`) so users see the affordance before committing.

---

### P3. Tooltip with delay + safe placement

**What it does.** Shows a short label (part name + 1-line spec, e.g. "Stainless Steel Face — 0.8mm") after a hover delay. Sketchfab's annotation tooltip uses ~400ms delay to avoid flicker on cursor sweep. Tooltip must **never obscure the hovered part** — flip-side placement (Floating UI / Radix `<HoverCard>` `collisionPadding`) is mandatory.

**When to use.** Desktop only. On mobile, tap → bottom sheet (P12) replaces tooltips.

**Sketch.**

```tsx
// Custom hook keyed to hovered part id
const tooltipDelay = 400; // ms — Sketchfab + NN/g consensus
useEffect(() => {
  if (!hoveredId) return;
  const t = setTimeout(() => setTooltipShown(hoveredId), tooltipDelay);
  return () => clearTimeout(t);
}, [hoveredId]);
```

CSS placement (anchored, never on top of hovered part):

```css
.viz-tooltip {
  position: absolute;
  pointer-events: none;
  transform: translate(8px, -100%); /* offset off cursor */
  white-space: nowrap;
  background: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
  padding: 6px 10px;
  font: 11px/1.2 'JetBrains Mono', monospace;
  border: 1px solid hsl(var(--border));
  border-radius: 0; /* MONO */
}
```

**Accessibility notes.** Use `aria-describedby` on the focused part proxy so screen readers read the tooltip text. Hide tooltip on `Escape`.

**Mobile variant.** Replace with auto-snap to bottom-sheet `half` (P12). Don't render hover tooltips when `(pointer: coarse)`.

---

### P4. Click selection = pin highlight + breadcrumb in label

**What it does.** Click a part → it becomes "pinned" (stronger outline, slight emissive boost, others dim). The associated label gets a left border accent + "(selected)" sublabel, plus a small **× clear** button. Sketchfab annotations and Threedium both follow this; Threedium adds a numbered pin (1, 2, 3 ...) in the corner of the label, linking to a navigation list.

**When to use.** Whenever a part is the current focus of attention. Stays pinned until: user clicks empty space, presses `Escape`, or selects another part.

**Sketch.**

```tsx
// Pinned state: stronger outline + dim others
outline.selectedObjects = pinnedMesh ? [pinnedMesh] : [];
otherMeshes.forEach((m) => (m.material.opacity = pinnedMesh ? 0.25 : 1));
otherMeshes.forEach((m) => (m.material.transparent = true));

// Label
<div
  data-pinned={isPinned}
  className="border-l-2 border-foreground p-2 data-[pinned=true]:bg-accent"
>
  <span className="text-xs">{partName}</span>
  {isPinned && (
    <button onClick={clearSelection} aria-label="Clear selection">×</button>
  )}
</div>
```

**Accessibility notes.** Bind `Escape` globally to clear; this is documented behaviour for Sketchfab and Speckle viewers. Announce pin via `aria-live="polite"` ("Selected: Stainless Steel Face").

**Mobile variant.** Same logic; the × button must be ≥ 44×44 CSS px (WCAG 2.5.5).

---

### P5. Bidirectional Label ↔ 3D part sync (3 visual states)

**What it does.** Labels in the side panel and meshes in the 3D scene share a single `selectedId` / `hoveredId` state. Hovering either side highlights both. Labels visually distinguish three states:

1. **Idle** — default border, foreground text
2. **Hover** — accent background, foreground text (matches mesh outline)
3. **Pinned** — solid foreground bg, background-color text, × button visible

Plus a fourth state during selection: **Dimmed** — non-selected labels drop to `opacity: 0.5` to reinforce the dim-others-in-3D effect (mirrors P4).

**When to use.** Any viewer with > 3 named parts (which is all our HVAC, hermetic door, scrub sink, surgical panel viewers).

**Sketch.**

```tsx
type PartState = 'idle' | 'hover' | 'pinned' | 'dimmed';
function getState(id: string, hoveredId: string | null, pinnedId: string | null): PartState {
  if (id === pinnedId) return 'pinned';
  if (id === hoveredId) return 'hover';
  if (pinnedId && id !== pinnedId) return 'dimmed';
  return 'idle';
}

const stateStyles: Record<PartState, string> = {
  idle: 'border-border bg-background text-foreground',
  hover: 'border-foreground bg-accent text-foreground',
  pinned: 'border-foreground bg-foreground text-background',
  dimmed: 'border-border bg-background text-foreground opacity-50',
};
```

**Accessibility notes.** State *must not* be color-only (WCAG 1.4.1). The pinned state inverts the color block AND shows the × button. Hover state changes border-weight + background. Dimmed state uses opacity (gray text reinforced by absence of `×`).

**Mobile variant.** Label list lives in the bottom sheet (`half` snap). Tapping a label scrolls bottom sheet to `full` and runs P6 camera fly-to in the visible canvas portion.

---

### P6. Smooth camera fly-to on annotation click

**What it does.** When a label or pinned part is selected, the camera animates from current position → optimal viewing position for that part (Sketchfab "saved camera position per annotation"; Threedium identical). Animation lasts 250–400 ms with `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design "standard" curve). Keyboard `K` / `J` cycles to next/previous annotation in Sketchfab.

**When to use.** Any selection event, IF the part is currently off-screen or > 60% occluded.

**Sketch.**

```ts
import { Tween, Easing } from '@tweenjs/tween.js';

function flyToPart(part: PartDef) {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toPos = new THREE.Vector3(...part.cameraPos);
  const toTarget = new THREE.Vector3(...part.lookAt);

  // Respect reduced motion: instant snap
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    camera.position.copy(toPos);
    controls.target.copy(toTarget);
    controls.update();
    return;
  }

  new Tween({ t: 0 })
    .to({ t: 1 }, 350)
    .easing(Easing.Cubic.InOut) // ≈ cubic-bezier(0.4, 0, 0.2, 1)
    .onUpdate(({ t }) => {
      camera.position.lerpVectors(fromPos, toPos, t);
      controls.target.lerpVectors(fromTarget, toTarget, t);
      controls.update();
    })
    .start();
}
```

**Accessibility notes.** Always honor `prefers-reduced-motion: reduce` — snap instantly with no tween. Cite WCAG 2.3.3 / Technique C39.

**Mobile variant.** Same animation. Run *before* expanding bottom sheet so users see the camera move into the visible canvas region.

---

### P7. Layered information disclosure (peek → half → full)

**What it does.** Information appears in 3 progressively richer layers: **peek** (1-line label on hover/tap), **half** (40–50 vh panel with summary, materials, key dims), **full** (full-screen with full spec sheet, related products). Sketchfab and Threedium follow this; Apple iPhone pages use a similar "tap chip → expand to detail card" pattern in their compare/specs sections.

**When to use.** Any viewer with > 3 levels of detail (almost all of ours).

**Mapping to our existing `MobileBottomSheet` 3-snap component:**

| User action          | State on mobile                    | State on desktop                       |
| -------------------- | ---------------------------------- | -------------------------------------- |
| First load           | `peek` (96 px, just the part name) | Right-rail collapsed to label list     |
| Hover / tap part     | Highlight + label flash            | Tooltip P3                             |
| Click part           | `peek` → auto-snap to `half`       | Right-rail panel slides in `half` mode |
| Tap "More details" / | `half` → user drags to `full`      | Right-rail expands to `full` (88 vh)   |
| double-click part    |                                    |                                        |

**Accessibility notes.** Each level transition must be announced via `aria-expanded` and `role="region"`. Peek must always be dismissable via swipe-down or `Escape`.

**Mobile variant.** Native — this is mobile-first.

---

### P8. First-time onboarding hints (non-intrusive coachmarks)

**What it does.** First-time visitors see 2–3 contextual hints (NN/g calls these "pull revelations") that point to the key affordances. Each dismisses on action OR after 6 s + flag in `localStorage`. Apple, Tesla, and Sketchfab all use this — Sketchfab's first-load pulse on the model-rotate hint is a canonical example.

**When to use.** First load on any viewer. Never repeat (write `localStorage.setItem('viz.onboarded.v1', '1')`).

**Sequence (3 hints, sequential not concurrent):**

1. **Drag to rotate** — pulse cursor on canvas center, dismisses on first drag (1.5 s timeout fallback)
2. **Tap any part** — pulse on the most prominent annotated part, dismisses on first part-click
3. **Pinch / scroll to zoom** — small icon hint at bottom-right, dismisses on first zoom

**Sketch.**

```tsx
const [hintStep, setHintStep] = useState<0 | 1 | 2 | 3>(() =>
  localStorage.getItem('viz.onboarded.v1') ? 3 : 0
);
useEffect(() => {
  if (hintStep === 3) localStorage.setItem('viz.onboarded.v1', '1');
}, [hintStep]);

// Listeners advance the step:
controls.addEventListener('start', () => setHintStep((s) => (s === 0 ? 1 : s)));
canvas.addEventListener('click', () => setHintStep((s) => (s === 1 ? 2 : s)));
controls.addEventListener('change', () => {
  if (Math.abs(camera.position.length() - initialDistance) > 0.1)
    setHintStep((s) => (s === 2 ? 3 : s));
});
```

**Accessibility notes.** Provide a "Skip tour" button (≥ 44×44). Hints should never block keyboard nav. Use `role="status"` not `role="dialog"` so they don't trap focus.

**Mobile variant.** Replace "drag" with "swipe" copy. Show pinch-zoom icon (two-finger glyph) instead of scroll.

---

### P9. Loading: skeleton → progressive material reveal

**What it does.** Show a static silhouette + progress bar (Apple iPhone pages, Tesla configurator). Once GLB loads, fade-in materials over 200 ms. Don't reveal interactivity (P1 cursors) until ready. We already have `ViewerSkeleton.tsx` — extend it with the progressive-reveal step.

**When to use.** Every viewer mount. Especially important for chunked KTX2 textures > 200 KB.

**Sketch.**

```tsx
// Two-phase: skeleton until first frame, then fade materials
const [phase, setPhase] = useState<'skeleton' | 'reveal' | 'ready'>('skeleton');
const onLoadComplete = () => {
  setPhase('reveal');
  // After fade-in finishes:
  setTimeout(() => setPhase('ready'), 250);
};

// Inside three loop, animate material.opacity from 0→1 over 250ms when phase==='reveal'
// gate raycaster on phase==='ready' so cursor change doesn't fire mid-reveal
```

**Accessibility notes.** Loading region should be `role="status"` with `aria-live="polite"` and announce "Loading model. X percent complete." for screen readers. (This is exactly the model-viewer 3007 a11y PR pattern.)

**Mobile variant.** Same. On slow connections, show estimated MB to set expectations.

---

### P10. Keyboard-first navigation (Tab, K/J, Escape)

**What it does.** Power users tab through parts in a deterministic order. Sketchfab uses `K` (next annotation) / `J` (previous) / `Esc` (deselect) — these are documented community shortcuts. Speckle viewer's PR #5254 adds a right-click context menu that mirrors keyboard actions.

**When to use.** Always. Required for AAA accessibility.

**Sketch.**

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.target !== document.body && !canvasFocused) return;
    if (e.key === 'Escape') clearSelection();
    if (e.key === 'k' || e.key === 'ArrowDown') selectNext();
    if (e.key === 'j' || e.key === 'ArrowUp') selectPrev();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [...]);
```

Add an off-screen ARIA proxy list (model-viewer pattern, GitHub discussion #3419):

```tsx
<ul role="list" aria-label="Product parts" className="sr-only">
  {parts.map((p) => (
    <li key={p.id}>
      <button
        ref={(el) => (proxyRefs.current[p.id] = el)}
        onFocus={() => setHoveredId(p.id)}
        onClick={() => setPinnedId(p.id)}
        aria-pressed={pinnedId === p.id}
      >
        {p.name}
      </button>
    </li>
  ))}
</ul>
```

**Accessibility notes.** Visible focus ring on the canvas (`:focus-visible` outline). Announce selection state changes with `aria-live`.

**Mobile variant.** Skipped; mobile users don't have keyboards. Bottom-sheet swipe replaces it.

---

### P11. Reduced motion: instant swaps

**What it does.** Detect `prefers-reduced-motion: reduce`; replace ALL camera tweens, label fades, sheet animations, exploded-view animations with **instant** state swaps. WCAG 2.3.3 Technique C39 is the reference.

**When to use.** Always. Cheap to wire once globally.

**Sketch (CSS).**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

**Sketch (JS).**

```ts
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  camera.position.copy(targetPos); // skip tween
} else {
  tween(camera.position).to(targetPos, 350).start();
}
```

**Accessibility notes.** Watch `mediaQueryList.addEventListener('change', ...)` so changes during session take effect.

**Mobile variant.** iOS exposes the same media query (Settings → Accessibility → Motion → Reduce Motion).

---

### P12. Mobile bottom-sheet auto-snap on selection

**What it does.** When user taps a 3D part on mobile, sheet auto-promotes from `peek` → `half` so the user can see details without losing the viewer. Already partially in `MobileBottomSheet.tsx` and the project's `viz-mobile-overlay-pattern` skill — formalize as a viewer-wide convention.

**When to use.** Every mobile viewer with ≥ 1 selectable part.

**Sketch.**

```tsx
useEffect(() => {
  if (!isMobile) return;
  if (pinnedId && sheetSnap === 'peek') setSheetSnap('half');
  if (!pinnedId && sheetSnap === 'half') setSheetSnap('peek');
}, [pinnedId, isMobile, sheetSnap]);
```

**Accessibility notes.** Sheet handle ≥ 44 px tall, with `aria-label="Drag to expand details"`. Backdrop only at `full` to avoid accidental dismissal.

**Mobile variant.** Native.

---

### P13. Long-press = annotation pin lock (mobile)

**What it does.** A 500 ms long-press on a 3D part toggles a "sticky" pin that survives empty-space taps (only `×` button or new part-tap clears it). Lets users park a label while continuing to rotate. Mirrors right-click context menu on desktop (Speckle viewer PR #5254 pattern).

**When to use.** Optional power feature. Ship after P1–P12 stabilize.

**Sketch.**

```tsx
const longPressRef = useRef<NodeJS.Timeout | null>(null);
function onPointerDown(e: PointerEvent, partId: string) {
  longPressRef.current = setTimeout(() => {
    setPinnedId(partId);
    navigator.vibrate?.(50); // haptic ack on Android
  }, 500);
}
function onPointerUp() {
  if (longPressRef.current) clearTimeout(longPressRef.current);
}
```

**Accessibility notes.** Provide an alternate path (sheet → "Pin" button) — long-press is not discoverable. WCAG 2.5.1 (Pointer Gestures) requires single-pointer alternative.

**Mobile variant.** Native to mobile; on desktop, mirror with right-click → context menu.

---

### P14. Right-click / 2-finger tap context menu (desktop)

**What it does.** Right-click on a part opens a small menu: "Pin this part", "Hide this part", "Isolate (hide everything else)", "Copy spec to clipboard". Speckle's viewer PR #5254 ships exactly this.

**When to use.** Power user feature. Ship after P1–P12.

**Sketch.**

```tsx
canvas.addEventListener('contextmenu', (e) => {
  const part = pickPartAt(e.clientX, e.clientY);
  if (!part) return;
  e.preventDefault();
  setContextMenu({ x: e.clientX, y: e.clientY, partId: part.id });
});
```

**Accessibility notes.** Mirror every context menu action in the visible UI (long-press P13 mirror + sheet buttons). Menu items must be keyboard-navigable.

**Mobile variant.** Long-press P13.

---

### P15. Touch target sizing — 44 CSS px minimum

**What it does.** Every interactive control (close button, mode tabs, label tap target, sheet handle, scenario chips) is ≥ 44×44 CSS px (WCAG 2.5.5 AAA / 2.5.8 AA = 24×24 minimum but iOS HIG = 44, Material = 48). On 3D scene picking, raycaster tolerance should be enlarged on `(pointer: coarse)` so finger-fat touches still register.

**When to use.** Every UI control. Always.

**Sketch.**

```tsx
// Tailwind utility (matches Mobile bottom-sheet pattern):
<button className="h-11 min-w-[44px] px-3"> {/* 44px = h-11 in Tailwind v4 */}

// Raycaster tolerance widening for touch:
raycaster.params.Line.threshold = isCoarsePointer ? 0.1 : 0.01;
raycaster.params.Points.threshold = isCoarsePointer ? 0.1 : 0.01;
```

**Accessibility notes.** Cite WCAG 2.5.5 + 2.5.8.

**Mobile variant.** Native focus.

---

## Section 2 — Anti-patterns to avoid

The following are explicitly **forbidden** in this project (some are already HARD RULEs in the project skills):

1. **Auto-rotating scene by default.** Causes motion sickness; defeats user agency. **Already a HARD RULE** in `viz-3d-viewer-pattern`. Reaffirmed.
2. **Click-and-hold to spin.** Frustrates users who expect immediate drag. OrbitControls default (drag-to-spin) is correct.
3. **Tooltips that obscure the part they reference.** Always offset 8–12 px and use Floating UI / Radix collision detection.
4. **Transitions longer than 400 ms.** Users perceive > 400 ms as sluggish; Material spec recommends 200–350 ms for "standard" UI changes. Camera fly-to caps at 350 ms.
5. **Highlight that completely hides context** (full silhouette swap to a saturated color). Use stroke outline + slight emissive boost; *dim others* rather than *brighten one*.
6. **Modal overlays for simple info.** A bottom-sheet or right-rail panel is non-blocking; modals are reserved for destructive actions or hard requirements (consent, confirm).
7. **Color-only state encoding.** Pinned vs hover vs idle must differ in *more* than color (border weight, presence of × button, icon glyph). WCAG 1.4.1.
8. **Auto-zooming on hover.** Disorients users; only zoom on explicit selection (P6).
9. **Snapping camera with no tween** (when `prefers-reduced-motion` is *not* set). Feels like a teleport bug. Default to 250 ms tween.
10. **Hint coachmarks that block input.** They must use `role="status"` not `role="dialog"`.
11. **Label clusters that overlap.** Use Drei `<Html>` with `occlude` (raycast or blend, see Drei docs) so labels behind geometry fade or hide.
12. **Hard-coded numeric labels (1, 2, 3 ...) without text fallback.** Threedium-style numbered pins must always pair with the part name in the panel — screen-reader-only "1" is meaningless.

---

## Section 3 — Recommended interaction grammar (this repo)

Concrete, opinionated defaults so every viewer behaves identically.

### Default behaviors

| Trigger                                         | Behavior                                                                                                                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tap empty space**                             | Clear `pinnedId` only if it is set. Do NOT change camera. Do NOT collapse sheet (peek state preserved on mobile).                                                                         |
| **Tap label** (in panel / sheet)                | Set `pinnedId` to that part. Run camera fly-to (P6). On mobile: snap sheet to `half`. Announce via `aria-live`.                                                                           |
| **Tap 3D part**                                 | Same as tap label — symmetric behavior is critical. Plus: outline the mesh (P2 → P4). On mobile: snap sheet to `half`.                                                                    |
| **Hover 3D part** (desktop)                     | Set `hoveredId`. Apply outline P2. After 400 ms delay, show tooltip P3.                                                                                                                   |
| **Hover label** (desktop)                       | Same — set `hoveredId`. Mesh outline appears in scene. Symmetric.                                                                                                                         |
| **Long-press 3D part** (mobile)                 | After 500 ms: pin the part (P13). Haptic feedback (`navigator.vibrate(50)`). Auto-snap sheet to `half`.                                                                                   |
| **Right-click 3D part** (desktop)               | Context menu (P14): Pin / Hide / Isolate / Copy spec.                                                                                                                                     |
| **Escape key**                                  | Clear `pinnedId`. Close any open context menu / tooltip. If at sheet `full`, drop to `half`. If at `half`, drop to `peek`.                                                                |
| **K / ↓ key**                                   | Select next part in list order. Run P6 fly-to.                                                                                                                                            |
| **J / ↑ key**                                   | Select previous part. Run P6 fly-to.                                                                                                                                                      |
| **Tab key on canvas**                           | Move focus into the off-screen ARIA proxy list (P10). Each Tab focuses the next part; Enter pins it.                                                                                      |
| **prefers-reduced-motion**                      | All camera tweens, label fades, sheet animations → instant. Exploded-view "explode" animation also disabled (snap to exploded state instead).                                             |

### Cursor change rules (desktop only)

| Pointer state                       | `cursor`     |
| ----------------------------------- | ------------ |
| Idle, over canvas, over empty space | `grab`       |
| Idle, over canvas, over part        | `pointer`    |
| Drag in progress                    | `grabbing`   |
| Loading                             | `wait`       |
| Disabled (e.g. mid-animation)       | `not-allowed`|

### Numeric defaults (single source of truth)

| Token                       | Value                                | Source                                    |
| --------------------------- | ------------------------------------ | ----------------------------------------- |
| Tooltip delay               | **400 ms**                           | NN/g + Sketchfab                          |
| Long-press threshold        | **500 ms**                           | iOS HIG, Speckle viewer                   |
| Camera fly-to duration      | **350 ms**                           | Within Material "standard" 200–350 ms    |
| Camera fly-to easing        | `cubic-bezier(0.4, 0, 0.2, 1)`       | Material `emphasized` / `standard`       |
| Label / sheet animation     | **250 ms**                           | Material `medium2` 250 ms                 |
| Highlight outline thickness | **1 px** (visible) + **1 px** hidden | Three.js OutlinePass defaults             |
| Hover outline color         | `hsl(var(--foreground))` (MONO)      | Project theme                             |
| Pinned outline color        | same — paired with sheet pin badge   | Project theme                             |
| Highlight scale-up factor   | **none** (use outline, not scale)    | Vectary "subtle stroke" recommendation    |
| Dim opacity (others)        | **0.25**                             | Sketchfab convention                      |
| Min touch target            | **44 × 44 CSS px**                   | WCAG 2.5.5 + iOS HIG                      |
| Sheet snap heights          | peek 96 px / half 45 vh / full 88 vh | Existing project convention               |
| Onboarding flag key         | `viz.onboarded.v1`                   | Versioned for future hint additions       |

---

## Section 4 — Onboarding sequence

**Goal:** Get users from "static screenshot mindset" to "this is interactive" in < 8 seconds.

### Trigger conditions

- Show on **first viewer load** for the session, IF `localStorage.getItem('viz.onboarded.v1')` is null.
- Skip entirely if `prefers-reduced-motion: reduce` is set (these users get a single static text "Drag to rotate, tap parts for details" announced via `aria-live`).
- Reset is exposed as a **"Show tutorial again"** link in the global help / about menu — not auto-reset on version bump (annoying).

### Hint sequence (3 hints, sequential)

1. **HINT 1 — "Drag to rotate"** (delay 800 ms after viewer ready)
   - Visual: small pulsing arrow ⤴ near canvas center; subtle 1.5 s loop.
   - Copy: "Drag to rotate" (desktop) / "Swipe to rotate" (mobile).
   - Dismiss on: first `OrbitControls` `start` event, OR 5 s timeout, OR user clicks "Skip".
   - On dismiss: advance to HINT 2.

2. **HINT 2 — "Tap any part"** (delay 600 ms after HINT 1 dismiss)
   - Visual: pulse on the most prominent annotated part (use Drei `<Html>` anchored to part center).
   - Copy: "Tap any highlighted part to see details" (always "tap"; ambiguous works on both).
   - Dismiss on: first `pointerdown` on a part, OR 5 s timeout, OR Skip.
   - On dismiss: advance to HINT 3.

3. **HINT 3 — "Pinch to zoom"** (delay 500 ms after HINT 2 dismiss)
   - Visual: small icon at bottom-right (mouse wheel glyph on desktop, two-finger pinch glyph on mobile).
   - Copy: "Scroll to zoom" / "Pinch to zoom".
   - Dismiss on: first significant `OrbitControls` `change` (camera-distance Δ > 0.1 of initial), OR 5 s timeout, OR Skip.
   - On dismiss: write `localStorage.setItem('viz.onboarded.v1', '1')`. Done.

### Storage

- Key: `viz.onboarded.v1` — string `'1'` once complete.
- Versioned (`v1`) so we can ship a new tour after major UX changes by checking for `viz.onboarded.v2` instead.
- Per-domain (localStorage) — no server sync needed.
- "Show tutorial again" button in About / Help dialog → `localStorage.removeItem('viz.onboarded.v1')` and reload viewer.

### Accessibility

- Each hint: `role="status"` (NOT `role="dialog"` — must not trap focus).
- Each hint has a "Skip tour" button (visible, ≥ 44 px target).
- All copy translatable (id/en) — check for project i18n setup before ship.
- Hints honor `prefers-reduced-motion`: pulse animation disabled, replaced with a static dot + text.

---

## Section 5 — Concrete component spec

The label-in-panel and the highlightable mesh in the 3D scene must share state through a single `<ViewerSelectionProvider>` context. This section sketches the API.

### `ViewerSelectionProvider` (context)

```tsx
// src/app/components/viewer/ViewerSelectionContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

type SelectionState = {
  hoveredId: string | null;
  pinnedId: string | null;
  setHovered: (id: string | null) => void;
  setPinned: (id: string | null) => void;
  clear: () => void;
};

const Ctx = createContext<SelectionState | null>(null);

export function ViewerSelectionProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHovered] = useState<string | null>(null);
  const [pinnedId, setPinned] = useState<string | null>(null);
  const clear = () => {
    setHovered(null);
    setPinned(null);
  };
  return (
    <Ctx.Provider value={{ hoveredId, pinnedId, setHovered, setPinned, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useViewerSelection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useViewerSelection must be inside ViewerSelectionProvider');
  return ctx;
}
```

### `<HighlightablePart>` (3D side)

Wraps a `THREE.Mesh` (imperative — fits this repo's `useThreeScene` style). Use it inside the `useEffect` that builds geometry.

```ts
// src/app/components/viewer/HighlightablePart.ts
import * as THREE from 'three';

export interface HighlightablePartOptions {
  /** Stable identifier — must match AnnotationLabel.id */
  id: string;
  /** Human-readable name (used by screen reader) */
  name: string;
  /** Optimal camera pose for fly-to (P6) */
  camera?: { position: [number, number, number]; lookAt: [number, number, number] };
  /** The actual mesh to register */
  mesh: THREE.Mesh | THREE.Group;
}

export interface HighlightablePartHandle {
  id: string;
  setState(state: 'idle' | 'hover' | 'pinned' | 'dimmed'): void;
  /** Bounding box for the imperative outline pass */
  getBoundingBox(): THREE.Box3;
  /** Cleanup on unmount */
  dispose(): void;
}

export function registerHighlightablePart(
  opts: HighlightablePartOptions,
  outlinePass: import('three/addons/postprocessing/OutlinePass.js').OutlinePass,
): HighlightablePartHandle {
  // Tag userData so raycaster handler can find it
  opts.mesh.traverse((o) => {
    o.userData.partId = opts.id;
    o.userData.partName = opts.name;
  });

  const originalMaterials = new WeakMap<THREE.Mesh, THREE.Material>();
  let currentState: 'idle' | 'hover' | 'pinned' | 'dimmed' = 'idle';

  return {
    id: opts.id,
    setState(state) {
      currentState = state;
      // pinned + hover → add to outline pass selection
      if (state === 'pinned' || state === 'hover') {
        if (!outlinePass.selectedObjects.includes(opts.mesh)) {
          outlinePass.selectedObjects.push(opts.mesh);
        }
      } else {
        outlinePass.selectedObjects = outlinePass.selectedObjects.filter(
          (o) => o !== opts.mesh,
        );
      }
      // dimmed → opacity 0.25
      opts.mesh.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const mat = o.material as THREE.Material;
        if (state === 'dimmed') {
          mat.transparent = true;
          mat.opacity = 0.25;
        } else {
          mat.opacity = 1;
        }
      });
    },
    getBoundingBox() {
      return new THREE.Box3().setFromObject(opts.mesh);
    },
    dispose() {
      outlinePass.selectedObjects = outlinePass.selectedObjects.filter(
        (o) => o !== opts.mesh,
      );
      // material/geometry disposal handled by parent viewer (HARD RULE)
    },
  };
}
```

### `<AnnotationLabel>` (2D / panel side)

Pure React. Subscribes to the selection context and renders the four states (P5).

```tsx
// src/app/components/viewer/AnnotationLabel.tsx
import { useViewerSelection } from './ViewerSelectionContext';
import { X } from 'lucide-react';

export interface AnnotationLabelProps {
  /** Stable identifier — must match HighlightablePart.id */
  id: string;
  /** Display name — same string as HighlightablePart.name */
  name: string;
  /** Optional subtitle (thickness, material code) */
  subtitle?: string;
  /** Optional fly-to: parent viewer wires this up */
  onFlyTo?: (id: string) => void;
}

export function AnnotationLabel({ id, name, subtitle, onFlyTo }: AnnotationLabelProps) {
  const { hoveredId, pinnedId, setHovered, setPinned, clear } = useViewerSelection();

  const state =
    pinnedId === id
      ? 'pinned'
      : hoveredId === id
        ? 'hover'
        : pinnedId
          ? 'dimmed'
          : 'idle';

  const stateClasses = {
    idle: 'border-border bg-background text-foreground',
    hover: 'border-foreground bg-accent text-foreground',
    pinned: 'border-foreground bg-foreground text-background',
    dimmed: 'border-border bg-background text-foreground opacity-50',
  } as const;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={state === 'pinned'}
      aria-describedby={subtitle ? `${id}-sub` : undefined}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(id)}
      onBlur={() => setHovered(null)}
      onClick={() => {
        const willPin = pinnedId !== id;
        setPinned(willPin ? id : null);
        if (willPin) onFlyTo?.(id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).click();
        }
        if (e.key === 'Escape') clear();
      }}
      className={[
        'flex items-center justify-between gap-2 border p-2 cursor-pointer',
        'min-h-[44px]', // WCAG 2.5.5
        'transition-[background-color,border-color,opacity]',
        'duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2',
        stateClasses[state],
      ].join(' ')}
      style={{ borderRadius: 0 }} // MONO theme HARD RULE
    >
      <div className="flex flex-col">
        <span className="text-xs font-mono uppercase tracking-wide">{name}</span>
        {subtitle && (
          <span id={`${id}-sub`} className="text-[10px] opacity-70">
            {subtitle}
          </span>
        )}
      </div>
      {state === 'pinned' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clear();
          }}
          aria-label={`Clear selection: ${name}`}
          className="h-6 w-6 inline-flex items-center justify-center hover:opacity-70"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
```

### Wiring at the viewer level

```tsx
// Inside FooAssembled3D:
<ViewerSelectionProvider>
  <div className="relative w-full h-full">
    <div ref={containerRef} className="w-full h-full" />
    <aside className="absolute right-4 top-4 w-72 max-md:hidden">
      {parts.map((p) => (
        <AnnotationLabel
          key={p.id}
          id={p.id}
          name={p.name}
          subtitle={p.subtitle}
          onFlyTo={(id) => flyToPart(parts.find((x) => x.id === id)!)}
        />
      ))}
    </aside>
    {isMobile && (
      <MobileBottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
        {parts.map((p) => (
          <AnnotationLabel key={p.id} id={p.id} name={p.name} subtitle={p.subtitle} onFlyTo={...} />
        ))}
      </MobileBottomSheet>
    )}
  </div>
</ViewerSelectionProvider>
```

The 3D side wires raycaster `pointermove` / `pointerdown` to `setHovered` / `setPinned` from the same context, achieving full bidirectional sync.

---

## Decision log (TL;DR for Item 2A)

Default values to ship in the first interaction-polish PR:

```ts
// src/app/lib/viz-interaction-tokens.ts (NEW)
export const VIZ_INTERACTION = {
  tooltipDelayMs: 400,
  longPressMs: 500,
  cameraFlyToMs: 350,
  panelAnimationMs: 250,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  highlightScaleFactor: 1.0, // outline-only, no scale
  dimOpacity: 0.25,
  minTouchTarget: 44,
  onboardingKey: 'viz.onboarded.v1',
} as const;
```

Reference these tokens from every viewer instead of magic numbers.
