# Live Context
# 3D Product Visualization Catalog

**Auto-Updated: 2026-05-27 22:07:20**
**Session: 9 (Kritik Empirical Audit + Critical Code Fixes)**

---

## Current State

### Project Status
```
Status: PRODUCTION READY
Phase: Documentation Complete
Next: Deployment to Cloudflare Pages
```

### Build Status
```
Bundle: 115 KB gzip (PASSING)
Chunks: 38 files
Modules: 1664 transformed
Build Time: ~5s
```

### Dev Server
```
URL: http://localhost:5175/
Status: RUNNING
Port: 5175 (5173-5174 occupied)
```

---

## Products Registry

### Active Products (0)
```typescript
// Auto-generated from src/app/products/index.ts
PRODUCTS = [
  'sandwich-radiasi',
  'curving',
  'hermetic-door',
  'pb-lead-door',
  'scrub-sink',
  'pass-box',
  'pacs-cabinet',
  'return-air-grille',
  'laf-system',
  'ceiling-panel',
  'xray-viewer',
  'surgical-control-panel',
  'hvac-system',
]
```

### Archived Products (0)
```typescript
ARCHIVED = [
  'sandwich-standard',  // Same viewer as radiasi
  'cleanroom',          // Same viewer as radiasi
]
```

---

## Viewer Registry

### Component Mapping
```
panel           → AssembledPanel3D, ExplodedPanel3D
curving         → CurvingAssembled3D, CurvingExploded3D
hermetic-door   → HermeticDoorAssembled3D, HermeticDoorExploded3D
pb-lead-door    → PbLeadDoorAssembled3D, PbLeadDoorExploded3D
scrub-sink      → ScrubSinkAssembled3D, ScrubSinkExploded3D
pass-box        → PassBoxAssembled3D, PassBoxExploded3D
pacs-cabinet    → PacsCabinetAssembled3D, PacsCabinetExploded3D
return-air-grille → ReturnAirGrilleAssembled3D, ReturnAirGrilleExploded3D
laf-system      → LafSystemAssembled3D, LafSystemExploded3D
ceiling-panel   → CeilingPanelAssembled3D, CeilingPanelExploded3D
xray-viewer     → XrayViewerAssembled3D, XrayViewerExploded3D
surgical-control-panel → SurgicalControlPanelAssembled3D, SurgicalControlPanelExploded3D
hvac-system     → HvacSystemBIM3D (custom)
```

---

## Key Files Map

### Core Systems
| File | Lines | Purpose |
|------|-------|---------|
| `src/app/lib/three-scene.ts` | ~900 | Three.js engine |
| `src/app/data/viewerRegistry.ts` | ~200 | Component mapping |
| `src/app/data/lazyViewerRegistry.ts` | ~150 | Lazy loading |
| `src/app/products/index.ts` | ~100 | Product registry |

### Entry Points
| File | Purpose |
|------|---------|
| `src/main.tsx` | React entry |
| `src/app/App.tsx` | Main container |
| `src/styles/index.css` | Global styles |

### Theme Files
| File | Purpose |
|------|---------|
| `src/styles/theme.css` | MONO theme variables |
| `src/styles/fonts.css` | JetBrains Mono |

---

## Current Issues

### Active Issues (0)
```
No critical issues at this time.
```

### Known Workarounds (1)
```
Issue: Windows dist/ folder locked
Workaround: npx vite build --outDir dist-new
Impact: Low
Doc: HANDOFF.md#54
```

---

## Session History

### Session 9 (Current) — Kritik Empirical Audit + Critical Code Fixes
- **Date:** 2026-05-24
- **Focus:** Empirical audit kritik v1-v5 + execute remaining demands + B1/B2/F1 codebase audit fixes
- **Changes:**
  - Created `arahan-baru/kritik_status_2026-05-24.md` (line-per-line audit, 57/90 DONE)
  - Cleanup `WastafelScrub.jsx` duplicate + archive `HvacSystemBIM3D_V7_COMPLETE.tsx` (regression risk)
  - SUPERSEDED banner di 6 kritik file lama
  - PbLead: 6 continuity annotations 3D (lead continuity narrative auditable)
  - PbLead: open/close 90° scenario mode dengan ease-in-out cubic 900ms
  - ScrubSink specs: flow rate, temp range, anti-scald TMV, IR sensor numerical
  - B1 fix: capture `container` local di 4 viewer cleanup closure
  - B2 fix: `SHARED_MATERIAL_SENTINEL` symbol guard di `lib/materials.ts` + `disposeScene`
  - F1 cleanup: hapus orphan `ProductViewer.tsx` + `viewerRegistry.ts` (zero importers)
  - Sidebar regression: `Peralatan Medis` + `Peralatan Kontrol` masuk `CATEGORY_ORDER` (X-Ray + Surgical visible lagi)
  - Pre-existing bug: `stopRender?.()` salah pakai `{stop, invalidate}` return — fixed di 4 viewer
  - 7 screenshots verify, zero `pageerror`, build green 5.6-6.2s

