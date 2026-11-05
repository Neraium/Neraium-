# Isolated contact verifier: proposed workflow for review

**Local implementation only. No deployment, real challenge, real email, public website release or human attestation has occurred.** The checked-in configuration is disabled and has a non-routable placeholder hostname/widget. No real session credentials have been created. Local tests use explicitly fabricated fixtures.

This is a separate Cloudflare Worker, `neraium-contact-verifier`, in the existing reviewed account. It has no production routes, custom domains, DNS, assets, mail/service bindings or production secrets. Its only network operation is the Turnstile siteverify request, with redirects not followed. A read-only account check found the Worker name available and the existing workers.dev subdomain configured. Proposed URL, **not active**:

`https://neraium-contact-verifier.neraiumai.workers.dev/verify`

No production Worker/source/configuration, intake enable flag, public asset, Privacy file, owner confirmation, activation guard or prior verifier migration record is changed by this proposal. The production release remains `neraium-8e2a5eeb19ab306f`. No AWS resources are involved.

## Files

- `index.mjs`: HTTPS/exact-origin handling, authentication, bounded JSON, isolated environment and no-mail execution of the unchanged `worker/contact.mjs` handler.
- `session.mjs`: separate SQLite-backed Durable Object; single-use redemption; fixed expiry; serialized scenario reservations; server-owned timing and sanitized observations; revocation/alarm deletion.
- `panel.mjs`: authenticated responsive operator panel and fragment-only private-link handoff.
- `subject-identity.mjs`: hashes of the exact contact-handler/Zoho module source. The preparation check rejects stale source identity.
- `wrangler.jsonc`: disabled standalone draft, dedicated account/name, own limiter and SQLite namespace, no route/domain/production bindings.
- `retire.mjs` / `wrangler.retire.jsonc`: verifier-only 404 tombstone and appended deletion migration. They cannot alter the production migration ledger.
- `../../scripts/review-isolated-verifier.mjs`: read-only, strict configuration/source/Privacy review and package fingerprint; no deploy/API action. Separate retirement validation rejects unexpected additions or migration rewrites.
- `../../scripts/create-isolated-verifier-session.mjs`: explicit local-only credential-file creation in an existing owner-only 0700 directory outside the checkout. Exclusive 0600 output; no credential values printed and nothing uploaded.

## Authentication and isolation

The service requires an explicit enable flag, a reviewed dedicated workers.dev hostname, a real separate widget/siteverify secret, and a `VERIFIER_ACCESS` secret describing one session. Unknown bindings, including mail, Zoho, public assets or production service bindings, fail closed. Public unauthenticated access exposes only a credential bootstrap page, with no challenge widget, results or secret data. All verification operations require the session cookie.

The bootstrap URL carries a 256-bit one-use ticket only in its fragment. The browser removes the fragment before same-origin POST redemption. Only its SHA-256 is held in the server access configuration; a Durable Object transaction prevents double redemption. A separate 256-bit secret cookie uses Secure, HttpOnly, SameSite=Strict and Path=/verify. The session has an absolute maximum of 20 minutes, with no renewal; redemption ends within 10 minutes. Revocation and an expiry alarm remove access/data. No tokens, tickets, cookie values or IP addresses are exported or persisted as evidence. Challenge hashes are retained in temporary session state to enforce token separation, then erased by the alarm.

POST requests require exact same-origin HTTPS/host, JSON, and bounded bodies. No CORS grant is made. Responses use no-store, no-referrer, noindex, frame blocking, nonce-only local scripts/styles plus the explicit Turnstile host. No raw input/provider/credential error is reflected. The unchanged contact handler emits its existing fixed diagnostic categories; request observability is disabled. The local test screenshots contain fixture data only.

