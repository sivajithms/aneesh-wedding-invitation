import { useRef, useState } from 'react';
import type { WeddingConfig } from '../../config/types';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { gsap, useGSAP } from '../../lib/gsap';
import { mapsUrl } from '../../lib/links';
import { EnvelopeIcon, HeartIcon, MapPinIcon } from '../ui/icons';
import { BlessingsDialog } from './BlessingsDialog';
import styles from './GuestActions.module.css';
import { RsvpDialog } from './RsvpDialog';
import { SoundToggle } from './SoundToggle';

interface GuestActionsProps {
  wedding: WeddingConfig;
  /** Shown once the card has been opened. */
  visible: boolean;
}

/** RSVP, blessings, directions and the sound switch, within thumb's reach at the bottom of the screen. */
export function GuestActions({ wedding, visible }: GuestActionsProps) {
  const [dialog, setDialog] = useState<'rsvp' | 'blessings' | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const close = () => setDialog(null);

  // Rises in once the card is open; slips away again if the guest scrolls back into the opening.
  useGSAP(
    () => {
      const bar = barRef.current!;
      if (!visible) {
        gsap.to(bar, { autoAlpha: 0, y: reducedMotion ? 0 : 20, duration: 0.35, ease: 'power2.in' });
        return;
      }
      gsap.fromTo(bar, { autoAlpha: 0, y: reducedMotion ? 0 : 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.15 });
      if (!reducedMotion) {
        gsap.fromTo(bar.children, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.07, delay: 0.3 });
      }
    },
    { dependencies: [visible, reducedMotion], scope: barRef },
  );

  return (
    <>
      <nav ref={barRef} className={styles.bar} aria-label="Reply to the invitation">
        <button type="button" className={styles.action} data-primary onClick={() => setDialog('rsvp')} aria-haspopup="dialog">
          <EnvelopeIcon /> RSVP
        </button>
        <button type="button" className={styles.action} onClick={() => setDialog('blessings')} aria-haspopup="dialog">
          <HeartIcon /> Blessings
        </button>
        <a className={styles.action} href={mapsUrl(wedding.venue)} target="_blank" rel="noopener noreferrer">
          <MapPinIcon /> Directions
          <span className="visually-hidden"> to {wedding.venue.name} (opens Google Maps)</span>
        </a>
        <SoundToggle inline />
      </nav>
      <RsvpDialog wedding={wedding} open={dialog === 'rsvp'} onClose={close} />
      <BlessingsDialog wedding={wedding} open={dialog === 'blessings'} onClose={close} />
    </>
  );
}
