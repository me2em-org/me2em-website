# Brand Guidelines

Canonical brand usage for the Me2eM website and protocol.

## Brand name

| Context | Form | Example |
|---------|------|---------|
| Human-facing prose (UI copy, documentation, blog, frontmatter) | **Me2eM** | "Build on Me2eM" |
| Machine identifiers (npm packages, code, domain, URLs, CLI) | **me2em** | `@me2em/core`, `me2em-protocol`, `https://me2em.com` |
| Forbidden in prose | **Me2em** | ❌ Never use this form |

The brand does not decline or conjugate — the "iPhone rule":
- ✅ "Me2eM protocol", "Me2eM website", "Me2eM documentation"
- ❌ "Me2eM's protocol", "Me2eMed"

## Logo

### Inline SVG (primary)

The default logo is an inline SVG rendered by the `<Logo>` component. It follows the active colour theme via CSS custom properties (`fill-brand-500`), so it adapts to light/dark mode automatically.

**Where it renders:** header, footer, CTA, article bylines.

**Do not** replace it with an external image — the inline SVG is the only form that respects theme colours.

### PNG for structured data

`public/logo.png` (512 × 512, RGBA) is used exclusively in JSON-LD `Organization.logo` schema. Social platforms and search engines read this file for rich results.

### Monogram fallback

When no brand image is configured, the logo component falls back to a letter monogram (first letter of the site name). This is used for author avatars and byline badges.

### Usage rules

- **Never** alter the logo proportions, colours, or add effects.
- **Never** use a logo on a background that reduces contrast below 4.5:1.
- **Do** use the inline SVG on themed backgrounds; **do** use the PNG on neutral backgrounds for social sharing.
- **Do** respect the clear space around the mark — at least one logo-height on all sides.

## Brand canon enforcement

A unit test (`src/__tests__/brand-canon.test.ts`) scans all i18n dictionaries for the forbidden `Me2em` form. PRs that introduce it will fail the build.

## Terminology

For protocol terms, translations, and glossary entries, see [GLOSSARY.md](./GLOSSARY.md).
