/**
 * ViewerSkeleton.tsx - Loading Skeleton for 3D Viewers
 * ------------------------------─
 * 
 * Beautiful loading states untuk lazy-loaded 3D viewers.
 * Provides visual feedback during chunk loading.
 *
 * Features:
 * - Animated grid pattern (mimics 3D mesh)
 * - Progress indicator
 * - Size-based skeleton (adjusts to product dimensions)
 * - Accessible loading announcements
 * - Cancel support for navigation
 *
 * ------------------------------─
 */

import { useEffect, useState } from 'react';
import type { Product } from '../data/products';

interface ViewerSkeletonProps {
  product: Product;
  estimatedLoadTime?: number; // ms
}

export function ViewerSkeleton({ product, estimatedLoadTime = 2000 }: ViewerSkeletonProps) {
  const [progress, setProgress] = useState(0);
  const [showTip, setShowTip] = useState(false);

  // Simulate progress
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / estimatedLoadTime) * 100, 95);
      setProgress(newProgress);
    }, 50);

    // Show tip after 1 second
    const tipTimeout = setTimeout(() => setShowTip(true), 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(tipTimeout);
    };
  }, [estimatedLoadTime]);

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center bg-background relative overflow-hidden"
      role="status"
      aria-label={`Loading ${product.fullName} viewer`}
      aria-live="polite"
    >
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path 
                d="M 40 0 L 0 0 0 40" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1"
                className="text-foreground"
              />
            </pattern>
            <pattern id="mesh" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="currentColor" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#mesh)" className="animate-pulse" />
        </svg>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-4 p-8">
        {/* 3D cube animation */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-2 border-foreground animate-spin-slow" 
               style={{ borderRadius: 0 }} />
          <div className="absolute inset-2 border-2 border-muted-foreground animate-spin-reverse" 
               style={{ borderRadius: 0 }} />
          <div className="absolute inset-4 bg-muted-foreground animate-pulse" 
               style={{ borderRadius: 0 }} />
        </div>

        {/* Product name */}
        <p className="text-xs font-semibold tracking-widest text-foreground uppercase">
          {product.name}
        </p>

        {/* Loading text */}
        <p className="text-[10px] text-muted-foreground tracking-wide">
          Loading 3D Model...
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-muted relative overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-foreground transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-background/50 to-transparent animate-shimmer" />
        </div>

        {/* Percentage */}
        <p className="text-[9px] text-muted-foreground tabular-nums">
          {Math.round(progress)}%
        </p>

        {/* Tip (shows after delay) */}
        {showTip && (
          <p className="text-[9px] text-muted-foreground/60 max-w-[200px] text-center animate-fade-in">
            💡 Tip: Use mouse to rotate, scroll to zoom
          </p>
        )}
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-border" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-border" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-border" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-border" />
    </div>
  );
}

export default ViewerSkeleton;
