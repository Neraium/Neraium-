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
HOMEPAGE_MAX_WORD_COUNT = 525
PAGE_MAX_WORD_COUNTS = {
    "platform.html": 330,
    "methodology.html": 440,
    "evidence.html": 335,
    "technical.html": 335,
    "security.html": 300,
    "pilot.html": 315,
    "operator-brief.html": 325,
    "company.html": 260,
    "contact.html": 270,
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


OFFICIAL_LOGO = "/assets/images/neraium-logo-lockup.svg"


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
        expected = [('/platform','Platform'),('/methodology','Methodology'),('/evidence','Evidence'),('/technical','Applications'),('/security','Security'),('/pilot','Evaluation'),('/company','Company')]
        for html_file in site_html_files():
            html = html_file.read_text(encoding='utf-8')
            for href, label in expected:
                self.assertIn(f'href="{href}"', html, f"{html_file.name} missing {label} route")
            self.assertNotIn('>How It Works</a>', html)
            self.assertNotIn('>Contact</a></nav><a class="header-action"', html)
        self.assertTrue((ROOT / 'evidence.html').exists())
        self.assertTrue((ROOT / 'company.html').exists())

    def test_public_headers_use_official_white_logo_lockup(self):
        expected_img = f'<img src="{OFFICIAL_LOGO}" width="1146" height="833" alt="Neraium logo" class="brand-lockup">'
        errors = []
        for html_file in site_html_files():
            html = html_file.read_text(encoding="utf-8")
            header_match = re.search(r"<header class=\"site-header\">.*?</header>", html, re.DOTALL)
            if not header_match:
                errors.append(f"{html_file.name}: missing site header")
                continue
            header = header_match.group(0)
            if expected_img not in header:
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
        for phrase in (
            "Systemic Infrastructure Intelligence",
            "Know when the system stops behaving like itself.",
            "learns the operating behavior of interconnected infrastructure",
            "even when individual measurements remain within limits",
            "Built first for central plants, pumping systems, water systems",
            "Establish operating behavior",
            "Learn relationships and context",
            "Identify persistent systemic change",
            "Preserve evidence for engineering review",
            "bounded review question",
            "Request an Evaluation",
            "Read-only",
            "Outside the control path",
            "No setpoint changes",
            "Human review authoritative",
        ):
            self.assertIn(phrase, text)

        product_flow = re.search(r'<ol class="product-flow">(.*?)</ol>', self.index, re.DOTALL)
        self.assertIsNotNone(product_flow)
        self.assertEqual(product_flow.group(1).count("<li>"), 4)
        self.assertIn('href="/methodology">Explore the methodology</a>', self.index)

        methodology = (ROOT / "methodology.html").read_text(encoding="utf-8")
        method_flow = re.search(r'<ol class="method-steps">(.*?)</ol>', methodology, re.DOTALL)
        self.assertIsNotNone(method_flow)
        self.assertEqual(method_flow.group(1).count("<li>"), 7)
        self.assertIn("Known transient or abnormal operating periods do not automatically become the new normal.", methodology)
    def test_information_architecture_sections_exist(self):
        expected_home_sections = (
            "platform",
            "problem",
            "how-it-works",
            "evidence",
            "evaluation",
        )
        for section_id in expected_home_sections:
            self.assertIn(f'id="{section_id}"', self.index)
        positions = [self.index.index(f'id="{section_id}"') for section_id in expected_home_sections]
        self.assertEqual(positions, sorted(positions))

        navigation = re.search(r'<nav class="nav" id="main-navigation".*?</nav>', self.index, re.DOTALL).group(0)
        for href, label in (
            ("/platform", "Platform"),
            ("/methodology", "Methodology"),
            ("/evidence", "Evidence"),
            ("/technical", "Applications"),
            ("/security", "Security"),
            ("/pilot", "Evaluation"),
            ("/company", "Company"),
        ):
            self.assertIn(f'href="{href}"', navigation)
            self.assertIn(f'>{label}</a>', navigation)

        applications = self.normalized((ROOT / "technical.html").read_text(encoding="utf-8"))
        for phrase in (
            "Built first for interconnected facility infrastructure.",
            "The initial focus is central plants, pumping systems, water systems",
            "Central plants and chilled-water systems",
            "Pumping and water systems",
            "Resort and large-facility infrastructure",
            "Other bounded facility systems",
            "Fit is established, not assumed.",
            "A persistent-behavior question",
        ):
            self.assertIn(phrase, applications)
        self.assertNotIn("Application boundary", applications)
    def test_evidence_package_and_maintenance_view_are_complete(self):
        homepage = self.normalized(self.index)
        evidence_text = self.normalized((ROOT / "evidence.html").read_text(encoding="utf-8"))
        operator_text = self.normalized((ROOT / "operator-brief.html").read_text(encoding="utf-8"))

        for phrase in (
            "EP-CHW-017",
            "Pump power increased relative to delivered flow across comparable operating periods.",
            "Power-to-flow behavior remained changed at similar load and operating mode.",
            "Telemetry alone cannot distinguish hydraulic restriction from pump-performance degradation.",
        ):
            self.assertIn(phrase, homepage)
        self.assertIn('href="/evidence">Review the illustrative finding</a>', self.index)
        for deferred_field in ("Threshold status", "Provenance", "Review state"):
            self.assertNotIn(f"<dt>{deferred_field}</dt>", self.index)

        for phrase in (
            "Each finding shows what changed, what supports it, and what the available evidence cannot prove.",
            "Not customer data. Not a customer case study. Not a root-cause diagnosis.",
            "What changed",
            "Power-to-flow behavior shifted persistently across comparable operating periods.",
            "Compared against",
            "Similar load, operating mode, commanded speed, and pressure target.",
            "Supporting evidence",
            "Power-to-flow and differential-pressure-to-flow relationships.",
            "What Neraium cannot prove",
            "Engineering reviews the evidence and determines whether further analysis or a field check is warranted.",
            "Insufficient evidence is explicit, not hidden.",
            "The available telemetry does not support a defensible conclusion.",
            "Insufficient evidence does not mean the physical system remained unchanged.",
            "Refine the question or provide additional approved context.",
        ):
            self.assertIn(phrase, evidence_text)
        for misleading_or_redundant_phrase in (
            "No meaningful persistent change is supported by the available telemetry.",
            "What remains uncertain",
            "Power-to-flow behavior remained changed across comparable operating periods.",
        ):
            self.assertNotIn(misleading_or_redundant_phrase, evidence_text)
        for phrase in (
            "What does Neraium watch?",
            "What does a finding mean?",
            "What does it not mean?",
            "What should an operator do with it?",
            "What remains under human judgment?",
            "What comes with a finding",
            "Affected system",
            "Strongest supporting relationships",
            "Known limitations",
        ):
            self.assertIn(phrase, operator_text)
    def test_security_boundaries_are_clearly_distinguished(self):
        homepage = self.normalized(self.index)
        platform_text = self.normalized((ROOT / "platform.html").read_text(encoding="utf-8"))
        security_text = self.normalized((ROOT / "security.html").read_text(encoding="utf-8"))

        for phrase in (
            "No setpoint changes",
            "Human review authoritative",
            "Begin with one bounded system and no live connection.",
        ):
            self.assertIn(phrase, homepage)
        for phrase in (
            "Read-only. Outside the control path.",
            "complements BAS, SCADA, historians, alarms, operators, engineers, and maintenance teams",
            "No autonomous commands",
        ):
            self.assertIn(phrase, platform_text)
        for phrase in (
            "Read-only by design. Explicit at every boundary.",
            "No control path returns.",
            "Least privilege",
            "Customer-approved scope",
            "Documented for the selected environment.",
            "does not claim certifications, assessments, integrations, or controls",
        ):
            self.assertIn(phrase, security_text)
        for defensive_list_item in ("No SOC 2 claim", "No ISO 27001 claim", "No FedRAMP claim"):
            self.assertNotIn(defensive_list_item, security_text)
    def test_homepage_reduction_regression_contract(self):
        text = self.normalized(self.index)
        expected_order = [
            'id="platform"',
            'id="problem"',
            'id="how-it-works"',
            'id="evidence"',
            'id="evaluation"',
        ]
        positions = [self.index.index(marker) for marker in expected_order]
        self.assertEqual(positions, sorted(positions))
        self.assertNotIn('id="baseline"', self.index)
        self.assertNotIn('id="operating-stack"', self.index)
        current_words = len(text.split())
        self.assertLessEqual(
            current_words,
            HOMEPAGE_MAX_WORD_COUNT,
            f"Homepage has {current_words} words; expected at most {HOMEPAGE_MAX_WORD_COUNT}.",
        )
        for prohibited_phrase in (
            "predictive maintenance",
            "AI copilot",
            "digital twin",
            "root-cause engine",
            "autonomous diagnosis",
        ):
            self.assertNotIn(prohibited_phrase, text.lower())
    def test_primary_ctas_and_reduced_homepage_routes_remain_valid(self):
        for href, label in (
            ("/contact", "Request an Evaluation"),
            ("/methodology", "See how it works"),
            ("/evidence", "Review the illustrative finding"),
            ("/pilot", "Review the evaluation process"),
        ):
            self.assertIn(f'href="{href}"', self.index, f"missing route for {label}")
            self.assertTrue(resolve_site_path(href).exists(), f"missing target page for {label}")
    def test_page_roles_remain_compressed_and_distinct(self):
        for filename, maximum in PAGE_MAX_WORD_COUNTS.items():
            text = self.normalized((ROOT / filename).read_text(encoding="utf-8"))
            self.assertLessEqual(len(text.split()), maximum, f"{filename} exceeds {maximum} visible words")

        platform = self.normalized((ROOT / "platform.html").read_text(encoding="utf-8"))
        for phrase in ("Operating reference", "Relationship and context intelligence", "Persistent-change analysis", "Evidence-backed findings"):
            self.assertIn(phrase, platform)

        evaluation = self.normalized((ROOT / "pilot.html").read_text(encoding="utf-8"))
        for phrase in ("Define the review question", "Scope available telemetry", "Establish a usable operating reference", "Evaluate persistent change", "Review the outcome"):
            self.assertIn(phrase, evaluation)
        self.assertNotIn("Before transfer", evaluation)

        company = (ROOT / "company.html").read_text(encoding="utf-8")
        self.assertIn('id="founder"', company)
        self.assertIn('width="1320" height="1298"', company)
        self.assertIn('class="founder-links"', company)
        self.assertIn('aria-label="Craig Curtis on LinkedIn"', company)
        self.assertIn('href="mailto:craig@neraium.com"', company)
    def test_mobile_typography_contract_remains_intact(self):
        self.assertRegex(self.styles, r"font-size:\s*clamp\(")
        self.assertRegex(self.styles, r"@media\s*\(max-width:\s*560px\)")
        self.assertIn("h1 {", self.styles)
        self.assertIn(".lead", self.styles)
    def test_contact_form_fields_and_warning(self):
        contact = (ROOT / "contact.html").read_text(encoding="utf-8")
        for field_id in ("name", "email", "organization", "facility", "review-question", "role", "preferred-contact", "data"):
            self.assertIn(f'id="{field_id}"', contact)
        for required_id in ("name", "email", "organization", "facility", "review-question"):
            self.assertRegex(contact, rf'id="{required_id}"[^>]*required')
        for optional_id in ("role", "preferred-contact", "data"):
            field = re.search(rf'<(?:input|select|textarea)[^>]*id="{optional_id}"[^>]*>', contact)
            self.assertIsNotNone(field)
            self.assertNotIn("required", field.group(0))
        self.assertIn(
            "Do not submit operational data, credentials, telemetry exports, facility diagrams, network information, or sensitive system details through this public form.",
            contact,
        )
        self.assertIn("customer-approved transfer method", contact)
        self.assertIn("does not upload or submit these details to the website", contact)
        self.assertIn('action="mailto:craig@neraium.com"', contact)
        self.assertIn('data-loading-label=', contact)
        self.assertNotIn('data-netlify="true"', contact)
        self.assertNotIn("business day", contact.lower())
    def test_design_tokens_and_responsive_contract(self):
        for token in (
            "--bg",
            "--bg-deep",
            "--surface",
            "--surface-raised",
            "--surface-teal",
            "--teal",
            "--teal-bright",
            "--cyan",
            "--ink",
            "--muted",
            "--line",
            "--success",
            "--caution",
            "--danger",
            "--section",
            "--radius",
            "--shadow",
        ):
            self.assertIn(token, self.styles)
        for width in ("1120px", "900px", "760px", "560px"):
            self.assertIn(f"@media (max-width: {width})", self.styles)
        self.assertIn("prefers-reduced-motion", self.styles)
        self.assertIn(".nav.open", self.styles)
        self.assertIn(".nav-contact", self.styles)
        self.assertIn("@media print", self.styles)
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
                self.assertIn("SoftwareApplication", graph_types)

    def test_no_disallowed_claims_or_em_dashes(self):
        changed_pages = "\n".join(path.read_text(encoding="utf-8") for path in site_html_files()).lower()
        for claim in ("ai-powered", "predictive failure", "predicts failures", "guarantees savings", "diagnoses root cause", "replaces engineers", "autonomously controls"):
            self.assertNotIn(claim, changed_pages)
        for source_file in [*site_html_files(), ROOT / "styles.css", ROOT / "scripts.js"]:
            self.assertNotIn("", source_file.read_text(encoding="utf-8"))


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
            "/application.html /technical 301",
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
        self.assertIn("Canonical: https://www.neraium.com/.well-known/security.txt", security_txt)

    def test_custom_404_uses_root_assets_without_a_false_canonical(self):
        not_found = (ROOT / "404.html").read_text(encoding="utf-8")
        self.assertIn('name="robots" content="noindex"', not_found)
        self.assertNotIn('rel="canonical"', not_found)
        for asset in ('/styles.css?v=20260811a', '/scripts.js?v=20260811a', '/site.webmanifest'):
            self.assertIn(asset, not_found)
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

    def test_home_hero_prioritizes_structured_proof_over_decorative_media(self):
        self.assertIn('class="behavior-visual"', self.index_html)
        self.assertIn('aria-labelledby="behavior-visual-title behavior-visual-caption"', self.index_html)
        self.assertIn("Power relative to delivered flow", self.index_html)
        self.assertIn("Inside limit", self.index_html)
        self.assertIn("Persistent departure", self.index_html)
        self.assertIn("Illustrative technical representation, not customer data.", self.index_html)
        self.assertNotIn('class="hero-visual product-hero"', self.index_html)
    def test_below_fold_images_are_lazy_loaded_when_appropriate(self):
        eager_allowlist = {"/assets/images/neraium-logo-lockup.svg"}
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
            self.assertIn('<link rel="stylesheet" href="/styles.css?v=20260811a">', html)
            self.assertIn('<script src="/scripts.js?v=20260811a" defer></script>', html)
            self.assertIn('<link rel="manifest" href="/site.webmanifest">', html)
            self.assertNotIn("onload=", html)
    def test_above_fold_media_is_not_deferred(self):
        for filename in ("platform.html", "evidence.html", "technical.html", "pilot.html"):
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
        self.assertIn('"Segoe UI"', (ROOT / "styles.css").read_text(encoding="utf-8"))

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
            self.assertEqual("neraium-logo-lockup.svg", logo.name)
            self.assertRegex(logo.name, r"^[a-z0-9][a-z0-9.-]*\.svg$")
            data = logo.read_text(encoding="utf-8")
            self.assertTrue(data.lstrip().startswith("<svg"))

    def test_every_visible_logo_has_required_alt_text(self):
        for html_file in site_html_files():
            logos = [
                img for img in load_html(html_file).imgs
                if (img.get("src") or "").strip() == OFFICIAL_LOGO
            ]
            self.assertEqual(1, len(logos), html_file.name)
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
