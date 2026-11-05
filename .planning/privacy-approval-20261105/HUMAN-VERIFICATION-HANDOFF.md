# Fresh contact security verification: authorization boundary

Privacy-file approval has been recorded exactly as authorized in the current founder message. This does not refresh human challenge observations or authorize deployment. No old test timestamps, successful observations, inbox-receipt attestation or waiver has been changed.

Current checkout: /home/ubuntu/Neraium-
Branch: codex/neraium-phase-2
Website commit: 9a7eb4e3fd1ec768c4d23db289fe0aa694a1a8bd
Approved Privacy SHA-256: ad2ca1b1d4073aca46e762637f52fe66885cf93521d5c5ce30ef57f3b66e9de0

## Why the remaining request cannot finish without a separate decision

`human-testing.md` and `iphone-testing.md` in `.planning/contact-activation/` document retirement of the temporary private verification endpoint. Current `worker/index.mjs` does not mount the archived probe. GET-only live verification checks its current availability. The existing archived test harness requires real owner-operated Turnstile tokens, exact-token replay, an unused token aged at least 310 seconds, and isolated synthetic mail-provider failure/recovery. A normal public inquiry cannot safely substitute for that complete isolated sequence. Automated local tests cannot constitute human evidence.

The founder explicitly said not to deploy without separate authorization. Installing a temporary private verification endpoint is itself a production deployment, even when it sends no email. Accordingly no source/configuration/secret/storage changes or installation occurred. No mail was sent.

## Concrete proposed session for separate review

1. Prepare a narrowly scoped verifier-only change for review, preserving the currently deployed static website bytes (do not publish the redesigned site incidentally). Inventory the actual current Worker version, routes, bindings and migration history read-only before preparing it.
2. Confirm the repeat-session implementation and guards support the existing retired Durable Object migration history. The archived first-session provisioning helper is not a ready-to-run repeat installer: it assumes the original v1 provisioning state. Do not reset migrations, reuse deleted storage/class identities blindly, or weaken the guard to accommodate them. Any adaptation requires its own tested review package before deployment approval.
3. Obtain separate explicit authorization for temporary verifier installation, any temporary public-intake disablement required by the reviewed safeguards, its time limit, and complete removal/restoration. No authorization for the redesigned website release is implied. No real email is needed for the isolated synthetic security scenarios; any real email must be separately authorized.
4. Schedule the founder in a supported, manually operated browser. Use an authenticated HTTPS page, absolute session expiry, least-privilege allowlist and no-mail environment. Deliver any one-time credential through a separately agreed private channel, never public logs or repository artifacts.
5. Have the founder complete all six scenarios: success (200); exact-token replay (400); synthetic provider failure with a new token (502); recovery with another new token (200); expiry of an unused token aged at least 310 seconds (400 with challenge checked/invalid); and field validation before challenge verification (400). Observe and record limiter behavior within its documented semantics. Retain only sanitized observations; never tokens, cookies or passwords.
6. Preserve the original export and record new genuine operator confirmation, configuration/code identities, and actual session timestamps. Do not transform the archived 2026-10-13 export into a current result.
7. Remove the temporary route/module, secret, local credential and temporary storage using reviewed guards; verify cleanup and restore the previously approved operational configuration. Preserve public static assets. Confirm no unintended release or extra mail action occurred.
8. Run the unchanged `npm run config:check`. A real pass is required; neither local tests nor approval of the Privacy hash substitutes for human security verification.

## Current state

Privacy approval: recorded, source/build/commit hash match.
Fresh human session: not performed; awaiting separately authorized verifier preparation/deployment and human availability.
Guarded production preflight: still fails closed on expired human evidence.
No push, deployment, production configuration/secret changes or email sends performed.
