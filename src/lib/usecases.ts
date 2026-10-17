/**
 * Shared helpers for the usecase listing and tag-archive pages.
 *
 * Mirrors `lib/blog` so usecases get the same locale support and tag
 * conventions (slugging, tag clouds, archives) without the two drifting apart.
 * The default locale stays at the site root (`/usecases/...`); additional
 * locales live under a prefix (`/<locale>/usecases/...`).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import siteConfig from '@/config/site.config';
import { defaultLocale, localizedPath, isEnabled, getLocales } from '@/i18n';
import { tagToSlug, findTagBySlug } from '@/lib/tags';

// Re-export the shared tag-slug helpers so callers can import everything
// usecase-related from one place.
export { tagToSlug, findTagBySlug };

/** How many of the most-used tags to surface in a usecase tag cloud. */
export const PROJECT_TAG_CLOUD_LIMIT = siteConfig.usecases?.tagCloudLimit ?? 10;

/** Number of usecases shown per page on the usecases listing. */
export const PROJECTS_PER_PAGE = siteConfig.usecases?.perPage ?? 12;

/**
 * Strip the locale prefix (and any `.md`/`.mdx` extension) from a usecase id to
 * get its URL slug (e.g. "en/astro-rocket" → "astro-rocket"). Mirrors
 * `getPostSlug` in `./blog`.
 */
export function getUsecaseSlug(usecaseId: string, locale: string = defaultLocale): string {
  // Strip the leading locale-folder segment and any file extension, leaving a
  // single-segment slug. The prefix is normally `locale`, but we also strip any
  // other configured locale, so a folder/locale mismatch (e.g. content under
  // `en/` whose `locale` field resolved to a different default) still yields a
  // clean slug rather than one containing a slash — which would break the
  // single-segment `[slug]` routes such as the OG-image endpoints.
  const localePrefix = new RegExp(`^(${[locale, ...getLocales()].join('|')})/`);
  return usecaseId.replace(localePrefix, '').replace(/\.mdx?$/, '');
}

/**
 * URL path for an individual usecase, locale-aware. The default locale stays at
 * the site root (`/usecases/<slug>`); additional locales are prefixed
 * (`/<locale>/usecases/<slug>`), matching `localizedPath`.
 */
export function getUsecaseUrl(usecaseId: string, locale: string = defaultLocale): string {
  return localizedPath(`/usecases/${getUsecaseSlug(usecaseId, locale)}`, locale);
}

/** URL of the usecases index for a locale (`/usecases` or `/<locale>/usecases`). */
export function getUsecasesBaseUrl(locale: string = defaultLocale): string {
  return localizedPath('/usecases', locale);
}

/**
 * URL for a usecases index page number, locale-aware. Page 1 is the usecases
 * root (no `/page/1` segment), matching the routing in `usecases/page/[page].astro`.
 */
export function getUsecasesPageUrl(page: number, locale: string = defaultLocale): string {
  return page <= 1 ? getUsecasesBaseUrl(locale) : localizedPath(`/usecases/page/${page}`, locale);
}

/** URL for a usecase tag archive page, locale-aware. */
export function getUsecaseTagUrl(tag: string, locale: string = defaultLocale): string {
  return localizedPath(`/usecases/tag/${tagToSlug(tag)}`, locale);
}

/**
 * The non-default locales that should get their own prefixed usecases routes
 * (`/<locale>/usecases/...`). Empty when i18n is off or only one locale is
 * configured, so the locale-prefixed `getStaticPaths` emit nothing and
 * single-locale builds stay byte-for-byte unchanged.
 */
export function getSecondaryLocales(): string[] {
  if (!isEnabled()) return [];
  return getLocales().filter((locale) => locale !== defaultLocale);
}

/**
 * All visible usecases for a locale, ordered by their `order` field. Drafts are
 * filtered out in production, kept visible in dev so authors can preview them.
 */
export async function getVisibleUsecases(
  locale: string = defaultLocale,
): Promise<CollectionEntry<'usecases'>[]> {
  const all = await getCollection('usecases', ({ data }) => {
    return data.locale === locale && (import.meta.env.PROD ? data.draft !== true : true);
  });
  return all.sort((a, b) => a.data.order - b.data.order);
}

/**
 * Total number of usecase index pages for a locale. Shared by the default and
 * locale-prefixed pagination routes so they agree on the page count.
 */
/**
 * The usecases that have a page of their own.
 *
 * `getVisibleUsecases` includes entries marked `placeholder: true` — they show
 * as cards on the index but deliberately have no detail route, which is why
 * `UsecaseCard` renders them without an href. Anything building links to
 * usecase pages has to apply the same filter, and the footer's derived Usecases
 * column did not: it linked five, four of which 404ed.
 *
 * The rule lives here now so there is one copy of it.
 */
export async function getRoutableUsecases(locale: string = defaultLocale) {
  return (await getVisibleUsecases(locale)).filter((usecase) => !usecase.data.placeholder);
}

export async function getUsecasePageCount(locale: string = defaultLocale): Promise<number> {
  const usecases = await getVisibleUsecases(locale);
  return Math.max(1, Math.ceil(usecases.length / PROJECTS_PER_PAGE));
}

/**
 * Resolve a usecase's real per-locale URLs by matching slugs across locales.
 * Usecases share one slug across locales (one folder per locale, same filename),
 * so unlike the blog — which links translations via canonical `uid`s — matching
 * the locale-stripped slug is enough. Returns one entry per locale that has a
 * usecase at this slug, used for hreflang tags and the language switcher.
 */
export async function getUsecaseTranslations(
  slug: string,
  _currentLocale: string = defaultLocale,
): Promise<{ locale: string; url: string }[]> {
  if (!isEnabled()) return [];
  const all = await getCollection('usecases', ({ data }) => {
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  const results: { locale: string; url: string }[] = [];
  for (const locale of getLocales()) {
    const match = all.find(
      (p) => p.data.locale === locale && getUsecaseSlug(p.id, locale) === slug,
    );
    if (match) results.push({ locale, url: getUsecaseUrl(match.id, locale) });
  }
  return results;
}

/** All unique tags across the given usecases, alphabetically sorted. */
export function collectUsecaseTags(usecases: CollectionEntry<'usecases'>[]): string[] {
  return [...new Set(usecases.flatMap((p) => p.data.tags))].sort();
}

/** Tag occurrence counts across the given usecases, sorted by count desc then alpha. */
export function collectUsecaseTagsWithCounts(
  usecases: CollectionEntry<'usecases'>[]
): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of usecases) {
    for (const t of p.data.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** The most-used tags across the given usecases, capped at `limit`. */
export function collectTopUsecaseTags(
  usecases: CollectionEntry<'usecases'>[],
  limit: number
): string[] {
  return collectUsecaseTagsWithCounts(usecases)
    .slice(0, limit)
    .map((t) => t.tag);
}
