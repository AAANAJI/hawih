#!/usr/bin/env python3
"""
inject-jsonld.py — Phase 1 JSON-LD injector for Hawih.

Walks every public *.html file and injects a bracketed JSON-LD block
just before </head>. The block always contains the shared
Organization schema (seo/jsonld/organization.json) plus one or more
page-type-specific schemas (Service, FAQPage, LocalBusiness,
CreativeWork, BreadcrumbList, WebSite/SearchAction, etc.) chosen by
filename pattern.

Page-type rules:
  index.html                → WebSite (+SearchAction) + BreadcrumbList
  services.html             → ItemList of Services + BreadcrumbList
  service-*.html            → Service + BreadcrumbList
  work.html                 → BreadcrumbList
  work-*.html               → CreativeWork + BreadcrumbList
  about.html                → AboutPage + BreadcrumbList
  contact.html              → LocalBusiness + BreadcrumbList
  quality-guarantee.html    → FAQPage + BreadcrumbList
  careers.html, affiliate.html → WebPage + BreadcrumbList
  privacy-policy.html, terms-conditions.html → WebPage
  thank-you.html            → WebPage (noindex via meta robots handled
                                       in Phase 0; schema still helpful)

Idempotent. Bracketed by:
  <!-- HAWIH_JSONLD_START --> / <!-- HAWIH_JSONLD_END -->

Usage:
  python3 scripts/inject-jsonld.py
  python3 scripts/inject-jsonld.py --check
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SEO_DIR = REPO_ROOT / "seo" / "jsonld"
SITE_ORIGIN = "https://hawih.com.sa"
EXCLUDE_FILES = {"use-cases.html", "theme-assets.html"}

START_ANCHOR = "<!-- HAWIH_JSONLD_START -->"
END_ANCHOR = "<!-- HAWIH_JSONLD_END -->"
ORG_ID = f"{SITE_ORIGIN}/#organization"

# Service page metadata (slug → bilingual name + brief description).
# Description kept short; full page copy is the real source of truth.
SERVICE_META: dict[str, dict[str, str]] = {
    "service-brand": {
        "name": "Brand Strategy",
        "name_ar": "العلامة التجارية",
        "description": "Brand strategy and identity systems — naming, promise, voice, and visual language for ambitious organisations.",
    },
    "service-identity": {
        "name": "Visual Identity",
        "name_ar": "الهوية البصرية",
        "description": "Logo, typography, colour, motion, and brand-system design that scales across surfaces.",
    },
    "service-ui": {
        "name": "UI Design",
        "name_ar": "تصميم الواجهات",
        "description": "Interface design for web and mobile — accessible, bilingual, and built on a working design system.",
    },
    "service-ux": {
        "name": "UX Design",
        "name_ar": "تجربة المستخدم",
        "description": "User research, information architecture, prototyping, and usability testing for digital products.",
    },
    "service-marketing": {
        "name": "Marketing & Social",
        "name_ar": "التسويق ووسائل التواصل",
        "description": "Content, channel, and campaign strategy plus production for paid and organic channels.",
    },
    "service-consulting": {
        "name": "Brand Consulting",
        "name_ar": "الاستشارات",
        "description": "Independent strategic counsel for boards and founders on brand, positioning, and category fit.",
    },
    "service-events": {
        "name": "Events & Activations",
        "name_ar": "الفعاليات",
        "description": "Brand-led event design, environmental graphics, and on-the-ground activation production.",
    },
    "service-refresh": {
        "name": "Brand Refresh",
        "name_ar": "إحياء العلامات",
        "description": "Evolution, not revolution — refreshing established brands without losing recognition equity.",
    },
}

# Work case-study metadata (slug → bilingual project name).
WORK_META: dict[str, dict[str, str]] = {
    "work-12p": {"name": "12P"},
    "work-al-gharbi": {"name": "Al-Gharbi"},
    "work-al-sadu": {"name": "Al-Sadu"},
    "work-almasar": {"name": "Almasar"},
    "work-almoel": {"name": "Almoel"},
    "work-aronati": {"name": "Aronati"},
    "work-athr": {"name": "Athr"},
    "work-blink": {"name": "Blink"},
    "work-bnoon": {"name": "Bnoon"},
    "work-casho": {"name": "Casho"},
    "work-caviole": {"name": "Caviole"},
    "work-direct": {"name": "Direct"},
    "work-dlvri": {"name": "Dlvri"},
    "work-jazl": {"name": "Jazl"},
    "work-karmello": {"name": "Karmello"},
    "work-leader": {"name": "Leader"},
    "work-nab": {"name": "NAB"},
    "work-oversight": {"name": "Oversight"},
    "work-riwaq": {"name": "Riwaq"},
    "work-tajseem": {"name": "Tajseem"},
    "work-talga": {"name": "Talga"},
    "work-toma": {"name": "Toma"},
    "work-unico": {"name": "Unico"},
    "work-verdant": {"name": "Verdant"},
}


def canonical(filename: str) -> str:
    if filename == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{filename[:-5]}"


def read_meta(content: str, attr: str, value: str) -> str:
    pattern = (
        rf'<meta\s+(?:[^>]*\s)?{re.escape(attr)}\s*=\s*'
        rf'["\']{re.escape(value)}["\'][^>]*\scontent\s*=\s*'
        rf'["\']([^"\']*)["\']'
    )
    m = re.search(pattern, content, re.IGNORECASE)
    return m.group(1) if m else ""


def get_title(content: str) -> str:
    m = re.search(r"<title>([^<]*)</title>", content, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def org_block() -> dict:
    """Load the shared Organization JSON-LD."""
    return json.loads((SEO_DIR / "organization.json").read_text(encoding="utf-8"))


def org_ref() -> dict:
    """Compact reference back to the shared Organization @id."""
    return {"@id": ORG_ID}


def breadcrumb(filename: str) -> dict:
    """Build BreadcrumbList for a page."""
    items = [{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": f"{SITE_ORIGIN}/",
    }]
    slug = filename[:-5]  # strip .html
    if filename == "index.html":
        return None
    if slug.startswith("service-"):
        items.append({
            "@type": "ListItem",
            "position": 2,
            "name": "Services",
            "item": f"{SITE_ORIGIN}/services",
        })
        items.append({
            "@type": "ListItem",
            "position": 3,
            "name": SERVICE_META.get(slug, {}).get("name", slug.replace("-", " ").title()),
            "item": f"{SITE_ORIGIN}/{slug}",
        })
    elif slug.startswith("work-"):
        items.append({
            "@type": "ListItem",
            "position": 2,
            "name": "Work",
            "item": f"{SITE_ORIGIN}/work",
        })
        items.append({
            "@type": "ListItem",
            "position": 3,
            "name": WORK_META.get(slug, {}).get("name", slug.replace("-", " ").title()),
            "item": f"{SITE_ORIGIN}/{slug}",
        })
    else:
        items.append({
            "@type": "ListItem",
            "position": 2,
            "name": slug.replace("-", " ").title(),
            "item": f"{SITE_ORIGIN}/{slug}",
        })
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }


def website_block() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": f"{SITE_ORIGIN}/#website",
        "url": f"{SITE_ORIGIN}/",
        "name": "Hawih",
        "alternateName": "هوية",
        "inLanguage": ["ar-SA", "en"],
        "publisher": org_ref(),
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": f"{SITE_ORIGIN}/?q={{search_term_string}}",
            },
            "query-input": "required name=search_term_string",
        },
    }


def services_itemlist() -> dict:
    items = []
    for i, (slug, meta) in enumerate(SERVICE_META.items(), start=1):
        items.append({
            "@type": "ListItem",
            "position": i,
            "url": f"{SITE_ORIGIN}/{slug}",
            "name": meta["name"],
        })
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Hawih Services",
        "itemListElement": items,
    }


def service_block(slug: str, content: str) -> dict:
    meta = SERVICE_META.get(slug, {})
    name = meta.get("name", slug.replace("-", " ").title())
    name_ar = meta.get("name_ar", "")
    desc = (read_meta(content, "name", "description")
            or meta.get("description", ""))
    block = {
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": f"{SITE_ORIGIN}/{slug}#service",
        "name": name,
        "alternateName": name_ar,
        "description": desc,
        "provider": org_ref(),
        "serviceType": name,
        "areaServed": [
            {"@type": "Country", "name": "Saudi Arabia"},
            {"@type": "Country", "name": "United Arab Emirates"},
            {"@type": "Country", "name": "Kuwait"},
            {"@type": "Country", "name": "Bahrain"},
            {"@type": "Country", "name": "Oman"},
            {"@type": "Country", "name": "Qatar"},
        ],
        "url": f"{SITE_ORIGIN}/{slug}",
    }
    if not name_ar:
        block.pop("alternateName")
    return block


def creative_work_block(slug: str, content: str) -> dict:
    meta = WORK_META.get(slug, {})
    name = meta.get("name", slug.replace("-", " ").title())
    desc = read_meta(content, "name", "description") or \
        f"Case study: {name} — branding and creative work by Hawih."
    return {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": f"{SITE_ORIGIN}/{slug}#work",
        "name": name,
        "description": desc,
        "creator": org_ref(),
        "url": f"{SITE_ORIGIN}/{slug}",
        "inLanguage": "ar-SA",
    }


def about_block() -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "@id": f"{SITE_ORIGIN}/about#aboutpage",
        "name": "About Hawih",
        "url": f"{SITE_ORIGIN}/about",
        "mainEntity": org_ref(),
    }


def localbusiness_block() -> dict:
    """LocalBusiness for /contact — extends Organization with geo + hours."""
    org = org_block()
    lb = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": f"{SITE_ORIGIN}/#localbusiness",
        "name": org["name"],
        "image": org["image"],
        "url": f"{SITE_ORIGIN}/contact",
        "telephone": org["contactPoint"][0]["telephone"],
        "priceRange": "$$-$$$",
        "address": org["address"],
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 24.8540,
            "longitude": 46.6420,
        },
        "openingHoursSpecification": [{
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Sunday", "Monday", "Tuesday",
                          "Wednesday", "Thursday"],
            "opens": "09:00",
            "closes": "18:00",
        }],
        "sameAs": org["sameAs"],
        "parentOrganization": org_ref(),
    }
    return lb


def faqpage_block() -> dict:
    """FAQPage for /quality-guarantee — high-leverage rich result."""
    qa = [
        {
            "q": "What does Hawih's quality guarantee cover?",
            "a": "Every Hawih engagement includes a structured review process, written feedback handover, and the open files needed to operate the brand independently after delivery.",
        },
        {
            "q": "How is bilingual work (Arabic + English) handled?",
            "a": "Both languages are first-class: type systems, layout, and copy are designed in Arabic and English together, not translated as an afterthought.",
        },
        {
            "q": "Who owns the final assets?",
            "a": "You do. We hand off the open working files, a written application guide, and the rights to use the work commercially without further fees.",
        },
        {
            "q": "What happens if the work needs revisions after delivery?",
            "a": "Each engagement defines a clear review process before final handover; post-delivery support is arranged based on the engagement's scope.",
        },
    ]
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": f"{SITE_ORIGIN}/quality-guarantee#faqpage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": item["q"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item["a"],
                },
            }
            for item in qa
        ],
    }


def webpage_block(filename: str, content: str) -> dict:
    title = read_meta(content, "property", "og:title") or get_title(content)
    desc = read_meta(content, "name", "description")
    return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": f"{canonical(filename)}#webpage",
        "name": title,
        "description": desc,
        "url": canonical(filename),
        "isPartOf": {"@id": f"{SITE_ORIGIN}/#website"},
        "publisher": org_ref(),
    }


def schemas_for(filename: str, content: str) -> list[dict]:
    """Return the list of JSON-LD blocks for a given page."""
    org = org_block()
    out = [org]

    bc = breadcrumb(filename)

    if filename == "index.html":
        out.append(website_block())
    elif filename == "services.html":
        out.append(services_itemlist())
        if bc:
            out.append(bc)
    elif filename.startswith("service-"):
        out.append(service_block(filename[:-5], content))
        if bc:
            out.append(bc)
    elif filename == "work.html":
        if bc:
            out.append(bc)
    elif filename.startswith("work-"):
        out.append(creative_work_block(filename[:-5], content))
        if bc:
            out.append(bc)
    elif filename == "about.html":
        out.append(about_block())
        if bc:
            out.append(bc)
    elif filename == "contact.html":
        out.append(localbusiness_block())
        if bc:
            out.append(bc)
    elif filename == "quality-guarantee.html":
        out.append(faqpage_block())
        if bc:
            out.append(bc)
    elif filename in ("careers.html", "affiliate.html",
                      "privacy-policy.html", "terms-conditions.html",
                      "thank-you.html"):
        out.append(webpage_block(filename, content))
        if bc:
            out.append(bc)
    else:
        out.append(webpage_block(filename, content))
        if bc:
            out.append(bc)

    return out


def render_block(filename: str, content: str) -> str:
    schemas = schemas_for(filename, content)
    lines = [f"    {START_ANCHOR}",
             "    <!-- SEO: JSON-LD structured data (Phase 1) -->"]
    for s in schemas:
        body = json.dumps(s, ensure_ascii=False, indent=2)
        # Indent each line by 4 spaces so it nests cleanly inside <head>.
        body_indented = "\n".join("    " + line for line in body.splitlines())
        lines.append('    <script type="application/ld+json">')
        lines.append(body_indented)
        lines.append("    </script>")
    lines.append(f"    {END_ANCHOR}")
    return "\n".join(lines)


def update_file(path: Path, check: bool) -> bool:
    original = path.read_text(encoding="utf-8")
    new_block = render_block(path.name, original)

    if START_ANCHOR in original and END_ANCHOR in original:
        pattern = re.compile(
            rf"[ \t]*{re.escape(START_ANCHOR)}.*?{re.escape(END_ANCHOR)}",
            re.DOTALL,
        )
        updated = pattern.sub(new_block, original, count=1)
    elif "</head>" in original:
        # Strip any leading whitespace immediately before </head> so the
        # new block keeps its own indentation rather than inheriting
        # </head>'s indent on top of it (idempotency).
        updated = re.sub(
            r"[ \t]*</head>",
            f"{new_block}\n  </head>",
            original,
            count=1,
        )
    else:
        print(f"  ! {path.name}: no </head>; skipped", file=sys.stderr)
        return False

    if updated == original:
        return False
    if not check:
        path.write_text(updated, encoding="utf-8")
    return True


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
    changed = 0
    for path in files:
        if update_file(path, args.check):
            changed += 1
            print(f"  ~ {path.name}")
        else:
            print(f"  = {path.name}")
    verb = "would change" if args.check else "updated"
    print(f"\n{changed}/{len(files)} files {verb}.")
    if args.check and changed:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
