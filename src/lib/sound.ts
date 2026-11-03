/**
 * Non-copyrighted background wedding music player.
 * Replaces synthesized sound effects with serene, refreshing wedding instrumental music.
 *
 * Browsers require an initial user gesture (click, tap, touch) before playing audio,
 * so the player unlocks on the first gesture anywhere on the page or via the music toggle button.
 */

import { wedding } from '../config/wedding';

const STORAGE_KEY = 'invite-sound';
const DEFAULT_VOLUME = 0.35;

export interface SoundLoop {
  set(level: number): void;
}

const readPreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

class SoundBoard {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<() => void>();
  private fadeInterval: number | null = null;
  enabled = readPreference();

  constructor() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      void this.unlock();
    };

    // Unlock and start music on the first user interaction
    for (const type of ['pointerdown', 'keydown', 'touchend', 'click'] as const) {
      window.addEventListener(type, unlockHandler, { passive: true, capture: true });
    }
  }

  private getAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.audio) {
      const src = wedding.music?.src || '/audio/canon-in-d.mp3';
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;

      audio.addEventListener('play', () => this.notify());
      audio.addEventListener('pause', () => this.notify());
      audio.addEventListener('ended', () => this.notify());
      audio.addEventListener('error', () => this.notify());

      this.audio = audio;
    }
    return this.audio;
  }

  private fadeTo(target: number, durationMs = 800): Promise<void> {
    if (this.fadeInterval) {
      window.clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }

    return new Promise((resolve) => {
      const audio = this.getAudio();
      if (!audio) {
        resolve();
        return;
      }

      const startVol = audio.volume;
      const startTime = performance.now();

      this.fadeInterval = window.setInterval(() => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        audio.volume = Math.max(0, Math.min(1, startVol + (target - startVol) * progress));

        if (progress >= 1) {
          if (this.fadeInterval) {
            window.clearInterval(this.fadeInterval);
            this.fadeInterval = null;
          }
          resolve();
        }
      }, 25);
    });
  }

  /**
   * Called on first user gesture or by the director to start music playback.
   */
  async unlock(): Promise<void> {
    if (typeof window === 'undefined' || !this.enabled) return;
    const audio = this.getAudio();
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        await this.fadeTo(DEFAULT_VOLUME, 1200);
      } catch {
        // Autoplay policy prevented playback until explicit click on button
      }
    }
    this.notify();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {}

    const audio = this.getAudio();
    if (enabled) {
      if (audio) {
        if (audio.paused) {
          audio.play().then(() => {
            void this.fadeTo(DEFAULT_VOLUME, 800);
          }).catch(() => {
            // Awaiting user gesture
          });
        } else {
          void this.fadeTo(DEFAULT_VOLUME, 800);
        }
      }
    } else {
      if (audio && !audio.paused) {
        void this.fadeTo(0, 400).then(() => {
          if (!this.enabled && audio) {
            audio.pause();
          }
        });
      }
    }
    this.notify();
  }

  /** True when music is enabled and actively playing */
  get running(): boolean {
    return this.enabled && !!this.audio && !this.audio.paused;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): string => `${this.enabled ? 'on' : 'off'}:${this.running ? 'running' : 'paused'}`;

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  /* ---------- Legacy sound effect compatibility stubs (now replaced with music) ---------- */

  sealCrack(): void {}
  flapOpen(): void {}
  ribbonSlip(): void {}
  paperLand(): void {}
  opened(): void {}
  ambience(_on: boolean): void {}

  readonly slide: SoundLoop = {
    set: () => {},
  };

  readonly rustle: SoundLoop = {
    set: () => {},
  };
}

export const sound = new SoundBoard();
