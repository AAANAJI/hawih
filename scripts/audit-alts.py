#!/usr/bin/env python3
"""
audit-alts.py — Phase 2 image-alt inventory for Hawih.

Walks every public *.html (AR root + /en/ mirror) and emits a CSV
of every <img> tag with: file, line, src, current alt, classification.

Classifications:
  empty     — alt=""
  generic   — alt is one of the known template placeholders
              ("Image", "Icon", "Project Preview", etc.)
  brand     — alt is the Hawih or Shfrah brand mark (skip — fine)
  ok        — alt looks descriptive (≥3 tokens, not a placeholder)

Usage:
  python3 scripts/audit-alts.py                  # writes seo/alts.csv
  python3 scripts/audit-alts.py --stdout         # prints CSV to stdout
  python3 scripts/audit-alts.py --summary        # short table per file
  python3 scripts/audit-alts.py --check          # exit non-zero if any
                                                   empty/generic remain
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEO_DIR = REPO_ROOT / "seo"
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

GENERIC_ALTS = {
    "image", "img", "icon", "object", "avatar",
    "project preview", "service/feature image", "hero image",
    "blog preview image", "divider icon", "eye icon",
    "partner logo", "illustration", "tech stack icon",
}
BRAND_ALTS = {"hawih · هوية", "شفرة · shfrah"}


def classify(alt: str) -> str:
    a = alt.strip()
    if a == "":
        return "empty"
    if a.lower() in BRAND_ALTS:
        return "brand"
    if a.lower() in GENERIC_ALTS:
        return "generic"
    # Single-word alts that exactly match a project slug name are also
    # weak — flag as generic so reviewers can replace with a sentence.
    tokens = a.split()
    if len(tokens) < 2 and a.lower() not in BRAND_ALTS:
        return "generic"
    return "ok"


IMG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)
ALT_RE = re.compile(r'\balt\s*=\s*"([^"]*)"', re.IGNORECASE)
SRC_RE = re.compile(r'\bsrc\s*=\s*"([^"]+)"', re.IGNORECASE)


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


def audit_file(path: Path) -> list[dict]:
    rows = []
    content = path.read_text(encoding="utf-8")
    for line_no, line in enumerate(content.splitlines(), start=1):
        for m in IMG_RE.finditer(line):
            attrs = m.group(1)
            alt_m = ALT_RE.search(attrs)
            src_m = SRC_RE.search(attrs)
            alt = alt_m.group(1) if alt_m else "<missing>"
            src = src_m.group(1) if src_m else "<missing>"
            rel = path.relative_to(REPO_ROOT)
            rows.append({
                "file": str(rel),
                "line": line_no,
                "alt": alt,
                "src": src,
                "class": classify(alt) if alt_m else "missing",
            })
    return rows


def summary(rows: list[dict]) -> None:
    counts = Counter(r["class"] for r in rows)
    by_file: dict[str, Counter] = {}
    for r in rows:
        by_file.setdefault(r["file"], Counter())[r["class"]] += 1
    print(f"Total <img> tags: {len(rows)}")
    for cls, n in counts.most_common():
        print(f"  {cls:8}: {n}")
    print()
    print(f"{'file':<40} {'empty':>7} {'gen':>5} {'brand':>5} {'ok':>5}")
    print("-" * 70)
    for f in sorted(by_file):
        c = by_file[f]
        print(f"{f:<40} {c['empty']:>7} {c['generic']:>5} "
              f"{c['brand']:>5} {c['ok']:>5}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stdout", action="store_true",
                        help="emit CSV to stdout instead of seo/alts.csv")
    parser.add_argument("--summary", action="store_true",
                        help="print a per-file summary instead of CSV")
    parser.add_argument("--check", action="store_true",
                        help="exit non-zero if any empty or generic "
                             "alts remain (CI gate)")
    args = parser.parse_args()

    files = iter_html()
    rows = []
    for f in files:
        rows.extend(audit_file(f))

    if args.summary:
        summary(rows)
    elif args.stdout:
        w = csv.DictWriter(sys.stdout, fieldnames=["file", "line", "class",
                                                   "alt", "src"])
        w.writeheader()
        w.writerows(rows)
    else:
        SEO_DIR.mkdir(parents=True, exist_ok=True)
        out = SEO_DIR / "alts.csv"
        with out.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["file", "line", "class",
                                               "alt", "src"])
            w.writeheader()
            w.writerows(rows)
        print(f"Wrote {out} ({len(rows)} rows)")

    if args.check:
        bad = sum(1 for r in rows if r["class"] in ("empty", "generic"))
        if bad:
            print(f"  ! {bad} empty/generic alts remain", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
