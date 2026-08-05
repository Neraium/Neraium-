# Neraium public website audit and redesign notes

## Current architecture audited before changes
- Framework and build system: static HTML/CSS/JavaScript site served directly from the repository root. Netlify publishes `.` with no bundler or framework replacement.
- Page and component structure: flat root HTML pages with repeated header, footer, hero, cards, forms, and content sections. Routes were `index.html`, `platform.html`, `technical.html`, `pilot.html`, `methodology.html`, `security.html`, `operator-brief.html`, `contact.html`, and `404.html`.
- Deployment configuration: `netlify.toml` defines the publish directory, security headers, cache headers, and a catch-all 404 redirect. This was preserved.
- Fonts and tokens: previous site used Manrope plus Cormorant Garamond, dark backgrounds, gold accents, and dashboard-oriented tokens in `styles.css`.
- Color palette: previous palette was near-black, deep surfaces, warm gold, muted blue-gray data colors, and dark-grid effects. It read as a dark product UI rather than a restrained infrastructure company site.
- Images and media: existing local assets included logo/icon files, founder imagery, infrastructure images, diagrams, product preview image, and `sample-finding-pack.pdf`. No external hotlinks were present.
- Responsive behavior: CSS had mobile navigation and responsive grids, but the dark hero/product UI could feel dense on small screens.
- Accessibility issues: repeated page fragments were mostly semantic, but small uppercase navigation, dark contrast combinations, and complex dashboard examples created readability risk.
- Performance issues: static site is lightweight. Main risks were large JPEGs, externally loaded fonts, and no build-time responsive image pipeline.
- SEO metadata: each page had titles, descriptions, Open Graph metadata, canonical links, sitemap and robots coverage. Metadata was updated, not removed.
- Forms and external links: contact form used Netlify form attributes, a honeypot, JavaScript validation, analytics events, and mailto fallback. LinkedIn was the main external profile link.
- Duplicated or outdated copy: previous pages repeated read-only/pilot-review messaging and used “pilot” more prominently than the requested Historical Evaluation framing.
- Unused components and assets: legacy page-specific components existed in the CSS. The overhaul consolidated the public presentation into a reusable editorial system while preserving routes and assets.
- Product accuracy: the previous site was close on read-only relationship-change language but did not fully communicate systemic infrastructure intelligence, Evidence Packages, uncertainty boundaries, security distinctions, or cross-industry applications.

## Image source and license plan
- The redesign uses only assets already stored in this repository and treats them as project-provided assets. No third-party images were downloaded or hotlinked.
- `/assets/images/infra-bg-1.jpg`, `/assets/images/infra-bg-2.jpg`, and `/assets/images/diagram-threshold-vs-relationships.jpg` are used as local infrastructure/diagram visuals with descriptive alt text.
- Because the environment did not provide provenance metadata for existing photos, no new external license claims were added. Recommended follow-up: add an `ASSET_LICENSES.md` file with ownership, photographer, source URL, and license terms for each committed image.

## Follow-up implementation review
- GitHub remote was restored to `https://github.com/Neraium/Neraium-.git`.
- The previous one-line stylesheet was reformatted into maintainable source CSS with section comments, readable component blocks, and reusable design tokens.
- Public routes were reviewed and kept as distinct pages rather than thin duplicates: homepage narrative, platform architecture, applications, Historical Evaluation, methodology, security, operator brief, and contact.
- The requested source-of-truth comparison against `Neraium/Neraium` was attempted, but that repository is not present in this workspace and remote access to `https://github.com/Neraium/Neraium.git` returned HTTP 403. Claims were therefore tightened to avoid representing deployment-dependent controls or integrations as implemented facts.
- Security, deployment, isolation, encryption, audit logging, customer-controlled hosting, and single-tenant operation are labeled as deployment-dependent or not claimed unless confirmed per deployment.
