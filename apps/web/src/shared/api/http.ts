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

async function request(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  });
  if (res.status === 204) return null;

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new HttpError(res.status, parsed.success ? parsed.data.message : res.statusText);
  }
  return body;
}

/** GETs JSON from the API and throws HttpError with the server's message on failure. */
export function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  return request(path, { method: 'GET', signal });
}

/** POSTs JSON (or nothing) and returns the parsed response, or null for 204. */
export function postJson(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
  return request(path, {
    method: 'POST',
    signal,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
}
