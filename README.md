# 3D Product Visualization

Industrial-grade interactive 3D catalog for medical equipment and modular operating theatre products. Built with Three.js WebGL, React 18, and TypeScript.

---

## Quick Start

```bash
npm install
npm run dev       # → http://localhost:5175
```

**Production build:**
```bash
npx vite build --outDir dist-new
npx vite preview --outDir dist-new
```

---

## Product Catalogue

| Category | Products |
|---|---|
| **Wall Panel** | Sandwich Radiasi |
| **Profile** | Curving R40 |
| **Doors** | Hermetic Door · PB Lead Door |
| **Fixtures** | Scrub Sink · Pass Box |
| **Cabinets** | PACS Cabinet |
| **HVAC** | Return Air Grille · LAF System · HVAC BIM |
| **Ceiling** | Ceiling Panel |
| **Medical** | X-Ray Viewer · Surgical Control Panel |

**17 products** — assembled and exploded views with multiple camera presets per product.

---

## Features

- **Assembled View** — complete product visualization in assembled state
- **Exploded View** — component-level breakdown with leader lines and annotations
- **Highlight System** — hover-to-highlight on individual product components
- **Camera Presets** — front, side, top, isometric views per product
- **Open-90 Pattern** — interactive door opening animation for applicable products
- **PNG Export** — high-resolution screenshot of current viewport
- **Lazy Loading** — on-demand viewer code-splitting (~1–22 KB per viewer)
- **Mobile Optimized** — bottom-sheet overlay with snap points for touch devices
- **PBR Materials** — physically based rendering with environment lighting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | React 18 with TypeScript |
| 3D Engine | Three.js (WebGL renderer) |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui primitives |
| Animation | React Spring · GSAP |
| Code Quality | ESLint · Prettier |

---

## Project Structure

```
src/
├── app/
│   ├── components/          # 3D viewer components per product
│   ├── products/            # Product definitions and metadata
│   ├── data/                # Registry, lazy-load routes, viewer map
│   ├── hooks/               # useThreeScene, useHighlightController
│   ├── lib/                 # three-scene utils, camera presets, PNG export
├── styles/                  # Tailwind theme configuration
public/
├── models/                  # glTF/GLB 3D assets
├── textures/                # PBR texture maps
docs/
├── CONTEXT.md               # Live project state (auto-updated)
├── PRD.md                   # Product requirements
├── SRD.md                   # System reference design
├── research/                # Per-product research notes with datasheet references
.opencode/
├── session-handoffs/        # Context persistence across sessions
├── skills/                  # Project-local agent skills
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/INDEX.md](docs/INDEX.md) | Navigation hub — start here |
| [docs/CONTEXT.md](docs/CONTEXT.md) | Auto-updated live state, recent changes, open tasks |
| [docs/PRD.md](docs/PRD.md) | Product requirements document |
| [docs/SRD.md](docs/SRD.md) | System reference design and architecture |
| [docs/MEMORY.md](docs/MEMORY.md) | Project context and history |
| [docs/HANDOFF.md](docs/HANDOFF.md) | Developer onboarding and handoff guide |
| [CHANGELOG.md](CHANGELOG.md) | Full commit history |

---

## Performance

| Metric | Value |
|---|---|
| Initial Load | ~120 KB gzipped |
| Per-Viewer (on-demand) | 1–22 KB |
| Target FPS | 60 |
| WebGL Contexts | 1 active, disposed on unmount |
| Pixel Ratio Cap | 2 (performance cap) |

---

## Development

```bash
npm run dev          # development server
npm run build        # production build
npm run preview      # preview production build
node docs/sync-context.js   # update CONTEXT.md
```

Visual inspection scripts live at the repo root as `verify-*.cjs` files.

---

## Browser Support

Chrome 90+ · Firefox 88+ · Safari 14+ · Edge 90+. WebGL 1.0 required.

---

## Recent Commits

| SHA | Description |
|---|---|
| `442a026` | Session 11 Item 1: Hermetic Door fix — recessed pull, housing right-size, exploded sync |
| `ed14bd1` | Session 11 Item 3: PB Lead Door fix — closer position, wall removal, exploded sync |
| `68b6215` | Session 11 Item 6 followup: ScrubSink real-product alignment (research-driven) |
| `589ad43` | Session 11 Item 6: ScrubSink — 3 visual bugs + 2 polish details |
| `fa747c8` | Session 10 Item 4: X-Ray Viewer rebuild (research-driven negatoscope) |
| `70bf146` | Session 10 Item 3: PbLead Door rebuild (wall + stray bar removed, exploded full-component) |

Full history in [CHANGELOG.md](CHANGELOG.md).

---

*Last updated: 2026-05-26*
