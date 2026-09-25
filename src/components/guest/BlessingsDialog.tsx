import { useId, useState, type FormEvent } from 'react';
import type { WeddingConfig } from '../../config/types';
import { GuestbookError, sendToGuestbook } from '../../lib/guestbook';
import { Button } from '../ui/Button';
import styles from './BlessingsDialog.module.css';
import forms from './forms.module.css';
import { GuestDialog } from './GuestDialog';

const MESSAGE_MAX_LENGTH = 300;
const NAME_MAX_LENGTH = 60;
/** Below this many characters left, the counter warns and screen readers hear how many remain. */
const COUNTER_WARNING = 30;

type Status = { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error'; message: string };

interface BlessingsDialogProps {
  wedding: WeddingConfig;
  open: boolean;
  onClose: () => void;
}

export function BlessingsDialog({ wedding, open, onClose }: BlessingsDialogProps) {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [error, setError] = useState<string>();
  const titleId = useId();
  const messageId = useId();
  const nameId = useId();
  const couple = `${wedding.groom.name} & ${wedding.bride.name}`;
  const left = MESSAGE_MAX_LENGTH - message.length;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      setError('Write a few words before sending.');
      return document.getElementById(messageId)?.focus();
    }
    setError(undefined);
    setStatus({ state: 'sending' });
    try {
      await sendToGuestbook(wedding.guestbook.endpoint, { type: 'blessing', name: name.trim(), message: message.trim() });
      setStatus({ state: 'sent' });
      setMessage('');
    } catch (err) {
      setStatus({ state: 'error', message: err instanceof GuestbookError ? err.message : 'That didn’t go through. Try again in a moment.' });
    }
  };

  return (
    <GuestDialog open={open} onClose={onClose} labelledBy={titleId}>
      {status.state === 'sent' ? (
        <div className={forms.done} aria-live="polite">
          <svg className={forms.doneMark} viewBox="0 0 48 48" aria-hidden="true">
            <path pathLength="1" d="M6 23l36-15-11 33-8-13zM23 28l19-20" />
          </svg>
          <h2 id={titleId} className={forms.title}>
            Your blessing is on its way
          </h2>
          <p className={forms.sub}>{couple} will read every word. Thank you.</p>
          <Button variant="outline" onClick={() => setStatus({ state: 'idle' })}>
            Write another
          </Button>
        </div>
      ) : (
        <>
          <h2 id={titleId} className={forms.title}>
            Send your blessings
          </h2>
          <p className={forms.sub}>for {couple}</p>

          <form className={forms.form} onSubmit={submit} noValidate>
            <div className={forms.field}>
              <label htmlFor={messageId} className="visually-hidden">
                Your blessing
              </label>
              <textarea
                id={messageId}
                className={forms.input}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder="Write your blessing…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${messageId}-count${error ? ` ${messageId}-error` : ''}`}
              />
              <div className={styles.meta}>
                {error ? (
                  <p id={`${messageId}-error`} className={forms.error}>
                    {error}
                  </p>
                ) : (
                  <span />
                )}
                <p id={`${messageId}-count`} className={styles.count} data-warn={left <= COUNTER_WARNING}>
                  {message.length} / {MESSAGE_MAX_LENGTH}
                </p>
              </div>
              <p className="visually-hidden" aria-live="polite">
                {left <= COUNTER_WARNING ? `${left} characters left` : ''}
              </p>
            </div>

            <div className={forms.field}>
              <label htmlFor={nameId} className={forms.label}>
                Your name <span className={forms.optional}>(optional)</span>
              </label>
              <input
                id={nameId}
                className={forms.input}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {status.state === 'error' && (
              <p role="alert" className={forms.formError}>
                {status.message}
              </p>
            )}

            <Button type="submit" className={forms.submit} disabled={status.state === 'sending'} aria-busy={status.state === 'sending'}>
              {status.state === 'sending' ? 'Sending…' : 'Send blessing'}
            </Button>
          </form>
        </>
      )}
    </GuestDialog>
  );
}
