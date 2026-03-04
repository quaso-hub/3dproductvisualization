import { AssembledPanel3D } from './components/AssembledPanel3D';
import { ExplodedPanel3D } from './components/ExplodedPanel3D';

export default function App() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Panel Dinding Sandwich - Visualisasi 3D</h1>
          <p className="text-gray-600 text-sm">Sistem panel 5 lapisan untuk fasilitas kesehatan dengan proteksi radiasi opsional</p>
        </div>

        <div className="space-y-12">
          {/* Assembled View */}
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Assembled Panel (Utuh)</h2>
              <p className="text-xs text-gray-500 mb-4">Panel dalam keadaan tersusun lengkap - siap dipasang</p>
              <div className="w-full" style={{ height: '750px' }}>
                <AssembledPanel3D />
              </div>
            </div>
          </div>

          {/* Exploded View */}
          <div className="w-full">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Exploded View (Terpisah)</h2>
              <p className="text-xs text-gray-500 mb-4">Tampilan terpisah menunjukkan detail setiap lapisan panel</p>
              <div className="w-full" style={{ height: '750px' }}>
                <ExplodedPanel3D />
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Spesifikasi Teknis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Dimensi Standar</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Lebar: 1200 mm</li>
                <li>• Tinggi: 3000 mm</li>
                <li>• Ketebalan: 50/75/100 mm</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Material</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Face: Baja AZ100</li>
                <li>• Core: PIR Foam</li>
                <li>• Coating: HRP Anti-bacterial</li>
                <li>• Timbal: 2mm (opsional)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Keunggulan</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Anti korosi & karat</li>
                <li>• Anti jamur & bacterial</li>
                <li>• Insulasi termal superior</li>
                <li>• Ketahanan api tinggi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Aplikasi</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Standar Permenkes</li>
                <li>• Ruang operasi</li>
                <li>• Ruang radiologi</li>
                <li>• Fasilitas kesehatan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}