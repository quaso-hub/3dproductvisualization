# Panduan Universal: Visualisasi 3D Panel Berlapis untuk Katalog Print

## Konteks & Tujuan
Dokumentasi ini untuk membuat visualisasi 3D produk berlapis (sandwich panels, composites, dll) dengan kualitas katalog profesional untuk keperluan print/marketing medis/industri.

## Prinsip Desain Utama

### 1. **Tampilan Realistis untuk Print**
- Background **HARUS transparent** (alpha: true di renderer)
- Lighting kelas katalog medis: kombinasi ambient + directional lights dengan intensitas tinggi
- Material properties sesuai spesifikasi fisik (metalness, roughness)
- Shadow mapping dengan resolusi tinggi (4096x4096)
- Anti-aliasing enabled
- Tone mapping: ACESFilmicToneMapping

### 2. **Dua Mode Visualisasi Terpisah**
Buat **2 komponen berbeda**, JANGAN gabung dalam 1 komponen:
- **Assembled View**: Panel utuh dengan semua layer menyatu
- **Exploded View**: Layer terpisah dengan jarak lebar untuk visibilitas maksimal

### 3. **Kontrol Manual - TANPA Animasi Otomatis**
- ❌ TIDAK ADA auto-rotation
- ❌ TIDAK ADA animasi futuristik/floating
- ✅ Drag untuk rotate (OrbitControls)
- ✅ Scroll untuk zoom
- ✅ Right-click untuk pan
- ✅ Damping untuk smooth interaction

## Solusi Masalah Layer Tipis

### CRITICAL: Visual Thickness Scaling
Ketika ada layer dengan perbedaan thickness ekstrem (contoh: 0.05mm vs 75mm):

```typescript
// SCALE UP thin layers agar visible
const visualThickness = LAYERS.map(layer => {
  if (layer.thickness < 1) return layer.thickness * 20; // Very thin
  if (layer.thickness < 5) return layer.thickness * 8;  // Thin
  return layer.thickness; // Normal/thick - no scaling
});

// Gunakan visualThickness untuk rendering, BUKAN thickness asli
const totalThickness = visualThickness.reduce((sum, t) => sum + t, 0);
```

**Tanpa scaling ini**, layer tipis (coating, foil, dll) tidak akan terlihat sama sekali!

## Annotation System

> **[2026-03-06 — SYSTEM FULLY REPLACED]**
> Seluruh sistem annotation lama (SpriteMaterial, CanvasTexture, spreadAnnotationLabels) sudah diganti.
> Gunakan `placeAnnotations()` dari `lib/three-scene.ts`. Jangan pakai yang lama.

### API Baru: `placeAnnotations()`

```typescript
import { placeAnnotations } from '../lib/three-scene';

// Kumpulkan semua annotation dulu dalam satu array
const annotItems: { anchor: THREE.Vector3; label: string; labelZ?: number }[] = [];

layers.forEach((layer, i) => {
  const z = layerCenterZ; // posisi Z pusat layer di scene
  annotItems.push({
    anchor: new THREE.Vector3(geometryRightEdge, 0, z),
    label: layer.name,
    labelZ: z,  // pakai ini di exploded view agar label sejajar layer
  });
});

// Satu panggilan — semua selesai
placeAnnotations(scene, annotItems, geometryRightEdge + 70, [yMin, yMax]);
```

**Parameter:**
- `labelX` — posisi X kolom label (sisi kanan geometry)
- `yRange` — `[yMin, yMax]` rentang Y untuk sebaran label; gunakan batas visual geometry

**Yang terjadi di balik layar:**
1. Items diurutkan berdasarkan `anchor.y` descending — anchor paling atas → label paling atas
2. Label didistribusikan merata di seluruh `yRange`
3. Setiap annotation mendapat **elbow line dua segmen**: `anchor → knee (labelX-12, labelY) → label (labelX, labelY)`
4. Kedua segmen: `depthTest:false`, `renderOrder:998` — tidak pernah tertutup geometry
5. Dot biru `0x3b82f6` di setiap anchor
6. Label ringan: `rgba(255,255,255,0.78)` bg, tanpa border, tanpa shadow

### Nilai labelX dan yRange per Viewer

| Viewer | labelX | yRange |
|--------|--------|--------|
| AssembledPanel3D | `pw/2 + 68` | `[-ph/3, ph/3]` |
| ExplodedPanel3D | `pw/2 + 68` | `[-ph/3, ph/3]` |
| CurvingAssembled3D | `W + 60` | `[-W*0.8, W*1.2]` |
| CurvingExploded3D | `W + 65` | `[-W*0.8, W*1.2]` |
| HermeticDoorAssembled3D | `HW/2 + 35` | `[-DH/2+10, DH/2+HH+10]` |
| HermeticDoorExploded3D | `DW/2 + 70` | `[-DH/2-15, DH/2+15]` |

