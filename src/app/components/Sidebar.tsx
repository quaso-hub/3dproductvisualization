/**
 * Sidebar.tsx
 * Left navigation - products grouped by category, with search filter.
 * Supports collapsed (56 px icon-only) and expanded (260 px) modes.
 * Hover over collapsed sidebar to temporarily expand.
 */

import { useState, useMemo } from 'react';
import type { Product, ProductCategory } from '../data/products';

interface Props {
  products: Product[];
  selected: Product;
  onSelect: (product: Product) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORY_ORDER: ProductCategory[] = [
  'Panel Dinding',
  'Cleanroom',
  'Plafon',
  'Lantai',
  'Pintu & Partisi',
  'Lainnya',
];

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  'Panel Dinding':    'Wall',
  'Cleanroom':        'Wind',
  'Plafon':           'Layers',
  'Lantai':           'Square',
  'Pintu & Partisi':  'DoorOpen',
  'Lainnya':          'Package',
};

export function Sidebar({ products, selected, onSelect, isOpen, onToggle }: Props) {
  const [query,     setQuery]     = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hovered,   setHovered]   = useState(false);

  // Visually expanded when pinned open OR mouse is over the collapsed bar
  const expanded = isOpen || hovered;

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
      className="flex-shrink-0 h-screen bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: expanded ? 260 : 56 }}
    >
      {/* Logo / title + pin toggle */}
      <div className="flex items-center border-b border-gray-100" style={{ minHeight: 56 }}>
        {/* Logo icon - always visible */}
        <div className="flex-shrink-0 w-14 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>

        {expanded && (
          <div className="flex-1 min-w-0 pr-1">
            <h1 className="text-sm font-bold text-gray-800 leading-tight truncate">Katalog Panel 3D</h1>
            <p className="text-[11px] text-gray-400">Fasilitas Kesehatan</p>
          </div>
        )}

        {/* Pin / unpin button - only visible when expanded */}
        {expanded && (
          <button
            onClick={onToggle}
            title={isOpen ? 'Kecilkan sidebar' : 'Kunci sidebar'}
            className="flex-shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            {isOpen ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Search - visible only when expanded */}
      {expanded && (
        <div className="px-3 py-2.5 border-b border-gray-100">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Cari produk..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition"
            />
          </div>
        </div>
      )}

      {/* Product list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {expanded ? (
          <>
            {orderedCategories.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-6 text-center">Produk tidak ditemukan.</p>
            )}

            {orderedCategories.map((cat) => {
              const items    = grouped.get(cat)!;
              const catOpen  = !collapsed.has(cat);
              const iconLabel = CATEGORY_ICONS[cat];

              return (
                <div key={cat} className="mb-0.5">
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon label={iconLabel} />
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {cat}
                      </span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>
                    <svg
                      className={[
                        'w-3 h-3 text-gray-400 transition-transform duration-200',
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
                            className={[
                              'w-full flex items-start gap-2 px-4 py-2 text-left transition',
                              isActive
                                ? 'bg-blue-50 border-r-2 border-blue-600'
                                : 'hover:bg-gray-50 border-r-2 border-transparent',
                            ].join(' ')}
                          >
                            <span
                              className="mt-0.5 flex-shrink-0 w-2.5 h-2.5 rounded-sm border border-black/10"
                              style={{
                                backgroundColor: `#${product.layers[0]?.color.toString(16).padStart(6, '0') ?? 'ccc'}`,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={[
                                  'text-xs font-medium leading-tight truncate',
                                  isActive ? 'text-blue-700' : 'text-gray-700',
                                ].join(' ')}>
                                  {product.name}
                                </span>
                                {product.badge && (
                                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${product.badgeColor ?? 'bg-gray-100 text-gray-500'}`}>
                                    {product.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 leading-snug line-clamp-1">
                                {product.layers.length} lapisan
                                {product.views.includes('exploded') ? ' · Exploded' : ''}
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
          /* Collapsed mode: category icons only, dot on active category */
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
                      'w-9 h-9 flex items-center justify-center rounded-lg transition',
                      hasActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                    ].join(' ')}
                  >
                    <CategoryIcon label={CATEGORY_ICONS[cat]} />
                  </button>
                  {hasActive && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      {expanded ? (
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">{products.length} produk tersedia</p>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 border-t border-gray-100">
          <button
            onClick={onToggle}
            title="Buka sidebar"
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    case 'Wall':     return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>;
    case 'Wind':     return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>;
    case 'Layers':   return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
    case 'Square':   return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;
    case 'DoorOpen': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>;
    default:         return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
  }
}
