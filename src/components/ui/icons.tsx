import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Solid teardrop pin, as printed beside the venue on the card. */
export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path
      d="M12 22s-7-6.1-7-12a7 7 0 0114 0c0 5.9-7 12-7 12zm0-9.2a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6z"
      fill="currentColor"
      fillRule="evenodd"
      stroke="none"
    />
  </Icon>
);

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Icon>
);

export const EnvelopeIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
    <path d="M4 6.5l8 6 8-6" />
  </Icon>
);


export const SoundIcon = ({ muted, ...props }: IconProps & { muted: boolean }) => (
  <Icon {...props}>
    <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
    {muted ? <path d="M16 9.5l5 5m0-5l-5 5" /> : <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" />}
  </Icon>
);
