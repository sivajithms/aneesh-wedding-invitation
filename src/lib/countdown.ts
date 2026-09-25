const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

export function getTimeRemaining(targetMs: number, nowMs: number): TimeRemaining {
  const diff = Math.max(0, targetMs - nowMs);
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
    isComplete: diff === 0,
  };
}
