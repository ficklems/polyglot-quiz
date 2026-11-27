import type { AnswerResult } from '@pq/shared';
import { describe, expect, it } from 'vitest';
import { optionState, optionText, secondsLeft } from './quiz.utils';

describe('secondsLeft', () => {
  const start = 1_000_000;

  it('shows the full limit at the start', () => {
    expect(secondsLeft(start, start, 20)).toBe(20);
  });

  it('rounds up partial seconds', () => {
    expect(secondsLeft(start, start + 100, 20)).toBe(20);
    expect(secondsLeft(start, start + 1000, 20)).toBe(19);
    expect(secondsLeft(start, start + 19_001, 20)).toBe(1);
  });

  it('hits zero exactly at the limit and never goes negative', () => {
    expect(secondsLeft(start, start + 20_000, 20)).toBe(0);
    expect(secondsLeft(start, start + 99_000, 20)).toBe(0);
  });
});

describe('optionState', () => {
  const result = { correctOptionId: 'c' } as AnswerResult;

  it('is idle before the answer is known', () => {
    expect(optionState('a', 'a', null)).toBe('idle');
  });

  it('marks the correct option even when the player picked another one', () => {
    expect(optionState('c', 'a', result)).toBe('correct');
  });

  it('marks the wrong pick and dims the rest', () => {
    expect(optionState('a', 'a', result)).toBe('wrong');
    expect(optionState('b', 'a', result)).toBe('dimmed');
  });

  it('after a time-out only the correct option is highlighted', () => {
    expect(['a', 'b', 'c', 'd'].map((id) => optionState(id as 'a', null, result))).toEqual([
      'dimmed',
      'dimmed',
      'correct',
      'dimmed',
    ]);
  });
});

describe('optionText', () => {
  it('finds an option by id', () => {
    const question = {
      id: 'general-01',
      text: 'Q',
      options: [
        { id: 'b' as const, text: 'Bee' },
        { id: 'a' as const, text: 'Ay' },
      ],
    };

    expect(optionText(question as never, 'a')).toBe('Ay');
  });
});
