import { cx } from '../../lib/css';
import styles from './Ornament.module.css';

/** The card's hairline divider: dotted ends with a small open diamond at the centre. Inherits `color`. */
export function Ornament({ className }: { className?: string }) {
  return (
    <svg className={cx(styles.ornament, className)} viewBox="0 0 240 12" aria-hidden="true" focusable="false">
      <path d="M4 6h106M130 6h106" stroke="currentColor" strokeWidth="1" />
      <path d="M120 1.5l5 4.5-5 4.5-5-4.5z" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="3" cy="6" r="1.8" fill="currentColor" />
      <circle cx="237" cy="6" r="1.8" fill="currentColor" />
      <circle cx="111" cy="6" r="1.3" fill="currentColor" />
      <circle cx="129" cy="6" r="1.3" fill="currentColor" />
    </svg>
  );
}
