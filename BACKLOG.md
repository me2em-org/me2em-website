BL-1 
Очисти:
❯ grep -ri "hansmartensdev\|astro-rocket" src/ astro.config.mjs package.json
# Ожидание: пусто (упоминания в README донора — удаляются вместе с заменой)
src/__tests__/blog-urls-i18n.test.ts:    expect(getTagUrl('Astro Rocket', 'nl')).toBe('/nl/blog/tag/astro-rocket');
src/__tests__/blog-urls-i18n.test.ts:    expect(getTagUrl('Astro Rocket')).toBe('/blog/tag/astro-rocket');
src/__tests__/blog-urls.test.ts:    expect(getTagUrl('astro-rocket')).toBe('/blog/tag/astro-rocket');
src/__tests__/colour-themes.test.ts:      'src/content/blog/en/astro-rocket-configuration-guide.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/blog/en/astro-rocket-getting-started.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/projects/en/astro-rocket.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/blog/en/astro-rocket-configuration-guide.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/blog/en/astro-rocket-getting-started.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/projects/en/astro-rocket.mdx',
src/__tests__/colour-themes.test.ts:      'src/content/blog/en/astro-rocket-configuration-guide.mdx',
src/__tests__/post-links.test.ts:      post('en/astro-rocket-configuration-guide', 'configuration-guide', 'Config Guide'),
src/__tests__/post-links.test.ts:      slug: 'astro-rocket-configuration-guide',
src/__tests__/projects-urls-i18n.test.ts:    expect(getProjectUrl('en/astro-rocket')).toBe('/projects/astro-rocket');
src/__tests__/projects-urls-i18n.test.ts:    expect(getProjectUrl('en/astro-rocket', 'en')).toBe('/projects/astro-rocket');
src/__tests__/projects-urls-i18n.test.ts:    expect(getProjectUrl('nl/astro-rocket', 'nl')).toBe('/nl/projects/astro-rocket');
src/pages/components.astro:      <Button href="https://github.com/hansmartensdev/Astro-Rocket" target="_blank" class="hero-btn-learn">
src/pages/components.astro:                Are you sure you want to delete <strong class="text-foreground">astro-rocket-demo</strong>? All files, deployments, and analytics data will be permanently removed.
src/pages/components.astro:                    <h3 class="text-sm font-semibold text-foreground">astro-rocket-app</h3>
src/pages/components.astro:      <Button href="https://github.com/hansmartensdev/Astro-Rocket" target="_blank" class="hero-btn-brand">
src/i18n/en.json:              { "question": "Is Astro Rocket listed on the official Astro themes directory?", "answer": "Yes. <a href=\"https://astro.build/themes/details/astro-rocket/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline underline-offset-2 decoration-brand-500 hover:text-brand-400 transition-colors\">Astro Rocket</a> is listed on the official Astro themes directory as a free, production-ready theme." },
src/i18n/en.json:              { "question": "Where do I report bugs or suggest features?", "answer": "Open an issue or start a discussion on the <a href=\"https://github.com/hansmartensdev/astro-rocket\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline underline-offset-2 decoration-brand-500 hover:text-brand-400 transition-colors\">GitHub repository</a>. Contributions and feedback are alwayswelcome." }
src/i18n/nl.json:              { "question": "Staat Astro Rocket in de officiële Astro-themamap?", "answer": "Ja. <a href=\"https://astro.build/themes/details/astro-rocket/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline underline-offset-2 decoration-brand-500 hover:text-brand-400 transition-colors\">Astro Rocket</a> staat in de officiële Astro-themamap als een gratis, productieklaar thema." },
src/i18n/nl.json:              { "question": "Waar meld ik bugs of stel ik functies voor?", "answer": "Open een issue of start een discussie op de <a href=\"https://github.com/hansmartensdev/astro-rocket\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"underline underline-offset-2 decoration-brand-500 hover:text-brand-400 transition-colors\">GitHub-repository</a>. Bijdragen en feedback zijn altijd welkom." }
src/layouts/LandingLayout.astro:    cta={{ label: 'Astro Rocket', href: 'https://github.com/hansmartensdev/Astro-Rocket', icon: 'rocket', trailingIcon: 'download' }}
src/components/blog/BlogCta.astro:  'https://github.com/hansmartensdev/astro-rocket';
src/components/pages/views/AboutView.astro:const GITHUB_URL = 'https://github.com/hansmartensdev/astro-rocket';
src/components/pages/views/AboutView.astro:        slug="astro-rocket"
src/components/pages/views/HomeView.astro:const getStartedUrl = '/blog/astro-rocket-getting-started';
src/components/pages/views/HomeView.astro:      <Button size="lg" href="https://github.com/hansmartensdev/Astro-Rocket">
src/components/landing/Credibility.astro:  { cmd: 'git clone https://github.com/hansmartensdev/Astro-Rocket.git', desc: 'Clone the repository' },
src/components/landing/Credibility.astro:  { cmd: 'cd Astro-Rocket && pnpm install', desc: 'Install dependencies' },
src/components/landing/CTA.astro:    <Button variant="brand-outline" size="lg" href="https://github.com/hansmartensdev/Astro-Rocket#readme" target="_blank">
src/components/ui/marketing/TerminalDemo/TerminalDemo.tsx:  { text: '$ git clone https://github.com/hansmartensdev/Astro-Rocket.git', delay: 1200, type: 'command' },
src/components/ui/marketing/TerminalDemo/TerminalDemo.tsx:  { text: 'Cloning into \'Astro-Rocket\'...', delay: 300, type: 'prompt-hint' },
src/components/ui/marketing/TerminalDemo/TerminalDemo.tsx:  { text: '$ cd Astro-Rocket && pnpm install', delay: 600, type: 'command' },
src/lib/projects.ts: * get its URL slug (e.g. "en/astro-rocket" → "astro-rocket"). Mirrors
src/content/projects/en/astro-rocket.mdx:repo: "https://github.com/hansmartensdev/Astro-Rocket"
src/content/projects/en/astro-rocket.mdx:image: "../../../assets/projects/astro-rocket-hero-blue.jpg"
src/content/projects/en/astro-rocket.mdx:#    poster: "../../../assets/projects/astro-rocket-hero-blue.jpg"
src/content/projects/en/astro-rocket.mdx:  - src: "../../../assets/projects/astro-rocket-hero-blue.jpg"
src/content/projects/en/astro-rocket.mdx:  - src: "../../../assets/projects/astro-rocket-hero-purple.jpg"
src/content/projects/en/astro-rocket.mdx:  - src: "../../../assets/projects/astro-rocket-hero-teal.jpg"
src/content/projects/en/astro-rocket.mdx:I made it for the people I know best: designers, freelancers, and developers who want to build a beautiful website without starting from zero. It's MIT-licensed, [up on GitHub](https://github.com/hansmartensdev/Astro-Rocket), and listed on the [official Astro themes directory](https://astro.build/themes/details/astro-rocket/). The full thing runs live at [astrorocket.dev](https://astrorocket.dev).
src/content/projects/en/astro-rocket.mdx:- A layered [animation system](/blog/animations-in-astro-rocket) — scroll reveals, a scroll-reactive header, animated counters, the typed headline — all of it respecting reduced motion
src/content/projects/en/astro-rocket.mdx:This is the starting point I wish I'd had — already at 100 across the board, with the patterns I actually use built in. It's free, it's [on GitHub](https://github.com/hansmartensdev/Astro-Rocket), and if it saves you a week of setup, a star is the nicest way to say thanks.
src/content/blog/en/umami-analytics.mdx:tags: ["astro-rocket", "features", "analytics", "umami", "privacy"]
src/content/blog/en/umami-analytics.mdx:If you'd like to see the rest of what the theme includes, browse the [other feature posts](https://astrorocket.dev/blog) or grab the theme on [GitHub](https://github.com/hansmartensdev/astro-rocket).
src/content/blog/en/hero-typing-effect.mdx:tags: ["astro-rocket", "components", "customization", "tutorial", "javascript"]
src/content/blog/en/stack-marquee.mdx:tags: ["astro-rocket", "animation", "css", "components", "ux", "performance"]
src/content/blog/en/stack-marquee.mdx:For more on how the theme handles motion responsibly, see [Animations in Astro Rocket](/blog/animations-in-astro-rocket).
src/content/blog/en/stack-marquee.mdx:- [Animations in Astro Rocket](/blog/animations-in-astro-rocket) — the theme's approach to motion,performance, and reduced-motion.
src/content/blog/en/seo-in-astro-rocket.mdx:tags: ["astro-rocket", "seo", "structured-data", "tutorial", "configuration"]
src/content/blog/en/seo-in-astro-rocket.mdx:image: "../../../assets/blog/seo-in-astro-rocket.svg"
src/content/blog/en/seo-in-astro-rocket.mdx:svgSlug: "seo-in-astro-rocket"
src/content/blog/en/scroll-progress-bar.mdx:tags: ["astro-rocket", "features", "header", "ux"]
src/content/blog/en/animations-in-astro-rocket.mdx:tags: ["astro-rocket", "animation", "css", "ux", "performance"]
src/content/blog/en/animations-in-astro-rocket.mdx:image: "../../../assets/blog/animations-in-astro-rocket.svg"
src/content/blog/en/animations-in-astro-rocket.mdx:svgSlug: "animations-in-astro-rocket"
src/content/blog/en/animations-in-astro-rocket.mdx:[Astro Rocket](/projects/astro-rocket) ships a complete, layered animation system built entirely on CSS and a few dozen lines of JavaScript. No Framer Motion, no GSAP, no animation library of any kind. Every curve, every delay, every stagger is written by hand and tuned to feel like premium software.
src/content/blog/en/animations-in-astro-rocket.mdx:The full system lives in `src/styles/global.css`, and the observer script in `src/layouts/BaseLayout.astro`. See the [Astro Rocket project page](/projects/astro-rocket) for the full picture of what ships in the theme.
src/content/blog/en/project-gallery-video-slides.mdx:tags: ["astro-rocket", "features", "projects", "performance"]
src/content/blog/en/project-gallery-video-slides.mdx:`src/content/projects/en/astro-rocket.mdx` carries a ready-to-uncomment video slideas a starting point. Drop a file in `public/videos/`, point a slide at it, give it a poster — done.
src/content/blog/en/component-library.mdx:tags: ["astro-rocket", "components", "ui", "velocity"]
src/content/blog/en/design-system-color-tokens.mdx:tags: ["astro-rocket", "design-system", "tailwind", "customization", "tutorial"]
src/content/blog/en/i18n-in-astro-rocket.mdx:tags: ["astro-rocket", "i18n", "internationalization", "tutorial"]
src/content/blog/en/i18n-in-astro-rocket.mdx:image: "../../../assets/blog/i18n-in-astro-rocket.svg"
src/content/blog/en/i18n-in-astro-rocket.mdx:svgSlug: "i18n-in-astro-rocket"
src/content/blog/en/i18n-in-astro-rocket.mdx:If you want the broader picture of how the theme is structured first, the <PostLink uid="configuration-guide">configuration guide</PostLink> covers `site.config.ts`, themes, and layout switches; the [SEO post](/blog/seo-in-astro-rocket) covers everything in the `<head>` that i18n extends with `hreflang`.
src/content/blog/en/i18n-in-astro-rocket.mdx:This feature exists, and has matured, because the community asked. It started with [#207](https://github.com/hansmartensdev/Astro-Rocket/issues/207); the auto-loaded dictionaries, locale-validated schemas, non-English default locale, dictionary-driven pages, automatic blog and projects routing, and fully localized chrome all came from real-world reports and requests ([#414](https://github.com/hansmartensdev/Astro-Rocket/issues/414), [#415](https://github.com/hansmartensdev/Astro-Rocket/issues/415), [#418](https://github.com/hansmartensdev/Astro-Rocket/issues/418), [#419](https://github.com/hansmartensdev/Astro-Rocket/issues/419), [#422](https://github.com/hansmartensdev/Astro-Rocket/issues/422), [#437](https://github.com/hansmartensdev/Astro-Rocket/issues/437), [#438](https://github.com/hansmartensdev/Astro-Rocket/issues/438)). Thanks to everyone who filed them. If you build something with the i18n system and hit a rough edge, [open an issue](https://github.com/hansmartensdev/Astro-Rocket/issues) — the next iteration will come the same way.
src/content/blog/en/i18n-in-astro-rocket.mdx:For now: flip the flag, add your content in a second language, translate the dictionary, and ship it. The complete reference is in the [Internationalization (i18n) section of the README](https://github.com/hansmartensdev/Astro-Rocket#internationalization-i18n) — keep it open while you set up your second locale.
src/content/blog/en/updating-astro-rocket.mdx:tags: ["astro-rocket", "tutorial", "git", "maintenance"]
src/content/blog/en/updating-astro-rocket.mdx:image: "../../../assets/blog/updating-astro-rocket.svg"
src/content/blog/en/updating-astro-rocket.mdx:svgSlug: "updating-astro-rocket"
src/content/blog/en/updating-astro-rocket.mdx:git clone https://github.com/hansmartensdev/astro-rocket.git my-project
src/content/blog/en/updating-astro-rocket.mdx:git remote add upstream https://github.com/hansmartensdev/astro-rocket.git
src/content/blog/en/updating-astro-rocket.mdx:Every release is documented in [CHANGELOG.md](https://github.com/hansmartensdev/astro-rocket/blob/main/CHANGELOG.md). It's worth two minutes before you start, so nothing surprises you.
src/content/blog/en/updating-astro-rocket.mdx:If you hit a conflict you're unsure about, open an [issue on GitHub](https://github.com/hansmartensdev/astro-rocket/issues) with the file name and what it says — happy to help you work it out.
src/content/blog/en/youtube-embeds.mdx:tags: ["astro-rocket", "features", "components", "performance"]
src/content/blog/en/custom-logo-and-site-name.mdx:tags: ["astro-rocket", "branding", "logo", "customization"]
src/content/blog/en/custom-logo-and-site-name.mdx:Two lines of config get you a fully branded header and footer — your name, your logo, your colours. If Astro Rocket saved you time, a [star on GitHub](https://github.com/hansmartensdev/astro-rocket) helps other people find it.
src/content/blog/en/scroll-progress-ring.mdx:tags: ["astro-rocket", "features", "ux", "animation"]
src/content/blog/en/table-of-contents.mdx:tags: ["astro-rocket", "features", "blog", "navigation"]
src/content/blog/en/hero-scroll-indicator.mdx:tags: ["astro-rocket", "features", "ux", "animation"]
src/content/blog/en/giscus-comments.mdx:tags: ["astro-rocket", "features", "blog", "comments", "giscus", "cusdis", "artalk"]
src/content/blog/en/giscus-comments.mdx:> **Kept current.** This post originally covered only Giscus. Comments are now pluggable: Cusdiswas added first (a lightweight, optionally self-hosted widget), and Artalk followed as a fully self-hosted option — contributed by the community in [#469](https://github.com/hansmartensdev/astro-rocket/pull/469) for people who want to own and moderate every comment on infrastructure they control. The setup below reflects the current, three-provider system. If you're already on Giscus, nothing changed: `provider` defaults to `'giscus'`.
src/content/blog/en/astro-rocket-configuration-guide.mdx:tags: ["astro-rocket", "configuration", "customization", "themes"]
src/content/blog/en/astro-rocket-configuration-guide.mdx:image: "../../../assets/blog/astro-rocket-configuration-guide.svg"
src/content/blog/en/astro-rocket-configuration-guide.mdx:svgSlug: "astro-rocket-configuration-guide"
src/content/blog/en/astro-rocket-configuration-guide.mdx:If you like Astro Rocket, a [star on GitHub](https://github.com/hansmartensdev/astro-rocket) helps other developers find it. Takes two seconds.
src/content/blog/en/colour-mode-system.mdx:tags: ["astro-rocket", "dark-mode", "design-system", "ux", "tutorial"]
src/content/blog/en/astro-rocket-getting-started.mdx:tags: ["astro-rocket", "getting-started", "configuration", "vercel"]
src/content/blog/en/astro-rocket-getting-started.mdx:image: "../../../assets/blog/astro-rocket-getting-started.svg"
src/content/blog/en/astro-rocket-getting-started.mdx:svgSlug: "astro-rocket-getting-started"
src/content/blog/en/astro-rocket-getting-started.mdx:git clone https://github.com/hansmartensdev/astro-rocket my-site
src/content/blog/en/astro-rocket-getting-started.mdx:If Astro Rocket saved you time, a [star on GitHub](https://github.com/hansmartensdev/astro-rocket) helps other developers find it. Takes two seconds.
src/content/blog/en/independent-footer-menu.mdx:tags: ["astro-rocket", "features", "footer", "navigation"]
src/content/blog/en/letter-glitch-astro-7.mdx:tags: ["astro-rocket", "astro", "react", "canvas", "tutorial"]
src/content/blog/en/newsletter-signup.mdx:tags: ["astro-rocket", "features", "newsletter", "resend", "forms"]
src/content/blog/en/footer-layouts.mdx:tags: ["astro-rocket", "features", "footer", "navigation", "customization"]
src/content/blog/en/contact-form-resend-setup.mdx:tags: ["astro-rocket", "tutorial", "email", "vercel", "deployment"]
src/config/nav.config.ts:  { label: 'GitHub', href: 'https://github.com/hansmartensdev/Astro-Rocket', order: 6, external: true },
src/config/nav.config.ts:      { label: 'GitHub', href: 'https://github.com/hansmartensdev/Astro-Rocket', external: true },
src/config/nav.config.ts:      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hansmartensdev', external: true },
src/config/nav.config.ts:      { label: 'Bluesky', href: 'https://bsky.app/profile/hansmartensdev.bsky.social', external: true },
src/config/site.config.ts:    'https://github.com/hansmartensdev',
src/config/site.config.ts:    'https://www.linkedin.com/in/hansmartensdev',
src/config/site.config.ts:    'https://bsky.app/profile/hansmartensdev.bsky.social',
package.json:  "name": "astro-rocket",
package.json:    "url": "https://github.com/hansmartensdev/astro-rocket"
package.json:  "homepage": "https://github.com/hansmartensdev/astro-rocket#readme",
package.json:    "url": "https://github.com/hansmartensdev/astro-rocket/issues"

