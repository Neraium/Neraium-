# Neraium website — Phase 2 audit and implementation

Audit date: 2026-10-12. Website repository baseline: `ac774b1` (`main`). Work branch: `codex/neraium-phase-2`.

## Repository and live-site audit

Inspected root repository status, local and remote branch inventory, recent eight commits, public HTML pages, shared CSS/JavaScript, assets/provenance, build pipeline, Worker/Netlify settings, redirects, headers, sitemap, and both existing test suites. The only pre-existing uncommitted item was an untracked nested `Neraium-/` directory. It remains untouched and excluded from the commit. Previous work on branding, imagery, read-only boundaries, historical evaluation, evidence, navigation, and deployment controls was preserved where useful.

Live `https://neraium.com` was loaded in Chromium at 1440×1000, 768×1024, and 390×844. Before screenshots covered Home, Platform, Methodology, Applications, Evaluation, Company, Evidence, Security, Operator Brief, Contact, and Privacy. Browser tooling was available through the repository’s installed Playwright tooling. No production writes or customer submissions were performed.

The live homepage matched the root baseline’s visible narrative: “Know when the system stops behaving like itself,” facility-system relationship analysis, a large illustrative chilled-water chart, repeated dark sections, and email-draft conversion. The site technically named Systemic Infrastructure Intelligence but did not make its horizontal scope or the two commercial beachheads clear enough.

Primary weaknesses:

- The main promise required visitors to translate abstract system-behavior language into business value.
- Long supporting copy and boundary badges competed with the primary message.
- A chart resembling an application interface dominated the first impression.
- Repetitive cards and similar dark sections flattened hierarchy.
- Applications focused on equipment categories rather than distinct municipal and hospitality buying contexts.
- Platform lacked the integrated 2.0 capability narrative and explicit newer-capability maturity.
- The footer duplicated most navigation and technical routes.
- Contact required five practical fields and could only prepare a mail draft.
- The old Open Graph image retained a simulated dashboard with numerical timing, evidence counts, and “after repair” language. It was unsuitable for the revised claims boundary.

## Technical claims review

Read-only inspection of adjacent engineering repositories supplied the implementation evidence absent from the website checkout. No secrets, production systems, customer datasets, or operational telemetry were accessed. No tests in those repositories were rerun and no product production qualification was performed. The following source documents were read as implementation records, not proof of current live deployment.

Inspected checkout identities:

- `Neraium-1.0`: `8049aabf40e76f69fc3ebee99d7f1c7932c7f1e3`.
- `Neraium-2-integration`: `c4060a14074f403b07011c2191bf485132c504d2`.

| Website subject | Engineering source | Public boundary applied |
| --- | --- | --- |
| Systemic relationship assessment | `Neraium-1.0/docs/sii_architecture.md`; authoritative `backend/app/engine/sii_engine.py` call path | Persistent relationship change, like-mode/context assessment, data quality, supported time horizons. Behavioral change does not independently establish physical degradation or cause. |
| Analytical memory foundations | Architecture Phase 4 behavioral-model/store, graph, snapshot and event-memory contracts | Describe retained versioned models and evidence, not universal continuous live service. |
| New Continuous Analytical Memory integration | `Neraium-2-integration/docs/design/m2-analytical-memory.md`, `m8-resolution-20261010.md`, `m8-authoritative-candidate-20261010.md` | New durable continuation and assessment-lifecycle integration is in development and not production-qualified. No established recovery confirmation or uninterrupted live-memory claim. |
| Operational Evidence Testing | `Neraium-2-integration/research/pcs/README.md`, `research/pcs/oet/NATIVE_INTEGRATION_STATUS.md` | Exploratory, read-only evidence testing. Authentic authorized inputs, native positive-path integration, and physical/context policies remain dependencies. Customer-facing name is Operational Evidence Testing. |
| Cross-system relationships | SII architecture and `docs/SII_AUTHORITY_BOUNDARIES.md` | Connected relationships within an approved analysis scope; no cross-facility, fleet, causal propagation, or universal integration claim. |
| Traceability and qualification | `docs/PRODUCT_EVIDENCE_BOUNDARY.md`, `docs/EVIDENCE_PACKAGE_V1.md`, authority boundaries | Source windows, methods, evidence support, limitations, and explicit insufficient evidence. No diagnosis, prescribed repairs, or exact failure prediction. |
| Measurable consequence | `docs/CONSEQUENCE_QUANTIFICATION.md` | Conditional on exact resource mapping, units, supported context and timestamps. No public numbers, monetary savings, or guaranteed cost avoidance. |
| Connectivity | `docs/TELEMETRY_CONNECTIONS.md`, `docs/data_connectors.md`, existing historical-evaluation boundaries | Approved historical exports first; later connectivity scoped during evaluation, not guaranteed plug-and-play integration. |

