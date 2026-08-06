# Neraium public website

This repository contains Neraium's static public website. The source is plain HTML, CSS, and JavaScript; the production build validates local assets and copies deployable files to `dist/`.

## Public pages

- `index.html` - concise company and product overview
- `platform.html` - analysis approach and operating boundary
- `evidence.html` - illustrative Evidence Package
- `technical.html` - representative applications and initial market focus
- `pilot.html` - Historical Evaluation scope and process
- `methodology.html` - evaluation methodology
- `security.html` - security and deployment boundaries
- `company.html` - mission, principles, founder, and company process
- `operator-brief.html` - one-page evaluation brief
- `contact.html` - low-friction evaluation inquiry
- `privacy.html` and `404.html` - privacy and not-found pages

The contact page prepares a draft in the visitor's email application. It does not transmit form contents to the website and must not be used to send operational data. A server-side intake service is not configured.

## Deployment and indexing

- `wrangler.jsonc` configures Cloudflare Workers Static Assets, clean HTML URLs, and the custom 404 page.
- `_redirects` preserves legacy `.html` and retired public routes.
- `_headers` defines production security and cache headers.
- `netlify.toml` publishes the built `dist/` directory if Netlify is used instead.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, and `.well-known/security.txt` provide crawler and site metadata.

The site uses `https://www.neraium.com` as its canonical origin. Apex, `www`, and HTTP consolidation must also be enforced at the DNS/CDN account level; that redirect cannot be expressed for another hostname in a Workers Static Assets `_redirects` file.

## Local development

Install dependencies and build:

```bash
npm ci
npm run build
```

Run the production build through Cloudflare's local Static Assets runtime:

```bash
npm run preview
```

## Verification

```bash
python3 -m unittest discover -s tests
npm test
```

The Python suite checks content contracts, links, assets, metadata, accessibility basics, sitemap coverage, and deployment files. Playwright runs against Wrangler's Static Assets runtime so clean URLs, redirects, headers, the nested custom 404, interaction, responsive layout, navigation, and screenshots are exercised across the configured viewports.
