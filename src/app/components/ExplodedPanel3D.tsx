/**
 * ExplodedPanel3D.tsx
 * Panel exploded - setiap layer dipisah untuk tampilan katalog.
 * Lifecycle Three.js dikelola oleh hooks/useThreeScene.ts
 */

import * as THREE from 'three';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, visualThickness, buildLayerMesh,
  createAnnotationFull, downloadPNG,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

const EXPLOSION_GAP = 80;

export function ExplodedPanel3D({ product }: Props) {
  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: { cameraStart: product.explodedCameraStart },
    onInit: (refs) => {
      const { layers, dimensions } = product;
      const pw = dimensions.sceneWidth;
      const ph = dimensions.sceneHeight;

      const vt    = layers.map(visualThickness);
      const total = vt.reduce((s, t) => s + t, 0);
      const span  = total + EXPLOSION_GAP * (layers.length - 1);

      const panelGroup = new THREE.Group();
      let zCursor = -span / 2;

      layers.forEach((layer, i) => {
        const t   = vt[i];
        const grp = buildLayerMesh(layer, pw, ph, t);
        grp.position.z = zCursor + t / 2;
        panelGroup.add(grp);

        if (i < layers.length - 1) {
          const nextT = vt[i + 1];
          const zThis = zCursor + t / 2;
          const zNext = zCursor + t + EXPLOSION_GAP + nextT / 2;
          const corners: [number, number][] = [
            [-pw / 2, -ph / 2], [pw / 2, -ph / 2],
            [pw / 2,  ph / 2],  [-pw / 2, ph / 2],
          ];
          corners.forEach(([cx, cy]) => {
            const geom = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(cx, cy, zThis + t / 2),
              new THREE.Vector3(cx, cy, zNext - nextT / 2),
            ]);
            const lineMat = new THREE.LineDashedMaterial({
              color: 0x999999, dashSize: 5, gapSize: 3,
              opacity: 0.3, transparent: true,
            });
            const dl = new THREE.Line(geom, lineMat);
            dl.computeLineDistances();
            panelGroup.add(dl);
          });
        }

        zCursor += t + EXPLOSION_GAP;
      });
      refs.scene.add(panelGroup);

      let az = -span / 2;
      layers.forEach((layer, i) => {
        const t      = vt[i];
        const z      = az + t / 2;
        const anchor   = new THREE.Vector3(pw / 2 + 2, 0, z);
        const labelPos = new THREE.Vector3(pw / 2 + 140, 0, z);
        createAnnotationFull(refs.scene, anchor, labelPos, layer.name, 85);
        az += t + EXPLOSION_GAP;
      });
    },
    deps: [product],
  });

  const goToPreset = (p: CameraPreset) =>
    refsRef.current && applyCameraPreset(refsRef.current, p.position, p.target);

  const download = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-exploded-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );

  const downloadAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goToPreset(p); setTimeout(() => download(p.name), 200); }, i * 500));

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={product.cameraPresets}
        onPreset={goToPreset}
        onDownload={download}
        onDownloadAll={downloadAll}
      />
      <div className="flex-1 min-h-0">
        <div ref={mountRef} className="w-full h-full" />
      </div>
    </div>
  );
}