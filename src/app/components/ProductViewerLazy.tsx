/**
 * ProductViewerLazy.tsx - OPTIMIZED LAZY LOADED VIEWER
 * ------------------------------─
 * 
 * Modern product viewer dengan:
 * - Lazy loading per viewer chunk
 * - Suspense dengan skeleton loading
 * - Error boundary dengan retry
 * - Preload on hover (di sidebar)
 * - Progress indicator
 * - Priority hints untuk important viewers
 * 
 * Performance budget per viewer:
 * - Initial mount: < 100ms
 * - Chunk load: < 500ms (cached after)
 * - Time to interactive: < 1s
 * 
 * ------------------------------─
 */

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import type { Product, ViewType } from '../data/products';
import { getLazyViewerConfig, preloadViewer } from '../data/lazyViewerRegistry';
import { ViewerSkeleton } from './ViewerSkeleton';
import { ViewerErrorBoundary } from './ViewerErrorBoundary';

interface Props { 
  product: Product;
  preloaded?: boolean;
}

const VIEW_LABELS: Record<ViewType, string> = {
  assembled: 'ASSEMBLED',
  exploded:  'EXPLODED',
};

export function ProductViewerLazy({ product, preloaded = false }: Props) {
  const [activeView, setActiveView] = useState<ViewType>(product.views[0]);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(preloaded);
  const [loadStartTime, setLoadStartTime] = useState<number>(0);
  const retryKeyRef = useRef(0);

  /* Reset view dan set loading state saat product berubah */
  useEffect(() => {
    setActiveView(product.views[0]);
    setIsLoaded(false);
    setLoadStartTime(Date.now());
    retryKeyRef.current++;
    
    // Simulate loaded after timeout (viewer should call onLoad)
    const timeout = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [product.id]);

  /* Get lazy viewer config */
  const config = useMemo(
    () => getLazyViewerConfig(product.viewerType),
    [product.viewerType]
  );

  /* Preload next product on mount */
  useEffect(() => {
    // Preload config for current product
    if (!preloaded) {
      preloadViewer(product.viewerType || 'panel');
    }
  }, [product.viewerType, preloaded]);

  /* Calculate load time untuk analytics */
  useEffect(() => {
    if (isLoaded) {
      const loadTime = Date.now() - loadStartTime;
      if (loadTime > 500) {
        console.info(`[Performance] ${product.name} loaded in ${loadTime}ms`);
      }
    }
  }, [isLoaded, loadStartTime, product.name]);

  /* Determine which component to render */
  const ViewerComponent = activeView === 'exploded'
    ? config.exploded
    : config.assembled;

  /* Unique key for error boundary resets */
  const errorBoundaryKey = `${product.id}-${retryKeyRef.current}`;

  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      role="region"
      aria-label={`${product.fullName} viewer`}
    >
      {/* - Product header -------------------─ */}
      <header className="flex-shrink-0 bg-background border border-border p-4 mb-1">
        {/* Name + badge + description */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground leading-tight tracking-tight">
                {product.fullName}
              </h2>
              {product.badge && (
                <span className={`text-[9px] font-semibold px-2 py-0.5 tracking-wider ${product.badgeColor ?? 'bg-muted text-muted-foreground'}`}>
                  {product.badge}
                </span>
              )}
              {isLoaded && (
                <span className="text-[8px] text-muted-foreground opacity-60">
                  ✓ Loaded
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground tracking-wide">{product.description}</p>
          </div>

          {/* Specs toggle */}
          {product.specs.length > 0 && (
            <button
              onClick={() => setSpecsOpen(!specsOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent border border-border transition flex-shrink-0 tracking-wider"
              style={{ borderRadius: 0 }}
              aria-expanded={specsOpen}
            >
              <span>SPEK</span>
            </button>
          )}
        </div>

        {/* Layers display */}
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          KOMPOSISI LAYER ({product.layers.length})
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {product.layers.map((layer, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-foreground">
              <span
                className="w-3 h-3 flex-shrink-0 border border-border"
                style={{ 
                  backgroundColor: `#${layer.color.toString(16).padStart(6, '0')}`,
                  borderRadius: 0,
                }}
              />
              <span className="font-medium text-[11px]">{layer.name}</span>
              <span className="text-muted-foreground text-[10px]">{layer.thickness}mm</span>
            </div>
          ))}
        </div>

        {/* Specs table (expanded) */}
        {specsOpen && product.specs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              SPESIFIKASI TEKNIS
            </p>
            <table className="w-full text-xs text-foreground border-collapse">
              <tbody>
                {product.specs.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'}>
                    <td className="py-1.5 px-2 font-medium text-muted-foreground w-[40%] whitespace-nowrap text-[11px] tracking-wide">
                      {spec.label}
                    </td>
                    <td className="py-1.5 px-2 text-[11px]">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </header>

      {/* - View tabs ---------------------- */}
      {product.views.length > 1 && (
        <nav className="flex-shrink-0 flex gap-0 mb-1" role="tablist">
          {product.views.map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              role="tab"
              aria-selected={activeView === v}
              className={[
                'px-4 py-2 text-[10px] font-semibold transition tracking-wider',
                activeView === v
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted-foreground hover:bg-accent border border-border',
              ].join(' ')}
              style={{ borderRadius: 0 }}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </nav>
      )}

      {/* - 3D Viewer (lazy loaded) --------------- */}
      <main 
        className="flex-1 min-h-0 bg-background border border-border overflow-hidden"
        role="tabpanel"
        aria-label={`${product.fullName} 3D visualization`}
      >
        <ViewerErrorBoundary 
          product={product}
          onRetry={() => { retryKeyRef.current++; }}
        >
          <Suspense 
            fallback={
              <ViewerSkeleton 
                product={product}
                estimatedLoadTime={config.estimatedSize * 10}
              />
            }
          >
            <ViewerComponent 
              product={product} 
              key={`${product.id}-${activeView}`}
            />
          </Suspense>
        </ViewerErrorBoundary>
      </main>
    </div>
  );
}

export default ProductViewerLazy;
