import { useEffect, useRef, useState } from 'react';
import styles from './Controls.module.css';

interface SoundToggleProps {
  src?: string;
}

export function SoundToggle({ src = '/audio/canon-in-d.mp3' }: SoundToggleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.55;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [src]);

  const toggleSound = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Autoplay was blocked
          setIsPlaying(false);
        });
    }
  };

  return (
    <button
      className={styles.sound}
      id="soundBtn"
      type="button"
      aria-pressed={isPlaying}
      aria-label="Sound"
      onClick={toggleSound}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        <path className={isPlaying ? styles.onWaves : styles.hidden} d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        <path className={isPlaying ? styles.hidden : styles.offSlash} d="M16 9.5l5 5M21 9.5l-5 5" />
      </svg>
    </button>
  );
}

