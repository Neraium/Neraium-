# Final corporate website review — 2026-11-05

Repository: /home/ubuntu/Neraium- (github.com/Neraium/Neraium-)
Branch: codex/neraium-phase-2
Base revision: 6e874c5f0a378e916ea76050f54123f9b9e68d74
Local website changes are verified for a local source commit. Production deployment is not cleared.

## Exact disclosure artifact

File: `privacy.html`, 7,710 bytes.
SHA-256: `ad2ca1b1d4073aca46e762637f52fe66885cf93521d5c5ce30ef57f3b66e9de0`
Previously approved whole-file SHA-256: `97bab9f9ab36da71e428197f2d27d73718398a42f0bfed8168049a0be0b92851`.

Fresh verification independently read the complete final source, baseline Git version and build output. The full disclosure main matches the approved baseline byte for byte (main SHA-256 `46ac5ecfb46bae3df14c5d4307b2251b15c247f52e26b9eb25393d2d70357772`); the final build copy exactly matches source. Metadata/navigation/footer account for the changed whole-file hash. The full rendered notice and social graphic were visually inspected again.

The technical mismatch is diagnosed and the exact new fingerprint has been regenerated. Its approval mismatch remains pending explicit founder confirmation. Neither fresh verification nor the local source commit is treated as founder approval. Existing owner approval records and historical evidence are unchanged. See PRIVACY-APPROVAL.md for the exact statement and narrow recording instructions; disclosure-verification.json for machine-readable evidence. Re-run verify-disclosure.mjs to check source/build identity again.

## Site and messaging

All 16 public HTML documents and their metadata checked. The local release has no retired tagline or failure-oriented predecessor in active pages, metadata, social previews or visible marketing components. Obsolete social images remain archived in source and excluded from dist. No replacement official tagline is invented. SII correctly describes learned operational relationships and persistent changes even when individual readings remain within expected ranges. No conventional anomaly-detection positioning, autonomous control, failure guarantee, diagnosis or control-system replacement claim.

Initial commercial focus remains municipal water/wastewater utilities and hospitality resorts/large integrated resort operations; other sectors remain future opportunities. MVP/pre-revenue and insufficient-evidence boundaries are explicit. EVP records Neraium-generated findings/evidence; immudb-backed tamper-evident integrity is qualified by implementation and distinguished from analytical correctness. No invented traction, certifications, ROI, partnerships or funding claims.

No further frontend defect was identified. The complete implemented redesign includes all homepage sections, platform, both industries, methodology, EVP/evidence, engagement, company, contact, security, operator brief, privacy presentation and 404/redirect continuity. Industry responsive sources, intrinsic image dimensions and redirect metadata repairs from the prior audit are included. Contact form markup and disclosure body are preserved.

## Fresh validation

- Build and JavaScript syntax checks: PASS. Build validated 17 image references.
- Node suite: 68/68 PASS (includes contact, public-writing, activation/configuration safeguards, diagnostics, Workerd mail and asset-reuse assertions).
- Python static/SEO/image/route suite: 49/49 PASS.
- Full Playwright browser suite: 720/720 PASS across nine viewports, 320–1920 px.
- Additional Chromium sweep: 99 layout/menu checks PASS; 29 WCAG 2/2.1 A/AA axe audits, zero violations. Checks cover mobile navigation, focus/Escape, overflow, images, duplicate IDs and retired copy.
- Fresh Lighthouse local mobile: Performance 99; Accessibility 100; Best Practices 100; SEO 100.
- Guarded source/build package reuse check and git diff --check: PASS.
- No standalone lint/typecheck command is defined; defined syntax checks and browser-test compilation pass.

Firefox/WebKit secondary local smoke attempts remain unavailable due installed runtime/protocol/navigation limitations; no successful result is claimed. Chromium results are complete. Local online success/failure/security tests are mocked and the disabled email-draft fallback is exercised. No real inquiry/email was sent.

## Current production prerequisites

Independent GET-only Cloudflare inspection confirms matching bindings, required secret-name inventory, production domains/routes, compatibility flags/date, workers.dev/preview settings, no unmanaged schedules/additional settings, and no temporary verifier secret. No credentials or binding values were recorded. These checks do not waive the guarded preflight.

Actual `npm run config:check`: exit 1, `Contact activation held: human session timestamps are stale or invalid`. The retained human panel completed 2026-10-13 and exceeds the seven-day gate. A new dated synthetic result cannot replace actual owner-operated verification. The separately verified Privacy-file approval hash is still pending.

The live homepage and contact-config were read without sending an inquiry: HTTP 200, public intake enabled with a site key configured. The live homepage still contains the retired tagline because the redesign has not been deployed. Its removal from production requires a separately authorized successful release. No production resource, configuration, secret, DNS or deployed code was changed.

## Founder decisions

1. Approve the exact final Privacy file and authorize recording its new SHA-256, using PRIVACY-APPROVAL.md. No approval inferred or written.
2. Authorize and participate in fresh human-operated contact security verification. The existing guarded workflow may require a temporary private production verifier and cleanup; that is a production deployment and is excluded by the present no-deploy instruction. Any real email test also needs explicit authorization. Preserve the success/replay/unused-token expiry/failure/recovery/validation requirements and genuine timestamps.
3. After evidence and approval are recorded, rerun npm run config:check and resolve any new discrepancies. Only a real pass clears technical prerequisites.
4. Separately authorize push/deployment when ready. The existing guarded npm run deploy remains the only documented release path; do not change flags, skip checks, or use an unguarded upload.

Verdict: local website implementation verified; production deployment blocked by outstanding founder approval and fresh human contact-verification evidence. Nothing has been pushed or deployed.
