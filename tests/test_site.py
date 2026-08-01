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
        self.canonical_links: list[str] = []
        self.robots_directives: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = {k: v for k, v in attrs if k}
        if "id" in attrs_dict and attrs_dict["id"]:
            self.ids.add(attrs_dict["id"])

        if tag == "title":
            self._in_title = True

        if tag == "meta":
            name = (attrs_dict.get("name") or "").lower()
            content = (attrs_dict.get("content") or "").strip()
            if name == "description" and content:
                self.meta_descriptions.append(content)
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


class TestPositioningAndExperience(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.platform = (ROOT / "platform.html").read_text(encoding="utf-8")
        cls.styles = (ROOT / "styles.css").read_text(encoding="utf-8")
        cls.scripts = (ROOT / "scripts.js").read_text(encoding="utf-8")

    @staticmethod
    def normalized(value: str) -> str:
        return " ".join(re.sub(r"<[^>]+>", " ", value).split())

    def assert_link(self, html: str, label: str, href: str):
        pattern = rf'<a\b[^>]*href=["\']{re.escape(href)}["\'][^>]*>\s*{re.escape(label)}\s*</a>'
        self.assertRegex(html, pattern, f"Expected link '{label}' to point to '{href}'")

    def test_homepage_hero_positioning_and_ctas(self):
        text = self.normalized(self.index)
        self.assertIn("Systemic infrastructure intelligence", text)
        self.assertIn("See when a chilled-water system stops behaving like itself.", text)
        self.assertIn(
            "Neraium learns the operating relationships between flow, pressure, demand, "
            "temperature, valve response, and equipment behavior.",
            text,
        )
        self.assert_link(self.index, "Request a Pilot Review", "contact.html")
        self.assert_link(self.index, "See an Example Finding", "#example-finding")

    def test_homepage_answers_required_product_questions(self):
        text = self.normalized(self.index)
        required_phrases = (
            "chilled-water system",
            "persistent changes",
            "evidence engineers can investigate",
            "Read-only",
            "Uses existing operational data",
            "Human-reviewed findings",
            "Evaluate Neraium using one real system",
        )
        for phrase in required_phrases:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, text)

    def test_example_finding_is_complete_and_clearly_labeled(self):
        text = self.normalized(self.index)
        self.assertIn('id="example-finding"', self.index)
        self.assertIn('id="relationship-evidence"', self.index)
        required_finding_copy = (
            "Simulated validation example",
            "not a customer result",
            "Pump demand no longer matches expected flow response",
            "139.9 hours",
            "16 changes",
            "Persistence result",
            "Post-repair result",
            "View Evidence",
        )
        for phrase in required_finding_copy:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, text)
        self.assert_link(self.index, "View Evidence", "sample-finding-pack.pdf")

    def test_read_only_and_human_review_boundaries(self):
        for page_name, html in (("index.html", self.index), ("platform.html", self.platform)):
            text = self.normalized(html).lower()
            with self.subTest(page=page_name):
                self.assertIn("read-only", text)
                self.assertIn("never controls equipment", text)
                self.assertIn("engineers remain in control", text)

    def test_platform_covers_core_technical_concepts(self):
        text = self.normalized(self.platform)
        required_concepts = (
            "Architecture and data flow",
            "Relationship analysis",
            "Persistence testing",
            "Operational-mode awareness",
            "Data quality is kept separate from physical behavior",
            "Historical assessment",
            "Live monitoring",
            "Human in the loop",
        )
        for phrase in required_concepts:
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, text)

    def test_homepage_section_order(self):
        section_ids = (
            "what-neraium-detects",
            "example-finding",
            "how-it-works",
            "engineering-trust",
            "pilot-process",
        )
        positions = [self.index.index(f'id="{section_id}"') for section_id in section_ids]
        self.assertEqual(positions, sorted(positions))

    def test_required_social_metadata_and_structured_data(self):
        for page_name, html in (("index.html", self.index), ("platform.html", self.platform)):
            with self.subTest(page=page_name):
                for marker in (
                    'property="og:title"',
                    'property="og:description"',
                    'property="og:image"',
                    'property="og:url"',
                    'name="twitter:card"',
                    'name="ga4-measurement-id"',
                    'type="application/ld+json"',
                ):
                    self.assertIn(marker, html)

                match = re.search(
                    r'<script\s+type=["\']application/ld\+json["\']>(.*?)</script>',
                    html,
                    re.DOTALL,
                )
                self.assertIsNotNone(match, f"{page_name} is missing JSON-LD")
                payload = json.loads(match.group(1))
                self.assertEqual(payload.get("@context"), "https://schema.org")
                graph_types = {item.get("@type") for item in payload.get("@graph", [])}
                self.assertIn("Organization", graph_types)
                self.assertIn("WebPage", graph_types)

    def test_responsive_navigation_contract(self):
        for page_name, html in (("index.html", self.index), ("platform.html", self.platform)):
            with self.subTest(page=page_name):
                self.assertIn('id="main-navigation"', html)
                self.assertRegex(
                    html,
                    r'<button\b[^>]*class=["\'][^"\']*nav-toggle[^"\']*["\'][^>]*'
                    r'aria-controls=["\']main-navigation["\'][^>]*aria-expanded=["\']false["\']',
                )
        self.assertIn("@media (max-width: 980px)", self.styles)
        self.assertIn(".nav.open", self.styles)
        self.assertIn("window.innerWidth > 980", self.scripts)
        self.assertIn('"Close navigation" : "Open navigation"', self.scripts)

    def test_accessibility_landmarks_and_heading_basics(self):
        for page_name, html in (("index.html", self.index), ("platform.html", self.platform)):
            with self.subTest(page=page_name):
                self.assertEqual(len(re.findall(r"<main\b", html)), 1)
                self.assertEqual(len(re.findall(r"<h1\b", html)), 1)
                self.assertIn('class="skip-link" href="#main"', html)
                self.assertIn('aria-label="Main navigation"', html)
                self.assertIn('aria-label="Footer navigation"', html)

    def test_no_disallowed_claims_were_introduced(self):
        changed_pages = f"{self.index}\n{self.platform}".lower()
        disallowed = (
            "predicts failures",
            "prevents failures",
            "diagnoses root cause",
            "guarantees early warning",
            "replaces engineers",
            "autonomously controls",
        )
        for claim in disallowed:
            with self.subTest(claim=claim):
                self.assertNotIn(claim, changed_pages)


if __name__ == "__main__":
    unittest.main()
