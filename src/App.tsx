import { useState, useEffect } from 'react';
import { wedding } from './config/wedding';
import { Stage } from './components/stage/Stage';
import { Details } from './components/details/Details';
import { RsvpModal } from './components/modals/RsvpModal';
import { WishModal } from './components/modals/WishModal';
import { SoundToggle } from './components/ui/SoundToggle';
import { ToCardButton } from './components/ui/ToCardButton';
import { Toast } from './components/ui/Toast';
import { useSmoothScroll } from './hooks/useSmoothScroll';

export default function App() {
  const [isCardUnveiled, setIsCardUnveiled] = useState(false);
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [isWishOpen, setIsWishOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<{ answer: 'yes' | 'no'; count: number } | null>(null);

  // Smooth scroll is strictly enabled ONLY once the card is fully unveiled!
  useSmoothScroll(isCardUnveiled);

  // Strict viewport & scroll lock until card is unveiled
  useEffect(() => {
    if (!isCardUnveiled) {
      document.documentElement.classList.add('sealed');
      document.body.classList.add('sealed');
      window.scrollTo(0, 0);

      const preventDefaultScroll = (e: Event) => {
        // Allow clicks, but block wheel and touch scroll
        e.preventDefault();
      };

      const preventScrollKeys = (e: KeyboardEvent) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) {
          e.preventDefault();
        }
      };

      window.addEventListener('wheel', preventDefaultScroll, { passive: false });
      window.addEventListener('touchmove', preventDefaultScroll, { passive: false });
      window.addEventListener('keydown', preventScrollKeys);

      return () => {
        window.removeEventListener('wheel', preventDefaultScroll);
        window.removeEventListener('touchmove', preventDefaultScroll);
        window.removeEventListener('keydown', preventScrollKeys);
      };
    } else {
      document.documentElement.classList.remove('sealed');
      document.body.classList.remove('sealed');
    }
  }, [isCardUnveiled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleRsvpSubmit = (answer: 'yes' | 'no', count: number) => {
    setRsvpStatus({ answer, count });
    showToast(answer === 'yes' ? `RSVP confirmed for ${count}!` : 'Regrets recorded. Thank you!');
  };

  return (
    <>
      {/* 1. Main Interactive Stage (Envelope, Ribbon, Wrap, Cards) */}
      <Stage
        wedding={wedding}
        onOpenRsvp={() => setIsRsvpOpen(true)}
        onOpenWish={() => setIsWishOpen(true)}
        onUnveiled={() => setIsCardUnveiled(true)}
        onReplay={() => setIsCardUnveiled(false)}
      />

      {/* 2. Main Event Details & Content: strictly unlocked only AFTER card is unveiled! */}
      {isCardUnveiled && (
        <Details
          wedding={wedding}
          onOpenRsvp={() => setIsRsvpOpen(true)}
          rsvpStatus={rsvpStatus}
        />
      )}

      {/* 3. Floating Interactive Controls */}
      <SoundToggle src={wedding.music?.src} />
      {isCardUnveiled && <ToCardButton />}
      <Toast message={toastMessage} />

      {/* 4. Modals */}
      <RsvpModal
        wedding={wedding}
        isOpen={isRsvpOpen}
        onClose={() => setIsRsvpOpen(false)}
        onSubmit={handleRsvpSubmit}
      />
      <WishModal
        wedding={wedding}
        isOpen={isWishOpen}
        onClose={() => setIsWishOpen(false)}
        onSuccess={(msg) => showToast(msg)}
      />
    </>
  );
}
