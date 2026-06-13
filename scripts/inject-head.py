#!/usr/bin/env python3
"""
inject-head.py — Phase 0 SEO head injector for Hawih.

Walks every public *.html file in the repo root (excluding reference/,
use-cases.html, theme-assets.html, and the generated en/ tree) and
inserts a bracketed SEO meta block after the existing
"<!-- Facebook Metadata End -->" anchor.

The injected block carries:
  - <link rel="canonical">
  - <meta name="robots">
  - og:type, og:locale, og:locale:alternate, og:site_name
  - Twitter Cards (summary_large_image)

Idempotent: bracketed by <!-- HAWIH_SEO_HEAD_START --> /
<!-- HAWIH_SEO_HEAD_END -->. Re-running atomically replaces the block.

Usage:
  python3 scripts/inject-head.py            # walk and write
  python3 scripts/inject-head.py --check    # dry-run, exits 1 if any
                                              file would change
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://hawih.com.sa"
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}
EXCLUDE_DIRS = {"reference", "en", "scripts", "seo", "assets",
                "uc-assets", "api", "node_modules", ".git"}

START_ANCHOR = "<!-- HAWIH_SEO_HEAD_START -->"
END_ANCHOR = "<!-- HAWIH_SEO_HEAD_END -->"
FB_END_ANCHOR = "<!-- Facebook Metadata End -->"

# URL-aware FOUC language guard. Replaces the legacy localStorage-only
# version with one that derives lang from the URL (/en/* = en; / = ar).
# This is the only correct behaviour now that /en/ pages exist —
# trusting localStorage alone would flash AR styling on EN URLs.
FOUC_GUARD_BLOCK = """    <!-- FOUC guard: pick lang before paint -->
    <script>
      (function () {
        try {
          var p = location.pathname;
          var lang = (p === '/en' || p.indexOf('/en/') === 0) ? 'en' : 'ar';
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        } catch (e) {}
      })();
    </script>"""

# Legacy FOUC guard regex — matches the previous localStorage-based
# implementation so we can replace it idempotently.
LEGACY_FOUC_RE = re.compile(
    r"[ \t]*<!--\s*FOUC guard[^>]*-->\s*"
    r"<script>\s*\(function\s*\(\)\s*\{.*?\}\)\(\);\s*</script>",
    re.DOTALL,
)

ARTICLE_PREFIXES = ("service-", "work-")


def canonical_for(filename: str) -> str:
    """Map an HTML filename to its public clean URL."""
    if filename == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{filename[:-5]}"  # strip .html


def og_type_for(filename: str) -> str:
    if any(filename.startswith(p) for p in ARTICLE_PREFIXES):
        return "article"
    return "website"


def read_meta(content: str, attr: str, value: str) -> str | None:
    """Pull the content="..." value from a <meta {attr}="{value}"> tag."""
    pattern = (
        rf'<meta\s+(?:[^>]*\s)?{re.escape(attr)}\s*=\s*'
        rf'["\']{re.escape(value)}["\'][^>]*\scontent\s*=\s*'
        rf'["\']([^"\']*)["\']'
    )
    m = re.search(pattern, content, re.IGNORECASE)
    return m.group(1) if m else None


def get_title(content: str) -> str | None:
    m = re.search(r"<title>([^<]*)</title>", content, re.IGNORECASE)
    return m.group(1).strip() if m else None


def build_block(filename: str, content: str) -> str:
    canonical = canonical_for(filename)
    og_type = og_type_for(filename)

    og_title = read_meta(content, "property", "og:title") or get_title(content) or ""
    og_desc = read_meta(content, "property", "og:description") or \
        read_meta(content, "name", "description") or ""

    # Escape for HTML attribute context.
    og_title_e = html.escape(og_title, quote=True)
    og_desc_e = html.escape(og_desc, quote=True)

    return (
        f"    {START_ANCHOR}\n"
        f"    <!-- SEO: canonical, robots, OG completion, Twitter Cards -->\n"
        f'    <link rel="canonical" href="{canonical}">\n'
        f'    <meta name="robots" content="index,follow,max-image-preview:large">\n'
        f'    <meta property="og:type" content="{og_type}">\n'
        f'    <meta property="og:locale" content="ar_SA">\n'
        f'    <meta property="og:locale:alternate" content="en_US">\n'
        f'    <meta property="og:site_name" content="Hawih">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:site" content="@hawihcom">\n'
        f'    <meta name="twitter:title" content="{og_title_e}">\n'
        f'    <meta name="twitter:description" content="{og_desc_e}">\n'
        f'    <meta name="twitter:image" content="{SITE_ORIGIN}/assets/img/hawih-og.jpg">\n'
        f"    {END_ANCHOR}"
    )


def update_fouc_guard(content: str) -> str:
    """Idempotently replace the legacy FOUC guard with the URL-aware one."""
    if LEGACY_FOUC_RE.search(content):
        return LEGACY_FOUC_RE.sub(FOUC_GUARD_BLOCK, content, count=1)
    return content


def update_file(path: Path, check: bool) -> bool:
    """Return True if the file was (or would be) changed."""
    original = path.read_text(encoding="utf-8")
    new_block = build_block(path.name, original)

    # First normalize the FOUC guard (idempotent — no-op if already
    # the URL-aware version).
    working = update_fouc_guard(original)

    # If the bracketed block exists, replace it. Otherwise insert
    # immediately after the FB metadata anchor.
    if START_ANCHOR in working and END_ANCHOR in working:
        pattern = re.compile(
            rf"[ \t]*{re.escape(START_ANCHOR)}.*?{re.escape(END_ANCHOR)}",
            re.DOTALL,
        )
        updated = pattern.sub(new_block, working, count=1)
    elif FB_END_ANCHOR in working:
        updated = working.replace(
            FB_END_ANCHOR,
            f"{FB_END_ANCHOR}\n\n{new_block}",
            1,
        )
    else:
        print(f"  ! {path.name}: no FB anchor; skipped", file=sys.stderr)
        return False

    if updated == original:
        return False

    if not check:
        path.write_text(updated, encoding="utf-8")
    return True


def iter_html() -> list[Path]:
    files = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir():
            continue
        if child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        files.append(child)
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="dry-run; exit non-zero if anything would change")
    args = parser.parse_args()

    files = iter_html()
    changed = 0
    for path in files:
        if update_file(path, args.check):
            changed += 1
            print(f"  ~ {path.name}")
        else:
            print(f"  = {path.name}")

    print(f"\n{changed}/{len(files)} files {'would change' if args.check else 'updated'}.")
    if args.check and changed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
