import { describe, it, expect } from 'vitest';
import {
  t,
  tData,
  localizedPath,
  resolveLocale,
  isValidLocale,
  getLocaleName,
  getLocaleFromPath,
  getSecondaryLocales,
  stripLocaleFromPath,
  swapLocaleInPath,
} from '../i18n';
import enDict from '../i18n/en.json';
import ruDict from '../i18n/ru.json';
import zhDict from '../i18n/zh.json';

describe('i18n t() helper', () => {
  it('returns a translation for a valid dotted key', () => {
    expect(t('common.readMore', 'en')).toBe('Read more');
  });

  it('falls back to the default-locale string when the locale has no entry', () => {
    // 'de' has no dictionary loaded yet — should fall back to English
    expect(t('common.readMore', 'de')).toBe('Read more');
  });

  it('returns the key itself when no translation exists in any dictionary', () => {
    expect(t('some.missing.key', 'en')).toBe('some.missing.key');
  });

  it('interpolates {placeholder} variables', () => {
    expect(t('blog.readingTime', 'en', { minutes: 5 })).toBe('5 min read');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(t('blog.readingTime', 'en', {})).toBe('{minutes} min read');
  });
});

describe('i18n tData() helper', () => {
  it('returns a structured (array) value by dotted key', () => {
    // Asserts the shape rather than the copy. The previous version read
    // `pages.sandbox.hero` and checked for a literal; the sandbox page was
    // later restructured, `hero` stopped existing, and the test failed for a
    // reason that had nothing to do with tData().
    const items = tData<{ icon: string; title: string; description: string }[]>(
      'pages.sandbox.whatYouGet.items',
      'en'
    );
    expect(Array.isArray(items)).toBe(true);
    expect(items?.length).toBeGreaterThan(0);
    expect(items?.[0]).toEqual(
      expect.objectContaining({
        icon: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
      })
    );
  });

  it('falls back to the default-locale value when the locale has no entry', () => {
    // 'de' has no dictionary loaded yet — should fall back to the English data
    const cards = tData<unknown[]>('pages.sandbox.whatYouGet.items', 'de');
    expect(Array.isArray(cards)).toBe(true);
    expect(cards?.length).toBeGreaterThan(0);
  });

  it('returns undefined when the key is absent in every dictionary', () => {
    expect(tData('pages.does.not.exist', 'en')).toBeUndefined();
  });
});

describe('i18n getSecondaryLocales()', () => {
  it('returns the non-default locales when i18n is enabled', () => {
    // Config: enabled is true and locales is ['en', 'ru', 'zh']
    expect(getSecondaryLocales()).toEqual(['ru', 'zh']);
  });
});

describe('i18n localizedPath()', () => {
  it('returns the default-locale path unchanged', () => {
    // Config: enabled is true, defaultLocale is 'en'
    expect(localizedPath('/about')).toBe('/about');
    expect(localizedPath('/')).toBe('/');
    expect(localizedPath('blog/hello')).toBe('/blog/hello');
  });

  it('prefixes the path for a secondary locale', () => {
    expect(localizedPath('/about', 'ru')).toBe('/ru/about');
    expect(localizedPath('/blog/hello', 'zh')).toBe('/zh/blog/hello');
  });
});

