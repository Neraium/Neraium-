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


## Local refinement from current production HEAD (2026-10-12)

Started from `49bbc6260d2750b29c0e746fb15690cc8c92b667`, including the enterprise visual pass `e9c8d4c`, contact recovery `f0c3455`, and the complete guarded Cloudflare configuration. Read-only live inspection identified release `neraium-222c60bb952b8669`, deployment `53b45145-f04d-41e1-8eb2-a799c541bf7c`, and Worker version `b521e884-c242-4bd0-8160-8ab6a37d39fe`. The authenticated configuration checker confirmed the existing public variables, email recipient restriction, rate limiter, apex custom domain, www route, disabled contact state, and Turnstile secret name without retrieving its value.

This pass preserves the latest large headline/photographic hero, asymmetric application composition, platform architecture, evidence disclosures, and original brand assets. It keeps evaluation access visible in the tablet header; gives the mobile menu an explicit 48px control and full-width evaluation action; tightens mobile hero and section spacing; provides at least 44px targets for secondary action links; makes the evidence disclosures larger with clear expansion controls; and highlights a comparable-flow position in the existing conceptual chart without adding measurements. Compact telemetry definitions remain readable at 320px and above. A separately generated cooling-tower context image replaces the repeated central-plant image on Home, Applications, and Hospitality; its responsive 720/1440px derivatives and source record are documented in ASSET_PROVENANCE.md. The hero now selects an appropriate responsive source outside the original small-screen picture rule.

Removed the redundant illustrative-review label while retaining the full conceptual-scenario disclosure, the repeated telemetry benefit, and Company navigation subheadings. No slogans or promotional sections were introduced. Contact HTML differs only in its stylesheet revision. `wrangler.jsonc`, staging configuration, both Worker modules, contact JavaScript, package/lockfile, configuration/deployment guards, original logo, founder portrait and central-plant image match the starting HEAD byte-for-byte. The existing untracked `Neraium-/` directory is untouched. Shared stylesheet revision is `20261012visual2`; the local production package is `neraium-6308ede48cfd1637`. No deployment was performed.

Desktop (1440px), tablet (768px), and mobile (390px) screenshots were captured and inspected for the homepage, product view, navigation and hospitality presentation, with full review captures for ten routes. All 30 route/viewport combinations reported HTTP 200, no horizontal overflow and no browser errors. The capture harness explicitly decodes and visits lazy images before full-page screenshots. Review images, source-preservation hashes, and capture results are in ignored `artifacts/current-head-refinement/`.

Validation passed: production build, JavaScript syntax checks, 48 static-site tests, 24 contact-service tests, five Cloudflare configuration-guard tests, authenticated read-only remote configuration comparison, and all 684 Playwright checks across nine viewport sizes. The browser run used a fresh local Worker after rebuilding the asset directory invalidated the earlier preview instance. No production upload, email submission, DNS/route/settings change, or secret-value inspection occurred. A final live GET still reports `neraium-222c60bb952b8669`.

## Comprehensive market-alignment refinement (2026-10-12)

Baseline: `e6f3bf3`, branch `codex/neraium-phase-2`. Inspected HEAD, branches, recent commits, all public page content, shared CSS/JavaScript, the existing audit and provenance register, build allowlist, Worker/contact handler, Wrangler configuration, deployment guards, redirects and regression suites. The independent untracked nested `Neraium-/` remains at `2e18a9f8fc6e44b625815db6b0d29d25e806be72` with a clean inner working tree; it was neither edited nor added.

Fresh local and live screenshots cover all 14 primary routes at desktop (1440), tablet (768), and mobile (390). The first live desktop homepage navigation timed out; other live captures, including tablet/mobile Home, succeeded. The deployed pages already matched the retained visual refinement: original branding, infrastructure hero, illustrative evidence review, integrated architecture and restrained footer. These successful elements were preserved. Initial shortcomings were missing attraction/aquatic applications, unnamed expansion markets, staggered unequal market prominence, repeated generic industry-page copy, and absence of an explicit no-installed-hardware explanation.

Implemented:

