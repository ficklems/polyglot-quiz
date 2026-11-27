import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { openDatabase } from './db/database';
import { registerErrorHandler } from './plugins/error-handler';
import { healthRoutes } from './routes/health';
import { topicsRoutes } from './routes/topics';

export type BuildAppOptions = Pick<Config, 'dbPath' | 'corsOrigins' | 'logLevel'>;

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
    },
    { prefix: '/api' },
  );

  return app;
}
