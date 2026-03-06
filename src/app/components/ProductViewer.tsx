/**
 * ProductViewer.tsx
 * Renders the 3D viewer(s) available for a given product.
 * Tabs are shown only for views declared in product.views.
 */

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Product, ViewType } from '../data/products';
import { AssembledPanel3D } from './AssembledPanel3D';
import { ExplodedPanel3D }  from './ExplodedPanel3D';
import { CurvingAssembled3D } from './CurvingAssembled3D';
import { CurvingExploded3D }  from './CurvingExploded3D';
import { HermeticDoorAssembled3D } from './HermeticDoorAssembled3D';
import { HermeticDoorExploded3D }  from './HermeticDoorExploded3D';

interface Props { product: Product }

const VIEW_LABELS: Record<ViewType, string> = {
  assembled: 'Assembled (Utuh)',
  exploded:  'Exploded (Terpisah)',
};

const VIEW_DESC: Record<ViewType, string> = {
  assembled: 'Panel tersusun lengkap, siap dipasang',
  exploded:  'Tampilan terpisah, detail setiap lapisan material',
};

export function ProductViewer({ product }: Props) {
  const [activeView, setActiveView] = useState<ViewType>(product.views[0]);
  const [specsOpen, setSpecsOpen] = useState(false);

  /* When product changes, reset to first available view */
  useEffect(() => {
    setActiveView(product.views[0]);
  }, [product.id]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Product header */}
      <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-1 mb-1">
        {/* Name + badge + description */}
        <div className="flex items-start justify-between gap-3 mb-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0 flex-wrap">
              <h2 className="text-base font-bold text-gray-800 leading-tight">{product.fullName}</h2>
              {product.badge && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${product.badgeColor ?? 'bg-gray-100 text-gray-600'}`}>
                  {product.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-1">{product.description}</p>
          </div>

          {/* Specs toggle button */}
          {product.specs.length > 0 && (
            <button
              onClick={() => setSpecsOpen(!specsOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-md transition flex-shrink-0"
            >
              <span>Spesifikasi</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${specsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Layers display */}
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Komposisi Layer ({product.layers.length} lapisan)
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-0">
          {product.layers.map((layer, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 border border-black/10"
                style={{ backgroundColor: `#${layer.color.toString(16).padStart(6, '0')}` }}
              />
              <span className="font-medium">{layer.name}</span>
              <span className="text-gray-400">{layer.thickness} mm</span>
            </div>
          ))}
        </div>

        {/* Specs table (expanded) */}
        {specsOpen && product.specs.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Spesifikasi Teknis
            </p>
            <table className="w-full text-xs text-gray-700 border-collapse">
              <tbody>
                {product.specs.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-0.5 px-2 font-medium text-gray-500 w-[45%] whitespace-nowrap">{spec.label}</td>
                    <td className="py-0.5 px-2">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View tabs */}
      {product.views.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 mb-1">
          {product.views.map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={[
                'px-4 py-1.5 rounded-lg text-sm font-semibold transition',
                activeView === v
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-blue-50 border border-gray-200',
              ].join(' ')}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      )}

      {/* 3D Viewer */}
      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {product.viewerType === 'curving' ? (
          <>
            {activeView === 'assembled' && (
              <CurvingAssembled3D key={`curving-assembled-${product.id}`} product={product} />
            )}
            {activeView === 'exploded' && (
              <CurvingExploded3D key={`curving-exploded-${product.id}`} product={product} />
            )}
          </>
        ) : product.viewerType === 'hermetic-door' ? (
          <>
            {activeView === 'assembled' && (
              <HermeticDoorAssembled3D key={`hermetic-assembled-${product.id}`} product={product} />
            )}
            {activeView === 'exploded' && (
              <HermeticDoorExploded3D key={`hermetic-exploded-${product.id}`} product={product} />
            )}
          </>
        ) : (
          <>
            {activeView === 'assembled' && (
              <AssembledPanel3D key={`assembled-${product.id}`} product={product} />
            )}
            {activeView === 'exploded' && (
              <ExplodedPanel3D key={`exploded-${product.id}`} product={product} />
            )}
          </>
        )}
      </div>

    </div>
  );
}
