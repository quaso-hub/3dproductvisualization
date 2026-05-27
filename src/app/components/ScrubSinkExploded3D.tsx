/**
 * ScrubSinkExploded3D.tsx - V2 EXPLODED VIEW
 * ------------------------------─
 * Surgical Scrub Sink 2 Bay - 5-group vertical explosion
 *
 * Groups (bottom → top):
 *  G1: Cabinet base (65 units) - ghost box + 4 door outlines + feet + pedals
 *  G2: Countertop + Basins (25 units) - slab + basin cavities + drain + P-trap
 *  G3: Faucets + Soap dispensers (30 units) - gooseneck curves + dispensers
 *  G4: Backsplash + Mirror panels (52 units)
 *  G5: Canopy + LED + UV (35 units)
 * ------------------------------─
 */

import { useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product, CameraPreset } from '../data/products';
import { animateCameraTo, applyCameraPreset, downloadPNG, placeAnnotations } from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { useHighlightController } from '../hooks/useHighlightController';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

// -─ Scene constants (1 unit = 10mm) --------------------─
const W = 160;
const D = 60;
const EXP_GAP = 38;

// Group heights
const G1_H = 65;   // cabinet base
const G2_H = 25;   // countertop + basins
const G3_H = 30;   // faucets + soap
const G4_H = 52;   // backsplash + mirrors
const G5_H = 35;   // canopy + LED + UV

// Group Y offsets (bottom of each group)
const G1_Y = 0;
const G2_Y = G1_Y + G1_H + EXP_GAP;
const G3_Y = G2_Y + G2_H + EXP_GAP;
const G4_Y = G3_Y + G3_H + EXP_GAP;
const G5_Y = G4_Y + G4_H + EXP_GAP;

const BAY_CX_L = -40;
const BAY_CX_R = 40;

// -─ Material factories ---------------------------─
function matSS(roughness = 0.12, metalness = 0.90) {
  return new THREE.MeshStandardMaterial({
    color: 0xd0dce8, roughness, metalness, envMapIntensity: 1.0,
  });
}

function matGhost(color = 0xa0c8d8, opacity = 0.20) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.3, metalness: 0.5,
    transparent: true, opacity, side: THREE.DoubleSide,
  });
}

function matChrome(roughness = 0.06, metalness = 0.98) {
  return new THREE.MeshStandardMaterial({
    color: 0xe8f0f8, roughness, metalness, envMapIntensity: 1.3,
  });
}

function matGlass(opacity = 0.42) {
  return new THREE.MeshStandardMaterial({
    color: 0x9ed4e8, metalness: 0.0, roughness: 0.03,
    transparent: true, opacity,
  });
}

function matLED() {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xfff8e0, emissiveIntensity: 0.3,
  });
}

function matUV() {
  return new THREE.MeshStandardMaterial({
    color: 0xd0c0ff, emissive: 0xb090ee, emissiveIntensity: 0.4,
  });
}

function addConnectorLine(scene: THREE.Scene, from: THREE.Vector3, to: THREE.Vector3) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const mat = new THREE.LineDashedMaterial({
    color: 0x8ca0b8, dashSize: 8, gapSize: 5,
    opacity: 0.28, transparent: true,
  });
  const line = new THREE.Line(geo, mat);
  line.computeLineDistances();
  scene.add(line);
}

function addCornerConnectors(scene: THREE.Scene, y1: number, y2: number) {
  const offsets: [number, number][] = [
    [-W / 2 + 8, -D / 2 + 8],
    [W / 2 - 8, -D / 2 + 8],
    [-W / 2 + 8, D / 2 - 8],
    [W / 2 - 8, D / 2 - 8],
  ];
  offsets.forEach(([x, z]) => {
    addConnectorLine(scene, new THREE.Vector3(x, y1, z), new THREE.Vector3(x, y2, z));
  });
}

