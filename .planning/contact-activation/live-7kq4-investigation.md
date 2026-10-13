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
