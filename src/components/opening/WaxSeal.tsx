/** The couple's monogram pressed into bronze wax. Drawn once; only transformed afterwards. */
export function WaxSeal({ letters, id }: { letters: [string, string]; id: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-wax`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#c99160" />
          <stop offset="0.55" stopColor="#9a6334" />
          <stop offset="1" stopColor="#6a3f1f" />
        </radialGradient>
        <radialGradient id={`${id}-press`} cx="60%" cy="68%" r="70%">
          <stop offset="0" stopColor="#a8703f" />
          <stop offset="1" stopColor="#7a4a25" />
        </radialGradient>
        {/* Wax spreads unevenly when pressed: a little turbulence roughens the rim. */}
        <filter id={`${id}-rim`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="7" />
        </filter>
      </defs>
      <circle cx="50" cy="52" r="44" fill="rgb(60 35 15 / 0.35)" filter={`url(#${id}-rim)`} />
      <circle cx="50" cy="50" r="44" fill={`url(#${id}-wax)`} filter={`url(#${id}-rim)`} />
      <circle cx="50" cy="50" r="31" fill={`url(#${id}-press)`} stroke="rgb(255 222 188 / 0.32)" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="27.5" fill="none" stroke="rgb(60 32 12 / 0.35)" strokeWidth="0.8" />
      <g fontFamily="'Cormorant Garamond', Georgia, serif" fontStyle="italic" fontWeight="500" fontSize="30" textAnchor="middle">
        {/* Embossed: a light edge below-right, the letters sunk in above it. */}
        <g fill="rgb(255 220 185 / 0.4)" transform="translate(0.9 0.9)">
          <text x="44" y="57">{letters[0]}</text>
          <text x="56" y="61">{letters[1]}</text>
        </g>
        <g fill="#5b3417">
          <text x="44" y="57">{letters[0]}</text>
          <text x="56" y="61">{letters[1]}</text>
        </g>
      </g>
      <ellipse cx="36" cy="28" rx="13" ry="6.5" fill="rgb(255 240 220 / 0.22)" transform="rotate(-24 36 28)" />
    </svg>
  );
}
