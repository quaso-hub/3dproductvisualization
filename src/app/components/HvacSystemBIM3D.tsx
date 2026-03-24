// src/app/components/HvacSystemBIM3D.tsx
// V7 — COPY PASTE SELURUH FILE INI. JANGAN MODIFIKASI APAPUN.
// Semua koordinat sudah dihitung manual dan verified.

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Product } from '../data/products';

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════

const BG    = 0xf0f4f8;
const CYAN  = 0x00bcd4;   // supply
const SALM  = 0xe57373;   // return
const AMBER = 0xffb74d;   // refrigerant
const TEAL  = 0x4db6ac;   // fresh air
const ORNG  = 0xffa726;   // exhaust
const GREY  = 0x6b7f8e;   // equipment
const DGREY = 0x455a64;   // dark equipment edge
const YELL  = 0xfdd835;   // HEPA filter
const BLUE  = 0x5b9bd5;   // building wireframe
const CYAN2 = 0x00e5ff;   // supply highlight
const RED2  = 0xff5252;   // return highlight
const AMB2  = 0xffd740;   // refrigerant highlight

type Mode = 'full' | 'supply' | 'return' | 'refrigerant' | 'plan' | 'exploded';

// Material bag — store direct refs to avoid traverse bugs
interface Bag {
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];  // direct refs, no traverse needed
  highlightColor: number | null;
  baseEmissive: number;
  explodedY: number;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export function HvacSystemBIM3D({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendRef      = useRef<THREE.WebGLRenderer | null>(null);
  const labelRRef    = useRef<CSS2DRenderer | null>(null);
  const camRef       = useRef<THREE.PerspectiveCamera | null>(null);
  const ctrlRef      = useRef<OrbitControls | null>(null);
  const sceneRef     = useRef<THREE.Scene | null>(null);
  const bags         = useRef<Record<string, Bag>>({});
  const rafRef       = useRef(0);

  const [mode, setMode] = useState<Mode>('full');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    sceneRef.current = scene;

    // ── Camera ─────────────────────────────────────────────
    const cam = new THREE.PerspectiveCamera(52, el.clientWidth / el.clientHeight, 0.05, 300);
    cam.position.set(14, 10, 14);
    camRef.current = cam;

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendRef.current = renderer;

    // ── CSS2D ──────────────────────────────────────────────
    const lr = new CSS2DRenderer();
    lr.setSize(el.clientWidth, el.clientHeight);
    lr.domElement.style.cssText = 'position:absolute;top:0;pointer-events:none;z-index:5;';
    el.appendChild(lr.domElement);
    labelRRef.current = lr;

    // ── Controls ───────────────────────────────────────────
    const ctrl = new OrbitControls(cam, renderer.domElement);
    ctrl.target.set(2, 1.5, 0);
    ctrl.enableDamping = true;
    ctrl.dampingFactor = 0.07;
    ctrl.minDistance = 2;
    ctrl.maxDistance = 70;
    ctrl.maxPolarAngle = Math.PI / 2 - 0.04; // ← Cegah kamera masuk lantai
    ctrl.update();
    cam.lookAt(ctrl.target);
    ctrlRef.current = ctrl;

    // ── Lights ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    const sun = new THREE.DirectionalLight(0xfff8f0, 0.88);
    sun.position.set(-10, 18, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 });
    sun.shadow.bias = -0.001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd0e8ff, 0.3);
    fill.position.set(10, 5, -8);
    scene.add(fill);

    // ── Build ──────────────────────────────────────────────
    buildScene(scene, bags.current);

    // ── Loop ───────────────────────────────────────────────
    let id: number;
    const tick = () => {
      id = requestAnimationFrame(tick);
      ctrl.update();
      renderer.render(scene, cam);
      lr.render(scene, cam);
    };
    tick();
    rafRef.current = id!;

    // ── Resize ─────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h);
      lr.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Initial mode ───────────────────────────────────────
    applyMode('full', bags.current, cam, ctrl);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
      el.removeChild(lr.domElement);
    };
  }, []);

  const doMode = useCallback((m: Mode) => {
    setMode(m);
    applyMode(m, bags.current, camRef.current, ctrlRef.current);
  }, []);

  const BTNS: { k: Mode; label: string; icon: string; active: string }[] = [
    { k: 'full',        label: 'Full System',  icon: '🏥', active: 'bg-sky-500 text-white' },
    { k: 'supply',      label: 'Supply Air',   icon: '❄️', active: 'bg-cyan-500 text-white' },
    { k: 'return',      label: 'Return Air',   icon: '🔄', active: 'bg-rose-400 text-white' },
    { k: 'refrigerant', label: 'Refrigerant',  icon: '🌡️', active: 'bg-amber-400 text-white' },
    { k: 'plan',        label: 'Floor Plan',   icon: '📐', active: 'bg-slate-500 text-white' },
    { k: 'exploded',    label: 'Exploded',     icon: '💥', active: 'bg-emerald-500 text-white' },
  ];

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Mode buttons */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
        {BTNS.map(b => (
          <button key={b.k} onClick={() => doMode(b.k)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium
              border shadow-sm backdrop-blur-sm transition-all duration-150
              ${mode === b.k ? `${b.active} border-transparent scale-105`
                : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <span style={{ fontSize: 12 }}>{b.icon}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/88 border border-slate-200
                      rounded-xl p-2.5 shadow text-[10px] backdrop-blur-sm">
        {([['bg-cyan-400','Supply Air'],['bg-rose-300','Return Air'],
           ['bg-amber-400','Refrigerant'],['bg-teal-400','Fresh Air OAI'],
           ['bg-orange-400','AGSS Exhaust'],['bg-yellow-300','HEPA H14']] as const)
          .map(([bg, lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <div className={`w-3.5 h-2 rounded-sm ${bg}`} />
            <span className="text-slate-600">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Mode chip */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20
                      bg-white/88 border border-slate-200 rounded-full px-4 py-1
                      text-xs font-medium text-slate-700 backdrop-blur-sm shadow">
        {BTNS.find(b => b.k === mode)?.icon} {BTNS.find(b => b.k === mode)?.label}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MODE CONTROLLER
// Menggunakan direct material refs — TIDAK pakai group.traverse
// Ini yang fix bug "komponen hilang saat balik ke full"
// ══════════════════════════════════════════════════════════════

// Opacity per system per mode. 0 = hidden, 1 = full.
const OPT: Record<string, Record<Mode, number>> = {
  building:    { full:.08, supply:.05, return:.05, refrigerant:.04, plan:0,   exploded:.05 },
  ahu:         { full:1,   supply:1,   return:1,   refrigerant:1,   plan:1,   exploded:1   },
  cdu:         { full:1,   supply:.15, return:.15, refrigerant:1,   plan:1,   exploded:1   },
  laf:         { full:1,   supply:1,   return:.2,  refrigerant:.15, plan:1,   exploded:1   },
  supplyDuct:  { full:.9,  supply:1,   return:.1,  refrigerant:.1,  plan:.9,  exploded:.9  },
  returnDuct:  { full:.85, supply:.1,  return:1,   refrigerant:.1,  plan:.85, exploded:.9  },
  refrigerant: { full:.85, supply:.1,  return:.1,  refrigerant:1,   plan:.85, exploded:.9  },
  freshAir:    { full:.85, supply:1,   return:.1,  refrigerant:.1,  plan:.85, exploded:.9  },
  exhaust:     { full:.8,  supply:.1,  return:.1,  refrigerant:.1,  plan:.8,  exploded:.9  },
  grilles:     { full:1,   supply:.15, return:1,   refrigerant:.15, plan:1,   exploded:1   },
  panel:       { full:1,   supply:.5,  return:.5,  refrigerant:.5,  plan:1,   exploded:1   },
  table:       { full:.7,  supply:.7,  return:.7,  refrigerant:.7,  plan:.7,  exploded:.7  },
};

// Emissive highlight color when system is active in a mode
const HLC: Record<string, Partial<Record<Mode, number>>> = {
  supplyDuct:  { supply: CYAN2 },
  laf:         { supply: CYAN2 },
  returnDuct:  { return: RED2 },
  grilles:     { return: RED2 },
  refrigerant: { refrigerant: AMB2 },
  freshAir:    { supply: 0x80cbc4 },
};

const CAM: Record<Mode, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
  full:        { pos: new THREE.Vector3(14,10,14),  tgt: new THREE.Vector3(2,1.5,0)  },
  supply:      { pos: new THREE.Vector3(7,7,11),    tgt: new THREE.Vector3(2,2.5,0)  },
  return:      { pos: new THREE.Vector3(-3,6,11),   tgt: new THREE.Vector3(1,1.8,0)  },
  refrigerant: { pos: new THREE.Vector3(12,5,3),    tgt: new THREE.Vector3(6,2.0,0)  },
  plan:        { pos: new THREE.Vector3(2,22,0.01), tgt: new THREE.Vector3(2,0,0)    },
  exploded:    { pos: new THREE.Vector3(14,16,14),  tgt: new THREE.Vector3(3,4,0)    },
};

function applyMode(
  mode: Mode,
  bags: Record<string, Bag>,
  cam: THREE.PerspectiveCamera | null,
  ctrl: OrbitControls | null
): void {
  if (!cam) return;

  Object.entries(bags).forEach(([key, bag]) => {
    const op = OPT[key]?.[mode] ?? 1;
    const hl = HLC[key]?.[mode] ?? null;

    // PENTING: selalu set group.visible = true dulu,
    // lalu kontrol via material opacity — ini fix bug hilang saat balik ke full
    bag.group.visible = true;

    // Direct material update — tidak pakai traverse
    bag.mats.forEach(mat => {
      mat.visible = op > 0.005;
      mat.transparent = op < 0.995;
      mat.opacity = op;
      mat.needsUpdate = true;

      if (hl !== null) {
        mat.emissive.setHex(hl);
        mat.emissiveIntensity = 0.4;
      } else {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });

    // Exploded: geser group Y
    const targetY = mode === 'exploded' ? bag.explodedY : 0;
    // Simple lerp tanpa GSAP
    moveGroupY(bag.group, targetY);
  });

  // Camera move
  const cfg = CAM[mode];
  lerpCam(cam, ctrl, cfg.pos, cfg.tgt);
}

function moveGroupY(group: THREE.Group, targetY: number): void {
  const start = group.position.y;
  const t0 = performance.now();
  const dur = 800;
  const tick = () => {
    const t = Math.min((performance.now() - t0) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    group.position.y = start + (targetY - start) * e;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function lerpCam(cam: THREE.Camera, ctrl: OrbitControls | null, to: THREE.Vector3, look: THREE.Vector3): void {
  const fp = cam.position.clone();
  const ft = ctrl ? ctrl.target.clone() : look.clone();
  const t0 = performance.now();
  const dur = 900;
  const tick = () => {
    const t = Math.min((performance.now() - t0) / dur, 1);
    const e = 1 - Math.pow(1 - t, 3);
    cam.position.lerpVectors(fp, to, e);
    if (ctrl) { ctrl.target.lerpVectors(ft, look, e); ctrl.update(); }
    else cam.lookAt(look);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ══════════════════════════════════════════════════════════════
// SCENE BUILDER
// ══════════════════════════════════════════════════════════════

function buildScene(scene: THREE.Scene, bags: Record<string, Bag>): void {
  // Floor grid
  const grid = new THREE.GridHelper(32, 32, 0xbccdd8, 0xd4e4ec);
  grid.position.set(2, 0, 0);
  scene.add(grid);

  buildBuilding(scene, bags);
  buildAHU(scene, bags);
  buildCDU(scene, bags);
  buildLAF(scene, bags);
  buildSupplyDucts(scene, bags);
  buildReturnDucts(scene, bags);
  buildReturnGrilles(scene, bags);
  buildRefrigerant(scene, bags);
  buildFreshAir(scene, bags);
  buildExhaust(scene, bags);
  buildTable(scene, bags);
  buildPanel(scene, bags);
}

// ────────────────────────────────────────────────────────────
// HELPER: membuat bag + group
// ────────────────────────────────────────────────────────────
function makeBag(
  key: string, scene: THREE.Scene, bags: Record<string, Bag>,
  explodedY = 0, highlightColor: number | null = null
): Bag {
  const group = new THREE.Group();
  group.name = key;
  scene.add(group);
  const bag: Bag = { group, mats: [], highlightColor, baseEmissive: 0, explodedY };
  bags[key] = bag;
  return bag;
}

// ────────────────────────────────────────────────────────────
// HELPER: tambah mesh ke group, simpan material di bag
// ────────────────────────────────────────────────────────────
function addMesh(
  bag: Bag,
  geo: THREE.BufferGeometry,
  color: number,
  opts: {
    roughness?: number; metalness?: number;
    transparent?: boolean; opacity?: number;
    emissive?: number; emissiveIntensity?: number;
    side?: THREE.Side; depthWrite?: boolean;
  } = {}
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness:         opts.roughness         ?? 0.55,
    metalness:         opts.metalness         ?? 0.1,
    transparent:       opts.transparent       ?? false,
    opacity:           opts.opacity           ?? 1.0,
    emissive:          new THREE.Color(opts.emissive ?? 0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    side:              opts.side              ?? THREE.FrontSide,
    depthWrite:        opts.depthWrite        ?? true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  bag.group.add(mesh);
  bag.mats.push(mat);  // simpan ref langsung
  return mesh;
}

// Edge lines (tidak masuk bag.mats karena LineBasicMaterial beda)
function addEdges(bag: Bag, geo: THREE.BufferGeometry, color: number): THREE.LineSegments {
  const ls = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color })
  );
  bag.group.add(ls);
  return ls;
}

// Label CSS2D
function addLabel(bag: Bag, text: string, x: number, y: number, z: number): void {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText =
    'background:rgba(8,20,40,0.82);color:#ddf0ff;padding:2px 8px;' +
    'border-radius:3px;font-size:10px;font-family:Consolas,monospace;' +
    'white-space:nowrap;pointer-events:none;border-left:2px solid #38bdf8;';
  const obj = new CSS2DObject(div);
  obj.position.set(x, y, z);
  bag.group.add(obj);
}

// ────────────────────────────────────────────────────────────
// Shorthand: box di posisi center
// ────────────────────────────────────────────────────────────
function box(
  bag: Bag, cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  color: number,
  opts: Parameters<typeof addMesh>[3] = {}
): THREE.Mesh {
  const m = addMesh(bag, new THREE.BoxGeometry(w, h, d), color, opts);
  m.position.set(cx, cy, cz);
  return m;
}

// ────────────────────────────────────────────────────────────
// Shorthand: cylinder dengan endpoint (start → end)
// ────────────────────────────────────────────────────────────
function cylinder(
  bag: Bag,
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  radius: number, color: number,
  opts: Parameters<typeof addMesh>[3] = {}
): THREE.Mesh {
  const s = new THREE.Vector3(x1, y1, z1);
  const e = new THREE.Vector3(x2, y2, z2);
  const len = s.distanceTo(e);
  if (len < 0.001) return new THREE.Mesh(); // guard
  const mid = s.clone().add(e).multiplyScalar(0.5);
  const dir = e.clone().sub(s).normalize();

  const m = addMesh(bag, new THREE.CylinderGeometry(radius, radius, len, 8), color, opts);
  m.position.copy(mid);
  const up = new THREE.Vector3(0, 1, 0);
  if (Math.abs(dir.dot(up)) < 0.9999) {
    m.quaternion.setFromUnitVectors(up, dir);
  }
  return m;
}

// ══════════════════════════════════════════════════════════════
// BUILDING
// ══════════════════════════════════════════════════════════════

function buildBuilding(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('building', scene, bags, 0);

  // OR Room 6×3×6, center (0,1.5,0)
  const orGeo = new THREE.BoxGeometry(6, 3, 6);
  const orFill = addMesh(bag, orGeo, 0xdceef8,
    { transparent: true, opacity: 0.07, roughness: 1, side: THREE.DoubleSide, depthWrite: false });
  orFill.position.set(0, 1.5, 0);
  const orEdges = new THREE.LineSegments(new THREE.EdgesGeometry(orGeo),
    new THREE.LineBasicMaterial({ color: BLUE }));
  orEdges.position.set(0, 1.5, 0);
  bag.group.add(orEdges);

  // Mechanical Room 4×3×4, center (6,1.5,0)
  const mrGeo = new THREE.BoxGeometry(4, 3, 4);
  const mrFill = addMesh(bag, mrGeo, 0xdceef8,
    { transparent: true, opacity: 0.07, roughness: 1, side: THREE.DoubleSide, depthWrite: false });
  mrFill.position.set(6, 1.5, 0);
  const mrEdges = new THREE.LineSegments(new THREE.EdgesGeometry(mrGeo),
    new THREE.LineBasicMaterial({ color: BLUE }));
  mrEdges.position.set(6, 1.5, 0);
  bag.group.add(mrEdges);

  // Floor planes
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xeef3f7, roughness: 1 });
  const flOr = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMat);
  flOr.rotation.x = -Math.PI / 2;
  flOr.position.set(0, 0.001, 0);
  flOr.receiveShadow = true;
  bag.group.add(flOr);

  const flMr = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), floorMat.clone());
  flMr.rotation.x = -Math.PI / 2;
  flMr.position.set(6, 0.001, 0);
  flMr.receiveShadow = true;
  bag.group.add(flMr);

  addLabel(bag, 'OR Room',     -2.5, 2.85, -2.5);
  addLabel(bag, 'Mechanical',   5.5, 2.85, -1.8);
}

// ══════════════════════════════════════════════════════════════
// AHU — Air Handling Unit
// Posisi center: (6, 0.8, 0)  — di dalam mechanical room, lantai
// Dimensi: W=1.8, H=1.6, D=1.5
// ══════════════════════════════════════════════════════════════

function buildAHU(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('ahu', scene, bags, 8);
  const AX = 6.0, AY = 0.8, AZ = 0.0;
  const W = 1.8, H = 1.6, D = 1.5;

  // Main casing
  const casingGeo = new THREE.BoxGeometry(W, H, D);
  const casing = addMesh(bag, casingGeo, GREY, { roughness: 0.45, metalness: 0.55 });
  casing.position.set(AX, AY, AZ);

  // Edge outline
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(casingGeo),
    new THREE.LineBasicMaterial({ color: DGREY }));
  e.position.set(AX, AY, AZ);
  bag.group.add(e);

  // ── Internal cutaway (terlihat dari sisi Z negatif = depan kamera) ──
  // Pre-filter (kuning)
  const pf = addMesh(bag, new THREE.BoxGeometry(W - 0.14, H - 0.14, 0.1), YELL,
    { roughness: 0.9, transparent: true, opacity: 0.92 });
  pf.position.set(AX, AY, AZ - D / 2 + 0.08);

  // Cooling coil (biru muda)
  const coil = addMesh(bag, new THREE.BoxGeometry(W - 0.14, H - 0.14, 0.22), 0x80deea,
    { roughness: 0.55, transparent: true, opacity: 0.88 });
  coil.position.set(AX, AY, AZ - 0.1);

  // Heater element (orange tipis)
  const heater = addMesh(bag, new THREE.BoxGeometry(W - 0.14, H - 0.14, 0.06), 0xff8a65,
    { roughness: 0.7, transparent: true, opacity: 0.75 });
  heater.position.set(AX, AY, AZ + 0.2);

  // Fan disc
  const fan = addMesh(bag, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), 0x37474f,
    { roughness: 0.5, metalness: 0.6 });
  fan.rotation.z = Math.PI / 2;
  fan.position.set(AX, AY, AZ + D / 2 - 0.12);

  // Fan hub
  const hub = addMesh(bag, new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), 0x263238,
    { roughness: 0.4, metalness: 0.7 });
  hub.rotation.z = Math.PI / 2;
  hub.position.set(AX, AY, AZ + D / 2 - 0.12);

  // Front semi-transparent panel
  const front = addMesh(bag, new THREE.PlaneGeometry(W, H), GREY,
    { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  front.position.set(AX, AY, AZ - D / 2 - 0.002);

  // 3 scored door lines
  const doorEdgeMat = new THREE.LineBasicMaterial({ color: DGREY });
  for (let i = 0; i < 3; i++) {
    const dg = new THREE.BoxGeometry(W / 3 - 0.04, H - 0.1, 0.001);
    const de = new THREE.LineSegments(new THREE.EdgesGeometry(dg), doorEdgeMat);
    de.position.set(AX - W / 3 + (i * W / 3), AY, AZ - D / 2 - 0.003);
    bag.group.add(de);
  }

  // Supply collar (top, cyan)
  const sc = addMesh(bag, new THREE.BoxGeometry(0.52, 0.1, 0.28), CYAN,
    { roughness: 0.4, metalness: 0.1 });
  sc.position.set(AX, AY + H / 2 + 0.05, AZ);

  // Return collar (left side, salmon)
  const rc = addMesh(bag, new THREE.BoxGeometry(0.1, 0.28, 0.48), SALM,
    { roughness: 0.4 });
  rc.position.set(AX - W / 2 - 0.05, AY + 0.15, AZ);

  // Magnehelic gauge
  const gauge = addMesh(bag, new THREE.CylinderGeometry(0.038, 0.038, 0.018, 12), 0xf5f5f5,
    { roughness: 0.3, metalness: 0.1 });
  gauge.rotation.z = Math.PI / 2;
  gauge.position.set(AX + W / 2 + 0.005, AY + H / 2 - 0.2, AZ - D / 2 + 0.15);

  // 4 vibration isolators
  [[-0.62, -0.52], [0.62, -0.52], [-0.62, 0.52], [0.62, 0.52]].forEach(([dx, dz]) => {
    const iso = addMesh(bag, new THREE.CylinderGeometry(0.055, 0.07, 0.075, 8), 0x4fc3f7,
      { roughness: 0.5 });
    iso.position.set(AX + dx, AY - H / 2 - 0.015, AZ + dz);
  });

  addLabel(bag, 'AHU', AX, AY + H / 2 + 0.35, AZ);
}

// ══════════════════════════════════════════════════════════════
// CDU — Condensing Unit di ROOFTOP
// Posisi center: (6, 3.55, 0)  — di atas mechanical room (ceiling y=3)
// ══════════════════════════════════════════════════════════════

function buildCDU(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('cdu', scene, bags, 11);
  const CX = 6.0, CY = 3.55, CZ = 0.0;
  const W = 0.9, H = 0.52, D = 1.1;

  // Mounting pad (rooftop)
  const pad = addMesh(bag, new THREE.BoxGeometry(W + 0.22, 0.04, D + 0.22), 0x546e7a,
    { roughness: 0.85 });
  pad.position.set(CX, CY - H / 2 - 0.02, CZ);

  // Main casing
  const casingGeo = new THREE.BoxGeometry(W, H, D);
  const casing = addMesh(bag, casingGeo, GREY, { roughness: 0.45, metalness: 0.55 });
  casing.position.set(CX, CY, CZ);
  bag.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(casingGeo),
    new THREE.LineBasicMaterial({ color: DGREY })));
  (bag.group.children.at(-1) as THREE.Object3D).position.set(CX, CY, CZ);

  // 14 condenser fins (PlaneGeometry, bukan InstancedMesh)
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x90a8bc, roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide,
  });
  for (let i = 0; i < 14; i++) {
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.04), finMat);
    fin.position.set(CX - W / 2 + 0.03 + i * ((W - 0.06) / 13), CY, CZ);
    bag.group.add(fin);
  }

  // Fan ring
  const fanRing = new THREE.Mesh(
    new THREE.RingGeometry(0.17, 0.33, 20),
    new THREE.MeshStandardMaterial({ color: 0x37474f, side: THREE.DoubleSide })
  );
  fanRing.rotation.x = -Math.PI / 2;
  fanRing.position.set(CX, CY + H / 2 + 0.001, CZ);
  bag.group.add(fanRing);

  // Fan grille bars (4)
  const gbm = new THREE.MeshStandardMaterial({ color: 0x546e7a });
  for (let i = 0; i < 4; i++) {
    const gb = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.007, 0.007), gbm);
    gb.position.set(CX, CY + H / 2 + 0.003, CZ - 0.26 + i * 0.18);
    gb.rotation.y = i % 2 ? Math.PI / 2 : 0;
    bag.group.add(gb);
  }

  // Service valve
  const sv = addMesh(bag, new THREE.BoxGeometry(0.055, 0.055, 0.055), DGREY, { roughness: 0.4 });
  sv.position.set(CX + W / 2 + 0.03, CY - 0.1, CZ + 0.25);

  addLabel(bag, 'CDU (Rooftop)', CX, CY + H / 2 + 0.3, CZ);
}

