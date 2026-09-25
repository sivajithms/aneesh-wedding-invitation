import { useEffect, useRef, type ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { gsap } from '../../lib/gsap';
import styles from './GuestDialog.module.css';

interface GuestDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}

/** A modal note card: rises in on open, settles away on close. Esc and tapping outside close it. */
export function GuestDialog({ open, onClose, labelledBy, children }: GuestDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      gsap.fromTo(
        dialog,
        reducedMotion ? { autoAlpha: 0 } : { autoAlpha: 0, y: 28, scale: 0.96, rotationX: 8, transformPerspective: 900 },
        { autoAlpha: 1, y: 0, scale: 1, rotationX: 0, duration: reducedMotion ? 0.2 : 0.55, ease: 'power3.out' },
      );
    } else if (!open && dialog.open) {
      gsap.to(dialog, {
        autoAlpha: 0,
        y: reducedMotion ? 0 : 14,
        scale: reducedMotion ? 1 : 0.98,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => dialog.close(),
      });
    }
  }, [open, reducedMotion]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelledBy}
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The panel fills the dialog, so a click landing on the dialog itself is on the backdrop.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={styles.panel}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
