import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useScrollDirection — Detects vertical scroll direction on .screen elements
 * and provides a collapsed state for the navigation bar and mini player.
 * 
 * Uses requestAnimationFrame-debounced event delegation (capture phase)
 * so scroll events from any .screen element are caught without modifying
 * individual screen components.
 * 
 * Returns { isCollapsed } — true when user has scrolled down enough.
 */
export default function useScrollDirection() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastScrollTop = useRef(0);
  const accumulatedDelta = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    // Thresholds (px) — smooth hysteresis prevents jitter on micro-scrolls
    const COLLAPSE_THRESHOLD = 32;   // cumulative downward scroll before collapsing
    const EXPAND_THRESHOLD = 24;     // cumulative upward scroll before expanding
    const TOP_ZONE = 10;             // always expand when near the top

    const handleScroll = (e) => {
      // Only react to the main vertical scroll on .screen containers
      const target = e.target;
      if (!target.classList || !target.classList.contains('screen')) return;

      const scrollTop = target.scrollTop;

      if (!ticking.current) {
        requestAnimationFrame(() => {
          const delta = scrollTop - lastScrollTop.current;

          // Always expand when at the very top of the scroll area
          if (scrollTop <= TOP_ZONE) {
            setIsCollapsed(false);
            accumulatedDelta.current = 0;
          } else if (delta > 0) {
            // Scrolling down — accumulate positive delta
            accumulatedDelta.current = Math.max(0, accumulatedDelta.current) + delta;
            if (accumulatedDelta.current > COLLAPSE_THRESHOLD) {
              setIsCollapsed(true);
              accumulatedDelta.current = 0;
            }
          } else if (delta < 0) {
            // Scrolling up — accumulate negative delta
            accumulatedDelta.current = Math.min(0, accumulatedDelta.current) + delta;
            if (accumulatedDelta.current < -EXPAND_THRESHOLD) {
              setIsCollapsed(false);
              accumulatedDelta.current = 0;
            }
          }

          lastScrollTop.current = scrollTop;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    // Capture phase — scroll events don't bubble, but ARE dispatched during capture
    root.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => root.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // Reset collapsed state when route changes (new screen starts at scrollTop 0)
  const resetCollapse = useCallback(() => {
    setIsCollapsed(false);
    lastScrollTop.current = 0;
    accumulatedDelta.current = 0;
  }, []);

  return { isCollapsed, resetCollapse };
}
