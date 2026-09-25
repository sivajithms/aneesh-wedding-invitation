import type { Ref } from 'react';
import type { WeddingConfig } from '../../config/types';
import { BlessingPanel } from '../card/BlessingPanel';
import { InvitationPanel } from '../card/InvitationPanel';
import styles from './UnfoldedCard.module.css';

interface UnfoldedCardProps {
  wedding: WeddingConfig;
  /** The opening scene lands its card exactly on this one, then fades away. */
  ref?: Ref<HTMLElement>;
}

/** The inside of the card, fully unfolded: invitation above the fold, the flap's blessing below. */
export function UnfoldedCard({ wedding, ref }: UnfoldedCardProps) {
  return (
    <article ref={ref} id="top" className={styles.card} aria-labelledby="invitation-title">
      <InvitationPanel wedding={wedding} />
      <div className={styles.crease} aria-hidden="true" />
      <div className={styles.flap}>
        <BlessingPanel wedding={wedding} />
      </div>
    </article>
  );
}
