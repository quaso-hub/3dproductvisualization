/**
 * ViewerErrorBoundary.tsx - Error Boundary for 3D Viewers
 * ------------------------------─
 * 
 * Graceful error handling untuk 3D viewer failures.
 * Catches WebGL errors, chunk load errors, and runtime errors.
 *
 * Features:
 * - WebGL context loss detection
 * - Chunk load failure recovery
 * - Retry mechanism
 * - Fallback to static image
 * - Error reporting (console + optional telemetry)
 * - Accessible error messages
 *
 * ------------------------------─
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Image } from 'lucide-react';
import type { Product } from '../data/products';

interface Props {
  children: ReactNode;
  product: Product;
  onRetry?: () => void;
  fallbackImagePath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  retryCount: number;
  isWebGLError: boolean;
}

export class ViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isWebGLError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isWebGLError = 
      error.message.includes('WebGL') ||
      error.message.includes('GL') ||
      error.message.includes('context') ||
      error.message.includes('GPU');

    const isChunkError =
      error.message.includes('ChunkLoadError') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk');

    return {
      hasError: true,
      error,
      isWebGLError,
      errorInfo: isChunkError 
        ? 'chunk_load' 
        : isWebGLError 
          ? 'webgl_context' 
          : 'runtime',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ViewerErrorBoundary]', {
      product: this.props.product.id,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Optional: Send to error reporting service
    // reportErrorToService(error, this.props.product, this.state.retryCount);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
    
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      const { product, fallbackImagePath } = this.props;
      const { errorInfo, isWebGLError, retryCount } = this.state;

      return (
        <div 
          className="w-full h-full flex flex-col items-center justify-center bg-background p-8"
          role="alert"
          aria-label={`Error loading ${product.fullName}`}
        >
          {/* Icon */}
          <div className="mb-4">
            <AlertTriangle className="w-12 h-12 text-muted-foreground" />
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold tracking-wide uppercase mb-2">
            Unable to Load 3D Viewer
          </h3>

          {/* Context-specific message */}
          <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">
            {errorInfo === 'webgl_context' && (
              <>
                WebGL context unavailable. 
                {isWebGLError && ' Try updating your graphics driver or use a different browser.'}
              </>
            )}
            {errorInfo === 'chunk_load' && (
              <>
                Network error loading viewer. 
                {retryCount < 3 && ' Click retry to try again.'}
              </>
            )}
            {errorInfo === 'runtime' && (
              <>
                An unexpected error occurred.
                {retryCount < 3 && ' Click retry to try again.'}
              </>
            )}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            {retryCount < 3 && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-border hover:bg-accent transition-colors"
                style={{ borderRadius: 0 }}
                aria-label="Retry loading 3D viewer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}

            {fallbackImagePath && (
              <button
                onClick={() => window.open(fallbackImagePath, '_blank')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold border border-border hover:bg-accent transition-colors"
                style={{ borderRadius: 0 }}
                aria-label="View static image instead"
              >
                <Image className="w-3 h-3" />
                View Image
              </button>
            )}
          </div>

          {/* Product name */}
          <p className="mt-6 text-[9px] text-muted-foreground uppercase tracking-widest">
            {product.fullName}
          </p>

          {/* Technical details (collapsed) */}
          <details className="mt-4 text-[9px] text-muted-foreground max-w-full">
            <summary className="cursor-pointer hover:text-foreground transition-colors">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-muted overflow-x-auto text-[8px] font-mono">
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ViewerErrorBoundary;