### ⚠️ Jangan Gunakan Ini (Legacy / Broken)

```typescript
// ❌ JANGAN — spreadAnnotationLabels mutasi labelPos.y tapi anchor tetap
// Hasilnya: garis diagonal aneh dari sudut kamera manapun
spreadAnnotationLabels(annotItems, 22);

// ❌ JANGAN — pendekatan manual lama
scene.add(createAnnotationDot(anchor));
createAnnotationLine(scene, anchor, labelPos);
createLabel(scene, labelPos, label);

// ❌ JANGAN — SpriteMaterial/CanvasTexture sudah ditinggalkan
const spriteMaterial = new THREE.SpriteMaterial({ map: textTexture, depthTest: false });
```

### Pelajaran Menyakitkan (Jangan Ulangi)

**Masalah `spreadAnnotationLabels` yang sudah dicoba 3x dan gagal:**
- Fungsi hanya memindahkan `labelPos.y` tapi `anchor` tetap di posisi asli
- Akibatnya: garis leader menjadi diagonal liar dari kamera manapun selain front view
- Sudah dicoba ±30 alternation → masih overlap di layer padat
- Sudah dicoba spread dengan jarak lebih besar → garis semakin aneh
- **Solusi benar**: pindahkan KEDUA ujung garis — gunakan elbow dimana segmen horizontal selalu di Y label

**Masalah label CSS terlalu berat:**
- Border + box-shadow + font-weight:600 → terlihat kaku/klinis ("AI UI")
- Solusi: `rgba(255,255,255,0.78)` tanpa border, tanpa shadow, font-weight:400

**Masalah `depthTest: true` (default):**
- Annotation tertutup geometry jika kamera tidak tepat di depan
- **Selalu**: `depthTest:false`, `depthWrite:false` pada semua material annotation

### CSS2D Labels (Detail Teknis)

Label menggunakan `CSS2DRenderer` yang sudah setup di `createScene()`.
CSS label saat ini (`createLabel()`):
```css
background: rgba(255,255,255,0.78);
font: 400 10px/1.55 Inter, system-ui, Arial, sans-serif;
color: #1e293b;
padding: 2px 6px;
border-radius: 3px;
white-space: nowrap;
pointer-events: none;
```
Jangan tambahkan border/shadow — akan terlihat kotak dan kaku.



## Exploded View Configuration

### Jarak Eksplosi yang Tepat
```typescript
const explosionGap = 80; // Gap lebar untuk visibilitas maksimal

// Hitung posisi dengan gap explosion
let currentZ = -totalThickness / 2 - (explosionGap * (LAYERS.length - 1)) / 2;

LAYERS.forEach((layer, index) => {
  const thickness = visualThickness[index];
  const explodedZ = currentZ + thickness / 2;
  
  mesh.position.z = explodedZ;
  
  currentZ += thickness + explosionGap; // Add gap setelah layer
});
```

### Connection Lines (Optional)
```typescript
// Dashed lines di 4 corners untuk show layer relationship
const corners = [
  [-panelWidth / 2, -panelHeight / 2],
  [panelWidth / 2, -panelHeight / 2],
  [panelWidth / 2, panelHeight / 2],
  [-panelWidth / 2, panelHeight / 2],
];

const dashedMaterial = new THREE.LineDashedMaterial({
  color: 0x999999,
  linewidth: 1,
  dashSize: 5,
  gapSize: 3,
  opacity: 0.3,
  transparent: true
});
```

## Camera Presets Profesional

Minimal 6 preset angles untuk keperluan katalog:
```typescript
const CAMERA_PRESETS: CameraPreset[] = [
  { name: 'Front Isometric', position: [350, 200, 450], target: [0, 0, 0] },
  { name: 'Side Detail', position: [550, 150, 100], target: [0, 0, 0] },
  { name: 'Top View', position: [0, 600, 0], target: [0, 0, 0] },
  { name: 'Layer Detail', position: [200, 100, 380], target: [0, 0, 0] },
  { name: 'Front Elevation', position: [0, 0, 500], target: [0, 0, 0] },
  { name: 'Side Elevation', position: [500, 0, 0], target: [0, 0, 0] },
];
```

## Download Functionality

### Critical: preserveDrawingBuffer
```typescript
const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  alpha: true,
  preserveDrawingBuffer: true // WAJIB untuk download!
});
```

