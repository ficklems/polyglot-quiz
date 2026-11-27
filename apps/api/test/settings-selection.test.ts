import { describe, expect, it } from 'vitest';
import { MIXED_DIFFICULTY_TARGET, resolveRegion } from '@pq/shared';
import { createRng } from '../src/lib/random';
import {
  effectiveRegion,
  matchesSettings,
  pickQuestions,
  quotaPick,
  settingsShares,
  weightedInterleave,
  type QuestionMeta,
} from '../src/content/selection';

let n = 0;
function q(overrides: Partial<QuestionMeta> = {}): QuestionMeta {
  n += 1;
  return {
    id: `Q-${n}`,
    category: 'music',
    subcategory: 'rock',
    type: 'multiple_choice',
    region: 'global',
    difficulty: 'medium',
    tags: [],
    ...overrides,
  };
}

function many(count: number, overrides: Partial<QuestionMeta>): QuestionMeta[] {
  return Array.from({ length: count }, () => q(overrides));
}

const countBy = (items: QuestionMeta[], key: (q: QuestionMeta) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    acc[key(item)] = (acc[key(item)] ?? 0) + 1;
    return acc;
  }, {});

describe('region settings', () => {
  it('"auto" follows the language', () => {
    expect(resolveRegion('auto', 'uk')).toBe('UA');
    expect(resolveRegion('auto', 'pl')).toBe('PL');
    expect(resolveRegion('auto', 'en')).toBe('EN');
    expect(resolveRegion('CE', 'uk')).toBe('CE');
  });

  it('a named region keeps its own and global questions, not other regions', () => {
    const filter = { region: 'UA', difficulty: 'mixed' } as const;

    expect(matchesSettings(q({ region: 'UA' }), filter)).toBe(true);
    expect(matchesSettings(q({ region: 'global' }), filter)).toBe(true);
    expect(matchesSettings(q({ region: 'PL' }), filter)).toBe(false);
  });

  it('"global" keeps only international questions and "all" keeps everything', () => {
    expect(matchesSettings(q({ region: 'EN' }), { region: 'global', difficulty: 'mixed' })).toBe(
      false,
    );
    expect(matchesSettings(q({ region: 'EN' }), { region: 'all', difficulty: 'mixed' })).toBe(true);
  });

  it('a strict quiz keeps only the region, and falls back to the language region', () => {
    const filter = { region: 'PL', difficulty: 'mixed', strictRegion: true } as const;

    expect(matchesSettings(q({ region: 'global' }), filter)).toBe(false);
    expect(matchesSettings(q({ region: 'PL' }), filter)).toBe(true);
    expect(effectiveRegion('all', 'pl', true)).toBe('PL');
    expect(effectiveRegion('global', 'uk', true)).toBe('UA');
    expect(effectiveRegion('all', 'pl', false)).toBe('all');
  });
});

describe('difficulty settings', () => {
  it('a level keeps only that level; Mixed keeps all', () => {
    expect(matchesSettings(q({ difficulty: 'hard' }), { region: 'all', difficulty: 'easy' })).toBe(
      false,
    );
    expect(matchesSettings(q({ difficulty: 'hard' }), { region: 'all', difficulty: 'mixed' })).toBe(
      true,
    );
  });

  it("a quiz with its own sequence ignores the player's level", () => {
    expect(
      matchesSettings(q({ difficulty: 'hard' }), {
        region: 'all',
        difficulty: 'easy',
        ownDifficulty: true,
      }),
    ).toBe(true);
  });

  it('asks for a region mix only for a named region and a difficulty mix only for Mixed', () => {
    expect(settingsShares({ region: 'UA', difficulty: 'mixed' })).toEqual({
      regionShares: { UA: 0.35, global: 0.65 },
      difficultyShares: MIXED_DIFFICULTY_TARGET,
    });
    expect(settingsShares({ region: 'all', difficulty: 'hard' })).toEqual({});
    expect(settingsShares({ region: 'PL', difficulty: 'mixed', strictRegion: true })).toEqual({
      difficultyShares: MIXED_DIFFICULTY_TARGET,
    });
  });
});

describe('quotaPick', () => {
  const take = (items: readonly QuestionMeta[], k: number) => items.slice(0, k);

  it('splits the count by shares with the largest remainder', () => {
    const pool = [...many(20, { region: 'UA' }), ...many(20, { region: 'global' })];

    const picked = quotaPick(pool, (x) => x.region, { UA: 0.35, global: 0.65 }, 10, take);

    expect(countBy(picked, (x) => x.region)).toEqual({ UA: 4, global: 6 });
  });

  it('fills a short bucket from the rest instead of shrinking the round', () => {
    const pool = [...many(1, { region: 'UA' }), ...many(20, { region: 'global' })];

    const picked = quotaPick(pool, (x) => x.region, { UA: 0.35, global: 0.65 }, 10, take);

    expect(picked).toHaveLength(10);
    expect(countBy(picked, (x) => x.region)).toEqual({ UA: 1, global: 9 });
  });
});

describe('weightedInterleave', () => {
  it('keeps every prefix close to the shares', () => {
    const items = [
      ...many(10, { difficulty: 'easy' }),
      ...many(10, { difficulty: 'medium' }),
      ...many(10, { difficulty: 'hard' }),
    ];

    const ordered = weightedInterleave(items, (x) => x.difficulty, MIXED_DIFFICULTY_TARGET);

    expect(countBy(ordered.slice(0, 5), (x) => x.difficulty)).toEqual({
      easy: 2,
      medium: 2,
      hard: 1,
    });
    expect(ordered).toHaveLength(30);
  });
});

describe('pickQuestions with settings', () => {
  it('aims for 35% regional questions in a named region', () => {
    const pool = [...many(50, { region: 'PL' }), ...many(50, { region: 'global' })];

    const picked = pickQuestions(
      pool,
      { count: 20, balanceBy: 'category', regionShares: { PL: 0.35, global: 0.65 } },
      createRng(1),
    );

    expect(countBy(picked, (x) => x.region)).toEqual({ PL: 7, global: 13 });
  });

  it('mixes 40/40/20 difficulty without breaking equal category shares', () => {
    const pool = ['music', 'science'].flatMap((category) => [
      ...many(10, { category, difficulty: 'easy' }),
      ...many(10, { category, difficulty: 'medium' }),
      ...many(10, { category, difficulty: 'hard' }),
    ]);

    const picked = pickQuestions(
      pool,
      { count: 10, balanceBy: 'category', difficultyShares: MIXED_DIFFICULTY_TARGET },
      createRng(7),
    );

    expect(countBy(picked, (x) => x.category)).toEqual({ music: 5, science: 5 });
    expect(countBy(picked, (x) => x.difficulty)).toEqual({ easy: 4, medium: 4, hard: 2 });
  });

  it('uses the pool honestly when a level is missing (96% of the dataset is medium)', () => {
    const pool = many(30, { difficulty: 'medium' });

    const picked = pickQuestions(
      pool,
      { count: 10, balanceBy: 'category', difficultyShares: MIXED_DIFFICULTY_TARGET },
      createRng(3),
    );

    expect(picked).toHaveLength(10);
  });
});
