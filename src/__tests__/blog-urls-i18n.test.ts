import { describe, it, expect, vi } from 'vitest';

// Exercise the blog URL helpers with i18n turned ON and two locales. The
// default locale stays at the site root; the secondary locale is prefixed.
// This guards the locale-prefixed blog routing wired up for #422.
vi.mock('astro:content', () => ({
  getCollection: vi.fn(async () => []),
}));

vi.mock('@/config/i18n.config', () => ({
  default: {
    enabled: true,
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    localeNames: { en: 'English', ru: 'Russian' },
    detectBrowserLocale: false,
  },
}));

import {
  getPostUrl,
  getBlogBaseUrl,
  getBlogPageUrl,
  getTagUrl,
  getSecondaryLocales,
} from '@/lib/blog';

describe('blog URL helpers (i18n enabled — en default, ru secondary)', () => {
  it('keeps default-locale post URLs at the site root', () => {
    expect(getPostUrl('en/hello-world')).toBe('/blog/hello-world');
    expect(getPostUrl('en/hello-world', 'en')).toBe('/blog/hello-world');
  });

  it('prefixes secondary-locale post URLs with the locale', () => {
    expect(getPostUrl('ru/hello-world', 'ru')).toBe('/ru/blog/hello-world');
  });

  it('prefixes the blog index base URL for the secondary locale only', () => {
    expect(getBlogBaseUrl()).toBe('/blog');
    expect(getBlogBaseUrl('en')).toBe('/blog');
    expect(getBlogBaseUrl('ru')).toBe('/ru/blog');
  });

  it('prefixes paginated URLs for the secondary locale', () => {
    expect(getBlogPageUrl(1, 'ru')).toBe('/ru/blog');
    expect(getBlogPageUrl(2, 'ru')).toBe('/ru/blog/page/2');
    expect(getBlogPageUrl(2)).toBe('/blog/page/2');
  });

  it('prefixes tag URLs for the secondary locale', () => {
    expect(getTagUrl('Me2eM', 'ru')).toBe('/ru/blog/tag/me2em');
    expect(getTagUrl('Me2eM')).toBe('/blog/tag/me2em');
  });

  it('lists the non-default locales as needing prefixed routes', () => {
    expect(getSecondaryLocales()).toEqual(['ru']);
  });
});
