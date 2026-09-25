import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions extends IntersectionObserverInit {
  /** Stop observing after the element first becomes visible. */
  once?: boolean;
}

export function useInView<T extends Element>({ once = false, ...observerOptions }: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const { root, rootMargin, threshold } = observerOptions;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) observer.disconnect();
      },
      { root, rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [once, root, rootMargin, threshold]);

  return [ref, inView] as const;
}
