# iPhone contact verification

The private test route is prepared for a short staffed session. Its exact HTTPS URL is:

https://neraium.com/api/contact-verification

Public contact submissions remain disabled. The temporary link is cryptographically random, scoped to one test session, valid for at most 30 minutes, consumed globally on first redemption, and exchanged for an HttpOnly, Secure, SameSite=Strict cookie with a 40-minute absolute session expiry. It appears only in the owner's private 0600 file and the interactive Termius terminal. The token is a URL fragment, so Safari does not send it in the HTTP request; the page removes it from the address before submitting it in a bounded same-origin POST. A clean 303 redirect follows redemption. Never screenshot, record, paste, or share the link. If it expires or is consumed, the operator can issue a new one.

## Retrieve the link privately

After the operator says the route and session are ready, use the existing Termius SSH connection on the iPhone. In the repository directory, run this one command and copy its sole output directly into Safari's address bar:

```bash
cd /home/ubuntu/Neraium- && python3 scripts/contact-human-session.py --link
```

Run it directly in the interactive Termius terminal. Do not use shell tracing, `tee`, command capture, terminal recording, or Codex chat. The command refuses redirected/noninteractive output, checks private file ownership/permissions and the short expiry, and prints the link only to that terminal. Paste the link into Safari. The fragment is automatically removed as soon as the page loads; allow its clean redirect to finish. Keep Safari on `neraium.com` and do not use an embedded browser. The link can be redeemed only once; do not refresh before it redirects. The current rotation invalidates the previously issued session.

## Minimal remaining Safari checks

The owner already reported a successful valid challenge (HTTP 200), provider-failure result (HTTP 502), and invalid-token result (HTTP 400). Preserve these outcomes. The earlier failure report lacks the challenge-valid metadata and timestamps required by the activation gate, so repeat **failure** once in this session; it uses a synthetic adapter that cannot send email. The first replay (HTTP 200) may have used a refreshed token, and the later duplicate/expired HTTP 400 is not yet correlated to the successful token. The recovery HTTP 400 with `duplicate_or_expired=true` means the submitted challenge was already used or expired; it does not show a provider-recovery defect. Validation HTTP 429 was stopped by the existing limiter before field validation. The updated panel freezes the exact token used for success and requires a fresh, challenge-validated failure followed by a separate fresh challenge for recovery.

Refresh the clean verification page once to load the updated panel. The authenticated cookie remains valid until the session's displayed expiry. Complete only these checks, in order:

1. Complete a real challenge, tap **success** (HTTP 200), then immediately tap **replay** (HTTP 400; `duplicate_or_expired=true`). The panel now reuses the exact successful token for replay.
2. Tap **Reset challenge**, complete a fresh challenge, and tap **failure** once (HTTP 502 with `challenge_valid=true`). This synthetic failure has no email capability.
3. Tap **Reset challenge**, complete another fresh challenge, and tap **recovery** (HTTP 200 with `challenge_valid=true`).
4. Tap **Reset challenge**, complete a fresh challenge, then **Capture unused expiry token**. Leave the tab open for at least **5 minutes 10 seconds** without using that token. Tap **expiry** once (HTTP 400; duplicate/expired true).
5. After the expiry wait, tap **validation** once (HTTP 400). The earlier **invalid** HTTP 400 already passed and does not need repeating.

This is six remaining submissions total: success, replay, synthetic failure, recovery, expiry and validation. The 310-second expiry wait clears the 5-per-60-second limiter after the first four requests. If any request returns **429**, wait at least **65 seconds**. Use a fresh challenge after the wait for any challenge-based retry; validation can be retried once after the wait. The UI blocks double submissions, uses a frozen success token for replay, and rejects a reused token before sending a request. Do not make extra attempts to chase a result.

Copy only the sanitized results box when these checks finish. Do not copy tokens, links, cookies, headers, or IPs. If the session expires before completion, stop; do not reuse its one-use link.
## Outstanding copy inventory

The read-only Zoho account API reports POP, IMAP and ActiveSync disabled but omits an explicit forwarding list; this does not prove no forwarding or copies exist. The application names only Craig as recipient and adds no CC/BCC destinations. The owner must still inspect mailbox forwarding, filter copy/forward actions, organization routing, archive/journaling, client exports/integrations/local backups, and provider backup terms/oversight. Document each inspected empty surface or every destination with a named deletion owner and the approved 90-day rule. Primary mailbox Received, Sent and Trash ownership is already approved. The activation guard stays closed while any surface is unknown.

## Cleanup and activation

After actual human results are recorded, remove the temporary Worker secret, restore the exact Worker source, remove the private link file and delete the temporary single-use Durable Object namespace through the guarded workflow. Confirm the private route returns 404, public POST remains 503, both flags remain false, and all permanent bindings/domains/secrets remain intact. Only after human checks, cleanup, and owner-attested copy inventory pass may the existing guarded activation command run.
