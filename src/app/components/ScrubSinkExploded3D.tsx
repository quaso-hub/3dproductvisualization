import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// ─── Scene constants (1 unit = 10mm) ─────────────────────────────────────────
const W       = 160;
const D       = 60;
const EXP_GAP = 35;

// Group heights matching assembled geometry
const G1_H = 76;   // base trim (6) + cabinet body (70)
const G2_H = 22;   // countertop (4) + basin visible depth (18 shown)
const G3_H = 25;   // faucet assembly
const G4_H = 62;   // mirror + frame (60 tall + 2 bar)
// G5 (canopy + LED) is 5 units

// Group Y offsets (bottom of each group)
const G1_Y = 0;
const G2_Y = G1_Y + G1_H + EXP_GAP;   // = 111
const G3_Y = G2_Y + G2_H + EXP_GAP;   // = 168
const G4_Y = G3_Y + G3_H + EXP_GAP;   // = 228
const G5_Y = G4_Y + G4_H + EXP_GAP;   // = 325

// ─── Material factories ───────────────────────────────────────────────────────
function matSS(roughness = 0.12, metalness = 0.90) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce8, roughness, metalness, envMapIntensity: 1.0,
  });
}

function matSSMatte(roughness = 0.35, metalness = 0.78) {
  return new THREE.MeshStandardMaterial({
    color: 0xc8d4e0, roughness, metalness,
  });
}

function matGhost(color = 0xa0c8d8, opacity = 0.22) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
  });
}

function matChrome(roughness = 0.06, metalness = 0.98) {
  return new THREE.MeshStandardMaterial({
    color: 0xe8f0f8, roughness, metalness, envMapIntensity: 1.3,
  });
}

function matGlass(opacity = 0.42) {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8,
    metalness: 0.0,
    roughness: 0.03,
    transparent: true,
    opacity,
  });
}

function addConnectorLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8,
    dashSize: 8,
    gapSize: 5,
    opacity: 0.28,
    transparent: true,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  scene.add(line);
}

