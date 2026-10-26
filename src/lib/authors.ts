import { getCollection } from 'astro:content';

let _map: Map<string, { name: string; bio: string; social: { linkedin: string; github: string } }> | null = null;

/**
 * Load all author records from the `authors` collection and return a
 * Map<slug, entry>. Results are cached across calls within a build.
 */
export async function getAuthorsMap(): Promise<Map<string, { name: string; bio: string; social: { linkedin: string; github: string } }>> {
  if (_map) return _map;
  const entries = await getCollection('authors');
  _map = new Map(
    entries.map((e) => [e.id, { name: e.data.name, bio: e.data.bio, social: e.data.social }])
  );
  return _map;
}

/**
 * Return the display name for an author slug.
 * Falls back to the slug itself (preserves donor behaviour for 'Team' etc.).
 */
export async function displayAuthorName(slug: string): Promise<string> {
  const map = await getAuthorsMap();
  return map.get(slug)?.name ?? slug;
}
