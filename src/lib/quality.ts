/**
 * Device-aware rendering quality. Detected once from cheap signals, then adjusted at runtime if
 * the opening can't hold its frame rate. Lower tiers keep the same experience with less work:
 * fewer ribbon segments, a lower canvas resolution, fewer shadow passes, no ambient sound pad.
 *
 * Override for testing with ?quality=low|medium|high.
 */

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityProfile {
  level: QualityLevel;
  /** Highest device pixel ratio canvases render at. */
  maxDpr: number;
  /** Segments along each part of the ribbon. */
  ribbonSegments: { band: number; tail: number; loop: number };
  /** Soft (two-pass) contact shadows and the satin sheen pass. */
  softShadows: boolean;
  sheen: boolean;
  /** The card's lean into fast scrolling and its idle drift. */
  lean: boolean;
  drift: boolean;
  /** The ambient chord under the opening (continuous oscillators). */
  ambience: boolean;
  /** Frosted-glass blur behind the reply bar. */
  glass: boolean;
}

const PROFILES: Record<QualityLevel, QualityProfile> = {
  high: {
    level: 'high',
    maxDpr: 2,
    ribbonSegments: { band: 28, tail: 13, loop: 16 },
    softShadows: true,
    sheen: true,
    lean: true,
    drift: true,
    ambience: true,
    glass: true,
  },
  medium: {
    level: 'medium',
    maxDpr: 1.5,
    ribbonSegments: { band: 22, tail: 10, loop: 12 },
    softShadows: false,
    sheen: true,
    lean: true,
    drift: true,
    ambience: true,
    glass: false,
  },
  low: {
    level: 'low',
    maxDpr: 1,
    ribbonSegments: { band: 16, tail: 8, loop: 9 },
    softShadows: false,
    sheen: true,
    lean: true,
    drift: false,
    ambience: false,
    glass: false,
  },
};

const ORDER: QualityLevel[] = ['low', 'medium', 'high'];

/** GPUs that struggle with large composited, transformed layers. */
const WEAK_GPU = /swiftshader|llvmpipe|softpipe|mali-[234]\d\d|mali-t[678]|adreno \(tm\) [34]\d\d|powervr sgx|sgx 5/i;

function gpuRenderer(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'none';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return renderer;
  } catch {
    return 'none';
  }
}

function detect(): QualityLevel {
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency || 4;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const dpr = window.devicePixelRatio || 1;
  // Pixels the GPU has to fill for a full-screen layer.
  const pixels = window.screen.width * window.screen.height * dpr * dpr;
  const renderer = gpuRenderer();

  if (renderer === 'none' || WEAK_GPU.test(renderer) || memory <= 2 || cores <= 2) return 'low';
  if (touch && (memory <= 4 || cores <= 4 || pixels > 4_000_000)) return 'medium';
  if (!touch && cores <= 4 && memory <= 4) return 'medium';
  return 'high';
}

let current: QualityProfile | null = null;
const listeners = new Set<(profile: QualityProfile) => void>();

export function quality(): QualityProfile {
  if (!current) {
    current = PROFILES[detect()];
    document.documentElement.dataset.quality = current.level;
  }
  return current;
}

export function onQualityChange(listener: (profile: QualityProfile) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Steps down one tier if the device is dropping frames; never steps back up within a visit. */
export function downgradeQuality(): boolean {
  const index = ORDER.indexOf(quality().level);
  if (index === 0) return false;
  current = PROFILES[ORDER[index - 1]];
  document.documentElement.dataset.quality = current.level;
  listeners.forEach((listener) => listener(current!));
  return true;
}

/**
 * Watches frame times while something is animating. If most recent frames miss ~40fps,
 * quality steps down a tier, then the watcher waits before judging again.
 */
export class FrameBudget {
  private samples: number[] = [];
  private cooldownUntil = 0;
  private readonly budgetMs: number;
  private readonly window: number;

  constructor(budgetMs = 25, window = 90) {
    this.budgetMs = budgetMs;
    this.window = window;
  }

  observe(deltaMs: number, now: number): void {
    if (now < this.cooldownUntil || deltaMs > 250) return; // tab switches and stalls aren't the device's pace
    this.samples.push(deltaMs);
    if (this.samples.length < this.window) return;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.samples = [];
    if (median > this.budgetMs && downgradeQuality()) this.cooldownUntil = now + 3000;
  }
}
