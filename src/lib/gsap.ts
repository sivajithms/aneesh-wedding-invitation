import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/** ScrollTrigger loads just after first paint, so it doesn't delay the envelope appearing. */
export const loadScrollTrigger = () =>
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
    gsap.registerPlugin(ScrollTrigger);
    return ScrollTrigger;
  });
