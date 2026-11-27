import { MAX_AVOID_IDS } from '@pq/shared';
import { describe, expect, it } from 'vitest';
import { mergeRecent, parseRecent } from '../quiz/recent-questions';
import { DEFAULT_ROUND_SETTINGS, isStandard, parseRoundSettings } from './round-settings';

describe('parseRoundSettings', () => {
  it('uses the defaults when nothing or garbage is stored', () => {
    expect(parseRoundSettings(null)).toEqual(DEFAULT_ROUND_SETTINGS);
    expect(parseRoundSettings('{not json')).toEqual(DEFAULT_ROUND_SETTINGS);
  });

  it('keeps valid fields and resets only the invalid ones', () => {
    expect(
      parseRoundSettings(JSON.stringify({ region: 'PL', difficulty: 'insane', questionCount: 30 })),
    ).toEqual({ region: 'PL', difficulty: 'mixed', questionCount: 30 });
  });

  it('treats only 10 mixed questions as a standard (ranked) round', () => {
    expect(isStandard(DEFAULT_ROUND_SETTINGS)).toBe(true);
    expect(isStandard({ ...DEFAULT_ROUND_SETTINGS, difficulty: 'easy' })).toBe(false);
    expect(isStandard({ ...DEFAULT_ROUND_SETTINGS, questionCount: 20 })).toBe(false);
  });
});

describe('recently played questions', () => {
  it('puts the newest first without duplicates', () => {
    expect(mergeRecent(['a', 'b', 'c'], ['c', 'd'])).toEqual(['c', 'd', 'a', 'b']);
  });

  it('keeps at most what the API accepts', () => {
    const old = Array.from({ length: MAX_AVOID_IDS }, (_, i) => `old-${i}`);

    const merged = mergeRecent(old, ['new']);

    expect(merged).toHaveLength(MAX_AVOID_IDS);
    expect(merged[0]).toBe('new');
  });

  it('ignores a broken stored value', () => {
    expect(parseRecent('{"x":1}')).toEqual([]);
    expect(parseRecent('[1,"a"]')).toEqual(['a']);
  });
});
