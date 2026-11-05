# Exact proposed verifier installation and retirement runbook

**For approval only. Do not execute cloud actions until separately authorized. No steps below have been deployed.** Architecture approval in principle is not deployment authorization. Read EVIDENCE-POLICY.md first: this standalone session does not automatically clear the unchanged production release gate.

Scope: only Worker `neraium-contact-verifier` in account `9820361c238dcdeef0b72b24ec3734db`, its own new Turnstile widget, two private secrets, separate limiter and SQLite class. No production routes/custom domains/DNS changes, Worker `website` updates, intake pause, public asset upload, owner-record changes or AWS actions. No `--name`, `--env`, `--force`, `--keep-vars`, or route overrides are allowed. In particular, Wrangler deletion `--force` can break dependencies and must not be used.

Proposed URL, not yet active: `https://neraium-contact-verifier.neraiumai.workers.dev/verify`.

## A. Local preparation and review

Run from `/home/ubuntu/Neraium-`. Confirm branch/commit and preserve unrelated untracked files. Read the committed audit and review manifest, and ensure source/tests are unchanged since approval.

```sh
node scripts/review-isolated-verifier.mjs
node --test tests/*.test.mjs
node scripts/inspect-isolated-verifier-boundaries.mjs .planning/verifier-before.json
```

Use fresh output filenames on a rerun; snapshots never overwrite an existing artifact or baseline. The inspector makes only GETs and records hashes rather than DNS/binding values. Require production settings/routes/version/assets unchanged, contact intake enabled and matching bindings. It must report the new Worker absent. Recheck the account workers.dev subdomain, name availability, dedicated limiter namespace and lack of consumers of the new class. The current API token cannot read DNS records (HTTP403); obtain an independently authorized READ-only DNS inventory/attestation before calling that category verified. Do not change DNS or broaden permissions silently.

Review EVIDENCE-POLICY.md and decide the treatment of isolated versus remaining production-host proof. Do not deploy merely to generate results with no approved acceptance plan.

## B. Dedicated widget and public configuration inputs

After explicit authorization for this new resource, create a separate managed Turnstile widget named for this verifier, limited to `neraium-contact-verifier.neraiumai.workers.dev`, with action `evaluation` in the implementation. Record its actual new site key/widget identity. Do not edit or read the secret of the production widget. Store the NEW widget secret in a 0600 file in an owner-only 0700 directory outside all checkouts, using the agreed private credential process. No secret goes in command arguments, chat, a screenshot or Git.

Create `verification/contact/wrangler.session.jsonc` by copying the disabled `wrangler.jsonc` in this same directory and changing ONLY its `VERIFIER_HOSTNAME` and `TURNSTILE_SITE_KEY` to those reviewed public inputs. Keep `VERIFIER_ENABLED` false. This ignored per-session file is not committed. Create `wrangler.enabled.jsonc` as its exact copy with only that flag true. No routes, new binding types, mail credentials, public assets or other account/name changes are allowed.

Validate the actual files:

```sh
node --input-type=module <<'JS'
import {readFile} from 'node:fs/promises';
import {validateIsolatedConfig,validateIsolatedEnableTransition,validateIsolatedRetirementConfig} from './scripts/review-isolated-verifier.mjs';
const production=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const disabled=JSON.parse(await readFile('verification/contact/wrangler.session.jsonc','utf8'));
const enabled=JSON.parse(await readFile('verification/contact/wrangler.enabled.jsonc','utf8'));
const retired=JSON.parse(await readFile('verification/contact/wrangler.retire.jsonc','utf8'));
validateIsolatedConfig(disabled,production,{configuredInputs:true});
validateIsolatedEnableTransition(disabled,enabled,production);
validateIsolatedRetirementConfig(enabled,retired,production);
console.log('Only the dedicated flag changes; installation and retirement scope checks pass.');
JS
```