// -─ Scene builder ------------------------------
function buildExplodedScene(refs: any) {
  const scene = refs.scene;
  const renderer = refs.renderer;

  renderer.toneMappingExposure = 1.05;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.background = new THREE.Color(0xeef3f7);
  pmrem.dispose();

  // Lighting (rebalanced + key shadow on)
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  scene.add(new THREE.HemisphereLight(0xfaffff, 0xd0dde6, 0.42));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(140, 240, 160);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -200;
  keyLight.shadow.camera.right = 200;
  keyLight.shadow.camera.top = 320;
  keyLight.shadow.camera.bottom = -50;
  keyLight.shadow.camera.far = 800;
  keyLight.shadow.bias = -0.0006;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xc8e0ff, 0.45);
  fill.position.set(-120, 140, -80);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0d8, 0.3);
  rim.position.set(80, 100, -200);
  scene.add(rim);

  // Floor (shadow catcher)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshStandardMaterial({ color: 0xeef0f3, roughness: 0.85 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // - GROUP 1 - Cabinet base (Y = G1_Y → G1_Y + G1_H) ---------
  {
    const cabinetGroup = new THREE.Group();
    cabinetGroup.userData.partId = 'cabinet';
    scene.add(cabinetGroup);

    // Ghost box for cabinet body
    const cabGeo = new THREE.BoxGeometry(W, G1_H, D);
    const cab = new THREE.Mesh(cabGeo, matGhost(0xa0c8d8, 0.16));
    cab.position.set(0, G1_Y + G1_H / 2, 0);
    cabinetGroup.add(cab);
    const cabEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(cabGeo),
      new THREE.LineBasicMaterial({ color: 0x4a5a70, opacity: 0.35, transparent: true }),
    );
    cabEdges.position.copy(cab.position);
    cabinetGroup.add(cabEdges);

    // 4 door panel outlines on front face
    const doorW = 38, doorH = 58;
    const doorLineMat = new THREE.LineBasicMaterial({ color: 0x607080, opacity: 0.4, transparent: true });
    const doorGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(doorW, doorH, 0.5));
    [-(W / 4 + 1), -(W / 4 - doorW - 1), (W / 4 - doorW - 1), (W / 4 + 1)].forEach((dx) => {
      const edge = new THREE.LineSegments(doorGeo.clone(), doorLineMat);
      edge.position.set(dx, G1_Y + G1_H / 2, D / 2 + 0.5);
      cabinetGroup.add(edge);
    });

    // Foot pedals
    const pedalMat = new THREE.MeshStandardMaterial({ color: 0x8898a8, roughness: 0.30, metalness: 0.70 });
    ([BAY_CX_L, BAY_CX_R]).forEach((px) => {
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(12, 2, 18), pedalMat);
      pedal.position.set(px, G1_Y + 1, D / 2 + 4);
      cabinetGroup.add(pedal);
    });

    // Adjustable feet at 4 corners
    const footMat = new THREE.MeshStandardMaterial({ color: 0x7890a0, roughness: 0.5, metalness: 0.65 });
    ([[-W / 2 + 8, D / 2 - 8], [W / 2 - 8, D / 2 - 8],
      [-W / 2 + 8, -D / 2 + 8], [W / 2 - 8, -D / 2 + 8]] as [number, number][]).forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 1.5, 14), footMat);
      foot.position.set(fx, G1_Y + 0.75, fz);
      cabinetGroup.add(foot);
    });
  }

  addCornerConnectors(scene, G1_Y + G1_H, G2_Y);

  // - GROUP 2 - Countertop + Basins (Y = G2_Y → G2_Y + G2_H) -----─
  {
    const countertopGroup = new THREE.Group();
    countertopGroup.userData.partId = 'countertop';
    scene.add(countertopGroup);

    const CT_T = 2.5;
    // Countertop slab
    const topGeo = new THREE.BoxGeometry(W, CT_T, D);
    const top = new THREE.Mesh(topGeo, matSS(0.10, 0.92));
    top.position.set(0, G2_Y + G2_H - CT_T / 2, 0);
    countertopGroup.add(top);
    const topEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(topGeo),
      new THREE.LineBasicMaterial({ color: 0x5a7a90, opacity: 0.25, transparent: true }),
    );
    topEdges.position.copy(top.position);
    countertopGroup.add(topEdges);

    // Ghost basin cavities (showing the 20-unit depth below countertop)
    const BASIN_W = 65, BASIN_D = 45, BASIN_H = 20;
    ([BAY_CX_L, BAY_CX_R]).forEach((bx) => {
      const basinGeo = new THREE.BoxGeometry(BASIN_W, BASIN_H, BASIN_D);
      const basin = new THREE.Mesh(basinGeo, matGhost(0xa0c8e0, 0.22));
      basin.position.set(bx, G2_Y + G2_H - CT_T - BASIN_H / 2, -5);
      countertopGroup.add(basin);
      const basinEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(basinGeo),
        new THREE.LineBasicMaterial({ color: 0x4a6a80, opacity: 0.30, transparent: true }),
      );
      basinEdges.position.copy(basin.position);
      countertopGroup.add(basinEdges);
    });

    // P-trap representations (simplified curves)
    const pipeMat = matSS(0.12, 0.90);
    ([BAY_CX_L, BAY_CX_R]).forEach((px) => {
      const ptrapPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px, G2_Y + 2, -13),
        new THREE.Vector3(px, G2_Y - 2, -15),
        new THREE.Vector3(px, G2_Y - 5, -17),
        new THREE.Vector3(px, G2_Y - 2, -19),
        new THREE.Vector3(px, G2_Y + 2, -21),
      ], false, 'catmullrom', 0.5);
      const ptrapGeo = new THREE.TubeGeometry(ptrapPath, 24, 1.0, 8, false);
      countertopGroup.add(new THREE.Mesh(ptrapGeo, pipeMat));
    });

    // Plexiglass divider outline
    const plexiGeo = new THREE.BoxGeometry(0.8, 20, 30);
    const plexi = new THREE.Mesh(plexiGeo, matGhost(0xd0e8f0, 0.15));
    plexi.position.set(0, G2_Y + G2_H + 10, -5);
    countertopGroup.add(plexi);
  }

  addCornerConnectors(scene, G2_Y + G2_H, G3_Y);

  // - GROUP 3 - Faucets + Soap dispensers (Y = G3_Y → G3_Y + G3_H) ---
  {
    const faucetsGroup = new THREE.Group();
    faucetsGroup.userData.partId = 'faucets';
    scene.add(faucetsGroup);

    ([BAY_CX_L, BAY_CX_R]).forEach((fx) => {
      const baseY = G3_Y;

      // Faucet base cylinder
      const baseGeo = new THREE.CylinderGeometry(2, 2, 6, 14);
      const base = new THREE.Mesh(baseGeo, matChrome());
      base.position.set(fx, baseY + 3, -20);
      faucetsGroup.add(base);

      // Gooseneck curve (simplified)
      const neckPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(fx, baseY + 6, -20),
        new THREE.Vector3(fx, baseY + 18, -18),
        new THREE.Vector3(fx, baseY + 24, -10),
        new THREE.Vector3(fx, baseY + 20, -2),
      ], false, 'catmullrom', 0.5);
      const neckGeo = new THREE.TubeGeometry(neckPath, 32, 0.8, 10, false);
      faucetsGroup.add(new THREE.Mesh(neckGeo, matChrome()));

      // Aerator at tip
      const aerator = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 3, 12), matChrome());
      aerator.position.set(fx, baseY + 18, -1);
      faucetsGroup.add(aerator);

      // IR sensor
      const sensor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }));
      sensor.rotation.x = Math.PI / 2;
      sensor.position.set(fx, baseY + 4, -18);
      faucetsGroup.add(sensor);
    });

    // Soap dispensers between faucets
    const soapMat = new THREE.MeshStandardMaterial({ color: 0xe0e4e8, roughness: 0.5, metalness: 0.15 });
    ([BAY_CX_L + 25, BAY_CX_R - 25]).forEach((sx) => {
      const soapBox = new THREE.Mesh(new THREE.BoxGeometry(7, 10, 5), soapMat);
      soapBox.position.set(sx, G3_Y + 5, -20);
      faucetsGroup.add(soapBox);
    });
  }

  addCornerConnectors(scene, G3_Y + G3_H, G4_Y);

  // - GROUP 4 - Backsplash + Mirror panels (Y = G4_Y → G4_Y + G4_H) --─
  {
    const backsplashGroup = new THREE.Group();
    backsplashGroup.userData.partId = 'backsplash';
    scene.add(backsplashGroup);

    // Ghost backsplash panel
    const bsGeo = new THREE.BoxGeometry(W, 30, 1.5);
    const bs = new THREE.Mesh(bsGeo, matGhost(0xa8c8d0, 0.18));
    bs.position.set(0, G4_Y + 15, -D / 2 + 1);
    backsplashGroup.add(bs);

    // Support posts (2)
    const postMat = matSS(0.15, 0.88);
    ([-W / 2 + 3, W / 2 - 3]).forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(4, G4_H, 3), postMat);
      post.position.set(px, G4_Y + G4_H / 2, -D / 2 + 3);
      backsplashGroup.add(post);
    });

    // Mirror glass panels (2) — solid slab, not Plane
    ([BAY_CX_L, BAY_CX_R]).forEach((mx) => {
      const mirror = new THREE.Mesh(
        new THREE.BoxGeometry(55, 40, 0.5),
        new THREE.MeshStandardMaterial({
          color: 0xb0e0f0, metalness: 0.1, roughness: 0.03,
          transparent: true, opacity: 0.55, side: THREE.DoubleSide, envMapIntensity: 1.5,
        }),
      );
      mirror.position.set(mx, G4_Y + 26, -D / 2 + 4);
      backsplashGroup.add(mirror);
    });

    // SS frame outline around each mirror — square chamfered corners
    const frameMat = matSS(0.10, 0.88);
    ([BAY_CX_L, BAY_CX_R]).forEach((mx) => {
      const mW = 55, mH = 40, fT = 1.5;
      const mCY = G4_Y + 26;
      const mZ = -D / 2 + 4.5;
      // top
      const topBar = new THREE.Mesh(new THREE.BoxGeometry(mW + fT * 2, fT, 1.2), frameMat);
      topBar.position.set(mx, mCY + mH / 2 + fT / 2, mZ);
      backsplashGroup.add(topBar);
      // bottom
      const botBar = new THREE.Mesh(new THREE.BoxGeometry(mW + fT * 2, fT, 1.2), frameMat);
      botBar.position.set(mx, mCY - mH / 2 - fT / 2, mZ);
      backsplashGroup.add(botBar);
      // left
      const leftBar = new THREE.Mesh(new THREE.BoxGeometry(fT, mH, 1.2), frameMat);
      leftBar.position.set(mx - mW / 2 - fT / 2, mCY, mZ);
      backsplashGroup.add(leftBar);
      // right
      const rightBar = new THREE.Mesh(new THREE.BoxGeometry(fT, mH, 1.2), frameMat);
      rightBar.position.set(mx + mW / 2 + fT / 2, mCY, mZ);
      backsplashGroup.add(rightBar);
    });
  }

  addCornerConnectors(scene, G4_Y + G4_H, G5_Y);

  // - GROUP 5 - Canopy + LED + UV (Y = G5_Y → G5_Y + G5_H) ------─
  {
    const canopyGroup = new THREE.Group();
    canopyGroup.userData.partId = 'canopy';
    scene.add(canopyGroup);

    // Canopy casing (ghost)
    const canopyGeo = new THREE.BoxGeometry(W + 4, 4, 20);
    const canopy = new THREE.Mesh(canopyGeo, matGhost(0xa8c8d0, 0.22));
    canopy.position.set(0, G5_Y + G5_H - 2, -D / 2 + 10);
    canopyGroup.add(canopy);

    const canopyEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(canopyGeo),
      new THREE.LineBasicMaterial({ color: 0x5a7a90, opacity: 0.30, transparent: true }),
    );
    canopyEdges.position.copy(canopy.position);
    canopyGroup.add(canopyEdges);

    // LED strip
    const ledGeo = new THREE.CylinderGeometry(0.4, 0.4, W - 6, 8);
    const led = new THREE.Mesh(ledGeo, matLED());
    led.rotation.z = Math.PI / 2;
    led.position.set(0, G5_Y + G5_H - 5, -D / 2 + 10);
    canopyGroup.add(led);

    // UV lamps (2 tubes)
    ([BAY_CX_L, BAY_CX_R]).forEach((uvX) => {
      const uvGeo = new THREE.CylinderGeometry(1.2, 1.2, W / 2 - 6, 10);
      const uv = new THREE.Mesh(uvGeo, matUV());
      uv.rotation.z = Math.PI / 2;
      uv.position.set(uvX, G5_Y + G5_H - 10, -D / 2 + 10);
      canopyGroup.add(uv);
    });

    // Side panels (ghost outline)
    ([-W / 2 - 2, W / 2 + 2]).forEach((sx) => {
      const sideGeo = new THREE.BoxGeometry(1, G5_H, 20);
      const side = new THREE.Mesh(sideGeo, matGhost(0xa0c0d0, 0.12));
      side.position.set(sx, G5_Y + G5_H / 2, -D / 2 + 10);
      canopyGroup.add(side);
    });
  }

  // - Annotations ----------------------------─
  placeAnnotations(
    scene,
    [
      { partId: 'canopy',
        anchor: new THREE.Vector3(W / 2 + 10, G5_Y + G5_H - 5, 0), label: 'Canopy + LED + UV Lamp' },
      { partId: 'backsplash',
        anchor: new THREE.Vector3(W / 2 + 10, G4_Y + 26, 0),       label: 'Mirror Panel + Frame ×2' },
      { partId: 'faucets',
        anchor: new THREE.Vector3(W / 2 + 10, G3_Y + 12, 0),       label: 'Gooseneck Faucet IR ×2 + Soap' },
      { partId: 'countertop',
        anchor: new THREE.Vector3(W / 2 + 10, G2_Y + 10, 0),       label: 'Countertop + Basin ×2 + P-Trap' },
      { partId: 'cabinet',
        anchor: new THREE.Vector3(W / 2 + 10, G1_Y + 32, 0),       label: 'Cabinet 4 Pintu + Pedal + Feet' },
    ],
    W / 2 + 70,
    [0, G5_Y + G5_H + 10],
  );
}

// -─ React component -----------------------------

export function ScrubSinkExploded3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { attachHighlight } = useHighlightController();

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
      attachHighlight(refs);
    },
    deps: [product],
  });

  const goTo = (p: CameraPreset) => {
    if (refsRef.current) animateCameraTo(refsRef.current, p.position, p.target, 600);
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
      setTimeout(() => { goTo(p); setTimeout(() => dl(p.name), 700); }, i * 1000),
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
