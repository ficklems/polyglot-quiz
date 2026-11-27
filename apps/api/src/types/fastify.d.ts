import type { QuestionPool } from '../content/question-pool';
import type { Database } from '../db/database';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    pool: QuestionPool;
  }
}
