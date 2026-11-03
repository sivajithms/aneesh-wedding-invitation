import { useState } from 'react';
import type { WeddingConfig } from '../../config/types';
import { useTilt } from '../../hooks/useTilt';
import styles from './Card2Floral.module.css';

interface Card2FloralProps {
  wedding: WeddingConfig;
  isLive?: boolean;
  onOpenRsvp: () => void;
}

export function Card2Floral({
  wedding,
  isLive = false,
  onOpenRsvp,
}: Card2FloralProps) {
  const { ref: tiltRef, onPointerMove, onPointerLeave } = useTilt<HTMLDivElement>();
  const [copiedPhone, setCopiedPhone] = useState(false);

  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    wedding.venue.mapsQuery
  )}`;

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText('+919895603210');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div
      ref={tiltRef}
      className={`${styles.cardFloral} ${isLive ? styles.live : ''}`}
      id="image2"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        pointerEvents: isLive ? 'auto' : 'none',
      }}
    >
      {/* Dynamic Specular Gold Foil Reflection on Hover */}
        <div className={styles.foilGlare} aria-hidden="true" />
        <span className={`${styles.sheen} ${isLive ? styles.go : ''}`} id="sheen" />

        {/* Textured Cream Paper Inner Border */}
        <div className={styles.innerBorder} />

        {/* Vertical Spaced Serif Text Down Right Margin: S A V E   O U R   D A T E */}
        <div className={styles.verticalSaveDate} aria-hidden="true">
          <span>S</span>
          <span>A</span>
          <span>V</span>
          <span>E</span>
          <span className={styles.spacer} />
          <span>O</span>
          <span>U</span>
          <span>R</span>
          <span className={styles.spacer} />
          <span>D</span>
          <span>A</span>
          <span>T</span>
          <span>E</span>
        </div>

        {/* Botanical Magnolia Line-Art Illustrations in corners */}
        {/* 1. Top-Left Magnolia Branch */}
        <svg
          viewBox="0 0 160 160"
          className={styles.magnoliaTL}
          fill="none"
          stroke="#b89352"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M-10 10 Q35 25 65 75 Q40 90 10 95 Q-5 60 -10 10 Z" fill="rgba(245, 235, 215, 0.4)" />
          <path d="M15 20 Q45 45 50 85" strokeWidth="0.8" />
          <path d="M45 15 Q75 10 110 35 Q85 65 55 60 Z" fill="rgba(245, 235, 215, 0.35)" />
          <path d="M60 25 Q80 35 95 45" strokeWidth="0.8" />
          <path d="M10 80 Q50 95 85 140 Q45 145 20 120 Z" fill="rgba(245, 235, 215, 0.3)" />
          <path d="M25 90 Q50 110 65 130" strokeWidth="0.8" />
          <path d="M70 70 Q105 85 130 65 Q115 110 80 100 Z" fill="rgba(245, 235, 215, 0.3)" />
        </svg>

        {/* 2. Mid-Left Floral Accent */}
        <svg
          viewBox="0 0 100 120"
          className={styles.magnoliaML}
          fill="none"
          stroke="#b89352"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M-10 40 Q30 35 55 70 Q30 95 -10 85 Z" fill="rgba(245, 235, 215, 0.3)" />
          <path d="M5 50 Q25 60 40 75" strokeWidth="0.8" />
          <path d="M25 25 Q60 15 75 45 Q50 65 20 50 Z" fill="rgba(245, 235, 215, 0.25)" />
        </svg>

        {/* 3. Bottom-Left Botanical Leaves */}
        <svg
          viewBox="0 0 140 140"
          className={styles.magnoliaBL}
          fill="none"
          stroke="#b89352"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M-10 120 Q35 95 45 60 Q15 65 -10 100 Z" fill="rgba(245, 235, 215, 0.3)" />
          <path d="M10 110 Q25 85 30 70" strokeWidth="0.8" />
          <path d="M25 140 Q65 115 85 80 Q50 85 15 115 Z" fill="rgba(245, 235, 215, 0.3)" />
          <path d="M35 130 Q55 105 65 90" strokeWidth="0.8" />
        </svg>

        {/* 4. Bottom-Right Blooming Magnolia Blossom */}
        <svg
          viewBox="0 0 200 200"
          className={styles.magnoliaBR}
          fill="none"
          stroke="#b89352"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Main Petals */}
          <path d="M140 190 Q120 140 100 110 Q145 95 175 140 Z" fill="rgba(245, 235, 215, 0.45)" />
          <path d="M125 170 Q120 135 115 118" strokeWidth="0.8" />
          <path d="M95 110 Q70 70 85 35 Q125 55 115 95 Z" fill="rgba(245, 235, 215, 0.5)" />
          <path d="M95 90 Q90 65 92 48" strokeWidth="0.8" />
          <path d="M115 95 Q145 60 175 75 Q165 115 125 115 Z" fill="rgba(245, 235, 215, 0.45)" />
          <path d="M130 95 Q145 80 160 80" strokeWidth="0.8" />
          <path d="M125 115 Q175 110 195 145 Q165 175 140 165 Z" fill="rgba(245, 235, 215, 0.4)" />
          {/* Leaves */}
          <path d="M70 145 Q40 170 50 195 Q85 185 85 150 Z" fill="rgba(245, 235, 215, 0.35)" />
          <path d="M60 160 Q65 175 70 185" strokeWidth="0.8" />
          <path d="M165 185 Q195 175 210 195 Q180 205 155 195 Z" fill="rgba(245, 235, 215, 0.35)" />
        </svg>

        {/* Invitation Content Container */}
        <div className={styles.cardContent}>
          {/* Top: Arabic Bismillah in Gold Calligraphy */}
          <p className={styles.bismillah} lang="ar" dir="rtl">
            {wedding.messages.bismillah}
          </p>

          {/* Groom's Parents */}
          <div className={styles.parentsSection}>
            <p className={styles.parentNames}>
              Mr. {wedding.groom.parents}
            </p>
            <p className={styles.parentHouse}>
              {wedding.groom.house}, Changaramkulam, Kerala
            </p>
          </div>

          {/* Formal Invitation Prose */}
          <p className={styles.cordialText}>
            Cordially invite your esteemed presence with family
            <br />
            to the wedding reception of our beloved son
          </p>

          {/* Couple Names in Luxurious Script Typography */}
          <div className={styles.namesBlock}>
            <h1 className={styles.groomName}>{wedding.groom.name}</h1>
            <span className={styles.joinerAmp}>&amp;</span>
            <h1 className={styles.brideName}>{wedding.bride.name}</h1>
          </div>

          {/* Bride's Parents */}
          <div className={styles.parentsSection}>
            <p className={styles.brideParents}>
              D/O Mr. {wedding.bride.parents}
            </p>
            <p className={styles.parentHouse}>
              {wedding.bride.house}, Changaramkulam, Kerala
            </p>
          </div>

          {/* Bottom Grid: QR Code + Reception Time + Venue */}
          <div className={styles.bottomGrid}>
            {/* Left Box: QR Code Box */}
            <a
              href={mapSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.qrBlock}
              title="Click or scan to view location map"
            >
              <div className={styles.qrHeader}>
                <span className={styles.qrLabel}>Location</span>
              </div>
              <div className={styles.qrBox}>
                <svg viewBox="0 0 24 24" className={styles.qrSvg} fill="none" stroke="#2b2216" strokeWidth="1.8">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="5" y="5" width="3" height="3" fill="#2b2216" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="16" y="5" width="3" height="3" fill="#2b2216" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="5" y="16" width="3" height="3" fill="#2b2216" />
                  <rect x="14" y="14" width="3" height="3" fill="#2b2216" />
                  <rect x="18" y="14" width="3" height="3" fill="#2b2216" />
                  <rect x="16" y="18" width="5" height="3" fill="#2b2216" />
                </svg>
              </div>
            </a>

            {/* Middle-Right: Reception Schedule */}
            <div className={styles.receptionSchedule}>
              <span className={styles.receptionTag}>Reception</span>
              <strong className={styles.receptionTime}>05:00 PM Onwards</strong>
              <div className={styles.receptionDateRow}>
                <span className={styles.dateNumber}>20.12.2026</span>
                <span className={styles.dateDay}>SUNDAY</span>
              </div>
            </div>
          </div>

          {/* Venue & Location Details */}
          <div className={styles.venueSection}>
            <strong className={styles.venueName}>{wedding.venue.name}</strong>
            <span className={styles.venueLoc}>{wedding.venue.location.toUpperCase()}</span>
          </div>

          {/* Contact Number */}
          <div className={styles.contactSection}>
            <span className={styles.contactLabel}>Contact Number :</span>
            <button
              type="button"
              className={styles.contactBtn}
              onClick={handleCopyPhone}
              title="Click to copy contact number"
            >
              <strong>+91 9895603210</strong>
              {copiedPhone && <span className={styles.copiedBadge}>Copied!</span>}
            </button>
          </div>
        </div>

        {/* Hotspots for Direct Hover and Interaction */}
        <a
          className={styles.hotspotMap}
          href={mapSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open map for ${wedding.venue.name}`}
        />
        <button
          type="button"
          className={styles.hotspotRsvp}
          onClick={onOpenRsvp}
          aria-label="RSVP for wedding"
        />
      </div>
  );
}
