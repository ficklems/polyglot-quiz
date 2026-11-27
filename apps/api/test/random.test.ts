import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from '../src/lib/random';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);

    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('returns numbers in [0, 1)', () => {
    const rng = createRng(9);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const items = Array.from({ length: 15 }, (_, i) => i);

  it('returns a permutation of the input', () => {
    expect([...shuffle(items, createRng(1))].sort((x, y) => x - y)).toEqual(items);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    shuffle(items, createRng(2));

    expect(items).toEqual(copy);
  });

  it('is deterministic for a seed and varies across seeds', () => {
    expect(shuffle(items, createRng(5))).toEqual(shuffle(items, createRng(5)));
    expect(shuffle(items, createRng(5))).not.toEqual(shuffle(items, createRng(6)));
  });

  it('puts every item in the first position over many seeds (no obvious bias)', () => {
    const firsts = new Set<number>();
    for (let seed = 0; seed < 500; seed++) firsts.add(shuffle(items, createRng(seed))[0]!);

    expect(firsts.size).toBe(items.length);
  });
});
