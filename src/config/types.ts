export interface Partner {
  name: string;
  /** Parents, exactly as printed on the card. */
  parents: string;
  house: string;
}

export interface GuestbookConfig {
  /**
   * The Google Apps Script web app that writes RSVPs and blessings into your Google Sheet
   * (its URL ends in /exec). See google-apps-script/README.md. Leave empty until it's deployed.
   */
  endpoint: string;
  /** YYYY-MM-DD, shown in the RSVP popup. Optional. */
  rsvpDeadline?: string;
  /** Largest party one reply can include, counting the guest. */
  maxGuests: number;
}

export interface WeddingConfig {
  groom: Partner;
  bride: Partner;
  monogram: [string, string];

  /** Calendar date, YYYY-MM-DD. */
  date: string;
  /** 24h "HH:mm" if known. The card prints no time, so the countdown targets the start of the day. */
  time?: string;
  /** Offset of the wedding's time zone, used to build exact instants (e.g. for the countdown). */
  utcOffset: string;
  /** IANA zone used to display dates, regardless of where the guest is. */
  timeZone: string;
  locale: string;
  /** Islamic calendar date as printed on the card. */
  hijriDate: string;

  venue: {
    name: string;
    location: string;
    mapsQuery: string;
  };

  messages: {
    bismillah: string;
    opening: string;
    request: string;
    joiner: string;
    brideRelation: string;
    honoured: string;
    compliments: { label: string; names: string };
    blessing: string;
    /** Arabic dua printed under the blessing. Unset until the exact wording is confirmed. */
    closingDua?: string;
    invited: string;
    saveTheDate: { save: string; the: string; date: string };
  };

  /** RSVPs and blessings; not printed on the card. */
  guestbook: GuestbookConfig;

  meta: {
    description: string;
    themeColor: string;
    /** Where the invitation is hosted, e.g. https://aneesh-haseena.netlify.app. Link previews need it
     * to find the share image; without it the image path is relative and some apps won't show it. */
    siteUrl?: string;
  };
}