The handler receives an explicit synthetic environment, not the Worker environment: a synthetic EMAIL object is the only delivery sink. Success/recovery return a synthetic receipt; the failure scenario throws inside that sink. No real email binding or Zoho credential is available, and the delivery-fetch argument always denies network delivery. Only the siteverify call is permitted by the verifier's outbound wrapper. Its limiter is a separate binding/namespace, so test traffic does not consume the production form's limiter keys.

## Human sequence and evidence

1. Open the private link in a supported, manually operated browser through the agreed private channel. Do not put credentials in chat, screenshots, repository files or logs.
2. Solve a challenge and run **success**. Run **replay** immediately using the exact retained successful token.
3. Reset/solve a fresh challenge for **failure** (synthetic provider failure). Reset/solve another for **recovery**.
4. Reset/solve another fresh challenge and **capture** it unused. Keep the tab open and wait at least **310 seconds** before **expiry**. The server, not a client-supplied elapsed time, qualifies the duration. An expiry token that has been attempted cannot be retried to manufacture expiry from replay; an unexpected result requires a new session.
5. Run **validation**, which must reject fields before siteverify, then **rate-limit**, which sends at most eight invalid synthetic requests against only the isolated limiter. No rate finding is recorded unless an actual 429 occurs. The local tests do not establish the real provider's eventually consistent rate behavior.
6. Copy only the sanitized server observation JSON. Separately confirm who operated the browser, the actual steps and their results. The UI does not automatically attest human participation.
7. Revoke the private session, then have the operator perform and verify resource cleanup. Fixed expiry is a backstop, not a substitute for cleanup.

The server enforces order, exact replay identity, fresh tokens, unused-token capture, concurrency rejection and an attempt limit. Exported `provider_success` and hostname/action context matching are distinct from the combined accepted result. No raw provider response is exported.

## Important production-gate compatibility limit

The authorized [maintenance policy](MAINTENANCE.md) now distinguishes already-active intake from first activation. It requires these isolated observations PLUS fresh actual production-host checks and actual cleanup with intake enabled. It does not relabel isolated results or relax the initial-activation path. The original compatibility discussion below applies to initial activation; the maintenance correction supersedes its description of maintenance as not yet implemented. Temporary installation remains separately unauthorized.

The export schema is `neraium.isolated-contact-verifier.v1`, always `candidate_only: true`. It contains neither a `human_operated: true` claim nor a production approval. Server scenario completion does not mean founder participation or deployment readiness.

The **unchanged** production activation guard currently requires `neraium.com`/`www.neraium.com` human evidence, original code/config identities, and cleanup observations with intake disabled. This proposal uses a different origin/widget/limiter/namespace while production intake remains enabled. It exercises the same source handler and required scenario types, but does not prove the live production widget, limiter instance, mail delivery or deployed environment. The current guard will not accept these alternate observations automatically.

**Do not relabel the hostname, invent disabled-intake cleanup, overwrite old evidence, or copy the new results into the old schema to make preflight pass.** A separately reviewed evidence-acceptance policy/path preserving equivalent rigor is a remaining decision before these observations could clear production preflight. This implementation does not add such a path or weaken the current guard. Until that decision is implemented and reviewed, `npm run config:check` legitimately remains blocked by the old expired evidence even after an isolated session succeeds.

## Recognition-only evidence proposal

[EVIDENCE-POLICY.md](EVIDENCE-POLICY.md) specifies a separately testable recognition boundary. `evidence-review.mjs` requires an independently captured export digest, exact source/origin/session, genuine human attestation, complete ordered observations and real timing. It always returns false for production-host/widget/limiter/delivery proof, cleanup, production-gate satisfaction and release authorization. The production gate does not import it. This is a policy proposal for review, not an alternate release path.

The fresh audit tightened provider-response validation: malformed responses and invalid-secret errors cannot qualify unused-token expiry. A real boolean rejection and timeout/duplicate marker are required for new isolated expiry observations. Session exports include an opaque session ID for provenance; this ID is separate from the authentication cookie. The private credential helper enforces the checkout boundary relative to its own location, regardless of the caller's working directory, and can locally prepare a strictly two-secret upload file without printing values.

