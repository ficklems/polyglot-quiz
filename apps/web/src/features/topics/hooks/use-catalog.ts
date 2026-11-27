import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_REGION,
  type CatalogQuery,
  type CatalogResponse,
  type Language,
} from '@pq/shared';
import { fetchCatalog } from '../api/fetch-catalog';

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; catalog: CatalogResponse };

type Result = { key: string } & (
  { status: 'error' } | { status: 'success'; catalog: CatalogResponse }
);

/** Categories, subcategories and themed quizzes, counted under the round settings. */
export function useCatalog(
  lang: Language,
  region: CatalogQuery['region'] = DEFAULT_REGION,
  difficulty: CatalogQuery['difficulty'] = DEFAULT_DIFFICULTY,
) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${lang}:${region}:${difficulty}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();

    fetchCatalog({ lang, region, difficulty }, controller.signal)
      .then((catalog) => setResult({ key, status: 'success', catalog }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setResult({ key, status: 'error' });
      });

    return () => controller.abort();
  }, [lang, region, difficulty, key]);

  // A result for an older request (previous language or attempt) means we are loading again.
  const state: State =
    result && result.key === key
      ? result.status === 'success'
        ? { status: 'success', catalog: result.catalog }
        : { status: 'error' }
      : { status: 'loading' };

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
