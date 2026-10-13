# Human contact verification and guarded activation

State: private verification route deployed; reviewed human results are partial because replay correlation, challenge-validated synthetic failure/recovery, expiry and validation remain incomplete. The earlier HTTP 502 failure result is preserved but lacks challenge-valid metadata required by the activation gate, so the synthetic failure must be repeated once (the test adapter cannot send mail). Public contact remains disabled. The owner already confirmed the original Inbox receipt and approved the 90-day noncustomer inquiry policy; do not repeat OAuth setup or the controlled email.

## iPhone authentication rejection and fix

The link fragment was parsed, and the Worker received a POST to `/redeem`. Automated browser diagnostics reproduced HTTP 403 because native form navigation sent an opaque `Origin: null` from a top-level HTTPS page. The strict Origin check correctly rejected it before rate limiting or Durable Object access. No tokens, cookies, request body, or IP were retained. The handoff now strips the fragment and uses a credentialed same-origin Fetch API POST; exact HTTPS, host and Origin validation remain enabled. A deployed end-to-end browser run returned 303, loaded the authenticated page at the clean URL with a Secure/HttpOnly/SameSite=Strict cookie, and verified one-use replay rejection (404). See `live-auth-e2e.json`.

## Copy inventory gate

The latest read-only account inspection confirmed POP, IMAP and ActiveSync disabled. It returned no explicit `mailForward` list, which does **not** prove forwarding is absent. The existing send-only grant was not broadened. Zoho documents account forwarding and copy-retention settings, while mailbox filters support incoming/outgoing auto-forward and Auto-Bcc; the account snapshot does not inventory those rules. No account settings were changed. See `forwarding-inventory.json`, [Zoho account API](https://www.zoho.com/mail/help/api/account-api.html), and [filter documentation](https://www.zoho.com/mail/help/filters.html).

Confirmed application-level scope: one recipient (`craig@neraium.com`), no requested CC/BCC, and no inquiry database. The owner-approved deletion owner for Zoho Received, Sent and Trash is Craig. Still requiring owner/admin inspection and named deletion ownership: mailbox forwarding and whether Zoho retains its copy; incoming/outgoing filters; organization routing/copy rules; archive, journaling or eDiscovery; client downloads, exports, integrations and local backups; and provider backup deletion/oversight. Record inspected-empty surfaces or every actual copy destination, whether the 90-day rule covers it, and the responsible deletion owner. The activation guard rejects any unknown surface or unassigned owner.

## Staffed session workflow

Commands below are for the activation operator in `/home/ubuntu/Neraium-` after reviewing the current Git state and remote configuration. They reuse the completed site build and do not repeat it. Never run the private link-print command through Codex or a captured/logged shell.

```bash
node scripts/contact-activation.mjs config-check
node scripts/contact-activation.mjs probe-prepare
node scripts/contact-activation.mjs probe-provision
node scripts/contact-activation.mjs deploy
node scripts/contact-activation.mjs probe-install
```

Preparation snapshots the exact Worker entrypoint/config, creates a temporary same-origin probe, and adds an isolated single-use Durable Object. Its binding is allowed only by the guarded transition; domains, assets, Turnstile, limiter and email destination remain exact. Provision and route deployment are separately checked against live configuration. The corrected panel is deployed; the automated deployed handoff reached the authenticated panel at a clean URL, and replay was rejected. See `live-panel-e2e-current.json`. The operator creates the owner's 30-minute link and 40-minute session from a private interactive TTY. The secret is a 256-bit random bearer token bound to a random session id; Cloudflare receives only the token hash plus expiry/session metadata. The raw URL is written to `/home/ubuntu/.config/neraium/contact-verification.json` mode 0600 and never to repository files or Worker logs.

In the owner's existing Termius SSH session, run exactly:

```bash
python3 scripts/contact-human-session.py --link
```

It prints only the live HTTPS link to an interactive terminal after ownership, permissions and expiry checks. Copy it directly from Termius to Safari. The link is valid at most 30 minutes, and the authenticated test session at most 40 minutes. When rotating, the previous session secret is replaced before deployment, immediately invalidating the old link and session. Its token is a URL fragment, is not sent in the HTTP request, is removed from Safari's address before submission, and is consumed atomically once by Durable Object storage. The same-origin bounded POST is rate limited; a successful redemption returns a clean 303 and an HttpOnly, Secure, SameSite=Strict scoped cookie. No authentication exception, dummy Turnstile key or production security change is introduced.

Follow the six-submission sequence in `iphone-testing.md`; preserve the owner-reported partial outcomes in `human-security-partial.json` and merge actual sanitized new results before preparing final activation evidence. The panel blocks recovery until a valid synthetic failure has occurred in the same session and a distinct fresh challenge is solved. The probe calls the real `handleContact` logic against synthetic non-delivery adapters; it has no email binding or Zoho credential access. It uses the real site key, action `evaluation`, challenge endpoint, host validation and existing rate limiter. Never export a raw challenge token, link, cookie, IP, or request details. Store only sanitized actual results and user confirmation.

## Required cleanup, even on failure

Remove the remote verification secret first, restore exact original source/config while adding the Durable Object deletion migration, deploy that guarded retirement, and verify final state:

```bash
node scripts/contact-activation.mjs probe-remove
node scripts/contact-activation.mjs probe-restore
node scripts/contact-activation.mjs probe-retire
node scripts/contact-activation.mjs config-check
```

The guard verifies link ownership against the hash before deleting it. The deletion migration destroys only the temporary namespace and its one-use marker. Confirm private route 404, public POST 503, both contact flags false, permanent secret names/resources/domains intact, and strict remote comparison passed. Record cleanup time only from real checks.

## Conditional activation

The current task authorizes production activation only after every required check passes. No extra deployment approval is needed. Complete owner-attested inventory, human results and cleanup, and ensure the published privacy wording matches the approved 90-day policy before running:

```bash
node scripts/contact-activation.mjs activate
```

The guard checks receipt, policy, all six copy surfaces and deletion owners, actual human statuses/timestamps, code/config fingerprints, live rate limit, cleanup and privacy-file hash. It rejects the temporary secret or Durable Object binding. It changes only the two enabled flags and verified Zoho settings after gates pass. Then verify the live site, Turnstile, validation, rate limiting, recovery, delivery and inbox receipt; record actual results. Do not commit, push or merge without current authorization.
