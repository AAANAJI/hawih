#!/usr/bin/env python3
"""
a11y-fix.py — give icon-only links a discernible accessible name.

Lighthouse flags two link types on the site as having no accessible
name (they contain only an icon, no text):
  - the mobile nav hamburger:  <a class="...mxd-nav__hamburger...">
  - the round arrow buttons:    <a class="...btn-round...">  (icon <i>)

Both get a visually-hidden <span class="sr-only lang-string"> injected
as the first child. Because it's a lang-string, the existing runtime
toggle + build-en-mirror.py bake the correct AR/EN text automatically,
so the names are correct in both languages with no new machinery.

Runs on the AR root tree only; build-en-mirror.py clones the result
into /en/. Must run BEFORE build-en-mirror.py in the pipeline.

Idempotent: skips any link that already contains an .sr-only span.

Usage:
  python3 scripts/a11y-fix.py
  python3 scripts/a11y-fix.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

HAMBURGER_LABEL = '<span class="sr-only lang-string" data-ar="القائمة" data-en="Menu">القائمة</span>'
ROUND_LABEL = '<span class="sr-only lang-string" data-ar="عرض المزيد" data-en="View more">عرض المزيد</span>'

# Opening <a ...> tag whose class contains the target token. We inject
# the label immediately after the opening tag (as the first child).
HAMBURGER_OPEN_RE = re.compile(
    r'(<a\b[^>]*\bclass="[^"]*\bmxd-nav__hamburger\b[^"]*"[^>]*>)',
    re.IGNORECASE,
)
ROUND_OPEN_RE = re.compile(
    r'(<a\b[^>]*\bclass="[^"]*\bbtn-round\b[^"]*"[^>]*>)',
    re.IGNORECASE,
)


def inject_after(content: str, open_re: re.Pattern, label: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        open_tag = m.group(1)
        # Find the span that would follow; if an sr-only is already the
        # next thing, skip (idempotent). We look just past the match end.
        end = m.end()
        following = content[end:end + 80]
        if 'class="sr-only' in following:
            return open_tag
        count += 1
        return open_tag + label

    new_content = open_re.sub(repl, content)
    return new_content, count


def process_file(path: Path, check: bool) -> int:
    original = path.read_text(encoding="utf-8")
    content = original
    content, n1 = inject_after(content, HAMBURGER_OPEN_RE, HAMBURGER_LABEL)
    content, n2 = inject_after(content, ROUND_OPEN_RE, ROUND_LABEL)
    if content == original:
        return 0
    if not check:
        path.write_text(content, encoding="utf-8")
    return n1 + n2


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
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    files = iter_html()
    total = 0
    touched = 0
    for p in files:
        n = process_file(p, args.check)
        if n:
            touched += 1
            total += n
    verb = "would label" if args.check else "labeled"
    print(f"{touched}/{len(files)} files {verb}; {total} icon-only links named.")
    if args.check and touched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
