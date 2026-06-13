#!/usr/bin/env python3
"""
generate-sitemap.py — Phase 0 sitemap generator for Hawih.

Walks public *.html files in repo root and emits sitemap.xml with:
  - clean URLs (no .html)
  - <lastmod> from git author-date of the file's most recent commit
    (falls back to filesystem mtime if not in a git repo)
  - <changefreq> and <priority> by page tier

Phase 0: AR-only URLs. Phase 3 will extend this to walk en/ as well
and add the xhtml:link hreflang trio per <url> block.

Usage:
  python3 scripts/generate-sitemap.py            # write sitemap.xml
  python3 scripts/generate-sitemap.py --stdout   # print to stdout
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://hawih.com.sa"

EXCLUDE_FILES = {
    "use-cases.html",
    "theme-assets.html",
    "thank-you.html",
    "404.html",
}

# Page tiers — pattern → (priority, changefreq)
TIERS: list[tuple[str, float, str]] = [
    ("index.html",            1.0, "weekly"),
    ("services.html",         1.0, "weekly"),
    ("work.html",             1.0, "weekly"),
    ("about.html",            1.0, "monthly"),
    ("contact.html",          1.0, "monthly"),
    ("quality-guarantee.html",0.7, "monthly"),
    ("careers.html",          0.6, "monthly"),
    ("affiliate.html",        0.6, "monthly"),
    ("privacy-policy.html",   0.3, "yearly"),
    ("terms-conditions.html", 0.3, "yearly"),
]
SERVICE_PRIO = (0.9, "monthly")
WORK_PRIO = (0.8, "monthly")
DEFAULT_PRIO = (0.5, "monthly")


def clean_url(filename: str) -> str:
    if filename == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{filename[:-5]}"


def page_tier(filename: str) -> tuple[float, str]:
    for name, prio, freq in TIERS:
        if filename == name:
            return prio, freq
    if filename.startswith("service-"):
        return SERVICE_PRIO
    if filename.startswith("work-"):
        return WORK_PRIO
    return DEFAULT_PRIO


def git_lastmod(path: Path) -> str:
    """Return ISO-8601 date of last commit touching this file."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", path.name],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        if out:
            return out.split("T")[0]
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return mtime.strftime("%Y-%m-%d")


def iter_html() -> list[Path]:
    files = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir() or child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        files.append(child)
    return files


def build_xml(paths: list[Path]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for p in paths:
        loc = clean_url(p.name)
        prio, freq = page_tier(p.name)
        lastmod = git_lastmod(p)
        lines.extend([
            "  <url>",
            f"    <loc>{loc}</loc>",
            f"    <lastmod>{lastmod}</lastmod>",
            f"    <changefreq>{freq}</changefreq>",
            f"    <priority>{prio:.1f}</priority>",
            "  </url>",
        ])
    lines.append("</urlset>")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stdout", action="store_true",
                        help="print to stdout instead of writing sitemap.xml")
    args = parser.parse_args()

    paths = iter_html()
    xml = build_xml(paths)

    if args.stdout:
        sys.stdout.write(xml)
    else:
        out = REPO_ROOT / "sitemap.xml"
        out.write_text(xml, encoding="utf-8")
        print(f"Wrote {out} ({len(paths)} URLs)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
