import { useSyncExternalStore } from 'react';
import { cx } from '../../lib/css';
import { sound } from '../../lib/sound';
import { SoundIcon } from '../ui/icons';
import styles from './SoundToggle.module.css';

/**
 * In the corner during the opening; afterwards it sits in the reply bar, clear of the card.
 * Browsers only start audio after a tap or click, so until then it offers one.
 */
export function SoundToggle({ inline = false, className }: { inline?: boolean; className?: string }) {
  const snapshot = useSyncExternalStore(sound.subscribe, sound.getSnapshot);
  const [preference, state] = snapshot.split(':');
  const enabled = preference === 'on';
  const waiting = enabled && state !== 'running';

  return (
    <button
      type="button"
      className={cx(inline ? styles.inline : styles.corner, className)}
      aria-pressed={enabled && !waiting}
      data-waiting={waiting}
      onClick={() => sound.setEnabled(waiting || !enabled)}
    >
      <SoundIcon muted={!enabled || waiting} />
      {waiting && !inline ? <span className={styles.label}>Tap for sound</span> : <span className="visually-hidden">Sound effects</span>}
    </button>
  );
}
