import type { WeddingConfig } from '../config/types';
import type { CalendarEvent } from './calendar';

/** Used for timed calendar entries once a start time is configured. */
const DEFAULT_EVENT_DURATION_HOURS = 4;
const HOUR_MS = 60 * 60 * 1000;

/** Exact start instant: the configured time, or the start of the day when the card gives none. */
export const getWeddingStart = (config: WeddingConfig): string =>
  `${config.date}T${config.time ?? '00:00'}:00${config.utcOffset}`;

export const getVenueLine = (config: WeddingConfig): string => `${config.venue.name}, ${config.venue.location}`;

export function getCalendarEvent(config: WeddingConfig): CalendarEvent {
  const base = {
    title: `Wedding of ${config.groom.name} with ${config.bride.name}`,
    description: config.messages.honoured,
    location: getVenueLine(config),
  };
  if (!config.time) return { ...base, allDay: true, date: config.date };

  const start = getWeddingStart(config);
  const end = new Date(Date.parse(start) + DEFAULT_EVENT_DURATION_HOURS * HOUR_MS).toISOString();
  return { ...base, allDay: false, start, end };
}
