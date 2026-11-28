import { useCallback, useEffect, useState } from 'react';
import type { OverallPlayer } from '@pq/shared';
import { fetchOverall } from '../api/leaderboard-api';

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; players: OverallPlayer[] };

type Result = { key: string } & (
  { status: 'error' } | { status: 'success'; players: OverallPlayer[] }
);

/** The overall ranking of players across all boards. Only fetched while `enabled`. */
export function useOverall(enabled: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `overall:${attempt}`;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetchOverall(controller.signal)
      .then((res) => setResult({ key, status: 'success', players: res.players }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setResult({ key, status: 'error' });
      });
    return () => controller.abort();
  }, [enabled, key]);

  const state: State =
    result && result.key === key
      ? result.status === 'success'
        ? { status: 'success', players: result.players }
        : { status: 'error' }
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