// ══════════════════════════════════════════════════════════════
// LAF — Laminar Air Flow
// Posisi center: (0, 2.825, 0)
// Dimensi: W=2.4, H=0.25, D=1.8
// Bottom face (HEPA) at y = 2.7
// ══════════════════════════════════════════════════════════════

function buildLAF(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('laf', scene, bags, 3.5);
  const LX = 0, LY = 2.825, LZ = 0;
  const LW = 2.4, LH = 0.25, LD = 1.8;

  // Housing
  const hGeo = new THREE.BoxGeometry(LW, LH, LD);
  const housing = addMesh(bag, hGeo, GREY, { roughness: 0.45, metalness: 0.45 });
  housing.position.set(LX, LY, LZ);
  bag.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(hGeo),
    new THREE.LineBasicMaterial({ color: DGREY })));
  (bag.group.children.at(-1) as THREE.Object3D).position.set(LX, LY, LZ);

  // HEPA filter face (kuning) at bottom of housing: y = 2.825 - 0.125 = 2.7
  const hepa = addMesh(bag, new THREE.BoxGeometry(LW - 0.04, 0.038, LD - 0.04), YELL,
    { roughness: 0.9 });
  hepa.position.set(LX, LY - LH / 2 - 0.001, LZ);

  // HEPA pleats (20 strips)
  const pleatMat = new THREE.MeshStandardMaterial({ color: 0xd4c030, roughness: 0.95, side: THREE.DoubleSide });
  for (let i = 0; i < 20; i++) {
    const pleat = new THREE.Mesh(new THREE.PlaneGeometry(0.04, LD - 0.08), pleatMat);
    pleat.position.set(LX - LW / 2 + 0.05 + i * ((LW - 0.08) / 19), LY - LH / 2 - 0.02, LZ);
    pleat.rotation.x = Math.PI / 2;
    bag.group.add(pleat);
  }

  // 9 airflow arrows pointing DOWN (dari y=2.7 ke bawah)
  const arMat = new THREE.MeshStandardMaterial({
    color: CYAN, emissive: new THREE.Color(0x00a0b8), emissiveIntensity: 0.2,
    transparent: true, opacity: 0.72,
  });
  [[-0.8,-0.6],[0,-0.6],[0.8,-0.6],[-0.8,0],[0,0],[0.8,0],[-0.8,0.6],[0,0.6],[0.8,0.6]]
    .forEach(([dx, dz]) => {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.26, 6), arMat);
      shaft.position.set(LX + dx, LY - LH / 2 - 0.17, LZ + dz);
      bag.group.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.1, 8), arMat);
      head.rotation.z = Math.PI; // tip ke bawah
      head.position.set(LX + dx, LY - LH / 2 - 0.35, LZ + dz);
      bag.group.add(head);
    });

  // 4 mounting brackets di sudut
  const brMat = new THREE.MeshStandardMaterial({ color: 0x546e7a, roughness: 0.6 });
  [[-LW/2+0.06,-LD/2+0.06],[LW/2-0.06,-LD/2+0.06],
   [-LW/2+0.06, LD/2-0.06],[LW/2-0.06, LD/2-0.06]].forEach(([bx, bz]) => {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.045), brMat);
    br.position.set(LX + bx, LY + LH / 2 + 0.1, LZ + bz);
    bag.group.add(br);
  });

  addLabel(bag, 'LAF — HEPA H14', LX, LY + LH / 2 + 0.22, LZ);
}

