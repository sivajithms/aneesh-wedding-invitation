import type { Draggable as DraggableType } from 'gsap/Draggable';
import { OPENING } from '../../constants/motion';
import { gsap, loadDraggable } from '../../lib/gsap';
import { sound } from '../../lib/sound';
import { loopPaths, ribbonGeometry, tailPath, type RibbonGeometry, type Vec } from './ribbon';

/**
 * Waiting phases ask the guest for a gesture; the "-ing" phases are the timed moves between them.
 * sealed → unsealing → slide → untie → untying → unfold → unfolding → takeout → exiting
 */
export type OpeningPhase =
  | 'loading'
  | 'sealed'
  | 'unsealing'
  | 'slide'
  | 'untie'
  | 'untying'
  | 'unfold'
  | 'unfolding'
  | 'takeout'
  | 'exiting';

const WAITING: ReadonlySet<OpeningPhase> = new Set(['sealed', 'untie', 'unfold']);

/** Where the whole rig (envelope + card) sits on screen: centre point, scale and tilt. */
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
  /** Ribbon pull needed to slip the knot, in card pixels. */
  pull: number;
  ribbon: RibbonGeometry;
  poses: Record<'sealed' | 'unsealed' | 'mid' | 'held' | 'unfolded' | 'final', Pose>;
}

export interface DirectorOptions {
  reducedMotion: boolean;
  /** The invitation on the page underneath; the card lands exactly on top of it. */
  target: () => HTMLElement | null;
  onPhase: (phase: OpeningPhase) => void;
  /** The card has reached the page: unlock it. */
  onOpen: () => void;
  /** The overlay has faded away. */
  onExited: () => void;
}

const clamp01 = gsap.utils.clamp(0, 1);
const mixPose = (a: Pose, b: Pose, t: number): Pose => gsap.utils.interpolate(a, b, t);
const inOut = gsap.parseEase('power2.inOut');
const easeIn = gsap.parseEase('power2.in');
const RAD = Math.PI / 180;

/** Soft limit: follows freely at first, then resists like a stretched rubber band. */
const rubber = (value: number, limit: number) => Math.sign(value) * limit * (1 - Math.exp(-Math.abs(value) / limit));

export class OpeningDirector {
  private readonly root: HTMLElement;
  private readonly options: DirectorOptions;
  private readonly el: Record<string, HTMLElement | SVGElement>;
  private readonly envelope: HTMLElement[];
  private layout: Layout | null = null;
  private phase: OpeningPhase = 'loading';
  private destroyed = false;

  /** Everything the scene is drawn from. Gestures, scroll and timelines only ever write here. */
  private readonly state = {
    rise: 0,
    /** Envelope flap, 0 sealed → 1 open. */
    seal: 0,
    /** Card sliding out of the envelope; scrubbed by scroll. */
    slide: 0,
    slideTarget: 0,
    /** Ribbon: how far the tail is pulled (card px), sideways give, bow left (1 → 0), fall. */
    pull: 0,
    perp: 0,
    bow: 1,
    fall: 0,
    /** Card flap angle in degrees, and the card re-centring once it's open (0 → 1). */
    flap: 0,
    flapPose: 0,
    /** Lifting the card to the page; scrubbed by scroll. */
    takeout: 0,
    takeoutTarget: 0,
    jolt: 0,
    float: 0,
  };

  private draggables: DraggableType[] = [];
  private waitingSince = 0;
  private lastNudge = 0;
  private swipe: { id: number; y: number; t: number; v: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(root: HTMLElement, options: DirectorOptions) {
    this.root = root;
    this.options = options;
    const part = (name: string) => {
      const found = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
      if (!found) throw new Error(`Opening scene is missing [data-part="${name}"]`);
      return found;
    };
    this.el = Object.fromEntries(
      [
        'rig', 'card', 'sheet', 'flap', 'outerShade', 'innerShade', 'sheetCast', 'flapShadow', 'envFlap', 'flapShadowOnPocket',
        'seal', 'ribbon', 'bow', 'loopL', 'loopLOuter', 'loopLInner', 'loopR', 'loopROuter', 'loopRInner', 'tailFixed',
        'tailPulled', 'knot', 'ring', 'tailHandle', 'hint', 'safe',
      ].map((name) => [name, part(name)]),
    );
    this.envelope = [...root.querySelectorAll<HTMLElement>('[data-part="env"]')];
    void this.start();
  }

  /* ---------- Lifecycle ---------- */

  private async start() {
    // Measuring before the card's fonts arrive would size every pose for the fallback faces.
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]);
    if (this.destroyed) return;

