import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { openDatabase } from './db/database';
import { randomSeed as defaultRandomSeed } from './lib/random';
import { registerErrorHandler } from './plugins/error-handler';
import { healthRoutes } from './routes/health';
import { leaderboardRoutes } from './routes/leaderboard';
import { roundsRoutes } from './routes/rounds';
import type { Clock } from './routes/rounds/service';
import { topicsRoutes } from './routes/topics';

export type BuildAppOptions = Pick<Config, 'dbPath' | 'corsOrigins' | 'logLevel'> & {
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

  const db = openDatabase(options.dbPath);
  app.decorate('db', db);
  app.addHook('onClose', async () => db.close());

  registerErrorHandler(app);
  await app.register(cors, { origin: options.corsOrigins });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(topicsRoutes);
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
