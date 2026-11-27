import { MAX_AVOID_IDS } from '@pq/shared';
import { readStored, writeStored } from '../../shared/storage';

export const RECENT_STORAGE_KEY = 'pq.recentQuestions';

/** Newest first, without duplicates, capped at what the API accepts. */
export function mergeRecent(previous: readonly string[], played: readonly string[]): string[] {
  const merged = [...played, ...previous.filter((id) => !played.includes(id))];
  return merged.slice(0, MAX_AVOID_IDS);
}

export function parseRecent(stored: string | null): string[] {
  try {
    const value: unknown = JSON.parse(stored ?? '[]');
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string').slice(0, MAX_AVOID_IDS)
      : [];
  } catch {
    return [];
  }
}

export function readRecent(): string[] {
  return parseRecent(readStored(RECENT_STORAGE_KEY));
}

export function rememberPlayed(ids: readonly string[]): void {
  writeStored(RECENT_STORAGE_KEY, JSON.stringify(mergeRecent(readRecent(), ids)));
}
