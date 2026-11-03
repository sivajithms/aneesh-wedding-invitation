import type { WeddingConfig } from '../../config/types';
import { getDateParts } from '../../lib/date';
import styles from './Card1Formal.module.css';

interface Card1FormalProps {
  wedding: WeddingConfig;
  isLifting?: boolean;
}

export function Card1Formal({ wedding, isLifting = false }: Card1FormalProps) {
  const { weekday, day, month, year } = getDateParts(wedding.date);

  return (
    <div
      className={`${styles.cardFormal} ${isLifting ? styles.lifting : ''}`}
      id="image1"
      aria-hidden="true"
    >
      <div className={styles.innerSheet}>
        {/* Top Monograms Badges */}
        <div className={styles.cardMonograms}>
          <span className={styles.monogramBadge}>{wedding.monogram[0]}</span>
          <span className={styles.monogramBadge}>{wedding.monogram[1]}</span>
        </div>

        {/* Bismillah & Opening */}
        <div>
          <p className={styles.bismillah} lang="ar" dir="rtl">
            {wedding.messages.bismillah}
          </p>
          <p className={styles.opening}>{wedding.messages.opening}</p>
        </div>

        {/* Groom's Family */}
        <div className={styles.family}>
          <strong>{wedding.groom.parents}</strong>
          <span>{wedding.groom.house}</span>
        </div>

        {/* Formal Request */}
        <p className={styles.request}>{wedding.messages.request}</p>

        {/* Names of Groom & Bride */}
        <div className={styles.namesBlock}>
          <span className={styles.groom}>{wedding.groom.name}</span>
          <span className={styles.joiner}>{wedding.messages.joiner}</span>
          <span className={styles.bride}>{wedding.bride.name}</span>
        </div>

        {/* Bride's Family */}
        <div className={styles.family}>
          <span>{wedding.messages.brideRelation}</span>
          <strong>{wedding.bride.parents}</strong>
          <span>{wedding.bride.house}</span>
        </div>

        {/* Date & Venue 2-Column Grid */}
        <div className={styles.grid}>
          <div className={styles.when}>
            <span className={styles.dayNum}>{day}</span>
            <span className={styles.dayText}>
              {month}, {weekday} {year}
            </span>
            <span className={styles.hijri}>{wedding.hijriDate}</span>
          </div>

          <div className={styles.divider} aria-hidden="true" />

          <div className={styles.where}>
            <svg
              className={styles.pin}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span className={styles.venueName}>{wedding.venue.name}</span>
            <span className={styles.venueLoc}>{wedding.venue.location}</span>
          </div>
        </div>

        {/* Blessing & Compliments */}
        <div className={styles.blessingSection}>
          <p className={styles.blessing}>{wedding.messages.blessing}</p>
          <p className={styles.compliments}>
            {wedding.messages.compliments.label}{' '}
            <strong>{wedding.messages.compliments.names}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

