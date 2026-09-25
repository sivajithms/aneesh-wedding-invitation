import { useSyncExternalStore } from 'react';
import { cx } from '../../lib/css';
import { sound } from '../../lib/sound';
import { SoundIcon } from '../ui/icons';
import styles from './SoundToggle.module.css';

/** In the corner during the opening; afterwards it sits in the reply bar, clear of the card. */
export function SoundToggle({ inline = false, className }: { inline?: boolean; className?: string }) {
  const enabled = useSyncExternalStore(sound.subscribe, sound.getEnabled);
  return (
    <button
      type="button"
      className={cx(inline ? styles.inline : styles.corner, className)}
      aria-pressed={enabled}
      onClick={() => sound.setEnabled(!enabled)}
    >
      <SoundIcon muted={!enabled} />
      <span className="visually-hidden">Sound effects</span>
    </button>
  );
}
