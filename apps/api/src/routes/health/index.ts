import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@pq/shared';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok' }));
}
