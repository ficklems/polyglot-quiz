import { describe, expect, it } from 'vitest';
import {
  ALL_BOARDS,
  boardOfRound,
  boardQuery,
  boardValue,
  nicknameError,
  parseBoardValue,
} from './leaderboard.utils';

describe('nicknameError', () => {
  it.each(['Марія', 'Łucja_99', 'qa-tester.pl', '  Ola  '])('accepts "%s"', (value) => {
    expect(nicknameError(value)).toBeNull();
  });

  it('explains a nickname that is too short (spaces do not count)', () => {
    expect(nicknameError('')).toBe('tooShort');
    expect(nicknameError(' A ')).toBe('tooShort');
  });

  it('explains a nickname that is too long', () => {
    expect(nicknameError('x'.repeat(21))).toBe('tooLong');
  });

  it('explains characters that are not allowed', () => {
    expect(nicknameError('<b>Bold</b>')).toBe('invalid');
    expect(nicknameError('Cat 🐱')).toBe('invalid');
  });
});

describe('boards', () => {
  it('builds the query for each kind of board', () => {
    expect(boardQuery(ALL_BOARDS)).toBe('');
    expect(boardQuery({ kind: 'topic', id: 'music' })).toBe('?topicId=music');
    expect(boardQuery({ kind: 'collection', id: '2000s_kids' })).toBe('?collectionId=2000s_kids');
  });

  it('round-trips a board through its select value', () => {
    for (const board of [
      ALL_BOARDS,
      { kind: 'topic', id: 'music' },
      { kind: 'collection', id: 'pub_quiz' },
    ] as const) {
      expect(parseBoardValue(boardValue(board))).toEqual(board);
    }
    expect(parseBoardValue('nonsense')).toEqual(ALL_BOARDS);
  });

  it('puts a ranked round on its topic or themed-quiz board and a custom mix nowhere', () => {
    expect(boardOfRound({ ranked: true, topicId: 'music', collectionId: null })).toEqual({
      kind: 'topic',
      id: 'music',
    });
    expect(boardOfRound({ ranked: true, topicId: null, collectionId: 'pub_quiz' })).toEqual({
      kind: 'collection',
      id: 'pub_quiz',
    });
    expect(boardOfRound({ ranked: false, topicId: null, collectionId: null })).toBeNull();
  });
});