// ══════════════════════════════════════════════════════════════
// SUPPLY DUCTS
//
// KOORDINAT YANG DIVERIFIKASI:
//   AHU supply collar top: y = 0.8 + 1.6/2 + 0.1 = 1.7  (bagian atas collar)
//   Ceiling duct center:   y = 2.9
//   Riser: from y=1.7 to y=2.9 → center y=2.3, height=1.2
//   Horizontal: from x=6.0 to x=0.0, y=2.9, width=6.0
//   Drop ke LAF: from y=2.9 to y=2.7, center y=2.8, height=0.2
// ══════════════════════════════════════════════════════════════

function buildSupplyDucts(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('supplyDuct', scene, bags, 5.5);
  const DW = 0.5, DH = 0.28; // duct cross-section
  const CY = 2.9;  // ceiling duct Y center

  // ── Riser: AHU collar top (y=1.7) → ceiling (y=CY) ──
  // center y = (1.7 + CY) / 2 = 2.3, height = CY - 1.7 = 1.2
  box(bag, 6.0, 2.3, 0,  DW, 1.2, DH, CYAN);
  // Flange di bottom riser
  box(bag, 6.0, 1.72, 0, DW + 0.05, 0.025, DH + 0.05, 0x455a64);
  // Flange di top riser (junction ke horizontal)
  box(bag, 6.0, CY, 0,   DW + 0.05, 0.025, DH + 0.05, 0x455a64);

  // ── Elbow connector di sudut (mengisi gap visual) ──
  box(bag, 6.0, CY, 0,   DW + 0.04, DW + 0.04, DW + 0.04, CYAN);

  // ── Horizontal duct: dari x=6.0 ke x=0.0, center x=3.0 ──
  box(bag, 3.0, CY, 0,   6.0, DH, DW, CYAN);
  // Flanges setiap 1.2m
  [5.4, 4.2, 3.0, 1.8, 0.6].forEach(fx =>
    box(bag, fx, CY, 0, DW + 0.05, DH + 0.05, 0.025, 0x455a64)
  );

  // ── 3 duct hangers ──
  [4.8, 3.2, 1.6].forEach(hx => {
    // Rod kiri
    box(bag, hx - DW/2 + 0.03, CY + 0.17, 0, 0.015, 0.32, 0.015, 0x78909c);
    // Rod kanan
    box(bag, hx + DW/2 - 0.03, CY + 0.17, 0, 0.015, 0.32, 0.015, 0x78909c);
    // Strap bawah
    box(bag, hx, CY, 0, DW + 0.06, 0.012, 0.02, 0x78909c);
  });

  // ── Volume damper ──
  box(bag, 5.3, CY, 0, DW + 0.06, DH + 0.06, 0.09, 0x37474f);
  // Actuator
  box(bag, 5.3, CY + DH / 2 + 0.07, 0, 0.065, 0.065, 0.1, 0x00acc1);

  // ── Elbow di x=0 ──
  box(bag, 0, CY, 0, DW + 0.04, DW + 0.04, DW + 0.04, CYAN);

  // ── Drop: dari ceiling (y=CY) ke LAF top (y=2.7+0.125=2.825-0.125=2.7) ──
  // center y = (CY + 2.7) / 2 = 2.8, height = CY - 2.7 = 0.2
  box(bag, 0, 2.8, 0, DW, CY - 2.7, DH, CYAN);

  // ── Tapered transition LAF (simulasi 3 layer semakin lebar) ──
  box(bag, 0, 2.69, 0, 0.8,  0.055, 0.55, CYAN, { transparent: true, opacity: 0.85 });
  box(bag, 0, 2.66, 0, 1.55, 0.045, 1.15, CYAN, { transparent: true, opacity: 0.8  });
  box(bag, 0, 2.63, 0, 2.3,  0.035, 1.7,  CYAN, { transparent: true, opacity: 0.75 });

  addLabel(bag, 'Supply Air', 3.5, CY + 0.22, 0.6);
}