- Home: retains the exact headline, makes software delivery/hardware boundary explicit, identifies the operator's traceable finding or insufficient-evidence outcome, labels the illustration visibly, and connects the relationship shift to readings that may remain within limits. The two commercial market compositions now have equal dimensions and alignment. A compact six-market expansion list replaces the vague broader-sector line.
- Applications: two primary buyer paths, explicit resort/attraction infrastructure, and a secondary expansion list. The final heading is “Hospitality, resorts & attractions”; an overlong interim heading was caught in screenshot review and corrected.
- Hospitality: distinct light editorial infrastructure section covers central chilled-water plants/HVAC, aquatic circulation/filtration, and park-wide utilities. Paired illustrative investigation questions explain comparable load and operating state. Las Vegas resorts, hotels, integrated properties, water parks, amusement/theme parks and associated mechanical systems are explicit. Rides and passenger-safety-critical systems are excluded from validated applications.
- Water: pumping/lift stations, hydraulic response, treatment, distribution/collection and operating context are specific. Henderson is an intended evaluation pathway, explicitly not completed customer validation, an awarded contract or established deployment.
- Broader Infrastructure: concise six-row semantic table names Cruise & Maritime, Aviation, Energy & Utilities, Manufacturing, Data Centers, and Healthcare & Campuses as potential expansion opportunities. Maritime/aviation facility infrastructure is distinguished from regulated and safety-critical uses requiring additional qualification.
- Platform: preserved the existing integrated architecture and maturity distinctions; clarified existing telemetry/no installed hardware. Company retains the authentic portrait, approved biography and affiliations, with the expanded initial-market scope. Contact inquiry prefilling now includes attractions.
- Shared assets: advanced CSS/JavaScript cache revisions on every public HTML entry, including the retired-route redirect and 404. No new runtime dependency, raster asset, logo, portrait, route, service provider or deployment configuration was introduced.

### Product and claims verification

Re-read the M2 development foundation, M8 qualification records and OET native integration status in `Neraium-2-integration`. They continue to support the existing distinction between current analytical foundations, developing durable memory integration and exploratory Operational Evidence Testing; stronger integrated production claims were not added.

Searched adjacent engineering asset directories for authentic interfaces. `Neraium-1.0/artifacts/product-screenshots/authentic-screenshot-verification.json` records actual synthetic-fixture captures but explicitly flags persistence/comparability overstatement and says they fail presentation requirements. They were not published. The website retains a clearly labeled, qualitative repository-native illustration and the deeper Evidence walkthrough. No customer data or outcomes were copied.

### Verification and delivery

- Production build and JavaScript/Worker syntax checks pass.
- 49 static checks pass, including concise page roles, metadata, broken local links, image validity, build isolation and the newly explicit market/claims boundaries.
- 24 contact-handler tests and 5 Cloudflare configuration-guard tests pass.
- 684 existing browser checks pass across all nine configured viewports (320–1920px), covering all primary routes, 404/redirect behavior, keyboard/mobile-menu focus, touch geometry, image loading, horizontal overflow, inquiry fallback and mocked gated delivery failure/success handling.
- The final Applications-heading correction receives a fresh build, static checks and focused browser rerun; full-suite results above precede that text-only correction.
- Local mobile Lighthouse on Home, Hospitality and Broader Infrastructure: 99 performance; Platform and Contact: 100 performance. All five: 100 accessibility, best practices and SEO. These are local lab measurements, not field guarantees.
- Local production Worker dry-run succeeds without deployment. `git diff --check` passes. Original Cloudflare configuration, two hostname mappings, EMAIL/rate-limit/secret bindings, strict deployment script, redirects and secure contact handler are unchanged. Both CONTACT flags remain false.
- Screenshots, review sheets, Lighthouse JSON and dry-run artifacts are retained locally in `artifacts/refinement/` (excluded from public build and Git). Existing browser screenshot/report directories remain available.

Remaining external dependencies: actual Cloudflare Email Sending availability and live delivery/retention verification before enabling submissions; publishable current product captures with correct evidence presentation; engineering qualification before stronger memory/OET production claims. No production deployment, push or merge was performed. A future authorized production release must use `npm run deploy`.

Final verification addendum: all 45 focused Applications and package-identity browser checks pass after the heading correction. Rebuilding the assets invalidated the old local Wrangler asset session, causing HTTP 500 and a failed attempt to start a second preview on its occupied port. Only this task's local processes were stopped; a fresh preview returned HTTP 200 and the focused checks and final screenshot capture were rerun against the stable finished build. No website or Worker defect remained. The final 49 static checks pass again. Test logs and scores are retained alongside screenshots in `artifacts/refinement/`.

