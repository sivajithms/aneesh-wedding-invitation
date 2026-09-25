import type { WeddingConfig } from '../../config/types';
import { useTilt } from '../../hooks/useTilt';
import { getDateParts } from '../../lib/date';
import { MapPinIcon } from '../ui/icons';
import { Monogram } from '../ui/Monogram';
import { Ornament } from '../ui/Ornament';
import styles from './InvitationPanel.module.css';

interface InvitationPanelProps {
  wedding: WeddingConfig;
  /** Rendered as a miniature inside the opening card: no heading semantics, no interaction. */
  decorative?: boolean;
}

/** Inside, top of the card: the monograms and the framed invitation wording. */
export function InvitationPanel({ wedding, decorative = false }: InvitationPanelProps) {
  const { groom, bride, messages, venue } = wedding;
  const { weekday, day, month, year } = getDateParts(wedding.date);
  const tilt = useTilt<HTMLDivElement>();
  const Names = decorative ? 'p' : 'h1';

  return (
    <div className={styles.panel}>
      <div className={styles.monograms}>
        <Monogram letters={wedding.monogram} shape="circle" className={styles.monogram} />
        <Monogram letters={wedding.monogram} shape="blob" className={styles.monogram} />
      </div>

      <div className={styles.frame} {...(!decorative && tilt)}>
        <div className={styles.inner}>
          <p className={styles.bismillah} lang="ar" dir="rtl">
            {messages.bismillah}
          </p>
          <p>{messages.opening}</p>

          <p className={styles.family}>
            {groom.parents}
            <br />
            {groom.house}
          </p>

          <p className={styles.request}>{messages.request}</p>

          <Names
            id={decorative ? undefined : 'invitation-title'}
            tabIndex={decorative ? undefined : -1}
            className={styles.names}
          >
            <span className={styles.name}>{groom.name}</span>
            <span className={styles.joiner}>{messages.joiner}</span>
            <span className={styles.name}>{bride.name}</span>
          </Names>

          <p className={styles.family}>
            {messages.brideRelation} {bride.parents}
            <br />
            {bride.house}
          </p>

          <div className={styles.details}>
            <p className={styles.when}>
              <time dateTime={wedding.date}>
                <span className={styles.day}>{day}</span>
                <span className={styles.line}>{month},</span>
                <span className={styles.line}>
                  {weekday} {year}
                </span>
              </time>
              <span className={styles.line}>{wedding.hijriDate}</span>
            </p>
            <p className={styles.where}>
              <MapPinIcon className={styles.pin} />
              <span className={styles.venue}>{venue.name}</span>
              <span className={styles.line}>{venue.location}</span>
            </p>
          </div>

          <p className={styles.honoured}>{messages.honoured}</p>
          <Ornament className={styles.ornament} />
          <p className={styles.compliments}>
            {messages.compliments.label}
            <br />
            {messages.compliments.names}
          </p>
        </div>
      </div>
    </div>
  );
}
