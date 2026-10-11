import { describe, it, expect, vi } from 'vitest';

// Exercise the project URL helpers with i18n turned ON and two locales. The
// default locale stays at the site root; the secondary locale is prefixed.
// This guards the locale-prefixed project routing wired up for #437, mirroring
// the blog coverage in `blog-urls-i18n.test.ts`.
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
  getProjectUrl,
  getProjectsBaseUrl,
  getProjectsPageUrl,
  getProjectTagUrl,
  getSecondaryLocales,
} from '@/lib/projects';

describe('project URL helpers (i18n enabled — en default, ru secondary)', () => {
  it('keeps default-locale project URLs at the site root', () => {
    expect(getProjectUrl('en/multi-app-sso')).toBe('/usecases/multi-app-sso');
    expect(getProjectUrl('en/multi-app-sso', 'en')).toBe('/usecases/multi-app-sso');
  });

  it('prefixes secondary-locale project URLs with the locale', () => {
    expect(getProjectUrl('ru/multi-app-sso', 'ru')).toBe('/ru/usecases/multi-app-sso');
  });

  it('prefixes the projects index base URL for the secondary locale only', () => {
    expect(getProjectsBaseUrl()).toBe('/usecases');
    expect(getProjectsBaseUrl('en')).toBe('/usecases');
    expect(getProjectsBaseUrl('ru')).toBe('/ru/usecases');
  });

  it('prefixes paginated URLs for the secondary locale', () => {
    expect(getProjectsPageUrl(1, 'ru')).toBe('/ru/usecases');
    expect(getProjectsPageUrl(2, 'ru')).toBe('/ru/usecases/page/2');
    expect(getProjectsPageUrl(2)).toBe('/usecases/page/2');
  });

  it('prefixes tag URLs for the secondary locale', () => {
    expect(getProjectTagUrl('Client Work', 'ru')).toBe('/ru/usecases/tag/client-work');
    expect(getProjectTagUrl('Client Work')).toBe('/usecases/tag/client-work');
  });

  it('lists the non-default locales as needing prefixed routes', () => {
    expect(getSecondaryLocales()).toEqual(['ru']);
  });
});
