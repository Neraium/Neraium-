# Neraium public website

Neraium’s public website presents Systemic Infrastructure Intelligence across connected infrastructure. Municipal water/wastewater and Las Vegas hospitality/resorts are the initial commercial focus. Source is plain HTML, CSS, SVG, and vanilla JavaScript. A small Cloudflare Worker adds configuration-gated inquiry handling; no new runtime dependency or form service is introduced.

## Pages and navigation

Home introduces the problem, systemic intelligence, platform differentiation, initial applications, operational value, and evaluation. Platform explains the integrated architecture and capability maturity. Applications leads to dedicated Water & Wastewater, Hospitality & Resorts, and Broader Infrastructure pages. Company preserves the authentic founder portrait and presents program participation with explicit boundaries.

Methodology, Evidence, Security, Historical Evaluation (`/pilot`), Operator Brief, Privacy, Contact, and the custom 404 remain available. Legacy redirects and clean URLs are preserved. The footer contains six essential links; deeper material is linked from relevant pages.

## Claims and evidence

See [AUDIT.md](AUDIT.md) for the repository/live-site audit, source references, maturity decisions, and verification evidence. Platform distinguishes current analytical functionality from the newer durable Continuous Analytical Memory integration and exploratory Operational Evidence Testing. Neither development path is described as proven production functionality. The marketing website does not certify deployment, diagnosis, savings, failure prediction, fleet intelligence, or guaranteed integrations.

Existing approved logo and founder assets are preserved. Documented generated infrastructure imagery is representative, not customer imagery. See [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).

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

The default configuration has `CONTACT_ENABLED=false`. The form validates four required fields (name, work email, organization, system/facility). Review question, role, and contact preference are optional. Until online intake is configured, it prepares an encoded email draft and requires the visitor to review and send it. It never claims the inquiry was submitted. A direct email path remains available, including without JavaScript. Industry links prefill general system context.

When all activation requirements below are present, `/api/contact-config` exposes only the public Turnstile site key and the enabled flag. The form loads Cloudflare Turnstile and submits JSON to the same-origin `/api/contact` route. The server enforces origin/hostname, content type, bounded body size, allowed fields, field limits, email validation, honeypot, rate limit, and server-side challenge verification including hostname/action. It sends a plain-text inquiry through the Cloudflare native email binding to a server-configured destination. The reply address is validated; visitors cannot choose the destination or headers.

Success requires a returned email-service message ID. The UI says “accepted for email delivery” and explicitly does not confirm inbox receipt. Provider rejection, challenge failure, or unavailable configuration cannot produce success. Entries remain after failure. The handler does not log fields, IPs, secrets, or provider-error details and does not persist a submission database.

### Exact remaining online-intake configuration

No production resource, credential, DNS record, or account setting was changed. Enable only after the owner has completed these items in the existing Cloudflare account:

1. Approve the inquiry recipient, sending identity, mailbox access, and a retention/deletion policy. Update Privacy with the approved concrete retention terms. Set `CONTACT_RETENTION_APPROVED="true"` only after this decision; it is a deployment attestation, not a policy engine.
2. Configure Cloudflare Email Service for the approved sending domain and recipient. Add a `send_email` binding named `EMAIL`, restricted with `allowed_destination_addresses` to the approved destination. Set `CONTACT_FROM` to the verified sender and `CONTACT_TO` to the approved recipient. The code uses Cloudflare’s native structured `send()` API and requires its `messageId` acknowledgement.
3. Create a Turnstile widget restricted to `neraium.com` and `www.neraium.com`. Set `TURNSTILE_SITE_KEY` as a public variable and `TURNSTILE_SECRET_KEY` as a Cloudflare secret. Never place the secret in source, build output, arguments, screenshots, or documentation.
4. Add a `ratelimits` binding named `CONTACT_RATE_LIMITER`, with an owner-selected namespace ID and `simple: { "limit": 5, "period": 60 }`. The native limiter is per Cloudflare location; it is abuse mitigation, not a global quota. The handler hashes the trusted edge IP for its limiter key and does not log it.
5. Set `CONTACT_HOSTNAMES="neraium.com,www.neraium.com"` and finally `CONTACT_ENABLED="true"`. Both flags and every dependency must exist before the form switches modes. The committed configuration intentionally contains no fabricated production binding IDs.
6. In an approved staging environment, verify a real challenge, provider acceptance, destination receipt, reply-to behavior, expired-token handling, rate limiting, and delivery rejection. All local service tests use mocks; no real inquiry was sent during this work.

The CSP admits only the existing origin and the specific Cloudflare challenge origin needed by this workflow. Turnstile is loaded only when intake is enabled. No unapproved third-party form processor, CRM, analytics, or advertising service is used.

Cloudflare references: [native email sending](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [send-binding restrictions](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), and [Worker rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Hosting and review

`wrangler.jsonc` routes only `/api/*` through the Worker first and leaves normal static routing, headers, and redirects intact. `netlify.toml` retains static hosting compatibility; on Netlify the email-draft path remains available and the Cloudflare intake does not run. The canonical origin remains `https://www.neraium.com`; apex/HTTP consolidation is an account-level setting outside this change.

This task is local-only. No push, merge, deploy, DNS update, external registration, or production infrastructure modification is authorized. The Worker dry-run bundles locally without deployment.

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

The verifier checks all 14 major routes at desktop, tablet, and mobile sizes, image loading, overflow, relative navigation, security/noindex headers, redirects, 404s, retired-artifact exclusion, and the email-draft fallback. It checks that contact intake is disabled before interacting with the form. Remote verification accepts only this staging Worker’s Workers.dev hostname. It is not a production-release test script. Reports and screenshots stay in `artifacts/staging/`.

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
