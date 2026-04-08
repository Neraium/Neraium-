import os
import re
import unittest
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]


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

    def handle_starttag(self, tag, attrs):
        attrs_dict = {k: v for k, v in attrs if k}
        if "id" in attrs_dict and attrs_dict["id"]:
            self.ids.add(attrs_dict["id"])

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

        if tag == "script":
            src = attrs_dict.get("src")
            if src:
                self.refs.append(LinkRef(self.source_file, "script", "src", src))


def load_html(file_path: Path) -> SiteParser:
    parser = SiteParser(file_path)
    parser.feed(file_path.read_text(encoding="utf-8"))
    return parser


def site_html_files() -> list[Path]:
    return sorted([p for p in ROOT.glob("*.html") if p.is_file()])


def resolve_site_path(raw_path: str) -> Path:
    # Site is flat at repo root; allow leading slash.
    path = raw_path.lstrip("/")
    return (ROOT / path).resolve()


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


if __name__ == "__main__":
    unittest.main()
