import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { loadContent, type ContentBundle } from './content/load-content';
import { QuestionPool } from './content/question-pool';
import { openDatabase } from './db/database';
import { PostgresLeaderboardStore } from './leaderboard-store/postgres-store';
import { SqliteLeaderboardStore } from './leaderboard-store/sqlite-store';
import type { LeaderboardStore } from './leaderboard-store/store';
import { randomSeed as defaultRandomSeed } from './lib/random';
import { registerErrorHandler } from './plugins/error-handler';
import { catalogRoutes } from './routes/catalog';
import { healthRoutes } from './routes/health';
import { leaderboardRoutes } from './routes/leaderboard';
import { roundsRoutes } from './routes/rounds';
import type { Clock } from './routes/rounds/service';
import { topicsRoutes } from './routes/topics';

export type BuildAppOptions = Pick<
  Config,
  'dbPath' | 'corsOrigins' | 'logLevel' | 'databaseUrl'
> & {
  /** Questions and categories. Defaults to the repository's content/ folder. */
  content?: ContentBundle;
  /** Current time in ms. Tests inject a fake clock to check the time limit. */
  now?: Clock;
  /** Seed used when a round request doesn't send one. */
  randomSeed?: () => number;
};

/**
 * Builds the app without listening on a port, so tests can call it with `app.inject()`.
 */
export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: options.logLevel } });

  const content = options.content ?? loadContent();
  app.log.info(
    { version: content.version, servable: content.report.servableByLanguage },
    'content loaded',
  );
  const db = openDatabase(options.dbPath, content);
  app.decorate('db', db);
  const pool = new QuestionPool(db, content);
  pool.warmUp();
  app.decorate('pool', pool);
  const leaderboard: LeaderboardStore = options.databaseUrl
    ? await PostgresLeaderboardStore.connect(options.databaseUrl)
    : new SqliteLeaderboardStore(db);
  app.decorate('leaderboard', leaderboard);
  app.log.info({ store: options.databaseUrl ? 'postgres' : 'sqlite' }, 'leaderboard store ready');
  app.addHook('onClose', async () => {
    await leaderboard.close();
    db.close();
  });

  registerErrorHandler(app);
  await app.register(cors, { origin: options.corsOrigins });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(topicsRoutes);
      await api.register(catalogRoutes);
      const now = options.now ?? Date.now;
      await api.register(roundsRoutes, {
        now,
        randomSeed: options.randomSeed ?? defaultRandomSeed,
      });
      await api.register(leaderboardRoutes, { now });
    },
    { prefix: '/api' },
  );

  return app;
}
