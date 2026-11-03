export interface TimelineEvent {
  time: string;
  title: string;
  place: string;
  mapUrl?: string;
}

export interface Partner {
  name: string;
  parents: string;
  house: string;
}

export interface ContactPerson {
  name: string;
  phone: string;
  role?: string;
}

export interface GuestbookConfig {
  endpoint: string;
  rsvpDeadline?: string;
  maxGuests: number;
}

export interface WeddingMessages {
  bismillah: string;
  opening: string;
  request: string;
  joiner: string;
  brideRelation: string;
  honoured: string;
  compliments: { label: string; names: string };
  blessing: string;
  closingDua?: string;
  invited: string;
  saveTheDate: { save: string; the: string; date: string };
}

export interface WeddingConfig {
  groom: Partner;
  bride: Partner;
  monogram: [string, string];

  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  utcOffset: string;
  timeZone: string;
  locale: string;
  hijriDate: string;

  venue: {
    name: string;
    location: string;
    mapsQuery: string;
    lat: number;
    lon: number;
    phone: string;
  };

  contacts: ContactPerson[];
  timeline: TimelineEvent[];

  dua: {
    arabic: string;
    transliteration: string;
    translation: string;
  };

  messages: WeddingMessages;
  guestbook: GuestbookConfig;

  music?: {
    title: string;
    artist?: string;
    src: string;
  };

  meta: {
    title: string;
    description: string;
    themeColor: string;
    siteUrl?: string;
  };
}
