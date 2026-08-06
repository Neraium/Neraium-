# Neraium public website audit

Audit date: 2026-08-06

Audited source: current `main` of `https://github.com/Neraium/Neraium-.git`

Deployment observed: Cloudflare Workers Static Assets at `www.neraium.com`

## Architecture verified before changes

- The public site is a static HTML, CSS, and JavaScript application. It is not the separate product/application repository.
- The repository already contained ten substantive, indexable public pages: Home, Platform, Evidence, Applications, Evaluation, Methodology, Security, Company, Operator Brief, and Contact, plus Privacy and a custom 404 page.
- Shared navigation exposed Platform, Evidence, Applications, Security, Evaluation, Company, and Contact. Methodology and Operator Brief were linked contextually.
- Every indexable page already had a distinct title and description, Open Graph metadata, canonical URL, structured data, and sitemap coverage.
- `robots.txt`, `sitemap.xml`, `.well-known/security.txt`, favicon/manifest assets, and a `404.html` file already existed.
- The deployment configuration was mixed: a Cloudflare Workers configuration was present, while the public form and some security behavior still assumed Netlify.
- No external image assets were introduced. Existing repository images remain project-supplied assets without additional provenance claims.

## Issues that still existed

1. Search results were stale. A search result still surfaced older water-focused title/copy although the current repository title already used “Systemic Infrastructure Intelligence.” This is primarily a recrawl and canonical-consistency problem, not evidence that the current site has only two pages.
2. Concrete proof arrived too late and was visually secondary. The homepage described the concept before showing what a supported finding actually looks like.
3. The initial market story was too broad. The site needed a clear starting point in central plants, chilled-water, pumping, water/utility systems, campuses, resorts, and large facilities without claiming that Neraium is limited to water.
4. Evidence Packages sometimes carried too much of the product explanation. They needed to remain a structured analysis output rather than the product category.
5. The Historical Evaluation and Contact copy added friction through a fixed 90-day suggestion, a required Role field, a required operational-data question, and an unsupported three-business-day response statement.
6. The production contact path was unreliable. The form used Netlify attributes on a Cloudflare deployment; posting to `/` could return the homepage and be reported by JavaScript as success even though no verified intake occurred.
7. Canonical and sitemap URLs used `.html`, while the live Cloudflare configuration redirected those URLs to clean routes. Legacy and retired routes were not explicitly mapped.
8. The live Cloudflare site did not receive the Netlify-only security headers. The committed custom 404 also was not configured as the Workers not-found response.
9. HTTP, apex-domain, and `www` versions all returned content without a verified canonical host redirect. This remains an account-level Cloudflare/DNS action.
10. Company and trust content existed but was thin and sometimes implied a broader team than the repository could verify.

## Critique items already solved in the current site

- The site was not a two-page brochure; it already had dedicated Platform, Evidence, Applications, Evaluation, Methodology, Security, Company, Operator Brief, and Contact content.
- The current title and category were already “Systemic Infrastructure Intelligence,” not an exclusively water-system title.
- Read-only operation, separation from the control path, human review, uncertainty, limitations, historical evaluation, and customer-controlled boundaries were already present in several pages.
- A representative EP-CHW-017 Evidence Package and sample PDF already existed.
- Founding information for Craig Kennedy was present. No additional people, biographies, offices, customer roster, or corporate milestones were verifiable.
- Sitemap, robots, page metadata, structured data, and a 404 file already existed; their consistency and deployment behavior needed correction rather than invention.

## Recommendations that conflicted with product strategy

- Recasting Neraium as a water-only product would conflict with its cross-domain systemic-infrastructure positioning. The revision leads with water, pumping, and central-plant systems as the initial market story, then states that the method can apply to other telemetry-rich operational infrastructure.
- Treating Evidence Packages as the category would collapse the distinction between the analysis product and one of its outputs. The revision makes this boundary explicit.
- Expanding the homepage into a long technical document would weaken the requested evaluation journey. Detailed methodology, applications, security, and evidence remain on dedicated pages.
- Framing Neraium as an autonomous control, prediction, or operator-replacement system would contradict the read-only and human-authority boundaries.

## Recommendations requiring unavailable evidence

The repository did not support claims about named customers, live deployments, active pilots, testimonials, certifications, SOC 2 status, quantified savings, avoided failures, downtime reduction, predictive certainty, root-cause certainty, revenue, customer metrics, a free evaluation, or a guaranteed response time. None were added.

EP-CHW-017 remains clearly illustrative and does not include invented percentages. Representative application contexts are labeled as examples, not customer case studies.

## Implemented response

- Reordered the homepage to lead with the category, direct explanation, compact EP-CHW-017 finding, operational problem, capabilities, Historical Evaluation, security/read-only boundary, and next step.
- Added the supported observation, threshold status, limitation, and illustrative-data disclaimer beside the hero.
- Clarified the initial commercial focus while preserving broader infrastructure applicability.
- Tightened Platform, Applications, Evaluation, Evidence, Security, Company, Contact, and Privacy content around process, proof, authority, and boundaries.
- Rebuilt the public inquiry around five required scoping fields and three optional fields. It prepares a transparent email draft and requests no telemetry, credentials, diagrams, or confidential operational details.
- Removed unsupported timing promises and the fixed 90-day requirement.
- Standardized clean internal, canonical, Open Graph, structured-data, and sitemap URLs.
- Added legacy redirects, Cloudflare security headers, custom 404 routing, and build-time validation/copying of deployment control files.
- Removed external font dependencies and inline load handlers so the strict production content-security policy can remain usable.
- Refined the visual system around Neraium teal `#007A74`, navy, restrained surfaces, smaller radii and shadows, a larger logo, and controlled mobile heading sizes.

## External actions still required

1. In Cloudflare DNS/Redirect Rules, redirect `http://neraium.com`, `https://neraium.com`, and HTTP `www` requests to `https://www.neraium.com` while preserving path and query.
2. Deploy the revised `dist/` build, then verify headers, redirects, custom 404 behavior, sitemap, and contact-email preparation on production.
3. Request recrawling of the homepage and sitemap in the applicable search-console account after deployment.
4. If Neraium later adopts a verified server-side inquiry service, replace the email-draft flow only after confirming recipient, retention, spam controls, privacy disclosure, and production delivery.
