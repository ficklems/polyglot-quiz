import { describe, expect, it } from 'vitest';
import { nicknameError } from './leaderboard.utils';

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