// ══════════════════════════════════════════════════════════════
// RETURN DUCTS
//
// KOORDINAT:
//   Return grille: x=±3.0 (face dinding), y=0.6 (low-wall)
//   Riser: x=±2.93 (sedikit masuk dari dinding), dari y=0.6 ke y=2.65
//   Duct connector dari grille ke riser: box kecil
//   Horizontal: dari x=-2.93 ke x=5.1, y=2.65
//   Drop ke AHU: dari y=2.65 ke y=1.6 (AHU return collar)
// ══════════════════════════════════════════════════════════════

function buildReturnDucts(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('returnDuct', scene, bags, 4.5);
  const DW = 0.45, DH = 0.25;
  const RS = 0.14;   // riser size (TIPIS!)
  const RY = 2.65;   // return main duct Y

  // ══ RISER KIRI (x=-2.93) ══
  // Riser dari y=0.6 ke y=RY
  // center y = (0.6 + RY) / 2 = 1.625, height = RY - 0.6 = 2.05
  box(bag, -2.93, 1.625, 0,  RS, 2.05, RS, SALM);
  // Short connector dari dinding (x=-3.0) ke riser (x=-2.93+RS/2=-2.86)
  // center x = (-3.0 + (-2.86)) / 2 = -2.93, length = 0.14
  // Ini mengisi gap antara grille di wall (-3.0) dan riser (-2.93)
  box(bag, -2.93, 0.6, 0,   RS, RS, RS, SALM); // elbow
  box(bag, -2.965, 0.6, 0, 0.07, RS, RS, SALM); // konektor ke grille

  // ══ RISER KANAN (x=+2.93) ══
  box(bag, 2.93, 1.625, 0,   RS, 2.05, RS, SALM);
  box(bag, 2.93, 0.6, 0,     RS, RS, RS, SALM);
  box(bag, 2.965, 0.6, 0,   0.07, RS, RS, SALM);

  // Flanges di top riser
  box(bag, -2.93, RY, 0, RS + 0.03, 0.022, RS + 0.03, 0x455a64);
  box(bag,  2.93, RY, 0, RS + 0.03, 0.022, RS + 0.03, 0x455a64);

  // Elbows di junction riser → horizontal
  box(bag, -2.93, RY, 0, DW + 0.04, DW + 0.04, DW + 0.04, SALM);
  box(bag,  2.93, RY, 0, DW + 0.04, DW + 0.04, DW + 0.04, SALM);

  // ══ HORIZONTAL RETURN DUCT ══
  // Dari x=-2.93 ke x=5.1, center x = (-2.93+5.1)/2 = 1.085, length = 8.03
  box(bag, 1.085, RY, 0,  8.03, DH, DW, SALM);

  // Flanges
  [4.5, 3.0, 1.5, 0.0, -1.5].forEach(fx =>
    box(bag, fx, RY, 0, DW + 0.04, DH + 0.04, 0.022, 0x455a64)
  );

  // Volume damper di return
  box(bag, 2.0, RY, 0,  DW + 0.06, DH + 0.06, 0.09, 0x37474f);
  box(bag, 2.0, RY + DH / 2 + 0.07, 0, 0.065, 0.065, 0.1, 0x00acc1);

  // ══ ELBOW + DROP KE AHU ══
  // AHU return collar center: x=6.0-0.9-0.05=5.05, y=0.8+0.15=0.95
  // Drop: dari y=RY ke y=0.95
  // center y = (RY + 0.95) / 2 = 1.8, height = RY - 0.95 = 1.7
  box(bag, 5.1, RY, 0,   DW + 0.04, DW + 0.04, DW + 0.04, SALM); // elbow
  box(bag, 5.1, 1.8, 0,  DH, 1.7, DW, SALM); // drop vertikal

  addLabel(bag, 'Return Air', 1.5, RY + 0.22, 0.6);
}

