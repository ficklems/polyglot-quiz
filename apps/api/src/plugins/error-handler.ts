import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '@pq/shared';

/** Maps every failure to the shared ApiError shape, so clients and tests see one format. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | ZodError, request, reply) => {
    if (error instanceof ZodError) {
      const body: ApiError = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Request validation failed',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
      return reply.status(400).send(body);
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
    }

    const body: ApiError = {
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : (error.name ?? 'Error'),
      // Never leak internals of unexpected failures to the client.
      message: statusCode >= 500 ? 'Something went wrong' : error.message,
    };
    return reply.status(statusCode).send(body);
  });

  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = {
      statusCode: 404,
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    };
    return reply.status(404).send(body);
  });
}