### Session 6
- **Date:** 2026-05-19
- **Focus:** Documentation
- **Changes:**
  - Created PRD.md (411 lines)
  - Created SRD.md (628 lines)
  - Created MEMORY.md (408 lines)
  - Created HANDOFF.md (560 lines)
  - Created INDEX.md (navigation)
  - Created CONTEXT.md (this file)

### Session 5
- **Date:** 2026-05-18
- **Focus:** HVAC Mobile Overhaul
- **Changes:**
  - Mobile drawer for HVAC
  - Responsive fixes
  - Camera animation utility

### Session 4
- **Date:** 2026-05-18
- **Focus:** Product Cleanup
- **Changes:**
  - Archived duplicate products
  - Removed AI slop (em-dash)
  - Mobile responsive fixes

### Session 3
- **Date:** 2026-05-18
- **Focus:** Performance Optimization
- **Changes:**
  - Lazy loading implementation
  - Code splitting
  - Bundle size reduction (275KB → 115KB)

---

## Pending Tasks

### High Priority
```
[ ] Deploy to Cloudflare Pages
    - Build: npx vite build --outDir dist-new
    - Preview: npx vite preview --outDir dist-new
    - Deploy: Connect to CF Pages
```

### Medium Priority
```
[ ] Integrate with Astro catalog
[ ] Add performance monitoring
[ ] Mobile drawer refinement
```

### Low Priority (Future)
```
[ ] AR mode (WebXR)
[ ] Multi-language support
[ ] Product comparison mode
```

---

## Performance Metrics

### Bundle Sizes (gzip)
```
Initial Load:
├── index.js      : 46 KB
├── react-vendor  : 43 KB
├── three-core    : 139 KB (cached after first load)
├── three-addons  : 6 KB
├── lucide        : 4 KB
└── TOTAL INITIAL : 115 KB

On-Demand (per viewer):
├── Smallest      : 0.8 KB (CurvingAssembled3D)
├── Largest       : 22 KB (HvacSystemBIM3D)
└── Average       : 5 KB
```

### Runtime Performance
```
Target FPS       : 60
Current FPS      : 60 (stable)
Memory Usage     : 200-400 MB
Draw Calls       : 50-100 per frame
```

---

## Configuration

### Environment
```
Node.js  : v20+
npm      : v10+
Platform : Windows
Browser  : Chrome/Firefox latest
```

### Build Config
```typescript
// vite.config.ts
{
  target: 'esnext',
  minify: 'esbuild',
  sourcemap: false,
  manualChunks: {
    'three-core': ['three'],
    'react-vendor': ['react', 'react-dom'],
    'lucide': ['lucide-react'],
  }
}
```

### Theme Config
```css
/* theme.css */
--background: 0 0% 100%;
--foreground: 0 0% 4%;
--muted: 220 9% 46%;
--accent: 210 20% 96%;
--border: 214 32% 91%;

/* MONO: All border-radius: 0 */
/* Font: JetBrains Mono */
```

---

## Quick Reference

### Commands
```bash
npm run dev                    # Start dev server
npx vite build --outDir dist-new  # Build
npx vite preview --outDir dist-new  # Preview
```

### Key Paths
```
Products: src/app/products/
Viewers: src/app/components/
Registry: src/app/data/viewerRegistry.ts
Theme: src/styles/theme.css
Docs: docs/
```

### Important Dimensions
```
Scale: 1 unit = 10mm
Mobile breakpoint: 640px (sm)
Touch target min: 44x44px
```

---

## Cross-References

| Want to know... | See... |
|-----------------|--------|
| Product specs | [PRD.md#3](./PRD.md#3-product-scope) |
| Architecture | [SRD.md#1](./SRD.md#1-system-overview) |
| Past decisions | [MEMORY.md#2](./MEMORY.md#2-key-decisions-log) |
| How to deploy | [HANDOFF.md#4.4](./HANDOFF.md#44-deploy-to-cloudflare-pages) |
| All documents | [INDEX.md](./INDEX.md) |

---

## Auto-Update Triggers

This file should be updated when:
1. New product added/removed
2. New session started
3. Build configuration changed
4. Dependencies updated
5. Critical issue found/fixed

---

*Last sync: Session 6 - 2026-05-19*
