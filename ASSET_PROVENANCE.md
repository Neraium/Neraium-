# Asset provenance

This document covers image and icon assets referenced by the current public Neraium website. Where source evidence is not present in the repository, provenance remains unknown and ownership or licensing claims must not be made.

| File path | Source record | Status | Current use |
| --- | --- | --- | --- |
| `/assets/images/neraium-logo-navy.jpg` | Craig’s supplied ` Neraium Logo.jpg` (the original filename starts with a space). | Original 1034 × 759 JPEG, SHA-256 `4c7cd3722c0aac29041250937e19d8737e9ed0e7dc12f0a8a50aeddbf895cb93`. | Header lockup on every public page. |
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


## Homepage aeration evidence

The homepage uses the retained modeled replay in `Demo-Neraium/demo_backend/data/aeration-replay.json`. The [public replay artifact](https://demo.neraium.com/api/demo/v1/historian/aeration/artifact) matched the retained file at review (SHA-256 `febe2e17847c5cba946c67d341e2c56cd8c93ef3a8b409e8fc882740be9c6a0f`). The completed window is index 2 (third of ten), 2026-08-19 from 00:00 to 23:55 UTC (288 rows). The fixed reference spans 2026-08-03 00:00 to 2026-08-16 23:55 UTC (4,032 rows).

Read the `global_relationship_model` registry records and their `pearson-global.v1` source measurements. The pairs are `basin_DO_mg_L` with `delivered_air_Nm3_h`, `basin_DO_mg_L` with `blower_command_pct`, and `delivered_air_Nm3_h` with `blower_command_pct`. All three assessments carry `acquisition_profile_unavailable`. The replay publishes zero qualified events across its ten windows.
