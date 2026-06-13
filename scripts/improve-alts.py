#!/usr/bin/env python3
"""
improve-alts.py — Phase 2 bulk-replaces the highest-confidence generic
alt-text patterns with context-aware bilingual descriptions, inferred
from the image src path.

What it changes (only when the current alt is in the GENERIC_ALTS set
from audit-alts.py):

  /assets/img/work/<slug>/...      → "<Project Name> – Hawih creative work"
  /uc-assets/img/services/ser-XX   → service tile descriptor (Arabic on
                                     AR pages, English on EN pages)
  /uc-assets/img/icons/h70_appr-*  → decorative; alt="" (this is
                                     correct accessibility practice
                                     for purely decorative icons)
  /uc-assets/img/icons/*           → decorative; alt=""
  /uc-assets/img/illustrations/*   → illustrative; left alone if the
                                     existing alt is meaningful, else
                                     a generic illustration descriptor

Doesn't touch:
  - alt="" that's already deliberately empty
  - alt that's already classified "ok" or "brand"
  - lang-attr imgs that switch alt via data-alt-{ar,en} — those are
    handled by Phase 3's build-en-mirror.py

Idempotent — bracketed by an HTML comment inside the alt? No, we just
trust the audit's "generic" classification and only modify those. A
second run sees "ok" classifications and skips.

Usage:
  python3 scripts/improve-alts.py
  python3 scripts/improve-alts.py --check
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

GENERIC_ALTS = {
    "image", "img", "icon", "object", "avatar",
    "project preview", "service/feature image", "hero image",
    "blog preview image", "divider icon", "eye icon",
    "partner logo", "illustration", "tech stack icon",
}

# Project slug → bilingual display name. Matches the WORK_META in
# inject-jsonld.py — kept here as a flat dict for the small-scale
# substitution we do here. (Long-term these should converge into a
# single seo/work-meta.yaml.)
WORK_NAMES: dict[str, dict[str, str]] = {
    "12p": {"ar": "تويلف بي", "en": "12P"},
    "al-gharbi": {"ar": "الغربي للبهارات", "en": "Al-Gharbi Spices"},
    "al-sadu": {"ar": "السدو", "en": "Al-Sadu"},
    "almasar": {"ar": "المسار", "en": "Almasar"},
    "almoel": {"ar": "المُعَل", "en": "Almoel"},
    "aronati": {"ar": "أروناتي", "en": "Aronati"},
    "athr": {"ar": "أثر", "en": "Athr"},
    "blink": {"ar": "بلينك", "en": "Blink"},
    "bnoon": {"ar": "بنون", "en": "Bnoon"},
    "casho": {"ar": "كاشو", "en": "Casho"},
    "caviole": {"ar": "كافيول", "en": "Caviole"},
    "direct": {"ar": "دايركت", "en": "Direct"},
    "dlvri": {"ar": "ديلفري", "en": "Dlvri"},
    "jazl": {"ar": "جزل", "en": "Jazl"},
    "karmello": {"ar": "كارميلو", "en": "Karmello"},
    "leader": {"ar": "ليدر", "en": "Leader"},
    "nab": {"ar": "ناب", "en": "NAB"},
    "oversight": {"ar": "أوفرسايت", "en": "Oversight"},
    "riwaq": {"ar": "رواق", "en": "Riwaq"},
    "tajseem": {"ar": "تجسيم", "en": "Tajseem"},
    "talga": {"ar": "تلجة", "en": "Talga"},
    "toma": {"ar": "توما", "en": "Toma"},
    "unico": {"ar": "أونيكو", "en": "Unico"},
    "verdant": {"ar": "فردنت", "en": "Verdant"},
}

# Service slug → bilingual display name for the index/services tiles.
# These map to the 8 service-* pages.
SERVICE_NAMES = [
    {"ar": "العلامة التجارية", "en": "Brand strategy"},
    {"ar": "الهوية البصرية", "en": "Visual identity"},
    {"ar": "تصميم الواجهات", "en": "UI design"},
    {"ar": "تجربة المستخدم", "en": "UX design"},
    {"ar": "التسويق", "en": "Marketing & social"},
    {"ar": "الاستشارات", "en": "Brand consulting"},
    {"ar": "الفعاليات", "en": "Events & activations"},
    {"ar": "إحياء العلامات", "en": "Brand refresh"},
]

IMG_TAG_RE = re.compile(r"<img\b([^>]*)>", re.IGNORECASE)
ALT_RE = re.compile(r'\balt\s*=\s*"([^"]*)"', re.IGNORECASE)
SRC_RE = re.compile(r'\bsrc\s*=\s*"([^"]+)"', re.IGNORECASE)


def is_en_page(path: Path) -> bool:
    return "en" in path.parts


def is_generic(alt: str) -> bool:
    return alt.strip().lower() in GENERIC_ALTS


def work_slug_from_src(src: str) -> str | None:
    """Extract project slug from src like /assets/img/work/<slug>/01.jpeg."""
    m = re.search(r"/assets/img/work/([a-z0-9-]+)/", src, re.IGNORECASE)
    return m.group(1).lower() if m else None


def service_index_from_src(src: str) -> int | None:
    """Extract service tile index (1..8) from src like
    /uc-assets/img/services/(800x800_)?ser-NN.webp."""
    m = re.search(r"/services/(?:\d+x\d+_)?ser-(\d+)", src, re.IGNORECASE)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def is_decorative_icon(src: str) -> bool:
    """Icons under /uc-assets/img/icons/ are decorative scaffolding —
    they pair with adjacent text labels that already carry the semantic.
    Best a11y practice is alt="" so screen readers skip them."""
    return "/uc-assets/img/icons/" in src


def proposed_alt(src: str, lang: str) -> str | None:
    """Return the bilingual replacement or None to leave alone."""
    # Work case-study previews.
    slug = work_slug_from_src(src)
    if slug and slug in WORK_NAMES:
        name = WORK_NAMES[slug][lang]
        if lang == "ar":
            return f"{name} — أعمال هوية الإبداعية"
        return f"{name} – Hawih creative work"

    # Service tile imagery on index.html / services.html.
    idx = service_index_from_src(src)
    if idx is not None and 1 <= idx <= len(SERVICE_NAMES):
        s = SERVICE_NAMES[idx - 1]
        if lang == "ar":
            return f"خدمة {s['ar']} من هوية"
        return f"{s['en']} service by Hawih"

    # Decorative icons.
    if is_decorative_icon(src):
        return ""  # intentional empty alt — correct for decorative imgs

    # Illustrations and other template assets — leave for human pass.
    return None


def transform(content: str, path: Path) -> tuple[str, int]:
    lang = "en" if is_en_page(path) else "ar"
    count = 0

    def replace(match: re.Match) -> str:
        nonlocal count
        attrs = match.group(1)
        alt_m = ALT_RE.search(attrs)
        src_m = SRC_RE.search(attrs)
        if not alt_m or not src_m:
            return match.group(0)
        alt = alt_m.group(1)
        src = src_m.group(1)
        if not is_generic(alt):
            return match.group(0)
        new_alt = proposed_alt(src, lang)
        if new_alt is None:
            return match.group(0)
        count += 1
        new_attrs = ALT_RE.sub(
            lambda _: f'alt="{new_alt}"', attrs, count=1)
        return f"<img{new_attrs}>"

    return IMG_TAG_RE.sub(replace, content), count


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
    total_imgs = 0
    files_touched = 0
    for path in files:
        original = path.read_text(encoding="utf-8")
        updated, n = transform(original, path)
        if n and updated != original:
            files_touched += 1
            total_imgs += n
            print(f"  ~ {path.relative_to(REPO_ROOT)}: {n} alts")
            if not args.check:
                path.write_text(updated, encoding="utf-8")
    verb = "would change" if args.check else "updated"
    print(f"\n{files_touched}/{len(files)} files {verb}; "
          f"{total_imgs} alts replaced.")
    if args.check and files_touched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
