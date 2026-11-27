import { useCallback, useEffect, useState } from 'react';
import type { Language, Topic } from '@pq/shared';
import { fetchTopics } from '../api/fetch-topics';

type State = { status: 'loading' } | { status: 'error' } | { status: 'success'; topics: Topic[] };

type Result = { key: string } & ({ status: 'error' } | { status: 'success'; topics: Topic[] });

export function useTopics(lang: Language) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${lang}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchTopics(lang, controller.signal)
      .then((topics) => setResult({ key, status: 'success', topics }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setResult({ key, status: 'error' });
      });

    return () => controller.abort();
  }, [lang, key]);

  // A result for an older request (previous language or attempt) means we are loading again.
  const state: State =
    result && result.key === key
      ? result.status === 'success'
        ? { status: 'success', topics: result.topics }
        : { status: 'error' }
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
