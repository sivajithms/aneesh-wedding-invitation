import styles from './Controls.module.css';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className={`${styles.toast} ${message ? styles.on : ''}`} id="toast" role="status">
      {message}
    </div>
  );
}