function buildExplodedScene(refs: any) {
  const scene    = refs.scene;
  const renderer = refs.renderer;

  renderer.toneMappingExposure = 1.1;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.background = null;
  pmrem.dispose();

  const ambLight = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(ambLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(100, 180, 120);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd8f0ff, 0.9);
  fillLight.position.set(-90, 100, -100);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 700),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  // ── GROUP 1 — Cabinet base trim + main cabinet body + pedals (Y=0→76) ───
  {
    // Ghost box representing the full cabinet (base trim + body, 76 units)
    const cabGeo = new THREE.BoxGeometry(W, G1_H, D);
    const cab = new THREE.Mesh(cabGeo, matGhost(0xa0c8d8, 0.18));
    cab.position.set(0, G1_Y + G1_H / 2, 0);
    scene.add(cab);

    const cabEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cabGeo),
      new THREE.LineBasicMaterial({ color: 0x4a5a70, opacity: 0.35, transparent: true }),
    );
    cabEdges.position.copy(cab.position);
    scene.add(cabEdges);

    // Door panel outlines on front face
    const doorLineMat = new THREE.LineBasicMaterial({
      color: 0x607080, opacity: 0.4, transparent: true,
    });
    const leftDoorGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(W / 2 - 3, G1_H - 10, 0.5),
    );
    const leftDoorEdge = new THREE.LineSegments(leftDoorGeo, doorLineMat);
    leftDoorEdge.position.set(-(W / 4 + 1), G1_Y + G1_H / 2, D / 2 + 0.5);
    scene.add(leftDoorEdge);

    const rightDoorEdge = new THREE.LineSegments(leftDoorGeo.clone(), doorLineMat);
    rightDoorEdge.position.set(W / 4 + 1, G1_Y + G1_H / 2, D / 2 + 0.5);
    scene.add(rightDoorEdge);

    // Foot pedals at base front
    ([-40, 40]).forEach((px) => {
      const pedalGeo = new THREE.BoxGeometry(18, 2.5, 12);
      const pedal = new THREE.Mesh(pedalGeo, matSSMatte(0.45, 0.30));
      pedal.position.set(px, G1_Y + 1.25, D / 2 + 2);
      scene.add(pedal);
    });

    // Adjustable feet at 4 corners
    const footPositions: [number, number][] = [
      [W / 2 - 8, D / 2 - 8],
      [-W / 2 + 8, D / 2 - 8],
      [W / 2 - 8, -D / 2 + 8],
      [-W / 2 + 8, -D / 2 + 8],
    ];
    footPositions.forEach(([fx, fz]) => {
      const footGeo = new THREE.CylinderGeometry(2.5, 3, 1, 14);
      const foot = new THREE.Mesh(footGeo, new THREE.MeshStandardMaterial({
        color: 0x7890a0, roughness: 0.5, metalness: 0.65,
      }));
      foot.position.set(fx, G1_Y + 0.5, fz);
      scene.add(foot);
    });
  }

  const connY1 = G1_Y + G1_H; // = 76

  // ── GROUP 2 — Countertop slab + basin inserts ────────────────────────────
  {
    const CT_T = 4;

    // Countertop slab (shown as a solid slab; basin openings implied by ghost basins below)
    const topGeo = new THREE.BoxGeometry(W, CT_T, D);
    const top = new THREE.Mesh(topGeo, matSS(0.10, 0.92));
    top.position.set(0, G2_Y + CT_T / 2, 0);
    scene.add(top);

    const topEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(topGeo),
      new THREE.LineBasicMaterial({ color: 0x5a7a90, opacity: 0.25, transparent: true }),
    );
    topEdges.position.copy(top.position);
    scene.add(topEdges);

    // Ghost basin cavities (show the 22-unit depth hanging below countertop)
    const BASIN_W = 60;
    const BASIN_D = 45;
    const BASIN_H = 22;
    ([-40, 40]).forEach((bx) => {
      const basinGeo = new THREE.BoxGeometry(BASIN_W, BASIN_H, BASIN_D);
      const basin = new THREE.Mesh(basinGeo, matGhost(0xa0c8e0, 0.22));
      basin.position.set(bx, G2_Y + CT_T / 2 - BASIN_H / 2, -7.5);
      scene.add(basin);

      const basinEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(basinGeo),
        new THREE.LineBasicMaterial({ color: 0x4a6a80, opacity: 0.30, transparent: true }),
      );
      basinEdges.position.copy(basin.position);
      scene.add(basinEdges);
    });

    // Connector lines G1 → G2
    addConnectorLine(
      scene,
      new THREE.Vector3(W / 2 - 8, connY1, -D / 2 + 8),
      new THREE.Vector3(W / 2 - 8, G2_Y, -D / 2 + 8),
    );
    addConnectorLine(
      scene,
      new THREE.Vector3(-W / 2 + 8, connY1, -D / 2 + 8),
      new THREE.Vector3(-W / 2 + 8, G2_Y, -D / 2 + 8),
    );
  }

  const connY2 = G2_Y + 4; // top of countertop slab

  // ── GROUP 3 — Gooseneck faucet system ×2 ────────────────────────────────
  {
    // Faucet geometry is relative to G3_Y (where faucet base would be)
    ([-40, 40]).forEach((fx) => {
      const faucetBaseY = G3_Y;

      const pipeGeo = new THREE.CylinderGeometry(0.8, 0.8, 20, 12);
      const pipe = new THREE.Mesh(pipeGeo, matChrome());
      pipe.position.set(fx, faucetBaseY + 10, -20);
      scene.add(pipe);

      const neckArc = new THREE.TorusGeometry(6, 0.8, 10, 16, Math.PI);
      const neck = new THREE.Mesh(neckArc, matChrome());
      neck.rotation.z = Math.PI / 2;
      neck.position.set(fx, faucetBaseY + 20, -14);
      scene.add(neck);

      const armGeo = new THREE.CylinderGeometry(0.7, 0.7, 14, 10);
      const arm = new THREE.Mesh(armGeo, matChrome());
      arm.rotation.z = Math.PI / 2;
      arm.position.set(fx, faucetBaseY + 20, -6);
      scene.add(arm);

      const spoutGeo = new THREE.CylinderGeometry(1.0, 0.6, 3, 12);
      const spout = new THREE.Mesh(spoutGeo, matChrome(0.08, 0.95));
      spout.rotation.z = Math.PI / 2;
      spout.position.set(fx, faucetBaseY + 20, 3);
      scene.add(spout);
    });

    // Connector lines G2 → G3
    addConnectorLine(
      scene,
      new THREE.Vector3(-W / 2 + 8, connY2, -D / 2 + 8),
      new THREE.Vector3(-W / 2 + 8, G3_Y, -D / 2 + 8),
    );
    addConnectorLine(
      scene,
      new THREE.Vector3(W / 2 - 8, connY2, -D / 2 + 8),
      new THREE.Vector3(W / 2 - 8, G3_Y, -D / 2 + 8),
    );
  }

  const connY3 = G3_Y + G3_H;

  // ── GROUP 4 — Backsplash ghost + Mirror panels + SS frames ───────────────
  {
    // Ghost back panel
    const bsGeo = new THREE.BoxGeometry(W, 62, 1.2);
    const bs = new THREE.Mesh(bsGeo, matGhost(0xa8c8d0, 0.18));
    bs.position.set(0, G4_Y + 31, -D / 2 + 0.6);
    scene.add(bs);

    // SS frame posts + beams
    const frameT = 1.5;
    const frameH = 2;
    const topBeamGeo = new THREE.BoxGeometry(W + 10, frameH, frameT);
    const topBeam = new THREE.Mesh(topBeamGeo, matSS(0.12, 0.89));
    topBeam.position.set(0, G4_Y + 62 + frameH / 2, -D / 2 + 2);
    scene.add(topBeam);

    const botBeamGeo = new THREE.BoxGeometry(W + 10, frameH, frameT);
    const botBeam = new THREE.Mesh(botBeamGeo, matSS(0.12, 0.89));
    botBeam.position.set(0, G4_Y, -D / 2 + 2);
    scene.add(botBeam);

    const postGeo = new THREE.BoxGeometry(frameT, 62, frameT);
    [-W / 2 - 4, W / 2 + 4].forEach((px) => {
      const post = new THREE.Mesh(postGeo, matSS(0.12, 0.89));
      post.position.set(px, G4_Y + 31, -D / 2 + 2);
      scene.add(post);
    });

    // Mirror glass panels
    const mirrorGeo = new THREE.PlaneGeometry(W / 2 - 8, 58);
    [-W / 4, W / 4].forEach((mx) => {
      const mirror = new THREE.Mesh(mirrorGeo, matGlass(0.42));
      mirror.position.set(mx, G4_Y + 31, -D / 2 + 2.5);
      scene.add(mirror);
    });

    // Connector lines G3 → G4
    addConnectorLine(
      scene,
      new THREE.Vector3(-W / 2 + 8, connY3, -D / 2 + 8),
      new THREE.Vector3(-W / 2 + 8, G4_Y, -D / 2 + 8),
    );
    addConnectorLine(
      scene,
      new THREE.Vector3(W / 2 - 8, connY3, -D / 2 + 8),
      new THREE.Vector3(W / 2 - 8, G4_Y, -D / 2 + 8),
    );
  }

  const connY4 = G4_Y + G4_H;

  // ── GROUP 5 — Canopy + LED UV strip ──────────────────────────────────────
  {
    const canopyGeo = new THREE.BoxGeometry(W + 15, 5, 14);
    const canopy = new THREE.Mesh(canopyGeo, matGhost(0xa8c8d0, 0.25));
    canopy.position.set(0, G5_Y + 2.5, -D / 2 + 7);
    scene.add(canopy);

    const ledGeo = new THREE.CylinderGeometry(0.3, 0.3, W, 8);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
    });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.rotation.z = Math.PI / 2;
    led.position.set(0, G5_Y + 1, -D / 2 + 5);
    scene.add(led);

    // Connector lines G4 → G5
    addConnectorLine(
      scene,
      new THREE.Vector3(-W / 2 + 8, connY4, -D / 2 + 8),
      new THREE.Vector3(-W / 2 + 8, G5_Y, -D / 2 + 8),
    );
    addConnectorLine(
      scene,
      new THREE.Vector3(W / 2 - 8, connY4, -D / 2 + 8),
      new THREE.Vector3(W / 2 - 8, G5_Y, -D / 2 + 8),
    );
  }

  // ── Annotations ───────────────────────────────────────────────────────────
  const annotItems: Array<{ anchor: THREE.Vector3; label: string }> = [
    { anchor: new THREE.Vector3(W / 2 + 10, G5_Y + 2.5,  0), label: 'Canopy + LED UV Strip' },
    { anchor: new THREE.Vector3(W / 2 + 10, G4_Y + 31,   0), label: 'Mirror Panel + Frame ×2' },
    { anchor: new THREE.Vector3(W / 2 + 10, G3_Y + 12,   0), label: 'Faucet System ×2 (IR Sensor)' },
    { anchor: new THREE.Vector3(W / 2 + 10, G2_Y + 2,    0), label: 'Countertop + Basins SS 304' },
    { anchor: new THREE.Vector3(W / 2 + 10, G1_Y + 38,   0), label: 'Cabinet Base + Body + Pedals' },
  ];

  placeAnnotations(scene, annotItems, W / 2 + 70, [0, G5_Y + 10]);
}

export function ScrubSinkExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: {
      cameraStart: product.explodedCameraStart,
      minDistance: 100,
      maxDistance: 1800,
    },
    onInit: (refs) => {
      buildExplodedScene(refs);
      const p = product.cameraPresets.find(x => x.name === 'Exploded View');
      if (p) applyCameraPreset(refs, p.position, p.target);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };

  const dl = (name: string) =>
    refsRef.current &&
    downloadPNG(
      refsRef.current.renderer,
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );

  const dlAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 220); }, i * 520),
    );

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={product.cameraPresets}
        activePreset={activePreset}
        onPreset={goTo}
        onDownload={dl}
        onDownloadAll={dlAll}
      />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}
