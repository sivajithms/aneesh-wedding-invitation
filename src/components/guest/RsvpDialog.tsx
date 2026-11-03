import { useId, useState, type FormEvent } from 'react';
import type { WeddingConfig } from '../../config/types';
import { formatCardDate } from '../../lib/date';
import { GuestbookError, sendToGuestbook, storage } from '../../lib/guestbook';
import forms from './forms.module.css';
import { GuestDialog } from './GuestDialog';
import styles from './RsvpDialog.module.css';

const NAME_MAX_LENGTH = 80;
const SAVED_KEY = 'invite-rsvp';

interface SavedReply {
  name: string;
  attending: boolean;
  guests: number;
}

type Status = { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error'; message: string };
type Step = 'counter' | 'name' | 'decline' | 'done';

const readSaved = (): SavedReply | null => {
  try {
    return JSON.parse(storage.get(SAVED_KEY) ?? 'null') as SavedReply | null;
  } catch {
    return null;
  }
};

const thanks = (reply: SavedReply) =>
  reply.attending
    ? `We can’t wait to celebrate with you${reply.guests > 1 ? ` and your party of ${reply.guests}` : ''}.`
    : 'You’ll be dearly missed. Thank you for letting us know.';

interface RsvpDialogProps {
  wedding: WeddingConfig;
  open: boolean;
  onClose: () => void;
  initialStep?: 'counter' | 'done';
}

export function RsvpDialog({ wedding, open, onClose, initialStep = 'counter' }: RsvpDialogProps) {
  const { guestbook } = wedding;
  const maxGuests = guestbook.maxGuests || 6;
  const saved = readSaved();

  const [step, setStep] = useState<Step>(initialStep === 'done' && saved ? 'done' : 'counter');
  const [status, setStatus] = useState<Status>(initialStep === 'done' && saved ? { state: 'sent' } : { state: 'idle' });
  const [guests, setGuests] = useState<number>(saved?.guests || 1);
  const [name, setName] = useState<string>(saved?.name ?? '');
  const [errors, setErrors] = useState<{ name?: string }>({});

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const currentSaved = readSaved();
      if (initialStep === 'done' && currentSaved) {
        setStep('done');
        setStatus({ state: 'sent' });
        setGuests(currentSaved.guests || 1);
        setName(currentSaved.name);
      } else {
        setStep('counter');
        setStatus({ state: 'idle' });
        if (currentSaved) {
          setGuests(currentSaved.guests || 1);
          setName(currentSaved.name);
        }
      }
      setErrors({});
    }
  }

  const titleId = useId();
  const nameId = useId();

  const submitAttending = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Add your name so the family knows who replied.' });
      return document.getElementById(nameId)?.focus();
    }
    setErrors({});
    const reply: SavedReply = { name: trimmed, attending: true, guests };
    setStatus({ state: 'sending' });
    try {
      await sendToGuestbook(guestbook.endpoint, { type: 'rsvp', ...reply });
      storage.set(SAVED_KEY, JSON.stringify(reply));
      setStatus({ state: 'sent' });
      setStep('done');
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof GuestbookError ? error.message : 'That didn’t go through. Try again in a moment.',
      });
    }
  };

  const submitDecline = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Add your name so the family knows who replied.' });
      return document.getElementById(nameId)?.focus();
    }
    setErrors({});
    const reply: SavedReply = { name: trimmed, attending: false, guests: 0 };
    setStatus({ state: 'sending' });
    try {
      await sendToGuestbook(guestbook.endpoint, { type: 'rsvp', ...reply });
      storage.set(SAVED_KEY, JSON.stringify(reply));
      setStatus({ state: 'sent' });
      setStep('done');
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof GuestbookError ? error.message : 'That didn’t go through. Try again in a moment.',
      });
    }
  };

  const current = readSaved() || (status.state === 'sent' ? { name, attending: step !== 'decline', guests } : null);

  return (
    <GuestDialog open={open} onClose={onClose} labelledBy={titleId}>
      {step === 'done' && current ? (
        <div className={styles.stepContainer} aria-live="polite">
          <svg className={forms.doneMark} viewBox="0 0 48 48" aria-hidden="true">
            <path pathLength="1" d="M24 40s-15-9-15-20a8 8 0 0115-4 8 8 0 0115 4c0 11-15 20-15 20z" />
          </svg>
          <h2 id={titleId} className={styles.title}>
            Thank you, {current.name.split(' ')[0]}
          </h2>
          <p className={forms.sub}>{thanks(current)}</p>
          <p className={styles.answer}>
            Your reply:{' '}
            <strong>
              {current.attending
                ? `Joyfully accepts · ${current.guests} ${current.guests === 1 ? 'guest' : 'guests'}`
                : 'Regretfully declines'}
            </strong>
          </p>
          <button
            type="button"
            className={styles.outlineBtn}
            onClick={() => {
              setStatus({ state: 'idle' });
              setStep('counter');
            }}
          >
            Change reply
          </button>
          <button type="button" className={styles.backBtn} onClick={onClose} style={{ marginTop: '0.9rem' }}>
            Close
          </button>
        </div>
      ) : step === 'counter' ? (
        <div className={styles.stepContainer}>
          <h2 id={titleId} className={styles.title}>
            How many of you are
            <br />
            coming?
          </h2>
          <p className={styles.subtitle}>INCLUDING YOURSELF</p>

          <div className={styles.counterRow} role="group" aria-label="Guest count">
            <button
              type="button"
              className={styles.counterBtn}
              onClick={() => setGuests((n) => Math.max(1, n - 1))}
              disabled={guests <= 1}
              aria-label="One fewer guest"
            >
              <span aria-hidden="true">−</span>
            </button>

            <div className={styles.counterDisplay}>
              <span className={styles.counterNumber}>{guests}</span>
              <span className={styles.counterUnit}>{guests === 1 ? 'GUEST' : 'GUESTS'}</span>
            </div>

            <button
              type="button"
              className={styles.counterBtn}
              onClick={() => setGuests((n) => Math.min(maxGuests, n + 1))}
              disabled={guests >= maxGuests}
              aria-label="One more guest"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>

          <button type="button" className={styles.confirmBtn} onClick={() => setStep('name')}>
            Confirm · {guests} {guests === 1 ? 'guest' : 'guests'}
          </button>

          <div className={styles.footerActions}>
            <button type="button" className={styles.backBtn} onClick={onClose}>
              ← BACK
            </button>
            <button
              type="button"
              className={styles.declineLink}
              onClick={() => {
                setErrors({});
                setStep('decline');
              }}
            >
              Can’t attend? Regretfully decline
            </button>
          </div>

          {guestbook.rsvpDeadline && (
            <p className={styles.deadline}>
              Kindly reply by <time dateTime={guestbook.rsvpDeadline}>{formatCardDate(guestbook.rsvpDeadline)}</time>
            </p>
          )}
        </div>
      ) : step === 'name' ? (
        <div className={styles.stepContainer}>
          <h2 id={titleId} className={styles.title}>
            Who is replying?
          </h2>
          <p className={styles.subtitle}>
            RESERVING FOR {guests} {guests === 1 ? 'GUEST' : 'GUESTS'}
          </p>

          <form className={forms.form} onSubmit={submitAttending} noValidate style={{ width: '100%', marginTop: '0.5rem' }}>
            <div className={forms.field}>
              <label htmlFor={nameId} className={forms.label}>
                Your name
              </label>
              <input
                id={nameId}
                className={forms.input}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                placeholder="e.g. Muhammed & Family"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors({});
                }}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
                autoFocus
              />
              {errors.name && (
                <p id={`${nameId}-error`} className={forms.error}>
                  {errors.name}
                </p>
              )}
            </div>

            {status.state === 'error' && (
              <p role="alert" className={forms.formError}>
                {status.message}
              </p>
            )}

            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={status.state === 'sending'}
              aria-busy={status.state === 'sending'}
            >
              {status.state === 'sending'
                ? 'Sending…'
                : `Send RSVP · ${guests} ${guests === 1 ? 'guest' : 'guests'}`}
            </button>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setErrors({});
                  setStep('counter');
                }}
              >
                ← BACK
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className={styles.stepContainer}>
          <h2 id={titleId} className={styles.title}>
            We’ll miss you!
          </h2>
          <p className={styles.subtitle}>KINDLY LET US KNOW WHO REPLIED</p>

          <form className={forms.form} onSubmit={submitDecline} noValidate style={{ width: '100%', marginTop: '0.5rem' }}>
            <div className={forms.field}>
              <label htmlFor={nameId} className={forms.label}>
                Your name
              </label>
              <input
                id={nameId}
                className={forms.input}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                placeholder="e.g. Uncle Farooq"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (errors.name) setErrors({});
                }}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
                autoFocus
              />
              {errors.name && (
                <p id={`${nameId}-error`} className={forms.error}>
                  {errors.name}
                </p>
              )}
            </div>

            {status.state === 'error' && (
              <p role="alert" className={forms.formError}>
                {status.message}
              </p>
            )}

            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={status.state === 'sending'}
              aria-busy={status.state === 'sending'}
            >
              {status.state === 'sending' ? 'Sending reply…' : 'Send reply'}
            </button>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => {
                  setErrors({});
                  setStep('counter');
                }}
              >
                ← BACK
              </button>
            </div>
          </form>
        </div>
      )}
    </GuestDialog>
  );
}
