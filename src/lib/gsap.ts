import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/**
 * Draggable, ScrollTrigger and Lenis are only needed once the guest starts interacting,
 * so they load after first paint instead of weighing down the initial bundle.
 */
export const loadDraggable = () =>
  import('gsap/Draggable').then(({ Draggable }) => {
    gsap.registerPlugin(Draggable);
    return Draggable;
  });

export const loadScrollTrigger = () =>
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
    gsap.registerPlugin(ScrollTrigger);
    return ScrollTrigger;
  });
