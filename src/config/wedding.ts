// Explicit extension: this file is also loaded by vite.config.ts.
import type { WeddingConfig } from './types.ts';

/**
 * Every piece of wedding-specific content lives here, transcribed from the printed card.
 * Edit this file to update the invitation — no component changes needed.
 */
export const wedding: WeddingConfig = {
  groom: {
    name: 'Aneesh',
    parents: 'Abu & Shahitha',
    house: 'Arinhippurath House',
  },
  bride: {
    name: 'Haseena',
    parents: 'Ashraf & Mumthas',
    house: 'Melayil House',
  },
  monogram: ['A', 'H'],

  date: '2026-12-20',
  // time: '11:00', // TODO: not printed on the card — add once confirmed.
  utcOffset: '+05:30',
  timeZone: 'Asia/Kolkata',
  locale: 'en-GB',
  hijriDate: '1 Rajab',

  venue: {
    name: 'Galaxy Convention Centre',
    location: 'Changaramkulam',
    mapsQuery: 'Galaxy Convention Centre, Changaramkulam',
  },

  messages: {
    bismillah: 'بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    opening: 'With the blessings of Allah Almighty,',
    request:
      'Request the honour of your gracious presence and blessings with family on the auspicious occasion of the marriage of their beloved son',
    joiner: 'with',
    brideRelation: 'Daughter of',
    honoured: 'We would be honoured by your presence as we celebrate this blessed beginning together.',
    compliments: { label: 'With Best Compliments From', names: 'Eyza and Hila' },
    // The card reads "happines"; corrected spelling here.
    blessing: 'May Allah bless the couple with a lifetime of love, peace and happiness',
    // closingDua: '…', // TODO: the small Arabic calligraphy under the blessing is not legible in the scan.
    invited: 'You are invited',
    saveTheDate: { save: 'Save', the: 'the', date: 'Date' },
  },

  guestbook: {
    // Google Apps Script web app (google-apps-script/README.md).
    endpoint: 'https://script.google.com/macros/s/AKfycbwfFnvBatRQncUAsxwM8Xq8NFtakyVJjTKcCYrLdHRMkN1Mow__yBC8q3S3HdafUSBA/exec',
    maxGuests: 6,
  },

  meta: {
    description:
      'With the blessings of Allah Almighty — the wedding of Aneesh with Haseena on Sunday 20th December 2026 at Galaxy Convention Centre, Changaramkulam.',
    themeColor: '#ebe4d6',
    // siteUrl: 'https://…', // TODO: set once hosted so WhatsApp and iMessage previews show the image.
  },
};
