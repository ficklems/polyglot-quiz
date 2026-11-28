import type { LeaderboardEntry } from '@pq/shared';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Database } from '../src/db/database';
import { PostgresLeaderboardStore } from '../src/leaderboard-store/postgres-store';
import { SqliteLeaderboardStore } from '../src/leaderboard-store/sqlite-store';
import type { LeaderboardStore, NewEntry } from '../src/leaderboard-store/store';
import { buildTestApp, FIXTURE, playRound, submitScore } from './helpers';

/*
 * One contract, two stores: the SQLite store used locally and in tests, and the Postgres
 * store used in production. Postgres runs when TEST_DATABASE_URL is set (CI starts a
 * Postgres service; locally: any empty database you can throw away).
 */
const PG_URL = process.env.TEST_DATABASE_URL;

type Harness = {
  store: LeaderboardStore;
  /** SQLite keeps a foreign key to rounds; Postgres doesn't (rounds aren't there). */
  prepareRound: (roundId: string) => void;
  dispose: () => Promise<void>;
};

async function sqliteHarness(): Promise<Harness> {
  const db: Database = openDatabase(':memory:', FIXTURE);
  return {
    store: new SqliteLeaderboardStore(db),
    prepareRound: (roundId) =>
      db
        .prepare(
          `INSERT INTO rounds (id, topic_id, lang, created_at) VALUES (?, 'general', 'en', 0)`,
        )
        .run(roundId),
    dispose: async () => db.close(),
  };
}

async function postgresHarness(): Promise<Harness> {
  const admin = new pg.Client({ connectionString: PG_URL });
  await admin.connect();
  await admin.query('DROP TABLE IF EXISTS leaderboard_entries');
  await admin.end();
  const store = await PostgresLeaderboardStore.connect(PG_URL!);
  return { store, prepareRound: () => {}, dispose: () => store.close() };
}

let n = 0;
function entry(overrides: Partial<NewEntry> = {}): NewEntry {
  n += 1;
  return {
    roundId: `round-${n}`,
    nickname: `Player ${n}`,
    topicId: 'general',
    collectionId: null,
    score: 500,
    correctCount: 5,
    totalQuestions: 10,
    createdAt: 1_000 + n,
    ...overrides,
  };
}

const harnesses: [string, () => Promise<Harness>, boolean][] = [
  ['SQLite', sqliteHarness, true],
  ['Postgres', postgresHarness, PG_URL !== undefined],
];

for (const [name, makeHarness, enabled] of harnesses) {
  describe.skipIf(!enabled)(`${name} leaderboard store`, () => {
    let h: Harness;
    beforeEach(async () => {
      h = await makeHarness();
    });
    afterEach(async () => h.dispose());

    async function add(e: NewEntry): Promise<LeaderboardEntry | null> {
      h.prepareRound(e.roundId);
      return h.store.add(e);
    }

    it('saves an entry and returns it with its rank on its board', async () => {
      await add(entry({ score: 900 }));

      const saved = await add(entry({ score: 300, nickname: 'Ola' }));

      expect(saved).toMatchObject({ nickname: 'Ola', score: 300, rank: 2, topicId: 'general' });
      expect(typeof saved!.id).toBe('number');
    });

    it('ranks only within the same board', async () => {
      await add(entry({ score: 900, topicId: 'music' }));
      await add(entry({ score: 800, topicId: null, collectionId: 'pub_quiz' }));

      const saved = await add(entry({ score: 100 }));

      expect(saved?.rank).toBe(1);
    });

    it('refuses a second entry for the same round', async () => {
      const first = entry();
      await add(first);

      expect(await h.store.add({ ...first, nickname: 'Again' })).toBeNull();
    });

    it('orders by score, then by who got there first', async () => {
      await add(entry({ nickname: 'Late', score: 500, createdAt: 3_000 }));
      await add(entry({ nickname: 'Early', score: 500, createdAt: 2_000 }));
      await add(entry({ nickname: 'Best', score: 700, createdAt: 4_000 }));

      const top = await h.store.top({ topicId: 'general' }, 10);

      expect(top.map((e) => [e.rank, e.nickname])).toEqual([
        [1, 'Best'],
        [2, 'Early'],
        [3, 'Late'],
      ]);
    });

    it('filters by topic or themed quiz, lists all boards without a filter, and limits', async () => {
      await add(entry({ topicId: 'music', score: 100 }));
      await add(entry({ topicId: null, collectionId: 'pub_quiz', score: 200 }));
      await add(entry({ topicId: 'general', score: 300 }));

      expect((await h.store.top({ topicId: 'music' }, 10)).map((e) => e.score)).toEqual([100]);
      expect((await h.store.top({ collectionId: 'pub_quiz' }, 10))[0]?.collectionId).toBe(
        'pub_quiz',
      );
      expect((await h.store.top({}, 2)).map((e) => e.score)).toEqual([300, 200]);
    });

    it('returns ISO timestamps and numeric fields', async () => {
      await add(entry({ createdAt: Date.UTC(2026, 0, 2) }));

      const [first] = await h.store.top({}, 1);

      expect(first?.createdAt).toBe('2026-01-02T00:00:00.000Z');
      expect(typeof first?.rank).toBe('number');
    });
  });
}

describe.skipIf(PG_URL === undefined)('API with the Postgres store', () => {
  it('keeps leaderboard entries when the API restarts with an empty local database', async () => {
    const admin = new pg.Client({ connectionString: PG_URL });
    await admin.connect();
    await admin.query('DROP TABLE IF EXISTS leaderboard_entries');
    await admin.end();

    const first = await buildTestApp(undefined, FIXTURE, { databaseUrl: PG_URL! });
    const roundId = await playRound(first, { topicId: 'general', correctAnswers: 4 });
    expect((await submitScore(first, { roundId, nickname: 'Survivor' })).statusCode).toBe(201);
    await first.close();

    // A new :memory: SQLite: rounds are gone, the entry is not.
    const second = await buildTestApp(undefined, FIXTURE, { databaseUrl: PG_URL! });
    const res = await second.inject({ method: 'GET', url: '/api/leaderboard?topicId=general' });
    await second.close();

    expect(res.json().entries.map((e: LeaderboardEntry) => e.nickname)).toEqual(['Survivor']);
  });
});
