# Neraium public website

This repository contains Neraium's static public website. The source remains plain HTML, CSS, SVG, and vanilla JavaScript; the production build validates local assets and copies deployable files to `dist/`.

Neraium is presented as Systemic Infrastructure Intelligence: read-only analysis that establishes expected operating behavior from approved telemetry, compares later behavior under relevant context, and preserves evidence, uncertainty, provenance, and limitations for human engineering review.

## Public pages

- `index.html` - outcome-led overview, conceptual relationship visualization, and initial industry focus
- `platform.html` - architecture, Neraium 2.0 capability direction, integration approach, and operating boundary
- `methodology.html` - baseline learning, context, multiscale persistence, evidence construction, and valid outcomes
- `evidence.html` - illustrative finding and explicit insufficient-evidence result
- `applications.html` - municipal water/wastewater, Las Vegas hospitality, and broader intended infrastructure applications (visitor-facing Industries)
- `technical.html` - preserved legacy redirect to Applications/Industries
- `pilot.html` - bounded Historical Evaluation scope and process
- `security.html` - read-only architecture, least privilege, and deployment boundaries
- `operator-brief.html` - concise, printable guidance for operators and engineering leaders
- `company.html` - mission, principles, and founder information
- `contact.html` - low-risk evaluation inquiry
- `privacy.html` and `404.html` - privacy and not-found pages

The contact page prepares a draft for the visitor’s email application, with a selectable-text fallback for webmail users. It explicitly requires the visitor to send the email. Editing any field clears the previous draft. It does not transmit form contents to the website and must not be used to send operational data, credentials, telemetry, diagrams, network information, files, or sensitive system details.

### Why the inquiry remains email-based

The current Cloudflare deployment serves static assets only. It has no approved outbound-email or storage binding, abuse challenge, rate-limit binding, or retention policy for public submissions. A server endpoint is therefore intentionally not present: the site must not imply that a request was delivered when there is no configured delivery path.

A future server-side intake would require all of the following before the form is switched away from `mailto:`:

- a Cloudflare Worker entry module and same-origin POST route;
- an account-configured delivery destination, such as an approved Send Email binding or reviewed form processor;
- server-side field allowlisting, validation, and the current length limits;
- Cloudflare Turnstile and rate limiting, with the required account-level bindings and secrets;
- explicit retention, deletion, access, and failure-handling decisions reflected on the Privacy page;
- tests for validation, abuse handling, redacted logs, delivery failure, and accessible success/error states.

Do not commit Turnstile secrets, provider credentials, destination tokens, or production binding identifiers. Configure them through Cloudflare secrets and environment-specific bindings when an intake service is approved.

## Deployment and indexing

- `wrangler.jsonc` configures Cloudflare Workers Static Assets, clean HTML URLs, and the custom 404 page.
- `_redirects` preserves legacy `.html` and retired public routes.
- `_headers` defines production security and cache headers.
- `netlify.toml` publishes the built `dist/` directory if Netlify is used instead.
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, and `.well-known/security.txt` provide crawler and site metadata.

The canonical origin is `https://www.neraium.com`. Apex, `www`, and HTTP consolidation must also be enforced at the DNS/CDN account level.

## Local development

```bash
npm ci
npm run build
npm run preview
```

## Verification

```bash
python3 -m unittest discover -s tests -v
npm test
```

The Python suite checks product-positioning contracts, links, assets, metadata, accessibility basics, sitemap coverage, and deployment files. Playwright runs against Wrangler's Static Assets runtime to exercise clean URLs, redirects, headers, the nested custom 404, interactions, responsive layouts, navigation, console behavior, and screenshots across configured viewports.

## Neraium 2.0 redesign

The 2026-10-12 redesign keeps the static stack, established canonicals, deployment integrations, security headers, and deeper technical documents. Public navigation labels `/applications` as Industries; `/industries` redirects to that established route. Technical resources are grouped in the footer.

Capability names describe the intended Neraium 2.0 analytical direction, grounded in the repository’s methodology. Operational Evidence Testing is explicitly a development direction. The site does not present customer validation or measured performance outcomes.

Infrastructure visuals are existing generated illustrations and are labeled as such. The social preview is brand-only code-rendered artwork; regenerate it with `node scripts/generate-social-preview.mjs` (requires the development Playwright browser). See `ASSET_PROVENANCE.md` for source records and remaining asset requirements.

The continuation adds a code-native, accessible relationship illustration on Home and Platform, plus bounded evaluation examples for municipal water/wastewater and Las Vegas hospitality. The curves contain no measured values and are explicitly distinguished from a product screenshot or diagnostic conclusion. Industry inquiry links use `/contact?sector=water` and `/contact?sector=hospitality`; only these recognized labels initialize the editable system field. Unknown parameters are ignored, and direct contact and no-JavaScript email paths remain available.

The existing test suite was updated for the revised copy and composition. Browser tests now also cover selectable email text, safe handling of HTML-like entries, stale draft clearing, and navigation without JavaScript. There is no dedicated linter or typechecking configuration; the public runtime is vanilla JavaScript.

See `AUDIT.md` for local validation results and remaining launch dependencies. No deployment is part of this redesign workflow.
