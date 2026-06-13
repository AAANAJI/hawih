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

# Skip these classes when adding loading=lazy (they're always above
# the fold in the MXD template header).
SKIP_CLASS_TOKENS = ("mxd-logo__image",)

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


def transform(content: str) -> tuple[str, int]:
    """Return new content + count of <img> tags lazy-loaded."""
    count = [0]

    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        if HAS_LOADING_RE.search(attrs):
            return match.group(0)
        if attrs_should_skip(attrs):
            return match.group(0)
        count[0] += 1
        # Insert loading + decoding as the first attributes so they're
        # easy to grep for and don't disturb existing attr ordering.
        return f'<img loading="lazy" decoding="async"{attrs}>'

    new_content = IMG_PATTERN.sub(replace, content)
    return new_content, count[0]


def process_file(path: Path, check: bool) -> int:
    """Return number of <img> tags modified."""
    original = path.read_text(encoding="utf-8")
    updated, n = transform(original)
    if n == 0 or updated == original:
        return 0
    if not check:
        path.write_text(updated, encoding="utf-8")
    return n


def iter_html() -> list[Path]:
    files = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir() or child.suffix != ".html":
            continue
        if child.name in EXCLUDE_FILES:
            continue
        files.append(child)
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    files = iter_html()
    total_imgs = 0
    files_touched = 0
    for path in files:
        n = process_file(path, args.check)
        if n:
            files_touched += 1
            total_imgs += n
            print(f"  ~ {path.name}: {n} imgs")
        else:
            print(f"  = {path.name}")

    verb = "would change" if args.check else "updated"
    print(f"\n{files_touched}/{len(files)} files {verb}; "
          f"{total_imgs} <img> tags lazy-loaded.")
    if args.check and files_touched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
