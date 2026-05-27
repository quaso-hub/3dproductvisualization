# Surgical / Operating Room Control Panel — Product References

**Date:** 2026-05-25
**Purpose:** Drive the rebuild of `SurgicalControlPanelAssembled3D.tsx` and
`SurgicalControlPanelExploded3D.tsx`. The previous version rendered a blank
canvas because front-glass was opaque and geometry sat outside the camera
frustum. This doc fixes the dimensional/spatial ground truth so the rebuild
can't drift again.

> Web search was unavailable during this session (9Router sandbox not connected).
> The references below are drawn from prior product-research notes in this repo,
> the user's product brief (Elfatech 15.6" Surgical Control Panel Touchscreen,
> Modbus TCP/IP), and well-known catalog products in the OR control panel space.
> When live search becomes available, top up the **External References** list.

---

## 1. Real Product — What it actually is

A **wall-mounted touchscreen control panel** that sits inside the operating
room (usually next to the surgeon, anaesthetist station, or doorway) and lets
staff drive OR infrastructure: HVAC setpoints, surgical & ambient lighting,
medical gas alarms, door interlock status, music, suction, x-ray viewer,
clock / case timer, and gas pendant timer.

It's a **single touchscreen + thin bezel + a few hardware buttons**, NOT a
multi-screen video wall and NOT a deep equipment cabinet. Depth is short
(50–80 mm) because everything heavy lives behind the wall in a recessed back-
box. The visible product is essentially "a wall plate with a screen on it".

### Brand examples (real-world catalog)

| Brand | Product | Notes |
|---|---|---|
| Maquet (Getinge) | Tegris OR Integration | 15"–24" touchscreen, recessed wall mount |
| Trumpf | TruSystem 2000 / 6000 surgical control | Slim glass-front panel, ambient lighting button row |
| Skytron | OR Integration Wall Panel | Wall-flush, single touch, status LEDs at top |
| Mediray | OR Theatre Control Panel | Stainless steel housing, IP54, 15.6" LCD |
| Dräger | OR.Net Control Touchpanel | 15"–22", glass front |
| Elfatech (this client) | Surgical Control Panel Touchscreen 15.6" Modbus | Stainless steel, IP54, wall-recessed mount |

---

## 2. Form factor & dimensions (the ones that matter for the model)

```
TOTAL HOUSING (visible front panel) :  ~450 × 350 × 60 mm
SCREEN ACTIVE AREA (15.6" 16:9)     :  ~345 × 195 mm  (true 15.6" diagonal)
SCREEN BEZEL (black border)          :  ~10 mm strip around active area
PANEL FRONT FACE (stainless steel)   :  brushed SS 304, sub-2 mm clearcoat
PHYSICAL BUTTON ROW                  :  vertical strip on RIGHT side
   • Reset (momentary)               :  ~14 mm Ø
   • Menu  (momentary)               :  ~14 mm Ø
   • Status LEDs (PWR / NET / ERR)    :  3× 5 mm Ø, color: green / blue / red
EMERGENCY STOP                       :  red mushroom head, 30–40 mm Ø,
                                        twist-to-release, top-right corner
USB PORT BAY                          :  4× USB-A on bottom edge or hidden
                                        flap, recessed
AC INLET / NETWORK                   :  rear plate, IEC C14 + RJ45
WALL MOUNT                           :  back box recessed in drywall +
                                        flange overlapping wall opening
IP RATING                            :  IP54 (front face only)
```

**Critical proportions:**

- Front face is **landscape** (wider than tall).
- Screen is offset slightly **left** of panel center to leave room for the
  vertical hardware-button strip on the right.
- Emergency stop button physically intrudes ABOVE the panel face — its
  mushroom head sits proud by about 25 mm so a gloved hand can slap it.
- Front-face material is brushed stainless steel — NOT painted, NOT plastic.
- Black bezel around the LCD is glossy plastic, ~10 mm wide on all four sides.
- Status LEDs are tiny — they read as colored dots, not buttons.

---

## 3. Coordinate system for our 3D model

```
X = width  (left/right when viewer looks at panel)
Y = height (up/down)
Z = depth  (out of wall toward viewer; +Z = front)
1 unit = 10 mm
```

Total housing: **45 × 35 × 6** units (450 × 350 × 60 mm).
Screen visible area: **34.5 × 19.5** units (16:9).

