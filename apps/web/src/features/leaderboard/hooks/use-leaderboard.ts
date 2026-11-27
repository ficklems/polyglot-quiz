import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@pq/shared';
import { fetchLeaderboard } from '../api/leaderboard-api';
import { boardValue, type Board } from '../leaderboard.utils';

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; entries: LeaderboardEntry[] };

type Result = { key: string } & (
  { status: 'error' } | { status: 'success'; entries: LeaderboardEntry[] }
);

/** Top entries of a board. Change `version` to reload. */
export function useLeaderboard(board: Board, version = 0) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const boardKey = boardValue(board);
  const key = `${boardKey}:${version}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchLeaderboard(board, controller.signal)
      .then((res) => setResult({ key, status: 'success', entries: res.entries }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setResult({ key, status: 'error' });
      });

    return () => controller.abort();
    // board is captured through boardKey, which is part of key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const state: State =
    result && result.key === key
      ? result.status === 'success'
        ? { status: 'success', entries: result.entries }
        : { status: 'error' }
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
