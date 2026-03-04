import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Layer {
  name: string;
  thickness: number; // in mm
  color: number;
  roughness: number;
  metalness: number;
}

const LAYERS: Layer[] = [
  { name: 'Baja AZ100 (Dalam)', thickness: 0.5, color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
  { name: 'Core PIR', thickness: 75, color: 0xe8d845, roughness: 0.7, metalness: 0.0 },
  { name: 'Timbal 2mm', thickness: 2, color: 0x6e8898, roughness: 0.3, metalness: 0.7 },
  { name: 'Coating HRP', thickness: 0.05, color: 0xc8aade, roughness: 0.1, metalness: 0.1 },
  { name: 'Baja AZ100 (Luar)', thickness: 0.5, color: 0xc0ced8, roughness: 0.2, metalness: 0.8 },
];

interface CameraPreset {
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front Isometric', position: [350, 200, 450], target: [0, 0, 0] },
  { name: 'Side Detail', position: [550, 150, 100], target: [0, 0, 0] },
  { name: 'Top View', position: [0, 600, 0], target: [0, 0, 0] },
  { name: 'Layer Detail', position: [200, 100, 380], target: [0, 0, 0] },
  { name: 'Front Elevation', position: [0, 0, 500], target: [0, 0, 0] },
  { name: 'Side Elevation', position: [500, 0, 0], target: [0, 0, 0] },
];

export function ExplodedPanel3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Use timeout to ensure container has rendered with proper dimensions
    const timer = setTimeout(() => {
      if (!mountRef.current) return;

      const containerWidth = mountRef.current.clientWidth || 1200;
      const containerHeight = 650;
      const width = Math.max(containerWidth, 800);
      const height = containerHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = null;
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 10000);
      camera.position.set(350, 200, 450);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        preserveDrawingBuffer: true 
      });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;
      mountRef.current.appendChild(renderer.domElement);

      // OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 250;
      controls.maxDistance = 1000;
      controls.maxPolarAngle = Math.PI;
      controlsRef.current = controls;

      // Lights - realistic medical catalog lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
      mainLight.position.set(150, 350, 250);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 4096;
      mainLight.shadow.mapSize.height = 4096;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 1500;
      mainLight.shadow.camera.left = -300;
      mainLight.shadow.camera.right = 300;
      mainLight.shadow.camera.top = 400;
      mainLight.shadow.camera.bottom = -400;
      mainLight.shadow.bias = -0.0001;
      scene.add(mainLight);

      const fillLight = new THREE.DirectionalLight(0xe8f4ff, 1.0);
      fillLight.position.set(-200, 150, 100);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xfff8e8, 0.6);
      rimLight.position.set(200, 100, -150);
      scene.add(rimLight);

      const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
      topLight.position.set(0, 500, 0);
      scene.add(topLight);

      // Panel dimensions
      const panelWidth = 120;
      const panelHeight = 300;
      
      // WIDER explosion gap for better separation
      const explosionGap = 80;
      
      const totalThickness = LAYERS.reduce((sum, layer) => sum + layer.thickness, 0);

      // Create panel group
      const panelGroup = new THREE.Group();

      let currentZ = -totalThickness / 2 - (explosionGap * (LAYERS.length - 1)) / 2;

      // Build exploded layers
      LAYERS.forEach((layer, index) => {
        const geometry = new THREE.BoxGeometry(
          panelWidth,
          panelHeight,
          layer.thickness
        );

        const material = new THREE.MeshStandardMaterial({
          color: layer.color,
          roughness: layer.roughness,
          metalness: layer.metalness,
          side: THREE.DoubleSide,
          envMapIntensity: 1.0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        
        const explodedZ = currentZ + layer.thickness / 2;
        mesh.position.z = explodedZ;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        panelGroup.add(mesh);

        // Subtle edge lines
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x000000, 
          opacity: 0.08,
          transparent: true,
        });
        const line = new THREE.LineSegments(edges, lineMaterial);
        line.position.z = explodedZ;
        panelGroup.add(line);

        // Connection lines between layers
        if (index < LAYERS.length - 1) {
          const nextZ = currentZ + layer.thickness + explosionGap + LAYERS[index + 1].thickness / 2;
          
          // Dashed lines at corners
          const corners = [
            [-panelWidth / 2, -panelHeight / 2],
            [panelWidth / 2, -panelHeight / 2],
            [panelWidth / 2, panelHeight / 2],
            [-panelWidth / 2, panelHeight / 2],
          ];

          corners.forEach(([x, y]) => {
            const lineGeom = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(x, y, explodedZ + layer.thickness / 2),
              new THREE.Vector3(x, y, nextZ - LAYERS[index + 1].thickness / 2)
            ]);
            const dashedMaterial = new THREE.LineDashedMaterial({
              color: 0x999999,
              linewidth: 1,
              dashSize: 5,
              gapSize: 3,
              opacity: 0.3,
              transparent: true
            });
            const dashedLine = new THREE.Line(lineGeom, dashedMaterial);
            dashedLine.computeLineDistances();
            panelGroup.add(dashedLine);
          });
        }

        currentZ += layer.thickness + explosionGap;
      });

      scene.add(panelGroup);

      // Annotations - positioned to always be visible
      const annotationGroup = new THREE.Group();

      function createTextTexture(text: string, width = 512, height = 128): THREE.Texture {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      }

      // Layer annotations
      let annotationZ = -totalThickness / 2 - (explosionGap * (LAYERS.length - 1)) / 2;
      LAYERS.forEach((layer, index) => {
        const explodedZ = annotationZ + layer.thickness / 2;
        
        // Connection point on panel edge
        const dotGeometry = new THREE.SphereGeometry(2, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(panelWidth / 2 + 2, 0, explodedZ);
        annotationGroup.add(dot);

        // Annotation line - longer for better visibility
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(panelWidth / 2 + 2, 0, explodedZ),
          new THREE.Vector3(panelWidth / 2 + 120, 0, explodedZ)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        const annotationLine = new THREE.Line(lineGeometry, lineMaterial);
        annotationGroup.add(annotationLine);

        // Text sprite - positioned far enough
        const textTexture = createTextTexture(layer.name, 600, 140);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: textTexture,
          depthTest: false, // Always visible on top
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(panelWidth / 2 + 200, 0, explodedZ);
        sprite.scale.set(70, 16, 1);
        annotationGroup.add(sprite);

        annotationZ += layer.thickness + explosionGap;
      });

      scene.add(annotationGroup);

      // Animation loop
      let frameId: number;
      const animate = () => {
        frameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Cleanup
      return () => {
        cancelAnimationFrame(frameId);
        controls.dispose();
        renderer.dispose();
        if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const setCameraPreset = (preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    cameraRef.current.position.set(...preset.position);
    controlsRef.current.target.set(...preset.target);
    controlsRef.current.update();
  };

  const downloadImage = (presetName: string) => {
    if (!rendererRef.current) return;
    
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `exploded-panel-${presetName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataURL;
    link.click();
  };

  const downloadAllAngles = () => {
    CAMERA_PRESETS.forEach((preset, index) => {
      setTimeout(() => {
        setCameraPreset(preset);
        setTimeout(() => {
          downloadImage(preset.name);
        }, 200);
      }, index * 500);
    });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Control Panel */}
      <div className="bg-white/95 p-4 rounded-lg shadow-lg mb-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-semibold text-gray-700 mr-2">Camera Angles:</span>
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setCameraPreset(preset)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadAllAngles}
              className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition"
            >
              📥 Download All Angles
            </button>
            <button
              onClick={() => downloadImage('current')}
              className="px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 transition"
            >
              📷 Download Current View
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>

      {/* 3D View */}
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div ref={mountRef} className="relative shadow-2xl" />
      </div>
    </div>
  );
}