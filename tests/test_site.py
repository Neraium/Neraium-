import json
import re
import unittest
import xml.etree.ElementTree as ET
from datetime import date
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://neraium.com"
HOMEPAGE_MAX_WORD_COUNT = 1500
PAGE_MAX_WORD_COUNTS = {
    "platform.html": 900,
    "methodology.html": 440,
    "evidence.html": 750,
    "applications.html": 400,
    "security.html": 300,
    "pilot.html": 316,
    "operator-brief.html": 325,
    "company.html": 430,
    "contact.html": 360,
}


def is_external_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in ("http", "https")


def is_ignored_href(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in ("mailto", "tel") or value.startswith("javascript:")


def split_path_and_fragment(value: str) -> tuple[str, str | None]:
    if "#" not in value:
        return value, None
    path, frag = value.split("#", 1)
    return path, frag or None


def assert_generated_site_output() -> None:
    message = "Generated site output is missing. Run `npm run build` before deployment tests."
    if not (ROOT / "dist").is_dir() or not (ROOT / "dist" / "assets" / "images").is_dir():
        raise AssertionError(message)


def strip_querystring(value: str) -> str:
    return value.split("?", 1)[0]


@dataclass(frozen=True)
class LinkRef:
    source_file: Path
    tag: str
    attr: str
    raw: str


class SiteParser(HTMLParser):
    def __init__(self, source_file: Path):
        super().__init__(convert_charrefs=True)
        self.source_file = source_file
        self.ids: set[str] = set()
        self.imgs: list[dict[str, str]] = []
        self.refs: list[LinkRef] = []
        self.title_text = ""
        self.meta_descriptions: list[str] = []
        self.h1_count = 0
        self.og_titles: list[str] = []
        self.og_descriptions: list[str] = []
        self.canonical_links: list[str] = []
        self.robots_directives: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = {k: v for k, v in attrs if k}
        if "id" in attrs_dict and attrs_dict["id"]:
            self.ids.add(attrs_dict["id"])

        if tag == "title":
            self._in_title = True
        if tag == "h1":
            self.h1_count += 1

        if tag == "meta":
            name = (attrs_dict.get("name") or "").lower()
            content = (attrs_dict.get("content") or "").strip()
            if name == "description" and content:
                self.meta_descriptions.append(content)
            prop = (attrs_dict.get("property") or "").lower()
            if prop == "og:title" and content:
                self.og_titles.append(content)
            if prop == "og:description" and content:
                self.og_descriptions.append(content)
            if name == "robots" and content:
                self.robots_directives.append(content.lower())

        if tag == "img":
            self.imgs.append(attrs_dict)
            if "src" in attrs_dict and attrs_dict["src"]:
                self.refs.append(LinkRef(self.source_file, "img", "src", attrs_dict["src"]))
            if "srcset" in attrs_dict and attrs_dict["srcset"]:
                for candidate in attrs_dict["srcset"].split(","):
                    url = candidate.strip().split()[0] if candidate.strip() else ""
                    if url:
                        self.refs.append(LinkRef(self.source_file, "img", "srcset", url))

        if tag == "a":
            href = attrs_dict.get("href")
            if href:
                self.refs.append(LinkRef(self.source_file, "a", "href", href))

        if tag == "link":
            rel = (attrs_dict.get("rel") or "").lower()
            href = attrs_dict.get("href")
            if href and (rel in ("stylesheet", "icon", "apple-touch-icon", "manifest", "canonical") or attrs_dict.get("as") in ("style", "font")):
                self.refs.append(LinkRef(self.source_file, "link", "href", href))
            if rel == "canonical" and href:
                self.canonical_links.append(href.strip())

        if tag == "script":
            src = attrs_dict.get("src")
            if src:
                self.refs.append(LinkRef(self.source_file, "script", "src", src))

    def handle_data(self, data):
        if self._in_title:
            self.title_text += data

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    @property
    def is_noindex(self) -> bool:
        return any("noindex" in directive for directive in self.robots_directives)


def load_html(file_path: Path) -> SiteParser:
    parser = SiteParser(file_path)
    parser.feed(file_path.read_text(encoding="utf-8"))
    return parser


def site_html_files() -> list[Path]:
    return sorted([p for p in ROOT.glob("*.html") if p.is_file()])


OFFICIAL_LOGO = "/assets/images/neraium-horizontal-official-910.png"


def indexable_html_files() -> list[Path]:
    return [path for path in site_html_files() if not load_html(path).is_noindex]


def resolve_site_path(raw_path: str) -> Path:
    # Source files are flat HTML; production uses Cloudflare clean URLs.
    path = raw_path.lstrip("/")
    if not path:
        return (ROOT / "index.html").resolve()
    candidate = (ROOT / path).resolve()
    if candidate.exists():
        return candidate
    return (ROOT / f"{path}.html").resolve()


def html_file_to_public_url(file_path: Path) -> str:
    if file_path.name == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{file_path.stem}"


class TestStaticSite(unittest.TestCase):
    def test_html_files_exist(self):
        files = site_html_files()
        self.assertGreaterEqual(len(files), 1, "No .html files found in site root")

    def test_all_internal_asset_paths_exist(self):
        errors: list[str] = []
        for html_file in site_html_files():
            parsed = load_html(html_file)
            for ref in parsed.refs:
                raw = ref.raw.strip()
                if not raw or raw.startswith("#"):
                    continue
                if is_external_url(raw) or is_ignored_href(raw):
                    continue

                path_part, _frag = split_path_and_fragment(raw)
                path_part = strip_querystring(path_part)
                if not path_part:
                    # href like "#section" handled above
                    continue

                # Ignore querystring-only URLs.
                if path_part.startswith("?"):
                    continue

                # We only validate local, relative files.
                if re.match(r"^[a-zA-Z]+:", path_part):
                    continue

                resolved = resolve_site_path(path_part)
                if not resolved.exists():
                    errors.append(f"{ref.source_file.name}: <{ref.tag} {ref.attr}='{ref.raw}'> -> missing '{path_part}'")

        if errors:
            self.fail("Missing internal assets/paths:\n" + "\n".join(errors))

    def test_internal_anchors_exist(self):
        # Build id map for all html files
        id_map: dict[str, set[str]] = {}
        for html_file in site_html_files():
            id_map[html_file.name] = load_html(html_file).ids

        errors: list[str] = []
        for html_file in site_html_files():
            parsed = load_html(html_file)
            for ref in parsed.refs:
                if ref.tag != "a" or ref.attr != "href":
                    continue
                raw = ref.raw.strip()
                if not raw or is_external_url(raw) or is_ignored_href(raw) or raw.startswith("mailto:") or raw.startswith("tel:"):
                    continue

                path_part, frag = split_path_and_fragment(raw)
                if not frag:
                    continue

                target_file = html_file.name if path_part in ("", html_file.name) else Path(path_part).name
                if target_file not in id_map:
                    # If link is to non-html (e.g. /), it will be caught by path existence.
                    continue
                if frag not in id_map[target_file]:
                    errors.append(f"{html_file.name}: href='{raw}' -> missing id '{frag}' in {target_file}")

        if errors:
            self.fail("Broken internal anchors:\n" + "\n".join(errors))

    def test_all_images_have_alt_text(self):
        errors: list[str] = []
        for html_file in site_html_files():
            parsed = load_html(html_file)
            for img in parsed.imgs:
                src = (img.get("src") or "").strip()
                alt = img.get("alt")
                if src and (alt is None or not alt.strip()):
                    errors.append(f"{html_file.name}: <img src='{src}'> missing non-empty alt text")
        if errors:
            self.fail("Accessibility issues:\n" + "\n".join(errors))

    def test_every_page_has_basic_seo_metadata(self):
        errors: list[str] = []
        for html_file in site_html_files():
            parsed = load_html(html_file)
            title = parsed.title_text.strip()
            description = next((item for item in parsed.meta_descriptions if item), "")
            canonical = parsed.canonical_links
            expected_canonical = html_file_to_public_url(html_file)
            if not title:
                errors.append(f"{html_file.name}: missing <title>")
            if not description:
                errors.append(f"{html_file.name}: missing meta description")
            if not parsed.is_noindex and canonical != [expected_canonical]:
                errors.append(f"{html_file.name}: canonical should be '{expected_canonical}', found {canonical}")
            if len(parsed.og_titles) != 1 or len(parsed.og_descriptions) != 1:
                errors.append(f"{html_file.name}: missing distinct Open Graph title or description")
        if errors:
            self.fail("SEO metadata issues:\n" + "\n".join(errors))

    def test_sitemap_includes_every_public_html_page(self):
        sitemap_path = ROOT / "sitemap.xml"
        self.assertTrue(sitemap_path.exists(), "sitemap.xml is missing")
        root = ET.parse(sitemap_path).getroot()
        namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
        sitemap_urls = {node.text.strip() for node in root.findall("sm:url/sm:loc", namespace) if node.text}
        sitemap_lastmods = {node.text.strip() for node in root.findall("sm:url/sm:lastmod", namespace) if node.text}
        expected_urls = {html_file_to_public_url(path) for path in indexable_html_files()}
        self.assertEqual(expected_urls, sitemap_urls)
        for lastmod in sitemap_lastmods:
            self.assertLessEqual(date.fromisoformat(lastmod), date.today())


    def test_every_public_page_has_exactly_one_h1(self):
        errors = []
        for html_file in site_html_files():
            count = load_html(html_file).h1_count
            if count != 1:
                errors.append(f"{html_file.name}: expected 1 h1, found {count}")
        if errors:
            self.fail("Heading hierarchy issues:\n" + "\n".join(errors))

    def test_unique_titles_and_page_appropriate_descriptions(self):
        titles = {}
        descriptions = {}
        for html_file in indexable_html_files():
            parsed = load_html(html_file)
            title = parsed.title_text.strip()
            desc = parsed.meta_descriptions[0] if parsed.meta_descriptions else ""
            titles.setdefault(title, []).append(html_file.name)
            descriptions.setdefault(desc, []).append(html_file.name)
        duplicate_titles = {k:v for k,v in titles.items() if len(v)>1}
        duplicate_desc = {k:v for k,v in descriptions.items() if len(v)>1}
        self.assertEqual({}, duplicate_titles)
        self.assertEqual({}, duplicate_desc)

    def test_primary_navigation_consistency_and_routes(self):
        primary = [('/platform','Platform'),('/methodology','How It Works'),('/applications','Industries'),('/company','About'),('/contact','Request an Evaluation')]
        preserved_routes = [('/security','Security')]
        for html_file in site_html_files():
            html = html_file.read_text(encoding='utf-8')
            navigation = re.search(r'<nav class="nav" id="main-navigation".*?</nav>', html, re.DOTALL)
            self.assertIsNotNone(navigation, f"{html_file.name} missing primary navigation")
            navigation_html = navigation.group(0)
            navigation_links = [
                (href, re.sub(r'<[^>]+>', '', label).strip())
                for href, label in re.findall(r'<a\b[^>]*\bhref="([^"]+)"[^>]*>(.*?)</a>', navigation_html, re.DOTALL)
            ]
            self.assertEqual(primary if 'class="header-action"' in html else primary[:-1], navigation_links, f"{html_file.name} primary navigation differs")
            for href, label in re.findall(r'<a\b[^>]*\bhref="([^"]+)"[^>]*>(.*?)</a>', html, re.DOTALL):
                if re.sub(r'<[^>]+>', '', label).strip() == 'Applications':
                    self.assertEqual('/applications', href, f"{html_file.name} has an incorrect Applications route")
            if not load_html(html_file).is_noindex:
                for href, label in preserved_routes:
                    self.assertIn(f'href="{href}"', html, f"{html_file.name} missing {label} route")
                    self.assertNotIn(f'href="{href}"', navigation_html, f"{html_file.name} should keep {label} outside primary navigation")
            self.assertNotIn('>Contact</a></nav><a class="header-action"', html)
        self.assertTrue((ROOT / 'evidence.html').exists())
        self.assertTrue((ROOT / 'company.html').exists())

    def test_public_footers_have_static_year_fallback_and_dynamic_update(self):
        footer_pages = []
        for html_file in site_html_files():
            html = html_file.read_text(encoding='utf-8')
            if '<footer' not in html:
                continue
            footer_pages.append(html_file.name)
            footer = re.search(r'<footer\b.*?</footer>', html, re.DOTALL)
            self.assertIsNotNone(footer, f"{html_file.name} has an incomplete footer")
            self.assertEqual(1, footer.group(0).count('<span id="year">2026</span>'))
            self.assertNotIn('<span id="year"></span>', footer.group(0))
        self.assertTrue(footer_pages, "No public footers found")
        scripts = (ROOT / 'scripts.js').read_text(encoding='utf-8')
        self.assertIn("year.textContent = new Date().getFullYear()", scripts)

    def test_public_headers_use_official_white_logo_lockup(self):
        errors = []
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            header_match = re.search(r"<header class=\"site-header\">.*?</header>", html, re.DOTALL)
            if not header_match:
                errors.append(f"{html_file.name}: missing site header")
                continue
            header = header_match.group(0)
            logo_pattern = re.compile(
                rf'<img src="{re.escape(OFFICIAL_LOGO)}" srcset="/assets/images/neraium-horizontal-official-910[.]png 910w, '
                r'/assets/images/neraium-horizontal-official-1820[.]png 1820w" '
                r'sizes="\(max-width: 600px\) 190px, 216px" width="1820" height="362" '
                r'alt="Neraium logo" class="brand-lockup">'
            )
            if not logo_pattern.search(header):
                errors.append(f"{html_file.name}: missing official logo img")
            if 'href="/"' not in header:
                errors.append(f"{html_file.name}: logo/header does not link home")
            brand_link = re.search(r'<a class="brand"[^>]*>(.*?)</a>', header, re.DOTALL)
            if brand_link and re.sub(r"<[^>]+>", "", brand_link.group(1)).strip():
                errors.append(f"{html_file.name}: header renders separate brand text")
        if errors:
            self.fail("Logo header issues:\n" + "\n".join(errors))

    def test_no_dormant_analytics_or_broken_social_images(self):
        scripts = (ROOT / 'scripts.js').read_text(encoding='utf-8')
        for marker in ('G-XXXXXXXXXX', 'googletagmanager.com', 'dataLayer', 'window.gtag'):
            self.assertNotIn(marker, scripts)
        for html_file in site_html_files():
            html = html_file.read_text(encoding='utf-8')
            self.assertNotIn('name="ga4-measurement-id"', html)
            for match in re.findall(r'<meta property="og:image" content="https://www\.neraium\.com/([^"]+)">', html):
                self.assertTrue((ROOT / match).exists(), f"{html_file.name}: missing social image {match}")


class TestPositioningAndExperience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        cls.scripts = (ROOT / "scripts.js").read_text(encoding="utf-8")

    @staticmethod
    def normalized(value: str) -> str:
        value = re.sub(r"<style\b[^>]*>.*?</style>", " ", value, flags=re.DOTALL | re.I)
        value = re.sub(r"<script\b[^>]*>.*?</script>", " ", value, flags=re.DOTALL | re.I)
        return " ".join(re.sub(r"<[^>]+>", " ", value).split())

    def test_core_positioning_and_ctas(self):
        text = self.normalized(self.index)
        for phrase in ("Systemic Infrastructure Intelligence", "Understand What Your Infrastructure Is Really Doing.", "persistent changes", "relationships", "expected ranges", "read-only", "historical", "MVP"):
            self.assertIn(phrase.casefold(), text.casefold())
        platform = self.normalized((ROOT / "platform.html").read_text())
        for phrase in ("Systemic Degradation Intelligence", "Continuous Analytical Memory", "Operational Evidence Testing", "not production-qualified", "Exploratory", "root cause", "source windows"):
            self.assertIn(phrase, platform)
        methodology = (ROOT / "methodology.html").read_text()
        flow = re.search(r'<ol class="process-grid">(.*?)</ol>', methodology, re.DOTALL)
        self.assertIsNotNone(flow)
        self.assertEqual(flow.group(1).count("<li>"), 4)
        self.assertIn("Insufficient evidence", methodology)

    def test_information_architecture_sections_exist(self):
        sections = ("problem", "difference", "applications", "how-it-works", "evidence", "integration", "evaluation")
        positions = [self.index.index(f'id="{section}"') for section in sections]
        self.assertEqual(positions, sorted(positions))
        for route in ("water-wastewater", "hospitality", "infrastructure"):
            self.assertIn(f'href="/{route}"', (ROOT / "applications.html").read_text())
        for route in ("water-wastewater", "hospitality"):
            page = (ROOT / f"{route}.html").read_text()
            self.assertIn(f'/contact?industry={route}', page)
            self.assertIn('href="/pilot"', page)
            self.assertIn('not validated customer outcomes', page)

    def test_initial_and_expansion_market_boundaries(self):
        for filename in ("index.html", "applications.html", "company.html"):
            text = self.normalized((ROOT / filename).read_text()).casefold()
            for phrase in ("initial commercial", "municipal water", "wastewater", "hospitality", "resort"):
                self.assertIn(phrase, text)
        expansion = self.normalized((ROOT / "infrastructure.html").read_text()).casefold()
        for phrase in ("future", "initial commercial focus remains", "energy", "manufacturing", "maritime", "aviation", "data centers", "healthcare", "campuses"):
            self.assertIn(phrase, expansion)
        self.assertNotIn("Las Vegas hospitality", self.normalized(self.index))

    def test_evidence_package_and_maintenance_view_are_complete(self):
        evidence = self.normalized((ROOT / "evidence.html").read_text())
        for phrase in ("What changed", "What to inspect", "What it cannot prove", "Source & comparison", "Method & support", "Limits & next steps", "Insufficient evidence", "immudb", "tamper-evident", "does not establish the correctness", "where implemented"):
            self.assertIn(phrase.casefold(), evidence.casefold())
        for filename in ("index.html", "evidence.html"):
            text = self.normalized((ROOT / filename).read_text()).casefold()
            self.assertIn("conceptual illustration", text)
            self.assertIn("not customer data", text)
            self.assertIn("no measured values", text)
        operator = self.normalized((ROOT / "operator-brief.html").read_text())
        for phrase in ("What changed?", "What supports it?", "What remains uncertain?", "Insufficient", "read-only"):
            self.assertIn(phrase.casefold(), operator.casefold())

    def test_security_boundaries_are_clearly_distinguished(self):
        security = self.normalized((ROOT / "security.html").read_text()).casefold()
        for phrase in ("read-only by design", "control authority", "no autonomous equipment control", "supported interfaces", "historical exports", "permissions", "retention", "universal"):
            self.assertIn(phrase, security)
        for filename in ("water-wastewater.html", "hospitality.html"):
            self.assertIn('href="/pilot"', (ROOT / filename).read_text())
        pilot = self.normalized((ROOT / "pilot.html").read_text()).casefold()
        for phrase in ("historical proof of value", "scoped paid pilot", "commercial deployment if validated", "finding is not guaranteed"):
            self.assertIn(phrase, pilot)

    def test_homepage_reduction_regression_contract(self):
        text = self.normalized(self.index)
        self.assertLessEqual(len(text.split()), HOMEPAGE_MAX_WORD_COUNT)
        for phrase in ("predictive maintenance", "AI copilot", "digital twin", "root-cause engine", "autonomous diagnosis", "Know when the system stops behaving like itself", "See degradation before systems fail"):
            for page in site_html_files():
                self.assertNotIn(phrase.casefold(), page.read_text().casefold(), page.name)
        for phrase in ("Evidence Vault Protocol", "immudb", "Historical proof of value", "Scoped paid pilot", "Commercial deployment", "See What Your Operational"):
            self.assertIn(phrase, text)

    def test_primary_ctas_and_reduced_homepage_routes_remain_valid(self):
        for href, label in (
            ("/contact", "Request an Evaluation"),
            ("/methodology", "See how it works"),
            ("/platform", "Explore the platform"),
            ("/pilot", "Review the evaluation process"),
        ):
            self.assertIn(f'href="{href}"', self.index, f"missing route for {label}")
            self.assertTrue(resolve_site_path(href).exists(), f"missing target page for {label}")
    def test_page_roles_remain_compressed_and_distinct(self):
        for filename in PAGE_MAX_WORD_COUNTS:
            text = self.normalized((ROOT / filename).read_text())
            self.assertLessEqual(len(text.split()), 1100, f"{filename} should remain focused")
        company = (ROOT / "company.html").read_text()
        for marker in ('id="founder"', 'width="1320" height="1784"', 'class="founder-links"', 'aria-label="Craig Curtis on LinkedIn"', 'href="mailto:craig@neraium.com"'):
            self.assertIn(marker, company)
        self.assertIn("pre-revenue", company)
        self.assertIn("MVP", company)

    def test_mobile_typography_contract_remains_intact(self):
        self.assertRegex(self.styles, r"font-size:\s*clamp\(")
        self.assertIn("max-width:760px", self.styles)
        self.assertIn(".lead", self.styles)
        self.assertIn(".nav-toggle", self.styles)

    def test_contact_form_fields_and_warning(self):
        contact = (ROOT / "contact.html").read_text(encoding="utf-8")
        for field_id in ("name", "email", "organization", "facility", "review-question", "role", "preferred-contact"):
            self.assertIn(f'id="{field_id}"', contact)
        for required_id in ("name", "email", "organization", "facility"):
            self.assertRegex(contact, rf'id="{required_id}"[^>]*required')
        for optional_id in ("review-question", "role", "preferred-contact"):
            field = re.search(rf'<(?:input|select|textarea)[^>]*id="{optional_id}"[^>]*>', contact)
            self.assertIsNotNone(field)
            self.assertNotIn("required", field.group(0))
        self.assertIn(
            "Do not submit telemetry, credentials, diagrams, network details, files, or sensitive operational information here.",
            contact,
        )
        self.assertIn("customer-approved transfer method", contact)
        self.assertIn("processed through Cloudflare", contact)
        self.assertIn('action="/api/contact"', contact)
        self.assertIn('data-loading-label=', contact)
        self.assertNotIn('data-netlify="true"', contact)
        self.assertNotIn("business day", contact.lower())
    def test_design_tokens_and_responsive_contract(self):
        for token in ("--bg", "--surface", "--accent", "--ink", "--muted", "--line", "--font"):
            self.assertIn(token, self.styles)
        for width in ("1120px", "760px", "420px"):
            self.assertIn(f"max-width:{width}", self.styles)
        for marker in ("prefers-reduced-motion", ".nav.open", ".nav-contact", "@media print"):
            self.assertIn(marker, self.styles)
        self.assertIn("Close navigation", self.scripts)

    def test_required_social_metadata_and_structured_data(self):
        for html_file in indexable_html_files():
            html = html_file.read_text(encoding="utf-8")
            with self.subTest(page=html_file.name):
                for marker in ('property="og:title"','property="og:description"','property="og:image"','property="og:url"','name="twitter:card"','type="application/ld+json"'):
                    self.assertIn(marker, html)
                payload = json.loads(re.search(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', html, re.DOTALL).group(1))
                graph_types = {item.get("@type") for item in payload.get("@graph", [])}
                self.assertIn("Organization", graph_types)
                self.assertIn("WebSite", graph_types)
                self.assertNotIn("SoftwareApplication", graph_types)

    def test_no_disallowed_claims(self):
        changed_pages = "\n".join(path.read_text(encoding="utf-8") for path in site_html_files()).lower()
        for claim in ("ai-powered", "predictive failure", "predicts failures", "guarantees savings", "diagnoses root cause", "replaces engineers", "autonomously controls"):
            self.assertNotIn(claim, changed_pages)


class TestDeploymentAndIndexing(unittest.TestCase):
    def test_cloudflare_uses_clean_urls_and_custom_404(self):
        config = json.loads((ROOT / "wrangler.jsonc").read_text(encoding="utf-8"))
        self.assertEqual("auto-trailing-slash", config["assets"]["html_handling"])
        self.assertEqual("404-page", config["assets"]["not_found_handling"])
        self.assertFalse(config["workers_dev"])
        self.assertFalse(config["preview_urls"])

    def test_redirects_preserve_current_and_retired_routes(self):
        redirects = (ROOT / "_redirects").read_text(encoding="utf-8")
        for rule in (
            "/index.html / 301",
            "/platform.html /platform 301",
            "/contact.html /contact 301",
            "/analysis.html /platform 301",
            "/application.html /applications 301",
            "/governance.html /security 301",
        ):
            self.assertIn(rule, redirects)

    def test_cloudflare_headers_cover_security_and_caching(self):
        headers = (ROOT / "_headers").read_text(encoding="utf-8")
        for header in (
            "Content-Security-Policy:",
            "Cross-Origin-Opener-Policy: same-origin",
            "Strict-Transport-Security:",
            "X-Content-Type-Options: nosniff",
            "X-Frame-Options: DENY",
            "X-Permitted-Cross-Domain-Policies: none",
            "Referrer-Policy: strict-origin-when-cross-origin",
            "form-action 'self' mailto:",
        ):
            self.assertIn(header, headers)

    def test_security_txt_has_required_contact_expiry_and_canonical(self):
        security_txt = (ROOT / ".well-known" / "security.txt").read_text(encoding="utf-8")
        self.assertIn("Contact: mailto:craig@neraium.com", security_txt)
        self.assertRegex(security_txt, r"(?m)^Expires: 20\d{2}-\d{2}-\d{2}T")
        self.assertIn("Canonical: https://neraium.com/.well-known/security.txt", security_txt)

    def test_custom_404_uses_root_assets_without_a_false_canonical(self):
        not_found = (ROOT / "404.html").read_text(encoding="utf-8")
        self.assertIn('name="robots" content="noindex"', not_found)
        self.assertNotIn('rel="canonical"', not_found)
        for asset in ('/styles.css?v=20261104sii1', '/scripts.js?v=20261104sii1', '/site.webmanifest'):
            self.assertIn(asset, not_found)
    def test_retired_claim_artifacts_are_preserved_but_not_deployed(self):
        assert_generated_site_output()
        for relative in ("sample-finding-pack.pdf", "assets/images/neraium-brand-preview.png", "assets/images/neraium-social.jpg", "assets/images/neraium-social-horizontal.png"):
            self.assertTrue((ROOT / relative).is_file())
            self.assertFalse((ROOT / "dist" / relative).exists())
        self.assertTrue((ROOT / "dist" / "assets/images/neraium-sii-social.png").is_file())

    def test_deployment_control_files_are_built(self):
        assert_generated_site_output()
        for filename in ("_headers", "_redirects"):
            self.assertTrue((ROOT / "dist" / filename).is_file())
        netlify = (ROOT / "netlify.toml").read_text(encoding="utf-8")
        self.assertIn('command = "npm run build"', netlify)
        self.assertIn('publish = "dist"', netlify)


if __name__ == "__main__":
    unittest.main()

class TestPerformanceOptimizations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = load_html(ROOT / "index.html")
        cls.index_html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_home_hero_uses_responsive_infrastructure_and_one_primary_action(self):
        hero = re.search(r'<section class="hero.*?</section>', self.index_html, re.DOTALL).group(0)
        self.assertIn('fetchpriority="high"', hero)
        self.assertIn('hero-central-plant-900.webp', hero)
        self.assertIn('href="/contact"', hero)
        self.assertEqual(hero.count('class="button primary"'), 1)
        self.assertIn('href="/platform"', hero)
        self.assertIn('Explore the Platform', hero)
        self.assertIn('relationship-title', self.index_html)
        self.assertIn('Conceptual illustration', self.index_html)
        self.assertNotIn('class="behavior-visual"', self.index_html)

    def test_below_fold_images_are_lazy_loaded_when_appropriate(self):
        eager_allowlist = {
            OFFICIAL_LOGO,
            "/assets/images/hero-central-plant.webp",
        }
        errors = []
        for img in load_html(ROOT / "index.html").imgs:
            src = img.get("src", "")
            if src.startswith("/assets/images/") and src not in eager_allowlist:
                if img.get("loading") != "lazy":
                    errors.append(f"index.html: {src}")
                if img.get("decoding") != "async":
                    errors.append(f"index.html: {src} missing async decoding")
        if errors:
            self.fail("Below-the-fold image priority issues:\n" + "\n".join(errors))

    def test_stylesheet_loads_without_inline_event_handlers(self):
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            self.assertRegex(html, r'<link rel="stylesheet" href="/styles\.css\?v=[A-Za-z0-9_-]+">')
            self.assertRegex(html, r'<script src="/scripts\.js\?v=[A-Za-z0-9_-]+" defer></script>')
            self.assertIn('<link rel="manifest" href="/site.webmanifest">', html)
            self.assertNotIn("onload=", html)
    def test_above_fold_media_is_not_deferred(self):
        for filename in ("platform.html", "evidence.html", "applications.html", "pilot.html"):
            html = (ROOT / filename).read_text(encoding="utf-8")
            hero = re.search(r'<section class="page-hero[^>]*>.*?</section>', html, re.DOTALL)
            self.assertIsNotNone(hero, filename)
            if "<img " in hero.group(0):
                self.assertIn('loading="eager"', hero.group(0), filename)
                self.assertIn('fetchpriority="high"', hero.group(0), filename)

    def test_homepage_has_no_inline_style_block(self):
        self.assertNotIn("<style", self.index_html)

    def test_site_has_no_external_font_dependency(self):
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            self.assertNotIn("fonts.googleapis.com", html)
            self.assertNotIn("fonts.gstatic.com", html)
        self.assertIn("'Segoe UI'", (ROOT / "styles.css").read_text(encoding="utf-8"))

    def test_no_public_asset_exceeds_cloudflare_limit(self):
        for path in [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts and "node_modules" not in p.parts]:
            self.assertLessEqual(path.stat().st_size, 25 * 1024 * 1024, str(path.relative_to(ROOT)))


class TestImageDeploymentPipeline(unittest.TestCase):
    IMAGE_DIR = ROOT / "assets" / "images"
    DIST = ROOT / "dist"
    FEATURED_IMAGE = "/assets/images/evidence-package-laptop.jpg"
    REUPLOADED = {
        "pump-room.jpg",
        "evidence-package-laptop.jpg",
        "read-only-workflow.jpg",
        "pressure-gauges.jpg",
        "rooftop-cooling.jpg",
        "engineer-tablet.jpg",
        "control-panels.jpg",
    }

    @staticmethod
    def _local_image_refs_from_text(text: str) -> set[str]:
        refs: set[str] = set()
        patterns = (
            r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']',
            r'<meta\b[^>]*(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*\bcontent=["\']([^"\']+)["\']',
            r'url\(["\']?([^"\')]+)["\']?\)',
            r'"src"\s*:\s*"([^"]+)"',
        )
        for pattern in patterns:
            for match in re.findall(pattern, text, flags=re.I):
                value = match.strip()
                if value.startswith(SITE_ORIGIN + "/"):
                    value = value.removeprefix(SITE_ORIGIN)
                if value.startswith("/assets/images/"):
                    refs.add(strip_querystring(value))
        return refs

    @classmethod
    def setUpClass(cls):
        assert_generated_site_output()
        cls.image_refs: set[str] = set()
        for path in site_html_files() + [ROOT / "styles.css", ROOT / "site.webmanifest"]:
            cls.image_refs.update(cls._local_image_refs_from_text(path.read_text(encoding="utf-8")))

    def test_public_image_filenames_are_url_safe_and_unique(self):
        basenames: dict[str, list[str]] = {}
        for image in self.IMAGE_DIR.iterdir():
            if image.is_file():
                self.assertRegex(image.name, r"^[a-z0-9][a-z0-9.-]*\.(jpg|jpeg|png|webp|svg)$")
                self.assertNotIn(" ", image.name)
                basenames.setdefault(image.stem, []).append(image.name)
        duplicates = {name: files for name, files in basenames.items() if len(files) > 1}
        self.assertEqual({}, duplicates)

    def test_every_referenced_image_exists_in_source_and_dist_case_sensitive(self):
        errors = []
        for ref in sorted(self.image_refs):
            source = ROOT / ref.lstrip("/")
            dist = self.DIST / ref.lstrip("/")
            if not source.is_file():
                errors.append(f"source missing: {ref}")
            if not dist.is_file():
                errors.append(f"dist missing: {ref}")
            if source.parent.is_dir() and source.name not in {p.name for p in source.parent.iterdir()}:
                errors.append(f"source case mismatch: {ref}")
            if dist.parent.is_dir() and dist.name not in {p.name for p in dist.parent.iterdir()}:
                errors.append(f"dist case mismatch: {ref}")
        if errors:
            self.fail("Image resolution errors:\n" + "\n".join(errors))

    def test_official_logo_exists_in_source_and_dist(self):
        self.assertIn(OFFICIAL_LOGO, self.image_refs)
        for root in (ROOT, self.DIST):
            logo = root / OFFICIAL_LOGO.lstrip("/")
            self.assertTrue(logo.is_file(), str(logo))
            self.assertEqual("neraium-horizontal-official-910.png", logo.name)
            self.assertTrue(logo.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"))

    def test_responsive_logos_preserve_official_source_and_aspect_ratio(self):
        import struct
        import hashlib
        source = ROOT / "brand-source/neraium-horizontal-original.png"
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),
                         "326db293b921fd1898c8d00054a6c8678d8a75af410eb9691450fea540ac3803")
        for width, height in ((910, 181), (1820, 362)):
            asset = ROOT / f"assets/images/neraium-horizontal-official-{width}.png"
            data = asset.read_bytes()
            self.assertEqual(struct.unpack(">II", data[16:24]), (width, height))
            self.assertEqual(data[25], 6, "Logo must be RGBA, with transparency")
            self.assertEqual(width / height, 1820 / 362)
        for html_file in site_html_files():
            self.assertNotIn("neraium-logo-official-", html_file.read_text())

    def test_every_visible_logo_has_required_alt_text(self):
        for html_file in site_html_files():
            logos = [
                img for img in load_html(html_file).imgs
                if (img.get("src") or "").strip() == OFFICIAL_LOGO
            ]
            self.assertEqual(1 if html_file.name == "technical.html" else 2, len(logos), html_file.name)
            self.assertEqual("Neraium logo", logos[0].get("alt"), html_file.name)

    def test_images_are_non_empty_valid_and_cloudflare_safe(self):
        signatures = {
            ".jpg": lambda b: b.startswith(b"\xff\xd8\xff"),
            ".jpeg": lambda b: b.startswith(b"\xff\xd8\xff"),
            ".png": lambda b: b.startswith(b"\x89PNG\r\n\x1a\n"),
            ".webp": lambda b: b[:4] == b"RIFF" and b[8:12] == b"WEBP",
            ".svg": lambda b: b.lstrip().startswith(b"<svg"),
        }
        for ref in sorted(self.image_refs):
            data = (self.DIST / ref.lstrip("/")).read_bytes()
            self.assertGreater(len(data), 0, ref)
            self.assertLessEqual(len(data), 25 * 1024 * 1024, ref)
            self.assertTrue(signatures[Path(ref).suffix.lower()](data), ref)

    def test_featured_and_reuploaded_images_are_in_dist(self):
        self.assertNotIn(self.FEATURED_IMAGE, self.image_refs)
        self.assertTrue((self.DIST / self.FEATURED_IMAGE.lstrip("/")).is_file())
        copied = {path.name for path in (self.DIST / "assets" / "images").iterdir()}
        self.assertTrue(self.REUPLOADED.issubset(copied))
    def test_visible_images_have_meaningful_alt_text(self):
        for html_file in site_html_files():
            for img in load_html(html_file).imgs:
                alt = (img.get("alt") or "").strip()
                self.assertGreaterEqual(len(alt), 8, f"{html_file.name}: {img.get('src')}")
                self.assertNotIn(alt.lower(), {"image", "photo", "picture", "graphic"})

    def test_dist_image_directory_excludes_internal_files(self):
        forbidden = {"node_modules", ".git", "tests", "scripts", "__pycache__", ".cache", "AGENTS.md"}
        for path in (self.DIST / "assets" / "images").rglob("*"):
            self.assertFalse(any(part in forbidden for part in path.parts), str(path))

class TestImageHttpServing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        assert_generated_site_output()

    def test_local_http_server_returns_images(self):
        import http.server
        import socketserver
        import threading
        import urllib.request

        refs = set()
        for path in site_html_files() + [ROOT / "styles.css", ROOT / "site.webmanifest"]:
            refs.update(TestImageDeploymentPipeline._local_image_refs_from_text(path.read_text(encoding="utf-8")))
        handler = lambda *args, **kwargs: http.server.SimpleHTTPRequestHandler(*args, directory=str(ROOT / "dist"), **kwargs)
        with socketserver.TCPServer(("127.0.0.1", 0), handler) as server:
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                base = f"http://127.0.0.1:{server.server_address[1]}"
                for ref in sorted(refs):
                    with urllib.request.urlopen(base + ref, timeout=5) as response:
                        self.assertEqual(200, response.status, ref)
                        self.assertTrue(response.headers.get("Content-Type", "").startswith("image/"), ref)
                        response.read()
            finally:
                server.shutdown()
                thread.join(timeout=5)
