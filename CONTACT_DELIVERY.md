# Contact delivery and activation

Status (2026-10-13): **activation held**. Zoho credentials and sender are verified, and all four Worker secrets are installed. Zoho accepted exactly one controlled verification email at `2026-10-13T01:05:12.798Z`; actual Inbox receipt has now been confirmed visually by the owner in Zoho Mail. Both production flags remain false.

## Reference and implementation

The implementation reference is [Neraium/PPCLV](https://github.com/Neraium/PPCLV/blob/f94f18fdd4969440b8d136dec6434cd02ac3a2b7/worker/index.mjs), revision `f94f18fdd4969440b8d136dec6434cd02ac3a2b7`. Its contact Worker refreshes an OAuth token and submits mail through Zoho HTTPS. No PPCLV production changes, mailbox access, credentials, or customer data were used. Its source and delivery research describe the approach; they do not independently establish inbox receipt.

Neraium now supports the same approach in `worker/zoho-mail.mjs`, selected explicitly with `CONTACT_DELIVERY=zoho`. Absence of that variable preserves existing Cloudflare email delivery. An unknown provider fails closed. The current production configuration remains unchanged, including its restricted EMAIL binding and both disabled flags.

| Concern | PPCLV reference | Neraium |
| --- | --- | --- |
| Delivery | Zoho Mail HTTPS with OAuth | Optional Zoho adapter; existing Cloudflare binding retained |
| Sender authorization | Authenticated PPCLV mailbox | Must independently authorize `website@neraium.com` in Neraium's authenticated Zoho account |
| Recipient | PPCLV mailbox | Server-owned `craig@neraium.com`; Zoho mode rejects other addresses |
| Cloudflare | ASSETS; outbound fetch | Existing ASSETS, EMAIL destination restriction, managed Turnstile and 5/60s rate limiter preserved |
| Secrets | Four Zoho settings | Four distinct Neraium-owned secrets installed; existing Turnstile secret preserved |
| Acceptance | HTTP and Zoho status code | HTTP and numeric `status.code=200`; receipt confirmation remains external |
| Reply address | Validated visitor email in body | Prominent visitor email in plaintext; no undocumented Reply-To field |
| Failure | No confirmed success | Generic failure, preserved fields and user-opened email draft; no automatic send retries |

Zoho settings are `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_ID` (Worker secrets), and `ZOHO_DATA_CENTER` (public variable, `us` default; bounded region allowlist). Use OAuth scope `ZohoMail.messages.CREATE`. Never upload a mailbox password or PPCLV credentials. Each provider HTTP call has a five-second timeout and rejects redirects. Access tokens stay only in environment-scoped memory, with an expiry margin. Plaintext avoids HTML injection. Provider errors, inquiry contents, IPs, and secrets are not logged.

[Zoho's send API](https://www.zoho.com/mail/help/api/post-send-an-email.html) requires From to belong to the authenticated account. API acceptance alone cannot establish inbox receipt. [Regional OAuth guidance](https://www.zoho.com/developer/oauth/multi-dc-support.html) requires the mailbox's correct data center. The Zoho path needs neither Cloudflare Email Sending onboarding nor billing or DNS changes.

## Initial read-only live inspection (historical)

Before this integration continuation, the existing account credential successfully passed `npm run config:check`. Worker `website`, account `9820361c238dcdeef0b72b24ec3734db`, then used deployment `50af243d-82c2-4506-b577-5eb80e4a8f49`, version `6ba7686b-589e-4b37-948b-bed42a0ed052`. Public intake returned `200 {"enabled":false}`. Managed widget `Neraium Contact` covered `neraium.com` and `www.neraium.com`. The required Turnstile secret name existed; its value was not retrieved. The email destination allowlist was configuration, not proof of verification. Recipient/routing inspection returned HTTP 403. A sending-domains inspection returned HTTP 404 and established no sender verification status. Current deployment and sender verification are recorded in the continuation below.

## Approved inquiry retention policy — copy inventory pending

The owner explicitly approved the 90-day noncustomer inquiry policy, including associated Sent and Trash copies. Customer records follow a separately agreed policy. Craig remains responsible for mailbox deletion; approval does not mean the Worker enforces mailbox retention. `CONTACT_RETENTION_APPROVED=false` remains held until forwarding/additional-copy inventory and deletion ownership are documented.

- Craig owns mailbox access and deletion for inquiries in the existing Neraium mailbox.
- Delete inquiries that do not become customer records within 90 days of the last correspondence, including received mail, sent copies, and Trash. Craig must perform or configure this deletion; the Worker does not enforce mailbox retention.
- Customer records move under a separately agreed customer retention policy.
- Handle access/deletion requests through `craig@neraium.com`.
- Provider backups and service records follow the providers' terms; do not promise their immediate deletion.
- The Worker stores no inquiry database or inquiry-content logs. Rate limiting uses an IP digest at Cloudflare; security and provider metadata are distinct from mailbox messages.
- Before activation, document any mailbox forwarding or additional copies and assign their deletion owner. Update the public privacy notice to the approved policy and the chosen mail provider before enabling intake.

Approval and visually verified Inbox receipt are recorded in `.planning/contact-activation/owner-confirmations.json`, based on the owner's current instruction. Forwarding destinations and additional copies remain unverified until inspected; absence is not assumed.

## Required activation sequence

1. Load separately authorized Neraium credentials from the external credential store, never chat or source. Confirm region, least-privilege scope, and that the authenticated account includes `website@neraium.com`. Existing create-only credentials cannot read inboxes; receipt requires Craig's confirmation or separately authorized mailbox access.
2. Record and preserve current Worker settings, deployed version, route/domain mappings and secret names. Install only Neraium's new secrets, preserving existing bindings and Turnstile secret. Reconcile `CONTACT_DELIVERY=zoho`, region and secret-name declarations with the strict deployment preflight; do not disable drift checks. Existing preflight intentionally rejects activation until reviewed gates authorize its scoped update.
3. Test real Turnstile with the hostname-restricted widget and the real existing rate limiter in a controlled environment while public contact remains disabled. Unit/browser mocks do not establish real challenge verification or live rate enforcement. Test invalid/expired/replayed tokens, field rejection, rate exhaustion and provider failure. Do not weaken hostname/action/origin checks or use dummy keys to activate.
4. Perform exactly one controlled real inquiry with name `Neraium contact delivery verification`, fixed From/To, a controlled reply address, and a unique UTC timestamp in the review question. Keep the payload out of logs and Git. Record acceptance privately and await actual recipient confirmation that the timestamp and sender arrived. A timeout may still deliver: check receipt before any retry. Do not count an API response as delivery.
5. Record explicit approval of the retention policy and apply that exact public privacy wording. Only after actual receipt, real security checks and retention approval may the retention/activation flags and strict preflight be updated for the existing production Worker. Preserve billing, DNS, bindings, domain mappings and release safeguards. Deploy only through the existing reviewed production workflow, retaining rollback identity.
6. Verify desktop/mobile behavior and the production provider selection; preserve draft fallback. Record regression and delivery evidence under `.planning/`. Commit the reviewed changes; do not push or merge without authorization.

Remaining gates: completed human-operated real Turnstile verification while gated; forwarding/copy inventory and deletion ownership; approved-policy public privacy wording and final reviewed provider/flag transition. No DNS or billing changes are required or performed.

## Secure integration continuation — 2026-10-13

Both independently authorized grants are saved outside Git with owner-only permissions. Live refresh verified that the send grant reports exactly `ZohoMail.messages.CREATE`. A separate fresh accounts-read request reconfirmed the enabled Craig mailbox, confirmed `website@neraium.com` alias and outgoing sending entry in the US data center. No tokens or provider payloads were printed or saved in repository evidence.

The Cloudflare bulk-secret operation added only `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` and `ZOHO_ACCOUNT_ID`. Before/after strict comparisons verified existing secret names, public variables, domains, route, compatibility settings, email destination restriction and `1001` rate-limiter namespace (5 requests/60 seconds). The operation created deployment `b38f02b1-fdea-4d3a-8014-354ec9c62aba`, version `cd44dc8e-a2fe-46ea-a034-a310a0c1b73a`; only deployment trigger metadata changed in settings. Pre-install rollback identity remains recorded under `.planning/contact-activation/`.

The controlled email used the production Zoho adapter with fixed From/To and synthetic verification details. An exclusive durable attempt marker prevents automatic repeat, including after ambiguous acceptance. API acceptance is recorded separately from receipt. Send-only credentials cannot read an Inbox; no message-reading permission was requested or inferred.

Public intake is still disabled. `wrangler.jsonc` now declares the four required Zoho secret names, and the prepared review configuration explicitly selects `CONTACT_DELIVERY=zoho` and the US region while retaining both false flags. Selecting that provider in production and enabling intake remains a reviewed transition after the remaining gates pass.

A temporary authenticated, expiring synthetic probe exercised the real production Turnstile secret and rate limiter while both public flags remained false. Its environment allowlist excluded Zoho secrets and the real email binding, so it could send no mail. Live checks returned unauthenticated `404`, invalid-field `400`, invalid-token `400`, and rate-exhaustion `429`. The existing limiter is [permissive and eventually consistent](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/); the configured 5/60s limit is not an exact accounting guarantee.

Automated browser attempts did not produce a valid real challenge token. Successful verification, replay, genuine expiry and challenge-dependent synthetic provider failure/recovery remain **unverified live**. [Cloudflare's supported-browser guidance](https://developers.cloudflare.com/cloudflare-challenges/reference/supported-browsers/) excludes automation frameworks from solving production challenges. No test keys or challenge bypass were used. A human-operated, authenticated test is required before activation; automated regression success cannot close this gate.

The temporary endpoint code, Worker secret and newly created local key were removed. The cleaned deployment is `43d24607-fafc-492a-817e-0c3ab4fbef83`, version `6b8933f9-6f12-4cc4-be62-19eb8d91aef1`. Post-cleanup strict comparison passed, the probe URL returned `404`, contact config returned `enabled:false`, and public submission returned `503`. Existing domains, Turnstile, limiter, email binding and all five permanent secret names remain intact. No commit, push or merge was performed.

Current regression results: 29 contact-service tests, six configuration-guard tests, 49 static tests and 702 browser checks passed, along with syntax, build and deployment dry-run checks. Seven additional local diagnostic isolation/guard/recovery assertions passed; those assertions are not live challenge evidence. Sanitized live evidence is under `.planning/contact-activation/`; detailed nonsecret test/deployment logs remain ignored under `artifacts/contact-activation/`.

## Local verification evidence

Passed: 29 contact-service tests (validation, mocked Turnstile/limiter and both providers, failures and OAuth cache isolation), five Cloudflare guard tests, 49 static-site tests, 702 Playwright checks at nine sizes from 320–1920px, syntax checks, build and Worker deployment dry-run. Desktop/mobile screenshots were inspected. Read-only review passed after fixing OAuth cache invalidation on 401; sends are never retried. Ignored detailed output is in `artifacts/contact-activation/`. These checks do not establish live delivery, actual receipt or live challenge/rate enforcement.

## Owner confirmation continuation — 2026-10-13

The owner confirmed visually verified Zoho Mail Inbox receipt from `website@neraium.com` to `craig@neraium.com`, subject `Neraium evaluation inquiry`, containing `2026-10-13T01:05:12.798Z`. This closes the actual-receipt gate without another send or mailbox-reading grant. The owner explicitly approved 90-day deletion of noncustomer inquiries, including associated Sent and Trash copies, with customer records governed separately. Existing earlier sections describe historical pending states; current confirmations are in `owner-confirmations.json`. Both public flags remain false while forwarding/copy inspection and human-operated security verification proceed.

## Human verification preparation and copy inspection — 2026-10-13

Actual owner receipt and the 90-day policy approval are now recorded. Fresh read-only inspection used both documented Zoho accounts.READ endpoints. POP, IMAP and ActiveSync are disabled. Neither account response explicitly returned a forwarding list, so forwarding absence is **unknown**, not inferred. Mailbox filters, organization routes/copies, archives/journaling, exports/integrations and provider backup oversight still require inspection and named deletion ownership. Craig is recorded as owner only for the primary received/Sent/Trash mailbox copies. See `forwarding-inventory.json`.

A human-operated, authenticated no-mail test page is prepared under `.planning/contact-activation/human-probe.mjs` and documented in `human-testing.md`; it is **not deployed**. The route requires HTTPS, an independently generated short-lived private password, a Secure/HttpOnly/SameSite Strict scoped cookie, exact origin/hostname and absolute 20-minute expiry. Login is rate limited. The page uses the existing real widget/action, freezes an unused token for genuine expiry testing, and exports sanitized metadata only. Zoho secrets and the actual EMAIL binding are excluded from its environment. Its production source/secret will be installed only for a staffed session and removed before activation. Normal-browser human availability has been requested but no affirmative availability or actual test results have been supplied.

The guarded activation workflow is prepared locally. It requires the confirmed receipt, owner-approved policy, complete owner-attested six-surface copy inventory, named owners, actual human success/replay/expiry/failure/recovery evidence with current configuration/code hashes and valid test/session timestamps, verified probe cleanup, real limiter evidence and the exact approved-policy privacy-file hash. It permits only both flags, `CONTACT_DELIVERY=zoho` and `ZOHO_DATA_CENTER=us` to change, preserving all other configuration and strict baseline comparison before/after deployment. A missing-evidence activation attempt was safely held before flags/configuration changed. The approved-policy privacy paragraph is prepared locally; branding is untouched and this wording is not yet published.

No new production deployment, secret, email, DNS, billing, commit, push, merge or PPCLV action was performed during this continuation. The existing cleaned deployment/version remain unchanged and strict read-only comparison passed. Public intake remains disabled; human and copy-inventory gates remain open.

Current verification: 43 server/guard/probe assertions and 49 static tests passed. Browser regression initially passed 701/702, with one tablet keyboard-focus assertion failing on the existing illustrative product walkthrough; that exact case passed on an isolated rerun without source changes. All 702 cases are covered with the rerun documented, rather than claiming an initially clean suite. Syntax, build, dry-run and diff checks passed. Review found and corrected HTTPS enforcement, clipboard error cleanup, named provider oversight, source binding and evidence timing/order issues; targeted read-only rereview found no critical blocker to the prepared path. These local assertions do not establish actual human challenge success.
