# Live contact submission investigation — NERAIUM-LIVE-7KQ4

Date: 2026-10-13. Repository: `/home/ubuntu/Neraium-`, branch `codex/neraium-phase-2`.

## Owner-reported observation

The owner reports that the iPhone Safari attempt at approximately 5:45 AM Las Vegas time displayed Turnstile Success, did not show successful submission, switched to “Prepare email draft,” and showed “Submission could not be confirmed.” The time is approximately 12:45 UTC on this date. No inquiry content or credentials are recorded here.

## Evidence and limits

The deployed Worker had safe fixed-category stage diagnostics for rate limiting, request validation, Turnstile server verification, Zoho OAuth refresh, Zoho API send, and accepted response. The production configuration had Workers Observability disabled and no retained Workers Logs/Logpush destination. A live Wrangler tail was running around the reported time, but the local sanitized collector treated Wrangler’s JSON-string event envelope as a string and discarded its event fields because it expected an object containing `logs`. The collector did not persist raw output. The prior Worker also did not attach a per-request correlation ID.

Therefore the reported submission’s failure stage is **unknown**, and whether Zoho accepted it is **unknown**. No evidence from that event is available to classify rate limiting, Turnstile, OAuth, Zoho send, or frontend response handling. The owner has now checked Zoho Inbox and Sent for the unique test identifier and reports finding nothing. Record this as owner-reported nonreceipt, not proof that Zoho never accepted the message. No resend occurred during this investigation.

## Instrumentation repair

Added a strict UUID diagnostic ID carried by the browser request, fixed-schema Worker diagnostics, and response header. The value contains no inquiry data. Added `scripts/tail-contact-diagnostics.mjs`, which handles Wrangler’s observed JSON-string event format and emits only timestamp, event type, UUID, fixed stage/category, and numeric HTTP/provider statuses. Updated the human-verification source guard to compare the validation predicates themselves, independent of response-wrapper syntax; all inspected security predicates remain unchanged.

The deployed collector was validated using a malformed-body request that stopped before Turnstile and email delivery: production returned HTTP 400 and the tail emitted `payload_validation / invalid_body / 400` with the matching UUID. This was a diagnostic probe only, not a contact submission. The email draft fallback and all existing security controls remain enabled.

Owner follow-up validation on 2026-10-13: with the sanitized tail actively running, a headless browser loaded the production contact page and sent a malformed-body probe. The browser observed HTTP 400 and response UUID `a7a5f1c2-dc4e-4ac1-9b30-65af0d34122b`; at `2026-10-13T13:04:53.888Z` the live tail captured that same UUID with `payload_validation / invalid_body / 400`. The request stopped before challenge verification and email delivery. This confirms live capture and browser-response correlation; it was not a real submission.

## Deployment and verification

Guarded production deployment succeeded on 2026-10-13; version `a9b7534b-77a0-4b0f-b0d2-8cc79a5e48dd`. Remote configuration comparison passed before and after deployment, preserving existing bindings, routes, secrets, rate limiting, enabled contact flags, and Zoho selection. Public contact configuration returned HTTP 200 with online intake enabled; the sanitized invalid-body probe returned 400. No OAuth setup or message delivery was repeated.

Focused checks: `tests/contact.test.mjs` 34/34; `tests/contact-diagnostic-tail.test.mjs` 2/2; `tests/contact-activation-gates.test.mjs` 11/11; mobile online-intake browser checks 10/10; production build, syntax checks, and `git diff --check` passed.

## Remaining action

The underlying cause of the reported user-visible failure remains unknown. Owner-reported nonreceipt has been recorded, and the repaired collector must be actively running before the next controlled test. Correlate Worker and browser responses by UUID; a Zoho send timeout remains ambiguous and must not be retried automatically.

## Owner-reported nonreceipt

On 2026-10-13, the owner reported checking Zoho Inbox and Sent for `NERAIUM-LIVE-7KQ4` and finding no message. This is evidence of nonreceipt in those folders as inspected, not definitive evidence that Zoho never accepted the message.

## Captured third production attempt — NERAIUM-LIVE-4PZ8

The owner reports the controlled iPhone Safari attempt failed at approximately 6:06 AM Las Vegas time. While the live collector was running, it captured `2026-10-13T13:06:41.786Z` with diagnostic ID `5c565a9e-8e74-447e-9804-3bbe0539eb72`, stage `zoho_oauth_refresh`, category `network_error`, and HTTP response status 502. The owner reports Turnstile showed Success and the page displayed the email-draft fallback. The request ID and event timestamp align with this attempt.

This is before Zoho Mail API send: `sendZoho` must obtain an access token before it can call `/api/accounts/{id}/messages`. The request therefore did not reach the mail send API and was not accepted there. The OAuth token endpoint request itself failed at the network layer; the diagnostic does not establish whether Zoho issued an access token whose response was lost. No message retry occurred.

## Corrective change and deployment

`worker/zoho-mail.mjs` now makes one 200 ms delayed retry when the OAuth token fetch throws the existing classified `network_error`; timeouts, HTTP failures, and all ambiguous Zoho Mail send outcomes remain non-retryable. A second network error stops before the mail send API. Diagnostics mark whether that bounded retry was attempted, and a successful send after it is distinguishable. This is a token acquisition retry only; the inquiry is sent at most once. Zoho documents a limit of ten access tokens per refresh token in ten minutes, and this implementation adds at most one refresh attempt per inquiry.

