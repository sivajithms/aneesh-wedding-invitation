import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';
import { OPENING } from '../../constants/motion';
import { smoothScrollTo } from '../../hooks/useSmoothScroll';
import { gsap, loadScrollTrigger } from '../../lib/gsap';
import { FrameBudget, onQualityChange, quality } from '../../lib/quality';
import { sound } from '../../lib/sound';
import { RIBBON } from './ribbon/config';
import { ribbonGeometry, type RibbonGeometry } from './ribbon/geometry';
import { SatinRibbon } from './ribbon/SatinRibbon';

/** Where the whole rig (envelope + card) sits on the stage: centre point, scale and tilt. */
interface Pose {
  x: number;
  y: number;
  s: number;
  rx: number;
  ry: number;
  rz: number;
}

interface Layout {
  vw: number;
  vh: number;
  /** Card width and the heights of the sheet and its flap, in the card's own pixels. */
  w: number;
  sheetH: number;
  flapH: number;
  /** How far the card travels to clear the envelope, and how far things fall off screen. */
  outY: number;
  dropY: number;
  /** How far the ribbon's tail draws out as it unties, in card pixels. */
  pull: number;
  /** Scroll position at which the opening ends and the page takes over. */
  endScroll: number;
  ribbon: RibbonGeometry;
  poses: Record<'sealed' | 'unsealed' | 'mid' | 'held' | 'unfolded' | 'final', Pose>;
}

export interface SceneOptions {
  reducedMotion: boolean;
  /** The invitation on the page; at the end the card lands exactly on top of it. */
  target: () => HTMLElement | null;
  /** The page below the opening; cross-faded in under reduced motion. */
  page: () => HTMLElement | null;
  /** The card has reached the page (true) or the guest has scrolled back into the opening (false). */
  onOpenChange: (open: boolean) => void;
}

const clamp01 = gsap.utils.clamp(0, 1);
const mixPose = (a: Pose, b: Pose, t: number): Pose => gsap.utils.interpolate(a, b, t);
const inOut = gsap.parseEase('power2.inOut');
const easeIn = gsap.parseEase('power2.in');
const span = (value: number, from: number, to: number) => clamp01((value - from) / (to - from));
const RAD = Math.PI / 180;

/** A moment's sound won't repeat within this long, however the scroll jitters across it. */
const CUE_GAP_MS = 1200;

/**
 * The opening, scrubbed by the page's own scroll. One GSAP timeline, tied to the scroll by
 * ScrollTrigger, moves a handful of 0→1 values (one per chapter); `render()` draws the whole
 * scene from them. Scrolling up simply plays it backwards.
 */
export class OpeningScene {
  private readonly root: HTMLElement;
  private readonly options: SceneOptions;
  private readonly el: Record<string, HTMLElement | SVGElement>;
  private readonly envelope: HTMLElement[];
  private layout: Layout | null = null;
  private destroyed = false;
  private timeline: gsap.core.Timeline | null = null;
  private trigger: ScrollTriggerType | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private open = false;
  private readonly ribbon: SatinRibbon;
  private readonly budget = new FrameBudget();
  private stopQualityWatch: () => void = () => {};

  /** Scrubbed chapter values, plus the frame loop's lean and drift. */
  private readonly state = {
    rise: 0,
    sealPop: 0,
    seal: 0,
    slide: 0,
    pull: 0,
    bow: 1,
    fall: 0,
    flap: 0,
    flapPose: 0,
    lift: 0,
    fade: 0,
    lean: 0,
    float: 0,
    floatAmount: 1,
  };

  private previous = { ...this.state, progress: 0 };
  private cueAt: Record<string, number> = {};
  private lastProgress = 0;
  private lastScrollAt = 0;
  private speed = 0;
  private cue = '';

  constructor(root: HTMLElement, options: SceneOptions) {
    this.root = root;
    this.options = options;
    const part = (name: string) => {
      const found = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
      if (!found) throw new Error(`Opening scene is missing [data-part="${name}"]`);
      return found;
    };
    this.el = Object.fromEntries(
      [
        'stage', 'rig', 'card', 'sheet', 'flap', 'outerShade', 'innerShade', 'sheetCast', 'flapShadow', 'envFlap',
        'flapShadowOnPocket', 'seal', 'ribbon', 'ribbonCanvas', 'safe',
      ].map((name) => [name, part(name)]),
    );
    this.envelope = [...root.querySelectorAll<HTMLElement>('[data-part="env"]')];
    this.ribbon = new SatinRibbon(this.el.ribbonCanvas as HTMLCanvasElement, { animate: !options.reducedMotion });
    this.setOpen(false, true);
    void this.start();
  }

