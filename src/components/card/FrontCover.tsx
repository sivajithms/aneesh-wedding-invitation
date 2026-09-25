import type { WeddingConfig } from '../../config/types';
import { formatCardDate } from '../../lib/date';
import styles from './FrontCover.module.css';

/**
 * Outer face of the flap — the front of the closed card.
 * Printed upside down on the flat sheet; it reads upright once the flap is folded up.
 */
export function FrontCover({ wedding }: { wedding: WeddingConfig }) {
  return (
    <div className={styles.cover}>
      <p className={styles.names}>
        {wedding.groom.name} <span className={styles.with}>{wedding.messages.joiner}</span> {wedding.bride.name}
      </p>
      <p className={styles.date}>On {formatCardDate(wedding.date)}</p>
    </div>
  );
}
