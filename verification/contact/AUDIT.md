# Final isolated verifier audit — 2026-11-05

Historical audit of `80cfbb5`. The subsequently authorized release-only maintenance correction is documented in [MAINTENANCE.md](MAINTENANCE.md). It does not change this verifier's runtime or initial-activation safeguards. `review-manifest.json` records the current package; the original fingerprint below identifies this original audit only. Temporary deployment remains separately unauthorized.

Checkout: /home/ubuntu/Neraium-; branch codex/neraium-phase-2; reviewed base 3598844755e20b5480887a76b0d80f7cc6bb6def. Architecture approved in principle, subject to security requirements. No temporary/public deployment or push authorized or performed. This fresh review re-read the implementation and tested prior claims rather than relying only on the previous passing report.

## Outcome

Verified source, tests and review instructions are suitable for a local commit and founder review. The checked-in Worker remains disabled with placeholder widget/hostname inputs. It is not an enabled deployment candidate. No real credential, human observation or cleanup claim is included. Temporary deployment, the dedicated widget/credentials, staffed session and cleanup still need explicit authorization. The website release remains blocked by the unchanged guarded preflight.

Package SHA-256: `50399b7fbac3e94ee455e5e496a3797fa2d5ba0a5059db8ad014218a703d42ae`. `review-manifest.json` lists the exact source/test/instruction hashes; the manifest and this audit are excluded from that digest to avoid recursive hashes. Effective future per-session public inputs and their final bundle also require review.

## Fresh security findings and fixes

1. The credential helper previously used the caller's working directory as its checkout boundary. It now anchors that boundary to the helper's own source location. A child-process regression changes working directory and proves credentials still cannot be written into this checkout.
2. The verifier previously treated a missing provider success field as false. Malformed Siteverify responses now fail closed, rather than qualifying expiry. New isolated expiry observations require the provider's boolean rejection and timeout/duplicate marker; invalid-secret failures cannot count. Tests cover malformed responses and incorrect secrets. Cloudflare documents the five-minute validity and timeout marker in its [Siteverify contract](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Old observations/gates are unchanged.
3. Added a non-secret session ID to candidate exports so a separately captured server snapshot and actual operator confirmation can be bound to one session. This ID is distinct from the secret cookie and cannot authenticate by itself.
4. Added a private two-secret upload preparer. It validates ownership, 0700/0600 permissions, exclusive creation, host/link identity and deadlines, omits the private URL and prints no secret values. Malformed private JSON is sanitized. The exact upload format avoids accidentally granting an extra private_url binding.
5. Boundary inspection uses GET-only requests and hashes rather than records/secret values; it refuses to overwrite a baseline or an existing artifact. It reports missing permission honestly.

## Five-pass review

**Correctness:** fixed expiry/parser and working-directory issues; reviewed fixed lifetime, one-use redemption, sequence ordering, hash separation, no retry of attempted expiry tokens, limiter observations, concurrency and attempt limits. Provider success/context are separate; a different-host valid token cannot masquerade as expiry. Local end-to-end tests reuse the exact original contact handler.

**Security:** authenticated verifier operations, fragment stripping before POST, separate Secure/HttpOnly/SameSite=Strict cookie, absolute 20-minute expiry/redemption 10-minute limit, exact HTTPS/host/origin, bounded JSON, nonce CSP, no CORS, no-referrer/no-store and strict capability/config allowlists. Unknown mail/Zoho/assets/service bindings reject access. The mail sink is synthetic and the only permitted egress is Siteverify with redirects not followed. No real delivery capability is supplied. Revocation/expiry deny access; resource deletion remains separate evidence.

**Performance/abuse:** login and scenario limiter keys use only the dedicated binding/namespace, not production. Bounded request/token/attempt sizes and at most 8 limiter-probe requests. Server exports contain hashes/observations, no challenge/token/cookie/ticket/IP values. Unauthenticated requests may reach a bootstrap page and initialize the dedicated session object, but cannot reach the widget, results or scenario operations; this service is not an email endpoint.

**Readability:** operator steps, isolation boundary and failure states documented in README/OPERATIONS. New recognition module is explicitly not a gate. Private credential generation/upload remain local-only with no Cloudflare calls.

