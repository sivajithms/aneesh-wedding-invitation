import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const usePrefersReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)');

export const useCanHover = (): boolean => useMediaQuery('(hover: hover) and (pointer: fine)');
