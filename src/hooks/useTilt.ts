import { useCallback, useRef, type PointerEvent } from 'react';
import { TILT_MAX_DEGREES } from '../constants/motion';
import { useCanHover, usePrefersReducedMotion } from './useMediaQuery';

/**
 * Pointer-driven 3D tilt. Writes CSS custom properties directly so hovering never re-renders React.
 * Consumers style with `--tilt-x`, `--tilt-y`, `--glare-x`, `--glare-y`.
 */
export function useTilt<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const canHover = useCanHover();
  const reducedMotion = usePrefersReducedMotion();
  const enabled = canHover && !reducedMotion;

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty('--tilt-x', `${(0.5 - y) * TILT_MAX_DEGREES * 2}deg`);
    element.style.setProperty('--tilt-y', `${(x - 0.5) * TILT_MAX_DEGREES * 2}deg`);
    element.style.setProperty('--glare-x', `${x * 100}%`);
    element.style.setProperty('--glare-y', `${y * 100}%`);
  }, []);

  const onPointerLeave = useCallback(() => {
    const style = ref.current?.style;
    ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y'].forEach((name) => style?.removeProperty(name));
  }, []);

  return enabled ? { ref, onPointerMove, onPointerLeave } : { ref };
}
