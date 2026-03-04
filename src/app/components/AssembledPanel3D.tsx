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
  { name: 'Front Isometric', position: [250, 180, 350], target: [0, 0, 0] },
  { name: 'Side Detail', position: [400, 100, 50], target: [0, 0, 0] },
  { name: 'Top View', position: [0, 450, 0], target: [0, 0, 0] },
  { name: 'Layer Detail', position: [150, 80, 280], target: [0, 0, 0] },
  { name: 'Front Elevation', position: [0, 0, 400], target: [0, 0, 0] },
  { name: 'Side Elevation', position: [400, 0, 0], target: [0, 0, 0] },
];

export function AssembledPanel3D() {
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
      camera.position.set(250, 180, 350);
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

      // OrbitControls for manual rotation
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 200;
      controls.maxDistance = 800;
      controls.maxPolarAngle = Math.PI;
      controlsRef.current = controls;

      // Lights - more realistic medical catalog lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Main key light (soft, from top-front)
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

      // Fill light (cool, from left)
      const fillLight = new THREE.DirectionalLight(0xe8f4ff, 1.0);
      fillLight.position.set(-200, 150, 100);
      scene.add(fillLight);

      // Rim light (warm, from back-right)
      const rimLight = new THREE.DirectionalLight(0xfff8e8, 0.6);
      rimLight.position.set(200, 100, -150);
      scene.add(rimLight);

      // Soft top light
      const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
      topLight.position.set(0, 500, 0);
      scene.add(topLight);

      // Panel dimensions (mm scale, scaled down)
      const panelWidth = 120; // 1200mm
      const panelHeight = 300; // 3000mm
      
      // SCALE UP thin layers for visibility
      const visualThickness = LAYERS.map(layer => {
        if (layer.thickness < 1) return layer.thickness * 20; // Scale up very thin layers
        if (layer.thickness < 5) return layer.thickness * 8;  // Scale up thin layers
        return layer.thickness; // Keep thick layers as is
      });
      
      const totalThickness = visualThickness.reduce((sum, t) => sum + t, 0);

      // Create panel group
      const panelGroup = new THREE.Group();

      let currentZ = -totalThickness / 2;

      // Build layers with more realistic materials
      LAYERS.forEach((layer, index) => {
        const thickness = visualThickness[index];
        
        const geometry = new THREE.BoxGeometry(
          panelWidth,
          panelHeight,
          thickness
        );

        const material = new THREE.MeshStandardMaterial({
          color: layer.color,
          roughness: layer.roughness,
          metalness: layer.metalness,
          side: THREE.DoubleSide,
          envMapIntensity: 1.0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = currentZ + thickness / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        panelGroup.add(mesh);

        // Subtle edge lines
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x000000, 
          opacity: 0.15,
          transparent: true,
        });
        const line = new THREE.LineSegments(edges, lineMaterial);
        line.position.z = currentZ + thickness / 2;
        panelGroup.add(line);

        currentZ += thickness;
      });

      scene.add(panelGroup);

      // Annotations - positioned to always be visible
      const annotationGroup = new THREE.Group();

      function createTextTexture(text: string, width = 800, height = 180): THREE.Texture {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = width;
        canvas.height = height;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      }

      // Layer annotations - with VERTICAL offset to prevent overlap
      let annotationZ = -totalThickness / 2;
      const annotationOffsets = [
        { horizontal: 100, vertical: 40 },    // Baja Dalam
        { horizontal: 110, vertical: 0 },     // Core PIR (center reference)
        { horizontal: 105, vertical: -25 },   // Timbal
        { horizontal: 115, vertical: -50 },   // Coating HRP
        { horizontal: 95, vertical: -80 }     // Baja Luar
      ];
      
      LAYERS.forEach((layer, index) => {
        const layerZ = annotationZ + visualThickness[index] / 2;
        const offset = annotationOffsets[index];
        
        // Connection point on panel edge
        const dotGeometry = new THREE.SphereGeometry(3, 16, 16);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(panelWidth / 2 + 2, 0, layerZ);
        annotationGroup.add(dot);

        // Annotation line - goes to different heights
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(panelWidth / 2 + 2, 0, layerZ),
          new THREE.Vector3(panelWidth / 2 + offset.horizontal, offset.vertical, layerZ)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2.5 });
        const annotationLine = new THREE.Line(lineGeometry, lineMaterial);
        annotationGroup.add(annotationLine);

        // Text sprite - positioned at different heights
        const textTexture = createTextTexture(layer.name, 850, 200);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: textTexture,
          depthTest: false,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(panelWidth / 2 + offset.horizontal + 70, offset.vertical, layerZ);
        sprite.scale.set(100, 22, 1);
        annotationGroup.add(sprite);

        annotationZ += visualThickness[index];
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

    // Cleanup timeout
    return () => {
      clearTimeout(timer);
    };
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
    link.download = `assembled-panel-${presetName.toLowerCase().replace(/\s+/g, '-')}.png`;
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