Focused regressions pass: the first network failure followed by recovery sends once; two network failures stop without sending; OAuth timeouts are not retried; prior validation, security, auth-rejection, and ambiguous mail-send tests still pass (48 tests total across the focused suites). The final guarded production deployment succeeded on 2026-10-13 with Worker version `b508fa79-6006-4d16-a6fa-dacda55e4091`; pre-deploy dry-run and pre/post production configuration comparisons passed. A post-deploy browser probe returned 400 with UUID `b09ef840-9b74-4a43-b65d-8a35eedcf2c0`; at `2026-10-13T13:12:25.305Z` the live tail captured the same UUID with `payload_validation / invalid_body / 400`. This request stopped before Turnstile and email delivery. No OAuth setup, live delivery test, or new human submission was performed during this repair. Delivery success remains unverified until a later owner-controlled attempt is accepted and Inbox receipt is confirmed.

## Fourth production failure — owner report and investigation

On 2026-10-13, the owner reports that a fourth iPhone Safari submission at approximately 6:15 AM Las Vegas time failed after deployment `b508fa79-6006-4d16-a6fa-dacda55e4091`; Turnstile displayed Success, the page displayed “Submission could not be confirmed,” and the form offered “Prepare email draft.” No unique test identifier or request UUID was supplied.

Cloudflare’s read-only configuration check confirms that version `b508fa79-6006-4d16-a6fa-dacda55e4091` is current. The Worker configuration has Observability disabled, no Logpush destination, and no tail consumer. A local `wrangler tail` process started at 12:49 UTC was still running at 13:16 UTC, but inspection showed it was only an envelope-shape probe: it emits the first event’s outer shape and consumes/discards subsequent events. It is not the sanitized collector in `scripts/tail-contact-diagnostics.mjs`, and it does not persist logs. No stored output or correlated UUID for the 6:15 attempt was available.

Accordingly, the fourth attempt’s request UUID, HTTP status, Worker failure stage, and Zoho acceptance are **unknown**. The prior OAuth refresh retry remains unconfirmed against this attempt. The owner’s browser report establishes a user-visible failure, not a specific backend stage. No resend or live email test was performed.

Because current live delivery is unverified and the latest reported attempt failed, public intake was disabled using a guarded transition that permits only `CONTACT_ENABLED` and `CONTACT_RETENTION_APPROVED` to change from true to false. The guarded production deployment created deployment `dddd4c30-0eb4-4b6a-be20-6a6614b06d51`, Worker version `8f6d5bfb-832e-4c7d-b7a9-18176a77c8a5`. Post-deploy remote configuration comparison passed with the existing routes, resources, rate limiter, and secret names intact. A production browser check returned contact page HTTP 200, `/api/contact-config` `{ "enabled": false }`, button “Prepare email draft,” and a working direct-email link. Re-enable intake only after diagnostic correlation and a successful controlled delivery are supported by evidence.

## Verified root cause and guarded restoration

The same source reproduces a deterministic `TypeError` in Cloudflare's workerd runtime: `redirect: 'error'` is unsupported. OAuth fails before an outbound request and the generic catch misclassifies it as `network_error`. Retrying these options cannot work. Both OAuth and Mail requests now use `manual`; existing non-2xx checks reject redirects without forwarding credentials. Actual workerd regressions failed before the fix and pass afterward. This proves the code defect; the original fourth request's missing event observations are not reconstructed.

One exclusive, operator-controlled check executed the actual delivery helper in workerd with the existing credentials and real Zoho API. `NERAIUM-REPAIR-E164BAEC` was accepted at 2026-10-13T13:36:09.198Z (HTTP 200/provider 200, no retries). The owner reports receipt in Zoho Inbox at 6:36 AM Las Vegas. The check was not repeated. The live site's browser JavaScript was then connected to the actual index/contact/Zoho modules in workerd with simulated upstream responses: one submission returned 200, request and response UUIDs matched, and the browser displayed its acceptance message. This integration check sent no email and did not repeat human Turnstile qualification.

Sanitized tail events now persist to a private local artifact file; the running collector captured matching production 503/disabled and 400/field-validation probes without inquiry data. Activation used a freshly recorded disabled baseline and the existing evidence validator and guarded deployment workflow. Worker `88c1ceac-4a83-4f97-8ef6-50de4a4a96a1` now has both approved flags true. Pre/post configuration comparisons passed, live configuration reports enabled, and the live browser displays the send action and loaded challenge. Credentials, bindings, security controls, privacy policy and website assets were preserved; static assets were reused. No additional live visitor submission was made.

Authoritative repair/receipt/activation evidence: `root-cause-repair-20261013.json`. Live sanitized collector session: `87080`; persisted events: `artifacts/contact-diagnostics/production.jsonl`. Retention approval and existing fallback remain in place.

## Owner-confirmed live end-to-end delivery

On 2026-10-13, the owner confirms successfully submitting a real inquiry through `https://neraium.com/contact`. The complete inquiry arrived in the owner’s Zoho Inbox at 6:49 AM Las Vegas time from `website@neraium.com`, including all submitted fields. This is owner-confirmed live end-to-end delivery, separate from the earlier operator delivery and simulated integration checks. No HTTP status, request UUID, exact seconds, or inquiry content is inferred or recorded. No further test submission, production configuration change, or deployment was performed. The contact delivery repair is complete.