Package without uploading (explicit dry run):

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.enabled.jsonc --dry-run --autoconfig=false --outdir .planning/verifier-enabled-bundle
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.retire.jsonc --dry-run --autoconfig=false --outdir .planning/verifier-retirement-bundle
```

Record the exact effective config/bundle/package fingerprints, identities and reviewed cleanup steps. Obtain authorization for THOSE concrete inputs and the temporary resource lifetime, including creation and deletion of the dedicated widget/Worker/storage/secrets. If a name/namespace/migration differs from the reviewed draft, stop and re-review rather than modifying production or resetting its ledger.

## C. Staffed session and private upload file

Agree a supported browser session and a private delivery channel before creating the one-use link. Ensure the private directory already exists, is owned by the operator, mode0700 and outside the checkout. The local helper creates an exclusive mode0600 file, prints no ticket/cookie and uploads nothing:

```sh
node scripts/create-isolated-verifier-session.mjs /home/ubuntu/.config/neraium/verifier-private neraium-contact-verifier.neraiumai.workers.dev
```

The file expires for redemption within10 minutes and access within20 minutes. Do not create it before the operator is ready. A new run needs a fresh private directory/file; do not overwrite or reuse an old ticket.

Store the new dedicated widget secret as `turnstile-widget-secret.txt` in that same private directory, with mode0600 and no symlink. Then create the upload file with the local-only helper:

```sh
node scripts/create-isolated-verifier-session.mjs --upload /home/ubuntu/.config/neraium/verifier-private neraium-contact-verifier.neraiumai.workers.dev
```

It validates private input permissions, session/link identity and deadlines, and creates a NEW mode0600 `upload-secrets.json` containing only `VERIFIER_ACCESS` and `TURNSTILE_SECRET_KEY`. Nothing is printed or uploaded. Never upload the original helper file: its `private_url` is not a permitted Worker binding. Preserve only nonsensitive fingerprints in review evidence.

## D. Temporary installation — requires separate explicit authorization

Only after A–C and authorization, recheck the new Worker is absent and repeat the invariance baseline. Install directly with the two required secrets atomically; do not alter the production Worker or upload `dist/`:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.enabled.jsonc --secrets-file /home/ubuntu/.config/neraium/verifier-private/upload-secrets.json --strict --autoconfig=false
```

This exact CLI supports `--secrets-file`; omitted secrets are additive, NOT deleted. Therefore refuse to overwrite an existing Worker and explicitly remove both secrets during cleanup. Never fall back to an unguarded upload if strict mode rejects the candidate. Never run the repository's production deploy command for this service.

Read back the new version, binding/secret NAMES, no extra routes/services/mail/assets, exact host/vars and class/limiter IDs; compare the deployed artifact with the reviewed candidate. Record its actual immutable deployment/version identity. Confirm unauthenticated state/test operations are404, wrong-origin requests fail, and no secret is exposed. Do not use valid human tokens in automated checks.

```sh
node scripts/inspect-isolated-verifier-boundaries.mjs .planning/verifier-after-install.json .planning/verifier-before.json
```

Any production difference or unknown verification category holds the operation for review. The new verifier's existence alone is allowed; a production change is not. The inspector cannot waive release gates. Deliver the fragment link only through the agreed private channel; do not print it to tool output or commit it.

## E. Actual human sequence

The founder manually operates the authenticated panel. Follow README.md's ordered success200, exact-token replay400, fresh-token synthetic failure502, fresh-token recovery200, unused-token capture then >=310-second expiry400, validation400 and isolated429 steps. If a captured token has been attempted unexpectedly, restart with a new session; do not retry it to manufacture expiry. Capture the original sanitized export independently before revocation and obtain the founder's actual participation confirmation. No real email is sent by this harness. Do not edit results, hostname, dates, or old evidence files.

The recognition-only module may review an independently obtained export/digest and attestation according to EVIDENCE-POLICY.md. Its result is never a production approval. Preserve failed/partial attempts and distinguish provider/network failure from synthetic sink failure.

## F. Retirement and cleanup — part of the temporary authorization

First preserve sanitized observations and revoke the session using the authenticated panel. If the session expired or panel is unavailable, do not claim revocation; proceed to the reviewed tombstone and verify access denial. Snapshot production boundaries again. Install only the dedicated 404 tombstone with its append-only deletion migration:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.retire.jsonc --strict --autoconfig=false
```

Verify the separate class/namespace was actually deleted through the account inventory, not merely unbound or hidden by404. Do not reset production migrations. The access/Turnstile secrets persist across code uploads unless explicitly removed:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler secret delete VERIFIER_ACCESS --config verification/contact/wrangler.retire.jsonc
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler secret delete TURNSTILE_SECRET_KEY --config verification/contact/wrangler.retire.jsonc
```

Confirm both dedicated secret names are absent. Delete ONLY the newly recorded verifier widget from the Cloudflare dashboard, after comparing its site key/identity with the enabled candidate and confirming it is NOT the production widget. Verify its absence. Delete only the dedicated Worker (without `--force`):

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler delete --config verification/contact/wrangler.retire.jsonc
```

If dependency warnings appear, stop and inspect them; never force deletion. Confirm Worker, widget, secrets and separate namespace are absent and the old session cannot be used. Remove only the exact private credential/upload/widget-secret files and the two ignored per-session public config files after recording their nonsensitive identities; do not delete unrelated private files. Retain only sanitized evidence and honest cleanup observations. Resource deletion is intentionally destructive to temporary state, so capture evidence first; no automatic rollback to an expired session is promised.

```sh
node scripts/inspect-isolated-verifier-boundaries.mjs .planning/verifier-after-cleanup.json .planning/verifier-before.json
npm run config:check
```

The preflight may still fail because isolated-only evidence does not meet the unchanged production-host/disabled-intake schema. Stop there. Do not rename evidence, invent false intake state, reset timestamps, use skip flags or run a website deploy to bypass it. Apply only a separately reviewed evidence-policy decision. The redesigned public website still requires its own successful guarded preflight and separate release authorization.