## Resumed completion review

Resumed from `34574d5d0270a9d1832e53b9011adc83669e3283` with no pending tracked edits. Rechecked the independent nested repository (unchanged HEAD and clean inner working tree), reviewed the existing desktop/mobile page review sheets and full Home/Hospitality captures, and retained the completed design and market alignment. No page redesign or asset replacement was needed.

One remaining packaging defect was corrected: the build had a hardcoded `release.json.assetRevision` of `20261012visual2` while the pages used `20261012market3`. Release metadata now derives the stylesheet revision from the emitted homepage and fails the build if that revision is absent. The existing browser package-identity check now verifies that the manifest revision appears in the served homepage. The deterministic content identifier remains `neraium-71200c4a6eaa6b2b`; no public page or stylesheet changed during this resumed pass.

Fresh relevant verification passes: production build; JavaScript/Worker syntax checks; 49 static checks; 24 contact-handler and 5 configuration-guard checks; 27 focused browser checks across all nine viewports covering release identity, clean routes, redirects, headers, 404s and retired artifacts; and a local production Worker dry-run. Prior complete 684-check browser and Lighthouse evidence remains applicable to the unchanged UI. Resumed logs are in ignored `artifacts/refinement/resume-*`.

Cloudflare configuration, Worker/contact handling, disabled activation/retention flags, contact page, client handling, redirects, headers and strict production deployment safeguards match the resumed baseline. No deployment, push or merge occurred. The website is locally ready for an authorized deployment using `npm run deploy` with email-draft fallback. Enabling online submissions still requires the documented Cloudflare Email Sending, retention and real delivery verification; stronger product production claims retain their engineering qualification gates.

## Comprehensive final production quality pass — 2026-10-12

### Verified current state

Started at `985555d2b8edfc5e1799aac8feacd5f7c70c1640` on `codex/neraium-phase-2`. There were no tracked working-tree changes. The only untracked entry was the independent nested `Neraium-/`, at `2e18a9f8fc6e44b625815db6b0d29d25e806be72` with a clean inner tree. Recent commits, README, this audit, provenance, existing full-page screenshots and review sheets, public HTML/CSS/JS, regression tests, Worker/contact code, and Cloudflare deployment safeguards were inspected before editing.

A fresh production `release.json` returned `neraium-71200c4a6eaa6b2b` with `assetRevision: 20261012market3`; the pre-edit local production build returned the same content identifier. Direct HTTP comparison confirmed all 14 primary production pages plus CSS and JavaScript matched baseline Git source byte-for-byte. The Python HTTP client was denied by the public edge; the successful comparison used curl. Production and local browser captures covered all 14 routes at 1440×1000, 768×1024, and 390×844. Each returned HTTP 200, loaded images, and had no horizontal overflow or page errors. Evidence is in `artifacts/production-pass/live-release.json`, `live-comparison-baseline.json`, and `before/` and `live/`.

Already resolved and preserved: equal initial-market prominence; all six named secondary expansion opportunities; resort/attraction/aquatic infrastructure; distinct water/resort imagery and layouts; qualified Henderson language; the product schematic's visible illustrative disclosure; integrated architecture with explicit memory/OET development status; original logos and authentic founder portrait; responsive navigation, keyboard behavior, footer and forms; secure, disabled contact delivery; deterministic release metadata; and guarded Cloudflare deployment. This pass did not rebuild those components.

### Genuine remaining defects and corrections

