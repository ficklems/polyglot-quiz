import { useEffect, useRef, useState } from 'react';
import { secondsLeft } from '../quiz.utils';

/**
 * Counts down from `limitSeconds` while `running` is true and calls `onExpire` once at zero.
 * Time is read from Date.now() rather than counting ticks, so a throttled background tab
 * still shows the right value (and Playwright's clock can control it).
 * Give the component that uses it a `key` per question to restart the countdown.
 */
export function useCountdown(running: boolean, limitSeconds: number, onExpire: () => void): number {
  const [startedAt] = useState(() => Date.now());
  const [left, setLeft] = useState(limitSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
    let expired = false;

    const tick = () => {
      const remaining = secondsLeft(startedAt, Date.now(), limitSeconds);
      setLeft(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        onExpireRef.current();
      }
    };

    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, startedAt, limitSeconds]);

  return left;
}
