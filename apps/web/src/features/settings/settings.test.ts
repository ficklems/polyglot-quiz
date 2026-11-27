import { describe, expect, it } from 'vitest';
import { detectLanguage } from './language';
import { resolveInitialTheme, toggleTheme } from './theme';

describe('detectLanguage', () => {
  it('prefers a saved, supported language', () => {
    expect(detectLanguage('pl', ['uk-UA'])).toBe('pl');
  });

  it('ignores a saved value that is not supported', () => {
    expect(detectLanguage('ru', ['uk-UA'])).toBe('uk');
  });

  it('matches a browser language by its base tag', () => {
    expect(detectLanguage(null, ['de-DE', 'pl-PL', 'en-US'])).toBe('pl');
  });

  it('is case-insensitive for browser tags', () => {
    expect(detectLanguage(null, ['UK'])).toBe('uk');
  });

  it('falls back to English when nothing matches', () => {
    expect(detectLanguage(null, ['de-DE', 'fr'])).toBe('en');
    expect(detectLanguage(null, [])).toBe('en');
  });
});

describe('theme', () => {
  it('uses the saved theme over the system preference', () => {
    expect(resolveInitialTheme('light', true)).toBe('light');
    expect(resolveInitialTheme('dark', false)).toBe('dark');
  });

  it('follows the system preference when nothing valid is saved', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark');
    expect(resolveInitialTheme('purple', false)).toBe('light');
  });

  it('toggles between light and dark', () => {
    expect(toggleTheme('light')).toBe('dark');
    expect(toggleTheme('dark')).toBe('light');
  });
});
