# Changelog

## Unreleased

- Full interactive Sandbox (ported from the me2em-demo app): after the existing seed step, six live protocol scenarios run on real `@me2em/*` cryptography — Human (multi-context identity), Satellite tasking marketplace, AI Agent mandate & revocation (UC-1), EV charging network (UC-2), Multi-App SSO (UC-4) and Agent Commerce with the x402 paid-API loop (UC-7).
- The Sandbox page copies moved out of the site-wide dictionaries into a dedicated sandbox i18n module (`src/i18n/sandbox/<locale>.json`, top-level `sandbox.*` namespace) merged by the i18n loader; per-locale parity is enforced by tests.
- `@me2em/*` packages upgraded from the alpha line (react 0.1.0-alpha.2) to the rc line (core 1.0.0-rc.8, crypto 1.1.0-rc.2, react 1.0.0-rc.4, solana 1.1.0-rc.1, x402 1.0.0-rc.1); `@scure/base` added as a direct dependency.
- New Crypto Operation Log panel renders the protocol operations each scenario emits; the six placeholder scenario cards became functional tabs.

## 0.2.0 — 2026-10-29

- Completed the blog translation campaign: every post is available in English, Russian, and Chinese, with zh terminology aligned to the glossary.
- New About page: mission hero, Brand Canon, and Terms of Use.
- Community page restructured: Expertise and the merged, fully localized FAQ (6 items) moved there; About gained a CTA strip with key channels.
- FAQ revision: maintenance described as volunteer-driven under the me2em-org organization; new question on code/name/logo usage terms; package documentation links (core/crypto/react.me2em.com); Brand Guidelines linked.
- Community channels: general contact email hello@me2em.com added.
- UI polish: contributor profile URL served from i18n; per-channel CTA icons on the About CTA strip.

## 0.1.0 — 2026-10-22

Initial release of the Me2em website.

- Removed the newsletter subscription feature and Resend integration (footer form, API route, email module, i18n keys, env vars, dependency).
- Rebranded from Astro Rocket by Hans Martens (MIT) — see the Credits section in README.
- Locales: English (default, no prefix), Russian (`/ru/`), Chinese (`/zh/`).
- Built for the Me2em protocol: one seed → an Identity, many Handles, stateless sessions.
