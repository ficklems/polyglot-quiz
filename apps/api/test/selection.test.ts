import { describe, expect, it } from 'vitest';
import type { Collection } from '@pq/shared';
import { createRng } from '../src/lib/random';
import {
  balancedPick,
  collectionPlan,
  decadeOf,
  matchesCollection,
  matchesRule,
  matchesSelection,
  pickQuestions,
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

function collection(rules: Collection['rules'], settings: Collection['settings'] = {}): Collection {
  return {
    id: 'test',
    name: { uk: 'Тест', en: 'Test', pl: 'Test' },
    rules,
    settings,
    minimumUniqueQuestions: 10,
  };
}

describe('collection rules', () => {
  it('matches when every field of a rule matches (AND within a rule)', () => {
    const rule = { categories: ['music'], anyTags: ['eurovision'] };

    expect(matchesRule(q({ tags: ['eurovision'] }), rule)).toBe(true);
    expect(matchesRule(q({ tags: [] }), rule)).toBe(false);
    expect(matchesRule(q({ category: 'history', tags: ['eurovision'] }), rule)).toBe(false);
  });

  it('matches when any rule matches (OR across rules)', () => {
    const c = collection([{ anyTags: ['memes'] }, { categories: ['memes'] }]);

    expect(matchesCollection(q({ tags: ['memes'] }), c)).toBe(true);
    expect(matchesCollection(q({ category: 'memes' }), c)).toBe(true);
    expect(matchesCollection(q(), c)).toBe(false);
  });

  it('an empty rule matches everything (Pub Quiz, Millionaire)', () => {
    expect(matchesCollection(q(), collection([{}]))).toBe(true);
  });

  it('filters by type, region and difficulty', () => {
    expect(matchesRule(q({ type: 'order' }), { types: ['order'] })).toBe(true);
    expect(matchesRule(q({ region: 'UA' }), { regions: ['PL'] })).toBe(false);
    expect(matchesRule(q({ difficulty: 'easy' }), { difficulties: ['easy'] })).toBe(true);
  });
});

describe('matchesSelection', () => {
  it('is the union of whole categories and single subcategories', () => {
    const selection = { categories: ['history'], subcategories: ['music/rock'] };

    expect(matchesSelection(q({ category: 'history', subcategory: 'any' }), selection)).toBe(true);
    expect(matchesSelection(q({ category: 'music', subcategory: 'rock' }), selection)).toBe(true);
    expect(matchesSelection(q({ category: 'music', subcategory: 'jazz' }), selection)).toBe(false);
  });
});

describe('balancedPick', () => {
  it('gives a small group the same share as a huge one', () => {
    const items = [
      ...Array.from({ length: 1000 }, () => q({ category: 'music' })),
      ...Array.from({ length: 20 }, () => q({ category: 'memes' })),
    ];

    const picked = balancedPick(items, (x) => x.category, 10, createRng(1));

    expect(picked.filter((x) => x.category === 'memes')).toHaveLength(5);
    expect(picked.filter((x) => x.category === 'music')).toHaveLength(5);
  });

  it('redistributes to other groups once a group is exhausted', () => {
    const items = [
      ...Array.from({ length: 2 }, () => q({ category: 'memes' })),
      ...Array.from({ length: 50 }, () => q({ category: 'music' })),
    ];

    const picked = balancedPick(items, (x) => x.category, 10, createRng(2));

    expect(picked).toHaveLength(10);
    expect(picked.filter((x) => x.category === 'memes')).toHaveLength(2);
  });

  it('never repeats an item and returns fewer when the pool is smaller', () => {
    const items = Array.from({ length: 4 }, () => q());

    const picked = balancedPick(items, (x) => x.category, 10, createRng(3));

    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((x) => x.id)).size).toBe(4);
  });

  it('is deterministic for a seed', () => {
    const items = Array.from({ length: 30 }, (_, i) => q({ category: `c${i % 3}` }));

    expect(balancedPick(items, (x) => x.category, 9, createRng(4))).toEqual(
      balancedPick(items, (x) => x.category, 9, createRng(4)),
    );
  });
});

describe('pickQuestions', () => {
  it('balances by decade tag for Battle of Generations', () => {
    const items = [
      ...Array.from({ length: 100 }, () => q({ tags: ['1980s'] })),
      ...Array.from({ length: 100 }, () => q({ tags: ['2010s'] })),
    ];

    const picked = pickQuestions(items, { count: 10, balanceBy: 'decade' }, createRng(5));

    expect(picked.filter((x) => decadeOf(x) === '2010s')).toHaveLength(5);
  });

  it('orders a difficulty sequence easy → medium → hard with equal shares', () => {
    const items = (['easy', 'medium', 'hard'] as const).flatMap((difficulty) =>
      Array.from({ length: 20 }, () => q({ difficulty })),
    );

    const picked = pickQuestions(
      items,
      { count: 15, balanceBy: 'category', difficultySequence: ['easy', 'medium', 'hard'] },
      createRng(6),
    );

    expect(picked.map((x) => x.difficulty)).toEqual([
      ...Array(5).fill('easy'),
      ...Array(5).fill('medium'),
      ...Array(5).fill('hard'),
    ]);
  });

  it('fills a step that is short from the rest of the pool and keeps the ascending order', () => {
    const items = [
      q({ difficulty: 'easy' }),
      ...Array.from({ length: 30 }, () => q({ difficulty: 'medium' })),
      q({ difficulty: 'hard' }),
    ];

    const picked = pickQuestions(
      items,
      { count: 15, balanceBy: 'category', difficultySequence: ['easy', 'medium', 'hard'] },
      createRng(7),
    );

    expect(picked).toHaveLength(15);
    expect(picked[0]?.difficulty).toBe('easy');
    expect(picked.at(-1)?.difficulty).toBe('hard');
    const ranks = picked.map((x) => ['easy', 'medium', 'hard'].indexOf(x.difficulty));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe('collectionPlan', () => {
  it('uses the collection settings and falls back to category balance and the default count', () => {
    expect(collectionPlan(collection([{}]), 10)).toEqual({ count: 10, balanceBy: 'category' });
    expect(
      collectionPlan(
        collection([{}], { questionCount: 15, difficultySequence: ['easy', 'hard'] }),
        10,
      ),
    ).toEqual({ count: 15, balanceBy: 'category', difficultySequence: ['easy', 'hard'] });
  });
});