// ══════════════════════════════════════════════════════════════
// RETURN AIR GRILLES — low-wall (ASHRAE 170: 0.3–0.9m)
// 4 grilles: 2 di x=-3.0, 2 di x=+3.0
// y=0.6 (center), z=±1.2
// ══════════════════════════════════════════════════════════════

function buildReturnGrilles(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('grilles', scene, bags, -0.8);

  // POSISI: x=±3.0 (tepat di dinding OR room)
  const positions = [
    { x: -3.0, z: -1.2 }, { x: -3.0, z: 1.2 },
    { x:  3.0, z: -1.2 }, { x:  3.0, z: 1.2 },
  ];

  positions.forEach(({ x, z }) => {
    const y = 0.6;
    // Frame (setipis dinding: 0.055m)
    box(bag, x, y, z,  0.055, 0.42, 0.62, 0xbfc9ca, { roughness: 0.5 });
    // 6 slats horizontal
    for (let i = 0; i < 6; i++) {
      box(bag, x, y - 0.165 + i * 0.066, z,  0.04, 0.016, 0.57, SALM, { roughness: 0.65 });
    }
  });
}

// ══════════════════════════════════════════════════════════════
// REFRIGERANT PIPES
// CDU: (6.0, 3.55, 0)  — CDU center
// CDU base: y = 3.55 - 0.52/2 = 3.29
// AHU: (6.0, 0.8, 0)   — AHU center
// AHU top: y = 0.8 + 1.6/2 = 1.6
//
// Liquid line: from (6.25, 3.28, 0.3) → (6.25, 1.6, 0.3)
// Suction line: from (5.75, 3.28, -0.3) → (5.75, 1.6, -0.3)
// ══════════════════════════════════════════════════════════════

