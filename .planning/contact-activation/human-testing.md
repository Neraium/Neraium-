# Contact activation completion record

The Neraium contact form is active in production as of 2026-10-13. See `production-activation-verification.json` for the live deployment/version, runtime checks, preserved prior evidence, and test summary. Older pending instructions in this directory are superseded by this record.

## Owner human verification evidence

The owner's original sanitized Safari panel JSON remains verbatim at `owner-reported-panel-export.json` (SHA-256 `d4e9a67b8ae22ed302987750d0c418f673f68d2cba65b57bbce98680882164f9`). All six owner-reported scenarios passed the corrected validator. Expiry is established by HTTP 400, challenge checked and invalid, captured age 318 seconds, and capture/observation timestamps. Its `duplicate_or_expired=false` observation is preserved and is not required to qualify expiry. No challenge or email test was repeated during final activation.

## Zoho copies and retention

The owner reports both mailbox and administrator forwarding lists were empty, with no destinations; original messages are to remain in Zoho. The forwarding inventory and owner report preserve the supplied finding and note that the separate copy-deletion toggle was not reported. Mailbox filters, organization routing, archives/journaling, client exports/integrations, and provider backup settings remain explicitly `unknown`. Their unknown state was not changed to inspected or empty.

The owner explicitly authorized proceeding without this optional internal inventory. That waiver does not change security checks or the owner-approved 90-day policy. Craig remains responsible for noncustomer inquiry copies in the Neraium Zoho mailbox's Received, Sent and Trash folders within 90 days of the last correspondence. The public privacy notice limits that commitment to those copies and discloses that other copies, if any, may follow separate configuration or provider terms; provider backup removal is not promised immediately.

## Retired temporary verification infrastructure

The guarded retirement removed the `CONTACT_VERIFICATION_KEY` Worker secret, local one-time credential, temporary verification route/module and temporary Durable Object binding/class. The deleted-class migration is retained in Wrangler history. Post-retirement checks recorded 404 for `/api/contact-verification`, confirmed both production flags stayed false until guarded activation, and verified permanent resources and domains remained intact. The operator-only link-print and live probe scripts have been removed. Sanitized source and observations remain in planning evidence solely to substantiate the completed human verification and limiter result.

## Production activation

The guarded transition enabled `CONTACT_ENABLED=true`, `CONTACT_RETENTION_APPROVED=true`, and selected the already verified Zoho US configuration. Cloudflare strict preflight and post-deployment comparison passed. A read-only live check confirmed `/api/contact-config` returns `enabled=true`, the evaluation form is served, the public Turnstile key matches configuration, the privacy notice is live, and the retired route remains 404. No new submission or email was created, in keeping with the owner's instruction not to repeat the completed delivery test. Existing inbox receipt evidence remains in `owner-confirmations.json` and `controlled-email.json`.

The activation guard continues to require the owner receipt, 90-day policy, owner panel export, rate-limit evidence, fresh probe cleanup, code/config fingerprints, and exact privacy notice hash. Only the optional copy inventory has an explicit, recorded owner waiver; unknown copy surfaces remain visible in `forwarding-inventory.json`.
