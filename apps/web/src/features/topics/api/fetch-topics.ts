import { topicsResponseSchema, type Language, type Topic } from '@pq/shared';
import { getJson } from '../../../shared/api/http';

export async function fetchTopics(lang: Language, signal?: AbortSignal): Promise<Topic[]> {
  const body = await getJson(`/api/topics?lang=${lang}`, signal);
  // Validate at the boundary: a contract change shows up as a clear error, not a blank screen.
  return topicsResponseSchema.parse(body).topics;
}
