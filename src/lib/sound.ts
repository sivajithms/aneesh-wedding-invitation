/**
 * Soft paper, wax and bell sounds, synthesised with Web Audio — nothing is downloaded.
 * Everything passes through a gentle synthetic room reverb so it sounds calm rather than clicky.
 *
 * Browsers only allow audio after a tap, click or key press (scrolling doesn't count), so the
 * board unlocks itself on the first such gesture anywhere on the page.
 */

const STORAGE_KEY = 'invite-sound';

/** D major pentatonic, in Hz: every combination sounds consonant. */
const NOTE = { D4: 293.66, A4: 440, D5: 587.33, E5: 659.25, 'F#5': 739.99, A5: 880, B5: 987.77, D6: 1174.66 } as const;
type Note = keyof typeof NOTE;

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
  /** Share sent to the reverb. */
  wet?: number;
}

/** A continuous texture (a card sliding, a ribbon rubbing) whose loudness follows scroll speed. */
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
  private reverb: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pad: GainNode | null = null;
  private padWanted = false;
  private listeners = new Set<() => void>();
  private loops: Array<{ gain: GainNode | null; create: () => GainNode; max: number }> = [];
  enabled = readPreference();

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => void this.unlock();
    for (const type of ['pointerdown', 'keydown', 'touchend', 'click'] as const) {
      window.addEventListener(type, unlock, { passive: true, capture: true });
    }
  }

  /** Must run inside a user gesture. Safe to call repeatedly; resolves once audio can play. */
  unlock(): Promise<void> {
    if (!this.ctx) {
      const Context =
        window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return Promise.resolve();
      const ctx = new Context();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.enabled ? 1 : 0;
      // A touch of compression keeps overlapping chimes from ever getting sharp.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -18;
      limiter.ratio.value = 3;
      this.master.connect(limiter).connect(ctx.destination);
      this.noise = this.createNoise(ctx);
      this.reverb = this.createReverb(ctx);
      for (const loop of this.loops) loop.gain = loop.create();
      ctx.addEventListener('statechange', () => this.notify());
    }
    this.syncPad();
    if (this.ctx.state !== 'suspended') return Promise.resolve();
    return this.ctx.resume().then(() => this.syncPad());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Private mode: the choice just isn't remembered.
    }
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.08);
    this.notify();
    // A single soft note confirms sound is on.
    void this.unlock().then(() => enabled && this.chime('A5', { gain: 0.07 }));
  }

  /** True once audio can actually play (unlocked by a gesture and switched on). */
  get running(): boolean {
    return this.enabled && this.ctx?.state === 'running';
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): string => `${this.enabled ? 'on' : 'off'}:${this.ctx?.state ?? 'locked'}`;

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  /* ---------- Moments in the opening ---------- */

  /** The wax seal lifting off: a soft wooden tock and a bell. */
  sealCrack(): void {
    this.tone(210, 130, 0.22, 0.16, 0.2);
    this.noiseBurst({ filter: 'lowpass', freq: 1400, duration: 0.07, gain: 0.05, attack: 0.004 });
    this.chime('A5', { delay: 0.06, gain: 0.1 });
  }

  /** The envelope flap sighing open. */
  flapOpen(): void {
    this.noiseBurst({ freq: 500, freqTo: 1500, q: 0.5, duration: 1, gain: 0.07, attack: 0.3, wet: 0.45 });
    this.chime('F#5', { delay: 0.35, gain: 0.05 });
  }

  /** The bow coming undone. */
  ribbonSlip(): void {
    this.noiseBurst({ freq: 2200, freqTo: 700, q: 0.7, duration: 0.9, gain: 0.07, attack: 0.08, wet: 0.4 });
    this.chime('D6', { gain: 0.07 });
    this.chime('A5', { delay: 0.14, gain: 0.06 });
  }

  /** The card's flap settling flat on the table. */
  paperLand(): void {
    this.tone(120, 70, 0.3, 0.12, 0.15);
    this.noiseBurst({ filter: 'lowpass', freq: 600, duration: 0.25, gain: 0.05, attack: 0.01 });
    this.chime('E5', { delay: 0.05, gain: 0.05 });
  }

  /** The card reaches the guest: a slow, open arpeggio. */
  opened(): void {
    (['D5', 'F#5', 'A5', 'D6'] as const).forEach((note, i) => this.chime(note, { delay: i * 0.13, gain: 0.075, decay: 3.2 }));
  }

  /** Card stock sliding; follows scroll speed. */
  readonly slide = this.loop('lowpass', 1000, 0.4, 0.1);

  /** Satin sliding through the knot; follows scroll speed. */
  readonly rustle = this.loop('bandpass', 2400, 0.8, 0.07);

  /** A barely-there warm chord under the opening. Fades in and out. */
  ambience(on: boolean): void {
    this.padWanted = on;
    this.syncPad();
  }

  /* ---------- Building blocks ---------- */

  private get ready(): boolean {
    return !!(this.ctx && this.master && this.enabled && this.ctx.state === 'running');
  }

  /** Sends a voice to the dry mix and, partly, to the reverb. */
  private route(node: AudioNode, wet = 0.3) {
    const ctx = this.ctx!;
    const dry = ctx.createGain();
    dry.gain.value = 1 - wet * 0.5;
    node.connect(dry).connect(this.master!);
    const send = ctx.createGain();
    send.gain.value = wet;
    node.connect(send).connect(this.reverb!);
  }

  /** A soft bell: a sine with two faint overtones, long gentle decay. */
  private chime(note: Note, { delay = 0, gain = 0.08, decay = 2.4 }: { delay?: number; gain?: number; decay?: number } = {}) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime + delay;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    envelope.connect(tone);
    this.route(tone, 0.55);
    for (const [ratio, level] of [[1, 1], [2, 0.18], [3.01, 0.05]] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = NOTE[note] * ratio;
      const partial = ctx.createGain();
      partial.gain.value = level;
      osc.connect(partial).connect(envelope);
      osc.start(start);
      osc.stop(start + decay + 0.1);
    }
  }

  private tone(freq: number, freqTo: number, duration: number, gain: number, wet: number) {
    if (!this.ready) return;
    const ctx = this.ctx!;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(envelope);
    this.route(envelope, wet);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  private noiseBurst({ filter = 'bandpass', freq, freqTo, q = 1, duration, gain, attack = 0.01, delay = 0, wet = 0.3 }: NoiseOptions) {
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
    source.connect(biquad).connect(envelope);
    this.route(envelope, wet);
    source.start(start, Math.random() * 1.5);
    source.stop(start + duration + 0.05);
  }

  private loop(filter: BiquadFilterType, freq: number, q: number, max: number): SoundLoop {
    const entry = {
      gain: null as GainNode | null,
      max,
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
        source.connect(biquad).connect(gain);
        this.route(gain, 0.25);
        source.start();
        return gain;
      },
    };
    this.loops.push(entry);
    return {
      set: (level: number) => {
        if (!entry.gain || !this.ctx) return;
        entry.gain.gain.setTargetAtTime(Math.min(Math.max(level, 0), 1) * entry.max, this.ctx.currentTime, 0.12);
      },
    };
  }

  private syncPad() {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (this.padWanted && !this.pad) {
      const pad = ctx.createGain();
      pad.gain.value = 0;
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowpass';
      warmth.frequency.value = 700;
      pad.connect(warmth);
      this.route(warmth, 0.6);
      // Two slightly detuned voices per note make it breathe; a slow LFO swells it.
      for (const freq of [NOTE.D4 / 2, NOTE.A4 / 2, NOTE['F#5'] / 2]) {
        for (const detune of [-6, 6]) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          const voice = ctx.createGain();
          voice.gain.value = 0.3;
          osc.connect(voice).connect(pad);
          osc.start();
        }
      }
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const depth = ctx.createGain();
      depth.gain.value = 0.006;
      lfo.connect(depth).connect(pad.gain);
      lfo.start();
      this.pad = pad;
    }
    if (this.pad) this.pad.gain.setTargetAtTime(this.padWanted ? 0.018 : 0, ctx.currentTime, this.padWanted ? 2.5 : 1.2);
  }

  private createNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pinkish noise (a gentle low-pass on white noise) is softer on the ear than pure hiss.
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = last * 0.85 + (Math.random() * 2 - 1) * 0.15;
      data[i] = last * 3;
    }
    return buffer;
  }

  /** A small, warm room: decaying stereo noise as the impulse response. */
  private createReverb(ctx: AudioContext): GainNode {
    const seconds = 2.6;
    const impulse = ctx.createBuffer(2, ctx.sampleRate * seconds, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3.2;
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const input = ctx.createGain();
    const output = ctx.createGain();
    output.gain.value = 0.5;
    input.connect(convolver).connect(output).connect(this.master!);
    return input;
  }
}

export const sound = new SoundBoard();
