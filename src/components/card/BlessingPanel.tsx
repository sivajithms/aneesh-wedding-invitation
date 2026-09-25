import type { WeddingConfig } from '../../config/types';
import { useInView } from '../../hooks/useInView';
import { REVEAL_OBSERVER_OPTIONS } from '../../constants/motion';
import { formatCardDate } from '../../lib/date';
import { Ornament } from '../ui/Ornament';
import styles from './BlessingPanel.module.css';

interface BlessingPanelProps {
  wedding: WeddingConfig;
  /** Rendered on the flap inside the opening card: no heading semantics, heart already drawn. */
  decorative?: boolean;
}

/** Inside of the flap: the closing blessing and the "You are invited" heart. */
export function BlessingPanel({ wedding, decorative = false }: BlessingPanelProps) {
  const { groom, bride, messages } = wedding;
  const [heartRef, heartInView] = useInView<HTMLDivElement>({ once: true, ...REVEAL_OBSERVER_OPTIONS });
  const Heading = decorative ? 'p' : 'h2';

  return (
    <div className={styles.panel}>
      <p className={styles.blessing}>{messages.blessing}</p>
      {messages.closingDua ? (
        <p className={styles.dua} lang="ar" dir="rtl">
          {messages.closingDua}
        </p>
      ) : (
        <Ornament className={styles.duaPlaceholder} />
      )}

      <div ref={heartRef} className={styles.invited} data-drawn={decorative || heartInView}>
        <svg className={styles.heart} viewBox="0 0 120 110" aria-hidden="true" focusable="false">
          {/* Open-ended heart: the stroke leaves a gap where the script crosses it. */}
          <path pathLength="1" d="M34 70 C16 52 8 36 16 22 C26 5 50 8 60 28 C70 8 96 4 106 24 C116 46 94 70 60 100" />
        </svg>
        <Heading className={styles.invitedText}>{messages.invited}</Heading>
      </div>

      <p className={styles.couple}>
        {groom.name} <span className={styles.with}>{messages.joiner}</span> {bride.name}
      </p>
      <p className={styles.date}>
        On <time dateTime={wedding.date}>{formatCardDate(wedding.date)}</time>
      </p>
    </div>
  );
}
