import type { FastifyInstance } from 'fastify';
import { topicsQuerySchema, type TopicsResponse } from '@pq/shared';
import { listTopics } from './service';

export async function topicsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/topics', async (request): Promise<TopicsResponse> => {
    // Throws ZodError on bad input; the error handler turns it into a 400.
    const { lang } = topicsQuerySchema.parse(request.query);
    return { lang, topics: listTopics(app.db, lang) };
  });
}
