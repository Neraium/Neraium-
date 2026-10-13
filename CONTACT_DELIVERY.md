# Contact delivery and activation

Status (2026-10-13): **not operational**. No real inquiry was sent or received during this assignment. Both production flags remain false.

## Reference and implementation

The implementation reference is [Neraium/PPCLV](https://github.com/Neraium/PPCLV/blob/f94f18fdd4969440b8d136dec6434cd02ac3a2b7/worker/index.mjs), revision `f94f18fdd4969440b8d136dec6434cd02ac3a2b7`. Its contact Worker refreshes an OAuth token and submits mail through Zoho HTTPS. No PPCLV production changes, mailbox access, credentials, or customer data were used. Its source and delivery research describe the approach; they do not independently establish inbox receipt.

Neraium now supports the same approach in `worker/zoho-mail.mjs`, selected explicitly with `CONTACT_DELIVERY=zoho`. Absence of that variable preserves existing Cloudflare email delivery. An unknown provider fails closed. The current production configuration remains unchanged, including its restricted EMAIL binding and both disabled flags.

| Concern | PPCLV reference | Neraium |
| --- | --- | --- |
| Delivery | Zoho Mail HTTPS with OAuth | Optional Zoho adapter; existing Cloudflare binding retained |
| Sender authorization | Authenticated PPCLV mailbox | Must independently authorize `website@neraium.com` in Neraium's authenticated Zoho account |
| Recipient | PPCLV mailbox | Server-owned `craig@neraium.com`; Zoho mode rejects other addresses |
| Cloudflare | ASSETS; outbound fetch | Existing ASSETS, EMAIL destination restriction, managed Turnstile and 5/60s rate limiter preserved |
| Secrets | Four Zoho settings | Requires distinct Neraium-owned settings; none available/configured in this session |
| Acceptance | HTTP and Zoho status code | HTTP and numeric `status.code=200`; receipt confirmation remains external |
| Reply address | Validated visitor email in body | Prominent visitor email in plaintext; no undocumented Reply-To field |
| Failure | No confirmed success | Generic failure, preserved fields and user-opened email draft; no automatic send retries |

Zoho settings are `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_ID` (Worker secrets), and `ZOHO_DATA_CENTER` (public variable, `us` default; bounded region allowlist). Use OAuth scope `ZohoMail.messages.CREATE`. Never upload a mailbox password or PPCLV credentials. Each provider HTTP call has a five-second timeout and rejects redirects. Access tokens stay only in environment-scoped memory, with an expiry margin. Plaintext avoids HTML injection. Provider errors, inquiry contents, IPs, and secrets are not logged.

[Zoho's send API](https://www.zoho.com/mail/help/api/post-send-an-email.html) requires From to belong to the authenticated account. API acceptance alone cannot establish inbox receipt. [Regional OAuth guidance](https://www.zoho.com/developer/oauth/multi-dc-support.html) requires the mailbox's correct data center. The Zoho path needs neither Cloudflare Email Sending onboarding nor billing or DNS changes.

## Read-only live inspection

The existing account credential successfully passed `npm run config:check`. Worker `website`, account `9820361c238dcdeef0b72b24ec3734db`, retains deployment `50af243d-82c2-4506-b577-5eb80e4a8f49`, version `6ba7686b-589e-4b37-948b-bed42a0ed052`. Public intake returned `200 {"enabled":false}`. Managed widget `Neraium Contact` covers `neraium.com` and `www.neraium.com`. The required Turnstile secret name exists; its value was not retrieved. The email destination allowlist is configuration, not proof of verification. Recipient/routing inspection returned HTTP 403. A sending-domains inspection returned HTTP 404 and establishes no sender verification status.

## Proposed inquiry retention policy — approval pending

This is a proposal, not an approved or enforced policy. `CONTACT_RETENTION_APPROVED=false` must remain unchanged until the owner explicitly approves the exact policy.

- Craig owns mailbox access and deletion for inquiries in the existing Neraium mailbox.
- Delete inquiries that do not become customer records within 90 days of the last correspondence, including received mail, sent copies, and Trash. Craig must perform or configure this deletion; the Worker does not enforce mailbox retention.
- Customer records move under a separately agreed customer retention policy.
- Handle access/deletion requests through `craig@neraium.com`.
- Provider backups and service records follow the providers' terms; do not promise their immediate deletion.
- The Worker stores no inquiry database or inquiry-content logs. Rate limiting uses an IP digest at Cloudflare; security and provider metadata are distinct from mailbox messages.
- Before activation, document any mailbox forwarding or additional copies and assign their deletion owner. Update the public privacy notice to the approved policy and the chosen mail provider before enabling intake.

Approval was requested during this assignment. No affirmative approval has been recorded. Do not treat elapsed time or this document as approval.

## Required activation sequence

1. Load separately authorized Neraium credentials from the external credential store, never chat or source. Confirm region, least-privilege scope, and that the authenticated account includes `website@neraium.com`. Existing create-only credentials cannot read inboxes; receipt requires Craig's confirmation or separately authorized mailbox access.
2. Record and preserve current Worker settings, deployed version, route/domain mappings and secret names. Install only Neraium's new secrets, preserving existing bindings and Turnstile secret. Reconcile `CONTACT_DELIVERY=zoho`, region and secret-name declarations with the strict deployment preflight; do not disable drift checks. Existing preflight intentionally rejects activation until reviewed gates authorize its scoped update.
3. Test real Turnstile with the hostname-restricted widget and the real existing rate limiter in a controlled environment while public contact remains disabled. Unit/browser mocks do not establish real challenge verification or live rate enforcement. Test invalid/expired/replayed tokens, field rejection, rate exhaustion and provider failure. Do not weaken hostname/action/origin checks or use dummy keys to activate.
4. Perform exactly one controlled real inquiry with name `Neraium contact delivery verification`, fixed From/To, a controlled reply address, and a unique UTC timestamp in the review question. Keep the payload out of logs and Git. Record acceptance privately and await actual recipient confirmation that the timestamp and sender arrived. A timeout may still deliver: check receipt before any retry. Do not count an API response as delivery.
5. Record explicit approval of the retention policy and apply that exact public privacy wording. Only after actual receipt, real security checks and retention approval may the retention/activation flags and strict preflight be updated for the existing production Worker. Preserve billing, DNS, bindings, domain mappings and release safeguards. Deploy only through the existing reviewed production workflow, retaining rollback identity.
6. Verify desktop/mobile behavior and the production provider selection; preserve draft fallback. Record regression and delivery evidence under `.planning/`. Commit the reviewed changes; do not push or merge without authorization.

Remaining blockers: distinct Neraium Zoho credentials/region and sender authorization; actual test delivery and recipient confirmation; real Turnstile/rate-limit verification while gated; explicit retention approval and forwarding/copy inventory. No deployment, DNS or billing change was performed.

## Local verification evidence

Passed: 29 contact-service tests (validation, mocked Turnstile/limiter and both providers, failures and OAuth cache isolation), five Cloudflare guard tests, 49 static-site tests, 702 Playwright checks at nine sizes from 320–1920px, syntax checks, build and Worker deployment dry-run. Desktop/mobile screenshots were inspected. Read-only review passed after fixing OAuth cache invalidation on 401; sends are never retried. Ignored detailed output is in `artifacts/contact-activation/`. These checks do not establish live delivery, actual receipt or live challenge/rate enforcement.
