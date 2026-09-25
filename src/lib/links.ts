import type { WeddingConfig } from '../config/types';

export const mapsUrl = (venue: WeddingConfig['venue']): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapsQuery)}`;
