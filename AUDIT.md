# Neraium 2.0 public website redesign

Review date: 2026-10-12. Local branch: `redesign/neraium-systemic-intelligence`.

## Implementation

- Retained plain HTML, CSS, SVG, vanilla JavaScript, and the static production build. No runtime dependencies, server endpoints, production bindings, or deployment services were added.
- Rebuilt the homepage, Platform, and Industries (`/applications`) with outcome-led copy, responsive editorial layouts, a conceptual equipment-relationship diagram, and labeled contextual infrastructure illustrations.
- Revised Company positioning around a horizontal infrastructure platform while retaining the repository-supported founder biography and LaunchLab affiliation. No customer validation, financial results, certifications, or performance claims were added.
- Presented Systemic Degradation Intelligence, Continuous Analytical Memory, and Operational Evidence Testing as intended capability direction; evidence testing is explicitly in development.
- Reworked shared navigation/footer, typography, color tokens, CTA hierarchy, and mobile layouts across the public experience. Kept methodology, evidence, evaluation, security, operator, privacy, and legacy pages available.
- Kept established canonical URLs and redirects. Added `/industries` as an alias for `/applications`, updated sitemap dates and primary-page social metadata, and replaced the legacy simulated-results social card with brand-only artwork.
- Improved contact draft handling with an accessible selectable-text fallback, safe text construction, explicit manual delivery, and stale-draft clearing. The site makes no transmission or delivery claim.
- Preserved navigation without JavaScript using a conditional fallback stylesheet. Normal cold loads do not incur a fallback-menu layout shift.

## Local validation

- Production build passed: 25 public asset entries copied and 11 image references validated.
- JavaScript syntax checks and `git diff --check` passed. The repository has no dedicated lint or typecheck configuration.
- Python site suite: 46 passed, covering metadata, local assets, clean-route anchors, navigation consistency, evidence boundaries, and deployment controls.
- Playwright: 459 passed across nine viewports from 320px to 1920px, covering all 11 indexable pages, form validation, draft fallback, HTML-like user text, no-JavaScript navigation, reduced motion, clean routes, legacy redirects, security headers, custom 404, and image loading.
- Axe WCAG A/AA scan: zero violations across 33 page/viewport combinations (390px, 768px, 1440px). The audit package was installed outside the repository for QA only.
- Local mobile Lighthouse: performance 99, accessibility 100, best practices 100, SEO 100. Largest contentful paint approximately 2.0s, cumulative layout shift 0, total blocking time 0ms. These are local synthetic checks, not field Core Web Vitals or product performance measurements.
- Reviewed desktop/mobile homepage, Platform, Company/founder, and inquiry layouts plus automated screenshots of every public page. Browser test artifacts remain ignored local files.

## Remaining review and launch dependencies

- Review product capability maturity and commercial copy with the product owner. Repository documentation supports the analytical approach, but does not establish externally validated customer outcomes or specific deployed connectors.
- Generated infrastructure imagery is explicitly labeled as illustration. Verified product captures and commissioned/licensed photographs would strengthen a later asset pass. Existing brand/portrait licensing documentation remains an asset-register requirement; see `ASSET_PROVENANCE.md`.
- The inquiry remains a user-sent email request to the existing `craig@neraium.com` address. Confirm mailbox operations before launch. Automatic intake requires approved delivery, server-side validation, abuse controls, rate limiting, retention, secrets configuration, and failure tests as documented in `README.md`.
- `npm ci` reported four pre-existing high-severity development-tool advisories in Wrangler/Miniflare, Sharp, and Undici. These tools are not included in the public static runtime; package inputs were preserved. Review and update the tooling separately before using affected tooling for release work.
- Production CDN/DNS consolidation and field performance were not examined or changed. No push, merge, deployment, live-data access, or production infrastructure changes occurred.

---

# Historical audit (retained for context)

# Neraium public website audit

Audit date: 2026-08-11

Audited source: current local `main` of `git@github.com:Neraium/Neraium-.git`

Production comparison: `https://www.neraium.com`

Deployment model: Cloudflare Workers Static Assets at `www.neraium.com`

## Production and repository baseline

