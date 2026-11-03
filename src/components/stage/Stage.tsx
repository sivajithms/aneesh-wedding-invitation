import { useEffect, useRef, useState, useCallback } from 'react';
import type { WeddingConfig } from '../../config/types';
import { WrapCanvas } from './WrapCanvas';
import { Card1Formal } from './Card1Formal';
import { Card2Floral } from './Card2Floral';
import { RibbonLayer } from './ribbon/RibbonLayer';
import styles from './Stage.module.css';

interface StageProps {
  wedding: WeddingConfig;
  onOpenRsvp: () => void;
  onOpenWish: () => void;
  onUnveiled?: () => void;
  onReplay?: () => void;
}

export type StageState =
  | 'sealed'
  | 'opened'
  | 'extracting'
  | 'extracted'
  | 'wrap_tearing'
  | 'wrap_falling'
  | 'ribbon_tied'
  | 'ribbon_untying'
  | 'peeled';

export function Stage({ wedding, onOpenRsvp, onOpenWish, onUnveiled, onReplay }: StageProps) {
  const [stageState, setStageState] = useState<StageState>('sealed');
  const [isLive, setIsLive] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const [cardDims, setCardDims] = useState({ w: 360, h: 480 });

  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load Readiness & Measure Dimensions
  useEffect(() => {
    const timer = setTimeout(() => {
      stickyRef.current?.classList.add(styles.ready);
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCardDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
    }, 120);

    const handleResize = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCardDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 2. Open Envelope (Sealed -> Opened)
  const handleOpenEnvelope = useCallback(() => {
    if (stageState !== 'sealed') return;
    setStageState('opened');
  }, [stageState]);

  // 3. Extract Card out of Envelope Pocket with Continuous Firm Physics (1.15s arc)
  const handleExtractCard = useCallback(() => {
    if (stageState !== 'opened') return;
    setStageState('extracting');

    // 1.15s matches the firm physics keyframe arc
    setTimeout(() => {
      setStageState('extracted');
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCardDims({ w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
    }, 1150);
  }, [stageState]);

  // Gestures: wheel or touch swipe down on opened envelope triggers firm extraction
  useEffect(() => {
    if (stageState !== 'opened') return;

    const handleWheelExtract = (e: WheelEvent) => {
      if (e.deltaY > 15) {
        handleExtractCard();
      }
    };

    let startTouchY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startTouchY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const diffY = startTouchY - e.touches[0].clientY;
      if (diffY > 25) {
        handleExtractCard();
      }
    };

    window.addEventListener('wheel', handleWheelExtract, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheelExtract);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [stageState, handleExtractCard]);

  // 4. Wrap Tear Complete -> Trigger Silky Fabric Fall
  const handleWrapFallComplete = useCallback(() => {
    setTearProgress(1);
    setStageState('ribbon_tied');
  }, []);

  // 5. Auto Tear Trigger ("OPEN IT FOR ME" button for Step 1)
  const handleAutoTear = useCallback(() => {
    if (stageState !== 'extracted') return;
    setStageState('wrap_tearing');

    const startTime = performance.now();
    const startP = tearProgress;
    const duration = 850;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startP + (1 - startP) * eased;
      setTearProgress(current);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setStageState('wrap_falling');
        setTimeout(() => {
          handleWrapFallComplete();
        }, 950);
      }
    };
    requestAnimationFrame(tick);
  }, [stageState, tearProgress, handleWrapFallComplete]);

  // Gestures: wheel or touch swipe left on extracted card triggers tear
  useEffect(() => {
    if (stageState !== 'extracted') return;

    const handleWheelTear = (e: WheelEvent) => {
      if (e.deltaY > 20) {
        handleAutoTear();
      }
    };

    let startTouchX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      startTouchX = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const diffX = startTouchX - e.touches[0].clientX;
      if (diffX > 30) {
        handleAutoTear();
      }
    };

    window.addEventListener('wheel', handleWheelTear, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheelTear);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [stageState, handleAutoTear]);

  // 6. Ribbon Untie Complete -> Reveal Card 2 & Open RSVP Popup
  const handleUntieComplete = useCallback(() => {
    setStageState('ribbon_untying');

    setTimeout(() => {
      setStageState('peeled');
      setIsLive(true);
      document.documentElement.classList.add('revealed');
      document.documentElement.classList.remove('sealed');
      document.body.classList.remove('sealed');
      onUnveiled?.();

      // Automatically present the RSVP popup with number of participants!
      setTimeout(() => {
        onOpenRsvp();
      }, 350);
    }, 650);
  }, [onUnveiled, onOpenRsvp]);

  // 7. Auto Untie Ribbon Trigger ("OPEN IT FOR ME" button for Step 2)
  const handleAutoUntie = useCallback(() => {
    if (stageState !== 'ribbon_tied') return;
    handleUntieComplete();
  }, [stageState, handleUntieComplete]);

  // 8. Replay Unwrapping (Peeled -> Sealed)
  const handleReplay = useCallback(() => {
    setStageState('sealed');
    setIsLive(false);
    setTearProgress(0);
    document.documentElement.classList.add('sealed');
    document.body.classList.add('sealed');
    document.documentElement.classList.remove('revealed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onReplay?.();
  }, [onReplay]);

  // 9. Scroll to Wedding Details Section
  const handleScrollToDetails = useCallback(() => {
    const el = document.getElementById('details');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // 10. Derived Visual States based on stageState
  const envelopeOpen = stageState !== 'sealed';
  const sealOpacity = envelopeOpen ? 0 : 1;

  // Envelope receding: down and faded once extracted
  const envReceded = stageState !== 'sealed' && stageState !== 'opened';
  const envRecedeY = envReceded ? 75 : 0;
  const envOpacity = envReceded ? 0 : 1;

  // Card Positioning and Transforms (When not in extracting animation)
  let cardY = 0;
  let cardScale = 0.63;
  let cardRotation = 0;
  let cardZIndex: number | undefined = 10; // inside envelope pocket (in front of envBack=1 and behind envFront=20)

  if (stageState === 'extracting') {
    cardZIndex = undefined; // Controlled entirely by CSS keyframe extractCardFirm
  } else if (stageState === 'extracted' || stageState === 'wrap_tearing') {
    cardY = 0;
    cardScale = 1.0;
    cardRotation = -7;
    cardZIndex = 35; // above envelope
  } else if (stageState === 'wrap_falling' || stageState === 'ribbon_tied') {
    cardY = 0;
    cardScale = 1.0;
    cardRotation = -3;
    cardZIndex = 35;
  } else if (stageState === 'ribbon_untying' || stageState === 'peeled') {
    cardY = 0;
    cardScale = 1.0;
    cardRotation = 0; // straightened
    cardZIndex = 35;
  }

  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    wedding.venue.mapsQuery
  )}`;

  return (
    <section className={styles.scene} id="scene">
      <div ref={stickyRef} className={`${styles.sticky} ${styles.holding}`} id="sticky">
        <div className={styles.stage} id="stage">
          {/* ========================================================
              1. Envelope Back (z-index: 1)
                 Lined with gold diamond pattern, sits behind the card
              ======================================================== */}
          <div
            className={`${styles.envBackRef} ${stageState === 'extracting' ? styles.envRecedeAnim : ''}`}
            id="envBack"
            style={{
              transform:
                stageState === 'extracting'
                  ? undefined
                  : `translate(-50%, -50%) translateY(${envRecedeY}px)`,
              opacity: stageState === 'extracting' ? undefined : envOpacity,
            }}
          />

          {/* ========================================================
              2. The Card Wrapper (Holds Invitation + Cover + Ribbon + Wrap)
                 z-index: 10 inside pocket (behind envFront=20),
                 z-index: 35 when extracted (in front of everything)!
              ======================================================== */}
          <div
            ref={wrapperRef}
            className={`${styles.cardWrapper} ${stageState === 'extracting' ? styles.extracting : ''}`}
            style={{
              transform:
                stageState === 'extracting'
                  ? undefined
                  : `translate(-50%, -50%) translateY(${cardY}px) scale(${cardScale}) rotate(${cardRotation}deg)`,
              zIndex: cardZIndex,
              pointerEvents: stageState === 'sealed' ? 'none' : 'auto',
              boxShadow:
                stageState === 'extracting'
                  ? undefined
                  : isLive
                  ? 'none'
                  : stageState === 'extracted' || stageState === 'wrap_tearing'
                  ? '-5px 22px 55px rgba(35, 20, 5, 0.3), 0 3px 8px rgba(35, 20, 5, 0.14)'
                  : cardZIndex && cardZIndex > 20
                  ? '0 18px 45px rgba(40, 25, 5, 0.28)'
                  : '0 4px 12px rgba(45, 30, 10, 0.12)',
              transition:
                stageState === 'extracting'
                  ? 'none'
                  : 'transform 0.65s cubic-bezier(0.2, 0.9, 0.25, 1), box-shadow 0.5s ease',
              cursor: stageState === 'opened' ? 'pointer' : 'default',
            }}
            onClick={stageState === 'opened' ? handleExtractCard : undefined}
          >
            {/* Card 2: The Luxury Floral Invitation (Base card with 3D tilt & all hover features!) */}
            <div ref={cardRef} style={{ width: '100%', height: '100%' }}>
              <Card2Floral
                wedding={wedding}
                isLive={stageState === 'peeled'}
                onOpenRsvp={onOpenRsvp}
              />
            </div>

            {/* Card 1: The Formal Invitation Card (Sitting on top of Card 2, under the ribbon) */}
            {stageState !== 'peeled' && (
              <Card1Formal
                wedding={wedding}
                isLifting={stageState === 'ribbon_untying'}
              />
            )}

            {/* Satin Ribbon (tied around Card 1) */}
            {(stageState === 'ribbon_tied' || stageState === 'ribbon_untying') && (
              <RibbonLayer
                cardWidth={cardDims.w}
                cardHeight={cardDims.h}
                onUntied={handleUntieComplete}
                interactive={stageState === 'ribbon_tied'}
              />
            )}

            {/* Gift Wrap with Jagged Paper Tear, 3D Paper Curl & Gold PULL Tab */}
            {stageState !== 'ribbon_tied' &&
              stageState !== 'ribbon_untying' &&
              stageState !== 'peeled' && (
                <WrapCanvas
                  progress={tearProgress}
                  onProgressChange={setTearProgress}
                  onComplete={handleWrapFallComplete}
                  isPeeled={false}
                  interactive={stageState === 'extracted'}
                  onAutoTear={handleAutoTear}
                  isFalling={stageState === 'wrap_falling'}
                />
              )}
          </div>

          {/* ========================================================
              3. Envelope Front Pocket (z-index: 20!)
                 Sits in FRONT of the card while inside the pocket!
              ======================================================== */}
          <div
            className={`${styles.envFrontRef} ${stageState === 'extracting' ? styles.envRecedeAnim : ''}`}
            id="envFront"
            style={{
              transform:
                stageState === 'extracting'
                  ? undefined
                  : `translate(-50%, -50%) translateY(${envRecedeY}px)`,
              opacity: stageState === 'extracting' ? undefined : envOpacity,
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
              className={styles.envFrontSvg}
            >
              <polygon points="0,0 50,52 0,100" fill="rgba(255,255,255,.22)" />
              <polygon points="100,0 50,52 100,100" fill="rgba(255,255,255,.18)" />
              <polygon points="0,100 50,52 100,100" fill="rgba(0,0,0,.04)" />
            </svg>
            <div className={styles.envFlapBottom}>
              <div className={styles.addressee}>
                <small>Specially for</small>
                <span className={styles.addresseeName}>Honoured Guest</span>
              </div>
            </div>
          </div>

          {/* ========================================================
              5. Envelope Top Triangular Flap (Folds open 180°, z-index: 25!)
              ======================================================== */}
          <div
            className={`${styles.envFlapTopRef} ${envelopeOpen ? styles.open : ''} ${
              stageState === 'extracting' ? styles.envFlapTopRecedeAnim : ''
            }`}
            id="envFlap"
            style={{
              transform:
                stageState === 'extracting'
                  ? undefined
                  : envelopeOpen
                  ? `translateX(-50%) translateY(${envRecedeY}px) perspective(900px) rotateX(180deg)`
                  : `translateX(-50%) translateY(${envRecedeY}px) perspective(900px) rotateX(0deg)`,
              opacity: stageState === 'extracting' ? undefined : envOpacity,
            }}
          />

          {/* ========================================================
              6. Center Ruby Wax Seal (Monogram A&H, z-index: 30!)
              ======================================================== */}
          <button
            type="button"
            className={`${styles.sealRef} ${envelopeOpen ? styles.popped : ''}`}
            id="seal"
            onClick={handleOpenEnvelope}
            aria-label="Tap the wax seal to open the envelope"
            style={{
              opacity: sealOpacity,
              visibility: envelopeOpen ? 'hidden' : 'visible',
            }}
          >
            <span className={styles.sealMonogram}>
              {wedding.monogram[0]}&amp;{wedding.monogram[1]}
            </span>
          </button>

          {/* ========================================================
              7. Pill Badge '● TAP TO OPEN' Directly Below Seal (z-index: 30!)
              ======================================================== */}
          {stageState === 'sealed' && (
            <button
              type="button"
              className={styles.tapPill}
              id="tapPill"
              onClick={handleOpenEnvelope}
              aria-label="Tap to open the envelope"
            >
              <span className={styles.tapDot} aria-hidden="true" />
              <span>TAP TO OPEN</span>
            </button>
          )}
        </div>

        {/* ========================================================
            8. Step-by-Step Cues Matching Reference Behavior
            ======================================================== */}
        {/* Step: Pull Out Invitation */}
        {stageState === 'opened' && (
          <button
            type="button"
            className={styles.interactiveActionBtn}
            onClick={handleExtractCard}
            aria-label="Pull out the invitation card from the envelope"
          >
            <span>Pull Out Invitation</span>
            <span className={styles.btnArrow}>↑</span>
          </button>
        )}

        {/* Step 1 Prompt: Tear Open Wrap Matching Reference Photo */}
        {(stageState === 'extracted' || stageState === 'wrap_tearing') && (
          <div className={styles.stepCueBox}>
            <span className={styles.stepBadge}>● STEP 1 OF 2 ●</span>
            <p className={styles.stepPromptText}>
              Drag the gold tab to the left to tear open the wrap
            </p>
            <button
              type="button"
              className={styles.stepOpenBtn}
              onClick={handleAutoTear}
              aria-label="Open the wrap automatically"
            >
              OPEN IT FOR ME
            </button>
          </div>
        )}

        {/* Step 2 Prompt: Untie Satin Ribbon on Card 1 */}
        {stageState === 'ribbon_tied' && (
          <div className={styles.stepCueBox}>
            <span className={styles.stepBadge}>● STEP 2 OF 2 ●</span>
            <p className={styles.stepPromptText}>
              Now pull the end of the ribbon to untie the bow
            </p>
            <button
              type="button"
              className={styles.stepOpenBtn}
              onClick={handleAutoUntie}
              aria-label="Untie the ribbon automatically"
            >
              OPEN IT FOR ME
            </button>
          </div>
        )}

        {/* Step 3: Card 2 Revealed Actions */}
        {stageState === 'peeled' && (
          <>
            <nav
              className={`${styles.finale} ${styles.on}`}
              id="finale"
              aria-label="Invitation actions"
            >
              <button
                type="button"
                className={styles.primary}
                id="rsvpBtn"
                onClick={onOpenRsvp}
              >
                RSVP
              </button>
              <button type="button" id="wishBtn" onClick={onOpenWish}>
                BLESSINGS
              </button>
              <a id="mapBtn" href={mapSearchUrl} target="_blank" rel="noopener">
                DIRECTIONS
              </a>
            </nav>

            <button
              type="button"
              className={`${styles.replay} ${styles.on}`}
              id="replayBtn"
              onClick={handleReplay}
              title="Re-seal and unwrap again"
            >
              ↺ UNWRAP IT AGAIN
            </button>

            <button
              type="button"
              className={`${styles.more} ${styles.on}`}
              id="more"
              onClick={handleScrollToDetails}
            >
              COUNTDOWN &amp; VENUE DETAILS<i aria-hidden="true"> ⌄</i>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
