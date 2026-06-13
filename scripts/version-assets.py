#!/usr/bin/env python3
"""
version-assets.py — content-hash cache-busting for Hawih's own CSS/JS.

The site's own assets (/assets/css/hawih.css, /assets/js/hawih.js) are
served with a browser cache (max-age). Without a version stamp in the
URL, a returning visitor keeps the cached copy until it expires — so
CSS/JS edits don't show up promptly, and a deploy "lands" but the user
still sees the old styling.

This script appends `?v=<short-content-hash>` to every reference of
those two files across all public HTML (AR root + /en/ mirror). The
hash is the first 10 hex chars of the file's SHA-256, so:

  - the query only changes when the file's bytes change → returning
    visitors fetch the new file the instant a real change ships;
  - it's stable across re-runs when nothing changed → idempotent;
  - unrelated deploys don't churn the URL.

Only Hawih-authored assets are versioned. Template assets under
/uc-assets/ are left alone (we don't edit them).

Usage:
  python3 scripts/version-assets.py
  python3 scripts/version-assets.py --check
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

# Map of asset URL path → file on disk. Add entries here to version
# more Hawih-authored assets.
VERSIONED_ASSETS = {
    "/assets/css/hawih.css": REPO_ROOT / "assets" / "css" / "hawih.css",
    "/assets/js/hawih.js": REPO_ROOT / "assets" / "js" / "hawih.js",
    "/assets/css/font-display-fix.css": REPO_ROOT / "assets" / "css" / "font-display-fix.css",
}


def short_hash(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha256(data).hexdigest()[:10]


def build_reference_pattern(asset_path: str) -> re.Pattern:
    # Match the asset path with an optional existing ?v=... query, in an
    # href/src attribute value. Capture nothing — we rebuild wholesale.
    escaped = re.escape(asset_path)
    return re.compile(escaped + r'(?:\?v=[a-f0-9]+)?')


def process_file(path: Path, hashes: dict[str, str], check: bool) -> int:
    original = path.read_text(encoding="utf-8")
    content = original
    replacements = 0
    for asset_path, h in hashes.items():
        pattern = build_reference_pattern(asset_path)
        new_ref = f"{asset_path}?v={h}"

        def repl(_m: re.Match) -> str:
            return new_ref

        content, n = pattern.subn(repl, content)
        replacements += n
    if content == original:
        return 0
    if not check:
        path.write_text(content, encoding="utf-8")
    return replacements


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

    hashes = {}
    for asset_path, disk in VERSIONED_ASSETS.items():
        if not disk.is_file():
            print(f"  ! {asset_path}: file not found at {disk}", file=sys.stderr)
            continue
        hashes[asset_path] = short_hash(disk)
        print(f"  {asset_path} -> v={hashes[asset_path]}")

    files = iter_html()
    files_touched = 0
    total = 0
    for path in files:
        n = process_file(path, hashes, args.check)
        if n:
            files_touched += 1
            total += n
    verb = "would change" if args.check else "updated"
    print(f"\n{files_touched}/{len(files)} files {verb}; {total} refs stamped.")
    if args.check and files_touched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
