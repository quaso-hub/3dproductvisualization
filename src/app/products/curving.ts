import type { Product } from '../data/products';

/**
 * Curving Aluminium R40
 * ─────────────────────────────────────────────────────────────
 * Profil siku aluminium anodized dengan sudut lengkung 40°.
 * Digunakan sebagai penutup sudut dinding-lantai dan
 * dinding-ceiling agar tidak ada sudut tajam (sesuai
 * pedoman Permenkes ruang operasi).
 *
 * Dimensi:
 *   • Tinggi ekstrusi  : 3000 mm
 *   • Lebar sayap      : 40 mm × 40 mm (Alum. Angle 40×40 mm)
 *   • Tebal profil     : 2 mm
 *   • Radius lengkung  : R40 (40°)
 *
 * Pemasangan:
 *   Pop Rivets + White Silicone pada kedua sisi sayap
 * ─────────────────────────────────────────────────────────────
 */

const CURVING_R40: Product = {
  id: 'curving-r40',
  name: 'Curving R40',
  fullName: 'Curving Aluminium R40 - Profil Siku Tanpa Sudut Tajam',
  description:
    'Profil siku aluminium anodized dengan radius lengkung 40 mm untuk pertemuan dinding-lantai maupun dinding-ceiling. Sesuai persyaratan Permenkes ruang operasi: tidak ada sudut tajam untuk kemudahan pembersihan.',
  category: 'Pintu & Partisi',
  badge: 'Ruang Operasi',
  badgeColor: 'bg-blue-100 text-blue-700',
  viewerType: 'curving',
  views: ['assembled', 'exploded'],

  /**
   * "layers" untuk curving digunakan sebagai komponen instalasi,
   * bukan flat sandwich. Urutan = dari dalam ke luar (seperti exploded).
   *
   * Layer 1 : Dinding/Panel (konteks pemasangan — tidak ikut explode)
   * Layer 2 : Aluminium Angle 40×40 mm (body utama)
   * Layer 3 : White Silicone Sealant (2 sisi)
   * Layer 4 : Pop Rivets (fastener)
   * Layer 5 : Anodized Coating (permukaan luar)
   */
  layers: [
    { name: 'Aluminium Angle 40×40 mm', thickness: 2,    color: 0xd4dde6, roughness: 0.15, metalness: 0.85 },
    { name: 'White Silicone Sealant',   thickness: 2,    color: 0xf8f8f4, roughness: 0.6,  metalness: 0.0  },
    { name: 'Pop Rivets (Ø4 mm)',        thickness: 4,    color: 0xa8b4be, roughness: 0.2,  metalness: 0.9  },
    { name: 'Anodized Coating',         thickness: 0.02, color: 0xc8d8e8, roughness: 0.08, metalness: 0.95 },
  ],

  dimensions: {
    widthMm:    40,
    heightMm:   3000,
    sceneWidth: 40,   // sayap 40 mm → 40 scene-units
    sceneHeight: 300, // 3000 mm → 300 scene-units (1:10 scale)
  },

  specs: [
    { label: 'Material',         value: 'Aluminium Anodized' },
    { label: 'Profil',           value: 'Angle 40 × 40 mm' },
    { label: 'Tebal Profil',     value: '2 mm' },
    { label: 'Radius Lengkung',  value: 'R40 - 40 mm' },
    { label: 'Tinggi Standar',   value: '3000 mm' },
    { label: 'Sambungan',        value: 'Pop Rivets + White Silicone' },
    { label: 'Finishing',        value: 'Anodized (Silver)' },
    { label: 'Aplikasi',         value: 'Ruang Operasi, ICU, Cleanroom' },
    { label: 'Standar',          value: 'Sesuai Pedoman Permenkes' },
    { label: 'Posisi Pasang',    value: 'Dinding-Lantai / Dinding-Ceiling' },
  ],

  cameraPresets: [
    // Assembled — target di titik sudut profil (0,0,0), profil di kuadran -X,+Y
    { name: 'Isometric',        position: [160, 130, 220],  target: [0, 20, 0] },
    { name: 'Detail Sudut',     position: [60,  35,  100],  target: [-10, 10, 0] },
    { name: 'Tampak Depan',     position: [0,   20,  280],  target: [0,  20, 0] },
    { name: 'Tampak Samping',   position: [280, 20,  0],    target: [0,  20, 0] },
    { name: 'Tampak Atas',      position: [0,   280, 0],    target: [0,  20, 0] },
    { name: 'Detail Rivets',    position: [50,  10,  80],   target: [0, -5,  0] },
  ],

  assembledCameraStart: [160, 130, 220],
  explodedCameraStart:  [180, 130, 320],
};

export default CURVING_R40;
