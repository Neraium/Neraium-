# Asset provenance

This document covers image and icon assets referenced by the current public Neraium website. Where source evidence is not present in the repository, provenance remains unknown and ownership or licensing claims must not be made.

| File path | Source record | Status | Current use |
| --- | --- | --- | --- |
| `/assets/images/neraium-logo-lockup.svg` | Not included in repository. | Existing brand asset; ownership documentation should be retained. | Retained original stacked source; the documented horizontal derivative appears in public headers and footers. |
| `/assets/images/founder-contact.jpg` and `founder-contact-{480,960}.webp` | Historical source record below. | Previous founder portrait and delivery copies, retained for rollback. | No longer displayed by current public pages. |
| `/assets/images/founder-headshot-original.jpeg` and `founder-headshot-{480,960,1320}.webp` | Owner-supplied `/home/ubuntu/Craig Headshot.JPEG`, uploaded 2026-10-12 at 21:09 UTC; preservation and processing record below. | User requested website replacement with this upload; original preserved byte for byte. | Founder portrait on `company.html`; alt text identifies Craig Curtis. |
| `/assets/images/neraium-brand-preview.png` | Not included in repository. | Existing social preview; derivation or ownership should be documented. | Retained legacy preview; excluded from the public build. Current metadata uses the documented `neraium-social.jpg`. |
| `favicon.ico` | Not included in repository. | Existing brand icon. | Browser favicon. |
| `/assets/images/apple-touch-icon.png` | Not included in repository. | Existing brand icon. | Apple touch-icon metadata. |
| `/assets/images/android-chrome-192x192.png` | Not included in repository. | Existing brand icon. | Web manifest. |
| `/assets/images/android-chrome-512x512.png` | Not included in repository. | Existing brand icon. | Web manifest. |
| `/assets/images/hero-central-plant.webp` and `hero-central-plant-900.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a photorealistic central chilled-water mechanical plant with pumps, insulated piping, valves, and gauges; no brands, screens, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Homepage hero atmospheric layer. |
| `/assets/images/water-infrastructure.webp` and `water-infrastructure-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a photorealistic municipal water treatment environment with pumps, pipes, basins, valves, and process equipment; no brands, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Home and Applications market imagery; Water & Wastewater hero. |
| `/assets/images/industrial-infrastructure.webp` and `industrial-infrastructure-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested photorealistic interconnected industrial pipework, pumps, vessels, valves, and instrumentation; no brands, screens, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Broader Infrastructure hero. |
| `/assets/images/engineer-inspection.webp` and `engineer-inspection-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a candid field engineer inspecting an analog gauge and valve assembly with appropriate PPE; no brands, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Retained source asset; not displayed on the current public pages. |

Other image files remain in `assets/images/` for compatibility and rollback but are not displayed by the current public pages. They must not be described as licensed, commissioned, customer-derived, or project-owned without a source record.

## Documentation requirement

Before making any public ownership or licensing claim, retain the purchase record, creator release, generation record, or license text in an approved asset register and update this file.

## Phase 2 reuse and social preview (2026-10-12)

The Phase 2 website reuses the documented project-generated water, central-plant, and industrial WebP assets on Home, Applications, and dedicated industry pages. They represent infrastructure contexts; they are not photographs of Neraium customers or deployments. The existing logo and Craig Curtis portrait are unchanged.

`/assets/images/neraium-social.jpg` is a 1200 × 630 browser-rendered brand composition created locally from the existing official logo, documented project-generated central-plant image, and website typography. It replaces the old simulated dashboard social preview across public metadata. It includes no metrics or customer results. The prior preview remains available for rollback but is no longer referenced publicly.

## Premium visual redesign (2026-10-12)

`/assets/images/neraium-logo-horizontal.svg` reuses the exact image mask and filter from the existing original `neraium-logo-lockup.svg`. Two SVG viewports arrange the original emblem and original wordmark side by side; neither is redrawn or replaced with typeset lettering. The original stacked asset remains unchanged in source and build output. The horizontal composition is used in the header and footer.

`/assets/fonts/manrope-latin-variable.woff2` is the Latin variable Manrope font, downloaded from Google Fonts (`https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSg.woff2`). It is served locally, without Google Fonts requests at runtime. The SIL Open Font License is retained at `assets/fonts/OFL.txt`, from `https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt`.

