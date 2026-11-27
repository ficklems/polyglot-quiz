import { DEFAULT_LANGUAGE, isLanguage, type Language } from '@pq/shared';

export const LANGUAGE_STORAGE_KEY = 'pq.lang';

/**
 * Picks the UI language: a saved choice wins, then the first supported browser
 * language ("pl-PL" → "pl"), then the default.
 */
export function detectLanguage(
  stored: string | null,
  browserLanguages: readonly string[],
): Language {
  if (isLanguage(stored)) return stored;

  for (const tag of browserLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
