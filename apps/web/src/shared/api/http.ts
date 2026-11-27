import { apiErrorSchema } from '@pq/shared';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** GETs JSON from the API and throws HttpError with the server's message on failure. */
export async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(path, { headers: { Accept: 'application/json' }, signal });
  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new HttpError(res.status, parsed.success ? parsed.data.message : res.statusText);
  }
  return body;
}
