# Asset provenance

This document covers image and icon assets referenced by the current public Neraium website. Where source evidence is not present in the repository, provenance remains unknown and ownership or licensing claims must not be made.

| File path | Source record | Status | Current use |
| --- | --- | --- | --- |
| `/assets/images/neraium-logo-lockup.svg` | Not included in repository. | Existing brand asset; ownership documentation should be retained. | Visible header logo on every public HTML page. |
| `/assets/images/founder-contact.jpg` | Not included in repository. | Existing founder portrait; permission or ownership should be documented. | Founder portrait on `company.html`; alt text identifies Craig Curtis. |
| `/assets/images/neraium-brand-preview.png` | Not included in repository. | Existing social preview; derivation or ownership should be documented. | Open Graph and Twitter preview metadata. |
| `favicon.ico` | Not included in repository. | Existing brand icon. | Browser favicon. |
| `/assets/images/apple-touch-icon.png` | Not included in repository. | Existing brand icon. | Apple touch-icon metadata. |
| `/assets/images/android-chrome-192x192.png` | Not included in repository. | Existing brand icon. | Web manifest. |
| `/assets/images/android-chrome-512x512.png` | Not included in repository. | Existing brand icon. | Web manifest. |
| `/assets/images/hero-central-plant.webp` and `hero-central-plant-900.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a photorealistic central chilled-water mechanical plant with pumps, insulated piping, valves, and gauges; no brands, screens, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Homepage hero atmospheric layer. |
| `/assets/images/water-infrastructure.webp` and `water-infrastructure-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a photorealistic municipal water treatment environment with pumps, pipes, basins, valves, and process equipment; no brands, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Homepage physical-infrastructure context gallery. |
| `/assets/images/industrial-infrastructure.webp` and `industrial-infrastructure-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested photorealistic interconnected industrial pipework, pumps, vessels, valves, and instrumentation; no brands, screens, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Homepage interconnected-systems context gallery. |
| `/assets/images/engineer-inspection.webp` and `engineer-inspection-700.webp` | Generated for Neraium with the OpenAI image generation tool on 2026-09-18. Prompt requested a candid field engineer inspecting an analog gauge and valve assembly with appropriate PPE; no brands, text, logos, or watermark. | Project-generated asset; no third-party photograph incorporated. Responsive WebP derivatives created locally from the generated PNG. | Homepage engineering-review context gallery. |

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
