import type { APIRoute } from 'astro';
import { SITE_URL_FALLBACK } from '@/config/site-url';

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString() || SITE_URL_FALLBACK;

  // The generic `User-agent: *` group already allows every crawler, but
  // naming the AI crawlers documents the site's position in the one file
  // every crawler reads first: AI indexing is welcome here.
  const aiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'Google-Extended',
  ];

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Block API routes',
    'Disallow: /api/',
    '',
    ...aiCrawlers.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
    '# Plain-Markdown map of this site for language models — see https://llmstxt.org',
    `# LLM map: ${siteUrl}llms.txt`,
    '',
    `Sitemap: ${siteUrl}sitemap-index.xml`,
  ].join('\n');

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
