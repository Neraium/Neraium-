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
