import { useId, useState, type FormEvent } from 'react';
import type { WeddingConfig } from '../../config/types';
import { formatCardDate } from '../../lib/date';
import { GuestbookError, sendToGuestbook, storage } from '../../lib/guestbook';
import { Button } from '../ui/Button';
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
    : 'You’ll be missed. Thank you for letting us know.';

interface RsvpDialogProps {
  wedding: WeddingConfig;
  open: boolean;
  onClose: () => void;
}

export function RsvpDialog({ wedding, open, onClose }: RsvpDialogProps) {
  const { guestbook, venue } = wedding;
  const saved = readSaved();
  const [status, setStatus] = useState<Status>(saved ? { state: 'sent' } : { state: 'idle' });
  const [name, setName] = useState(saved?.name ?? '');
  const [attending, setAttending] = useState<boolean | null>(saved?.attending ?? null);
  const [guests, setGuests] = useState(saved?.guests || 1);
  const [errors, setErrors] = useState<{ name?: string; attending?: string }>({});
  const titleId = useId();
  const nameId = useId();
  const guestsId = useId();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    const nextErrors = {
      ...(!trimmed && { name: 'Add your name so the family knows who replied.' }),
      ...(attending === null && { attending: 'Choose whether you can come.' }),
    };
    setErrors(nextErrors);
    if (nextErrors.name) return document.getElementById(nameId)?.focus();
    if (attending === null) return;

    const reply: SavedReply = { name: trimmed, attending, guests: attending ? guests : 0 };
    setStatus({ state: 'sending' });
    try {
      await sendToGuestbook(guestbook.endpoint, { type: 'rsvp', ...reply });
      storage.set(SAVED_KEY, JSON.stringify(reply));
      setStatus({ state: 'sent' });
    } catch (error) {
      setStatus({ state: 'error', message: error instanceof GuestbookError ? error.message : 'That didn’t go through. Try again in a moment.' });
    }
  };

  const current = readSaved();

  return (
    <GuestDialog open={open} onClose={onClose} labelledBy={titleId}>
      {status.state === 'sent' && current ? (
        <div className={forms.done} aria-live="polite">
          <svg className={forms.doneMark} viewBox="0 0 48 48" aria-hidden="true">
            <path pathLength="1" d="M24 40s-15-9-15-20a8 8 0 0115-4 8 8 0 0115 4c0 11-15 20-15 20z" />
          </svg>
          <h2 id={titleId} className={forms.title}>
            Thank you, {current.name.split(' ')[0]}
          </h2>
          <p className={forms.sub}>{thanks(current)}</p>
          <p className={styles.answer}>
            Your reply: <strong>{current.attending ? 'Joyfully accepts' : 'Regretfully declines'}</strong>
          </p>
          <Button variant="outline" onClick={() => setStatus({ state: 'idle' })}>
            Change reply
          </Button>
        </div>
      ) : (
        <>
          <h2 id={titleId} className={forms.title}>
            Will you join us?
          </h2>
          <p className={forms.sub}>
            <time dateTime={wedding.date}>{formatCardDate(wedding.date)}</time>
            <br />
            {venue.name}, {venue.location}
          </p>

          <form className={forms.form} onSubmit={submit} noValidate>
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
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
              />
              {errors.name && (
                <p id={`${nameId}-error`} className={forms.error}>
                  {errors.name}
                </p>
              )}
            </div>

            <fieldset className={styles.choices} aria-describedby={errors.attending ? `${titleId}-attending` : undefined}>
              <legend className="visually-hidden">Can you come?</legend>
              {[
                { value: true, label: 'Joyfully accept' },
                { value: false, label: 'Regretfully decline' },
              ].map((choice) => (
                <button
                  key={choice.label}
                  type="button"
                  className={styles.choice}
                  data-accept={choice.value}
                  aria-pressed={attending === choice.value}
                  onClick={() => {
                    setAttending(choice.value);
                    setErrors((current) => ({ ...current, attending: undefined }));
                  }}
                >
                  {choice.label}
                </button>
              ))}
              {errors.attending && (
                <p id={`${titleId}-attending`} className={forms.error}>
                  {errors.attending}
                </p>
              )}
            </fieldset>

            {attending && guestbook.maxGuests > 1 && (
              <div className={styles.guests}>
                <span id={guestsId} className={forms.label}>
                  Guests, including you
                </span>
                <div className={styles.stepper} role="group" aria-labelledby={guestsId}>
                  <button type="button" onClick={() => setGuests((n) => Math.max(1, n - 1))} disabled={guests <= 1} aria-label="One fewer guest">
                    −
                  </button>
                  <output aria-live="polite">{guests}</output>
                  <button
                    type="button"
                    onClick={() => setGuests((n) => Math.min(guestbook.maxGuests, n + 1))}
                    disabled={guests >= guestbook.maxGuests}
                    aria-label="One more guest"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {guestbook.rsvpDeadline && (
              <p className={styles.deadline}>
                Kindly reply by <time dateTime={guestbook.rsvpDeadline}>{formatCardDate(guestbook.rsvpDeadline)}</time>
              </p>
            )}

            {status.state === 'error' && (
              <p role="alert" className={forms.formError}>
                {status.message}
              </p>
            )}

            <Button type="submit" className={forms.submit} disabled={status.state === 'sending'} aria-busy={status.state === 'sending'}>
              {status.state === 'sending' ? 'Sending…' : 'Send reply'}
            </Button>
          </form>
        </>
      )}
    </GuestDialog>
  );
}