### Download Single & Batch
```typescript
const downloadImage = (presetName: string) => {
  if (!rendererRef.current) return;
  
  const dataURL = rendererRef.current.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `panel-${presetName.toLowerCase().replace(/\s+/g, '-')}.png`;
  link.href = dataURL;
  link.click();
};

// Download all angles dengan delay
const downloadAllAngles = () => {
  CAMERA_PRESETS.forEach((preset, index) => {
    setTimeout(() => {
      setCameraPreset(preset);
      setTimeout(() => {
        downloadImage(preset.name);
      }, 200); // Wait for render
    }, index * 500); // Stagger downloads
  });
};
```

## Lighting Setup Profesional

```typescript
// Ambient - base illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Main light - key light dengan shadow
const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
mainLight.position.set(150, 350, 250);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 4096;  // High resolution
mainLight.shadow.mapSize.height = 4096;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 1500;
mainLight.shadow.camera.left = -300;
mainLight.shadow.camera.right = 300;
mainLight.shadow.camera.top = 400;
mainLight.shadow.camera.bottom = -400;
mainLight.shadow.bias = -0.0001;
scene.add(mainLight);

// Fill light - soften shadows
const fillLight = new THREE.DirectionalLight(0xe8f4ff, 1.0);
fillLight.position.set(-200, 150, 100);
scene.add(fillLight);

// Rim light - edge definition
const rimLight = new THREE.DirectionalLight(0xfff8e8, 0.6);
rimLight.position.set(200, 100, -150);
scene.add(rimLight);

// Top light - reduce harsh shadows
const topLight = new THREE.DirectionalLight(0xffffff, 0.4);
topLight.position.set(0, 500, 0);
scene.add(topLight);
```

## Material System

```typescript
interface Layer {
  name: string;
  thickness: number; // mm - actual specification
  color: number;     // Hex color
  roughness: number; // 0.0-1.0 (0=mirror, 1=matte)
  metalness: number; // 0.0-1.0 (0=non-metal, 1=metal)
}

const material = new THREE.MeshStandardMaterial({
  color: layer.color,
  roughness: layer.roughness,
  metalness: layer.metalness,
  side: THREE.DoubleSide,
  envMapIntensity: 1.0,
});
```

### Material Guidelines
- **Baja/Steel**: metalness: 0.7-0.8, roughness: 0.2-0.3
- **Foam/PIR**: metalness: 0.0, roughness: 0.7-0.9
- **Timbal/Lead**: metalness: 0.6-0.7, roughness: 0.3-0.4
- **Coating**: metalness: 0.1-0.2, roughness: 0.1-0.2

## Edge Lines untuk Definition

```typescript
const edges = new THREE.EdgesGeometry(geometry);
const lineMaterial = new THREE.LineBasicMaterial({ 
  color: 0x000000, 
  opacity: 0.15, // Subtle, tidak dominan
  transparent: true,
});
const line = new THREE.LineSegments(edges, lineMaterial);
```

## Canvas & Responsive Handling

```typescript
// Use timeout untuk ensure proper dimensions
const timer = setTimeout(() => {
  if (!mountRef.current) return;

  const containerWidth = mountRef.current.clientWidth || 1200;
  const containerHeight = 650;
  const width = Math.max(containerWidth, 800); // Minimum width
  const height = containerHeight;

  // Setup renderer dengan dimensions
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}, 100);
```

## UI Control Panel

```typescript
<div className="bg-white/95 p-4 rounded-lg shadow-lg mb-4">
  <div className="flex flex-wrap gap-2 items-center justify-between">
    {/* Camera preset buttons */}
    <div className="flex flex-wrap gap-2">
      <span className="text-sm font-semibold text-gray-700 mr-2">
        Camera Angles:
      </span>
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
    
    {/* Download buttons */}
    <div className="flex gap-2">
      <button onClick={downloadAllAngles}>
        📥 Download All Angles
      </button>
      <button onClick={() => downloadImage('current')}>
        📷 Download Current View
      </button>
    </div>
  </div>
  
  {/* Instruction text */}
  <p className="text-xs text-gray-500 mt-2">
    🖱️ Drag to rotate • Scroll to zoom • Right-click to pan
  </p>
</div>
```

## Package Requirements

```json
{
  "dependencies": {
    "three": "^0.170.0",
    "react": "^18.x",
    "@types/three": "^0.170.0"
  }
}
```

