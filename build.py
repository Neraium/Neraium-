#!/usr/bin/env python3
"""Assemble root HTML pages from _partials and _pages (single source for shell markup)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTIALS = ROOT / "_partials"
PAGES = ROOT / "_pages"

ORG_WEBPAGE_BASE = "https://www.neraium.com"


def _graph_org_and_site() -> list[dict]:
    return [
        {
            "@type": "Organization",
            "@id": f"{ORG_WEBPAGE_BASE}/#organization",
            "name": "Neraium",
            "url": ORG_WEBPAGE_BASE,
            "description": (
                "Systemic Infrastructure Intelligence for industrial systems. "
                "Read-only detection of structural change in multivariate telemetry before failures occur."
            ),
        },
        {
            "@type": "WebSite",
            "@id": f"{ORG_WEBPAGE_BASE}/#website",
            "url": ORG_WEBPAGE_BASE,
            "name": "Neraium",
            "publisher": {"@id": f"{ORG_WEBPAGE_BASE}/#organization"},
        },
    ]


PAGES_META: dict[str, dict[str, str]] = {
    "index": {
        "title": "Neraium | Systemic Infrastructure Intelligence",
        "meta_description": (
            "Read-only systemic infrastructure intelligence for industrial systems. "
            "Detects early structural change in multivariate telemetry before failures occur. "
            "For reliability and plant engineering."
        ),
        "og_title": "Neraium | Systemic Infrastructure Intelligence",
        "og_description": (
            "Read-only systemic infrastructure intelligence for industrial systems. "
            "Detects early structural change in multivariate telemetry before failures occur."
        ),
        "og_url": f"{ORG_WEBPAGE_BASE}/",
        "canonical_url": f"{ORG_WEBPAGE_BASE}/",
        "twitter_title": "Neraium",
        "twitter_description": (
            "Read-only systemic infrastructure intelligence for industrial systems. "
            "Detects early structural change in multivariate telemetry before failures occur."
        ),
        "ld_page_name": "",
        "nav": "home",
        "head_extra": (
            '  <link rel="manifest" href="site.webmanifest">\n'
            '  <link rel="preload" href="hero.png" as="image">'
        ),
    },
    "platform": {
        "title": "Neraium Platform | Systemic Infrastructure Intelligence",
        "meta_description": (
            "Neraium platform: read-only intelligence layer deployed alongside your stack. "
            "Analyzes plant telemetry for structural drift and early change. "
            "No control access, no operational disruption."
        ),
        "og_title": "Neraium Platform | Systemic Infrastructure Intelligence",
        "og_description": (
            "Read-only intelligence layer alongside your stack. "
            "Analyzes plant telemetry for structural drift and early change. No control access."
        ),
        "og_url": f"{ORG_WEBPAGE_BASE}/platform.html",
        "canonical_url": f"{ORG_WEBPAGE_BASE}/platform.html",
        "twitter_title": "Neraium Platform",
        "twitter_description": (
            "Read-only intelligence layer alongside your stack. "
            "Analyzes plant telemetry for structural drift and early change."
        ),
        "ld_page_name": "Platform",
        "nav": "platform",
        "head_extra": '  <link rel="manifest" href="site.webmanifest">',
    },
    "technical": {
        "title": "Neraium Technical | Systemic Infrastructure Intelligence",
        "meta_description": (
            "How Neraium detects structural change: relationship-based analysis across signals over time, "
            "not static thresholds. Technical basis for early warning in industrial telemetry."
        ),
        "og_title": "Neraium Technical | Systemic Infrastructure Intelligence",
        "og_description": (
            "Relationship-based detection across signals over time, not static thresholds. "
            "Technical basis for early warning in industrial telemetry."
        ),
        "og_url": f"{ORG_WEBPAGE_BASE}/technical.html",
        "canonical_url": f"{ORG_WEBPAGE_BASE}/technical.html",
        "twitter_title": "Neraium Technical",
        "twitter_description": (
            "Relationship-based detection across signals over time, not static thresholds. "
            "Technical basis for early warning."
        ),
        "ld_page_name": "Technical",
        "nav": "technical",
        "head_extra": '  <link rel="manifest" href="site.webmanifest">',
    },
    "governance": {
        "title": "Neraium Governance | Systemic Infrastructure Intelligence",
        "meta_description": (
            "Neraium governance: reviewable, bounded, and defensible findings for industrial infrastructure. "
            "Supports engineering judgment, audit, and institutional use."
        ),
        "og_title": "Neraium Governance | Systemic Infrastructure Intelligence",
        "og_description": (
            "Reviewable, bounded, defensible findings for industrial infrastructure. "
            "Supports engineering judgment and audit."
        ),
        "og_url": f"{ORG_WEBPAGE_BASE}/governance.html",
        "canonical_url": f"{ORG_WEBPAGE_BASE}/governance.html",
        "twitter_title": "Neraium Governance",
        "twitter_description": (
            "Reviewable, bounded, defensible findings for industrial infrastructure. "
            "Supports engineering judgment and audit."
        ),
        "ld_page_name": "Governance",
        "nav": "governance",
        "head_extra": '  <link rel="manifest" href="site.webmanifest">',
    },
    "contact": {
        "title": "Contact Neraium | Systemic Infrastructure Intelligence",
        "meta_description": "Contact Neraium for product and technical briefings. Direct access, no sales process.",
        "og_title": "Contact Neraium | Systemic Infrastructure Intelligence",
        "og_description": "Contact Neraium for product and technical briefings. Direct access, no sales process.",
        "og_url": f"{ORG_WEBPAGE_BASE}/contact.html",
        "canonical_url": f"{ORG_WEBPAGE_BASE}/contact.html",
        "twitter_title": "Contact Neraium",
        "twitter_description": "Product and technical briefings. Direct access, no sales process.",
        "ld_page_name": "Contact",
        "nav": "contact",
        "head_extra": '  <link rel="manifest" href="site.webmanifest">',
    },
}


def ld_json_for_slug(slug: str) -> str:
    graph = _graph_org_and_site()
    if slug != "index":
        meta = PAGES_META[slug]
        filename = f"{slug}.html"
        url = f"{ORG_WEBPAGE_BASE}/{filename}"
        graph.append(
            {
                "@type": "WebPage",
                "@id": f"{url}#webpage",
                "url": url,
                "name": meta["ld_page_name"],
                "isPartOf": {"@id": f"{ORG_WEBPAGE_BASE}/#website"},
                "about": {"@id": f"{ORG_WEBPAGE_BASE}/#organization"},
            }
        )
    payload = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def nav_placeholders(active: str) -> dict[str, str]:
    keys = ("home", "platform", "technical", "governance", "contact")
    return {f"NAV_ACTIVE_{k.upper()}": " active" if k == active else "" for k in keys}


def assemble_page(slug: str) -> str:
    meta = PAGES_META[slug]
    head_tpl = (PARTIALS / "head.html").read_text(encoding="utf-8")
    header_tpl = (PARTIALS / "header.html").read_text(encoding="utf-8")
    footer_tpl = (PARTIALS / "footer.html").read_text(encoding="utf-8")
    body = (PAGES / f"{slug}.html").read_text(encoding="utf-8")

    ld = ld_json_for_slug(slug)

    head_placeholders = {
        "TITLE": "title",
        "META_DESCRIPTION": "meta_description",
        "OG_TITLE": "og_title",
        "OG_DESCRIPTION": "og_description",
        "OG_URL": "og_url",
        "CANONICAL_URL": "canonical_url",
        "TWITTER_TITLE": "twitter_title",
        "TWITTER_DESCRIPTION": "twitter_description",
    }
    head_filled = head_tpl
    for ph, mkey in head_placeholders.items():
        head_filled = head_filled.replace("{{" + ph + "}}", meta[mkey])

    head_extra = meta.get("head_extra") or ""
    head_filled = head_filled.replace("{{HEAD_EXTRA}}\n", head_extra + ("\n" if head_extra else ""))
    head_filled = head_filled.replace("{{LD_JSON}}", ld)

    nav = nav_placeholders(meta["nav"])
    header_filled = header_tpl
    for k, v in nav.items():
        header_filled = header_filled.replace("{{" + k + "}}", v)

    # Strip accidental leading blank line from content files
    body = body.lstrip("\n")

    return head_filled + header_filled + body + footer_tpl


def main() -> None:
    for slug in PAGES_META:
        out_name = "index.html" if slug == "index" else f"{slug}.html"
        out = ROOT / out_name
        html = assemble_page(slug)
        out.write_text(html, encoding="utf-8", newline="\n")
        print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
