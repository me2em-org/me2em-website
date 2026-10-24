//astro.config.mjs
import { join, dirname } from 'node:path';
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import mermaid from 'astro-mermaid';

import i18nConfig from './src/config/i18n.config.ts';
import { SITE_URL_FALLBACK } from './src/config/site-url.ts';
import {
  canonicalOf,
  jsonLdUrlOf,
  siteUrlDisagreement,
  disagreementMessage,
} from './scripts/site-url-agreement.mjs';
import { SITE_NAME, THEME_COLOR } from './src/config/branding.ts';

// Плагины для якорных ссылок в заголовках (для оглавления и шеринга частей статьи)
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { unified } from '@astrojs/markdown-remark';

// Загрузка .env (как в оригинале)
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Not present. Nothing to load.
  }
}

/**
 * Deploy-target adapter selection.
 * Обновлено: Cloudflare Pages установлен как целевая платформа по умолчанию.
 */
function resolveAdapter() {
  if (process.env.ASTRO_DEV) return node({ mode: 'middleware' });
  return cloudflare(); // Всегда используем Cloudflare Pages
}

function siteUrlCheck() {
  return {
    name: 'site-url-check',
    hooks: {
      'astro:build:start': ({ logger }) => {
        if (process.env.SITE_URL) return;
        logger.warn(
          `SITE_URL is not set, so canonical URLs, og:image, RSS and the sitemap ` +
            `will all be written against ${SITE_URL_FALLBACK}. Set SITE_URL in ` +
            `your host's environment variables to your own domain.`
        );
      },
    },
  };
}

function pagefind() {
  return {
    name: 'pagefind',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const sitePath = fileURLToPath(dir);
        const outputPath = join(sitePath, 'pagefind');
        const { createIndex, close } = await import('pagefind');
        const { index } = await createIndex();
        const { page_count } = await index.addDirectory({ path: sitePath });
        await index.writeFiles({ outputPath });
        await close();
        logger.info(`indexed ${page_count} pages into ${outputPath}`);
      },
    },
  };
}

function faviconAssets() {
  const pngSizes = [
    ['favicon-32x32.png', 32, false],
    ['apple-touch-icon.png', 180, false],
    ['pwa-192x192.png', 192, false],
    ['pwa-512x512.png', 512, false],
    ['pwa-192x192-maskable.png', 192, true],
    ['pwa-512x512-maskable.png', 512, true],
    ['logo.png', 512, false],
  ];

  return {
    name: 'favicon-assets',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { buildMarkSvg } = await import('./src/lib/favicon/svg.ts');
        const { renderMarkPng, renderFaviconIco } = await import('./src/lib/favicon/raster.ts');
        const out = fileURLToPath(dir);

        // The badge itself — also the Logo component's image
        // (site.config → branding.logo.image). One source for all of it.
        await writeFile(join(out, 'favicon.svg'), buildMarkSvg(16, THEME_COLOR));
        await writeFile(join(out, 'logo.svg'), buildMarkSvg(16, THEME_COLOR));
        await writeFile(join(out, 'logo-maskable.svg'), buildMarkSvg(16, THEME_COLOR, { maskable: true }));

        for (const [name, size, maskable] of pngSizes) {
          await writeFile(join(out, name), await renderMarkPng(size, THEME_COLOR, { maskable }));
        }
        await writeFile(join(out, 'favicon.ico'), await renderFaviconIco(THEME_COLOR));

        logger.info(`wrote ${pngSizes.length + 4} favicon files to ${out}`);
      },
    },
  };
}

