import { useEffect, useState } from 'react';
import { COUNTDOWN_TICK_MS } from '../constants/motion';
import { getTimeRemaining, type TimeRemaining } from '../lib/countdown';

export function useCountdown(targetIso: string): TimeRemaining {
  const targetMs = new Date(targetIso).getTime();
  const [now, setNow] = useState(() => Date.now());
  const isComplete = now >= targetMs;

  useEffect(() => {
    if (isComplete) return;
    const id = window.setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => window.clearInterval(id);
  }, [isComplete]);

  return getTimeRemaining(targetMs, now);
}
