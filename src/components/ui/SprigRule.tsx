export function SprigRule({ className = '' }: { className?: string }) {
  return (
    <div className={`rule ${className}`} aria-hidden="true">
      <svg viewBox="0 0 160 22" aria-hidden="true">
        <g>
          <path className="stem" pathLength="1" d="M70 11 C58 11 46 8.5 20 10.5" />
          <path className="leaf" pathLength="1" d="M58 10.4 c-3 -5 -9 -6.2 -12.5 -4.2 c3 4 8.4 5.3 12.5 4.2z" />
          <path className="leaf" pathLength="1" d="M47 9.6 c-2 5 -8 7 -12.5 5.2 c2.3 -4.2 7.5 -6.2 12.5 -5.2z" />
          <path className="leaf" pathLength="1" d="M35 9.8 c-3 -4.2 -8 -5.2 -11.2 -3.2 c3 3.4 7.3 4.4 11.2 3.2z" />
          <path className="leaf" pathLength="1" d="M26 10.2 c-1.6 3.4 -5.4 4.6 -8.4 3.4" />
        </g>
        <g transform="matrix(-1 0 0 1 160 0)">
          <path className="stem" pathLength="1" d="M70 11 C58 11 46 8.5 20 10.5" />
          <path className="leaf" pathLength="1" d="M58 10.4 c-3 -5 -9 -6.2 -12.5 -4.2 c3 4 8.4 5.3 12.5 4.2z" />
          <path className="leaf" pathLength="1" d="M47 9.6 c-2 5 -8 7 -12.5 5.2 c2.3 -4.2 7.5 -6.2 12.5 -5.2z" />
          <path className="leaf" pathLength="1" d="M35 9.8 c-3 -4.2 -8 -5.2 -11.2 -3.2 c3 3.4 7.3 4.4 11.2 3.2z" />
          <path className="leaf" pathLength="1" d="M26 10.2 c-1.6 3.4 -5.4 4.6 -8.4 3.4" />
        </g>
        <path className="dia" d="M80 6.2 L84.8 11 L80 15.8 L75.2 11 Z" />
      </svg>
    </div>
  );
}

