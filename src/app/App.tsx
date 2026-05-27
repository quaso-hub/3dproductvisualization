/**
 * App.tsx - Main Application (Optimized)
 * ─────────────────────────────────────────────────────────────
 * 
 * Features:
 * - Lazy loaded 3D viewers
 * - Preload on sidebar hover
 * - Optimistic UI updates
 * - Progressive loading
 * - Performance monitoring
 * 
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PRODUCTS } from './products/index';
import type { Product } from './data/products';
import { preloadViewer } from './data/lazyViewerRegistry';
import { Sidebar } from './components';
import { ProductViewerLazy } from './components/ProductViewerLazy';

export default function App() {
  const [selected, setSelected] = useState<Product>(PRODUCTS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  /* Preload current viewer on mount */
  useEffect(() => {
    preloadViewer(selected.viewerType || 'panel');
  }, []);

  /* Handle product selection dengan optimistic UI */
  const handleSelect = useCallback((product: Product) => {
    if (product.id === selected.id) return;
    
    setIsTransitioning(true);
    
    // Optimistic update - show new product immediately
    setSelected(product);
    
    // Preload the viewer chunk
    preloadViewer(product.viewerType || 'panel');
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 150);
  }, [selected.id]);

  /* Preload next/prev products (predictive) */
  const preloadAdjacent = useCallback((currentId: string) => {
    const currentIndex = PRODUCTS.findIndex(p => p.id === currentId);
    const nextIndex = (currentIndex + 1) % PRODUCTS.length;
    const prevIndex = (currentIndex - 1 + PRODUCTS.length) % PRODUCTS.length;
    
    // Preload adjacent products
    preloadViewer(PRODUCTS[nextIndex].viewerType || 'panel');
    preloadViewer(PRODUCTS[prevIndex].viewerType || 'panel');
  }, []);

  /* Preload adjacent when selection changes */
  useEffect(() => {
    preloadAdjacent(selected.id);
  }, [selected.id, preloadAdjacent]);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const currentIndex = PRODUCTS.findIndex(p => p.id === selected.id);
      
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % PRODUCTS.length;
        handleSelect(PRODUCTS[nextIndex]);
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + PRODUCTS.length) % PRODUCTS.length;
        handleSelect(PRODUCTS[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected.id, handleSelect]);

  return (
    <div 
      className="flex h-screen bg-background text-foreground overflow-hidden"
      role="application"
      aria-label="3D Product Catalog Application"
    >
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to content
      </a>
      
      <Sidebar
        products={PRODUCTS}
        selected={selected}
        onSelect={handleSelect}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />
      
      <main 
        id="main-content"
        className={`flex-1 overflow-hidden flex flex-col p-2 bg-muted/30 transition-opacity duration-150 ${isTransitioning ? 'opacity-80' : ''}`}
        role="main"
        aria-label="Product viewer"
        tabIndex={-1}
      >
        <ProductViewerLazy 
          key={selected.id} 
          product={selected} 
        />
      </main>
    </div>
  );
}