| Verified defect at baseline | Correction | Rendered review |
| --- | --- | --- |
| Home described analysis but did not directly identify the offering as software. Its three value bullets named benefits without explaining how they support purchasing decisions. | Opening explicitly identifies software; value explains visibility across interacting equipment, traceable comparisons, and evidence for inspections, maintenance, and potentially unnecessary operating expense. | Home opening and value section reviewed at desktop, tablet, and mobile. Exact headline retained. |
| Water explained signals and an engineering question, but gave limited practical value for utility managers, plant operators, engineers, and maintenance teams. | Replaced the redundant pumping question with decision-oriented copy about maintenance backlogs, source/context review, hydraulic delivery and energy demand, and narrowing field investigation. | Water full page and benefit/scoping sections reviewed across all three widths. |
| Hospitality repeated investigation questions already covered by its infrastructure examples and omitted explicit commercial concerns. | Reused the existing two-column composition for facility continuity, guest/park schedules, central-plant utility demand, inspection planning, and potential unnecessary-work avoidance. | Hospitality desktop, tablet and mobile reviewed; existing HVAC, aquatic and park-wide applications retained. |
| Both initial-market pages repeated export/integration boilerplate followed by the same generic closing band. | Each now has a specific evaluation entry point: pumping/treatment/network questions for utilities; a central plant or circulation loop with load, staging, weather or filter-state context for hospitality. Shared `/pilot` documentation carries the common evaluation process. | Actions remain within their scoping sections, aligned with the content column and stacking on mobile. Henderson qualification remains intact. |
| Applications, Company and Broader Infrastructure repeated the same generic closing CTA. Broader Infrastructure's opening sounded like established applicability across many sectors. | Removed the three redundant closing bands and the two initial-market closing bands. Broader Infrastructure now introduces six potential opportunities and links visitors to the initial markets. Common physical principles replace a repeated sector/commodity list. | Shorter page endings inspected at all three widths; persistent header, navigation and footer contact paths retained. |
| Company mixed its platform narrative and initial focus in one dense opening. Its technical links contained labels only. | Separated company purpose from initial commercial focus and added concise descriptions of methodology, evidence and security. Original biography, portrait, direct contact and qualified affiliations remain. | Company opening, founder section, affiliation section and technical links reviewed across all three widths. |
| Provenance still described retired social-preview/gallery usage, and old audit text implied an automatic draft fallback absent at this HEAD. | Corrected current asset usage, specified the approved capture set needed, and documented the actual retained email-client link and disabled-form behavior in README. | No raster, logo, portrait, or product screenshot was changed. |

Seven pages receive content/layout changes: Home, Platform, Applications, Water & Wastewater, Hospitality/Resorts/Attractions, Broader Infrastructure, and Company. Other HTML entries only receive the shared asset revision update to `20261012quality4`. CSS changes align embedded scoping actions and size Company’s existing editorial text. No runtime dependency, new functionality, pricing, numerical savings, customer result, or deployment claim was introduced.

### Product and leadership evidence

Read-only review of the actual adjacent software checkouts and their documentation reconfirmed the current analytical boundaries. `Neraium-2-integration/docs/design/m8-resolution-20261010.md` still states **NOT QUALIFIED**; `research/pcs/oet/NATIVE_INTEGRATION_STATUS.md` retains missing native/authorized-input and physical-policy dependencies. The website does not elevate these development/research paths to qualified production functionality.

The authentic capture record at `Neraium-1.0/artifacts/product-screenshots/authentic-screenshot-verification.json` explicitly rejects the captures because grouped persistence and comparability presentation overstate their contracts. They use synthetic fixtures and have no established public-use approval. No product repository was modified, no operational dataset was read, and no unsuitable screenshot was published. The labeled existing illustration already explains system scope, a hypothetical relationship shift, context, evidence, and next inspection. Exact replacement requirements are now documented in `ASSET_PROVENANCE.md`.

No approved Scott title/biography/identified public-use portrait was found. No invented leadership profile or affiliation logo was added. Existing program participation claims are supported by the retained owner verification recorded earlier in this audit; they do not imply investment, endorsement or customer validation.

### Verification and preserved boundaries

Final test counts, lab scores and release identity are recorded below after completion. Screenshot capture explicitly visits and decodes lazy images and awaits fonts. Final full-page/section captures, viewport openings, navigation screenshots and review sheets remain in ignored `artifacts/production-pass/after/`; every primary route is captured at desktop, tablet and mobile sizes. Browser screenshots additionally cover all nine configured widths from 320px to 1920px. These artifacts are excluded from the public build.

The first static run caught assertions tied to old copy/cache revisions. Existing tests were updated for the current copy and page roles: hardware disclosure remains on Home/Platform, both initial market pages link the shared historical-evaluation boundary, and secondary-market navigation returns to the initial markets. The checks still enforce intended applicability, Henderson restrictions, initial/expansion hierarchy, secure operating boundaries, and revision consistency.

