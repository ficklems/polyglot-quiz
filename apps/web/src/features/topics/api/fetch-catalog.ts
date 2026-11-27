import { catalogResponseSchema, type CatalogResponse, type Language } from '@pq/shared';
import { getJson } from '../../../shared/api/http';

export async function fetchCatalog(lang: Language, signal?: AbortSignal): Promise<CatalogResponse> {
  // Validate at the boundary: a contract change shows up as a clear error, not a blank screen.
  return catalogResponseSchema.parse(await getJson(`/api/catalog?lang=${lang}`, signal));
}
