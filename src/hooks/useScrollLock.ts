import { useEffect } from 'react';

const LOCK_CLASS = 'is-scroll-locked';

export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    root.classList.add(LOCK_CLASS);
    return () => root.classList.remove(LOCK_CLASS);
  }, [locked]);
}
