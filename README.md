# Neraium public website

Neraium’s public website presents Systemic Infrastructure Intelligence across connected infrastructure. Municipal water/wastewater and Las Vegas hospitality/resorts are the initial commercial focus. Source is plain HTML, CSS, SVG, and vanilla JavaScript. A small Cloudflare Worker adds configuration-gated inquiry handling; no new runtime dependency or form service is introduced.

## Pages and navigation

Home introduces the problem, systemic intelligence, platform differentiation, initial applications, operational value, and evaluation. Platform explains the integrated architecture and capability maturity. Applications leads to dedicated Water & Wastewater, Hospitality & Resorts, and Broader Infrastructure pages. Company preserves the authentic founder portrait and presents program participation with explicit boundaries.

Methodology, Evidence, Security, Historical Evaluation (`/pilot`), Operator Brief, Privacy, Contact, and the custom 404 remain available. Legacy redirects and clean URLs are preserved. The footer contains six essential links; deeper material is linked from relevant pages.

## Claims and evidence

See [AUDIT.md](AUDIT.md) for the repository/live-site audit, source references, maturity decisions, and verification evidence. Platform distinguishes current analytical functionality from the newer durable Continuous Analytical Memory integration and exploratory Operational Evidence Testing. Neither development path is described as proven production functionality. The marketing website does not certify deployment, diagnosis, savings, failure prediction, fleet intelligence, or guaranteed integrations.

