/**
 * Favicon generation — the raster half.
 *
 * `sharp` is a native Node module. It cannot load in workerd, so nothing here
 * may be imported by a page or by a prerendered endpoint when building for
 * Cloudflare. These are called from the `favicon-assets` integration in
 * `astro.config.mjs`, which runs in `astro:build:done` — always in Node, on
 * every adapter.
 */
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { buildMarkSvg } from './svg.ts';

/** Rasterise the brand mark to a square PNG buffer of the given pixel size. */
export async function renderMarkPng(
  size: number,
  accent: string,
  { maskable = false }: { maskable?: boolean } = {}
): Promise<Buffer> {
  const svg = buildMarkSvg(size, accent, { maskable });
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** Build a multi-size favicon.ico (16/32/48) from the brand mark. */
export async function renderFaviconIco(accent: string): Promise<Buffer> {
  const pngs = await Promise.all([16, 32, 48].map((s) => renderMarkPng(s, accent)));
  return pngToIco(pngs);
}