function buildRefrigerant(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('refrigerant', scene, bags, 7.5);
  const R  = 0.024;   // pipe radius
  const RI = 0.040;   // insulation radius

  // Liquid line
  cylinder(bag, 6.25, 3.28, 0.3,  6.25, 1.6, 0.3,  R,  AMBER, { roughness: 0.35, metalness: 0.7 });
  cylinder(bag, 6.25, 3.28, 0.3,  6.25, 1.6, 0.3,  RI, 0x1a1a2e, { transparent: true, opacity: 0.82, roughness: 0.9 });

  // Suction line
  cylinder(bag, 5.75, 3.28, -0.3, 5.75, 1.6, -0.3, R * 1.35, AMBER, { roughness: 0.35, metalness: 0.7 });
  cylinder(bag, 5.75, 3.28, -0.3, 5.75, 1.6, -0.3, RI * 1.25, 0x1a1a2e, { transparent: true, opacity: 0.82, roughness: 0.9 });

  // Elbow spheres di ujung-ujung
  [[6.25,3.28,0.3],[6.25,1.6,0.3],[5.75,3.28,-0.3],[5.75,1.6,-0.3]].forEach(([x,y,z]) => {
    const s = addMesh(bag, new THREE.SphereGeometry(R * 1.5, 8, 8), AMBER,
      { roughness: 0.4, metalness: 0.65 });
    s.position.set(x, y, z);
  });

  // Service valves
  [[6.25,2.0,0.3],[5.75,2.0,-0.3]].forEach(([x,y,z]) => {
    box(bag, x, y, z, 0.06, 0.075, 0.06, AMBER, { roughness: 0.5 });
  });

  addLabel(bag, 'Refrigerant R-410A', 6.7, 2.3, 0);
}