Import OrbitControls dengan path yang benar:
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
```

## Checklist Kualitas Final

- [ ] Transparent background (renderer alpha: true)
- [ ] Layer tipis sudah di-scale agar visible (`visualThickness()`)
- [ ] Annotation menggunakan `placeAnnotations()` — BUKAN `spreadAnnotationLabels`
- [ ] `labelX` dan `yRange` sesuai tabel di copilot-instructions.md
- [ ] Label CSS ringan: tanpa border, tanpa shadow
- [ ] `depthTest:false` pada semua material annotation (otomatis dari `placeAnnotations`)
- [ ] `preserveDrawingBuffer: true` untuk download
- [ ] Minimal 6 camera presets profesional
- [ ] Download current view & all angles working
- [ ] Manual controls smooth (damping enabled)
- [ ] TIDAK ADA auto-rotation/animation
- [ ] Lighting setup 4-point (ambient, main, fill, rim)
- [ ] Shadow resolution tinggi (4096x4096)
- [ ] Material properties sesuai spesifikasi
- [ ] Edge lines subtle (opacity 0.12-0.15)
- [ ] Exploded gap cukup lebar (EXPLOSION_GAP ≥ 30 units)
- [ ] ResizeObserver init pattern (bukan setTimeout)
- [ ] Proper cleanup pada unmount (`disposeScene`)

## Common Pitfalls & Solutions

### ❌ Problem: Layer tipis tidak terlihat
✅ **Solution**: Scale visual thickness (< 1mm = 20x, < 5mm = 8x) via `visualThickness(layer)` dari `lib/three-scene.ts`

### ❌ Problem: Annotation garis diagonal liar dari sudut kamera
✅ **Solution**: Gunakan `placeAnnotations()` dengan elbow dua segmen. JANGAN pakai `spreadAnnotationLabels` — ia hanya memindahkan label Y, anchor tetap, hasilnya diagonal aneh.

### ❌ Problem: Annotation label overlap / bertumpuk
✅ **Solution**: `placeAnnotations()` dengan `yRange` yang mencakup seluruh rentang visual geometry. Labels didistribusikan merata otomatis.

### ❌ Problem: Annotation tertutup layer 3D
✅ **Solution**: `depthTest:false`, `depthWrite:false`, `renderOrder:998/999` pada SEMUA material annotation — sudah dihandle `placeAnnotations()` secara otomatis.

### ❌ Problem: Label terlihat kotak/kaku/klinis
✅ **Solution**: Hapus border dan box-shadow. Gunakan `rgba(255,255,255,0.78)` bg, font-weight:400, bukan bold. `createLabel()` di `three-scene.ts` sudah benar.

### ❌ Problem: Download gambar tidak berfungsi
✅ **Solution**: Set `preserveDrawingBuffer: true` di renderer options (sudah ada di `createScene()`)

### ❌ Problem: Canvas height 0 / scene tidak muncul
✅ **Solution**: Jangan init Three.js di `useEffect` dengan timeout. Gunakan `ResizeObserver` pattern — init hanya dipanggil saat `container.clientWidth > 0 && container.clientHeight > 0`.

### ❌ Problem: `Object.assign` error pada Three.js Object3D
✅ **Solution**: `Object3D.position` adalah read-only getter/setter. Jangan `Object.assign(mesh, { position: new Vector3(...) })`. Gunakan `mesh.position.set(x,y,z)` atau `mesh.position.copy(v)`.

### ❌ Problem: Material terlihat flat / tidak realistis
✅ **Solution**: 4-point lighting + proper metalness/roughness + `RoomEnvironment` untuk custom viewers + `ACESFilmicToneMapping`.

### ❌ Problem: Housing hermetic door masuk ke dalam dinding
✅ **Solution**: Axis math `ExtrudeGeometry` yang benar — lihat bagian Hermetic Door di `copilot-instructions.md`. `position.z = DT/2 - 4` protrudes forward, bukan `position.z = -HDT/2`.

### ❌ Problem: Token budget habis di tengah edit multi-file
✅ **Solution**: Baca conversation summary dengan cermat. Tandai file yang sudah selesai vs belum. Selalu commit setelah tiap milestone, bukan setelah semua selesai.

---

## Template Structure

```
/src/app/
  ├── App.tsx                      # Main component with tabs/router
  ├── components/
  │   ├── AssembledPanel3D.tsx    # Assembled view component
  │   └── ExplodedPanel3D.tsx     # Exploded view component
  └── ...
```

**PENTING**: Pisahkan assembled dan exploded dalam 2 file terpisah untuk maintainability!

---

**Catatan Akhir**: Dokumentasi ini untuk **katalog print profesional**, bukan demo interaktif web. Prioritas: kualitas visual > interaksi fancy.
