/**
 * Paper, wax and satin sounds, synthesised with Web Audio from filtered noise and short tones.
 * Nothing is downloaded, so sound adds no weight to the page.
 */

const STORAGE_KEY = 'invite-sound';

interface NoiseOptions {
  filter?: BiquadFilterType;
  freq: number;
  /** Sweeps the filter to this frequency over the sound's duration. */
  freqTo?: number;
  q?: number;
  duration: number;
  gain: number;
  attack?: number;
  delay?: number;
}

interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  freqTo?: number;
  duration: number;
  gain: number;
  delay?: number;
}

/** A continuous texture (a card sliding, a ribbon rubbing) whose loudness follows a gesture. */
export interface SoundLoop {
  set(level: number): void;
}

const readPreference = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
};

class SoundBoard {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private listeners = new Set<() => void>();
  private loops: Array<{ gain: GainNode | null; create: () => GainNode }> = [];
  enabled = readPreference();

  /** Browsers only allow audio after a tap or click, so this runs inside one. */
  unlock(): void {
    if (!this.ctx) {
      const Context =
        window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.ctx = new Context();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.noise = this.createNoise(this.ctx);
      for (const loop of this.loops) loop.gain = loop.create();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Private mode: the choice just isn't remembered.
    }
    if (enabled) this.unlock();
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, this.ctx.currentTime, 0.05);
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getEnabled = (): boolean => this.enabled;

  /* ---------- Named sounds ---------- */

  /** The wax seal cracking off the flap. */
  sealPop(): void {
    this.tone({ type: 'triangle', freq: 260, freqTo: 80, duration: 0.12, gain: 0.5 });
    this.noiseBurst({ filter: 'highpass', freq: 2600, duration: 0.05, gain: 0.35, attack: 0.002 });
  }

  /** The envelope flap unsticking and swinging open. */
  flapOpen(): void {
    this.crackle(0.35, 0.02);
    this.noiseBurst({ freq: 700, freqTo: 2400, q: 0.7, duration: 0.5, gain: 0.3, attack: 0.08, delay: 0.14 });
  }

  /** The knot slipping free and the ribbon sliding off the card. */
  ribbonSlip(): void {
    this.noiseBurst({ freq: 3400, freqTo: 900, q: 1.4, duration: 0.45, gain: 0.3, attack: 0.02 });
    this.noiseBurst({ filter: 'lowpass', freq: 1400, freqTo: 300, duration: 0.8, gain: 0.14, attack: 0.2, delay: 0.25 });
  }

  /** A half-hearted tug: the ribbon springs back into its bow. */
  ribbonSpring(): void {
    this.noiseBurst({ freq: 2200, freqTo: 1300, q: 2.5, duration: 0.22, gain: 0.14, attack: 0.01 });
  }

  /** Paper landing flat on the table. */
  paperLand(): void {
    this.tone({ freq: 140, freqTo: 60, duration: 0.18, gain: 0.35 });
    this.noiseBurst({ filter: 'lowpass', freq: 900, duration: 0.14, gain: 0.22, attack: 0.004 });
  }

  /** The card lifting off the table towards the guest. */
  lift(): void {
    this.noiseBurst({ filter: 'lowpass', freq: 600, freqTo: 1800, duration: 0.6, gain: 0.12, attack: 0.25 });
  }

  /** A card sliding against paper; follows scroll speed. */
  readonly slide = this.loop('bandpass', 1300, 0.6);

  /** Satin or card stock rubbing under the finger; follows drag speed. */
  readonly rustle = this.loop('bandpass', 3200, 0.9);

  /* ---------- Building blocks ---------- */

  private createNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private get ready(): boolean {
    return !!(this.ctx && this.master && this.noise && this.enabled && this.ctx.state === 'running');
  }

  private noiseBurst({ filter = 'bandpass', freq, freqTo, q = 1, duration, gain, attack = 0.005, delay = 0 }: NoiseOptions) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(freq, start);
    if (freqTo) biquad.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(biquad).connect(envelope).connect(this.master!);
    source.start(start, Math.random() * 1.5);
    source.stop(start + duration + 0.05);
  }

  private tone({ type = 'sine', freq, freqTo, duration, gain, delay = 0 }: ToneOptions) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqTo) osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope).connect(this.master!);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** A scatter of tiny ticks, like paper fibres parting. */
  private crackle(duration: number, spacing: number) {
    for (let t = 0; t < duration; t += spacing * (0.5 + Math.random())) {
      this.noiseBurst({ filter: 'highpass', freq: 3000 + Math.random() * 2500, duration: 0.018, gain: 0.08 + Math.random() * 0.1, attack: 0.002, delay: t });
    }
  }

  private loop(filter: BiquadFilterType, freq: number, q: number): SoundLoop {
    const entry = {
      gain: null as GainNode | null,
      create: () => {
        const ctx = this.ctx!;
        const source = ctx.createBufferSource();
        source.buffer = this.noise;
        source.loop = true;
        const biquad = ctx.createBiquadFilter();
        biquad.type = filter;
        biquad.frequency.value = freq;
        biquad.Q.value = q;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(biquad).connect(gain).connect(this.master!);
        source.start();
        return gain;
      },
    };
    this.loops.push(entry);
    return {
      set: (level: number) => {
        if (!entry.gain || !this.ctx) return;
        // A little jitter keeps it sounding like paper rather than hiss.
        const target = Math.min(level, 1) * 0.28 * (0.75 + Math.random() * 0.5);
        entry.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.06);
      },
    };
  }
}

export const sound = new SoundBoard();
