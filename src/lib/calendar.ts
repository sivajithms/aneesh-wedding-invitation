interface CalendarEventBase {
  title: string;
  description: string;
  location: string;
}

/** All-day when the exact time isn't known (as on the printed card); timed otherwise. */
export type CalendarEvent = CalendarEventBase &
  ({ allDay: true; date: string } | { allDay: false; start: string; end: string });

/** 2026-12-20T05:30:00.000Z → 20261220T053000Z */
const toUtcStamp = (iso: string): string =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** 2026-12-20 → 20261220 */
const toDateStamp = (date: string): string => date.replaceAll('-', '');

/** All-day events end on the following (exclusive) date. */
const nextDate = (date: string): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
};

/** RFC 5545 text escaping. */
const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

export function googleCalendarUrl(event: CalendarEvent): string {
  const dates = event.allDay
    ? `${toDateStamp(event.date)}/${toDateStamp(nextDate(event.date))}`
    : `${toUtcStamp(event.start)}/${toUtcStamp(event.end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location,
    dates,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsFile(event: CalendarEvent, uid: string): string {
  const timing = event.allDay
    ? [`DTSTART;VALUE=DATE:${toDateStamp(event.date)}`, `DTEND;VALUE=DATE:${toDateStamp(nextDate(event.date))}`]
    : [`DTSTART:${toUtcStamp(event.start)}`, `DTEND:${toUtcStamp(event.end)}`];

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Invitation//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    ...timing,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadTextFile(contents: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
