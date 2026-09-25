import { cx } from '../../lib/css';
import styles from './Monogram.module.css';

interface MonogramProps {
  letters: [string, string];
  /** The card pairs a round badge with an organic, hand-cut blob. */
  shape?: 'circle' | 'blob';
  className?: string;
}

/** The couple's interlaced initials on a tan badge. Decorative — names appear as text elsewhere. */
export function Monogram({ letters, shape = 'circle', className }: MonogramProps) {
  return (
    <span className={cx(styles.monogram, className)} data-shape={shape} aria-hidden="true">
      <span className={styles.first}>{letters[0]}</span>
      <span className={styles.second}>{letters[1]}</span>
    </span>
  );
}
