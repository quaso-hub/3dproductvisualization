import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Product } from '../data/products';
import { buildHvacEngineeringState } from './hvac-bim-v2/contract';
import { HvacBimV2Overlay } from './hvac-bim-v2/overlay';
import { applyPresentation, buildHvacScene, CAMERA_POSES, pickFocusTarget } from './hvac-bim-v2/scene';
import type { FocusTargetId, HvacScenario, HvacViewMode, PresentationState, SceneBundle } from './hvac-bim-v2/types';

export function HvacSystemBIM3D({ product }: { product: Product }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bundleRef = useRef<SceneBundle | null>(null);
  const rafRef = useRef(0);
  const cameraTweenRef = useRef<number | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const presentationRef = useRef<PresentationState>({
    mode: 'full',
    scenario: 'normal',
    hoveredFocus: null,
    selectedFocus: null,
  });

  const [mode, setMode] = useState<HvacViewMode>('full');
  const [scenario, setScenario] = useState<HvacScenario>('normal');
  const [hoveredFocus, setHoveredFocus] = useState<FocusTargetId | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<FocusTargetId | null>(null);
  const engineeringState = buildHvacEngineeringState({ product, mode, scenario, hoveredFocus, selectedFocus });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef3f8);

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.05, 400);
    camera.position.copy(CAMERA_POSES.full.position);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    /* ── PMREM Environment Map (RoomEnvironment) ─────────────────
     * Critical fix: tanpa env map, MeshStandardMaterial dengan
     * metalness >= 0.4 terlihat flat/matte. RoomEnvironment beri
     * IBL realistis untuk semua reflective surface (steel, AHU,
     * CDU casing) tanpa membebani GPU.
     */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    const envTexture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTexture;
    envScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
        else (m.material as THREE.Material).dispose();
      }
    });

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
    container.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.5;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.target.copy(CAMERA_POSES.full.target);
    controls.update();
    controlsRef.current = controls;

    /* ── Lighting (rebalanced) ─────────────────────────────────
     * Ambient turun dari 0.72 → 0.32 supaya shadow + form lebih
     * terbaca. Hemi naik dari 0.26 → 0.42 sebagai soft sky/ground
     * fill. Dengan envMap aktif, key light cukup 0.85.
     */
    scene.add(new THREE.AmbientLight(0xffffff, 0.32));
    scene.add(new THREE.HemisphereLight(0xfaffff, 0xd0dde6, 0.42));

    const sun = new THREE.DirectionalLight(0xfff5e0, 0.85);
    sun.position.set(-12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, far: 80 });
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xc8e0ff, 0.28);
    fill.position.set(14, 8, -10);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xfff0d8, 0.18);
    rim.position.set(8, 6, -16);
    scene.add(rim);

    const bundle = buildHvacScene(scene);
    bundleRef.current = bundle;
    applyPresentation(bundle, presentationRef.current);

    const toPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const updateHover = (event: PointerEvent) => {
      const nextFocus = pickFocusTarget(bundle, camera, toPointer(event));
      renderer.domElement.style.cursor = nextFocus ? 'pointer' : 'grab';
      setHoveredFocus((current) => (current === nextFocus ? current : nextFocus));
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownRef.current = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      const deltaX = Math.abs(event.clientX - pointerDownRef.current.x);
      const deltaY = Math.abs(event.clientY - pointerDownRef.current.y);
      if (deltaX > 6 || deltaY > 6) return;
      const nextFocus = pickFocusTarget(bundle, camera, toPointer(event));
      setSelectedFocus((current) => {
        if (!nextFocus) return null;
        return current === nextFocus ? null : nextFocus;
      });
    };

    const clearHover = () => {
      renderer.domElement.style.cursor = 'grab';
      setHoveredFocus(null);
    };

    renderer.domElement.addEventListener('pointermove', updateHover);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', clearHover);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (cameraTweenRef.current !== null) cancelAnimationFrame(cameraTweenRef.current);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', updateHover);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', clearHover);

      pmrem.dispose();
      renderer.dispose();
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose());
          else mesh.material?.dispose();
        }
      });

      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === container) container.removeChild(labelRenderer.domElement);
      rendererRef.current = null;
      labelRendererRef.current = null;
      bundleRef.current = null;
    };
  }, []);

  useEffect(() => {
    presentationRef.current = { mode, scenario, hoveredFocus, selectedFocus, engineeringState };
    if (bundleRef.current) {
      applyPresentation(bundleRef.current, presentationRef.current);
    }
  }, [engineeringState, hoveredFocus, mode, scenario, selectedFocus]);

  useEffect(() => {
    cameraTweenRef.current = animateCamera(mode, cameraRef.current, controlsRef.current, cameraTweenRef);
  }, [mode]);

  const handleSelectFocus = useCallback((focusTarget: FocusTargetId | null) => {
    setSelectedFocus(focusTarget);
    if (focusTarget) setHoveredFocus(null);
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" data-testid="hvac-canvas-host" />

      <HvacBimV2Overlay
        engineeringState={engineeringState}
        hoveredFocus={hoveredFocus}
        selectedFocus={selectedFocus}
        onSelectFocus={handleSelectFocus}
        mode={mode}
        scenario={scenario}
        onModeChange={setMode}
        onScenarioChange={setScenario}
      />
    </div>
  );
}

/**
 * Animated camera transition antar mode.
 * - Plan view dapat slight tilt (target Z 0.6 bukan 0) supaya
 *   OrbitControls tidak gimbal-flip saat user drag.
 * - Cancel previous tween saat mode berubah cepat.
 */
function animateCamera(
  mode: HvacViewMode,
  camera: THREE.PerspectiveCamera | null,
  controls: OrbitControls | null,
  tweenRef: React.MutableRefObject<number | null>,
): number | null {
  if (!camera) return null;
  if (tweenRef.current !== null) cancelAnimationFrame(tweenRef.current);

  const pose = CAMERA_POSES[mode];
  const fromPosition = camera.position.clone();
  const fromTarget = controls ? controls.target.clone() : pose.target.clone();

  // Anti-gimbal: plan mode set vertical look but with tiny target offset
  const safeTarget = pose.target.clone();
  if (mode === 'plan') safeTarget.z = 0.4;

  const startTime = performance.now();
  const duration = 880;
  let frameId: number = 0;

  const tick = () => {
    const t = Math.min((performance.now() - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(fromPosition, pose.position, eased);
    if (controls) {
      controls.target.lerpVectors(fromTarget, safeTarget, eased);
      controls.update();
    } else {
      camera.lookAt(safeTarget);
    }
    if (t < 1) {
      frameId = requestAnimationFrame(tick);
      tweenRef.current = frameId;
    } else {
      tweenRef.current = null;
    }
  };

  frameId = requestAnimationFrame(tick);
  tweenRef.current = frameId;
  return frameId;
}

export default HvacSystemBIM3D;