**Consistency:** separate Worker/account scope, standalone SQLite class/limiter, exact original source hashes, preserved production v1/v2 ledger, approved Privacy hash and owner confirmations. Installation/enable/retirement config validators reject unrelated capabilities, account/name changes and ledger rewrites.

No unresolved critical local defect was identified in the tested scope. This is not certification of a future real widget/session/deployment; those remain actual manual/provider work.

## Evidence recognition proposal

Read EVIDENCE-POLICY.md. The pure, separately tested `evidence-review.mjs` recognizes only complete isolated-handler observations bound to the expected origin/session/source, independently captured export digest and actual human attestation. It rejects mixed or altered evidence, unknown operators, malformed identities/times, incomplete expiry/limiter proof and credential fields. Its output ALWAYS denies production hostname/widget/limiter/delivery proof, cleanup verification, production-gate satisfaction and release authorization. Tests prove candidate/recognition output cannot satisfy the existing production human-evidence validator.

No production gate imports this module; no fallback, override, timestamp rewrite or schema substitution was added. Authenticity of the external export retrieval, deployment match and human response still needs recorded independent operator review; an offline digest does not prove its own origin. A maintenance-specific acceptance/integration policy, or genuinely compatible production proof, remains a separate decision. Isolated success alone cannot unblock the unchanged gate.

## Production preservation

Protected source/Worker/configuration/route/header/dependency/Privacy/owner/evidence hashes remain equal to the starting baseline. Approved privacy.html SHA256 remains `ad2ca1b1d4073aca46e762637f52fe66885cf93521d5c5ce30ef57f3b66e9de0`. No historical human export or owner confirmation changed. Public build release remains neraium-8e2a5eeb19ab306f and excludes verification/.

GET-only before/after snapshots independently match production settings, bindings, routes, custom domains, workers.dev settings, schedules, latest deployment identity, actual homepage/CSS/JS hashes and enabled contact configuration. The proposed verifier Worker remains absent. No production behavior, routing or configuration was changed by this work.

DNS inventory is NOT fully verified: the current API token receives HTTP403 for DNS-record listing. No DNS write was performed; no additional credential/permission was acquired. The comparator reports DNS unverified and does not claim full invariance. A separately authorized read-only DNS snapshot or independently reviewed record is needed to close that category.

## Tests and reversibility

- 98/98 Node tests PASS, including workerd SQLite/egress, one-use auth, provider failure/recovery, credential safety, expiry/replay, recognition limitations and boundary comparisons.
- 720/720 public-site browser tests PASS across nine viewports.
- 49/49 static site/SEO/image checks PASS; build/syntax and source/build reuse checks PASS.
- Private verifier browser fixtures 320/1440: no overflow/page errors; keyboard/revocation checked; zero WCAG A/AA axe violations. All provider/credential inputs in tests are explicitly fabricated and are not production evidence.
- Local Wrangler installation and retirement dry-run packaging PASS; no upload or resource creation.
- Actual `npm run config:check` still exits 1 on expired human session timestamps; no bypass applied.

Installation is isolated to a newly named Worker; public intake stays enabled. The reviewed tombstone removes only its own binding/class with an appended deletion migration. Explicit secret/widget/Worker/private-file removal follows. Original production migration history is never reset. `--force` deletion is forbidden. If a future operation fails or changes production, stop; do not silently proceed. Temporary evidence/data deletion is intentionally irreversible, so capture sanitized observations first; rollback does not restore an expired credential/session. Live cleanup is not claimed until actual namespace/resource removal is inspected after an authorized session.

## Exact next steps

OPERATIONS.md contains the approval-only widget/config/secret-file preparation, atomic verifier installation, manual sequence, independent capture and retirement commands. It identifies the exact account/name and forbids production routes, public assets, environment/name overrides and force flags. CLI flag support was checked locally, including --secrets-file additive semantics. Do not execute its cloud actions until separate authorization.

Shortest safe path: resolve the evidence-policy/remaining production-host proof decision and DNS-read verification, authorize only this exact temporary package/resources and cleanup, configure/review public inputs and a private staffed session, collect genuine observations, remove temporary resources and verify invariance, obtain an ACTUAL guarded preflight pass, then separately authorize the redesigned website release. Current architecture approval grants none of those later actions automatically.