The M8 records explicitly state NOT QUALIFIED and do not establish a live integrated M1→M2→M7 production chain. The website therefore separates current analytical foundations from the new integrated development paths. Security operational certification does not substitute for analytical qualification.

NVIDIA Inception, AWS Activate, and Innovation Henderson LaunchLab are presented as program participation, based on the owner’s supplied verified affiliations and the existing LaunchLab repository record. No investor, product endorsement, certification, customer validation, Zero Labs selection, partnership, deployment, or validated evaluation-result claim was added. No supported pricing record was found, so pricing advantages and numerical prices are not asserted.

## Implemented experience

Home now leads with the owner’s requested “See degradation before systems fail” positioning and a documented representative central-plant image. A concise problem statement, conceptual relationship diagram, four differentiation rows, two commercial application paths, operational-value section, and focused evaluation conversion replace the prior chart and repeated lifecycle/evidence explanations.

Platform presents telemetry → qualified reference → contextual persistent assessment → traceable evidence as one architecture. Capability maturity is visible alongside each detailed description. Methodology and Evidence retain the deeper technical material for interested readers.

Applications now leads to three dedicated pages: Municipal Water & Wastewater, Las Vegas Hospitality & Resorts, and Broader Infrastructure. Each uses specific relationships, an illustrative review question, operational relevance, suitability limits, and a context-prefilled inquiry link.

Company has a simpler purpose, authentic unchanged founder portrait, approved existing biographical context, program-participation presentation, and links to technical evidence. Shared styling introduces navy/near-black foundations, aqua accents, larger readable text, restrained transitions, light editorial sections, spacious compositions, and responsive recomposition. Existing logo assets are untouched. Mobile diagrams use readable HTML rather than miniature SVG labels.

All public pages receive consistent typography, navigation/footer styling, metadata cache versions, and a new 1200×630 infrastructure/brand social image without simulated results. The footer is reduced to six essential links. Operator guidance, security, evidence, and evaluation routes remain available through relevant pages.

## Conversion implementation

Four required fields, optional review question, accessible labels, autofill, validation, focused live status messages, direct email fallback, and prefilled industry context reduce inquiry friction.

A Cloudflare Worker implements configuration discovery and same-origin server intake. It requires an approved retention attestation, native restricted email binding, Turnstile site/secret keys, rate-limiter binding, sending identity, recipient, allowed hostnames, and enable flag. It enforces field allowlisting, body-size bounds, validation, honeypot, origin, edge-IP rate limiting, challenge hostname/action verification, and confirmed provider acceptance. It logs no submitted contents or secrets and adds no submission database.

The committed configuration leaves online intake disabled. A public visitor sees an honest email-draft workflow until dependencies are complete. Email-service acceptance is explicitly distinguished from inbox receipt. No fake submission success, unapproved third-party form service, or production infrastructure change occurred. Exact activation requirements and real-delivery verification steps are in README.

## Verification evidence

- Production static build passes; public assets are allowlisted and image signatures validated.
- Worker dry-run bundles successfully without deployment.
- 46 Python contracts pass: metadata, links, assets, sitemap, headings, positioning/maturity, preserved technical evidence, deployment rules, branding, and form structure.
- 22 Node server tests pass: dependency gates, valid acceptance, field/type/length validation, injection, unknown fields, honeypot, malformed/oversized body, origin, rate limits, challenge failures, provider failures, and missing acknowledgement.
- 576 Playwright tests pass across 320, 375, 390, 402, 430, 768, 1024, 1440, and 1920px viewports. Coverage includes all 14 primary public pages plus nested 404, keyboard navigation, mobile-menu focus, responsive overflow, image loading, metadata, errors, routing/security controls, draft conversion, mocked online success/failure, and industry-prefilled context.
- Desktop, mobile, and tablet full-page screenshots were captured and visually inspected for every major page. A mobile headline whitespace issue, unreadable small diagram labels, and a tablet security-connector overlap were corrected.
- Local mobile Lighthouse: Home 99 performance / 100 accessibility / 100 best practices / 100 SEO; Platform and Contact 100 in all four categories; Water & Wastewater 99 / 100 / 100 / 100. These are local lab results, not field-performance guarantees. Small image-compression/responsive-size and stylesheet suggestions remain; no blocking audit defect was found.
- After the social-metadata update and tablet connector fix, 189 focused browser checks passed, including every page’s metadata/error checks and the contact and security workflows. The corrected tablet diagram was inspected again.
- JavaScript syntax checks and `git diff --check` pass. No lint or application TypeScript configuration exists.
- Dependency audit is clean after updating Wrangler and its Undici override; no runtime dependency was added.

