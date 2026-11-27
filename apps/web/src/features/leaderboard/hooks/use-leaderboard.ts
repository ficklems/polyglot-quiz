import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@pq/shared';
import { fetchLeaderboard } from '../api/leaderboard-api';

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; entries: LeaderboardEntry[] };

type Result = { key: string } & (
  { status: 'error' } | { status: 'success'; entries: LeaderboardEntry[] }
);

/** Top entries for a topic (null = all topics). Change `version` to reload. */
export function useLeaderboard(topicId: string | null, version = 0) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${topicId ?? '*'}:${version}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchLeaderboard(topicId, controller.signal)
      .then((res) => setResult({ key, status: 'success', entries: res.entries }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setResult({ key, status: 'error' });
      });

    return () => controller.abort();
  }, [topicId, key]);

  const state: State =
    result && result.key === key
      ? result.status === 'success'
        ? { status: 'success', entries: result.entries }
        : { status: 'error' }
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