// ══════════════════════════════════════════════════════════════
// FRESH AIR INTAKE
// Louver di dinding luar mechanical room x=8.0
// ══════════════════════════════════════════════════════════════

function buildFreshAir(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('freshAir', scene, bags, 5.0);

  // Louver box
  box(bag, 8.04, 2.0, -1.4,  0.08, 0.32, 0.45, TEAL, { roughness: 0.6 });
  // Louver slats
  for (let i = 0; i < 5; i++) {
    const s = addMesh(bag, new THREE.BoxGeometry(0.06, 0.012, 0.42), TEAL, { roughness: 0.7 });
    s.position.set(8.04, 1.87 + i * 0.07, -1.4);
    s.rotation.x = -Math.PI / 10;
  }

  // OA duct horizontal: x=8.0 → x=6.0, center=(7.0,2.0,-1.4), length=2.1
  box(bag, 7.0, 2.0, -1.4,   2.1, 0.22, 0.28, TEAL);
  // Flanges
  box(bag, 8.0, 2.0, -1.4,   0.28, 0.26, 0.025, 0x37474f);
  box(bag, 6.05, 2.0, -1.4,  0.28, 0.26, 0.025, 0x37474f);

  // Elbow
  box(bag, 6.0, 2.0, -1.4,   0.28, 0.28, 0.28, TEAL);

  // Turn: z=-1.4 → z=0, center=(6.0,2.0,-0.7), length=1.5
  box(bag, 6.0, 2.0, -0.7,   0.28, 0.22, 1.5, TEAL);

  addLabel(bag, 'Fresh Air OAI (20–30%)', 7.2, 2.35, -1.4);
}

