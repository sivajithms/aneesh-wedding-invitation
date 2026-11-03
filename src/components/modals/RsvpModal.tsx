import { useEffect, useRef, useState } from 'react';
import type { WeddingConfig } from '../../config/types';
import { GuestbookError, sendToGuestbook, storage } from '../../lib/guestbook';
import styles from './Modals.module.css';

interface RsvpModalProps {
  wedding: WeddingConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answer: 'yes' | 'no', count: number) => void;
}

const SAVED_KEY = 'invite-rsvp';

export function RsvpModal({ wedding, isOpen, onClose, onSubmit }: RsvpModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pane, setPane] = useState<'ask' | 'count' | 'thanks'>('ask');
  const [answer, setAnswer] = useState<'yes' | 'no'>('yes');
  const [count, setCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(storage.get(SAVED_KEY) ?? 'null');
      if (saved?.name) setGuestName(saved.name);
      if (saved?.guests) setCount(saved.guests);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setPane('ask');
      setErrorMsg(null);
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleChoose = (ans: 'yes' | 'no') => {
    setAnswer(ans);
    setErrorMsg(null);
    if (ans === 'yes') {
      setPane('count');
    } else {
      void sendRsvp('no', 0);
    }
  };

  const sendRsvp = async (ans: 'yes' | 'no', numGuests: number) => {
    const name = guestName.trim() || 'Honoured Guest';
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await sendToGuestbook(wedding.guestbook.endpoint, {
        type: 'rsvp',
        name,
        attending: ans === 'yes',
        guests: numGuests,
      });

      storage.set(
        SAVED_KEY,
        JSON.stringify({ name, attending: ans === 'yes', guests: numGuests })
      );

      onSubmit(ans, numGuests);
      setPane('thanks');
    } catch (err) {
      // Even if network or script fails, record state locally and display confirmation with fallback
      storage.set(
        SAVED_KEY,
        JSON.stringify({ name, attending: ans === 'yes', guests: numGuests })
      );
      onSubmit(ans, numGuests);
      setPane('thanks');
      if (err instanceof GuestbookError) {
        console.warn('RSVP sheet notice:', err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCount = () => {
    void sendRsvp('yes', count);
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.rsvp}
      id="rsvpDialog"
      aria-labelledby="rsvpTitle"
      onClose={onClose}
    >
      <button type="button" className={styles.close} id="rsvpClose" onClick={onClose} aria-label="Close">
        ×
      </button>

      {/* Pane 1: Ask */}
      {pane === 'ask' && (
        <div className={styles.pane} id="rsvpAsk">
          <h2 id="rsvpTitle">Will you join us?</h2>
          <p className={styles.sub}>Sunday, 20 December 2026 · Changaramkulam</p>

          <div style={{ marginBottom: '1rem', width: '100%', textAlign: 'left' }}>
            <label
              htmlFor="rsvpGuestName"
              style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-secondary)', marginBottom: '0.35rem' }}
            >
              Your Name
            </label>
            <input
              id="rsvpGuestName"
              type="text"
              placeholder="e.g. Muhammed & Family"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--gold-border)',
                background: '#fffdfa',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                color: 'var(--ink)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            className={`${styles.answer} ${styles.yes}`}
            data-answer="yes"
            disabled={isSubmitting}
            onClick={() => handleChoose('yes')}
          >
            Yes, I'll be there
          </button>
          <button
            type="button"
            className={styles.answer}
            data-answer="no"
            disabled={isSubmitting}
            onClick={() => handleChoose('no')}
          >
            Sorry, I can't join
          </button>
          {errorMsg && (
            <p className={styles.msg} id="rsvpMsg" role="status" style={{ color: 'var(--status-err)' }}>
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {/* Pane 2: Count */}
      {pane === 'count' && (
        <div className={styles.pane} id="rsvpCount">
          <h2 id="countTitle">How many of you are coming?</h2>
          <p className={styles.sub}>Including yourself</p>
          <div className={styles.stepper} role="group" aria-labelledby="countTitle">
            <button
              type="button"
              id="countLess"
              aria-label="One fewer"
              disabled={count <= 1 || isSubmitting}
              onClick={() => setCount((c) => Math.max(1, c - 1))}
            >
              −
            </button>
            <output id="countNum" aria-live="polite">
              {count}
            </output>
            <button
              type="button"
              id="countMore"
              aria-label="One more"
              disabled={count >= 10 || isSubmitting}
              onClick={() => setCount((c) => Math.min(10, c + 1))}
            >
              +
            </button>
          </div>
          <p className={styles.countLabel} id="countLabel">
            {count === 1 ? 'guest' : 'guests'}
          </p>
          <button
            type="button"
            className={`${styles.answer} ${styles.yes}`}
            id="countSend"
            disabled={isSubmitting}
            onClick={handleConfirmCount}
          >
            {isSubmitting ? 'Recording reply...' : 'Confirm RSVP'}
          </button>
          <button
            type="button"
            className={styles.back}
            id="countBack"
            disabled={isSubmitting}
            onClick={() => setPane('ask')}
          >
            ← Back
          </button>
          {errorMsg && (
            <p className={styles.msg} id="countMsg" role="status" style={{ color: 'var(--status-err)' }}>
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {/* Pane 3: Thanks */}
      {pane === 'thanks' && (
        <div className={styles.pane} id="rsvpThanks">
          <h2>Thank you!</h2>
          <p id="rsvpThanksText">
            {answer === 'yes'
              ? `${wedding.groom.name} & ${wedding.bride.name} look forward to celebrating with you and your party of ${count} on Sunday 20th December 2026 at ${wedding.venue.name}!`
              : `Thank you for letting us know. You will be in the thoughts of ${wedding.groom.name} & ${wedding.bride.name}.`}
          </p>
          <button type="button" className={styles.ok} id="rsvpOk" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </dialog>
  );
}