function ogCards() {
  const KINDS = [
    [/^\/og\/blog\/tag\//, 'BLOG'],
    [/^\/og\/blog\//, 'BLOG'],
    [/^\/og\/usecases\//, 'PROJECTS'],
  ];

  async function htmlFiles(directory) {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
      else if (entry.name.endsWith('.html')) found.push(path);
    }
    return found;
  }

  const meta = (html, property) => {
    const m = html.match(new RegExp(`<meta property="${property}" content="([^"]*)"`));
    return m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                   .replace(/&lt;/g, '<').replace(/&gt;/g, '>') : undefined;
  };

  return {
    name: 'og-cards',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { renderOgPng } = await import('./src/lib/og/raster.ts');
        const out = fileURLToPath(dir);
        const siteUrl = process.env.SITE_URL || SITE_URL_FALLBACK;
        const domain = new URL(siteUrl).host;

        const wanted = new Map();
        for (const file of await htmlFiles(out)) {
          const html = await readFile(file, 'utf8');
          const image = meta(html, 'og:image');
          if (!image) continue;
          let path;
          try {
            path = new URL(image, siteUrl).pathname;
          } catch {
            continue;
          }
          if (!path.startsWith('/og/') || !path.endsWith('.png') || wanted.has(path)) continue;
          wanted.set(path, {
            title: meta(html, 'og:title') || SITE_NAME,
            subtitle: meta(html, 'og:description'),
            kind: KINDS.find(([re]) => re.test(path))?.[1],
          });
        }

        for (const [path, card] of wanted) {
          const png = await renderOgPng({
            ...card,
            brandColor: THEME_COLOR,
            domain,
            siteName: SITE_NAME,
          });
          const target = join(out, path.replace(/^\//, ''));
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, png);
        }

        logger.info(`drew ${wanted.size} OG cards into ${out}`);
      },
    },
  };
}

function verifySiteUrl() {
  return {
    name: 'verify-site-url',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const root = fileURLToPath(dir);

        async function htmlFiles(directory) {
          const found = [];
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
            else if (entry.name.endsWith('.html')) found.push(path);
          }
          return found;
        }

        const pages = await htmlFiles(root);
        pages.sort((a, b) => Number(b.endsWith('index.html')) - Number(a.endsWith('index.html')));

        for (const page of pages) {
          const html = await readFile(page, 'utf8');
          const canonical = canonicalOf(html);
          const jsonLd = jsonLdUrlOf(html);
          if (!canonical || !jsonLd) continue;

          const found = siteUrlDisagreement(html);
          if (found) throw new Error(disagreementMessage(page.replace(`${root}`, ''), found));

          logger.info(`site address agrees in canonical and JSON-LD: ${canonical}`);
          return;
        }

        logger.info('no page carries both a canonical tag and JSON-LD — nothing to compare');
      },
    },
  };
}

const i18nEnabled = i18nConfig.enabled === true && i18nConfig.locales.length > 1;
const astroI18nOptions = i18nEnabled
  ? {
      defaultLocale: i18nConfig.defaultLocale,
      locales: i18nConfig.locales,
      routing: {
        prefixDefaultLocale: false,
        redirectToDefaultLocale: false,
      },
    }
  : undefined;

export default defineConfig({
  output: 'static',
  adapter: resolveAdapter(),
  site: process.env.SITE_URL || SITE_URL_FALLBACK,
  trailingSlash: 'never', // Оптимально для SEO, предотвращает дублирование URL со слэшем и без
  ...(astroI18nOptions ? { i18n: astroI18nOptions } : {}),

  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },

  env: {
    schema: {
      SITE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_UMAMI_WEBSITE_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_UMAMI_SRC: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: 'https://cloud.umami.is/script.js',
      }),

      GOOGLE_SITE_VERIFICATION: envField.string({ context: 'server', access: 'public', optional: true }),
      BING_SITE_VERIFICATION: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_GOOGLE_MAPS_API_KEY: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
      PUBLIC_CONSENT_ENABLED: envField.boolean({ context: 'client', access: 'public', optional: true, default: false }),
      PUBLIC_PRIVACY_POLICY_URL: envField.string({ context: 'client', access: 'public', optional: true, default: '' }),
    },
  },

  image: {
    layout: 'constrained',
    // domains: ['ваш-бакет.tebi.io'], // Раскомментируйте и добавьте ваш домен Tebi, если используете внешние картинки в <Image />
  },

  integrations: [
    mermaid({
      autoTheme: true,
      enableLog: false,
    }),
    react(),
    mdx(),
    sitemap(),
    icon(),
    siteUrlCheck(),
    pagefind(),
    faviconAssets(),
    ogCards(),
    verifySiteUrl(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    checkOrigin: true,
  },

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
    processor: unified({
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { 
          behavior: 'wrap', 
          properties: { class: 'heading-anchor' } 
        }],
      ],
    }),
  },
});