Existing approved logo and founder assets are preserved. Documented generated infrastructure imagery is representative, not customer imagery. See [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

Current production configuration and deployment instructions are in [Authoritative production deployment process](#authoritative-production-deployment-process--2026-10-12); older release notes below are historical.

## Local development and checks

```bash
npm ci
npm run build
npm run preview -- --port 4179 --ip 127.0.0.1
npm run check
npm run test:server
python3 -m unittest discover -s tests -v
npm test -- --workers=4
```

The build allowlists public assets, rejects symlinks, validates image signatures, and emits `dist/`. Worker code stays outside the public asset directory. Playwright verifies every public page at nine viewport sizes from 320px to 1920px, including keyboard navigation, responsive overflow, loaded images, metadata, clean routes, redirects, security headers, contact states, and screenshots. Screenshots are written to ignored `playwright-screenshots/`; browser reports to `playwright-report/`.

There is no TypeScript application or configured lint tool. `npm run check` validates JavaScript syntax; TypeScript Playwright tests are compiled by the test runner. `npm run test:server` uses Node’s built-in test runner for intake security and delivery contracts.

Do not rebuild `dist/` while browser tests use it: the build deliberately removes and recreates the output directory.

## Inquiry behavior

The form uses the existing same-origin Cloudflare Worker at `/api/contact`; it no longer prepares email drafts. An explicit direct email link remains available, including without JavaScript. Until all server dependencies are configured, the form displays an unavailable message, preserves entered details, and sends no inquiry. The default configuration remains `CONTACT_ENABLED=false`.

Name, work email, organization, and system/facility are required. Review question, role, and contact preference are optional. Industry links prefill general system context. When `/api/contact-config` confirms availability, the form loads Turnstile, using a compact widget when the form is narrower than 300px, and sends JSON. Configuration/challenge loading failures, expired challenges, rate limits, network errors, and delivery failures never produce success or erase fields. Success requires `accepted: true` from the Worker and clears the submitted fields. Challenge initialization/reset errors are contained: the form exits its busy state, failed-submission details remain, and an accepted delivery result is preserved.

The reused Worker enforces same-origin requests, allowed hostnames, JSON content type, an 8 KiB streamed body limit, allowed fields, field limits, email validation, a honeypot, the native rate limiter, and server-side Turnstile verification of hostname and action `evaluation`. The configuration gate rejects blank/malformed challenge settings and Cloudflare’s documented dummy test keys. Rate-limit and challenge results must explicitly return `success: true`. Email is plain text, uses a server-owned destination and validated reply-to, and is accepted only with a nonempty string `messageId`. No submission database or sensitive-field logging is introduced. The success message reports service acceptance without asserting inbox receipt.

### Production contact configuration status — 2026-10-12

Wrangler **4.149.0** is installed. Its schema and a successful dry-run support `send_email` and `ratelimits` (plural); these are resource bindings. Public configuration uses `vars`; `TURNSTILE_SECRET_KEY` uses a secret binding.

| Binding / setting | Current repository configuration | Required account verification |
| --- | --- | --- |
| `EMAIL` | `send_email`, restricted to `craig@neraium.com` | Recipient verification and supported sending service/domain |
| `CONTACT_FROM` | Empty; fails closed | Existing verified sender identity; restrict `allowed_sender_addresses` after selection |
| `CONTACT_TO` | `craig@neraium.com` | Verify this destination in the approved account |
| `TURNSTILE_SITE_KEY` | Empty; fails closed | Real widget restricted to `neraium.com` and `www.neraium.com` |
| `TURNSTILE_SECRET_KEY` | Absent from source | Store the real widget secret with `wrangler secret put TURNSTILE_SECRET_KEY` |
| `CONTACT_RATE_LIMITER` | Absent pending account inspection | Dedicated noncolliding `ratelimits` namespace with `simple: { "limit": 5, "period": 60 }` |
| `CONTACT_HOSTNAMES` | `neraium.com,www.neraium.com` | Confirm existing production domains target Worker `website` |
| `CONTACT_RETENTION_APPROVED` | `false` | Concrete mailbox retention/deletion policy and accurate privacy terms |
| `CONTACT_ENABLED` | `false` | Enable only after delivery, real Turnstile, and rate limiting pass verification |

**Blocking evidence:** `wrangler whoami` reports “You are not authenticated. Please run wrangler login.” No Cloudflare environment credential or authenticated account connector is available. This prevents inspection of the actual account's bindings, sender verification, recipient status, Turnstile widgets, namespace allocation, deployed version, and production routes. Repository omissions are known; account settings remain unverified rather than presumed missing.

Public checks on 2026-10-12 show `/api/contact-config` returns `200 {"enabled":false}` and an empty diagnostic POST to `/api/contact` returns `503` with the unavailable message. No inquiry or email was sent. DNS shows `neraium.com` MX records target Zoho; `cf-bounce.neraium.com` and `cf-bounce._domainkey.neraium.com` do not resolve. This indicates the documented Email Sending records for the apex are absent; an existing verified sending subdomain or different Cloudflare configuration cannot be excluded without account access. **Preserve the existing Zoho root MX and SPF records.**

### Remaining setup and delivery verification

1. Authenticate Wrangler to the approved existing account using `wrangler login` or a scoped API token through the environment/credential store. Never paste credentials into chat, commands, or source files. Verify account identity, ownership of Worker `website`, both production domains, current settings, and rollback deployment before changing resources. No temporary account or alternate route is authorized.
2. Inspect existing Email Service/Email Routing setup and verified destinations. Prefer free delivery to the verified `craig@neraium.com` destination. If not already verified, request its Cloudflare verification email and complete the mailbox verification link. If a sending domain needs onboarding, use **Compute → Email Service → Email Sending → Onboard Domain** for the approved domain, inspect the generated sending records, and verify them. Do not replace incoming Zoho mail routing. Select a verified sender, populate `CONTACT_FROM`, and constrain the email binding's `allowed_sender_addresses` to it. Do not assume that an address used in a mock test is verified.
3. Create/reuse a real managed Turnstile widget restricted to the two production hostnames. Populate the public site key and upload the secret directly to Cloudflare. Create/select a dedicated rate-limit namespace after checking for collisions. Add `"ratelimits": [{ "name": "CONTACT_RATE_LIMITER", "namespace_id": "<verified dedicated namespace>", "simple": { "limit": 5, "period": 60 } }]` with the actual account value. Cloudflare's limiter operates per edge location, not as a global quota.
4. Confirm the mailbox retention policy before setting `CONTACT_RETENTION_APPROVED=true`. Keep public contact disabled while testing dependencies through an authenticated local Worker with remote email binding and a real hostname-restricted challenge. Local simulated mail and dummy Turnstile credentials do not verify production delivery.
5. Send a clearly identified test inquiry with name **Neraium contact delivery verification**, recipient `craig@neraium.com`, a real controlled reply address, and a unique UTC timestamp in the review question. Record service acceptance/message ID privately, verify inbox receipt and reply-to, and check rejected/expired challenges and rate limiting. Inbox verification requires approved mailbox access or recipient confirmation. Do not enable the public endpoint if delivery cannot be verified.
6. After these checks pass, set `CONTACT_ENABLED=true`, build with `npm run build`, and deploy with the existing `wrangler.jsonc`/`npm run deploy`. Preserve the account-managed production route. Submit a second clearly identified inquiry through the actual production form, confirm receipt, and verify mobile/desktop behavior. Disable intake immediately if delivery verification fails.

Secrets are excluded by `.gitignore` (`.env*`, `.dev.vars*`, `.wrangler/`). The allowlisted production build excludes Worker source, tests, configuration, and secrets. No paid third-party email service is added. The CSP admits the specific Cloudflare challenge origin used by this workflow.

Resume validation passed: 24 focused server tests, 153 contact/browser checks across nine viewport sizes (320–1920px), 48 repository checks, JavaScript syntax checks, the production build, and Wrangler’s deployment dry-run. Browser challenges and email acceptance are mocked in automated tests; these results do not establish real spam protection or email delivery. Wrangler authentication remains unavailable, and a fresh public GET still reports `enabled:false`. No deployment or real test inquiry was performed.

Cloudflare references: [Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [send-binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [domain onboarding](https://developers.cloudflare.com/email-service/configuration/domains/), [free verified-destination delivery](https://developers.cloudflare.com/email-service/platform/pricing/), [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), and [rate-limit bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Hosting and review

`wrangler.jsonc` routes only `/api/*` through the Worker first and leaves normal static routing, headers, and redirects intact. `netlify.toml` retains static hosting compatibility; on Netlify direct submission remains unavailable and the explicit direct email link remains available. The canonical origin is `https://neraium.com`, aligned with the observed account-level `www` → apex redirect. Domain routing remains account-managed.

The earlier redesign was local-only. The final refinement assignment authorizes publication to the existing production deployment after account and route verification. The Worker dry-run bundles locally without deployment.

### Retained legacy artifacts

The old unlinked `sample-finding-pack.pdf` and `assets/images/neraium-brand-preview.png` remain in source for historical preservation. They are excluded from deployment output because their earlier diagnosis/simulated-results language does not meet the current public claims boundary. The live social metadata uses `neraium-social.jpg`. Do not restore those legacy artifacts to the public package without a new content review.

## Isolated Phase 2 staging

The approved website content/Worker release is `1f2b51c312e299f590c5d79338ca0a2e7a67178c` on `codex/neraium-phase-2`. Staging preparation does not change the production `wrangler.jsonc`, Worker implementation, domain routes, DNS, or bindings.

Production configuration targets Worker `website`, with Workers.dev and preview URLs disabled. Website metadata names `https://www.neraium.com` as the canonical origin. `npm run deploy` is the existing production deployment command; do **not** use it for staging. GitHub Actions currently tests main/claude pushes and PRs to main; it does not deploy. The Netlify file remains a static alternative. Actual Cloudflare account identity, custom-domain mapping, and account-managed deployment triggers require authenticated read-only inspection; they cannot be inferred from repository configuration alone.

`wrangler.staging.jsonc` is a standalone configuration for **`neraium-phase2-staging-1f2b51c`**, using only Workers.dev, an empty custom-route list, the static `ASSETS` binding, and disabled contact/retention flags. It has no account ID, mail, rate-limit, database, service, or production binding. A remote staging URL exists only after a successful deployment to the approved existing account; no URL or account subdomain is invented here.

### Prepare and validate

```bash
npm run build:staging
npm run check
node --check scripts/prepare-staging.mjs
node --check scripts/verify-staging.mjs
python3 -m unittest discover -s tests -v
npm run test:server
npm test -- --workers=4
npm run staging:dry-run
npm run preview:staging
```

In a second terminal, run `npm run verify:staging`. Stop the local preview afterward. Do not rebuild either served directory while its browser checks are running.

Preparation checks staging isolation, preserves the production configuration, and compares every emitted public file and both Worker modules against the exact approved release using Git-object SHA-256 hashes. Only the staging copy of `_headers` and `robots.txt` changes: it adds `X-Robots-Tag: noindex, nofollow, noarchive` and blocks crawling. Canonical URLs stay on production. The source production files are unchanged. Release evidence is written to ignored `artifacts/staging/manifest.json`, outside public assets.

The verifier checks all 14 major routes at desktop, tablet, and mobile sizes, image loading, overflow, relative navigation, security/noindex headers, redirects, 404s, retired-artifact exclusion, and disabled contact submission. It checks that contact intake is disabled before interacting with the form. Remote verification accepts only this staging Worker’s Workers.dev hostname. It is not a production-release test script. Reports and screenshots stay in `artifacts/staging/`.

### Deploy staging only after account access is available

1. Authenticate Wrangler to the approved **existing** Cloudflare account using approved login or a scoped API token supplied through the environment/credential store. Never paste secrets into this repository or commands. `wrangler whoami` must identify the intended account. Do not use `--temporary` or create a substitute account.
2. Inspect that account’s existing Workers.dev subdomain and staging Worker identity. If `neraium-phase2-staging-1f2b51c` already exists, verify it is this isolated staging target with no production domains, routes, service bindings, or sensitive data before reusing it. Stop if its purpose is uncertain. Do not enable/create an account-wide subdomain or touch DNS/custom domains as a workaround without separate authorization.
3. Verify the 61 static files and both Worker modules, review the manifest and the standalone configuration, and rerun the dry-run. If multiple accounts are accessible, explicitly select the approved account through `CLOUDFLARE_ACCOUNT_ID` in the deployment environment.
4. Use the explicit standalone config, never the default production deployment script:

   ```bash
   ./node_modules/.bin/wrangler deploy --config wrangler.staging.jsonc
   ```

5. Record the returned staging URL and deployment/version ID. Run `NERAIUM_STAGING_URL='<actual returned staging URL>' npm run verify:staging`. Do not substitute an assumed account subdomain. Inspect the resulting desktop/mobile screenshots and verify that the email draft does not send a request.

Staging remains public on an unlisted Workers.dev URL unless separately protected with approved staging access controls; noindex is not authentication. It contains marketing content only and has no operational-data or public submission backend enabled.

### Safe production release after staging approval

Production is a separate authorized action. Review the final local commits and open a PR to main only when authorized; this preparation does not push or merge. Run remote CI plus the explicit syntax/server suites, preserve the approved source/package hashes, inspect the actual production account/Worker/domain configuration read-only, and retain the current deployed version and rollback procedure. Build production with `npm run build`, never use `dist-staging` or `wrangler.staging.jsonc` for production, and keep contact disabled unless the earlier intake requirements and real-delivery tests have all passed. Only then use the approved production deployment workflow. Verify production URLs, redirects, headers, assets, responsive navigation, and contact behavior after that separately approved release.

## Premium visual redesign

The site now uses a single responsive stylesheet with a locally hosted Manrope variable font, a restrained navy palette, selective light reading surfaces, editorial layouts, and consistent header/footer spacing. The header's horizontal lockup arranges the original logo artwork without redrawing it. Its dimensions remain stable during scrolling. Mobile navigation fills the available viewport, locks background scrolling, contains keyboard focus, restores focus on Escape, and resets when crossing the desktop breakpoint. Product copy, claim boundaries, routes, inquiry behavior, and deployment configuration are preserved.

Review captures for all 14 primary routes are in ignored `artifacts/premium-redesign/`, at 1440 × 1000 and 390 × 844. `desktop-header-hero.png`, `mobile-header-hero.png`, and `mobile-navigation.png` show the priority header treatment. The browser suite additionally checks all nine configured viewport sizes, including 320px, sticky geometry, focus containment, scroll preservation, and breakpoint reset. No deployment is part of this redesign.

## Final refinement and production verification (2026-10-12)

The final refinement preserves the premium redesign, original logo artwork, documented infrastructure imagery, founder portrait, capability boundaries, redirects, and disabled online intake. Shared navigation now has four destinations plus the evaluation CTA. Header and headline proportions, image crops, small text, footer links, and form labels are refined. Industry evaluation CTAs carry their context into the existing email-draft form.

The homepage replaces the abstract diagram with an explicitly illustrative chilled-water operating study: a connected loop, existing telemetry, matched operating context, qualitative power-to-flow comparison, hypothetical persistent change, and expandable engineering review. It contains no measurements, customer findings, or diagnoses. Platform links directly to the example. Commercial copy emphasizes investigation, maintenance, and potential cost avoidance without financial claims. The homepage stays within its existing 650-word regression limit.

Canonical, structured, social, sitemap, robots, and security metadata now use the apex origin. CSS/JS URLs use revision `20261012c`. The production build emits `/release.json` and `X-Neraium-Release` with the same deterministic content identifier, including public assets and Worker/configuration inputs. HTML requires revalidation, the manifest is not stored, and explicit asset rules retain their own cache policies. Cloudflare header rules detach the broad cache header before applying narrower policies; see [Cloudflare header documentation](https://developers.cloudflare.com/workers/static-assets/headers/#detach-a-header).

Public GET checks verified apex 200 responses and `www` 301 redirects preserving paths and query strings for Home, Platform, Water & Wastewater, Hospitality, Broader Infrastructure, and Contact. All six apex HTML responses match source release `8c043b510482bae09bd0586980463368baff86b9` exactly by SHA-256. This establishes the live premium-redesign content, not a Cloudflare deployment UUID or account ownership. The new refinement is not yet published. The live `/api/contact-config` returns `{"enabled":false}`; a browser check prepared the correct email link without any POST request.

Production publication is blocked: `wrangler whoami` reports **“You are not authenticated. Please run wrangler login.”** No Cloudflare credential is available in this session. Therefore the actual account, existing Worker ownership of both hostnames, deployed Cloudflare version UUID, and redirect-rule ownership could not be inspected. No deployment, route, DNS, account, staging-project, or contact-infrastructure change was attempted. Authenticate to the existing account, inspect ownership and retain its current deployment for rollback before using the production `wrangler.jsonc`; do not use the staging configuration or a temporary account.

Final desktop and mobile captures for all 14 primary pages, plus header/navigation/example details and public-routing evidence, are in ignored `artifacts/final-refinement/`. The existing nine-viewport browser suite verifies 320–1920px layouts, navigation, keyboard behavior, loaded images, metadata, redirects, contact fallback, and the new release identity and illustrative-review interactions. No real email was sent.

## Final high-impact pass (2026-10-12)

The final pass retains the original headline, brand artwork, infrastructure images, production Worker architecture, and redirects. Home now runs from the monitoring gap to a concise systemic-intelligence introduction and one illustrative product explanation, then applications, operating value, and evaluation. The figure connects existing telemetry and comparable conditions to qualitative effort/response change and traceable engineering evidence. It does not represent a live product interface or a customer outcome. The detailed five-step study and engineering review are preserved at `/evidence#walkthrough`; `/#operating-example` remains valid for existing links. The homepage regression limit is tightened to 500 words, and the Evidence limit allows the relocated technical walkthrough.

Company clarifies the founder's motivation, what Neraium is building, and the existing approved program participation. Affiliation claims continue to rely on the owner verification recorded in AUDIT.md. The desktop header has balanced columns and a restrained outlined action; the shared image overlay and footer spacing are refined. Contact consolidates operational-data notices, retains all required and optional fields, and uses an explicit draft-ready state that says no inquiry has been sent. Delivery remains disabled; the approved API path and server checks are preserved.

Final desktop (1440 × 1000) and mobile (390 × 844) screenshots of all 14 key pages are in `artifacts/final-pass/desktop/` and `artifacts/final-pass/mobile/`, with layout measurements in `artifacts/final-pass/visual-report.json`. The full browser suite also captures all pages at nine viewport sizes under `playwright-screenshots/`. These generated artifacts are local and intentionally excluded from the public package. Shared asset revision is `20261012d`. No deployment is authorized until the owner approves the completed local pass.

Final verification: `npm run build` produced release `neraium-10e71ab7d9761fcd`; syntax checks passed; all 22 contact-service tests, 48 Python site tests, and 612 Playwright checks across nine viewport sizes passed. The final browser run used a freshly restarted local Worker after the rebuild interrupted the first preview session. A separate draft check confirmed state `ready`, the correct recipient and form contents, and zero POST requests. Desktop homepage visible main copy is 420 words versus 563 on production at review time. The final pass is committed locally and ready for deployment approval; no production deployment was performed.


## Site-wide editorial cleanup (2026-10-12)

Audited all 16 HTML pages: Home, Platform, Methodology, Evidence, Applications, Water & Wastewater, Hospitality, Broader Infrastructure, Company, Contact, Historical Evaluation, Operator Brief, Security, Privacy, the custom 404, and the legacy Applications redirect. Removed decorative eyebrows, hero slogans/captions, the repeated sector strip, redundant section introductions, card labels, closing copy, and footer taglines. Existing descriptive labels now serve as headings where the former heading was promotional. The homepage headline, product and technical explanations, capability maturity, illustrative-evidence disclosures, security/privacy boundaries, navigation, CTAs, original brand artwork, and images remain. Home main copy decreased from 418 to 287 words under the same source-text count (excluding SVG text). Spacing changes address the deleted elements; the design and production configuration remain intact. Asset revision is `20261012e`, with production package `neraium-42bd55edc3ac1128`.

Validation: production build, syntax checks, 22 contact-service tests, 48 static-site tests, and the production Worker dry-run passed. The browser matrix passed 603 checks; its nine evidence-navigation checks passed on rerun after changing the assertion from the deleted decorative label to the retained conceptual-scenario disclosure. Desktop and mobile screenshots are in ignored `playwright-screenshots/`.

Production publication was attempted with the existing `wrangler.jsonc` targeting Worker `website`. Wrangler reported that this non-interactive environment requires `CLOUDFLARE_API_TOKEN`; `wrangler whoami` also reported no authentication, and no Cloudflare environment credentials were present. Deployment and post-deployment verification remain blocked by account access. Live GET checks still identify the preceding release `neraium-10e71ab7d9761fcd` with contact intake disabled. The authorized release must use the existing account-managed production route once authentication is available.


### Authoritative production deployment process — 2026-10-12

This section supersedes the historical authentication blockers and production deployment instructions above. Website content and visual refinement remain unchanged. The approved production account is `9820361c238dcdeef0b72b24ec3734db`, Worker `website`. Wrangler is pinned to **4.149.0** in the lockfile.

`wrangler.jsonc` is the source of truth for every public production variable, resource binding, and route. Keep its syntax valid JSON for the configuration checker. Production uses the apex custom domain `neraium.com` and the existing zone route `www.neraium.com/*`; Workers.dev and preview URLs stay disabled. Do not replace those mappings, modify DNS, recreate the Worker, or reset Dashboard settings.

The inspected Dashboard configuration contained `CONTACT_ENABLED=false`, sender `website@neraium.com`, recipient `craig@neraium.com`, public Turnstile site key, rate limiter namespace `1001` (5 requests per 60 seconds), `ASSETS`, and `TURNSTILE_SECRET_KEY`. The imported local file had an empty `vars` object, so a normal deployment could remove Dashboard variables. The live Worker also lacked `CONTACT_RETENTION_APPROVED` and `CONTACT_HOSTNAMES`, and its `EMAIL` binding was unrestricted. A narrow settings patch added `CONTACT_RETENTION_APPROVED=false` and `CONTACT_HOSTNAMES=neraium.com,www.neraium.com`, constrained EMAIL to `craig@neraium.com`, and inherited every other binding, including the existing secret. The local configuration now records the complete matching public settings. Sender/domain and recipient verification resources were not changed; the available token cannot independently read Email Routing recipient verification (HTTP 403). No delivery test was performed and direct contact stays disabled.

Secrets belong only in Cloudflare or the external credential store. `secrets.required` declares the existing Turnstile secret by name; the preflight checks its presence without retrieving or printing its value. Normal Wrangler deployments preserve existing secrets. Do not put secret names into `vars`, use `--secrets-file` during website releases, or log credential files. `keep_vars` is intentionally absent: all public variables are tracked and compared, avoiding split ownership with the Dashboard.

Use one production workflow from this repository root:

```bash
# Load existing credentials outside Git; never display the file or enable shell tracing.
set -a
source /home/ubuntu/.config/neraium/cloudflare.env
set +a
npm ci
npm run config:check
npm run check
npm run test:server
node --test tests/cloudflare-config.test.mjs
npm run deploy
```

`npm run deploy` checks the actual remote configuration, builds production, runs the Wrangler dry-run, compares remote configuration again immediately before upload, then runs `wrangler deploy --config wrangler.jsonc --strict` with `CI=true`. Strict noninteractive mode aborts on Dashboard override conflicts instead of accepting them automatically. A final comparison checks public settings, routes, and the complete before/after secret-name inventory. The explicit production account prevents accidental deployment to another account. Do not bypass this wrapper with bare `wrangler deploy`, remove `--strict`, pipe confirmation input, or run the staging config for production.

If Dashboard settings change, the checker reports the affected binding names without printing values and stops before upload. Inspect the change read-only, reconcile the specific authorized setting while preserving unrelated resources, and update this configuration before retrying. Do not repeatedly import an incomplete configuration or accept an override warning. Extra remote resource bindings and cron schedules also block deployment until represented and reviewed. Additional existing secrets remain managed remotely and are preserved.

Record the deployment/version IDs returned by the wrapper and compare `https://neraium.com/release.json` with `dist/release.json`. Verify homepage/contact responses, disabled `/api/contact-config`, and the direct email fallback without sending an inquiry. Verify `www` redirects preserve paths. Before the one-time reconciliation the active version was `7f508d1a-f5f0-4fd4-9b47-3ce75ddefe0c` (deployment `49e3ca56-eeb8-4153-a1fd-528f31c0f830`); ignored local evidence is in `artifacts/production/`. For later rollback, prefer the preceding website version with the reconciled settings and confirm its binding inventory before rolling back.


Production release result: the one-time settings PATCH changed Cloudflare's deployment provenance to `api`. The first noninteractive strict upload correctly stopped on its generic script-API warning, despite the matching configuration. Selecting the same current version through Wrangler did not change this marker. After explicitly reviewing the full matching remote binding/domain inventory, the one-time interactive strict upload confirmed the generic provenance prompt; no Dashboard configuration-difference warning was accepted and no confirmation was automatically piped. A subsequent `npm run deploy` completed with `CI=true --strict`, no override warning, and a successful post-deployment comparison. Future releases use only the guarded wrapper above; any new warning blocks automated deployment.

Final verified Worker version: `b521e884-c242-4bd0-8160-8ab6a37d39fe`; deployment: `53b45145-f04d-41e1-8eb2-a799c541bf7c`. Live `/release.json` reports `neraium-222c60bb952b8669` (asset revision `20261012visual1`), matching the production build. Homepage and contact HTML match `dist/` exactly with HTTP 200 and matching release headers. Both `www` redirects preserve paths and queries; `/api/contact-config` reports `enabled:false`. The remote comparison verifies EMAIL restrictions, public settings, both mappings, rate limiter, and the existing Turnstile secret name without accessing its value. Validation passed: production build, Wrangler dry-run, JavaScript syntax checks, 24 contact-service tests, and five configuration-drift guard tests. Website content and layout files were not edited for this configuration fix.

Live Chromium verification also passed: homepage rendered, contact displayed the unavailable message, entered details were preserved, the direct email link remained available, zero POST requests occurred, and no browser errors were observed. Evidence and screenshots are in ignored `artifacts/production/`.
