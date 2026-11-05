# Publish the approved static redesign without changing contact controls

Cloudflare stores static assets in Worker versions. There is no independent in-place asset pointer update for this installation. The supported content-only release uploads a new version with the EXACT deployed JavaScript module bytes and changes its static asset package only. The version ID changes; the contact code, secrets, Turnstile, email, rate limiter, compatibility settings, migration state, API routing, DNS and Worker routes do not. No new infrastructure or verifier is involved.

The release command uses the existing Cloudflare Workers asset-upload/version/deployment APIs and existing `Workers Scripts Edit` credential. Turnstile edit/DNS write permissions are not required. The command is NOT authorized to publish merely by being prepared.

## Applicable checks

The unchanged runtime-deployment entry point (`npm run deploy`, `npm run config:check`) still requires its activation/maintenance evidence. Neither it nor its checks is disabled or given a skip flag.

This separate content-only entry point can proceed ONLY when the existing read-only full production configuration comparison passes, production intake is already active, every generated public asset matches approved commit `ef820edcffe367884e2b88e6ce73640944af545e`, the approved Privacy hash/owner confirmations are unchanged, the entire downloaded production code is reused byte-for-byte, and all production settings/bindings/routes remain identical. Unknown/deleted resources, undeployed competing versions, altered asset files, changed code/configuration or incomplete inspection fail closed. Release annotations alone may differ.

Fresh contact-activation tests are not applicable to this scope: this entry point cannot enable intake or change any contact handler/control. Its substitute is exact live-code preservation plus binding/runtime/configuration equality, checked before upload, on the undeployed candidate and after publication. Candidate code etag must equal the original code etag. Changed approved HTML/CSS/JS, image/font/SEO files and approved `_headers`/`_redirects` remain subject to the asset manifest, existing static/browser tests and exact source/build checks. `_headers`/`_redirects` are used as approved asset configuration, not served as public files.

No token values or upload JWTs are printed or written. Upload JWTs remain in process memory only. All non-asset bindings (including secrets) use strict API inheritance; secret values are never retrieved. Inheritance requires the latest uploaded version to be the currently deployed baseline before upload. The candidate must have the immediately consecutive version number, detecting a competing upload/secret rotation in the upload window; latest/live identities are checked again before deployment. The workflow never modifies DNS, routes, schedules, Worker settings, email settings or secrets. Version upload/deployment are its only Worker writes.

## Prepare: read-only on Cloudflare

From a clean tracked checkout (unrelated untracked work is preserved):

```sh
npm run build
node --test tests/*.test.mjs
node scripts/deploy-static-assets.mjs prepare artifacts/static-assets/approved-plan.json
```

Preparation verifies the complete candidate package against the approved source and compares every candidate public file with its actual production URL, recording only hashes/statuses. It records the original version, exact module hashes, production invariants, full candidate file hashes and a plan fingerprint. A fresh plan filename is required for reruns; files are never silently overwritten. Review the plan before publishing. Preparation makes no Cloudflare mutations.

## Publish: requires separate founder authorization

Use the SAME committed HEAD and the reviewed plan. Arrange an exclusive release window; do not perform concurrent Cloudflare administration.

```sh
node scripts/deploy-static-assets.mjs publish artifacts/static-assets/approved-plan.json
```

The command rechecks the plan/source/production identities, uploads only the approved assets, creates an undeployed version reusing the downloaded live modules and strict inherited bindings, then independently checks the candidate's code etag, all bindings/runtime settings, approved headers/redirects and unchanged API routing. It refuses to deploy a differing candidate. It rechecks that production still runs the baseline, then deploys the candidate at100%. It confirms unchanged production controls, code, routes and active contact configuration and verifies every published asset hash. It sends no contact inquiry, email, or Turnstile challenge.

`PLAN.deployment.json` retains upload/deployment status and version IDs, never credentials. Ambiguous failures are not automatically retried; inspect the receipt/current state. If an undeployed candidate remains, do not repeat the command or silently overwrite it. An asset release cannot be used to smuggle a pending runtime change.

## Rollback: restore the recorded previous version

```sh
node scripts/deploy-static-assets.mjs rollback artifacts/static-assets/approved-plan.json
```

This checks the receipt, ensures the live/latest version is exactly this release's candidate, confirms the original and current contact controls match, and refuses rollback across any intervening change. It deploys the recorded original version at100%, restoring that version's original assets, and verifies the old code/configuration/infrastructure and enabled contact form. It performs no secret, DNS, route or migration writes. The previous version ID is captured during preparation; do not guess an older version or use an unguarded rollback command.

Provider references: [asset upload and version attachment](https://developers.cloudflare.com/workers/static-assets/direct-upload/), [strict inherited bindings](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/), [version content etag](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/), [versions and deployments](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/).
