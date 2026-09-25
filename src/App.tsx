import { useRef, useState } from 'react';
import { GuestActions } from './components/guest/GuestActions';
import { SoundToggle } from './components/guest/SoundToggle';
import { Opening } from './components/opening/Opening';
import { SaveTheDate } from './components/sections/SaveTheDate';
import { SiteFooter } from './components/sections/SiteFooter';
import { UnfoldedCard } from './components/sections/UnfoldedCard';
import { wedding } from './config/wedding';
import { useSmoothScroll } from './hooks/useSmoothScroll';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useSmoothScroll();

  return (
    <>
      <a className="skip-link" href="#top">
        Skip the opening
      </a>

      <Opening wedding={wedding} targetRef={cardRef} pageRef={pageRef} onOpenChange={setIsOpen} />

      {/* Overlaps the opening's last screen, so the card lands exactly on the page's card. */}
      <div ref={pageRef} className="page">
        <main>
          <UnfoldedCard ref={cardRef} wedding={wedding} />
          <SaveTheDate id="save-the-date" wedding={wedding} />
        </main>
        <SiteFooter wedding={wedding} />
      </div>

      <div className="vignette" aria-hidden="true" />
      <GuestActions wedding={wedding} visible={isOpen} />
      {!isOpen && <SoundToggle />}
    </>
  );
}