Infrastructure imagery and the authentic founder portrait are reused without generating new imagery. The infrastructure images retain their existing representative, project-generated status; this redesign does not turn them into customer or documentary photographs.

## Final product explanation (2026-10-12)

The homepage's `product-demo` figure is a repository-native HTML/CSS/SVG explanatory composition. Its qualitative power-to-flow curves are schematic, with no measured values or customer outcomes. It is labeled “Illustrative product explanation” and explicitly discloses that it is neither customer data nor a live interface nor a diagnosis. No approved real product screenshot was found in the public asset register. The detailed pre-existing operating study is preserved on Evidence at `/evidence#walkthrough`. No new raster asset or third-party imagery was introduced.

## Visual and product experience refinement (2026-10-12)

The asset register and all existing raster assets were inspected, including the historical analytical plots and laptop/tablet compositions. No approved current product interface screenshot with documented source, dataset context, and public-use permission was found. Unregistered historical plots and generated screen imagery were not promoted as real product screenshots.

The homepage retains the repository-native schematic and now labels it “Illustrative evidence review.” The larger comparison and expandable evidence/limitations are explanatory website content, not a production dashboard, customer result, or claim of live product functionality. No numerical telemetry or new raster asset was introduced. The full engineering walkthrough remains on Evidence.

The original founder portrait and both original logo assets are byte-for-byte unchanged. Documented representative infrastructure imagery is reused with responsive source selection and revised CSS crops; it remains representative project-generated imagery rather than customer photography.


## Resort cooling context (2026-10-12)

`resort-cooling-1440.webp` and `resort-cooling-720.webp` are responsive derivatives of a new image generated with the OpenAI image generation tool for this refinement. The prompt specified an illustrative resort rooftop with cooling towers, connected chilled-water headers, valves, service catwalks and distant desert mountains, in restrained natural morning light. It excluded recognizable facilities, logos, people, text, screens and watermarks. The original generation is retained at `/home/ubuntu/.codex/generated_images/01a130d8-feb5-72e3-a116-abb8b8e7da97/exec-4ebbaf48-3bca-4227-a5a7-7e78e153b566.png`; Chromium canvas created the 1440×960 and 720×480 WebP derivatives (quality 0.84). They are used on Home, Applications, and Hospitality to distinguish the resort context from the original central-plant hero. This is generated context imagery, not customer or deployment photography. Existing applicability disclosures remain. The original hero, logo, social image, water imagery and founder portrait are unchanged.

## Market-alignment refinement (2026-10-12)

No image asset was added or altered. Existing representative water, resort cooling and industrial imagery remains distinct from actual customer photographs. The unchanged founder portrait and original logos retain their prior provenance.

Adjacent authentic interface captures were found under `Neraium-1.0/artifacts/product-screenshots/`. Their `authentic-screenshot-verification.json` identifies synthetic fixtures and explicitly rejects grouped-persistence/comparability presentation. They are not approved public product assets and were not copied to this website. The main explanatory figure now visibly labels itself “Illustrative evidence review,” retaining the schematic-only/customer-data/interface disclosure and introducing no numerical outcome.

## Final production review: product imagery requirements (2026-10-12)

The current homepage and Evidence page retain the visibly labeled schematic. Fresh inspection of the adjacent product repositories and the authentic capture verification record did not establish any approved, publishable current software screenshots. The recorded synthetic-fixture captures remain unsuitable: their grouped persistence and comparability labels overstate the underlying evidence. Product source, datasets, and screenshots were not modified or copied.

To replace the illustration, the product owner must supply an approved capture set from the actual application:

1. An interconnected system view identifying the analysis boundary and the effort, response, and context signals available within it.
2. A finding showing a developing relationship change, with the actual comparison periods and evidence qualification visible. Grouped persistence must follow its owning contract; unassessed persistence must remain unassessed.
3. Operating context showing recorded load, mode, equipment state, and comparability limits. Partial comparability must not be labeled fully supported.
4. Supporting evidence with source lineage, method identity, relationship-owned windows/sample counts, and an explicit consequence/uncertainty status. No invented values or unqualified savings/diagnosis claims.
5. The operator or engineer's next inspection view, showing the application's actual evidence record or investigation guidance.

Record the application release/commit, route, capture date, dataset provenance (including synthetic-fixture status if applicable), capture dimensions, public-use authorization, and a reviewed redaction list. Use authorized noncustomer data unless customer publication permission is documented. Remove names, addresses, facility/network identifiers, credentials, and proprietary details before capture. Redaction may conceal sensitive content; it must not alter analytical labels or imply new functionality. Screenshots should be legible at the intended desktop and mobile display size. Genuine interface output and approval are required; this website task does not authorize product changes to manufacture a showcase.

