#!/usr/bin/env python3
"""
optimize-perf.py — Phase 4 performance optimisations for Hawih.

Two reversible mechanical wins (idempotent):

  1. Remove Three.js script tag from every page except index.html.
     Three.js is ~150KB and only the index hero WebGL shader uses it.
     Loading it on the other 42 pages wastes ~6MB of cumulative
     bandwidth per visitor session and blocks the LCP unnecessarily.

  2. Add width/height attributes to <img> tags whose filename embeds
     dimensions (pattern `WIDTHxHEIGHT_…`). Fixes CLS for those imgs.

NOT done (intentionally reverted): adding `defer` to the Tailwind CDN
or Three.js scripts. The Tailwind CDN JIT was designed to inject
styles synchronously during DOM parsing; deferring it means the
GSAP ScrollTrigger (which runs at end-of-body) computes pin
positions against a layout that has not yet had Tailwind classes
applied — visible as scroll jitter on the home-page service-stack
cards. The bandwidth saving wasn't worth the visible regression.

Usage:
  python3 scripts/optimize-perf.py            # walk and write
  python3 scripts/optimize-perf.py --check    # dry-run
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

TAILWIND_CDN = "https://cdn.tailwindcss.com"
THREEJS_CDN_RE = re.compile(
    r"[ \t]*<script\s+src=\"https://cdnjs\.cloudflare\.com"
    r"/ajax/libs/three\.js/[^\"]+\"\s*></script>\n?",
    re.IGNORECASE,
)
TAILWIND_SCRIPT_RE = re.compile(
    r'<script\b[^>]*\bsrc="' + re.escape(TAILWIND_CDN) + r'"[^>]*></script>',
    re.IGNORECASE,
)
THREEJS_SCRIPT_RE = re.compile(
    r'<script\b[^>]*\bsrc="https://cdnjs\.cloudflare\.com'
    r'/ajax/libs/three\.js/[^"]+"[^>]*></script>',
    re.IGNORECASE,
)

# Image filename pattern: optionally a prefix, then `WIDTHxHEIGHT_` or
# `WIDTHxHEIGHT.`, e.g. "1000x1000_ser-01.webp", "800x800.webp".
IMG_DIM_FILENAME_RE = re.compile(
    r'/(\d{2,4})x(\d{2,4})[_.]', re.IGNORECASE,
)
IMG_TAG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)
HAS_WIDTH_RE = re.compile(r'\bwidth\s*=', re.IGNORECASE)
HAS_HEIGHT_RE = re.compile(r'\bheight\s*=', re.IGNORECASE)
SRC_RE = re.compile(r'\bsrc\s*=\s*"([^"]+)"', re.IGNORECASE)


def remove_threejs_if_not_index(content: str, filename: str) -> tuple[str, int]:
    """Strip the Three.js CDN script tag from non-index pages."""
    if filename == "index.html":
        return content, 0
    new_content, n = THREEJS_CDN_RE.subn("", content)
    return new_content, n


def strip_defer(content: str, pattern: re.Pattern) -> tuple[str, int]:
    """Remove `defer` from a <script src="..."> tag if present.
    Tailwind CDN and Three.js need to run synchronously so GSAP
    ScrollTrigger sees the final layout when it computes pin
    positions at end-of-body."""
    count = 0

    def remove_defer(match: re.Match) -> str:
        nonlocal count
        tag = match.group(0)
        if not re.search(r"\bdefer\b", tag, re.IGNORECASE):
            return tag
        count += 1
        new_tag = re.sub(r"\s+defer\b", "", tag, flags=re.IGNORECASE)
        new_tag = re.sub(r"<script\s+defer\s+", "<script ", new_tag,
                         flags=re.IGNORECASE)
        return new_tag

    new_content = pattern.sub(remove_defer, content)
    return new_content, count


def add_img_dimensions(content: str) -> tuple[str, int]:
    """Add width/height attrs to <img> tags where filename has dims."""
    count = 0

    def replace(match: re.Match) -> str:
        nonlocal count
        attrs = match.group(1)
        if HAS_WIDTH_RE.search(attrs) or HAS_HEIGHT_RE.search(attrs):
            return match.group(0)
        src_match = SRC_RE.search(attrs)
        if not src_match:
            return match.group(0)
        src = src_match.group(1)
        dim_match = IMG_DIM_FILENAME_RE.search(src)
        if not dim_match:
            return match.group(0)
        w, h = dim_match.group(1), dim_match.group(2)
        count += 1
        # Insert width/height as the first attrs for grep-ability.
        return f'<img width="{w}" height="{h}"{attrs}>'

    return IMG_TAG_RE.sub(replace, content), count


def process_file(path: Path, check: bool) -> dict:
    original = path.read_text(encoding="utf-8")
    content = original

    content, n_three_removed = remove_threejs_if_not_index(content, path.name)
    content, n_tw_defer = strip_defer(content, TAILWIND_SCRIPT_RE)
    content, n_three_defer = strip_defer(content, THREEJS_SCRIPT_RE)
    content, n_dims = add_img_dimensions(content)

    changed = content != original
    if changed and not check:
        path.write_text(content, encoding="utf-8")
    return {
        "changed": changed,
        "three_removed": n_three_removed,
        "tw_defer_stripped": n_tw_defer,
        "three_defer_stripped": n_three_defer,
        "dims": n_dims,
    }


def iter_html() -> list[Path]:
    files = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir() or child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        files.append(child)
    en_dir = REPO_ROOT / "en"
    if en_dir.is_dir():
        for child in sorted(en_dir.iterdir()):
            if child.suffix == ".html" and child.name not in EXCLUDE_FILES:
                files.append(child)
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    files = iter_html()
    totals = {"changed": 0, "three_removed": 0, "tw_defer_stripped": 0,
              "three_defer_stripped": 0, "dims": 0}
    for path in files:
        r = process_file(path, args.check)
        for k in totals:
            totals[k] += (1 if k == "changed" and r["changed"] else
                          (r[k] if k != "changed" else 0))
    verb = "would change" if args.check else "updated"
    print(f"{totals['changed']}/{len(files)} files {verb}.")
    print(f"  Three.js tags removed:           {totals['three_removed']}")
    print(f"  Tailwind defer stripped:         {totals['tw_defer_stripped']}")
    print(f"  Three.js defer stripped:         {totals['three_defer_stripped']}")
    print(f"  Img dimensions added:            {totals['dims']}")
    if args.check and totals["changed"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
