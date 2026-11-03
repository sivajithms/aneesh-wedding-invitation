import { useEffect, useRef, useState } from 'react';
import type { WeddingConfig } from '../../config/types';
import styles from './Modals.module.css';

interface WishModalProps {
  wedding: WeddingConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const COMMON_EMOJIS = ['❤️', '🎉', '✨', '💐', '🤲', '🤍', '🕊️', '🌸', '🥂', '🌹', '🎊', '🥰'];

export function WishModal({ wedding, isOpen, onClose, onSuccess }: WishModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [wishText, setWishText] = useState('');
  const [name, setName] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setSubmitted(false);
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleInsertEmoji = (emoji: string) => {
    setWishText((prev) => (prev + emoji).slice(0, 300));
    setShowEmojis(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;

    setSubmitted(true);
    setTimeout(() => {
      onSuccess('Blessing sent! Thank you.');
      onClose();
      setWishText('');
      setName('');
    }, 600);
  };

  return (
    <dialog
      ref={dialogRef}
      className={`${styles.rsvp} ${styles.wish}`}
      id="wishDialog"
      aria-labelledby="wishTitle"
      onClose={onClose}
    >
      <button type="button" className={styles.close} id="wishClose" onClick={onClose} aria-label="Close">
        ×
      </button>

      {submitted ? (
        <div className={styles.pane}>
          <h2>Thank you!</h2>
          <p>Your warm wishes have been shared with {wedding.groom.name} &amp; {wedding.bride.name}.</p>
          <button type="button" className={styles.ok} onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <form className={styles.pane} id="wishForm" onSubmit={handleSubmit} noValidate>
          <h2 id="wishTitle">Send your blessings</h2>
          <p className={styles.sub}>for {wedding.groom.name} &amp; {wedding.bride.name}</p>

          <textarea
            id="wishText"
            maxLength={300}
            placeholder="Write your wish…"
            aria-label="Your wish"
            value={wishText}
            onChange={(e) => setWishText(e.target.value)}
            required
          />

          <div className={styles.tools}>
            <button
              type="button"
              className={styles.emojiBtn}
              id="emojiBtn"
              aria-label="Add an emoji"
              aria-expanded={showEmojis}
              onClick={() => setShowEmojis(!showEmojis)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M8 14.5c1 1.4 2.4 2 4 2s3-.6 4-2" />
                <circle cx="9" cy="10" r=".6" fill="currentColor" />
                <circle cx="15" cy="10" r=".6" fill="currentColor" />
              </svg>
            </button>
            <p className={styles.count} id="wishCount">
              {wishText.length} / 300
            </p>
          </div>

          {showEmojis && (
            <div className={styles.emojiGrid}>
              {COMMON_EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => handleInsertEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <input
            type="text"
            id="wishName"
            maxLength={60}
            placeholder="Your name (optional)"
            autoComplete="name"
            aria-label="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <p className={styles.msg} id="wishMsg" role="status" />

          <button type="submit" className={styles.ok} id="wishSend" disabled={!wishText.trim()}>
            Send ✈
          </button>
        </form>
      )}
    </dialog>
  );
}