An early browser run was interrupted by rebuilding the served `dist/` directory during tests, causing transient missing-asset responses. The suite was rerun against a stable build and all 576 tests passed. README records that builds must not run concurrently with browser verification.

Screenshots and detailed test/Lighthouse artifacts remain locally under `playwright-screenshots/`, `playwright-report/`, and `/tmp/neraium-phase2/`. They are intentionally not deployed as public assets.

## Remaining external dependencies

Online intake requires the configuration and mailbox/privacy decisions in README plus staging verification of real challenge and email delivery. No credentials or production binding IDs were invented. New 2.0 memory integration and Operational Evidence Testing require their engineering qualification gates before stronger public claims. Existing founder/logo ownership documentation should remain in the owner’s asset register. Cloudflare account-level hostname redirects and any production rollout remain outside this task.

The implementation is ready for human design/code review. The website can be deployed with the disclosed email-draft path; online lead delivery is not ready for activation until the documented dependencies are satisfied. Nothing was pushed, merged, or deployed.

## Final pre-deployment review (2026-10-12)

The untracked nested `Neraium-/` directory is an independent clone of the same upstream, created before Phase 2 root work. Its reflog records the clone from the repository URL and two subsequent local commits on `redesign/neraium-systemic-intelligence`: `401ee51` and `2e18a9f`. It has a clean inner working tree, distinct page implementations, and three tracked files absent from the root checkout. It is not redundant and was preserved. The root build allowlist excludes the nested directory and its Git metadata.

The remaining background preview was a stale root-checkout npm/Wrangler process group (739293), with no listening preview endpoint at review time. Graceful termination stopped its npm wrapper; its stalled Wrangler children required targeted termination. No production service was involved.

Desktop/mobile page screenshots and the corrected security diagram were reviewed again. No new visual defect was found. Public page claims continue to distinguish evidence from physical diagnosis, current analytical foundations from unqualified 2.0 integration, and program participation from endorsements or validated deployments. Affiliations rely on the owner's supplied verification; membership records are not independently archived here.

One genuine packaging defect was found: the unlinked legacy `sample-finding-pack.pdf` included restriction/blockage inference and inspection recommendations without a clearly illustrative evidence boundary. The retired `neraium-brand-preview.png` also contained simulated timing/count/recovery statements. Both source artifacts are retained for historical preservation but are now excluded from deployment output. Neither has an active HTML reference. A deployment regression checks their exclusion and preservation of the replacement social image.

All required page, image, routing, header, and Worker source files are tracked. Cloudflare's documented structured Email Service interface matches the handler, but actual account access/onboarding, sender/recipient, bindings, Turnstile credentials, retention decision, and real delivery still require owner configuration and staging verification. Keep `CONTACT_ENABLED=false` for a deployment using the email-draft path. Deploy the Worker plus its static assets from the root checkout; a `dist/`-only upload will not provide the API.

The existing CI workflow runs on PRs to main, but direct pushes to `codex/**` do not trigger it. It currently does not include the new standalone server suite or syntax check; run those explicitly during release verification. No remote CI, account inspection, push, merge, or deployment was performed during this review.

Final review verification: 576 browser tests passed before the packaging-only correction; all 47 static checks and 18 focused routing/artifact checks passed afterward. The 22 unchanged contact-handler tests, syntax checks, clean dependency audit, and final local Worker dry-run passed. Every emitted public file is tracked, and both Worker modules are tracked. The retired PDF/social graphic return 404 in Wrangler while the current social JPEG remains accessible. No webpage design was changed in this review.

## Staging preparation (2026-10-12)

Repository production target is Worker `website`; canonical hostname is `www.neraium.com`, and production deployment uses `npm run deploy`. The CI file performs tests, not deployment. Live production was probed read-only in Chromium and returned HTTP 200 with the Neraium page title; command-line HTTP probes were blocked with Cloudflare HTTP 403. No production configuration was changed. Authenticated account-level project/domain mapping and deployment triggers remain unverified.

Wrangler `whoami` reports unauthenticated, and the usual Cloudflare API-token/account environment variables are absent. No remote staging deployment, account creation, temporary account, push, merge, or production infrastructure operation was attempted. Remote staging is blocked by existing-account authentication and target verification.

A standalone `wrangler.staging.jsonc` targets `neraium-phase2-staging-1f2b51c`, with no custom routes, no shared service/delivery/storage bindings, and both contact and retention flags false. Preparation pins the website content and Worker files to release `1f2b51c312e299f590c5d79338ca0a2e7a67178c`; all 61 static inputs and both Worker modules were verified by hash. Only staging crawling/noindex behavior differs. Nine deliberately unsafe staging configurations were rejected before package generation, covering production name/routes, contact enablement, service/email bindings, asset path, runtime date, main module, and Workers.dev behavior.

