// Renders the link-preview image (public/og-image.jpg, 1200×630) and the home-screen icon
// (public/apple-touch-icon.png, 180×180) from src/config/wedding.ts.
// Run after changing names, date or venue:  pnpm share-images
// Needs Chromium for Playwright once:  pnpm exec playwright install chromium
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { wedding } from '../src/config/wedding.ts';

const out = (file) => fileURLToPath(new URL(`../public/${file}`, import.meta.url));
const { groom, bride, venue, monogram, messages } = wedding;

const instant = new Date(`${wedding.date}T12:00:00${wedding.utcOffset}`);
const part = (options) => new Intl.DateTimeFormat(wedding.locale, { timeZone: wedding.timeZone, ...options }).format(instant);
const day = Number(part({ day: 'numeric' }));
const ordinal = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] ?? 'th');
const cardDate = `${part({ weekday: 'long' })} ${day}${ordinal} ${part({ month: 'long' })} ${part({ year: 'numeric' })}`;

const FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&family=Fira+Sans:wght@400&family=Pinyon+Script&display=block';

const grain = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .4  0 0 0 0 .33  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

// Same wax seal as src/components/opening/WaxSeal.tsx.
const seal = (size) => `
<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow:visible;filter:drop-shadow(0 6px 8px rgb(60 35 15 / .35))">
  <defs>
    <radialGradient id="wax" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#c99160"/><stop offset=".55" stop-color="#9a6334"/><stop offset="1" stop-color="#6a3f1f"/></radialGradient>
    <radialGradient id="press" cx="60%" cy="68%" r="70%"><stop offset="0" stop-color="#a8703f"/><stop offset="1" stop-color="#7a4a25"/></radialGradient>
    <filter id="rim" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
  </defs>
  <circle cx="50" cy="50" r="44" fill="url(#wax)" filter="url(#rim)"/>
  <circle cx="50" cy="50" r="31" fill="url(#press)" stroke="rgb(255 222 188 / .32)" stroke-width="1.4"/>
  <circle cx="50" cy="50" r="27.5" fill="none" stroke="rgb(60 32 12 / .35)" stroke-width=".8"/>
  <g font-family="'Cormorant Garamond'" font-style="italic" font-weight="500" font-size="30" text-anchor="middle">
    <g fill="rgb(255 220 185 / .4)" transform="translate(.9 .9)"><text x="44" y="57">${monogram[0]}</text><text x="56" y="61">${monogram[1]}</text></g>
    <g fill="#5b3417"><text x="44" y="57">${monogram[0]}</text><text x="56" y="61">${monogram[1]}</text></g>
  </g>
  <ellipse cx="36" cy="28" rx="13" ry="6.5" fill="rgb(255 240 220 / .22)" transform="rotate(-24 36 28)"/>
</svg>`;

const base = `
  <link rel="stylesheet" href="${FONTS}">
  <style>
    * { margin: 0; box-sizing: border-box; }
    body {
      display: grid; place-items: center; overflow: hidden;
      background:
        radial-gradient(ellipse at 50% 30%, rgb(255 253 248 / .7), transparent 60%),
        radial-gradient(ellipse at 50% 50%, transparent 55%, rgb(60 40 15 / .16)),
        ${grain}, #ebe4d6;
    }
    .band {
      position: absolute; left: -10px; right: -10px; height: 34px;
      background:
        repeating-linear-gradient(90deg, rgb(255 255 255 / .05) 0 1px, transparent 1px 3px),
        linear-gradient(180deg, #96643b, #c79163 18%, #eac59f 44%, #d4a273 60%, #b07a4d 82%, #8c5c35);
      box-shadow: 0 3px 6px rgb(60 40 15 / .3);
    }
  </style>`;

const preview = `<!doctype html><html><head>${base}
  <style>
    body { width: 1200px; height: 630px; }
    .envelope {
      position: relative; width: 1060px; height: 520px; overflow: hidden; rotate: -1.2deg;
      background: linear-gradient(rgb(243 237 227 / .85) 0 0), ${grain}, #f3ede3;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgb(60 45 25 / .1), 0 40px 70px -24px rgb(60 45 25 / .45);
    }
    .band { top: 118px; }
    .seal { position: absolute; left: 50%; top: 135px; translate: -50% -50%; }
    .text { position: absolute; inset: 250px 0 0; text-align: center; }
    .names { font: 400 104px/1 'Pinyon Script'; color: #a66f40; }
    .names small { font-size: .5em; }
    .date { margin-top: 26px; font: italic 500 38px/1.2 'Cormorant Garamond'; color: #3b3b3b; }
    .venue { margin-top: 14px; font: 400 22px/1.3 'Fira Sans'; letter-spacing: .02em; color: #5f5f5f; }
  </style></head><body>
  <div class="envelope">
    <div class="band"></div>
    <div class="seal">${seal(150)}</div>
    <div class="text">
      <p class="names">${groom.name} <small>${messages.joiner}</small> ${bride.name}</p>
      <p class="date">${cardDate}</p>
      <p class="venue">${venue.name}, ${venue.location}</p>
    </div>
  </div>
</body></html>`;

const icon = `<!doctype html><html><head>${base}
  <style>body { width: 180px; height: 180px; } .band { top: 73px; height: 22px; }</style></head>
  <body><div class="band"></div><div style="position:relative">${seal(128)}</div></body></html>`;

const browser = await chromium.launch();
try {
  const render = async (html, width, height, path, type) => {
    // A dropped font request would silently bake fallback faces into the image, so check and retry.
    for (let attempt = 1; ; attempt++) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(html, { waitUntil: 'networkidle' });
      const loaded = await page.evaluate(async () => {
        const faces = ['40px "Pinyon Script"', 'italic 500 40px "Cormorant Garamond"', '40px "Fira Sans"'];
        await Promise.all(faces.map((font) => document.fonts.load(font).catch(() => [])));
        return faces.every((font) => document.fonts.check(font));
      });
      if (loaded) {
        await page.screenshot({ path, type, ...(type === 'jpeg' && { quality: 88 }) });
        await page.close();
        return console.log(`wrote ${path}`);
      }
      await page.close();
      if (attempt === 3) throw new Error('Could not load the Google Fonts after 3 tries; check the connection.');
    }
  };
  await render(preview, 1200, 630, out('og-image.jpg'), 'jpeg');
  await render(icon, 180, 180, out('apple-touch-icon.png'), 'png');
} finally {
  await browser.close();
}
