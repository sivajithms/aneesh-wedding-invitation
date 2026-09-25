import { useCallback, useEffect, useRef, useState } from 'react';
import { GuestActions } from './components/guest/GuestActions';
import { SoundToggle } from './components/guest/SoundToggle';
import { Opening } from './components/opening/Opening';
import { SaveTheDate } from './components/sections/SaveTheDate';
import { SiteFooter } from './components/sections/SiteFooter';
import { UnfoldedCard } from './components/sections/UnfoldedCard';
import { wedding } from './config/wedding';
import { useScrollLock } from './hooks/useScrollLock';
import { useSmoothScroll } from './hooks/useSmoothScroll';

const SAVE_THE_DATE_ID = 'save-the-date';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [showOpening, setShowOpening] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  useScrollLock(!isOpen);
  useSmoothScroll(!showOpening);

  // Once the card is open the page is no longer inert: move focus to the invitation heading.
  useEffect(() => {
    if (isOpen) mainRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [isOpen]);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleOpeningExited = useCallback(() => setShowOpening(false), []);

  return (
    <>
      {isOpen && (
        <a className="skip-link" href={`#${SAVE_THE_DATE_ID}`}>
          Skip to date & venue
        </a>
      )}

      {showOpening && <Opening wedding={wedding} targetRef={cardRef} onOpen={handleOpen} onExited={handleOpeningExited} />}

      <div inert={!isOpen}>
        <main ref={mainRef}>
          <UnfoldedCard ref={cardRef} wedding={wedding} />
          <SaveTheDate id={SAVE_THE_DATE_ID} wedding={wedding} />
        </main>
        <SiteFooter wedding={wedding} />
      </div>

      <GuestActions wedding={wedding} visible={!showOpening} />
      {showOpening && <SoundToggle />}
    </>
  );
}
