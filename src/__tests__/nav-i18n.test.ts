import { describe, it, expect, vi } from 'vitest';

// Exercise the nav config's locale resolution with i18n turned ON and two
// locales. The default locale stays at the site root; the secondary locale is
// prefixed and labels are translated via the dictionary. Guards the localized
// header/footer nav and logo wired up for #438.
vi.mock('@/config/i18n.config', () => ({
  default: {
    enabled: true,
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    localeNames: { en: 'English', ru: 'Russian' },
    detectBrowserLocale: false,
  },
}));

import { getNavItems, getLogoHref, resolveNavItem, type NavItem } from '@/config/nav.config';

describe('nav config — locale resolution (en default, ru secondary)', () => {
  it('keeps default-locale hrefs at the site root', () => {
    const items = getNavItems('en');
    expect(items.find((i) => i.label === 'Blog')?.href).toBe('/blog');
    expect(items.find((i) => i.label === 'About')?.href).toBe('/about');
  });

  it('prefixes secondary-locale hrefs with the locale', () => {
    const items = getNavItems('ru');
    expect(items.map((i) => i.href)).toEqual([
      '/ru',
      '/ru/services',
      '/ru/projects',
      '/ru/blog',
      '/ru/about',
      '/ru/contact',
    ]);
  });

  it('translates labels via the dictionary (labelKey)', () => {
    const items = getNavItems('ru');
    // ru.json: nav.items.about = "Обо мне", nav.items.services = "Услуги"
    expect(items.find((i) => i.href === '/ru/about')?.label).toBe('Обо мне');
    expect(items.find((i) => i.href === '/ru/services')?.label).toBe('Услуги');
  });

  it('points the logo at the locale home', () => {
    expect(getLogoHref('en')).toBe('/');
    expect(getLogoHref('ru')).toBe('/ru');
  });

  it('never locale-prefixes external, mailto/tel, or anchor hrefs', () => {
    expect(
      resolveNavItem(
        { label: 'GitHub', href: 'https://github.com/x', order: 1, external: true },
        'ru'
      ).href
    ).toBe('https://github.com/x');
    expect(resolveNavItem({ label: 'Top', href: '#top', order: 1 }, 'ru').href).toBe('#top');
    expect(resolveNavItem({ label: 'Mail', href: 'mailto:a@b.com', order: 1 }, 'ru').href).toBe(
      'mailto:a@b.com'
    );
  });

  it('applies a per-locale override (label + path), still locale-prefixed', () => {
    const item: NavItem = {
      label: 'Contact',
      href: '/contact',
      order: 1,
      locales: { ru: { label: 'Связаться', href: '/svyaz' } },
    };
    expect(resolveNavItem(item, 'ru')).toEqual({
      label: 'Связаться',
      href: '/ru/svyaz',
      external: undefined,
    });
    // The default locale is unaffected by a ru-only override.
    expect(resolveNavItem(item, 'en')).toEqual({
      label: 'Contact',
      href: '/contact',
      external: undefined,
    });
  });

  it('falls back to the literal label when no labelKey is set', () => {
    expect(resolveNavItem({ label: 'Docs', href: '/docs', order: 1 }, 'ru').label).toBe('Docs');
  });
});
