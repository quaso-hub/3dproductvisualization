/**
 * MobileBottomSheet.tsx
 * ─────────────────────────────────────────────────────────────
 * Universal bottom-sheet untuk overlay UI di viewer 3D pada mode mobile.
 *
 * Features:
 * - 3 snap points: PEEK (96px), HALF (45vh), FULL (88vh)
 * - Swipe up/down gesture (pointer events, works on touch + mouse)
 * - Backdrop opaque at FULL only (3D tetap terlihat di PEEK/HALF)
 * - Sticky header dengan drag handle + tabs slot
 * - Content area scrollable saat HALF/FULL
 * - Pemicu auto-snap ke HALF saat user click body, ke PEEK saat swipe down
 * - MONO theme (border-radius 0, JetBrains Mono via parent)
 *
 * Pemakaian:
 *   <MobileBottomSheet
 *     snap={snap}
 *     onSnapChange={setSnap}
 *     header={<TabBar/>}
 *     peek={<KpiPills/>}
 *   >
 *     <DetailContent/>
 *   </MobileBottomSheet>
 *
 * NOTE: hanya di-render saat viewport <640px (parent gate).
 * ─────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_HEIGHTS: Record<SheetSnap, string> = {
  peek: '96px',
  half: '45vh',
  full: '88vh',
};

interface Props {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Header content (tabs, title) — selalu terlihat di semua snap */
  header?: ReactNode;
  /** Peek content (KPI compact) — hanya terlihat di snap=peek */
  peek?: ReactNode;
  /** Body content — scrollable saat snap=half|full */
  children?: ReactNode;
  /** Optional onClose handler (X button di header) */
  onClose?: () => void;
}

export function MobileBottomSheet({ snap, onSnapChange, header, peek, children, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartSnap = useRef<SheetSnap>('peek');
  const [dragOffset, setDragOffset] = useState(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // hanya drag dari handle area
      dragStartY.current = e.clientY;
      dragStartSnap.current = snap;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [snap],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    setDragOffset(delta);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragStartY.current === null) return;
    const delta = dragOffset;
    const startSnap = dragStartSnap.current;
    dragStartY.current = null;
    setDragOffset(0);

    // gesture threshold 60px
    if (Math.abs(delta) < 60) return;

    if (delta < 0) {
      // swiped up -> larger snap
      if (startSnap === 'peek') onSnapChange('half');
      else if (startSnap === 'half') onSnapChange('full');
    } else {
      // swiped down -> smaller snap
      if (startSnap === 'full') onSnapChange('half');
      else if (startSnap === 'half') onSnapChange('peek');
    }
  }, [dragOffset, onSnapChange]);

  // klik handle (no drag) = cycle snap up
  const handleHandleClick = useCallback(() => {
    if (snap === 'peek') onSnapChange('half');
    else if (snap === 'half') onSnapChange('full');
    else onSnapChange('peek');
  }, [snap, onSnapChange]);

  // ESC = collapse to peek
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && snap !== 'peek') onSnapChange('peek');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snap, onSnapChange]);

  const targetHeight = SNAP_HEIGHTS[snap];

  return (
    <>
      {/* Backdrop hanya di snap=full untuk fokus reading */}
      <div
        className={`sm:hidden fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 ${
          snap === 'full' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => onSnapChange('half')}
        aria-hidden
      />

      <div
        ref={sheetRef}
        className="sm:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col border-t-2 border-foreground bg-background shadow-2xl"
        style={{
          height: targetHeight,
          transform: `translateY(${Math.max(0, dragOffset)}px)`,
          transition: dragStartY.current === null ? 'height 280ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms ease-out' : 'none',
          touchAction: 'none',
          borderRadius: 0,
        }}
        role="dialog"
        aria-label="Engineering panel"
      >
        {/* DRAG HANDLE — tap to cycle, drag to gesture */}
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleHandleClick}
          className="flex w-full shrink-0 cursor-grab items-center justify-center bg-background py-2 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          aria-label={`Sheet ${snap} — drag or tap to expand`}
        >
          <div className="h-1 w-10 bg-foreground/40" />
        </button>

        {/* HEADER (sticky, always visible) */}
        {header ? (
          <div className="shrink-0 border-b border-border px-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">{header}</div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 border border-border bg-background px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-accent"
                  style={{ borderRadius: 0 }}
                  aria-label="Close panel"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ) : null}

        {/* PEEK — only visible when peek snap (compact KPI strip) */}
        {snap === 'peek' && peek ? (
          <div className="min-h-0 shrink-0 overflow-hidden px-3 pt-2">
            {peek}
          </div>
        ) : null}

        {/* BODY — scrollable detail (half/full) */}
        {snap !== 'peek' && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
            {children}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Hook: detect mobile (window <640px). SSR-safe.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMobile;
}
