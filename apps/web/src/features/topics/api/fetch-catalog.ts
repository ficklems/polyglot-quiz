import { catalogResponseSchema, type CatalogQuery, type CatalogResponse } from '@pq/shared';
import { getJson } from '../../../shared/api/http';

export async function fetchCatalog(
  { lang, region, difficulty }: CatalogQuery,
  signal?: AbortSignal,
): Promise<CatalogResponse> {
  const query = new URLSearchParams({ lang, region, difficulty });
  // Validate at the boundary: a contract change shows up as a clear error, not a blank screen.
  return catalogResponseSchema.parse(await getJson(`/api/catalog?${query}`, signal));
}
