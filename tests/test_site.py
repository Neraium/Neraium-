import json
import subprocess
import re
import unittest
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.neraium.com"


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

        if tag == "a":
            href = attrs_dict.get("href")
            if href:
                self.refs.append(LinkRef(self.source_file, "a", "href", href))

        if tag == "link":
            rel = (attrs_dict.get("rel") or "").lower()
            href = attrs_dict.get("href")
            if href and rel in ("stylesheet", "icon", "apple-touch-icon", "manifest", "canonical"):
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
        return " ".join(re.sub(r"<[^>]+>", " ", value).split())

    def test_core_positioning_and_ctas(self):
        text = self.normalized(self.index)
        for phrase in (
            "Systemic Infrastructure Intelligence",
            "Identify persistent changes across interconnected operational systems.",
            "concise Evidence Packages",
            "Request a Historical Evaluation",
            "See an Evidence Package",
            "Read-Only",
            "Outside the control path",
        ):
            self.assertIn(phrase, text)

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
            "Start with approved historical data before considering live integration.",
            "operates read-only",
            "Outside the control path",
            "No live connection required for the initial evaluation",
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
        original_words = len(self.normalized(subprocess.check_output(["git", "show", "HEAD:index.html"], cwd=ROOT, text=True)).split())
        current_words = len(text.split())
        self.assertLessEqual(current_words, original_words * 0.60)
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
