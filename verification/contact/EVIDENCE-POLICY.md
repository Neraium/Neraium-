# Proposal: isolated evidence recognition, without release authorization

Status: independently testable review proposal. No production gate imports this module. No real human observations, attestations or cleanup results have been generated. Architecture approval in principle is not approval of this evidence policy or a deployment.

## Narrow recognition boundary

`evidence-review.mjs` accepts only the dedicated `neraium.isolated-contact-verifier.v1` schema, an exact reviewed workers.dev origin, non-secret session ID, exact subject source hash, complete ordered observations and real timing. A separately obtained server-export digest and genuine human attestation must bind to the same canonical export. It rejects missing/mixed sessions, origins, source identities, future/stale timestamps, incomplete/altered observations, malformed expiry, missing limiter rejection and credential fields.

A successful result means only `recognized_scope: isolated-handler-security-controls-only`. It ALWAYS returns false for production hostname, widget, limiter and delivery proof; cleanup verification; production-gate satisfaction; and release authorization. This module does not change `scripts/contact-activation-gates.mjs`, `scripts/check-cloudflare-config.mjs`, deployment scripts, owner records or old observations. It has no remote calls, file writes, secret access or deployment action.

The module validates the structure, scope and bindings of evidence. It cannot authenticate the origin of offline files merely because a hash matches. Authenticity still requires the actual operator's independently captured server export, remote code/deployment comparison and recorded founder confirmation. These are not signatures, certifications or an EVP integrity guarantee.

## Required independent capture in a future authorized session

Before the session: retain the exact reviewed source/package and effective public configuration fingerprints, dedicated widget identity, immutable verifier deployment/version identity, and a GET-only production boundary baseline. Confirm the deployed verifier matches the reviewed package; do not rely on a version ID supplied by browser input. Keep credential values outside the repository.

While the session is active: after all scenario checks, retrieve the server `/verify/state` snapshot through the authenticated private channel independently of the pasted textarea. The operator computes `evidenceDigest(snapshot)`, retains the original sanitized export unchanged, and compares the founder-supplied copy to it. The server's session ID is an opaque identifier, not its authentication cookie; the two must remain separate. The actual founder then confirms manual participation, operator identity and the exact export digest. Do not infer this from successful automated tests or general architecture approval.

The recognition expectation names that origin/session/source, the independently captured digest, the observed deployment/version, and the reviewed package hash. The attestation separately supplies the actual operator, actual confirmation timestamp, `human_operated: true`, `confirmed_by_user: true`, and the same digest. Tests use fabricated fixture attestations only; none are written into production evidence.

After the session: revoke access, perform the separately authorized retirement/secret/widget/Worker/local-file cleanup, confirm namespace deletion and repeat production-boundary comparison. Cleanup is distinct evidence, never supplied by the recognition module itself. Expiry or a 404 response alone does not prove resource removal.

## Coverage versus remaining production proof

| Observation | Recognized scope | Not established |
| --- | --- | --- |
| Same hashed source handler, validation/origin/action checks | Code exercised within the isolated deployment | Actual production bundle equivalence without separate artifact review |
| Success/replay/provider failure/recovery | Real isolated widget checks with a synthetic sink | Production widget policy, secret or real mail delivery |
| Server-timed unused-token expiry | Captured token aged >=310s and real provider timeout rejection | Production-origin token validity |
| Bounded 429 probe | Dedicated limiter behavior in that session | Production limiter namespace enforcement |
| Revocation/tombstone/deletion evidence | Separate verifier cleanup after independent inspection | Disabled public intake; intake deliberately remains enabled |
| Preserved source/config/routes/Privacy and GET snapshots | Evidence that the approved production boundary remained unchanged | A new successful production-host challenge or Inbox receipt |

For new isolated expiry observations, the provider must return a boolean negative result with its documented timeout/duplicate marker, not a malformed response or invalid-secret error. The 310-second minimum exceeds Cloudflare's documented five-minute token lifetime. The old human evidence remains verbatim; its historical qualifications are not rewritten. [Cloudflare token-validation documentation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Relationship to the existing release gate

The current release guard requires production-host evidence and a disabled-intake cleanup record. A truthful isolated workers.dev session with live intake enabled cannot satisfy those assertions. Do NOT rename its origin, fabricate disabled flags, rewrite the old timestamps, create a fallback that catches guard failures, or set a skip/force flag.

Recognition is therefore supplemental and cannot unblock the current gate. Before claiming production readiness, one of the following must be reviewed explicitly:

1. Provide fresh actual evidence satisfying the current production contract through an authorized compatible process; OR
2. Separately review a maintenance-specific evidence policy and its integration, clearly retaining which production-host checks remain mandatory. That review must retain exact source/config/Privacy approvals, independent production invariance and real cleanup, require genuine operator evidence, and explicitly identify rather than silently waive any changed assertion. The existing first-activation policy is not modified by this proposal.

No option is selected or implemented here. In particular, the proposed recognizer is not an alternate release command. `npm run config:check` still must actually pass under a separately approved, implemented policy before deployment readiness can be reported.

## Shortest safe path

Resolve that evidence-policy decision BEFORE spending a staffed session. Then separately authorize the exact verifier package/widget/credentials and cleanup, configure and review its concrete inputs, perform the human tests and independent export capture, remove temporary access/resources, verify production invariance and satisfy the genuinely applicable production proof. Finally obtain a real guarded preflight pass and separate authorization for the redesigned website release. There is no lawful one-command promotion of isolated evidence under the unchanged gate.
