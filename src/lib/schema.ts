import type {
  WebSite,
  Organization,
  Person,
  SoftwareApplication,
  BlogPosting,
  BreadcrumbList,
  FAQPage,
  WithContext,
} from 'schema-dts';
import siteConfig from '@/config/site.config';

/**
 * Create WebSite schema for homepage
 */
export function createWebsiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

/**
 * Author profile — single source of truth for the author Person JSON-LD,
 * llms.txt, and resolveAuthorForSchema().
 */
export const AUTHOR_PROFILE = {
  name: 'Serge Lubimov',
  jobTitle: 'Author & maintainer of the Me2eM protocol',
  url: 'https://selub.github.io',
  sameAs: [
    'https://www.linkedin.com/in/serge-lubimov',
    'https://github.com/selub',
    'https://selub.github.io',
  ],
  knowsAbout: ['seed phrase', 'zero-knowledge proofs', 'stateless authentication', 'AI agent delegation'],
} as const;

/**
 * Create Person schema for the site author (Serge Lubimov)
 */
export function createAuthorPersonSchema(): WithContext<Person> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_PROFILE.name,
    jobTitle: AUTHOR_PROFILE.jobTitle,
    url: AUTHOR_PROFILE.url,
    sameAs: [...AUTHOR_PROFILE.sameAs],
    knowsAbout: [...AUTHOR_PROFILE.knowsAbout],
  };
}

/**
 * Create SoftwareApplication schema
 */
export function createSoftwareApplicationSchema(): WithContext<SoftwareApplication> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    applicationCategory: 'DeveloperApplication',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    license: 'https://www.apache.org/licenses/LICENSE-2.0',
    author: { '@type': 'Organization', name: siteConfig.name, url: siteConfig.url },
  };
}

/**
 * Create Organization schema
 */
export function createOrganizationSchema(): WithContext<Organization> {
  const logoUrl = siteConfig.branding.logo.imageUrl
    ? `${siteConfig.url}${siteConfig.branding.logo.imageUrl}`
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    ...(logoUrl ? { logo: logoUrl } : {}),
    sameAs: siteConfig.socialLinks,
    contactPoint: siteConfig.phone
      ? {
          '@type': 'ContactPoint',
          telephone: siteConfig.phone,
          contactType: 'customer service',
        }
      : undefined,
  };
}

/**
 * Resolve a frontmatter author slug into schema-ready author data.
 * Falls back to the slug as-is (preserving donor behaviour for 'Team').
 */
export function resolveAuthorForSchema(authorSlug: string): { name: string; url: string; sameAs?: string[] } {
  if (authorSlug === 'serge-lubimov') {
    return { name: AUTHOR_PROFILE.name, url: AUTHOR_PROFILE.url, sameAs: [...AUTHOR_PROFILE.sameAs] };
  }
  return { name: authorSlug, url: siteConfig.url };
}

/**
 * Create BlogPosting schema for blog posts
 */
export function createBlogPostSchema(post: {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: Date;
  dateModified?: Date;
  author: { name: string; url?: string; sameAs?: string[] };
}): WithContext<BlogPosting> {
  const authorObj: { '@type': string; name: string; url?: string; sameAs?: string[] } = {
    '@type': 'Person',
    name: post.author.name,
  };
  if (post.author.url) authorObj.url = post.author.url;
  if (post.author.sameAs) authorObj.sameAs = post.author.sameAs;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    image: post.image,
    datePublished: post.datePublished.toISOString(),
    dateModified: post.dateModified?.toISOString() || post.datePublished.toISOString(),
    author: authorObj,
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      ...(siteConfig.branding.logo.imageUrl
        ? {
            logo: {
              '@type': 'ImageObject',
              url: `${siteConfig.url}${siteConfig.branding.logo.imageUrl}`,
            },
          }
        : {}),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': post.url,
    },
  };
}

/**
 * Create BreadcrumbList schema
 */
export function createBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Create FAQPage schema
 */
export function createFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