[OPERATIONS.md](OPERATIONS.md) contains the exact temporary installation and retirement commands for separate approval. The GET-only boundary inspector hashes Worker/routes/assets/DNS snapshots, refuses to overwrite baselines, and reports unavailable verification honestly. Current DNS record inventory access returns HTTP403 and remains an explicit review requirement; no DNS write occurred.

## Local validation (no deployment)

From the website checkout:

```sh
node scripts/review-isolated-verifier.mjs
node --test tests/isolated-verifier*.test.mjs
node --test tests/*.test.mjs
```

A local Wrangler dry run can package each draft, without uploading it:

```sh
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.jsonc --dry-run --outdir .planning/isolated-verifier-20261105/bundle
CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler deploy --config verification/contact/wrangler.retire.jsonc --dry-run --outdir .planning/isolated-verifier-20261105/retirement-bundle
```

Do not omit `--dry-run`. These commands are packaging checks, not release authorization. The normal production deployment command must not be pointed at this draft as a workaround for its guard.

## Remaining requirements before any temporary deployment

- Review this architecture, code, source/package fingerprint, tests and the evidence-acceptance limitation. Obtain separate explicit authorization for only this new Worker/widget/temporary credentials and their cleanup. Website release/push remain unauthorized.
- Recheck the exact Cloudflare account, available dedicated Worker name, account workers.dev subdomain and isolated limiter namespace. The prior name-availability check is only a point-in-time observation. Refuse to overwrite an existing Worker. If the name or namespace changes, regenerate and re-review the exact package fingerprint.
- Create a **separate** real Turnstile widget limited to the dedicated hostname, with the intended action/settings. Do not change the production widget or its allowed hostnames and never retrieve its secret. Turnstile hostname authorization must cover the new verifier origin: [official hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/).
- Configure the reviewed hostname/site key and enable only the dedicated candidate. Run `validateIsolatedConfig(candidate, production, {deploymentCandidate:true})`. The disabled checked-in draft is not an upload-ready enabled candidate.
- Coordinate a staffed <=20-minute human session. Only then create a new one-use credential file via the local helper in an owner-only 0700 private directory outside the checkout. Supply `VERIFIER_ACCESS` and the new widget's `TURNSTILE_SECRET_KEY` through the approved secret-upload channel/stdin; do not use command-line secret values. Agree a secure private link delivery method before creating or disclosing it. No such live credential currently exists.
- Bind code/source identity, candidate configuration and resulting deployment identity to the review. Perform strict pre/post comparisons of the **separate** Worker, plus read-only checks that production Worker/version/routes/assets/configuration/intake and approved Privacy/owner records remain unchanged. No automatic deployment tool is supplied here, and no review decision is implied by a dry run. The exact proposed commands and authorization checkpoints are in [OPERATIONS.md](OPERATIONS.md).

## Cleanup plan for separate authorization

Revoke the session first. Deploy only the reviewed dedicated tombstone/retirement configuration if necessary to remove the separate SQLite class/binding, then remove both dedicated secrets, the new widget and the dedicated Worker. Verify the old session/URL can no longer be used and private local credential files are removed. Confirm the isolated storage namespace/class was deleted, not merely hidden by a 404. Retain only sanitized evidence and actual cleanup observations. Recompare the production Worker/version/routes/configuration/intake and approved disclosure/owner records.

The original production `contact-verification-session-v1/v2` ledger is preserved. This service has a distinct class and namespace, using its own append-only creation/deletion history. Do not reset or reinterpret the old ledger. Cloudflare documents SQLite namespaces and migrations here: [Durable Object storage guidance](https://developers.cloudflare.com/durable-objects/best-practices/access-durable-objects-storage/).

If a session fails or the operator is unavailable, revoke/expire it and clean up; do not mark human checks complete or promote synthetic test output as real evidence.
