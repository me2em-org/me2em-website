# Me2em Website

The website of the Me2em protocol — [me2em.com](https://me2em.com).

Me2em is an open-source identity protocol: one seed → an Identity, many Handles,
stateless sessions. The protocol sources live in
[me2em-org/me2em-protocol](https://github.com/me2em-org/me2em-protocol).

## Tech stack

- [Astro](https://docs.astro.build) with React islands and Tailwind CSS
- Locales: English (default), Russian, Chinese
- Vitest for unit tests, `astro check` for diagnostics
- Deployed on Cloudflare Pages

## Quick start

- **Node.js 22.12.0+**
- **pnpm 10.33.0**

```bash
git clone https://github.com/me2em-org/me2em-website.git
cd me2em-website
pnpm install
pnpm dev
```

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start the local dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build |
| `pnpm test:run` | Run unit tests |
| `pnpm check` | Type and lint diagnostics |

## Project structure

- `src/i18n/` — UI dictionaries (en, ru, zh)
- `src/content/` — MDX content: use cases, blog, stack
- `src/components/` — Astro views and React islands; the sandbox is built on `@me2em/react`
- `src/pages/` — routes

## Design system

The site ships with 8 colour themes, all based on Tailwind's color palette. The
`colourThemes` array in `src/lib/themes.ts` is the registry: it controls which
swatches are shown, in what order, and whether each is offered at all.

## Components

42 production components across four categories — UI, patterns, layout, and
hero — all accessible with TypeScript.

## Internationalization

English is the default locale (no URL prefix); Russian and Chinese live under
`/ru/` and `/zh/`. Keys that a locale has not translated yet fall back to the
default locale, so no locale route is ever blank.

## Credits

Built on [Astro Rocket](https://github.com/hansmartensdev/astro-rocket) by
Hans Martens (MIT).

## License

[MIT](./LICENSE)