    this.measure();
    gsap.set(this.el.rig, { xPercent: -50, yPercent: -50, transformOrigin: '50% 50%', force3D: true });
    gsap.set(this.el.envFlap, { transformOrigin: '50% 0%', transformPerspective: 1400 });
    gsap.set(this.el.flap, { transformOrigin: '50% 100%', transformPerspective: 2200 });
    this.render();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('keydown', this.handleKey);
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    const target = this.options.target();
    if (target) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(target);
    }
    gsap.ticker.add(this.tick);

    gsap.to(this.state, {
      rise: 1,
      duration: this.options.reducedMotion ? 0.4 : 1.4,
      ease: 'power3.out',
      onUpdate: () => this.renderRig(),
    });
    this.setPhase('sealed');

    if (!this.options.reducedMotion) {
      const Draggable = await loadDraggable();
      if (!this.destroyed) this.createDraggables(Draggable);
    }
  }

  destroy() {
    this.destroyed = true;
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf([this.state, this.el.seal, this.el.hint, this.root]);
    this.draggables.forEach((draggable) => draggable.kill());
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKey);
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    sound.slide.set(0);
    sound.rustle.set(0);
  }

  private setPhase(phase: OpeningPhase) {
    this.phase = phase;
    this.root.dataset.phase = phase;
    if (WAITING.has(phase)) this.waitingSince = performance.now();
    // The idle drift settles as soon as the card is on the move again.
    else if (this.state.float !== 0) gsap.to(this.state, { float: 0, duration: 0.4, ease: 'sine.out', onUpdate: () => this.renderRig() });
    this.syncDraggables();
    this.options.onPhase(phase);
  }

  /* ---------- Steps ---------- */

  /** The hint pill (and Enter/Space on it) performs the current step for the guest. */
  advance() {
    switch (this.phase) {
      case 'sealed':
        return this.openSeal();
      case 'slide':
        this.state.slideTarget = 1;
        return;
      case 'untie':
        return this.untie(true);
      case 'unfold':
        return this.unfold(true);
      case 'takeout':
        this.state.takeoutTarget = 1;
        return;
    }
  }

  openSeal() {
    if (this.phase !== 'sealed') return;
    (this.el.seal as HTMLButtonElement).disabled = true;
    sound.unlock();
    sound.sealPop();
    if (this.options.reducedMotion) return this.finish();

    this.setPhase('unsealing');
    const { seal } = this.el;
    const { dropY, w } = this.layout!;
    gsap
      .timeline({ onComplete: () => this.setPhase('slide') })
      .to(seal, { scale: 1.14, duration: 0.1, ease: 'power1.out' })
      .to(seal, { y: dropY * 0.55, x: w * 0.12, rotation: 150, duration: 0.85, ease: 'power2.in' })
      .to(seal, { autoAlpha: 0, duration: 0.25 }, '-=0.25')
      .add(() => sound.flapOpen(), 0.08)
      .to(this.state, { seal: 1, duration: 1, ease: 'power2.inOut', onUpdate: () => this.render() }, 0.16);
  }

  private enterUntie() {
    this.state.slide = 1;
    this.setPhase('untie');
    sound.slide.set(0);
  }

  untie(auto = false) {
    if (this.phase !== 'untie') return;
    this.setPhase('untying');
    const { pull } = this.layout!;
    const state = this.state;
    const timeline = gsap.timeline();
    if (auto) timeline.to(state, { pull, perp: 0, duration: 0.6, ease: 'power2.in', onUpdate: () => this.renderRibbon() });
    timeline
      .add(() => sound.ribbonSlip())
      // The knot slips: the bow collapses as the tail runs on through it...
      .to(state, { bow: 0, pull: `+=${pull * 0.7}`, perp: 0, duration: 0.38, ease: 'power2.out', onUpdate: () => this.renderRibbon() })
      // ...the card rocks from the release...
      .to(state, { jolt: 1.8, duration: 0.12, ease: 'power2.out', onUpdate: () => this.renderRig() }, '<')
      .to(state, { jolt: 0, duration: 1, ease: 'elastic.out(1, 0.35)', onUpdate: () => this.renderRig() })
      // ...and the loose ribbon slides off and drops away.
      .to(state, { fall: 1, duration: 1.1, ease: 'none', onUpdate: () => this.renderRibbon() }, '<0.02')
      // The flap is ready to pull while the ribbon is still falling away.
      .add(() => this.setPhase('unfold'), '-=0.45');
  }

  unfold(auto = false) {
    if (this.phase !== 'unfold') return;
    this.setPhase('unfolding');
    const state = this.state;
    const remaining = (180 - state.flap) / 180;
    gsap
      .timeline({ onComplete: () => this.setPhase('takeout') })
      // Paper falls open under its own weight, lands, and gives a small bounce.
      .to(state, {
        flap: 180,
        duration: auto ? 1.1 : Math.max(0.3, remaining * 0.85),
        ease: auto ? 'power2.inOut' : 'power2.in',
        onUpdate: () => this.renderFlap(),
      })
      .add(() => sound.paperLand())
      .to(state, { flap: 173, duration: 0.12, ease: 'sine.out', onUpdate: () => this.renderFlap() })
      .to(state, { flap: 180, duration: 0.22, ease: 'sine.in', onUpdate: () => this.renderFlap() })
      .to(state, { flapPose: 1, duration: 1.2, ease: 'power3.inOut', onUpdate: () => this.renderRig() }, auto ? 0.5 : 0.1);
  }

  private finish() {
    if (this.phase === 'exiting') return;
    this.setPhase('exiting');
    sound.slide.set(0);
    this.options.onOpen();
    // The page underneath now shows the same card in the same place; fade the scene off it.
    gsap.to(this.root, {
      autoAlpha: 0,
      duration: this.options.reducedMotion ? OPENING.reducedFadeMs / 1000 : 0.45,
      ease: 'power1.out',
      onComplete: () => this.options.onExited(),
    });
  }

  private nudge() {
    const now = performance.now();
    if (now - this.waitingSince < 600 || now - this.lastNudge < OPENING.nudgeIntervalMs) return;
    this.lastNudge = now;
    gsap.fromTo(this.el.hint, { x: 0 }, { keyframes: { x: [0, -7, 6, -4, 3, 0] }, duration: 0.5, ease: 'none' });
    this.root.dataset.nudge = String(now);
  }

  /* ---------- Scrolling (wheel, keys, swipes) ---------- */

  private scrollBy(px: number) {
    const { vh } = this.layout ?? { vh: window.innerHeight };
    const state = this.state;
    if (this.phase === 'slide') {
      state.slideTarget = clamp01(state.slideTarget + px / (vh * OPENING.slideScreens));
    } else if (this.phase === 'takeout') {
      if (state.takeoutTarget === 0 && px > 0) sound.lift();
      state.takeoutTarget = clamp01(state.takeoutTarget + px / (vh * OPENING.takeOutScreens));
    } else if (WAITING.has(this.phase) && px > 0) {
      this.nudge();
    }
  }

  private handleWheel = (event: WheelEvent) => {
    if ((event.target as Element | null)?.closest?.('dialog')) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    this.scrollBy(event.deltaY * unit);
  };

  private handleKey = (event: KeyboardEvent) => {
    if ((event.target as Element | null)?.closest?.('button, a, input, textarea, dialog')) return;
    const step = window.innerHeight * 0.35;
    const delta = { ArrowDown: step, PageDown: step * 2, ' ': step * 2, End: step * 4, ArrowUp: -step, PageUp: -step * 2 }[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    this.scrollBy(delta);
  };

  private handlePointerDown = (event: PointerEvent) => {
    const target = event.target as Element;
    if (event.pointerType === 'mouse' || target.closest('button')) return;
    if (this.draggables.some((drag) => drag.enabled() && (drag.vars.trigger as Element).contains(target))) return;
    this.swipe = { id: event.pointerId, y: event.clientY, t: event.timeStamp, v: 0 };
  };

  private handlePointerMove = (event: PointerEvent) => {
    const swipe = this.swipe;
    if (!swipe || swipe.id !== event.pointerId) return;
    const dy = swipe.y - event.clientY;
    const dt = Math.max(event.timeStamp - swipe.t, 1) / 1000;
    swipe.v = swipe.v * 0.6 + (dy / dt) * 0.4;
    swipe.y = event.clientY;
    swipe.t = event.timeStamp;
    this.scrollBy(dy);
  };

  private handlePointerUp = (event: PointerEvent) => {
    const swipe = this.swipe;
    if (!swipe || swipe.id !== event.pointerId) return;
    this.swipe = null;
    // Carry the flick on a little, as native scrolling would.
    if (event.timeStamp - swipe.t < 80) this.scrollBy(swipe.v * OPENING.swipeMomentum);
  };

  private handleResize = () => {
    if (!this.layout || this.phase === 'exiting') return;
    this.measure();
    this.render();
  };

  /* ---------- Gestures ---------- */

  private createDraggables(Draggable: typeof DraggableType) {
    const state = this.state;
    const { tailHandle, flap } = this.el;

    // Ribbon tail: the finger drags the tail end; the bow tightens as it's pulled.
    let tail = { x: 0, y: 0, pull: 0, perp: 0, lastX: 0, lastY: 0, lastT: 0 };
    // Draggable only moves an off-screen proxy; the drag's pointer drives the scene's state instead.
    const tailDrag: DraggableType = Draggable.create(document.createElement('div'), {
      trigger: tailHandle,
      type: 'x,y',
      allowContextMenu: true,
      onPress: () => {
        gsap.killTweensOf(state, 'pull,perp');
        const { pointerX: x, pointerY: y } = tailDrag;
        tail = { x, y, pull: state.pull, perp: state.perp, lastX: x, lastY: y, lastT: performance.now() };
        sound.unlock();
      },
      onDrag: () => {
        if (this.phase !== 'untie' || !this.layout) return;
        const { ribbon, pull, poses } = this.layout;
        const pose = poses.held;
        const { pointerX, pointerY } = tailDrag;
        // Screen → card pixels: undo the card's scale and its turn on the table.
        const dx = (pointerX - tail.x) / pose.s;
        const dy = (pointerY - tail.y) / pose.s;
        const a = -(pose.rz + state.jolt) * RAD;
        const lx = dx * Math.cos(a) - dy * Math.sin(a);
        const ly = dx * Math.sin(a) + dy * Math.cos(a);
        const [ux, uy] = ribbon.pullDirection;
        state.pull = Math.max(0, tail.pull + lx * ux + ly * uy);
        state.perp = rubber(tail.perp + (lx * -uy + ly * ux) * 0.5, ribbon.rw * 3);

        const now = performance.now();
        const speed = Math.hypot(pointerX - tail.lastX, pointerY - tail.lastY) / Math.max(now - tail.lastT, 1);
        tail = { ...tail, lastX: pointerX, lastY: pointerY, lastT: now };
        sound.rustle.set(speed * 0.8);
        this.renderRibbon();
        if (state.pull >= pull) {
          this.untie();
          tailDrag.endDrag(new PointerEvent('pointerup'));
        }
      },
      onRelease: () => {
        sound.rustle.set(0);
        if (this.phase !== 'untie' || !this.layout) return;
        if (state.pull / this.layout.pull >= OPENING.untieCommit) return this.untie(true);
        if (state.pull > 4) sound.ribbonSpring();
        // Let go too early: the satin springs back into its bow, slightly under-damped.
        gsap.to(state, { pull: 0, perp: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', onUpdate: () => this.renderRibbon() });
      },
    })[0];

    // Flap: the flap's top edge follows the finger down around its fold.
    let hinge = { y: 0, reach: 1, offset: 0, angle: 0, t: 0, velocity: 0 };
    const flapDrag: DraggableType = Draggable.create(document.createElement('div'), {
      trigger: flap,
      type: 'x,y',
      allowContextMenu: true,
      onPress: () => {
        if (this.phase !== 'unfold' || !this.layout) return;
        gsap.killTweensOf(state, 'flap');
        const y = flapDrag.pointerY;
        // The fold runs along the sheet's bottom edge; the flap's own box grows once it passes vertical.
        const fold = this.el.sheet.getBoundingClientRect().bottom;
        const reach = Math.max(fold - y, this.layout.flapH * this.layout.poses.held.s * 0.4);
        // Grabbed mid-spring: carry on from the flap's current angle rather than jumping to the finger.
        const offset = state.flap - Math.acos(gsap.utils.clamp(-1, 1, (fold - y) / reach)) / RAD;
        hinge = { y: fold, reach, offset, angle: state.flap, t: performance.now(), velocity: 0 };
        sound.unlock();
      },
      onDrag: () => {
        if (this.phase !== 'unfold') return;
        const cos = gsap.utils.clamp(-1, 1, (hinge.y - flapDrag.pointerY) / hinge.reach);
        const angle = gsap.utils.clamp(0, 180, Math.acos(cos) / RAD + hinge.offset);
        const now = performance.now();
        const dt = Math.max(now - hinge.t, 1) / 1000;
        hinge = { ...hinge, angle, t: now, velocity: hinge.velocity * 0.5 + ((angle - hinge.angle) / dt) * 0.5 };
        state.flap = angle;
        sound.rustle.set(Math.abs(hinge.velocity) / 500);
        this.renderFlap();
      },
      onRelease: () => {
        sound.rustle.set(0);
        if (this.phase !== 'unfold') return;
        if (state.flap >= OPENING.unfoldCommitDeg || (state.flap > 25 && hinge.velocity >= OPENING.unfoldFlickDegPerSec)) {
          return this.unfold();
        }
        gsap.to(state, { flap: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', onUpdate: () => this.renderFlap() });
      },
    })[0];

    this.draggables = [tailDrag, flapDrag];
    this.syncDraggables();
  }

  /** Each drag is only live during its own step, so elsewhere the card still scrolls under a swipe. */
  private syncDraggables() {
    const [tailDrag, flapDrag] = this.draggables;
    tailDrag?.enabled(this.phase === 'untie');
    flapDrag?.enabled(this.phase === 'unfold');
  }

  /* ---------- Frame loop ---------- */

  private tick = (time: number, deltaMs: number) => {
    if (!this.layout) return;
    const state = this.state;
    const dt = Math.min(deltaMs, 64) / 1000;
    const follow = 1 - Math.exp(-dt * OPENING.scrubResponse);

    if (this.phase === 'slide' || this.phase === 'takeout') {
      const key = this.phase === 'slide' ? 'slide' : 'takeout';
      const targetKey = this.phase === 'slide' ? 'slideTarget' : 'takeoutTarget';
      const before = state[key];
      const target = state[targetKey];
      state[key] = Math.abs(target - before) < 0.0005 ? target : before + (target - before) * follow;
      const speed = Math.abs(state[key] - before) / dt;
      sound.slide.set(speed * 1.6);
      if (state[key] !== before) this.render();
      if (state[key] >= 0.999 && target >= 1) {
        // Land exactly on the end pose; for the take-out that's pixel-aligned with the page's card.
        state[key] = 1;
        this.render();
        if (this.phase === 'slide') this.enterUntie();
        else this.finish();
      }
    }

    // While waiting on the guest, the card drifts a touch, as if resting on a breath of air.
    if (!this.options.reducedMotion && (WAITING.has(this.phase) || this.phase === 'loading')) {
      state.float = Math.sin(time * 1.2) * 3;
      this.renderRig();
    }
  };

  /* ---------- Layout ---------- */

  private measure() {
    const target = this.options.target();
    const { sheet, flap, safe } = this.el;
    const vw = this.root.clientWidth;
    const vh = this.root.clientHeight;
    const box = target?.getBoundingClientRect();
    const w = box?.width ?? Math.min(vw - 32, 576);
    this.root.style.setProperty('--card-w', `${w}px`);
    const sheetH = (sheet as HTMLElement).offsetHeight;
    this.root.style.setProperty('--card-h', `${sheetH}px`);
    const flapH = (flap as HTMLElement).offsetHeight;

    const insets = getComputedStyle(safe);
    const top = parseFloat(insets.paddingTop) + 20;
    const bottom = parseFloat(insets.paddingBottom) + 104;
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
    const availOpen = vh - top - (parseFloat(insets.paddingBottom) + 84);
    const openS = Math.min((vw - 32) / w, availOpen / total);

    const pullScreen = gsap.utils.clamp(OPENING.pullMin, OPENING.pullMax, Math.min(vw, vh) * OPENING.pullShare);

    this.layout = {
      vw,
      vh,
      w,
      sheetH,
      flapH,
      outY,
      dropY: (vh * 1.3) / midS,
      pull: pullScreen / heldS,
      ribbon: ribbonGeometry(w, sheetH),
      poses: {
        sealed: { x: cx, y: cy, s: sealedS, rx: 9 * tilted, ry: -5 * tilted, rz: -2 * tilted },
        // Opened, the flap stands up above the envelope: ease back so it stays in view.
        unsealed: { x: cx, y: cy + envH * 0.4 * unsealedS * 0.5, s: unsealedS, rx: 6 * tilted, ry: -4 * tilted, rz: -1 * tilted },
        mid: { x: cx, y: cy - (midCentre - sheetH / 2) * midS + 20, s: midS, rx: 5 * tilted, ry: -2 * tilted, rz: 0 },
        held: { x: cx, y: cy, s: heldS, rx: 11 * tilted, ry: -7 * tilted, rz: 2.5 * tilted },
        unfolded: { x: cx, y: top + availOpen / 2 - (flapH / 2) * openS, s: openS, rx: 0, ry: 0, rz: 0 },
        final: box
          ? { x: box.left + w / 2, y: box.top + sheetH / 2, s: 1, rx: 0, ry: 0, rz: 0 }
          : { x: cx, y: top + sheetH / 2, s: 1, rx: 0, ry: 0, rz: 0 },
      },
    };
    this.layoutRibbon();
  }

  private layoutRibbon() {
    const { w, sheetH, ribbon } = this.layout!;
    this.root.style.setProperty('--rw', `${ribbon.rw}px`);
    this.root.style.setProperty('--band-y', `${ribbon.bandY}px`);
    this.el.bow.setAttribute('viewBox', `0 0 ${w} ${sheetH}`);
    const handle = Math.max(56 / this.layout!.poses.held.s, ribbon.rw * 3);
    this.root.style.setProperty('--handle', `${handle}px`);
    const { rw } = ribbon;
    const knot = this.el.knot.querySelector('rect')!;
    for (const [name, value] of [['x', -rw * 0.62], ['y', -rw * 0.55], ['width', rw * 1.24], ['height', rw * 1.1], ['rx', rw * 0.32]] as const) {
      knot.setAttribute(name, value.toFixed(1));
    }
    this.el.ring.setAttribute('r', (rw * 1.6).toFixed(1));
  }

  /* ---------- Drawing ---------- */

  private render() {
    this.renderRig();
    this.renderEnvelope();
    this.renderRibbon();
    this.renderFlap();
  }

  private currentPose(): Pose {
    const { poses } = this.layout!;
    const { seal, slide, flapPose, takeout } = this.state;
    if (takeout > 0) return mixPose(poses.unfolded, poses.final, inOut(takeout));
    if (flapPose > 0) return mixPose(poses.held, poses.unfolded, flapPose);
    const start = mixPose(poses.sealed, poses.unsealed, seal);
    return slide < 0.5 ? mixPose(start, poses.mid, inOut(slide / 0.5)) : mixPose(poses.mid, poses.held, inOut((slide - 0.5) / 0.5));
  }

  private renderRig() {
    if (!this.layout) return;
    const { rise, jolt, float, slide } = this.state;
    const pose = this.currentPose();
    gsap.set(this.el.rig, {
      x: pose.x,
      y: pose.y + (1 - rise) * 36 + float,
      scale: pose.s,
      rotationX: pose.rx,
      rotationY: pose.ry,
      rotation: pose.rz + jolt,
      transformPerspective: 1600,
      autoAlpha: rise,
    });

    // The card rises out through the envelope's mouth, then settles back to the middle of the rig.
    const { outY } = this.layout;
    const out = slide < 0.5 ? inOut(slide / 0.5) : 1 - inOut((slide - 0.5) / 0.5);
    gsap.set(this.el.card, { y: -outY * out, zIndex: slide >= 0.5 ? 6 : 3 });
  }

  private renderEnvelope() {
    if (!this.layout) return;
    const { seal, slide } = this.state;
    gsap.set(this.el.envFlap, { rotationX: 180 * seal, zIndex: seal > 0.5 ? 2 : 5 });
    gsap.set(this.el.flapShadowOnPocket, { opacity: 1 - clamp01(seal * 2) });
    // Once the card is clear, the empty envelope drops away off the bottom of the screen.
    const drop = easeIn(clamp01((slide - 0.5) / 0.5));
    gsap.set(this.envelope, { y: drop * this.layout.dropY, x: drop * this.layout.w * 0.08, autoAlpha: drop >= 1 ? 0 : 1 });
  }

  private renderRibbon() {
    if (!this.layout) return;
    const { ribbon, pull: pullLength, dropY, w } = this.layout;
    const { pull, perp, bow, fall } = this.state;
    const { rw, knot, loopLength, loopAngles, tailFixed, tailPulled, pullDirection } = ribbon;
    const tension = clamp01(pull / pullLength);

    // Pulling a tail draws its loop in through the knot; the other loop only tightens a little.
    const loops: Array<[string, number, number]> = [
      ['L', loopLength * (1 - 0.18 * tension) * bow, loopAngles[0] - 8 * tension],
      ['R', loopLength * (1 - 0.82 * tension) * bow, loopAngles[1] + 14 * tension],
    ];
    for (const [side, length, angle] of loops) {
      const { outer, inner } = loopPaths(length, rw);
      this.el[`loop${side}`].setAttribute('transform', `translate(${knot[0]} ${knot[1]}) rotate(${angle.toFixed(2)})`);
      this.el[`loop${side}Outer`].setAttribute('d', outer);
      this.el[`loop${side}Inner`].setAttribute('d', inner);
    }

    const normal: Vec = [-pullDirection[1], pullDirection[0]];
    const end: Vec = [
      tailPulled[0] + pullDirection[0] * pull + normal[0] * perp,
      tailPulled[1] + pullDirection[1] * pull + normal[1] * perp,
    ];
    const start: Vec = [knot[0] + rw * 0.2, knot[1] + rw * 0.3];
    this.el.tailPulled.setAttribute('d', tailPath(start, end, rw * 1.4 * (1 - tension) - perp * 0.3, rw));
    // As the knot slips, the other tail is drawn up into it.
    const fixedEnd: Vec = [
      knot[0] + (tailFixed[0] - knot[0]) * (0.3 + 0.7 * bow),
      knot[1] + (tailFixed[1] - knot[1]) * (0.3 + 0.7 * bow),
    ];
    this.el.tailFixed.setAttribute('d', tailPath([knot[0] - rw * 0.2, knot[1] + rw * 0.3], fixedEnd, -rw * 1.2, rw));
    this.el.knot.setAttribute(
      'transform',
      `translate(${knot[0]} ${knot[1]}) rotate(${(-8 + 10 * tension).toFixed(2)}) scale(${(0.4 + 0.6 * bow).toFixed(3)})`,
    );
    this.el.ring.setAttribute('cx', end[0].toFixed(1));
    this.el.ring.setAttribute('cy', end[1].toFixed(1));
    gsap.set(this.el.tailHandle, { x: end[0], y: end[1] });

    const drop = easeIn(fall);
    gsap.set(this.el.ribbon, { y: drop * dropY, x: fall * w * 0.1, rotation: fall * 16, autoAlpha: fall >= 1 ? 0 : 1 });
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
}