No approved Scott title, biography, or identified public-use portrait was found in the website records inspected. Scott is therefore omitted. The existing Craig Curtis portrait remains byte-for-byte unchanged. No new affiliation logo is used because an authentic permitted logo asset was not established.

## Enterprise completion review (2026-10-12)

Home now places the hypothetical finding before its supporting comparison and evidence controls. Evidence reuses the same repository-native, qualitative SVG with unique accessible identifiers. These remain explicitly illustrative explanations, without telemetry values, measured comparison periods, customer data, or production-interface claims. The six review disclosures distinguish physical behavior, telemetry relationships, operating context, qualification, and human investigation.

A fresh read-only review included the authentic-capture verification record, the later `neraium-validated-finding-evidence-1440x900.png`, product screenshot guidance, and the separate `ui-review` inventory. The later capture corrects the persistence wording but still displays unqualified “Comparable” context and lacks a reviewed source/public-use record. Its filename is not validation or publication authorization. None of these captures was copied to the public website. The precise required capture set and authorization/redaction requirements above remain outstanding. No application source or operational dataset was modified.

`founder-contact-480.webp` (480 × 472, 29,756 bytes) and `founder-contact-960.webp` (960 × 944, 69,494 bytes) are responsive delivery copies of the existing authentic `founder-contact.jpg` (1320 × 1298, 582,575 bytes). Chromium canvas uniformly resized the full, uncropped photograph and encoded WebP at quality 0.90. No generative processing, retouching, compositing, or alteration of facial features was performed. The original JPEG remains byte-for-byte unchanged and is retained as the fallback source. Responsive selection and eager/high-priority loading address the portrait appearing within the mobile opening. The existing approval/provenance status of the original photograph applies to these delivery copies; no new rights claim is made.

Original logos, all existing infrastructure imagery, and the original founder photograph remain unchanged. Scott remains omitted pending an official role, approved biography, and authentic approved photograph. Existing affiliation wording and membership qualifications are preserved.

## Uploaded founder headshot replacement (2026-10-12)

The preceding portrait-preservation entries describe earlier revisions. The current Company page uses the newly uploaded `/home/ubuntu/Craig Headshot.JPEG`, copied byte for byte to `assets/images/founder-headshot-original.jpeg` (1320 × 1784, 268,691 bytes). Both files have SHA-256 `014e78c5d47870b960b5ea49cfb66e25d390414842b038f3472fbd4169f2c3a0`. The home directory, Downloads, temporary/upload locations, and existing website assets were searched. Visual inspection distinguished this vertical suit-and-tie photograph from the older tight portrait crops in `founder-contact.jpg`, `craig.jpg`, and `craig-duplicate.jpg`; the newer temporary founder PNG is a screenshot of the previous website portrait. No second plausible new headshot upload was found.

Chromium canvas generated responsive WebP delivery copies directly from the uploaded JPEG. Each copy draws the entire decoded photograph at its original proportions, using high-quality uniform resizing and WebP quality 0.94. No AI generation, retouching, sharpening, color adjustment, facial modification, compositing, or additional cropping was applied. The original professional vertical framing is retained, and the page renders the image with automatic height. Unique asset names avoid reusing cached copies of the previous photograph.

| Delivery file | Dimensions | Bytes |
| --- | --- | --- |
| `founder-headshot-480.webp` | 480 × 649 | 50,072 |
| `founder-headshot-960.webp` | 960 × 1297 | 126,092 |
| `founder-headshot-1320.webp` | 1320 × 1784 | 192,314 |

Company is the only current public page that displays a founder portrait. Its responsive sources and original-JPEG fallback all use the new upload. The previous portrait assets remain available for historical rollback and are no longer referenced by current public pages. Biography, contact links, affiliations, branding, and Cloudflare configuration are unchanged.

Validation passed: production build, JavaScript syntax checks, 49 repository tests, 24 server tests, and 684 Playwright checks across nine viewport sizes (320–1920px). Desktop and mobile founder screenshots were visually reviewed. Additional browser checks verified proportional rendering without overflow, WebP selection at 1×/2×/3× pixel densities, and the original-JPEG fallback. No deployment was performed.
