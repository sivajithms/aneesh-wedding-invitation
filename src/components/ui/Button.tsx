import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/css';
import styles from './Button.module.css';

type Variant = 'solid' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  /** Opens in a new tab with safe rel attributes and an accessible hint. */
  external?: boolean;
}

export function Button({ variant = 'solid', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cx(styles.button, className)} data-variant={variant} {...props} />;
}

export function LinkButton({ variant = 'outline', external = false, className, children, ...props }: LinkButtonProps) {
  return (
    <a
      className={cx(styles.button, className)}
      data-variant={variant}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      {...props}
    >
      {children}
      {external && <span className="visually-hidden"> (opens in a new tab)</span>}
    </a>
  );
}
