import type { Database } from '../db/database';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}
