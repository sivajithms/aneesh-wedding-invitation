import { useEffect, useState } from 'react';
import styles from './Controls.module.css';

export function ToCardButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Visible once scrolled down past the stage
      if (window.scrollY > window.innerHeight * 1.5) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCard = () => {
    const stage = document.getElementById('scene');
    if (stage) {
      const target = stage.offsetTop + (stage.offsetHeight - window.innerHeight) * 0.95;
      window.scrollTo({ top: target, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      className={`${styles.toCard} ${visible ? styles.on : ''}`}
      id="toCard"
      aria-label="Back to the invitation card"
      onClick={scrollToCard}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
      Card
    </button>
  );
}

