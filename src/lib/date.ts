import { wedding } from '../config/wedding';

const { locale, timeZone, utcOffset } = wedding;

/** Midday avoids any chance of a calendar date shifting across time zones. */
const toDisplayInstant = (date: string) => new Date(`${date}T12:00:00${utcOffset}`);

const part = (date: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(toDisplayInstant(date));

const ordinalSuffix = (day: number): string => {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
};

export interface DateParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
}

export const getDateParts = (date: string): DateParts => ({
  weekday: part(date, { weekday: 'long' }),
  day: part(date, { day: 'numeric' }),
  month: part(date, { month: 'long' }),
  year: part(date, { year: 'numeric' }),
});

/** "20th" */
export const formatOrdinalDay = (date: string): string => {
  const { day } = getDateParts(date);
  return `${day}${ordinalSuffix(Number(day))}`;
};

/** "Sunday 20th December 2026" — the phrasing used throughout the card. */
export function formatCardDate(date: string): string {
  const { weekday, month, year } = getDateParts(date);
  return `${weekday} ${formatOrdinalDay(date)} ${month} ${year}`;
}
