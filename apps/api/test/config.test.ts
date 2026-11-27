import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('uses safe defaults when no variables are set', () => {
    const config = loadConfig({});

    expect(config.port).toBe(3000);
    expect(config.dbPath).toBe('./data/quiz.db');
  });

  it('splits and trims CORS origins', () => {
    const config = loadConfig({ CORS_ORIGINS: ' http://a.test , http://b.test ,' });

    expect(config.corsOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('fails fast on an invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
  });
});
