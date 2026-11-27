import { buildApp } from '../src/app';

/** A fresh app with its own in-memory database for every test. */
export function buildTestApp() {
  return buildApp({ dbPath: ':memory:', corsOrigins: [], logLevel: 'silent' });
}
