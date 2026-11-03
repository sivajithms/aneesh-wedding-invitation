import type { WeddingConfig } from './types';

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
  time: '11:00',
  utcOffset: '+05:30',
  timeZone: 'Asia/Kolkata',
  locale: 'en-GB',
  hijriDate: '1 Rajab',

  venue: {
    name: 'Galaxy Convention Centre',
    location: 'Changaramkulam',
    mapsQuery: 'Galaxy Convention Centre, Changaramkulam',
    lat: 10.7497,
    lon: 76.0125,
    phone: '+919895603210',
  },

  contacts: [
    {
      name: 'Galaxy Convention Centre',
      phone: '+919895603210',
      role: 'Venue & Directions',
    },
    {
      name: 'Family Enquiries',
      phone: '+919876543210',
      role: 'Wedding Enquiries',
    },
  ],

  timeline: [
    {
      time: '10:30 AM',
      title: 'Nikah & Welcome of Guests',
      place: 'Galaxy Convention Centre, Changaramkulam',
    },
    {
      time: '11:30 AM onwards',
      title: 'Wedding Ceremony & Feast',
      place: 'Galaxy Convention Centre, Changaramkulam',
      mapUrl: 'https://www.google.com/maps/search/?api=1&query=Galaxy%20Convention%20Centre%2C%20Changaramkulam',
    },
  ],

  dua: {
    arabic: 'بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
    transliteration: 'Bārakallāhu lakumā wa bāraka ʿalaykumā wa jamaʿa baynakumā fī khayr',
    translation: 'May Allah bless you both, shower His blessings upon you, and unite you in goodness.',
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
    blessing: 'May Allah bless the couple with a lifetime of love, peace and happiness',
    invited: 'You are invited',
    saveTheDate: { save: 'Save', the: 'the', date: 'Date' },
  },

  guestbook: {
    endpoint: 'https://script.google.com/macros/s/AKfycbwfFnvBatRQncUAsxwM8Xq8NFtakyVJjTKcCYrLdHRMkN1Mow__yBC8q3S3HdafUSBA/exec',
    maxGuests: 6,
  },

  music: {
    title: 'Canon in D Major',
    artist: 'Johann Pachelbel',
    src: '/audio/canon-in-d.mp3',
  },

  meta: {
    title: 'Aneesh & Haseena · Wedding Invitation',
    description:
      'With the blessings of Allah Almighty — the wedding of Aneesh with Haseena on Sunday 20th December 2026 at Galaxy Convention Centre, Changaramkulam.',
    themeColor: '#ebe4d6',
    siteUrl: 'https://aneesh-haseena.netlify.app',
  },
};