  /* ---------- Lifecycle ---------- */

  private async start() {
    // Measuring before the card's fonts arrive would size every pose for the fallback faces.
    const [ScrollTrigger] = await Promise.all([
      loadScrollTrigger(),
      Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]),
    ]);
    if (this.destroyed) return;

    gsap.set(this.el.rig, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%', force3D: true });
    gsap.set(this.el.envFlap, { transformOrigin: '50% 0%', transformPerspective: 1400 });
    gsap.set(this.el.flap, { transformOrigin: '50% 100%', transformPerspective: 2200 });
    this.measure();

    this.timeline = this.buildTimeline();
    const stage = this.el.stage as HTMLElement;
    this.trigger = ScrollTrigger.create({
      trigger: this.root,
      start: 'top top',
      // Ends exactly where the pinned stage lets go, so the page's card is right where ours lands.
      end: () => `+=${this.root.offsetHeight - stage.offsetHeight}`,
      scrub: true,
      animation: this.timeline,
      invalidateOnRefresh: true,
      onRefresh: () => {
        this.measure();
        this.render();
      },
    });

    const target = this.options.target();
    if (target) {
      this.resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
      this.resizeObserver.observe(target);
    }
    gsap.ticker.add(this.tick);
    this.lastScrollAt = performance.now();
    this.render();
    // If the device can't keep up, the ribbon and effects re-lay out at the lower tier.
    this.stopQualityWatch = onQualityChange(() => {
      this.measure();
      this.render();
    });

    gsap.to(this.state, {
      rise: 1,
      duration: this.options.reducedMotion ? 0.5 : 1.6,
      ease: 'power3.out',
      onUpdate: () => (this.options.reducedMotion ? this.renderFade() : this.renderRig()),
    });
  }

  destroy() {
    this.destroyed = true;
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf(this.state);
    this.trigger?.kill();
    this.timeline?.kill();
    this.resizeObserver?.disconnect();
    this.stopQualityWatch();
    delete document.documentElement.dataset.invite;
    sound.slide.set(0);
    sound.rustle.set(0);
    sound.ambience(false);
  }

  /** "Open it for me": glides the page through the rest of the opening. */
  play() {
    if (!this.layout) return;
    sound.unlock();
    const remaining = 1 - (this.timeline?.progress() ?? 0);
    const screens = this.options.reducedMotion ? OPENING.reducedScreens : OPENING.screens;
    smoothScrollTo(this.layout.endScroll, Math.max(1.2, remaining * screens * OPENING.autoplaySecondsPerScreen));
  }

  private buildTimeline(): gsap.core.Timeline {
    const state = this.state;
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => this.render() });
    if (this.options.reducedMotion) {
      return timeline.to(state, { fade: 1, duration: 1 });
    }
    const add = (vars: gsap.TweenVars, [from, to]: readonly [number, number]) =>
      timeline.to(state, { ...vars, duration: to - from }, from);
    const { seal, flap, slide, untie, fall, unfold, lift } = OPENING.chapters;
    const unfoldLength = unfold[1] - unfold[0];

    add({ sealPop: 1 }, seal);
    add({ seal: 1, ease: 'sine.inOut' }, flap);
    add({ slide: 1 }, slide);
    add({ pull: 1, ease: 'sine.in' }, untie);
    add({ bow: 0, ease: 'power2.inOut' }, [untie[0] + (untie[1] - untie[0]) * 0.45, untie[1]]);
    add({ fall: 1 }, fall);
    // The flap swings down, lands, and settles with a small give.
    timeline
      .to(state, { flap: 180, duration: unfoldLength * 0.72, ease: 'sine.inOut' }, unfold[0])
      .to(state, { flap: 175, duration: unfoldLength * 0.1, ease: 'sine.out' })
      .to(state, { flap: 180, duration: unfoldLength * 0.12, ease: 'sine.inOut' });
    add({ flapPose: 1, ease: 'power2.inOut' }, [unfold[0] + unfoldLength * 0.3, unfold[1]]);
    add({ lift: 1, ease: 'power2.inOut' }, lift);
    // Pads the timeline to its full length: a short rest at the end.
    timeline.set({}, {}, OPENING.total);
    return timeline;
  }

  private setOpen(open: boolean, force = false) {
    if (open === this.open && !force) return;
    this.open = open;
    // Switched in the same frame the card lands, so the page's card takes over seamlessly.
    document.documentElement.dataset.invite = open ? 'opened' : this.options.reducedMotion ? 'fading' : 'opening';
    sound.ambience(!open && quality().ambience);
    if (!force) this.options.onOpenChange(open);
  }

  /* ---------- Frame loop: scroll speed, lean, idle drift, cue, sound textures ---------- */

  private tick = (time: number, deltaMs: number) => {
    if (!this.layout || !this.timeline) return;
    const state = this.state;
    const now = performance.now();
    const dt = Math.min(deltaMs, 64) / 1000;
    const progress = this.timeline.progress();
    const delta = progress - this.lastProgress;
    this.lastProgress = progress;
    if (delta !== 0) {
      this.lastScrollAt = now;
      // Only judge the device's pace while the opening is actually animating.
      if (!this.open) this.budget.observe(deltaMs, now);
    }
    this.speed += (delta / Math.max(dt, 0.001) - this.speed) * (1 - Math.exp(-dt * 10));
    this.ribbon.update(dt);

    if (!this.options.reducedMotion) {
      const { lean: leans, drift } = quality();
      // The card leans back a little against fast scrolling and settles when it stops.
      const lean = leans ? gsap.utils.clamp(-OPENING.leanMaxDeg, OPENING.leanMaxDeg, this.speed * OPENING.leanPerSpeed) : 0;
      state.lean += (lean - state.lean) * (1 - Math.exp(-dt * 5));
      // At rest it drifts, as if on a breath of air.
      const resting = drift && now - this.lastScrollAt > 900 && !this.open;
      state.floatAmount += ((resting ? 1 : 0) - state.floatAmount) * (1 - Math.exp(-dt * 1.5));
      state.float = Math.sin(time * 1.1) * 3 * state.floatAmount;
      if (Math.abs(state.lean) > 0.005 || state.floatAmount > 0.005) this.renderRig();

      // Paper and satin textures, only as loud as the scroll is fast.
      const pace = Math.min(Math.abs(this.speed) * 3, 1);
      const inSatin = state.pull > 0 && state.fall < 1;
      const inPaper = (state.slide > 0 && state.slide < 1) || (state.flap > 0 && state.lift < 1);
      sound.rustle.set(inSatin ? pace : 0);
      sound.slide.set(inPaper && !inSatin ? pace : 0);
    }

    const cue = this.open ? 'none' : progress < 0.004 ? 'start' : now - this.lastScrollAt > OPENING.idleCueMs ? 'continue' : 'none';
    if (cue !== this.cue) {
      this.cue = cue;
      this.root.dataset.cue = cue;
    }
  };

  /* ---------- Layout ---------- */

  private measure() {
    const target = this.options.target();
    const { sheet, flap, safe } = this.el;
    const stage = this.el.stage as HTMLElement;
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const box = target?.getBoundingClientRect();
    const w = box?.width ?? Math.min(vw - 32, 576);
    this.root.style.setProperty('--card-w', `${w}px`);
    const sheetH = (sheet as HTMLElement).offsetHeight;
    this.root.style.setProperty('--card-h', `${sheetH}px`);
    const flapH = (flap as HTMLElement).offsetHeight;

    const insets = getComputedStyle(safe);
    // Clear of the sound switch in the corner.
    const top = parseFloat(insets.paddingTop) + 64;
    const bottom = parseFloat(insets.paddingBottom) + 96;
    const avail = vh - top - bottom;
    const cx = vw / 2;
    const cy = top + avail / 2;
    const tilted = this.options.reducedMotion ? 0 : 1;

    // Envelope: 110% of the card's width, 106% of its height (see Opening.module.css).
    const envW = w * 1.1;
    const envH = sheetH * 1.06;
    const sealedS = Math.min((vw - 40) / envW, avail / envH) * 0.92;
    const unsealedS = Math.min(sealedS, (avail / (envH * 1.4)) * 0.96);

    // Mid-slide the card is above the envelope; frame them both, letting the card run off the top a little.
    const outY = envH + 12;
    const extent = outY + sheetH * 1.025;
    const midCentre = (-outY + sheetH * 1.025) / 2;
    const midS = Math.max(Math.min(sealedS, (vh - top) / extent) * 1.15, sealedS * 0.6);

    const heldS = Math.min((vw - 48) / w, avail / sheetH) * 0.94;

    const total = sheetH + flapH;
    const availOpen = vh - top - (parseFloat(insets.paddingBottom) + 40);
    const openS = Math.min((vw - 32) / w, availOpen / total);

    // The page takes over where the pinned stage lets go; its card then sits at the same spot.
    const sceneTop = this.root.getBoundingClientRect().top + window.scrollY;
    const endScroll = sceneTop + this.root.offsetHeight - stage.offsetHeight;
    const finalTop = box ? box.top + window.scrollY - endScroll : top;

    this.layout = {
      vw,
      vh,
      w,
      sheetH,
      flapH,
      outY,
      dropY: (vh * 1.3) / midS,
      pull: (Math.min(vw, vh) * 0.45) / heldS,
      endScroll,
      ribbon: ribbonGeometry(w, sheetH),
      poses: {
        sealed: { x: cx, y: cy, s: sealedS, rx: 9 * tilted, ry: -5 * tilted, rz: -2 * tilted },
        // Opened, the flap stands up above the envelope: ease back so it stays in view.
        unsealed: { x: cx, y: cy + envH * 0.4 * unsealedS * 0.5, s: unsealedS, rx: 6 * tilted, ry: -4 * tilted, rz: -1 * tilted },
        mid: { x: cx, y: cy - (midCentre - sheetH / 2) * midS + 20, s: midS, rx: 5 * tilted, ry: -2 * tilted, rz: 0 },
        held: { x: cx, y: cy, s: heldS, rx: 11 * tilted, ry: -7 * tilted, rz: 2.5 * tilted },
        unfolded: { x: cx, y: top + availOpen / 2 - (flapH / 2) * openS, s: openS, rx: 0, ry: 0, rz: 0 },
        final: { x: (box?.left ?? cx - w / 2) + w / 2, y: finalTop + sheetH / 2, s: 1, rx: 0, ry: 0, rz: 0 },
      },
    };
    this.ribbon.layout({ cardWidth: w, geometry: this.layout.ribbon, displayScale: heldS, profile: quality() });
  }

  /* ---------- Drawing ---------- */

  private render() {
    if (!this.layout) return;
    if (this.options.reducedMotion) return this.renderFade();
    this.renderRig();
    this.renderSeal();
    this.renderEnvelope();
    this.renderRibbon();
    this.renderFlap();
    this.playCues();
  }

  private renderFade() {
    if (!this.layout) return;
    const { fade, rise } = this.state;
    gsap.set(this.el.rig, { ...this.poseVars(this.layout.poses.sealed), autoAlpha: rise * (1 - fade) });
    const page = this.options.page();
    if (page) page.style.opacity = String(fade);
    this.setOpen(fade >= 1);
  }

  private poseVars(pose: Pose) {
    return { x: pose.x, y: pose.y, scale: pose.s, rotationX: pose.rx, rotationY: pose.ry, rotation: pose.rz, transformPerspective: 1600 };
  }

  private currentPose(): Pose {
    const { poses } = this.layout!;
    const { seal, slide, flapPose, lift } = this.state;
    if (lift > 0) return mixPose(poses.unfolded, poses.final, lift);
    if (flapPose > 0) return mixPose(poses.held, poses.unfolded, flapPose);
    const start = mixPose(poses.sealed, poses.unsealed, seal);
    return slide < 0.5 ? mixPose(start, poses.mid, inOut(slide / 0.5)) : mixPose(poses.mid, poses.held, inOut((slide - 0.5) / 0.5));
  }

  private renderRig() {
    if (!this.layout || this.options.reducedMotion) return;
    const { rise, lean, float, slide, lift } = this.state;
    const pose = this.currentPose();
    // Lean and drift fade out as the card lands, so the landing is exact.
    const settle = 1 - lift;
    gsap.set(this.el.rig, {
      ...this.poseVars(pose),
      y: pose.y + (1 - rise) * 36 + float * settle,
      rotationX: pose.rx + lean * settle,
      autoAlpha: rise,
    });

    // The card rises out through the envelope's mouth, then settles back to the middle of the rig.
    const out = slide < 0.5 ? inOut(slide / 0.5) : 1 - inOut((slide - 0.5) / 0.5);
    gsap.set(this.el.card, { y: -this.layout.outY * out, zIndex: slide >= 0.5 ? 6 : 3 });
    this.setOpen((this.timeline?.progress() ?? 0) >= 0.9999);
  }

  private renderSeal() {
    const { sealPop } = this.state;
    const { dropY, w } = this.layout!;
    // It lifts off the flap first, then drops away, turning over.
    const rise = span(sealPop, 0, 0.3);
    const drop = easeIn(span(sealPop, 0.3, 1));
    gsap.set(this.el.seal, {
      scale: 1 + 0.12 * Math.sin(rise * Math.PI * 0.5) - 0.08 * drop,
      y: -6 * rise + drop * dropY * 0.55,
      x: drop * w * 0.12,
      rotation: drop * 150,
      autoAlpha: 1 - span(sealPop, 0.8, 1),
    });
  }

  private renderEnvelope() {
    const { seal, slide } = this.state;
    const { dropY, w } = this.layout!;
    gsap.set(this.el.envFlap, { rotationX: 180 * seal, zIndex: seal > 0.5 ? 2 : 5 });
    gsap.set(this.el.flapShadowOnPocket, { opacity: 1 - clamp01(seal * 2) });
    // Once the card is clear, the empty envelope drops away off the bottom of the screen.
    const drop = easeIn(span(slide, 0.5, 1));
    gsap.set(this.envelope, { y: drop * dropY, x: drop * w * 0.08, autoAlpha: drop >= 1 ? 0 : 1 });
  }

  private renderRibbon() {
    const { pull: pullLength, dropY, w } = this.layout!;
    const { pull, bow, fall } = this.state;
    const { dropAwayFrom, dropAwayTurn } = RIBBON.motion;
    // Tension builds over the first part of the pull; after that the knot has slipped.
    this.ribbon.setDrive({ tension: clamp01(pull / 0.55), slip: 1 - bow, fall, pull: pull * pullLength });
    // The fabric slides off the card on its own; then the whole ribbon drops away out of frame.
    const away = easeIn(span(fall, dropAwayFrom, 1));
    gsap.set(this.el.ribbon, { y: away * dropY, x: away * w * 0.06, rotation: away * dropAwayTurn, autoAlpha: fall >= 1 ? 0 : 1 });
  }

  private renderFlap() {
    const angle = this.state.flap;
    const radians = angle * RAD;
    const sin = Math.sin(radians);
    const lying = Math.max(0, -Math.cos(radians));
    gsap.set(this.el.flap, { rotationX: -angle });
    // Lit from above: the cover darkens as it tips towards the guest; the inside brightens as it lands.
    gsap.set(this.el.outerShade, { opacity: angle < 90 ? sin * 0.5 : 0 });
    gsap.set(this.el.innerShade, { opacity: angle > 90 ? 0.4 * (1 - (angle - 90) / 90) : 0.4 });
    // The lifted flap shades the sheet it uncovers, and throws a shadow on the table once past vertical.
    gsap.set(this.el.sheetCast, { opacity: sin * 0.7 });
    gsap.set(this.el.flapShadow, { scaleY: lying, opacity: lying });
  }

  /** A sound for each moment, played when scrolling forwards through it. */
  private playCues() {
    const now = performance.now();
    const s = this.state;
    const p = this.previous;
    const progress = this.timeline?.progress() ?? 0;
    const cue = (name: string, crossed: boolean, play: () => void) => {
      if (!crossed || now - (this.cueAt[name] ?? 0) < CUE_GAP_MS) return;
      this.cueAt[name] = now;
      play();
    };
    cue('seal', p.sealPop < 0.2 && s.sealPop >= 0.2, () => sound.sealCrack());
    cue('flap', p.seal < 0.25 && s.seal >= 0.25, () => sound.flapOpen());
    cue('ribbon', p.bow > 0.6 && s.bow <= 0.6, () => sound.ribbonSlip());
    cue('land', p.flap < 179 && s.flap >= 179, () => sound.paperLand());
    cue('open', p.progress < 1 && progress >= 1, () => sound.opened());
    this.previous = { ...s, progress };
  }
}