Cloudflare authenticated `config:check` could not run: it requires the existing API token, unavailable in this execution environment. Local configuration guard tests and the existing production Worker dry-run are verified separately. The configuration, Worker/contact modules, client contact implementation, redirects, headers, Netlify compatibility, deployment scripts and staging safeguards are byte-for-byte unchanged from baseline. EMAIL, CONTACT_RATE_LIMITER, both production hostnames, sender/destination, Turnstile settings and secret declaration are preserved. `CONTACT_ENABLED=false` and `CONTACT_RETENTION_APPROVED=false` remain in place. No email or form POST was sent to production.

Current fallback correction: the preserved explicit `mailto:` link opens the visitor's email client; the unavailable form preserves inputs and sends nothing. This HEAD does not automatically transfer form details into a draft. Older references to automatic draft conversion are historical and should not be used as evidence for the current release.

Outstanding dependencies are approved current product captures; owner-supplied Scott records if inclusion is desired; authentic permitted affiliation logos if desired; documented brand/portrait rights; real Cloudflare email delivery and approved retention before contact activation; and engineering qualification before stronger analytical-memory/OET claims. The authenticated configuration comparison must be rerun with the existing account credential before an authorized release. No deployment, push, merge, DNS change, service purchase, billing change or email-provider change was performed. Future authorized production releases must use `npm run deploy`.

### Completed verification

- Production build passes; final local content identifier is `neraium-6a0f9ea1e90f79db`, with asset revision `20261012quality4`.
- JavaScript and Worker syntax checks pass.
- All 49 repository/static checks pass, including links/fragments, metadata, public build isolation, images, market hierarchy and claims boundaries.
- All 24 contact-service tests and all 5 Cloudflare configuration-guard tests pass. Contact browser coverage includes mocked enabled/disabled delivery, challenge failure/expiry, rate limiting, accepted delivery, error preservation and resets; it does not verify real delivery.
- All 684 Playwright checks pass across nine viewport sizes (320–1920px). Navigation, keyboard focus, mobile touch geometry, image loading, clean routes, redirects, nested 404, headers, package identity and the product walkthrough are covered.
- Fresh final captures: all 42 page/viewport combinations return HTTP 200 with loaded images, zero overflow and zero page errors. Desktop/tablet/mobile full-page review sheets and native page/section captures were inspected. The responsive layouts retain coherent hierarchy, usable actions and clear separation between current markets and expansion.
- Mobile Lighthouse completes on all 14 primary routes: performance 97–100; accessibility, best practices and SEO 100 on every page; measured CLS 0 on every page. These are local lab results, not field or deployment guarantees. Full results are in `artifacts/production-pass/lighthouse-summary.json` and per-page JSON reports.
- Existing production Worker dry-run passes. `git diff --check` passes. Preservation hashes confirm all protected configuration, deployment/redirect/contact code, original logo sources and founder portrait are unchanged; the nested repository is clean at its original HEAD.
- Final production GETs still return `neraium-71200c4a6eaa6b2b` and `{"enabled":false}`. No production release was performed.

The completed implementation is committed locally for review. Authenticated remote configuration comparison and authorized deployment remain separate future actions; use the retained `npm run deploy` workflow when authorized.

## Enterprise completion from production HEAD — 2026-10-12

### Current state and preserved work

Started from `a88c9b6` on `codex/neraium-phase-2`. No tracked edits were present; the independent untracked nested `Neraium-/` was clean at `2e18a9f8fc6e44b625815db6b0d29d25e806be72` and remains untouched. Recent commits, existing audits/captures, asset provenance, all public source, contact safeguards, and deployment guards were inspected before modification.

