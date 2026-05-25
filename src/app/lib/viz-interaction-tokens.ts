/**
 * viz-interaction-tokens.ts — Centralised interaction tokens.
 *
 * Single source of truth for all timing / opacity / scale magic numbers
 * across the 17 viewer files. UX research source:
 *   docs/research/2026-05-24-3d-viewer-ux-patterns.md
 *
 * Update tokens HERE, not inline. If a viewer needs a custom value,
 * derive it from these (e.g. `TOKENS.dim.opacity * 0.5`) — never hardcode.
 *
 * ─────────────────────────────────────────────────────────────────────
 */

/* ── Animation timing (milliseconds) ─────────────────────────── */
export const DURATION = {
  /** Highlight/dim swap (mesh emissive boost, scale tween, opacity drop). */
  highlight: 250,
  /** Camera fly-to when clicking a label or annotation. */
  cameraFly: 350,
  /** Tab transition (assembled ↔ exploded). */
  tabSwap: 300,
  /** Scenario animation (door open, drawer slide, etc). Default. */
  scenarioDefault: 750,
  /** Tooltip reveal delay (hover before tooltip appears). */
  tooltipDelay: 400,
  /** Coachmark step. */
  coachmark: 500,
  /** Long press duration on touch device to "pin" a part. */
  longPressMobile: 600,
  /** Throttle for raycasting on pointermove (33ms ≈ 30fps). */
  raycastThrottle: 33,
} as const;

/* ── Easing curves (cubic-bezier strings + JS easing fns) ───── */
export const EASING_CSS = {
  /** Material standard — most general purpose. */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Decelerate (entry). */
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Accelerate (exit). */
  in: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

/** JS-side easing — t in [0,1], returns eased [0,1]. Pure functions, no allocations. */
export const EASE = {
  outCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number): number => 1 - Math.pow(1 - t, 4),
  inOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
} as const;

/* ── Highlight visual tokens ─────────────────────────────────── */
export const HIGHLIGHT = {
  /** Emissive intensity boost when a part is highlighted. */
  emissiveIntensity: 0.35,
  /** Mesh scale-up factor when highlighted (subtle — don't break layout). */
  scale: 1.04,
  /** Outline color when using stroke-based highlight (CSS labels & optional 3D outline). */
  strokeColor: '#0ea5e9',
} as const;

/* ── Dim visual tokens (other parts, when one is highlighted) ─ */
export const DIM = {
  /** Material opacity for non-highlighted parts. 0.22-0.28 range tested OK. */
  opacity: 0.25,
  /** Whether to also desaturate (HSL trick). Skip — too perf-heavy on mobile. */
  desaturate: false,
} as const;

/* ── Touch / pointer rules ───────────────────────────────────── */
export const TOUCH = {
  /** Minimum touch target (px). WCAG 2.5.5 Level AAA. */
  targetMin: 44,
  /** Tap-to-pin tolerance (px) — fingers wobble. */
  tapTolerance: 10,
} as const;

/* ── A11y / reduced motion ───────────────────────────────────── */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isCoarsePointer(): boolean {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(pointer: coarse)').matches;
}

/* ── Z-index layers (must match Tailwind z-* utilities) ──────── */
export const Z_INDEX = {
  canvas: 0,
  labels: 10,
  controls: 20,
  tooltip: 30,
  modal: 50,
  coachmark: 60,
} as const;

/* ── ARIA / focus-ring ───────────────────────────────────────── */
export const FOCUS_RING_CLASS =
  'outline-none ring-2 ring-offset-2 ring-sky-500 ring-offset-background';
