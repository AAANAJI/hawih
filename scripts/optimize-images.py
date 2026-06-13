#!/usr/bin/env python3
"""
optimize-images.py — Phase 0 image attribute optimizer for Hawih.

Adds `loading="lazy" decoding="async"` to every <img> on every public
page, except images that are clearly above the fold (template logo
swap pair, which appears in the very first viewport of every page).

Heuristic: skip <img> tags whose `class` attribute contains
"mxd-logo__image" — those are the brand logo pair (light+dark) and
appear in the fixed header. Every other <img> gets lazy/async.

Idempotent: tags already carrying `loading=` are untouched.

Usage:
  python3 scripts/optimize-images.py            # walk and write
  python3 scripts/optimize-images.py --check    # dry-run, exits 1
                                                  if any file would
                                                  change
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

# Skip these classes when adding loading=lazy. They cover:
#   - Logo pair in the fixed header (always above the fold)
#   - service-img: card images inside the GSAP-pinned services-stack
#     section. Lazy-loading these causes a mid-scroll fetch when the
#     ScrollTrigger pins each card → visible jitter while scrolling.
#     They look "below the fold" but are part of a sticky-pinned
#     section that re-paints the in-viewport card as you scroll.
SKIP_CLASS_TOKENS = ("mxd-logo__image", "service-img")

# Match <img ...> tag (no closing slash variants supported; HTML5).
# Group 1: attributes between <img and >.
IMG_PATTERN = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)

# Detect existing loading= attribute.
HAS_LOADING_RE = re.compile(r"\bloading\s*=", re.IGNORECASE)

# Detect class attribute and capture its value.
CLASS_RE = re.compile(
    r'\bclass\s*=\s*(["\'])([^"\']*)\1',
    re.IGNORECASE,
)


def attrs_should_skip(attrs: str) -> bool:
    """Skip logo imgs (above fold)."""
    m = CLASS_RE.search(attrs)
    if not m:
        return False
    classes = m.group(2).split()
    return any(token in classes for token in SKIP_CLASS_TOKENS)


LAZY_PAIR_RE = re.compile(
    r'\s*loading\s*=\s*"lazy"\s*decoding\s*=\s*"async"\s*',
    re.IGNORECASE,
)
LAZY_ONLY_RE = re.compile(r'\s*loading\s*=\s*"lazy"', re.IGNORECASE)
DECODING_ONLY_RE = re.compile(r'\s*decoding\s*=\s*"async"', re.IGNORECASE)


def strip_lazy(attrs: str) -> str:
    """Remove lazy/async attrs from a tag's attribute string."""
    s = LAZY_PAIR_RE.sub(" ", attrs)
    s = LAZY_ONLY_RE.sub(" ", s)
    s = DECODING_ONLY_RE.sub(" ", s)
    # Collapse repeated spaces created by the strip.
    return re.sub(r" {2,}", " ", s).rstrip()


def transform(content: str) -> tuple[str, int, int]:
    """Return (new_content, lazy_added, lazy_stripped) counts."""
    added = [0]
    stripped = [0]

    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        skip = attrs_should_skip(attrs)
        has_lazy = HAS_LOADING_RE.search(attrs)
        if skip and has_lazy:
            # Scroll-pinned section image: remove lazy so the browser
            # fetches it before the section enters the pinned viewport.
            stripped[0] += 1
            return f"<img{strip_lazy(attrs)}>"
        if not skip and not has_lazy:
            added[0] += 1
            return f'<img loading="lazy" decoding="async"{attrs}>'
        return match.group(0)

    new_content = IMG_PATTERN.sub(replace, content)
    return new_content, added[0], stripped[0]


def process_file(path: Path, check: bool) -> tuple[int, int]:
    """Return (added, stripped) <img> counts."""
    original = path.read_text(encoding="utf-8")
    updated, added, stripped = transform(original)
    if updated == original:
        return 0, 0
    if not check:
        path.write_text(updated, encoding="utf-8")
    return added, stripped


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
    total_added = 0
    total_stripped = 0
    files_touched = 0
    for path in files:
        added, stripped = process_file(path, args.check)
        if added or stripped:
            files_touched += 1
            total_added += added
            total_stripped += stripped
            print(f"  ~ {path.name}: +{added} -{stripped}")
        else:
            print(f"  = {path.name}")

    verb = "would change" if args.check else "updated"
    print(f"\n{files_touched}/{len(files)} files {verb}; "
          f"+{total_added} lazy added, -{total_stripped} stripped "
          f"(scroll-pinned cards).")
    if args.check and files_touched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