Center the housing at world origin. The screen front-face sits at
+Z = 0.4 (slightly proud of the SS housing front), the LCD UI plane sits
just behind it at +Z = 0.32.

---

## 4. Fix list — what was wrong before

The previous rebuild went broken because:

1. **Camera framing missed the geometry.** Old `centerY = PANEL_H/2 = 25`
   meant geometry sat at world Y = 25 with `screenCenterY` offsets stacked
   on top, but `cameraStart = [120, 90, 150]` and `target = [0, 25, 0]`
   were trying to look at a point that became displaced once `y` accumulated
   through nine layers. Net effect: scene rendered, but nothing fell inside
   the camera frustum.

2. **Front glass was 95 % opaque (`opacity: 0.95`) over a black material
   (`color: 0x0a0a0a`)** sitting in front of the LCD. Even when the
   geometry was framed, the front face was a black slab. The annotations
   were drawn correctly because they're in CSS2D space, not 3D — that's
   why we saw labels but no panel.

3. **Coordinate axis confusion.** Old code used Y as depth in some places
   (`housingY`, `psuY`, `lcdY`) and Z as depth in others (`btnZ`, screen
   placement). The mental model fought itself. Our standard repo convention
   (PbLead, Hermetic, Xray, Scrub-sink) is `Z = depth toward viewer`.
   We will use that consistently.

4. **No grouping by partId.** The old assembled file added meshes directly
   to `scene` with no `userData.partId` tags, so highlight controller had
   nothing to dim. We will use the group-level partId pattern proven in
   PbLead and Xray Item-4 rebuild.

---

## 5. Part-id structure for the rebuild

| partId | What it is | Section purpose |
|---|---|---|
| `housing` | Stainless steel front face plate (with screen aperture cut-out) | Hero industrial reading |
| `screen-bezel` | Black glossy plastic ring around active LCD area | Real product detail |
| `screen` | 15.6" IPS LCD panel + emissive UI mock | The thing you actually look at |
| `emergency-stop` | Red mushroom button + chrome ring, top-right corner | Safety hero element |
| `physical-buttons` | Reset + Menu momentary buttons, right strip | Hardware controls |
| `status-leds` | 3 LED dots (green PWR / blue NET / red ERR) | Operating-status detail |
| `usb-ports` | 4× USB-A bay, bottom edge, recessed | I/O detail |
| `mounting-plate` | Back plate (recessed wall box) | Install context |
| `brand-label` | Etched plate "Smart Control" / model number | Brand detail |
| `power-cord-port` | IEC C14 + RJ45 jack, rear lower edge | Connectivity |

Each of the 10 entries is a `THREE.Group` with `userData.partId` set on the
group, so `useHighlightController` can dim sibling groups when one is
hovered (proven pattern from PbLead / Xray Item 4).

---

## 6. Visual reference — keywords to image-search later

- "Maquet Tegris OR control panel"
- "Trumpf TruSystem operating room control panel"
- "OR theatre touchscreen wall panel stainless"
- "operating room emergency stop mushroom button"
- "Modbus TCP touchscreen panel medical"
- "Skytron OR integration wall plate"

---

## 7. UI-mockup recommendation for the LCD

The previous file already has a 1024×576 canvas-texture that draws an
operating timer, temperature, humidity, HVAC status, medical gas, and
lighting controls. **That asset is good — we keep it.** It's exported as
`createUITexture()` and re-imported by the exploded view. We don't rewrite
it; we just stop drawing an opaque glass slab over it.

---

## 8. Deferred / out of scope (future iterations)

- True chamfered SS bezel via ExtrudeGeometry with bevel — current rebuild
  uses BoxGeometry plates because file size budget is ~400 LOC for assembled.
- Animated UI (LCD texture is static — would need RAF tick to refresh
  CanvasTexture; not worth the cost in this product's static-catalog context).
- Card-key reader / RFID coil (some real OR panels include one — we don't
  model it because Elfatech spec doesn't list it).
- Audio jack / microphone (catalog spec doesn't list, so omitted).

---

## 9. External references (to fill when live search returns)

- [ ] Maquet Tegris brochure PDF — dimensions table
- [ ] Trumpf TruSystem 2000 service manual — back-box mounting pattern
- [ ] Mediray OR control panel datasheet — IP54 gasket profile
- [ ] OR.NET / IEC 80001 reference architecture — connector layout
- [ ] Industry photo: red mushroom emergency-stop, IDEC XW1E series

---

**Status:** ground truth captured; ready to drive the rewrite.
