/**
 * AssembledPanel3D.tsx
 * Panel utuh - semua layer menyatu.
 * Lifecycle Three.js dikelola oleh hooks/useThreeScene.ts
 */

import { useState } from 'react';
import * as THREE from 'three';
import type { Product, CameraPreset } from '../data/products';
import {
  applyCameraPreset, visualThickness, buildLayerMesh,
  createLabel, createAnnotationDot, createAnnotationLine, downloadPNG,
} from '../lib/three-scene';
import { useThreeScene } from '../hooks/useThreeScene';
import { ViewerControls } from './ViewerControls';

interface Props { product: Product }

export function AssembledPanel3D({ product }: Props) {
  const [activePreset, setActivePreset] = useState<string>(
    product.cameraPresets[0]?.name ?? '',
  );

  const { mountRef, refsRef } = useThreeScene({
    sceneOptions: { cameraStart: product.assembledCameraStart },
    onInit: (refs) => {
      const { layers, dimensions } = product;
      const pw = dimensions.sceneWidth;
      const ph = dimensions.sceneHeight;

      const vt    = layers.map(visualThickness);
      const total = vt.reduce((s, t) => s + t, 0);
      let zCursor = -total / 2;

      const panelGroup = new THREE.Group();
      layers.forEach((layer, i) => {
        const t   = vt[i];
        const grp = buildLayerMesh(layer, pw, ph, t);
        grp.position.z = zCursor + t / 2;
        panelGroup.add(grp);
        zCursor += t;
      });
      refs.scene.add(panelGroup);

      /* Annotations — CSS2D labels, positioned at right edge of each layer */
      let az = -total / 2;
      layers.forEach((layer, i) => {
        const t    = vt[i];
        const z    = az + t / 2;
        const yOff     = (i % 2 === 0) ? 30 : -30;
        const anchor   = new THREE.Vector3(pw / 2 + 2, 0, z);
        const labelPos = new THREE.Vector3(pw / 2 + 65, yOff, z);
        refs.scene.add(createAnnotationDot(anchor));
        createAnnotationLine(refs.scene, anchor, labelPos);
        createLabel(refs.scene, labelPos, layer.name);
        az += t;
      });
    },
    deps: [product],
  });

  const goToPreset = (p: CameraPreset) => {
    if (refsRef.current) applyCameraPreset(refsRef.current, p.position, p.target);
    setActivePreset(p.name);
  };

  const download = (name: string) =>
    refsRef.current && downloadPNG(
      refsRef.current.renderer,
      `${product.id}-assembled-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
    );

  const downloadAll = () =>
    product.cameraPresets.forEach((p, i) =>
      setTimeout(() => { goToPreset(p); setTimeout(() => download(p.name), 200); }, i * 500));

  return (
    <div className="w-full h-full flex flex-col">
      <ViewerControls
        presets={product.cameraPresets}
        activePreset={activePreset}
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