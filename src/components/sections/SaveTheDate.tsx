import type { WeddingConfig } from '../../config/types';
import { useCountdown } from '../../hooks/useCountdown';
import { createIcsFile, downloadTextFile, googleCalendarUrl } from '../../lib/calendar';
import { formatCardDate, formatOrdinalDay, getDateParts } from '../../lib/date';
import { mapsUrl } from '../../lib/links';
import { getCalendarEvent, getWeddingStart } from '../../lib/wedding';
import { Button, LinkButton } from '../ui/Button';
import { CalendarIcon, MapPinIcon } from '../ui/icons';
import { Reveal } from '../ui/Reveal';
import styles from './SaveTheDate.module.css';

const COUNTDOWN_UNITS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
] as const;

/** Isolated so the once-a-second tick re-renders only the numbers. */
function Countdown({ target }: { target: string }) {
  const remaining = useCountdown(target);
  if (remaining.isComplete) return null;

  return (
    <ol className={styles.units} aria-label="Time until the wedding">
      {COUNTDOWN_UNITS.map(({ key, label }) => (
        <li key={key} className={styles.unit}>
          <span key={remaining[key]} className={styles.value}>
            {String(remaining[key]).padStart(2, '0')}
          </span>
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** The back of the card: "Save the Date" and the summary band, plus countdown, calendar and directions. */
export function SaveTheDate({ id, wedding }: { id: string; wedding: WeddingConfig }) {
  const { groom, bride, venue, messages } = wedding;
  const { saveTheDate } = messages;
  const { weekday, month, year } = getDateParts(wedding.date);
  const calendarEvent = getCalendarEvent(wedding);
  const titleId = `${id}-title`;

  const downloadIcs = () =>
    downloadTextFile(createIcsFile(calendarEvent, `${wedding.date}@wedding-invitation`), 'wedding.ics', 'text/calendar');

  return (
    <section id={id} className={styles.section} aria-labelledby={titleId}>
      <Reveal variant="flip" className={styles.card}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.display}>
            <span className="visually-hidden">{`${saveTheDate.save} ${saveTheDate.the} ${saveTheDate.date}`}</span>
            <span className={styles.save} aria-hidden="true">
              {saveTheDate.save}
            </span>
            <span className={styles.the} aria-hidden="true">
              {saveTheDate.the}
            </span>
            <span className={styles.date} aria-hidden="true">
              {saveTheDate.date}
            </span>
          </h2>
          <p className={styles.on}>
            On <time dateTime={wedding.date}>{formatCardDate(wedding.date)}</time>
          </p>

          <Countdown target={getWeddingStart(wedding)} />

          <div className={styles.actions}>
            <LinkButton href={googleCalendarUrl(calendarEvent)} external>
              <CalendarIcon /> Google Calendar
            </LinkButton>
            <Button variant="outline" onClick={downloadIcs}>
              <CalendarIcon /> Apple / Outlook
            </Button>
          </div>
        </div>

        <div className={styles.band}>
          <p className={styles.bandNames}>
            <span>{groom.name}</span>
            <span className={styles.bandWith}>{messages.joiner}</span>
            <span>{bride.name}</span>
          </p>
          <p className={styles.bandText}>
            <time dateTime={wedding.date}>
              On {weekday}
              <br />
              {formatOrdinalDay(wedding.date)} {month}
              <br />
              {year}
            </time>
          </p>
          <p className={styles.bandText}>
            {venue.name}
            <br />
            {venue.location}
          </p>
        </div>

        <div className={styles.foot}>
          <LinkButton href={mapsUrl(venue)} variant="solid" external>
            <MapPinIcon /> Get directions
            <span className="visually-hidden"> to {venue.name}</span>
          </LinkButton>
        </div>
      </Reveal>
    </section>
  );
}