The complete local suite passed: build, JavaScript syntax, 47 static tests, 22 server tests, 585 browser tests, clean dependency audit, and staging Worker dry-run. Local staging verification covers 14 routes across three viewports, assets, security/noindex headers, redirects, 404s, and email-draft conversion without sending inquiries. Deployment artifacts and verification records remain outside the public directory under `artifacts/staging/`. README contains the exact staging-only deployment and verification commands, manual account requirements, and the separately authorized production-release sequence.

## Website visual and product experience refinement (2026-10-12)

The production site and the local baseline were rendered read-only at 1440×1000, 768×1024, and 390×844 for Home, Platform, Methodology, Evidence, Applications, Water & Wastewater, Hospitality, Broader Infrastructure, Company, and Contact. Before screenshots showed repetitive heading/copy compositions, equal-weight industry grids, an undersized product comparison, excessive separation between Company purpose and leadership, and tall industry-image crops driven by fixed HTML dimensions. The source asset register and a visual inventory were also reviewed; there is no approved current product interface screenshot to publish.

The existing implementation was refined rather than replaced:

- Home retains “See degradation before systems fail.” A larger headline overlaps a controlled photographic composition. A larger illustrative evidence review pairs the qualitative comparison with keyboard-accessible evidence and limitation disclosures. Infrastructure imagery uses an asymmetric composition instead of identical tiles.
- Platform replaces the small generic relationship diagram with an architecture view linking approved telemetry/context, systemic analysis, analytical memory, evidence testing, and qualified findings. Current foundations, developing integration, and exploratory work remain explicitly distinguished. The detailed capability explanations and their qualification boundaries remain below it.
- Company combines the purpose copy with its opening, removes the redundant “Our purpose” section heading, and gives the unchanged founder portrait and leadership copy a stronger light-surface treatment. Original affiliations and the program-participation disclosure are preserved; repeated provider names are removed.
- Applications uses alternating image/text compositions. The dedicated industry pages use landscape crops and responsive image sources. Methodology drops four redundant boundary slogans while retaining the seven-step sequence and detailed engineering explanations. Evidence retains its full walkthrough.
- Shared header, type scale, spacing, buttons, and footer are refined. Other pages receive the same stylesheet cache revision, without rewriting their content. No new dependency, external font request, raster asset, or animation is added.

Visual correction passes removed an overlapping chart annotation, restored a full-width founder presentation on phones, and corrected industry image heights. Final desktop/tablet/mobile screenshots were inspected in addition to automated testing. Detail-only captures temporarily hide the sticky header/skip link through the screenshot harness to avoid capture artifacts; the opening/full-page captures retain the actual site chrome. CSP and website runtime behavior are unchanged.

Contact JavaScript, Worker modules, production/staging Wrangler configuration, and original founder/logo assets were checked byte-for-byte against baseline commit `f0c3455`. Contact HTML changes only its shared stylesheet URL. `CONTACT_ENABLED` remains `false`; no email-provider, dashboard, DNS, route, binding, credential, or deployment change was made. The existing unrelated untracked `Neraium-/` directory is preserved.

Validation passed: production build, JavaScript syntax checks, 48 repository tests, 24 contact-service tests, all 684 browser tests across nine viewport sizes (320–1920px), and Wrangler production dry-run. Existing checks cover clean routes, redirects, canonical/structured metadata, headers, images, keyboard navigation, responsive overflow, contact states, and release identity. The product review test now also opens limitations with the keyboard before following the full Evidence walkthrough.

Local Lighthouse homepage scores (performance / accessibility / best practices / SEO): desktop **100 / 100 / 100 / 100**; mobile **99 / 100 / 100 / 100**. These are local laboratory checks, not production measurements. The review package identifies build `neraium-8e987d5cf795ea49`.

Review artifacts are intentionally outside the public build and ignored by Git:

- `artifacts/visual-refinement/before/local/` — local baseline screenshots.
- `artifacts/visual-refinement/before/live/` — actual production screenshots.
- `artifacts/visual-refinement/after/` — final local screenshots, including opening, full-page, product, architecture, founder, and mobile navigation views.
- `artifacts/visual-refinement/assets-review.jpg` — inspected asset inventory.
- `artifacts/visual-refinement/verification.json`, test logs, and Lighthouse HTML/JSON reports — checks and preservation hashes.

Files use viewport prefixes (`1440`, `768`, `390`), then route and view, for example `1440-home-opening.png`, `390-home-product.png`, and `768-platform-architecture.png`. No production publication was performed. Remaining limitations: authentic product interface imagery needs a documented approved screenshot, and direct contact submission still awaits verified Cloudflare account activation and real delivery/spam-protection verification.
