import type { WeddingConfig } from '../../config/types';
import { Monogram } from '../ui/Monogram';
import styles from './SiteFooter.module.css';

export function SiteFooter({ wedding }: { wedding: WeddingConfig }) {
  return (
    <footer className={styles.footer}>
      <Monogram letters={wedding.monogram} shape="blob" className={styles.monogram} />
      <a className={styles.backToTop} href="#top">
        Back to the invitation
      </a>
    </footer>
  );
}
