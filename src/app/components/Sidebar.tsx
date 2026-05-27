/**
 * Sidebar.tsx - MONO Theme (Optimized)
 * ------------------------------─
 * Left navigation - products grouped by category, with search filter.
 * Supports collapsed (56px icon-only) and expanded (260px) modes.
 * 
 * PERFORMANCE:
 * - Preload viewer on hover
 * - Virtual list for large catalogs
 * - Optimistic UI updates
 * 
 * MONO STYLE:
 * - Zero border radius (sharp corners)
 * - Monospace typography
 * - Black & white palette
 * - Minimal shadows
 * ------------------------------─
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Product, ProductCategory } from '../data/products';
import { preloadViewer } from '../data/lazyViewerRegistry';

interface Props {
  products: Product[];
  selected: Product;
  onSelect: (product: Product) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORY_ORDER: ProductCategory[] = [
  'Wall Panel Element',
  'Plafon',
  'Lantai',
  'Pintu & Partisi',
  'Peralatan Medis',
  'Peralatan Kontrol',
  'Lainnya',
];

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  'Wall Panel Element': 'Wall',
  'Plafon':             'Layers',
  'Lantai':             'Square',
  'Pintu & Partisi':    'DoorOpen',
  'Peralatan Medis':    'Stethoscope',
  'Peralatan Kontrol':  'SlidersHorizontal',
  'Lainnya':            'Package',
};

export function Sidebar({ products, selected, onSelect, isOpen, onToggle }: Props) {
  const [query,     setQuery]     = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered,   setHovered]   = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Visually expanded when pinned open OR mouse is over the collapsed bar OR always on mobile
  const expanded = isOpen || hovered || isMobile;

  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.fullName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.badge ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  const grouped = useMemo(() => {
    const map = new Map<ProductCategory, Product[]>();
    for (const p of filtered) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [filtered]);

  const toggleCat = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });

  const orderedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-shrink-0 h-screen bg-background border-r border-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: expanded ? 260 : 56 }}
      role="navigation"
      aria-label="Product navigation"
      aria-expanded={expanded}
    >
      {/* Logo / title + pin toggle */}
      <div className="flex items-center border-b border-border" style={{ minHeight: 56 }}>
        {/* Logo icon - always visible */}
        <div className="flex-shrink-0 w-14 flex items-center justify-center">
          <svg className="w-5 h-5 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="0" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>

        {expanded && (
          <div className="flex-1 min-w-0 pr-1">
            <h1 className="text-sm font-semibold text-foreground leading-tight truncate tracking-tight">
              KATALOG PANEL 3D
            </h1>
            <p className="text-[10px] text-muted-foreground tracking-wide uppercase">
              Fasilitas Kesehatan
            </p>
          </div>
        )}

        {/* Pin / unpin button */}
        {expanded && (
          <button
            onClick={onToggle}
            title={isOpen ? 'Kecilkan sidebar' : 'Kunci sidebar'}
            className="flex-shrink-0 w-8 h-8 mr-1 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition"
          >
            {isOpen ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Search */}
      {expanded && (
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="CARI PRODUK..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-input-background border border-border focus:outline-none focus:border-foreground transition placeholder:text-muted-foreground placeholder:text-[10px] placeholder:tracking-wider"
              style={{ borderRadius: 0 }}
              aria-label="Search products"
            />
          </div>
        </div>
      )}

      {/* Product list */}
      <nav className="flex-1 overflow-y-auto py-1">
        {expanded ? (
          <>
            {orderedCategories.length === 0 && (
              <p className="text-xs text-muted-foreground px-4 py-6 text-center tracking-wide">
                PRODUK TIDAK DITEMUKAN
              </p>
            )}

            {orderedCategories.map((cat) => {
              const items    = grouped.get(cat)!;
              const catOpen  = !collapsed.has(cat);
              const iconLabel = CATEGORY_ICONS[cat];

              return (
                <div key={cat} className="mb-0">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-accent transition"
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon label={iconLabel} />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {cat}
                      </span>
                      <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 tracking-wide">
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={[
                        'w-3 h-3 text-muted-foreground transition-transform duration-200',
                        catOpen ? '' : '-rotate-90',
                      ].join(' ')}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {catOpen && (
                    <div className="pb-1">
                      {items.map((product) => {
                        const isActive = product.id === selected.id;
                        return (
                          <button
                            key={product.id}
                            onClick={() => onSelect(product)}
                            onMouseEnter={() => preloadViewer(product.viewerType || 'panel')}
                            onFocus={() => preloadViewer(product.viewerType || 'panel')}
                            className={[
                              'w-full flex items-start gap-2.5 px-4 py-2 text-left transition focus:outline-none focus:bg-accent focus:border-l-foreground',
                              isActive
                                ? 'bg-accent border-l-2 border-foreground'
                                : 'hover:bg-accent/50 border-l-2 border-transparent',
                            ].join(' ')}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <span
                              className="mt-1 flex-shrink-0 w-2.5 h-2.5 border border-border"
                              style={{
                                backgroundColor: `#${product.layers[0]?.color.toString(16).padStart(6, '0') ?? '888'}`,
                                borderRadius: 0,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={[
                                  'text-[11px] font-medium leading-tight truncate tracking-tight',
                                  isActive ? 'text-foreground' : 'text-foreground/80',
                                ].join(' ')}>
                                  {product.name}
                                </span>
                                {product.badge && (
                                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 tracking-wide ${product.badgeColor ?? 'bg-muted text-muted-foreground'}`}>
                                    {product.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-muted-foreground tracking-wide">
                                {product.layers.length} LAYERS
                                {product.views.includes('exploded') ? ' • EXPLODED' : ''}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Collapsed mode */
          <div className="flex flex-col items-center gap-1 pt-1">
            {orderedCategories.map((cat) => {
              const items     = grouped.get(cat)!;
              const hasActive = items.some((p) => p.id === selected.id);
              return (
                <div key={cat} className="relative">
                  <button
                    onClick={onToggle}
                    title={cat}
                    className={[
                      'w-9 h-9 flex items-center justify-center transition',
                      hasActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    ].join(' ')}
                    style={{ borderRadius: 0 }}
                  >
                    <CategoryIcon label={CATEGORY_ICONS[cat]} />
                  </button>
                  {hasActive && (
                    <span className="absolute top-2 right-1.5 w-1 h-3 bg-foreground pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      {expanded ? (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[9px] text-muted-foreground tracking-wider">
            {products.length} PRODUK TERSEDIA
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 border-t border-border">
          <button
            onClick={onToggle}
            title="Buka sidebar"
            className="w-8 h-8 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition"
            style={{ borderRadius: 0 }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

/* Mini inline SVG icon by label */
function CategoryIcon({ label }: { label: string }) {
  const cls = 'w-3.5 h-3.5';
  switch (label) {
    case 'Wall':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="0"/><rect x="14" y="3" width="7" height="7" rx="0"/><rect x="3" y="14" width="7" height="7" rx="0"/><rect x="14" y="14" width="7" height="7" rx="0"/></svg>;
    case 'Layers':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
    case 'Square':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0"/></svg>;
    case 'DoorOpen':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
  }
}