describe('i18n locale helpers', () => {
  it('resolves an unknown locale to the default', () => {
    expect(resolveLocale('xx')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('validates a configured locale', () => {
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('ru')).toBe(true);
    expect(isValidLocale('zh')).toBe(true);
    expect(isValidLocale('xx')).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
  });

  it('returns the display name when configured, otherwise the code', () => {
    expect(getLocaleName('en')).toBe('English');
    expect(getLocaleName('ru')).toBe('Russian');
    expect(getLocaleName('zh')).toBe('China');
    expect(getLocaleName('xx')).toBe('xx');
  });
});

describe('i18n getLocaleFromPath()', () => {
  it('returns the default locale for the root path', () => {
    expect(getLocaleFromPath('/')).toBe('en');
  });

  it('returns the default locale when no recognized prefix is present', () => {
    expect(getLocaleFromPath('/about')).toBe('en');
    expect(getLocaleFromPath('/blog/hello-world')).toBe('en');
  });

  it('returns the first segment when it is a configured locale', () => {
    // Config has 'en', 'ru', 'zh'
    expect(getLocaleFromPath('/zh/about')).toBe('zh');
    expect(getLocaleFromPath('/ru/about')).toBe('ru');
    expect(getLocaleFromPath('/zh-cn/blog')).toBe('en');
  });

  it('normalizes paths without a leading slash', () => {
    expect(getLocaleFromPath('about')).toBe('en');
  });
});

describe('i18n stripLocaleFromPath()', () => {
  it('strips a recognized locale prefix from a path', () => {
    expect(stripLocaleFromPath('/about')).toBe('/about');
    expect(stripLocaleFromPath('/zh/about')).toBe('/about');
    expect(stripLocaleFromPath('/ru/about')).toBe('/about');
  });

  it('returns "/" for the root path', () => {
    expect(stripLocaleFromPath('/')).toBe('/');
  });
});

describe('i18n swapLocaleInPath()', () => {
  it('returns the path unchanged when targeting the default locale (no prefix added)', () => {
    expect(swapLocaleInPath('/about', 'en')).toBe('/about');
  });

  it('swaps the locale segment when targeting a secondary locale', () => {
    expect(swapLocaleInPath('/about', 'ru')).toBe('/ru/about');
    expect(swapLocaleInPath('/ru/about', 'en')).toBe('/about');
    expect(swapLocaleInPath('/ru/about', 'zh')).toBe('/zh/about');
  });
});

describe('i18n meta titles never embed the site name', () => {
  // SEO.astro renders the document <title> as `${title} — ${siteConfig.name}`,
  // so any meta-title dictionary value that already contains the site name
  // would render it twice (e.g. "Blog — Me2em — Me2em"). Every
  // key below feeds that `title` prop and must therefore stay brand-free.
  //
  // The shipped brand is checked as a literal on purpose: importing
  // site.config.ts here would pull in `astro:env/server` (see i18n.config.ts),
  // and this guards the theme's own default dictionaries against a regression.
  const SITE_NAME = 'Me2em';
  const METATITLE_KEYS = [
    'blog.metaTitle',
    'blog.pageMetaTitle',
    'blog.tagMetaTitle',
    'usecases.metaTitle',
    'usecases.pageMetaTitle',
    'usecases.tagMetaTitle',
    'errors.metaTitle',
    'pages.home.meta.title',
    'pages.sandbox.meta.title',
    'pages.docs.meta.title',
    'pages.community.meta.title',
  ];

  const cases = ['en', 'ru'].flatMap((locale) =>
    METATITLE_KEYS.map((key) => [locale, key] as [string, string])
  );

  it.each(cases)('%s "%s" does not include the site name', (locale, key) => {
    expect(t(key, locale)).not.toContain(SITE_NAME);
  });
});

describe('usecases keys exist and projects top-level key is absent', () => {
  // After renaming projects.* → usecases.*, the i18n dictionaries must carry
  // the new keys and must NOT carry a top-level 'projects' section.
  const USECASES_KEYS = ['usecases.heroBadge', 'usecases.metaTitle', 'usecases.ctaHeading'];

  it.each(['en', 'ru', 'zh'])('%s dictionary contains all usecases keys', (locale) => {
    for (const key of USECASES_KEYS) {
      expect(t(key, locale)).not.toBe(key);
    }
  });

  it.each(['en', 'ru', 'zh'])('%s dictionary has no top-level "projects" key', (locale) => {
    const dicts: Record<string, Record<string, unknown>> = {
      en: enDict,
      ru: ruDict,
      zh: zhDict,
    };
    expect('projects' in dicts[locale]).toBe(false);
  });
});
