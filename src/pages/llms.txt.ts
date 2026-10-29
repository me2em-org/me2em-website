import type { APIRoute } from 'astro';
import siteConfig from '@/config/site.config';
import { defaultLocale } from '@/i18n';
import { getPublishedPosts, getPostUrl, getRssUrl } from '@/lib/blog';
import { getVisibleUsecases, getUsecaseUrl } from '@/lib/usecases';
import { getNavItems } from '@/config/nav.config';

/**
 * /llms.txt
 *
 * A plain-Markdown map of this site for large language models, following the
 * proposal at https://llmstxt.org. Where robots.txt tells a crawler *whether*
 * it may read the site, llms.txt tells a model *what the site is and which
 * pages matter* — in one short, token-cheap file.
 *
 * Why it's worth having: when someone asks an assistant a question this site
 * could answer, the model has a clean, citable summary instead of guessing
 * from scattered marketing copy.
 *
 * Everything here is generated at build time from `site.config.ts`, the nav
 * config and the content collections, so it describes *your* site and never
 * drifts out of sync with the real pages. There is nothing to keep updated by
 * hand.
 *
 * The Pages list used to be five hardcoded lines and had already drifted: it
 * named Home, Sandbox, Usecases, Blog and Contact while the nav also carried
 * Services, and it never mentioned the components page at all — so an
 * assistant asked about this site had no way to learn that the page
 * documenting every component exists. It now comes from `getNavItems`, so it
 * follows whatever nav a site configures.
 *
 * External nav entries are left out: this file is a map of *this* site, and a
 * link to somewhere else is not part of it.
 *
 * Multi-language sites: the default locale is listed, since llms.txt is meant
 * to stay short. Translated pages remain discoverable through the sitemap and
 * the hreflang tags the site already emits.
 */

export const GET: APIRoute = async ({ site }) => {
  const base = (site?.toString() || siteConfig.url).replace(/\/$/, '');

  const posts = await getPublishedPosts(defaultLocale);
  const usecases = await getVisibleUsecases(defaultLocale);

  const line = (title: string, url: string, description?: string) =>
    description ? `- [${title}](${url}): ${description}` : `- [${title}](${url})`;

  const postLines = [...posts]
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
    .map((post) => line(post.data.title, `${base}${getPostUrl(post.id, defaultLocale)}`, post.data.description))
    .join('\n');

  const usecaseLines = [...usecases]
    .sort((a, b) => a.data.order - b.data.order)
    .map((usecase) =>
      line(usecase.data.title, `${base}${getUsecaseUrl(usecase.id, defaultLocale)}`, usecase.data.description)
    )
    .join('\n');

  const pageLines = getNavItems(defaultLocale)
    .filter((item) => !item.external)
    .map((item) => line(item.label, `${base}${item.href}`));

  const sections = [
    `# ${siteConfig.name}`,
    ``,
    `> ${siteConfig.description}`,
    ``,
    `One Identity → Many Handles → Stateless Sessions`,
    ``,
    `## Pages`,
    ``,
    ...pageLines,
  ];

  sections.push(``, `## Technical specification`, ``,
    `- Seed-derived identity: an Identity is derived from a seed phrase on the user's`,
    `  device — Ed25519 and HKDF, offline, with no network and no consensus.`,
    `- Hierarchy: Identity → Handle → SubHandle (SubHandle is the leaf, MAX_DEPTH = 2);`,
    `  a device derives its own SubHandles and child attestations, fully offline.`,
    `- Stateless sessions: verifiers need no user database and no server-side session`,
    `  store — verification is pure cryptography, with no accounts to breach.`,
    `- Delegatable trust: signed attestation chains and mandates; revoking one`,
    `  attestation jti disables the entire branch — current and future sessions — on`,
    `  every verifier that checks revocations.`,
    `- Verification modes: verifyStateless for backends that hold the root key;`,
    `  verifyAttested for everyone else — grants enforced at verification time, with`,
    `  the root public key only.`,
    `- Packages: @me2em/core, @me2em/crypto, @me2em/react on npm — alpha, moving`,
    `  toward a v1.0 API freeze.`,
    `- License: Apache-2.0, free and open source.`,
  );

  if (usecaseLines) {
    sections.push(``, `## Usecases`, ``, usecaseLines);
  }

  if (postLines) {
    sections.push(``, `## Blog posts`, ``, postLines);
  }

  sections.push(
    ``,
    `## More`,
    ``,
    line('Sitemap', `${base}/sitemap-index.xml`),
    line('RSS feed', `${base}${getRssUrl(defaultLocale)}`),
    ``,
    `- Author: [Serge Lubimov](https://selub.github.io) — author and maintainer of the Me2eM protocol ([LinkedIn](https://www.linkedin.com/in/serge-lubimov), [GitHub](https://github.com/selub))`,
    ``,
    `---`,
    ``,
    `Contact: ${siteConfig.email}`,
    ``
  );

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
