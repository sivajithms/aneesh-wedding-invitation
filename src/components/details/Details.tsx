import { useEffect, useRef, useState } from 'react';
import type { WeddingConfig } from '../../config/types';
import { SprigRule } from '../ui/SprigRule';
import styles from './Details.module.css';

interface DetailsProps {
  wedding: WeddingConfig;
  onOpenRsvp: () => void;
  rsvpStatus?: { answer: 'yes' | 'no'; count?: number } | null;
}

export function Details({ wedding, onOpenRsvp, rsvpStatus }: DetailsProps) {
  const [greeting, setGreeting] = useState('');
  const [timeLeft, setTimeLeft] = useState({ days: '00', hours: '00', minutes: '00', seconds: '00' });
  const [prevSeconds, setPrevSeconds] = useState('00');
  const [isFlippingS, setIsFlippingS] = useState(false);
  const [tripInfo, setTripInfo] = useState<{ big: string; small: string; err?: boolean } | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const endSealRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLElement>(null);

  // 1. Personalized Greeting from URL Query
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const to = params.get('to');
      if (to) {
        setGreeting(`Welcome, ${to.trim()}`);
      }
    } catch {
      // Ignore
    }
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    const targetDate = new Date(`${wedding.date}T${wedding.time || '11:00'}:00${wedding.utcOffset}`).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, targetDate - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      const dStr = String(d).padStart(2, '0');
      const hStr = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const sStr = String(s).padStart(2, '0');

      setTimeLeft((prev) => {
        if (prev.seconds !== sStr) {
          setPrevSeconds(prev.seconds);
          setIsFlippingS(true);
          setTimeout(() => setIsFlippingS(false), 560);
        }
        return { days: dStr, hours: hStr, minutes: mStr, seconds: sStr };
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [wedding]);

  // 3. Scroll Reveal for Sections (.rise.in) and End Seal Press
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.in);
            if (entry.target === endSealRef.current) {
              endSealRef.current?.classList.add(styles.pressed);
            }
          }
        }
      },
      { threshold: 0.05, rootMargin: '200px 0px 200px 0px' }
    );

    const riseElements = el.querySelectorAll(`.${styles.rise}`);
    riseElements.forEach((child) => observer.observe(child));
    if (endSealRef.current) observer.observe(endSealRef.current);

    return () => observer.disconnect();
  }, []);

  // 4. Geolocation Driving Distance Calculator
  const handleCalculateTrip = () => {
    if (!navigator.geolocation) {
      setTripInfo({ big: 'Location not supported', small: 'Your browser does not support geolocation.', err: true });
      return;
    }
    setTripLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTripLoading(false);
        const { latitude, longitude } = pos.coords;
        const R = 6371; // Earth's radius in km
        const dLat = ((wedding.venue.lat - latitude) * Math.PI) / 180;
        const dLon = ((wedding.venue.lon - longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((latitude * Math.PI) / 180) *
            Math.cos((wedding.venue.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const straightDist = R * c;
        const roadDist = Math.round(straightDist * 1.3); // Driving approximation multiplier
        const driveMinutes = Math.round((roadDist / 42) * 60); // Average driving speed
        const hrs = Math.floor(driveMinutes / 60);
        const mins = driveMinutes % 60;
        const timeStr = hrs > 0 ? `${hrs} hr ${mins} min` : `${mins} min`;

        setTripInfo({
          big: `About ${roadDist} km away`,
          small: `Approx. ${timeStr} drive without heavy traffic`,
        });
      },
      () => {
        setTripLoading(false);
        setTripInfo({
          big: 'Location permission denied',
          small: 'Please allow location access to calculate driving distance.',
          err: true,
        });
      },
      { timeout: 10000 }
    );
  };

  // 5. ICS Calendar File Download
  const handleDownloadIcs = () => {
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Wedding//Aneesh & Haseena//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:aneesh-haseena-20261220@wedding.in',
      'DTSTART:20261220T053000Z',
      'DTEND:20261220T093000Z',
      `SUMMARY:${wedding.groom.name} & ${wedding.bride.name} · Wedding Ceremony & Reception`,
      `DESCRIPTION:With the blessings of Allah Almighty — the wedding of ${wedding.groom.name} with ${wedding.bride.name} at ${wedding.venue.name}, ${wedding.venue.location}.`,
      `LOCATION:${wedding.venue.name}, ${wedding.venue.location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${wedding.groom.name}-${wedding.bride.name}-Wedding.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 6. Share Invitation
  const handleShare = async () => {
    const shareData = {
      title: `${wedding.groom.name} & ${wedding.bride.name} · Wedding Invitation`,
      text: `With the blessings of Allah Almighty — you are warmly invited to the wedding of ${wedding.groom.name} with ${wedding.bride.name} on Sunday, 20 December 2026 at ${wedding.venue.name}, ${wedding.venue.location}. Tap to open and unwrap!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Invitation link copied to clipboard!');
    }
  };

  const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(wedding.venue.mapsQuery)}`;
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `Wedding of ${wedding.groom.name} with ${wedding.bride.name}`
  )}&dates=20261220T053000Z/20261220T093000Z&details=${encodeURIComponent(
    `With the blessings of Allah Almighty — the wedding of ${wedding.groom.name} with ${wedding.bride.name} at ${wedding.venue.name}, ${wedding.venue.location}.`
  )}&location=${encodeURIComponent(wedding.venue.mapsQuery)}`;

  return (
    <main ref={detailsRef} className={styles.details} id="details">
      {greeting && (
        <p className={`${styles.greeting} ${styles.rise}`} id="greeting">
          {greeting}
        </p>
      )}

      {/* 1. Family Section */}
      <section className={styles.rise} aria-labelledby="famTitle">
        <p className={styles.eyebrow}>With the blessings of</p>
        <h2 id="famTitle">Our families</h2>
        <SprigRule />
        <div className={styles.families}>
          <div className={styles.fam}>
            <strong>{wedding.groom.parents}</strong>
            <span>{wedding.groom.house}</span>
          </div>
          <div className={styles.amp} aria-hidden="true">
            &amp;
          </div>
          <div className={styles.fam}>
            <strong>{wedding.bride.parents}</strong>
            <span>{wedding.bride.house}</span>
          </div>
        </div>
        <p>
          cordially invite you and your family to the wedding of their beloved children, {wedding.groom.name} &amp; {wedding.bride.name}.
        </p>
      </section>

      {/* 2. Dua Section */}
      <section className={styles.rise} aria-labelledby="duaTitle">
        <p className={styles.eyebrow}>A prayer for the couple</p>
        <h2 id="duaTitle">Our dua</h2>
        <SprigRule />
        <p className={styles.duaAr} lang="ar" dir="rtl">
          {wedding.dua.arabic}
        </p>
        <p className={styles.duaTr}>{wedding.dua.transliteration}</p>
        <p className={styles.duaEn}>{wedding.dua.translation}</p>
      </section>

      {/* 3. Order of the Day / Timeline */}
      <section className={styles.rise} aria-labelledby="dayTitle">
        <p className={styles.eyebrow}>Sunday · 20 December 2026</p>
        <h2 id="dayTitle">Order of the day</h2>
        <SprigRule />
        <ol className={styles.timeline}>
          {wedding.timeline.map((item, idx) => (
            <li key={idx}>
              <span className={styles.tlTime}>{item.time}</span>
              <strong>{item.title}</strong>
              <span className={styles.tlPlace}>{item.place}</span>
              {item.mapUrl && (
                <a className={`${styles.btn} ${styles.primary}`} href={item.mapUrl} target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                    <circle cx="12" cy="10" r="2.3" />
                  </svg>
                  Directions
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* 4. Countdown Flip Clock */}
      <section className={styles.rise} aria-labelledby="cdTitle">
        <p className={styles.eyebrow}>Sunday · 20 December 2026</p>
        <h2 id="cdTitle">Counting the days</h2>
        <SprigRule />
        <div className={styles.countdown} id="countdown" role="timer" aria-live="off" aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours and ${timeLeft.minutes} minutes to go`}>
          <div>
            <b id="cdD">
              <span className={`${styles.half} ${styles.top}`}>
                <i>{timeLeft.days}</i>
              </span>
              <span className={`${styles.half} ${styles.bottom}`}>
                <i>{timeLeft.days}</i>
              </span>
            </b>
            <span>Days</span>
          </div>
          <div>
            <b id="cdH">
              <span className={`${styles.half} ${styles.top}`}>
                <i>{timeLeft.hours}</i>
              </span>
              <span className={`${styles.half} ${styles.bottom}`}>
                <i>{timeLeft.hours}</i>
              </span>
            </b>
            <span>Hours</span>
          </div>
          <div>
            <b id="cdM">
              <span className={`${styles.half} ${styles.top}`}>
                <i>{timeLeft.minutes}</i>
              </span>
              <span className={`${styles.half} ${styles.bottom}`}>
                <i>{timeLeft.minutes}</i>
              </span>
            </b>
            <span>Minutes</span>
          </div>
          <div>
            <b id="cdS" className={isFlippingS ? styles.flipping : ''}>
              <span className={`${styles.half} ${styles.top}`}>
                <i>{timeLeft.seconds}</i>
              </span>
              <span className={`${styles.half} ${styles.bottom}`}>
                <i>{prevSeconds}</i>
              </span>
              <span className={`${styles.half} ${styles.top} ${styles.flipTop}`}>
                <i>{prevSeconds}</i>
              </span>
              <span className={`${styles.half} ${styles.bottom} ${styles.flipBottom}`}>
                <i>{timeLeft.seconds}</i>
              </span>
            </b>
            <span>Seconds</span>
          </div>
        </div>
      </section>

      {/* 5. Reply / RSVP Section */}
      <section className={styles.rise} aria-labelledby="replyTitle">
        <p className={styles.eyebrow}>Your reply</p>
        <h2 id="replyTitle">Will you join us?</h2>
        <SprigRule />
        <p className={styles.replyStatus}>
          {rsvpStatus ? (
            rsvpStatus.answer === 'yes' ? (
              <>
                You're attending with <b>{rsvpStatus.count} {rsvpStatus.count === 1 ? 'guest' : 'guests'}</b>.
              </>
            ) : (
              'You sent your regrets. We will miss you!'
            )
          ) : (
            'Please let the family know if you can come.'
          )}
        </p>
        {rsvpStatus && (
          <span className={`${styles.replyBadge} ${rsvpStatus.answer === 'no' ? styles.no : ''}`}>
            <i />
            <span>{rsvpStatus.answer === 'yes' ? 'Attending' : 'Not Attending'}</span>
          </span>
        )}
        <div className={styles.btns}>
          <button type="button" className={`${styles.btn} ${styles.primary}`} id="replyBtn" onClick={onOpenRsvp}>
            {rsvpStatus ? 'Change reply' : 'Reply now'}
          </button>
        </div>
      </section>

      {/* 6. Calendar Export */}
      <section className={styles.rise} aria-labelledby="calTitle">
        <p className={styles.eyebrow}>Save the date</p>
        <h2 id="calTitle">Add it to your calendar</h2>
        <SprigRule />
        <p>Ceremony &amp; Feast · 11:30 AM onwards</p>
        <div className={styles.btns}>
          <a className={`${styles.btn} ${styles.primary}`} id="gcalBtn" href={gcalUrl} target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 9.5h17M8 3v4M16 3v4" />
            </svg>
            Google Calendar
          </a>
          <button type="button" className={styles.btn} id="icsBtn" onClick={handleDownloadIcs}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />
            </svg>
            Apple / Outlook
          </button>
        </div>
      </section>

      {/* 7. Venue Section */}
      <section className={styles.rise} aria-labelledby="venueTitle">
        <p className={styles.eyebrow}>The venue</p>
        <h2 id="venueTitle">Where to find us</h2>
        <SprigRule />
        <div className={styles.venueCard}>
          <iframe
            id="venueMap"
            title={`Map showing ${wedding.venue.name}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(wedding.venue.mapsQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className={styles.addr}>
            <strong>{wedding.venue.name}</strong>
            <span>{wedding.venue.location}</span>
            <div className={styles.btns}>
              <a className={`${styles.btn} ${styles.primary}`} id="venueDirBtn" href={mapSearchUrl} target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                Get directions
              </a>
              <button type="button" className={styles.btn} id="tripBtn" onClick={handleCalculateTrip} disabled={tripLoading}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
                  <circle cx="12" cy="12" r="7" />
                </svg>
                {tripLoading ? 'Locating...' : 'How far am I?'}
              </button>
            </div>
            {tripInfo && (
              <div className={styles.trip} id="trip" role="status">
                <div className={`${styles.big} ${tripInfo.err ? styles.msgErr : ''}`}>{tripInfo.big}</div>
                <div className={styles.small}>{tripInfo.small}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. Contact Section & Compliments */}
      <section className={styles.rise} aria-labelledby="ctTitle">
        <p className={styles.eyebrow}>Questions &amp; Enquiries</p>
        <h2 id="ctTitle">Get in touch</h2>
        <SprigRule />
        <p style={{ fontStyle: 'italic', color: 'var(--ink-secondary)', marginBottom: '0.8rem' }}>
          {wedding.messages.compliments.label} <strong>{wedding.messages.compliments.names}</strong>
        </p>
        <p>{wedding.contacts[0].phone}</p>
        <div className={styles.btns}>
          <a className={`${styles.btn} ${styles.primary}`} id="callBtn" href={`tel:${wedding.contacts[0].phone}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6.5 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z" />
            </svg>
            Call
          </a>
          <a
            className={styles.btn}
            id="waBtn"
            href={`https://wa.me/919895603210?text=${encodeURIComponent("Assalamu alaikum! About Aneesh & Haseena's wedding - ")}`}
            target="_blank"
            rel="noopener"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20l1.2-3.8A8.5 8.5 0 1 1 8 19z" />
              <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-1.8-1-1 .8a4 4 0 0 1-2-2l.8-1-1-1.8z" />
            </svg>
            WhatsApp
          </a>
        </div>
        <div className={styles.btns}>
          <button type="button" className={styles.btn} id="shareBtn" onClick={handleShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5.5" r="2.5" />
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="18" cy="18.5" r="2.5" />
              <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
            </svg>
            Share invitation
          </button>
        </div>
      </section>

      {/* 9. Signoff & Wax Seal Stamp */}
      <p className={`${styles.sign} ${styles.rise}`}>With love, {wedding.groom.name} &amp; {wedding.bride.name}</p>
      <div ref={endSealRef} className={styles.endSeal} id="endSeal" aria-hidden="true">
        {wedding.monogram[0]}&amp;{wedding.monogram[1]}
      </div>
      <p className={styles.credit}>With blessings &amp; love · Aneesh &amp; Haseena · 2026</p>
    </main>
  );
}
