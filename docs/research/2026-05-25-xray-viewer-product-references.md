# X-Ray Film Viewer LED — Product Research (2026-05-25)

Research goal: rebuild `XrayViewerAssembled3D.tsx` + `XrayViewerExploded3D.tsx`
to actually look like a real medical X-ray film viewer / negatoscope (LED
double-bay, side-lit, slim, wall-mounted), not a random pile of boxes.

User feedback that triggered this: *"ini exray viewer entah apa gak ngerti
sumpah, kayaknya kau salah buat deh, ini kacau. perbaiki lagi reseach yang
bener. pastikan itu untuk asembled dan exploded"*.

Source images / reference pages (verified via 9router exa.search +
fetch-combo-1, 2026-05-25):

## 1. MEDIK Surgical — YA-NS02D 2-SCREEN LED X-ray Film Viewer
- URL: <https://www.mediksurgical.com/negatoscope/2-screen-x-ray-film-viewer.html>
- Image: <https://www.mediksurgical.com/data/watermark/20250719/687b3b7f74d22.jpg>
- **External**: 810 × 500 × 25 mm  ← **slim profile, side-lit, NOT 29mm thick**
- Viewing area: 720 × 420 mm (combined, 2 panels side by side, no big gap)
- Max readable film: 17 × 14 in (355.6 × 431.8 mm) per panel
- Power: 60 W max
- Light: side-lit SMD LED (144 pcs/panel), 8000 K, >50,000 h
- Brightness: 0–4000 cd/m² adjustable
- Brightness uniformity: ≥ 90 %
- Voltage: 90–240 V AC, 50/60 Hz auto
- Construction: aviation-grade aluminum frame + ABS rear, edge-lit
  light-guide plate behind acrylic diffuser
- UI: digital dimming (9 brightness levels), per-panel brightness memory,
  delay-off, auto film-insert sensor
- Film attach: silicone film clips
- Mounting: wall **or** desktop bracket

## 2. Rooe Medical — AOT-1D Negatoscope LED X-Ray Illuminator
- URL: <https://www.rooemed.com/products/operating-room-equipment/led-film-viewer/negatoscope-led-x-ray-illuminator-price/>
- Image: <https://www.rooemed.com/uploads/image/605016b12eda3.png>
- Same family of designs (single, double, triple, quad). Confirms:
  - 25 mm slim depth ("aero profile + ABS")
  - 4 mm acrylic light-guide plate side-lit
  - PWM digital dimming
  - 2-digit display + 9-position button strip on right side
  - Auto-on via film-insertion sensor
  - LED life ~50–60 k h
  - Bulk of body = thin frame (no deep enclosure)

## 3. Mplent ZG-2 — Backlit LED Film Viewer (2-screen)
- URL: <https://en.mplent.com/products/backlit-led-film-viewer-152.html>
- **External**: 840 × 502 × 38 mm
- Viewing: 720 × 420 mm
- LEDs: 780 SMD per pair, 8000 K, > 50 k h
- Brightness: up to 6000 cd/m², uniformity > 90 %
- Acrylic diffuser + acrylic light-guide plate
- 1.77 in colour LCD readout + 100-step dimming buttons
- Silicone film-clip strip across the top of each panel
- Wall-bracket OR desktop installation
- PWM digital dimming, brightness memory, delay-off

## Convergent product spec (used to drive 3D)

| Feature             | Spec                                                         |
| ------------------- | ------------------------------------------------------------ |
| External (W×H×D)    | ~820 × 500 × 30 mm  (we use **820 × 500 × 30 mm** = 82×50×3) |
| Viewing area total  | ~720 × 420 mm (2 panels side-by-side, narrow vertical bar)   |
| Single panel        | ~355 × 420 mm                                                |
| Frame style         | Slim aluminium border ~25–30 mm wide, brushed/anodized       |
| Diffuser            | White acrylic, frameless, slightly recessed into front       |
| LED placement       | **Side-lit** behind diffuser (NOT a back-mounted matrix)     |
| Light-guide plate   | 4 mm acrylic, behind diffuser                                |
| Film clips          | 4–6 silicone clips along top edge of each panel              |
| Control panel       | Right side: power button, 2-digit display, brightness ▲▼     |
| Indicator           | Power LED (green) on right strip                             |
| Mounting            | Wall-bracket on rear (hidden), or desk bracket (legs)        |
| Rear / housing      | Slim ABS plate, ventilation slots, AC inlet at bottom        |
| Power               | 30–60 W, AC 100–240 V, 50/60 Hz                              |
| Color temperature   | 8000 K (some 5500–9000 K)                                    |

## Geometry decisions for the 3D rebuild

- **Coordinate system**: keep repo convention — `1 unit = 10 mm`,
  Z-up world (this repo lays things on the X–Y plane, frontal axis = +Z).
  Existing code already uses (X = width, Y = height, Z = depth out of wall).
  Re-use that.
- **Total**: `82 × 50 × 3` units = 820 × 500 × 30 mm.
- **2 panels**: each `38 × 42` units (380 × 420 mm), centred horizontally,
  separated by a thin **vertical** divider strip (≈ 15 mm).
  → This is the key fix vs the old code, which stacked them VERTICALLY.
- **Frame border**: 2.5 units (25 mm) all around, with a 0.5-unit lip
  recessed into the front so the diffuser sits flush, not protruding.
- **LED edge bars**: side-lit — two thin emissive strips top + bottom of
  each panel sandwiched between the frame and the light-guide plate.
- **Film clips**: 5 small silicone clips at the top of each panel, slightly
  proud of the diffuser.
- **Control panel**: a small recessed strip on the right side of the front
  frame, ~6 × 30 units, with 4 buttons + a 2-digit "display" rectangle +
  power LED dot.
- **Wall mount**: VESA-style backplate hidden behind the unit + 2 hanging
  hooks at the top.
- **Power inlet**: small rectangular IEC port cutout at bottom-rear-right.

## Part IDs (for `userData.partId` highlight system)

Final list, group-level (PbLead pattern):

1. `frame`             — aluminium border (top/bottom/left/right strips + corner bevel)
2. `diffuser-left`     — left acrylic panel (white, faintly emissive)
3. `diffuser-right`    — right acrylic panel
4. `divider`           — thin vertical bar between the 2 panels
5. `led-edge`          — side-lit LED strips behind diffuser (top + bottom of each panel)
6. `film-clips`        — silicone clip cluster at top of each panel
7. `control-panel`     — right-side button strip (buttons + display + power LED)
8. `back-housing`      — slim ABS rear plate + vent slots + IEC inlet
9. `wall-bracket`      — VESA backplate + 2 hanging hooks (hidden when assembled)

## Open / deferred items

- No 1.77 in colour LCD: we model the readout as a flat black rectangle
  with a faint cyan emissive tint — close enough at this LOD.
- No actual film inserted in the assembled view — we keep the panel pure
  white with a subtle warm emissive tint to suggest "powered on".
- Camera presets retuned in `xray-viewer.ts` because old presets aimed at
  a tall (50 W × 50.3 H) shape; new shape is wide (82 × 50).
