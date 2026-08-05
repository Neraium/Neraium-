import json
import re
import unittest
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.neraium.com"
HOMEPAGE_PRE_REDUCTION_WORD_COUNT = 599


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


def indexable_html_files() -> list[Path]:
    return [path for path in site_html_files() if not load_html(path).is_noindex]


def resolve_site_path(raw_path: str) -> Path:
    # Site is flat at repo root; allow leading slash.
    path = raw_path.lstrip("/")
    return (ROOT / path).resolve()


def html_file_to_public_url(file_path: Path) -> str:
    if file_path.name == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{file_path.name}"


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
        expected_urls = {html_file_to_public_url(path) for path in indexable_html_files()}
        self.assertEqual(expected_urls, sitemap_urls)


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
        expected = [('platform.html','Platform'),('evidence.html','Evidence'),('technical.html','Applications'),('security.html','Security'),('pilot.html','Evaluation'),('company.html','Company')]
        for html_file in site_html_files():
            html = html_file.read_text(encoding='utf-8')
            for href, label in expected:
                self.assertIn(f'href="{href}"', html, f"{html_file.name} missing {label} route")
            self.assertNotIn('>How It Works</a>', html)
            self.assertNotIn('>Contact</a></nav><a class="header-action"', html)
        self.assertTrue((ROOT / 'evidence.html').exists())
        self.assertTrue((ROOT / 'company.html').exists())

    def test_no_placeholder_active_analytics_or_broken_social_images(self):
        scripts = (ROOT / 'scripts.js').read_text(encoding='utf-8')
        self.assertIn("gaMeasurementId !== 'G-XXXXXXXXXX'", scripts)
        for html_file in indexable_html_files():
            html = html_file.read_text(encoding='utf-8')
            self.assertNotIn('googletagmanager.com/gtag/js?id=G-XXXXXXXXXX', html)
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
        for phrase in (
            "Systemic Infrastructure Intelligence",
            "Identify persistent changes in operational systems.",
            "analyzes how operational systems behave over time",
            "persistent behavioral changes",
            "conventional threshold monitoring",
            "Detect Persistent Behavioral Change",
            "Preserve Operational Context",
            "Deliver Engineering Evidence",
            "Request a Historical Evaluation",
            "See an Evidence Package",
            "Read-Only",
            "Outside the control path",
        ):
            self.assertIn(phrase, text)

        self.assertIn("Evidence Package preview", text)
        self.assertIn("An artifact produced by the analysis.", text)
        self.assertNotIn("concise Evidence Packages", text)

    def test_information_architecture_sections_exist(self):
        retained_home_sections = ("platform", "problem", "what", "evidence", "evaluation", "contact")
        for section_id in retained_home_sections:
            self.assertIn(f'id="{section_id}"', self.index)
        for removed_home_section in ("applications", "different", "maintenance", "security"):
            self.assertNotIn(f'id="{removed_home_section}"', self.index)

        navigation = re.search(r'<nav class="nav" id="main-navigation".*?</nav>', self.index, re.DOTALL).group(0)
        self.assertIn('href="technical.html"', navigation)
        self.assertIn('>Applications</a>', navigation)

        applications = (ROOT / "technical.html").read_text(encoding="utf-8")
        applications_text = self.normalized(applications)
        self.assertIn('id="applications"', applications)
        for phrase in (
            "Operational systems where relationships carry the signal.",
            "Resorts and casinos",
            "Commercial buildings and campuses",
            "Chilled-water and utility plants",
            "Water and pumping infrastructure",
            "Industrial facilities",
            "Cruise and maritime",
        ):
            self.assertIn(phrase, applications_text)

    def test_evidence_package_and_maintenance_view_are_complete(self):
        text = self.normalized(self.index)
        evidence = (ROOT / "evidence.html").read_text(encoding="utf-8")
        evidence_text = self.normalized(evidence)
        operator = (ROOT / "operator-brief.html").read_text(encoding="utf-8")
        operator_text = self.normalized(operator)

        for phrase in (
            "Evidence Package preview",
            "EP-CHW-017",
            "Pump power and delivered flow relationship weakened.",
            "System",
            "Supported Observation",
            "Limitation",
            "Telemetry cannot distinguish hydraulic restriction from pump-performance degradation.",
        ):
            self.assertIn(phrase, text)
        self.assertIn('href="evidence.html">View the Complete Evidence Package</a>', self.index)
        self.assertNotIn('id="maintenance"', self.index)
        self.assertNotIn('href="operator-brief.html">View Maintenance View</a>', self.index)

        for full_field in ("Earliest Supported", "Behavioral Finding", "Supporting Evidence", "Confidence notes", "Recommended Starting Point"):
            self.assertNotIn(full_field, text)
        for phrase in (
            "Earliest Supported",
            "Operating Context",
            "Supporting Evidence",
            "Confidence",
            "Evidence Limitations",
            "Recommended Starting Point",
        ):
            self.assertIn(phrase, evidence_text)
        for phrase in ("What we see", "What to check first", "What we do not know yet"):
            self.assertIn(phrase, operator_text)

    def test_security_boundaries_are_clearly_distinguished(self):
        text = self.normalized(self.index)
        security = (ROOT / "security.html").read_text(encoding="utf-8")
        security_text = self.normalized(security)
        for phrase in (
            "Historical Evaluation",
            "Start with historical data before live integration.",
            "stays read-only",
            "Outside the control path",
            "No live connection required",
        ):
            self.assertIn(phrase, text)
        self.assertIn('href="pilot.html">Explore Historical Evaluation</a>', self.index)
        self.assertIn('href="security.html">Review Security Model</a>', self.index)
        self.assertNotIn('architecture-flow', self.index)
        for phrase in (
            "Implemented",
            "Deployment-dependent",
            "Planned or assessed separately",
            "Not claimed",
            "Read-only operation, outside the control path",
            "does not claim SOC 2",
        ):
            self.assertIn(phrase, security_text)


    def test_homepage_reduction_regression_contract(self):
        text = self.normalized(self.index)
        expected_order = [
            'id="platform"',
            'id="problem"',
            'id="what"',
            'id="evidence"',
            'id="evaluation"',
            'id="contact"',
        ]
        positions = [self.index.index(marker) for marker in expected_order]
        self.assertEqual(positions, sorted(positions))
        self.assertNotIn('id="applications"', self.index)
        self.assertNotIn('id="different"', self.index)
        self.assertNotIn('id="maintenance"', self.index)
        self.assertNotIn('id="security"', self.index)
        current_words = len(text.split())
        maximum_words = int(HOMEPAGE_PRE_REDUCTION_WORD_COUNT * 0.60)
        reduction = 1 - (current_words / HOMEPAGE_PRE_REDUCTION_WORD_COUNT)
        diagnostic = (
            f"baseline={HOMEPAGE_PRE_REDUCTION_WORD_COUNT}; "
            f"current={current_words}; "
            f"reduction={reduction:.1%}; "
            f"maximum={maximum_words}"
        )
        self.assertLessEqual(
            current_words,
            maximum_words,
            (
                f"Homepage has {current_words} words; expected at most "
                f"{maximum_words} based on the "
                f"{HOMEPAGE_PRE_REDUCTION_WORD_COUNT}-word pre-reduction baseline. "
                f"{diagnostic}"
            ),
        )
        self.assertGreaterEqual(reduction, 0.40, diagnostic)
        for long_form_phrase in (
            "Resorts and casinos",
            "Commercial buildings and campuses",
            "Chilled-water and utility plants",
            "Water and pumping infrastructure",
            "Industrial facilities",
            "Cruise and maritime",
            "What we see",
            "What to check first",
            "What we do not know yet",
            "Earliest Supported",
            "Supporting Evidence",
            "Recommended Starting Point",
            "Implemented baseline",
            "Deployment-dependent controls",
            "Claims not made",
        ):
            self.assertNotIn(long_form_phrase, text)

    def test_primary_ctas_and_reduced_homepage_routes_remain_valid(self):
        for href, label in (
            ("contact.html", "Request a Historical Evaluation"),
            ("evidence.html", "See an Evidence Package"),
            ("evidence.html", "View the Complete Evidence Package"),
            ("pilot.html", "Explore Historical Evaluation"),
            ("security.html", "Review Security Model"),
        ):
            self.assertIn(f'href="{href}"', self.index, f"missing route for {label}")
            self.assertTrue((ROOT / href).exists(), f"missing target page for {label}")

    def test_mobile_typography_contract_remains_intact(self):
        self.assertRegex(self.styles, r"font-size:\s*clamp\(")
        self.assertRegex(self.styles, r"@media\s*\(max-width:\s*620px\)")
        self.assertIn("--h1: clamp", self.styles)
        self.assertIn(".lead", self.styles)

    def test_contact_form_fields_and_warning(self):
        contact = (ROOT / "contact.html").read_text(encoding="utf-8")
        for field_id in ("name", "organization", "role", "email", "facility", "data", "message"):
            self.assertIn(f'id="{field_id}"', contact)
        self.assertIn("Do not submit telemetry, credentials, security diagrams, or confidential operational information through this form.", contact)
        self.assertIn("One system is enough to begin.", contact)
        self.assertIn("Initial data-fit review within three business days.", contact)
        self.assertIn('data-netlify="true"', contact)
        self.assertNotIn('data-netlify="true"', self.index)

    def test_design_tokens_and_responsive_contract(self):
        for token in ("--bg", "--ink", "--muted", "--line", "--navy", "--steel", "--cyan", "--amber", "--success", "--unknown", "--evidence", "--space", "--radius", "--shadow"):
            self.assertIn(token, self.styles)
        self.assertRegex(self.styles, r"@media\s*\(max-width:\s*980px\)")
        self.assertIn("prefers-reduced-motion", self.styles)
        self.assertIn(".nav.open", self.styles)
        self.assertIn("Close navigation", self.scripts)

    def test_required_social_metadata_and_structured_data(self):
        for html_file in indexable_html_files():
            html = html_file.read_text(encoding="utf-8")
            with self.subTest(page=html_file.name):
                for marker in ('property="og:title"','property="og:description"','property="og:image"','property="og:url"','name="twitter:card"','name="ga4-measurement-id"','type="application/ld+json"'):
                    self.assertIn(marker, html)
                payload = json.loads(re.search(r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>', html, re.DOTALL).group(1))
                graph_types = {item.get("@type") for item in payload.get("@graph", [])}
                self.assertIn("Organization", graph_types)
                self.assertIn("WebSite", graph_types)
                self.assertIn("SoftwareApplication", graph_types)

    def test_no_disallowed_claims_or_em_dashes(self):
        changed_pages = "\n".join(path.read_text(encoding="utf-8") for path in site_html_files()).lower()
        for claim in ("ai-powered", "predictive failure", "predicts failures", "guarantees savings", "diagnoses root cause", "replaces engineers", "autonomously controls"):
            self.assertNotIn(claim, changed_pages)
        for source_file in [*site_html_files(), ROOT / "styles.css", ROOT / "scripts.js"]:
            self.assertNotIn("—", source_file.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()

class TestPerformanceOptimizations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = load_html(ROOT / "index.html")
        cls.index_html = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_home_hero_image_priority_and_dimensions(self):
        hero = next((img for img in self.index.imgs if img.get("src") == "/assets/images/pump-room.jpg"), None)
        self.assertIsNotNone(hero, "Homepage hero image is missing")
        self.assertNotEqual("lazy", hero.get("loading"), "LCP hero image must not be lazy loaded")
        self.assertEqual("high", hero.get("fetchpriority"))
        self.assertEqual("async", hero.get("decoding"))
        self.assertEqual("720", hero.get("width"))
        self.assertEqual("520", hero.get("height"))
        self.assertIn("srcset", hero)
        self.assertIn("sizes", hero)

    def test_below_fold_images_are_lazy_loaded_when_appropriate(self):
        eager_allowlist = {"/assets/images/pump-room.jpg", "/assets/images/neraium-logo-lockup.svg"}
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

    def test_stylesheet_loads_asynchronously_with_noscript_fallback(self):
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            self.assertRegex(html, r'<link rel="preload" href="styles\.css\?v=20260805d" as="style" onload=')
            self.assertRegex(html, r'<noscript>[\s\S]*<link rel="stylesheet" href="styles\.css\?v=20260805d">[\s\S]*</noscript>')

    def test_critical_css_is_small_and_homepage_only(self):
        match = re.search(r'<style id="critical-css">(.*?)</style>', self.index_html, re.DOTALL)
        self.assertIsNotNone(match, "Homepage critical CSS block is missing")
        self.assertLess(len(match.group(1).encode("utf-8")), 5000)

    def test_google_fonts_stylesheet_is_not_render_blocking(self):
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            head_before_noscript = html.split("<noscript>", 1)[0]
            self.assertNotRegex(head_before_noscript, r'<link rel="stylesheet" href="https://fonts\.googleapis\.com')
            self.assertIn('rel="preload" href="https://fonts.googleapis.com/css2?family=Inter', html)

    def test_font_weights_are_limited_to_used_weights(self):
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            self.assertIn('Inter:wght@400;500;600;700;800', html)
            self.assertIn('IBM+Plex+Mono:wght@400;500;600;700', html)
            self.assertNotIn('wght@100', html)

    def test_no_public_asset_exceeds_cloudflare_limit(self):
        for path in [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.parts and "node_modules" not in p.parts]:
            self.assertLessEqual(path.stat().st_size, 25 * 1024 * 1024, str(path.relative_to(ROOT)))


class TestImageDeploymentPipeline(unittest.TestCase):
    IMAGE_DIR = ROOT / "assets" / "images"
    DIST = ROOT / "dist"
    HERO_IMAGE = "/assets/images/pump-room.jpg"
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

    def test_hero_and_reuploaded_images_are_in_dist(self):
        self.assertIn(self.HERO_IMAGE, self.image_refs)
        self.assertTrue((self.DIST / self.HERO_IMAGE.lstrip("/")).is_file())
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