The production HTML matched the repository baseline across the public routes at the start of this audit. The site was already a lightweight static implementation with clean deployment controls, dedicated product pages, disciplined claims, consistent dark navy/teal identity, and a transparent mail-draft contact path.

The existing structure already had distinct pages for Platform, Evidence, Applications, Evaluation, Methodology, Security, Company, Operator Brief, Contact, Privacy, and 404 handling. Metadata, canonical URLs, structured data, sitemap coverage, redirects, security headers, reduced-motion support, and foundational accessibility were also present.

## What was already strong and preserved

- Static HTML, CSS, SVG, and vanilla JavaScript architecture
- Cloudflare clean routes, redirects, security headers, and custom 404 behavior
- Read-only and outside-control-path operating boundaries
- Human-authority, uncertainty, and root-cause limitations
- Historical Evaluation as a lower-risk starting point
- EP-CHW-017 as a clearly illustrative evidence structure
- Official brand assets, founder information, and dark navy/teal identity
- Transparent `mailto:` inquiry mechanism with no fake server submission
- Existing URLs, sitemap routes, manifest, favicon, and security contact

## What was outdated or incomplete

- The product story was too close to telemetry-to-relationship-change-to-Evidence-Package.
- Baseline qualification, signal usability, data quality, operating context, multiscale persistence, provenance, continued comparison, and insufficient-evidence outcomes were not prominent enough.
- Evidence Packages carried too much of the category definition.
- The homepage lacked a concrete visual explanation of systemic change inside individual limits.
- Methodology was too brief for a technical buyer.
- Applications implied a broader market posture than the strongest current facility-infrastructure wedge justified.
- Several pages used uniform cards, oversized display type, small supporting text, and document-like layouts.
- The Operator Brief did not answer the practical operator questions directly enough.
- Contact behavior needed clearer loading, success, validation, and error states.
- Shared navigation did not expose Methodology despite its importance.

## Selective modernization implemented

- Reframed the homepage around establishing operating behavior before judging later change.
- Added a lightweight SVG/HTML chilled-water relationship artifact showing individual signals inside limits while power-to-flow behavior changes persistently.
- Replaced the generic three-step explanation with the seven-stage current product flow and two valid outcome branches.
- Made baseline learning, data readiness, comparable context, expected behavior, multiscale persistence, provenance, and limitations visible across Home, Platform, and Methodology.
- Positioned Evidence Packages as downstream analysis outputs and expanded the illustrative evidence artifact without fake precision.
- Added an explicit insufficient-evidence artifact and reinforced that absence of support is not proof of absence.
- Focused Applications on central plants, chilled water, pumping, water, resorts, and large facilities while defining broader fit by system characteristics rather than deployment claims.
- Clarified the read-only path alongside BAS, SCADA, historians, PLC-derived telemetry, CMMS workflows, operators, engineers, and maintenance teams without a return control arrow.
- Reworked Historical Evaluation around one system, one question, approved history, no initial live connection, and no guaranteed finding.
- Strengthened Security while retaining only already-supported customer-hosted language and explicitly declining unsupported certification claims.
- Rewrote the Operator Brief as five direct operational questions with printable styling.
- Preserved the contact mechanism while adding explicit public-form boundaries and visible interaction states.
- Consolidated the visual system in one stylesheet with refined type scale, spacing, restrained surfaces, evidence patterns, responsive recomposition, focus treatment, print rules, and reduced-motion behavior.
- Added a design manifest and project-local QA/visual-verification records under `.planning/`.

## Claims intentionally not added

No customers, deployments, logos, testimonials, partnerships, facility counts, savings, ROI, avoided failures, uptime, integrations, certifications, or unsupported security controls were added. The site does not present Neraium as predictive maintenance, autonomous control, an alarm replacement, a digital twin, an AI copilot, a dashboard product, or a root-cause engine.

## External actions still required

1. Deploy the revised `dist/` build and verify behavior on the production hostname.
2. Confirm apex/HTTP-to-`https://www.neraium.com` redirect rules in the Cloudflare account.
3. Request sitemap recrawling after deployment if search results retain older positioning.
4. Replace the mail-draft contact path only if a verified server-side intake service, privacy disclosure, retention policy, and delivery workflow are approved.
5. Document ownership or license evidence for retained repository image assets before making provenance claims.
