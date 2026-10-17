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
  getUsecaseUrl,
  getUsecasesBaseUrl,
  getUsecasesPageUrl,
  getUsecaseTagUrl,
  getSecondaryLocales,
} from '@/lib/usecases';

describe('usecase URL helpers (i18n enabled — en default, ru secondary)', () => {
  it('keeps default-locale usecase URLs at the site root', () => {
    expect(getUsecaseUrl('en/multi-app-sso')).toBe('/usecases/multi-app-sso');
    expect(getUsecaseUrl('en/multi-app-sso', 'en')).toBe('/usecases/multi-app-sso');
  });

  it('prefixes secondary-locale usecase URLs with the locale', () => {
    expect(getUsecaseUrl('ru/multi-app-sso', 'ru')).toBe('/ru/usecases/multi-app-sso');
  });

  it('prefixes the usecases index base URL for the secondary locale only', () => {
    expect(getUsecasesBaseUrl()).toBe('/usecases');
    expect(getUsecasesBaseUrl('en')).toBe('/usecases');
    expect(getUsecasesBaseUrl('ru')).toBe('/ru/usecases');
  });

  it('prefixes paginated URLs for the secondary locale', () => {
    expect(getUsecasesPageUrl(1, 'ru')).toBe('/ru/usecases');
    expect(getUsecasesPageUrl(2, 'ru')).toBe('/ru/usecases/page/2');
    expect(getUsecasesPageUrl(2)).toBe('/usecases/page/2');
  });

  it('prefixes tag URLs for the secondary locale', () => {
    expect(getUsecaseTagUrl('Client Work', 'ru')).toBe('/ru/usecases/tag/client-work');
    expect(getUsecaseTagUrl('Client Work')).toBe('/usecases/tag/client-work');
  });

  it('lists the non-default locales as needing prefixed routes', () => {
    expect(getSecondaryLocales()).toEqual(['ru']);
  });
});
