import type { QuestionPool } from '../content/question-pool';
import type { Database } from '../db/database';
import type { LeaderboardStore } from '../leaderboard-store/store';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    pool: QuestionPool;
    leaderboard: LeaderboardStore;
  }
}