Fresh production inspection returned release `neraium-6a0f9ea1e90f79db`, revision `20261012quality4`, and `{"enabled":false}`. All 14 primary pages, CSS, and JavaScript matched baseline source byte-for-byte when requested through their clean routes. Production and local baseline captures covered every primary page at 1440×1000, 768×1024, and 390×844, with HTTP 200, loaded images, no overflow, and no page errors. Read-only inspection of [production](https://neraium.com/) confirmed the live release, rather than treating old audit findings as current defects.

Already satisfactory and preserved: the original logo composition and responsive/sticky header; exact homepage headline and photographic hero; equal initial-market prominence; distinct water and hospitality layouts and infrastructure imagery; all six subordinate expansion markets; buyer-specific investigation and maintenance copy; current Company story, authentic founder biography and qualified affiliations; guarded Cloudflare configuration and disabled contact delivery. No new slogans, industry sections, invented findings, numerical performance claims, or product readiness claims were introduced.

### Verified deficiencies and implemented corrections

| Deficiency observed in the baseline | Completed correction |
| --- | --- |
| Homepage demonstration placed its finding after the chart in mobile reading order, and repeated the observation as a secondary heading. | The finding is the figure's primary heading and appears before evidence in source/mobile order. The initial copy explains the relationship change and the next signal/context checks. Evidence and limitations remain keyboard-accessible. Existing schematic, imagery, and hero are preserved. |
| Evidence opened with a large abstract heading and repeated one pumping example across a text artifact and a separate long walkthrough. The fictional package ID could look like an actual evidence record. | Opens with the illustrative finding and a qualitative comparison. Six ordered disclosures provide finding summary, physical behavior/system diagram, telemetry relationships, operating context, qualification/traceability, and engineering review. Removed the invented package ID and duplicate chart. Explicit insufficient-evidence example and scientifically important limitations remain. |
| Platform explained the same layers in its architecture and then five lengthy capability rows. | Preserved the integrated architecture, clarified cross-system/context connections, and replaced repeated rows with a separate compact qualification section. Current analytical capability, current memory foundations/developing integration, and exploratory OET status remain visible before expansion. Detailed limits are retained. Removed the generic closing CTA; practical integration links the evaluation process. |
| Contact process copy preceded the form on phones; the form heading repeated the page purpose; disabled intake left entered details without a populated draft. | Removed the repeated three-step process and form heading, enlarged the form's share of desktop space, and moved required fields into the mobile opening. A validated, user-opened email draft contains all entered fields and makes no POST. Draft state never claims delivery or clears inputs, and edits remove stale draft links. Unknown configuration or challenge initialization/reset failure safely permits the same manual email path. Native required/email validation, feedback focus, optional fields, prefill, and direct-email fallback remain. |
| Contact availability text changed the field positions while loading. | Reserved responsive space for the availability message. Final mobile Lighthouse measured CLS 0. |
| Historical Evaluation emphasized boundary/process detail before describing the deliverable and useful data. | The opening now pairs a concise scope explanation with what the customer receives. Existing five steps form a desktop sequence. Effort/response/context data guidance and technical export requirements reuse the prior outcomes section. Scope-dependent requirements, insufficient evidence, human review, historical Continued Analysis, and approved transfer remain explicit. Removed the competing closing email CTA. |
| Security repeated read-only principles across separate sections; its diagram gave the analysis boundary little visual differentiation. | Highlighted the existing read-only analysis stage, removed repeated principle cards, and made actual deployment controls expandable. Least privilege, customer-approved scope, data protection/auditability, public inquiry limits, and the certification qualification remain. |
| Company's mobile opening deferred a 582,575-byte portrait with lazy loading. | Added 480px/960px WebP delivery copies of the same full authentic photograph and eager/high-priority selection. Source JPEG is unchanged; no generative processing or retouching. The 480px copy is 29,756 bytes. Local mobile Company performance improved from 84 to 98; this is a lab result, not field performance. |

Substantive page changes: **Home, Platform, Evidence, Company, Security, Historical Evaluation (`pilot`), Contact, and Privacy**. Privacy wording now explicitly describes the user-opened draft. Applications, Water & Wastewater, Hospitality/Resorts/Attractions, Broader Infrastructure, Methodology, Operator Brief, 404, and the retained Technical entry receive only the consistent shared asset revision. Their completed content/layout work was not repeated.

### Product assets and commercial experience

The approved asset register, product repository instructions, capture verification record, later “validated” capture, and `ui-review` screenshot inventory were reviewed read-only. Existing original captures fail grouped-persistence and comparability requirements; the later evidence capture still displays unqualified “Comparable” context and lacks reviewed public-use/source records. Filenames do not establish validation or permission. No product repository, operational dataset, customer information, credential, or product screenshot was modified or published.

The website therefore retains an explicitly labeled illustration, with the precise approved system/finding/context/evidence/investigation capture requirements in `ASSET_PROVENANCE.md`. The new presentation makes the hypothetical observation, why it warrants investigation, and the engineering next step easier to find without presenting simulated output as validated software results.

Commercial improvements concentrate on a clearer evidence journey, explicit evaluation deliverables/data expectations, and a usable inquiry path while direct delivery remains disabled. Existing buyer-specific utility and resort/attraction content is preserved. No conversion lift, savings, diagnosis, confidence, detection performance, or deployment validation is claimed.

### Before-and-after review package

Local artifacts are outside the public build and ignored by Git, under `artifacts/final-enterprise/`:

- `before/`: current HEAD captures; `live/`: current production captures; `after/`: completed implementation.
- `review.html`: before-and-after gallery for all 14 primary pages and all three primary resolutions.
- Each page has opening and full-page captures; Home additionally has product captures, Platform architecture captures, and Company founder captures. `390-navigation.png` captures the open mobile navigation.
- Expanded Platform/Evidence/Security/Evaluation captures cover 320, 390, 768, and 1440px. Contact draft-state captures use fictional review details and send nothing.
- Three full-page review sheets (`review-1440.png`, `review-768.png`, `review-390.png`) and native opening/section/expanded screenshots were visually inspected.
- `verification.json`, `live-source-comparison.json`, `preservation.json`, test logs, and Lighthouse reports retain verification evidence.

Representative direct comparison paths:

| View | Before | After |
| --- | --- | --- |
| Desktop Home | `before/1440-home-opening.png` | `after/1440-home-opening.png` |
| Tablet Home | `before/768-home-opening.png` | `after/768-home-opening.png` |
| Mobile Home | `before/390-home-opening.png` | `after/390-home-opening.png` |
| Desktop product review | `before/1440-home-product.png` | `after/1440-home-product.png` |
| Desktop Evidence | `before/1440-evidence-opening.png` | `after/1440-evidence-opening.png` |
| Mobile Contact | `before/390-contact-opening.png` | `after/390-contact-opening.png` |

The closed mobile page heights illustrate the reduced initial reading burden: Platform 6349 → 4356px; Evidence 5362 → 3285px; Security 3583 → 2508px; Contact 2269 → 1906px. All important technical content remains reachable through disclosures. These are screenshot dimensions, not commercial performance measures.

### Completed verification and remaining dependencies

Final build is `neraium-e784c7bfb68e39e3`, asset revision `20261012enterprise5`.

- Production build and JavaScript/Worker syntax checks pass.
- All **49** repository/static tests pass.
- All **24** contact-service tests and **5** Cloudflare configuration-guard tests pass.
- All **684** existing browser checks pass across nine viewports, 320–1920px. Coverage includes routes, metadata, links, loaded images, overflow, responsive/keyboard navigation, sticky header, release identity, product walkthrough, and mocked contact/challenge/failure behavior. Updated draft checks verify encoded fields, keyboard access, stale-link removal, preserved inputs, and zero POSTs. An initial old single-paragraph locator was corrected to assert the explicit comparability/insufficient-evidence paragraph in the new disclosure.
- All **42** final primary page/viewport captures returned 200 with loaded images, no overflow, and no page errors. All **60** expanded-disclosure checks across four widths were visible and free of overflow.
- Mobile Lighthouse on all 14 primary routes: **97–100 performance**; **100 accessibility, best practices, and SEO** on every route; **CLS 0** on every route. Company and Contact were rerun after their observed loading/layout issues were fixed; the combined summary records their final results. Scores are local laboratory measurements, not production guarantees.
- Local production Worker dry-run and `git diff --check` pass.
- Preservation hashes confirm the original logos/portrait, both Wrangler configurations, Worker modules, production/staging deployment guards, headers, redirects, and Netlify compatibility are unchanged. Both production domains, EMAIL, rate limiter, Turnstile configuration/secret declaration, sender/destination, and rollback workflow remain intact. `CONTACT_ENABLED=false` and `CONTACT_RETENTION_APPROVED=false` remain unchanged.
- Authenticated `npm run config:check` cannot compare the remote account because the existing Cloudflare API token is unavailable in this environment. Local guard tests and dry-run pass; authenticated comparison remains required before an explicitly approved release.

Remaining external dependencies: approved current product screenshots and reviewed redactions/provenance; official Scott role/biography/authentic approved portrait if inclusion is desired; retained brand/portrait rights documentation; real email delivery and approved retention before contact activation; authenticated Cloudflare configuration verification and explicit deployment approval; and engineering qualification before stronger memory/OET claims.

This implementation is committed locally. No deployment, push, merge, DNS/service/secret change, purchase, or billing change occurred. Future approved deployment must use the existing `npm run deploy` workflow. Final commit identity is supplied with the handoff; documentation changes do not alter the deterministic public content identifier.
