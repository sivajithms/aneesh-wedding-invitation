# Aneesh with Haseena — digital wedding invitation

The printed wedding card, brought to life. It arrives sealed in an envelope on a linen table, and scrolling opens it. The wax seal lifts away and the flap opens. The card slides out and its satin ribbon unties and falls. The card's flap unfolds, and the card rises to reading size, landing on the page. Scrolling back up plays it all in reverse. After that the guest scrolls through the invitation and its back cover, with RSVP, Blessings and Directions in a bar at the bottom.

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
    opening/     Opening (scene markup), director.ts (the scroll choreography), ribbon.ts (bow geometry), WaxSeal
    card/        The card's panels, reused in the opening scene and on the page
    sections/    UnfoldedCard, SaveTheDate, SiteFooter
    guest/       Reply bar, RSVP and Blessings popups, sound switch
    ui/          Button, Reveal (scroll-scrubbed), Monogram, Ornament, icons
  hooks/         reduced motion, in-view, countdown, tilt, smooth scroll (Lenis)
  lib/           dates in the card's formats, calendar (.ics / Google), links, guestbook, GSAP, sound
  constants/     motion timings and thresholds
  styles/        tokens (palette sampled from the card, type scale), global
```

## Notes

- **Choreography.** The opening is a tall section (`OPENING.screens` viewport heights, in `constants/motion.ts`) whose stage stays pinned while the page scrolls. ScrollTrigger scrubs one GSAP timeline with the scroll position, and each chapter (seal, flap, slide, untie, fall, unfold, lift) is a span on it. The timeline only moves 0→1 values; `render()` in `director.ts` draws the scene from them, so it plays backwards as naturally as forwards. The page overlaps the section's last screen, so when the stage lets go the card is exactly where the page's card is, and the two scroll away together. Lenis smooths wheel and trackpad scrolling; touch stays native. The card leans slightly against fast scrolling and drifts gently at rest. A "Keep scrolling" cue appears after a pause, and tapping it plays the rest.
- **3D is CSS only.** Envelope flap, card flap, tilt and shadows are CSS 3D transforms, with SVG for the bow. WebGL would have meant rendering the card's text as textures, making it blurry and inaccessible for no visual gain. Initial JS is about 115 KB gzipped. ScrollTrigger and Lenis (23 KB) load just after first paint.
- **Sound.** Soft bells (D major pentatonic), paper and satin textures that follow scroll speed, and a faint ambient chord, all synthesised with Web Audio through a small reverb (`lib/sound.ts`). There are no audio files. Browsers only start audio after a tap, click or key press (scrolling doesn't count), so a "Tap for sound" chip shows until then. The speaker button turns sound off, remembered per device.
- **Accessibility.** Card text is real HTML. The opening scene is decorative and hidden from assistive tech. While it plays, the page is transparent but still in the reading order, and a "Skip the opening" link jumps straight to the invitation. Keyboard scrolling (Space, Page Down, arrows) plays the opening like any other scroll. `prefers-reduced-motion` turns the opening into a short scroll cross-fade and disables tilt, drift, smooth scrolling and scrubbed reveals.
- **Contrast adaptations.** The card prints white text on the pale-grey band and some copy in light tan or grey. Those use darker tints of the same hues here, to stay legible.
