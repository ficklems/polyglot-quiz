import type { FastifyInstance } from 'fastify';
import { catalogQuerySchema, type CatalogResponse } from '@pq/shared';

/** Everything the home screen offers in one language: categories, subcategories, themed quizzes. */
export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  app.get('/catalog', async (request): Promise<CatalogResponse> => {
    const { lang } = catalogQuerySchema.parse(request.query);
    return app.pool.catalog(lang);
  });
}
