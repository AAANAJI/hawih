#!/usr/bin/env python3
"""
inject-articles-nav.py — add the /articles link to the global navigation.

Adds an "المقالات / Articles" item immediately before the Contact item in
the three navigations of the marketing template:
  1. desktop nav  (.uc-desktop-nav__list)
  2. mobile menu  (.main-menu)
  3. footer nav   (.footer-nav)

Runs on the AR root pages only — build-en-mirror.py then propagates the
links to the /en tree (rewriting href="/articles" → "/en/articles" and
swapping the lang-string). Landing pages and articles use their own lean
nav and are skipped.

Idempotent: each insertion is guarded by a marker check, so re-runs and
already-linked pages are left untouched. If an anchor isn't found on a
page (markup differs), that insertion is skipped rather than failing.

Usage:
  python3 scripts/inject-articles-nav.py
  python3 scripts/inject-articles-nav.py --check
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_MARKER = "uc-desktop-nav__list"   # identifies the marketing template
SKIP_PREFIXES = ("logo-design", "brand-identity", "company-profile",
                 "website-design", "content-writing", "article-")
SKIP_FILES = {"use-cases.html", "theme-assets.html", "articles.html"}

DIAMOND = ("M19.6,9.6h-3.9c-.4,0-1.8-.2-1.8-.2-.6,0-1.1-.2-1.6-.6-.5-.3-.9-"
           ".8-1.2-1.2-.3-.4-.4-.9-.5-1.4,0,0,0-1.1-.2-1.5V.4c0-.2-.2-.4-.4-"
           ".4s-.4.2-.4.4v4.4c0,.4-.2,1.5-.2,1.5,0,.5-.2,1-.5,1.4-.3.5-.7.9-"
           "1.2,1.2s-1,.5-1.6.6c0,0-1.2,0-1.7.2H.4c-.2,0-.4.2-.4.4s.2.4.4.4h"
           "4.1c.4,0,1.7.2,1.7.2.6,0,1.1.2,1.6.6.4.3.8.7,1.1,1.1.3.5.5,1,.6,"
           "1.6,0,0,0,1.3.2,1.7v4.1c0,.2.2.4.4.4s.4-.2.4-.4v-4.1c0-.4.2-1.7."
           "2-1.7,0-.6.2-1.1.6-1.6.3-.4.7-.8,1.1-1.1.5-.3,1-.5,1.6-.6,0,0,1."
           "3,0,1.8-.2h3.9c.2,0,.4-.2.4-.4s-.2-.4-.4-.4h0Z")

# (marker_if_present, anchor_to_match, new_block_inserted_before_anchor)
INSERTIONS = [
    (
        'uc-desktop-nav__link" href="/articles"',
        '        <li class="uc-desktop-nav__item">\n'
        '          <a class="uc-desktop-nav__link" href="/contact">',
        '        <li class="uc-desktop-nav__item">\n'
        '          <a class="uc-desktop-nav__link" href="/articles">\n'
        f'            <svg class="uc-desktop-nav__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="{DIAMOND}"/></svg>\n'
        '            <span class="lang-string" data-ar="المقالات" data-en="Articles">المقالات</span>\n'
        '          </a>\n'
        '        </li>',
    ),
    (
        'main-menu__link btn btn-anim" href="/articles"',
        '                    <li class="main-menu__item">\n'
        '                      <a class="main-menu__link btn btn-anim" href="/contact">',
        '                    <li class="main-menu__item">\n'
        '                      <a class="main-menu__link btn btn-anim" href="/articles">\n'
        '                        <span class="btn-caption lang-string" data-ar="المقالات" data-en="Articles">المقالات</span>\n'
        '                      </a>\n'
        '                    </li>',
    ),
    (
        'href="/articles" class="footer-nav__link btn-anim"',
        '                <li class="footer-nav__item anim-uni-in-up">\n'
        '                  <a href="/contact" class="footer-nav__link btn-anim">',
        '                <li class="footer-nav__item anim-uni-in-up">\n'
        '                  <a href="/articles" class="footer-nav__link btn-anim">\n'
        '                    <span class="btn-caption lang-string" data-ar="المقالات" data-en="Articles">المقالات</span>\n'
        '                  </a>\n'
        '                </li>',
    ),
    # --- second markup variant (pages without the btn-anim class) ---
    (
        'main-menu__link btn" href="/articles"',
        '                    <li class="main-menu__item">\n'
        '                      <a class="main-menu__link btn" href="/contact">',
        '                    <li class="main-menu__item">\n'
        '                      <a class="main-menu__link btn" href="/articles">\n'
        '                        <span class="btn-caption lang-string" data-ar="المقالات" data-en="Articles">المقالات</span>\n'
        '                      </a>\n'
        '                    </li>',
    ),
    (
        'href="/articles" class="footer-nav__link"',
        '                <li class="footer-nav__item anim-uni-in-up">\n'
        '                  <a href="/contact" class="footer-nav__link">',
        '                <li class="footer-nav__item anim-uni-in-up">\n'
        '                  <a href="/articles" class="footer-nav__link">\n'
        '                    <span class="btn-caption lang-string" data-ar="المقالات" data-en="Articles">المقالات</span>\n'
        '                  </a>\n'
        '                </li>',
    ),
]


def process(content: str) -> tuple[str, int]:
    inserted = 0
    for marker, anchor, block in INSERTIONS:
        if marker in content:          # already linked → idempotent skip
            continue
        if anchor not in content:      # markup differs on this page → skip
            continue
        content = content.replace(anchor, block + "\n" + anchor, 1)
        inserted += 1
    return content, inserted


def target_files() -> list[Path]:
    out = []
    for child in sorted(REPO_ROOT.iterdir()):
        if child.is_dir() or child.suffix != ".html":
            continue
        if child.name in SKIP_FILES:
            continue
        if any(child.name.startswith(p) for p in SKIP_PREFIXES):
            continue
        out.append(child)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    changed = 0
    for path in target_files():
        original = path.read_text(encoding="utf-8")
        if TEMPLATE_MARKER not in original:
            continue
        updated, n = process(original)
        if updated != original:
            changed += 1
            if not args.check:
                path.write_text(updated, encoding="utf-8")
            print(f"  ~ {path.name} (+{n} nav links)")
    print(f"\n{changed} files {'would change' if args.check else 'updated'}.")
    if args.check and changed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
