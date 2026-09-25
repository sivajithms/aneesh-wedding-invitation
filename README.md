# Aneesh with Haseena — digital wedding invitation

The printed wedding card, brought to life. It arrives sealed in an envelope on a linen table. The guest breaks the wax seal, slides the card out, pulls the satin ribbon to untie it and pulls the flap down to unfold it. Each step follows their finger and springs back if they let go too early. Then they lift the card up to the page and scroll through the invitation and its back cover. RSVP, Blessings and Directions stay in a bar at the bottom.

```bash
pnpm install
pnpm dev             # local development
pnpm build           # type-check + production build to dist/
pnpm lint
pnpm share-images    # regenerate the link-preview image and home-screen icon (see below)
```

## Editing the content

All wedding content lives in **`src/config/wedding.ts`**, transcribed verbatim from the card: names, parents, houses, date, Hijri date, venue and every line of wording. Components never hard-code wedding details. Page title, description and link-preview tags are generated from the same file at build time (`vite.config.ts`).

Optional fields:

| Field | Effect |
| --- | --- |
| `time` (`"HH:mm"`) | The card prints no time. Without it the countdown targets the start of the day and calendar exports are all-day events. |
| `messages.closingDua` | Arabic line under the blessing. Until it is set, a small ornament holds its place. |
| `guestbook.endpoint` | Google Apps Script URL that saves RSVPs and blessings into a Google Sheet. Setup: [google-apps-script/README.md](google-apps-script/README.md). While it's empty, replies only log to the console in `pnpm dev`, and the live site tells guests replies aren't connected yet. |
| `guestbook.rsvpDeadline`, `guestbook.maxGuests` | Shown in the RSVP popup; `maxGuests` caps the guest stepper. |
| `meta.siteUrl` | Where the site is hosted. Link previews (WhatsApp, iMessage) need it to find the share image; the build warns while it's unset. |

If you change `messages.bismillah`, update the Amiri font subset in `index.html`. The comment there explains how.

After changing names, date or venue, run `pnpm share-images` to redraw `public/og-image.jpg` (1200×630) and `public/apple-touch-icon.png`. The first time, it needs Chromium: `pnpm exec playwright install chromium`.

## How the physical card maps to the site

The card is one long sheet printed on both sides, with a bottom flap that folds up. The supplied composite shows the inside face (left) and the outside face (right). The flap's outer face is printed upside down so that it reads upright once folded.

| Panel | On the composite | In the site |
| --- | --- | --- |
| Front (closed card) | Right strip, lower part, **upside down** (rotated 180° here) | `FrontCover` on the flap of the closed card in `Opening` |
| Inside, top | Left strip, upper part | `InvitationPanel`: monograms and framed invitation |
| Inside of the flap | Left strip, lower part | `BlessingPanel`: blessing, "You are invited" heart, names |
| Back | Right strip, upper part | `SaveTheDate`: "Save the Date", summary band, plus countdown, calendar and directions |

The printer's credit on the back (`mkrcards.com`) is intentionally not reproduced.

## Structure

```
src/
  config/        wedding.ts (content), types.ts
  components/
    opening/     Opening (scene markup), director.ts (the choreography), ribbon.ts (bow geometry), WaxSeal
    card/        The card's panels, reused in the opening scene and on the page
    sections/    UnfoldedCard, SaveTheDate, SiteFooter
    guest/       Reply bar, RSVP and Blessings popups, sound switch
    ui/          Button, Reveal (scroll-scrubbed), Monogram, Ornament, icons
  hooks/         reduced motion, in-view, countdown, tilt, scroll lock, smooth scroll (Lenis)
  lib/           dates in the card's formats, calendar (.ics / Google), links, guestbook, GSAP, sound
  constants/     motion timings and thresholds
  styles/        tokens (palette sampled from the card, type scale), global
```

## Notes

- **Choreography.** `director.ts` is a small state machine. Gestures (GSAP Draggable), scrolling (wheel, swipe, keys, scrubbed with easing) and timed GSAP timelines only write to one state object; a single `render()` draws the scene from it. At the end the card's pose lands exactly on the page's card (to a fraction of a pixel), so the fade between them is invisible.
- **3D is CSS only.** Envelope flap, card flap, tilt and shadows are CSS 3D transforms, with SVG for the bow. WebGL would have meant rendering the card's text as textures, making it blurry and inaccessible for no visual gain. Initial JS is about 115 KB gzipped. Draggable, ScrollTrigger and Lenis (36 KB) load after first paint.
- **Sound.** Paper, wax and satin sounds are synthesised with Web Audio (`lib/sound.ts`), so there are no audio files. They start after the first tap, as browsers require, and the speaker button turns them off (remembered per device).
- **Accessibility.** Card text is real HTML. The opening scene is visual only, and the page behind it stays `inert` until the card is open. Focus then moves to the invitation heading. Every step's hint is also a button that does the step, so the whole opening works by keyboard or a single tap per step. `prefers-reduced-motion` turns the opening into one tap and a cross-fade, and disables tilt, drift, smooth scrolling and scrubbed reveals.
- **Contrast adaptations.** The card prints white text on the pale-grey band and some copy in light tan or grey. Those use darker tints of the same hues here, to stay legible.