// ══════════════════════════════════════════════════════════════
// AGSS EXHAUST — sangat kecil (0.14m)
// ══════════════════════════════════════════════════════════════

function buildExhaust(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('exhaust', scene, bags, 6.5);
  const S = 0.13;

  // Pickup di OR room ceiling
  box(bag, 1.5, 2.87, -2.2,  S, S, S, ORNG);
  // Horizontal ke luar: x=1.5 → x=8.65
  // center=(5.075,2.87,-2.2), length=7.3
  box(bag, 5.075, 2.87, -2.2,  7.3, S, S, ORNG);
  // Flanges
  [2.5, 4.0, 6.0, 7.5].forEach(fx =>
    box(bag, fx, 2.87, -2.2, S + 0.028, S + 0.028, 0.02, 0x37474f)
  );
  // Exhaust fan box
  box(bag, 8.72, 2.87, -2.2,  0.22, 0.22, 0.22, 0x455a64);

  addLabel(bag, 'AGSS Exhaust', 5.0, 3.05, -2.2);
}

// ══════════════════════════════════════════════════════════════
// OPERATING TABLE
// ══════════════════════════════════════════════════════════════

function buildTable(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('table', scene, bags, -1.5);
  const tMat = { roughness: 0.45, metalness: 0.5, transparent: true, opacity: 0.78 };

  // Tabletop
  box(bag, 0, 0.875, 0,   0.53, 0.07, 1.9, 0x607d8b, tMat);
  // Pedestal
  const ped = addMesh(bag, new THREE.CylinderGeometry(0.062, 0.082, 0.8, 10), 0x607d8b, tMat);
  ped.position.set(0, 0.4, 0);
  // Base
  box(bag, 0, 0.02, 0,   0.56, 0.04, 0.56, 0x607d8b, tMat);
  // 2 support legs
  [-0.36, 0.36].forEach(dz => {
    const leg = addMesh(bag, new THREE.CylinderGeometry(0.013, 0.013, 0.76, 6), 0x546e7a, tMat);
    leg.position.set(0, 0.38, dz);
  });
  // Critical zone ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.88, 0.98, 36),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.32 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  bag.group.add(ring);
}

// ══════════════════════════════════════════════════════════════
// SURGICAL CONTROL PANEL
// ══════════════════════════════════════════════════════════════

function buildPanel(scene: THREE.Scene, bags: Record<string, Bag>): void {
  const bag = makeBag('panel', scene, bags, 0);
  const PX = -2.85, PY = 1.5, PZ = -0.8;

  // Housing
  box(bag, PX, PY, PZ,  0.062, 0.5, 0.62, 0x37474f, { roughness: 0.4, metalness: 0.55 });

  // Screen
  const sc = addMesh(bag, new THREE.PlaneGeometry(0.44, 0.33),
    0x0a1628, { roughness: 0.05, emissive: 0x0d3560, emissiveIntensity: 0.45 });
  sc.position.set(PX - 0.032, PY + 0.06, PZ);
  sc.rotation.y = Math.PI / 2;

  // Fake UI lines on screen
  const uiMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
  [[PY + 0.14, 0.17], [PY + 0.09, 0.13], [PY + 0.04, 0.21], [PY - 0.01, 0.09]]
    .forEach(([ly, lw]) => {
      const pts = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(PX - 0.031, ly, PZ - lw / 2),
        new THREE.Vector3(PX - 0.031, ly, PZ + lw / 2),
      ]);
      bag.group.add(new THREE.Line(pts, uiMat));
    });

  // Status LEDs
  [0x00e676, 0xffeb3b, 0xff1744].forEach((color, i) => {
    const led = addMesh(bag, new THREE.SphereGeometry(0.012, 8, 8), color,
      { emissive: color, emissiveIntensity: 1.0 });
    led.position.set(PX - 0.032, PY - 0.17, PZ - 0.065 + i * 0.065);
  });

  addLabel(bag, 'Surgical Panel', PX - 0.18, PY + 0.5, PZ);
}

export default HvacSystemBIM3D;
