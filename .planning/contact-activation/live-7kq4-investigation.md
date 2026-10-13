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
