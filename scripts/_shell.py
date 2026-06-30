#!/usr/bin/env python3
"""
_shell.py — shared renderer that builds landing pages and articles ON the
official Hawih template shell.

Why: the lean self-contained landing/article pages didn't match the site
theme. This module clones the real shell from a donor page (about.html) —
the exact head CSS chain (plugins.min.css + main.min.css + hawih.css +
fonts + perf), the loader, the hamburger + mobile menu, the mxd-header,
the mxd-footer, and the template scripts — and injects page content into
<main>. So every generated page is visually native and gets the real
nav/footer. Only the meta (title/description/og + EN helper tags) is
swapped, and a small scoped <style> (hx-*) is added for the few custom
components (deliverables grid, process, FAQ, article prose). The normal
SEO pipeline then fixes canonical/hreflang/JSON-LD per filename.

Used by build-landing-pages.py and build-articles.py.
"""
from __future__ import annotations

import html
import re
from pathlib import Path
from urllib.parse import quote

REPO_ROOT = Path(__file__).resolve().parent.parent
SHELL_DONOR = REPO_ROOT / "about.html"

PHONE = "+966502185471"
PHONE_DISPLAY = "+966 50 218 5471"
WA_NUMBER = "966502185471"
EMAIL = "admin@hawih.com.sa"
PORTFOLIO_PDF = "/assets/files/Hawih-Profile.pdf"

# Client logos for the trust strip (files in assets/img/clients/).
LOGOS = [
    ("king-saud-university.webp", "King Saud University"),
    ("hoshan.png", "Hoshan"), ("makaseb.png", "Makaseb"),
    ("camel-club.png", "Camel Club"), ("awan-square.png", "Awan"),
    ("nab.png", "NAB"), ("riwaq.png", "Riwaq"), ("almasar.png", "Almasar"),
]

ARROW = '<i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i>'


def e(s: str) -> str:
    return html.escape(s, quote=True)


def ls(ar: str, en: str, cls: str = "") -> str:
    klass = ("lang-string " + cls).strip()
    return (f'<span class="{klass}" data-ar="{e(ar)}" data-en="{e(en)}">'
            f'{e(ar)}</span>')


def wa_url(msg: str) -> str:
    return f"https://wa.me/{WA_NUMBER}?text={quote(msg)}"


# ---- shell load / head swap -------------------------------------------

_SHELL = None


def load_shell() -> tuple[str, str, str]:
    """Return (prefix, main_open_tag, suffix) from the donor page."""
    global _SHELL
    if _SHELL is not None:
        return _SHELL
    txt = SHELL_DONOR.read_text(encoding="utf-8")
    m = re.search(r'<main id="mxd-page-content"[^>]*>', txt)
    if not m:
        raise SystemExit("shell donor: <main id=mxd-page-content> not found")
    after = txt[m.end():]
    close = after.index("</main>")
    _SHELL = (txt[:m.start()], m.group(0), after[close + len("</main>"):])
    return _SHELL


def _sub_attr(p: str, pattern: str, value: str) -> str:
    return re.sub(pattern, lambda mm: mm.group(1) + e(value) + mm.group(2),
                  p, count=1, flags=re.IGNORECASE)


def swap_head(prefix: str, *, title: str, desc: str, keywords: str,
              og_title: str, og_desc: str, title_en: str, desc_en: str,
              og_title_en: str, og_desc_en: str, extra_style: str = "") -> str:
    """Swap the donor's meta for this page's, add the EN helper tags, and
    inject a scoped <style>. canonical/hreflang/JSON-LD are left to the
    pipeline (rebuilt per filename)."""
    p = re.sub(r"<title>.*?</title>", f"<title>{e(title)}</title>",
               prefix, count=1, flags=re.DOTALL)
    p = _sub_attr(p, r'(<meta name="description" content=")[^"]*(">)', desc)
    p = _sub_attr(p, r'(<meta name="keywords" content=")[^"]*(">)', keywords)
    p = _sub_attr(p, r'(<meta property="og:title" content=")[^"]*(">)', og_title)
    p = _sub_attr(p, r'(<meta property="og:description" content=")[^"]*(">)',
                  og_desc)
    helpers = (
        '\n    <!-- EN locale metadata (consumed by build-en-mirror.py) -->'
        f'\n    <meta name="hawih:title-en" content="{e(title_en)}">'
        f'\n    <meta name="hawih:description-en" content="{e(desc_en)}">'
        f'\n    <meta name="hawih:og-title-en" content="{e(og_title_en)}">'
        f'\n    <meta name="hawih:og-description-en" content="{e(og_desc_en)}">'
    )
    p = p.replace("<!-- Facebook Metadata End -->",
                  "<!-- Facebook Metadata End -->" + helpers, 1)
    if extra_style:
        p = p.replace("</head>", extra_style + "\n  </head>", 1)
    return p


# ---- scoped styles for the few custom components ----------------------
# Uses hawih.css custom properties (loaded by the shell) for brand colours.

HX_STYLE = """    <!-- hx: scoped styles for generated landing/article content -->
    <style>
    .hx-ctarow{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
    .hx-ctarow .btn{margin:0}
    .hx-note{margin-top:16px;font-size:.95rem;opacity:.7}
    .hx-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:26px 40px}
    .hx-logos img{height:40px;width:auto;opacity:.5;filter:grayscale(1);transition:opacity .25s ease,filter .25s ease}
    .hx-logos img:hover{opacity:1;filter:grayscale(0)}
    .hx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .hx-tile{display:flex;align-items:flex-start;gap:.7em;background:var(--hawih-paper-2,#E9E4D7);
      border:1px solid var(--hawih-paper-line,rgba(11,11,16,.1));border-radius:16px;padding:22px;font-weight:500}
    .dark .hx-tile{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .hx-tile i{color:var(--hawih-blue,#1F1FFE);font-size:1.5rem;flex:none;line-height:1}
    .hx-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;counter-reset:hx}
    .hx-step{position:relative;padding-top:8px}
    .hx-step__n{display:inline-flex;font-size:1.05rem;font-weight:700;color:var(--hawih-blue,#1F1FFE);
      background:var(--hawih-blue-soft,rgba(31,31,254,.12));border-radius:10px;padding:.2em .6em;margin-bottom:14px}
    .hx-step h3{font-size:1.15rem;font-weight:700;margin:0 0 6px}
    .hx-step p{margin:0;opacity:.72}
    .hx-faq{display:flex;flex-direction:column;gap:12px;max-width:860px}
    .hx-faq__item{border:1px solid var(--hawih-paper-line,rgba(11,11,16,.12));border-radius:16px;
      background:var(--hawih-paper-2,#E9E4D7);overflow:hidden}
    .dark .hx-faq__item{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .hx-faq__q{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 22px;
      font-weight:600;font-size:1.05rem;cursor:pointer;list-style:none}
    .hx-faq__q::-webkit-details-marker{display:none}
    .hx-faq__q::after{content:"+";font-size:1.5rem;color:var(--hawih-blue,#1F1FFE);line-height:1;flex:none}
    .hx-faq__item[open] .hx-faq__q::after{content:"\\2212"}
    .hx-faq__a{padding:0 22px 20px;opacity:.78;line-height:1.85}
    .hx-prose{max-width:820px;font-size:1.12rem;line-height:1.95}
    .hx-prose h2{font-size:clamp(1.4rem,3vw,1.9rem);font-weight:700;margin:44px 0 14px;line-height:1.3;scroll-margin-top:90px}
    .hx-prose p{margin:0 0 18px}
    .hx-toc{max-width:820px;margin:0 0 8px;padding:22px 24px;border-radius:16px;
      background:var(--hawih-paper-2,#E9E4D7);border:1px solid var(--hawih-paper-line,rgba(11,11,16,.1))}
    .dark .hx-toc{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .hx-toc p{font-weight:700;margin:0 0 10px}
    .hx-toc ol{margin:0;padding-inline-start:1.3em;display:flex;flex-direction:column;gap:7px}
    .hx-toc a{color:var(--hawih-blue,#1F1FFE);font-weight:500}
    .hx-related{max-width:820px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:8px}
    .hx-related .btn{margin:0}
    @media (max-width:991px){.hx-grid{grid-template-columns:repeat(2,1fr)}.hx-steps{grid-template-columns:repeat(2,1fr)}}
    @media (max-width:575px){.hx-grid,.hx-steps{grid-template-columns:1fr}.hx-ctarow .btn{flex:1 1 100%;justify-content:center}}
    </style>"""


# ---- native section builders ------------------------------------------

POINT_SVG = ('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" x="0px" '
             'y="0px" width="20px" height="20px" viewBox="0 0 20 20" '
             'fill="currentColor"><path fill="currentColor" d="M19.6,9.6c0,0-3,'
             '0-4,0c-0.4,0-1.8-0.2-1.8-0.2c-0.6-0.1-1.1-0.2-1.6-0.6c-0.5-0.3-0.'
             '9-0.8-1.2-1.2c-0.3-0.4-0.4-0.9-0.5-1.4c0,0-0.1-1.1-0.2-1.5c-0.1-'
             '1.1,0-4.4,0-4.4C10.4,0.2,10.2,0,10,0S9.6,0.2,9.6,0.4c0,0,0.1,3.3,'
             '0,4.4c0,0.4-0.2,1.5-0.2,1.5C9.4,6.7,9.2,7.2,9,7.6C8.7,8.1,8.2,8.5,'
             '7.8,8.9c-0.5,0.3-1,0.5-1.6,0.6c0,0-1.2,0.1-1.7,0.2c-1,0.1-4.2,0-4.'
             '2,0C0.2,9.6,0,9.8,0,10c0,0.2,0.2,0.4,0.4,0.4c0,0,3.1-0.1,4.2,0c0.'
             '4,0,1.7,0.2,1.7,0.2c0.6,0.1,1.1,0.2,1.6,0.6c0.4,0.3,0.8,0.7,1.1,1.'
             '1c0.3,0.5,0.5,1,0.6,1.6c0,0,0.1,1.3,0.2,1.7c0,1,0,4.1,0,4.1c0,0.2,'
             '0.2,0.4,0.4,0.4s0.4-0.2,0.4-0.4c0,0,0-3.1,0-4.1c0-0.4,0.2-1.7,0.2-'
             '1.7c0.1-0.6,0.2-1.1,0.6-1.6c0.3-0.4,0.7-0.8,1.1-1.1c0.5-0.3,1-0.5,'
             '1.6-0.6c0,0,1.3-0.1,1.8-0.2c1,0,4,0,4,0c0.2,0,0.4-0.2,0.4-0.4C20,9.'
             '8,19.8,9.6,19.6,9.6L19.6,9.6z"/></svg>')


def section(inner: str, extra: str = "") -> str:
    return (f'      <div class="mxd-section padding-default {extra}">'
            f'<div class="mxd-container grid-container">{inner}'
            '</div></div>')


def section_title(title_ar: str, title_en: str, sub_ar: str, sub_en: str) -> str:
    return (
        '<div class="mxd-block"><div class="mxd-section-title"><div class="container-fluid p-0"><div class="row g-0">'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-section-title__hrtitle anim-uni-in-up">'
        f'<h2 class="reveal-type">{ls(title_ar, title_en)}</h2></div></div>'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-section-title__hrdescr">'
        f'<p class="anim-uni-in-up">{ls(sub_ar, sub_en)}</p></div></div>'
        '</div></div></div></div>'
    )


def btn(href: str, label_ar: str, label_en: str, style: str = "btn-default",
        blank: bool = False, icon: str = "ph-arrow-up-right",
        extra_attr: str = "") -> str:
    tgt = ' target="_blank" rel="noopener"' if blank else ""
    ic = f'<i class="ph-bold {icon}"></i>' if icon else ""
    # caption MUST be a single span carrying both btn-caption + lang-string
    # (a nested span breaks the template's btn-anim text effect on Arabic).
    return (f'<a class="btn btn-anim {style} btn-large slide-right-up" '
            f'href="{href}"{tgt}{extra_attr}>'
            f'{ls(label_ar, label_en, "btn-caption")}{ic}</a>')


def hero(eyebrow_ar, eyebrow_en, h1_ar, h1_en, sub_ar, sub_en, ctas_html) -> str:
    return (
        '      <div class="mxd-section mxd-section-inner-headline padding-default">'
        '<div class="mxd-container grid-container"><div class="mxd-block loading-wrap">'
        '<div class="container-fluid px-0"><div class="row gx-0">'
        '<div class="col-12 col-xl-2 mxd-grid-item no-margin"><div class="mxd-block__name name-inner-headline loading__item">'
        f'<p class="mxd-point-subtitle">{POINT_SVG} <span>{ls(eyebrow_ar, eyebrow_en)}</span></p></div></div>'
        '<div class="col-12 col-xl-10 mxd-grid-item no-margin"><div class="mxd-block__content">'
        '<div class="mxd-block__inner-headline loading__item">'
        f'<h1 class="inner-headline__title">{ls(h1_ar, h1_en)}</h1>'
        f'<p class="inner-headline__text t-large t-bright">{ls(sub_ar, sub_en)}</p>'
        f'<div class="hx-ctarow">{ctas_html}</div>'
        '</div></div></div>'
        '</div></div></div></div></div>'
    )


def lead_form(slug: str, pt: str, head_ar: str, head_en: str,
              wa_msg: str) -> str:
    """The native contact-form markup, focused for a landing page, with
    project_type pre-filled and an RTL-safe (clip) honeypot."""
    return (
        '      <div class="mxd-section mxd-section-inner-form overflow-hidden padding-default">'
        '<div class="mxd-container grid-container">'
        + section_title(head_ar, head_en, "نموذج موجز يصل فريقنا مباشرة، ونرد خلال يوم عمل.",
                        "A short brief reaches our team directly; we reply within one working day.") +
        '<div class="mxd-block"><div class="mxd-block__inner-form"><div class="form-container">'
        f'<form class="form contact-form" id="leadForm" action="/api/lead.php" method="POST" novalidate>'
        f'<input type="hidden" name="source" value="/{slug}">'
        '<input type="hidden" name="lang" id="lang_input" value="ar">'
        f'<input type="hidden" name="project_type" value="{pt}">'
        '<div aria-hidden="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">'
        '<label>If you are human leave this empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>'
        '<div class="container-fluid p-0"><div class="row gx-0">'
        f'<div class="col-12 col-md-6 mxd-grid-item anim-uni-in-up"><label class="uc-field-label" for="f-name">{ls("الاسم", "Full name")}</label>'
        '<input type="text" id="f-name" name="name" required maxlength="120" autocomplete="name" placeholder="—"></div>'
        f'<div class="col-12 col-md-6 mxd-grid-item anim-uni-in-up"><label class="uc-field-label" for="f-phone">{ls("رقم الجوّال", "Phone")}</label>'
        '<input type="tel" id="f-phone" name="phone" maxlength="40" dir="ltr" autocomplete="tel" placeholder="+966 5x xxx xxxx"></div>'
        f'<div class="col-12 col-md-6 mxd-grid-item anim-uni-in-up"><label class="uc-field-label" for="f-email">{ls("البريد الإلكتروني", "Email")}</label>'
        '<input type="email" id="f-email" name="email" required maxlength="200" dir="ltr" autocomplete="email" placeholder="you@brand.com"></div>'
        f'<div class="col-12 col-md-6 mxd-grid-item anim-uni-in-up"><label class="uc-field-label" for="f-company">{ls("الجهة / الشركة", "Company / Entity")}</label>'
        '<input type="text" id="f-company" name="company" maxlength="200" autocomplete="organization" placeholder="—"></div>'
        f'<div class="col-12 mxd-grid-item anim-uni-in-up"><label class="uc-field-label" for="f-msg">{ls("نبذة سريعة عن طلبك", "A quick note about your project")}</label>'
        '<textarea id="f-msg" name="brief" required maxlength="4000" placeholder="—"></textarea></div>'
        '<div class="col-12 mxd-grid-item anim-uni-in-up uc-form-submit">'
        f'<button class="btn btn-anim btn-default btn-large btn-opposite slide-right-up" type="submit" id="leadSubmitBtn">{ls("أرسل الطلب", "Send request", "btn-caption")}<i class="ph-bold ph-arrow-up-right"></i></button>'
        f'<a class="btn btn-anim btn-default btn-large btn-additional slide-right-up" href="{wa_url(wa_msg)}" target="_blank" rel="noopener">{ls("أو عبر واتساب", "Or via WhatsApp", "btn-caption")}<i class="ph-bold ph-whatsapp-logo"></i></a>'
        '</div>'
        '</div></div></form>'
        "<script>(function(){var f=document.getElementById('leadForm');if(!f)return;f.addEventListener('submit',function(){var b=document.getElementById('leadSubmitBtn');if(b){setTimeout(function(){b.disabled=true;},0);}});})();</script>"
        '</div></div></div></div></div>'
    )


def trust_logos() -> str:
    imgs = "".join(
        f'<img class="anim-uni-in-up" src="/assets/img/clients/{f}" alt="{e(n)}" loading="lazy" decoding="async" height="40">'
        for f, n in LOGOS
    )
    return section(
        '<div class="mxd-block"><p class="mxd-point-subtitle anim-uni-in-up" style="justify-content:center;text-align:center;margin-bottom:28px">'
        + POINT_SVG + " <span>" + ls("علامات وثقت بهوية", "Brands that have trusted Hawih") + "</span></p>"
        f'<div class="hx-logos">{imgs}</div></div>'
    )


def work_grid(projects: list, tag_ar: str, tag_en: str) -> str:
    cards = []
    for slug, name in projects:
        cards.append(
            '<div class="col-12 col-sm-6 col-lg-4 mxd-project-item anim-uni-in-up">'
            f'<a class="mxd-project-item__media" href="/work-{slug}"><div class="mxd-project-item__preview">'
            f'<img loading="lazy" decoding="async" src="/assets/img/work/{slug}/01.jpeg" alt="{e(name)} — Hawih"></div>'
            f'<div class="mxd-project-item__tags"><span class="tag tag-default tag-permanent">{ls(tag_ar, tag_en)}</span></div></a>'
            f'<div class="mxd-project-item__promo"><div class="mxd-project-item__name">'
            f'<a href="/work-{slug}"><span>{e(name)}</span></a></div></div></div>'
        )
    return section(
        section_title("أعمال نفخر بها", "Work we are proud of",
                      "نماذج حقيقية من مشاريعنا", "Real samples from our projects")
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row g-4 mxd-works-grid">'
        + "".join(cards) + "</div></div>"
        '<div class="mxd-block__cta anim-uni-in-up" style="margin-top:28px;display:flex;gap:14px;flex-wrap:wrap">'
        + btn("/work", "استعرض كل الأعمال", "View all work")
        + btn(PORTFOLIO_PDF, "حمّل ملف الأعمال (PDF)", "Download portfolio (PDF)", style="btn-outline", blank=True, icon="ph-file-pdf")
        + "</div></div>"
    )


def deliverables(items: list, h1_ar: str, h1_en: str) -> str:
    tiles = "".join(
        f'<div class="hx-tile anim-uni-in-up"><i class="ph-bold ph-check-circle"></i><span>{ls(a, b)}</span></div>'
        for a, b in items
    )
    return section(
        section_title("ماذا تستلم", "What you get",
                      h1_ar + " — كل ما تحتاجه", h1_en + " — everything you need")
        + f'<div class="mxd-block"><div class="hx-grid">{tiles}</div></div>'
    )


def process(steps: list) -> str:
    cells = []
    for i, (t_ar, t_en, d_ar, d_en) in enumerate(steps, 1):
        cells.append(
            f'<div class="hx-step anim-uni-in-up"><span class="hx-step__n">{i:02d}</span>'
            f'<h3>{ls(t_ar, t_en)}</h3><p>{ls(d_ar, d_en)}</p></div>'
        )
    return section(
        section_title("طريقة العمل", "How we work",
                      "أربع خطوات واضحة من الفكرة إلى التسليم",
                      "Four clear steps from idea to handover")
        + f'<div class="mxd-block"><div class="hx-steps">{"".join(cells)}</div></div>'
    )


def faq_section(items: list) -> str:
    rows = "".join(
        f'<details class="hx-faq__item anim-uni-in-up"><summary class="hx-faq__q">{ls(q_ar, q_en)}</summary>'
        f'<div class="hx-faq__a"><p>{ls(a_ar, a_en)}</p></div></details>'
        for (q_ar, q_en, a_ar, a_en) in items
    )
    return section(
        section_title("أسئلة شائعة", "Common questions",
                      "ربما يدور في ذهنك", "You might be wondering")
        + f'<div class="mxd-block"><div class="hx-faq">{rows}</div></div>'
    )


def promo_band(caption_ar: str, caption_en: str, wa_msg: str) -> str:
    """The native mxd-promo CTA band, with WhatsApp + portfolio actions."""
    return (
        '      <div class="mxd-section padding-default"><div class="mxd-container grid-container"><div class="mxd-block">'
        '<div class="mxd-promo"><div class="mxd-promo__inner anim-zoom-out-container"><div class="mxd-promo__bg"></div>'
        '<div class="mxd-promo__content"><p class="mxd-promo__title anim-uni-in-up">'
        '<span class="mxd-promo__icon"><img width="300" height="300" loading="lazy" decoding="async" alt="" src="/uc-assets/img/icons/300x300_obj-cta-01.webp"></span>'
        f'<span class="mxd-promo__caption">{ls(caption_ar, caption_en)}</span></p>'
        '<div class="mxd-promo__controls anim-uni-in-up" style="display:flex;gap:14px;flex-wrap:wrap">'
        f'<a class="btn btn-default btn-large btn-additional slide-right-up" href="{wa_url(wa_msg)}" target="_blank" rel="noopener">{ls("تواصل عبر واتساب", "Chat on WhatsApp", "btn-caption")}<i class="ph-bold ph-whatsapp-logo"></i></a>'
        f'<a class="btn btn-default btn-large btn-outline slide-right-up" href="tel:{PHONE}" dir="ltr">{ls("اتصل الآن", "Call now", "btn-caption")}<i class="ph-bold ph-phone"></i></a>'
        '</div></div>'
        '<div class="mxd-promo__images"><img loading="lazy" decoding="async" alt="" class="promo-image promo-image-1" src="/uc-assets/img/illustrations/cta-img-01.webp">'
        '<img loading="lazy" decoding="async" alt="" class="promo-image promo-image-2" src="/uc-assets/img/illustrations/cta-img-02.webp"></div>'
        '</div></div></div></div></div>'
    )


# ---- page renderers ----------------------------------------------------

def render_landing(page: dict, process_steps: list) -> str:
    prefix, main_open, suffix = load_shell()
    head = swap_head(
        prefix, title=page["title"], desc=page["description"],
        keywords=page["keywords"], og_title=page["og_title"],
        og_desc=page["og_desc"], title_en=page["title_en"],
        desc_en=page["description_en"], og_title_en=page["og_title_en"],
        og_desc_en=page["og_desc_en"], extra_style=HX_STYLE)
    wa = page["wa_msg"]
    h1_ar, h1_en = page["h1"]
    ctas = (
        btn(wa_url(wa), "تواصل عبر واتساب", "Chat on WhatsApp", style="btn-opposite", blank=True, icon="ph-whatsapp-logo")
        + btn(f"tel:{PHONE}", "اتصل الآن", "Call now", style="btn-outline", icon="ph-phone")
        + btn(PORTFOLIO_PDF, "ملف الأعمال (PDF)", "Portfolio (PDF)", style="btn-outline", blank=True, icon="ph-file-pdf")
    )
    body = (
        hero(page["eyebrow"][0], page["eyebrow"][1], h1_ar, h1_en,
             page["sub"][0], page["sub"][1], ctas)
        + lead_form(page["slug"], page["pt"], page["form_head"][0],
                    page["form_head"][1], wa)
        + trust_logos()
        + work_grid(page["work"], page["eyebrow"][0].split(" · ")[0],
                    page["eyebrow"][1].split(" · ")[0])
        + deliverables(page["deliverables"], h1_ar, h1_en)
        + process(process_steps)
        + faq_section(page["faq"])
        + promo_band("جاهز نبدأ مشروعك؟", "Ready to start your project?", wa)
    )
    return head + "\n" + main_open + "\n" + body + "\n    </main>\n" + suffix


def render_article(article: dict, link_targets: dict, publish_date: str) -> str:
    prefix, main_open, suffix = load_shell()
    head = swap_head(
        prefix, title=article["title"], desc=article["description"],
        keywords=article["keywords"], og_title=article["kw"][0],
        og_desc=article["description"], title_en=article["title_en"],
        desc_en=article["description_en"], og_title_en=article["kw"][1],
        og_desc_en=article["description_en"], extra_style=HX_STYLE)
    secs = article["sections"]
    toc = "".join(
        f'<li><a href="#s{i}">{ls(s[0], s[1])}</a></li>'
        for i, s in enumerate(secs))
    prose = []
    for i, (h_ar, h_en, paras) in enumerate(secs):
        prose.append(f'<h2 id="s{i}">{ls(h_ar, h_en)}</h2>')
        for p_ar, p_en in paras:
            prose.append(f'<p>{ls(p_ar, p_en)}</p>')
    related = "".join(
        btn(f"/{s}", link_targets[s][0], link_targets[s][1], style="btn-outline")
        for s in article["related"])
    faq = "".join(
        f'<details class="hx-faq__item"><summary class="hx-faq__q">{ls(q_ar, q_en)}</summary>'
        f'<div class="hx-faq__a"><p>{ls(a_ar, a_en)}</p></div></details>'
        for (q_ar, q_en, a_ar, a_en) in article["faq"])
    body = (
        hero("مقال · دليل", "Article · Guide", article["kw"][0], article["kw"][1],
             article["excerpt"][0], article["excerpt"][1],
             btn(f"/{article['related'][0]}", link_targets[article['related'][0]][0],
                 link_targets[article['related'][0]][1], style="btn-opposite"))
        + section(
            '<div class="mxd-block">'
            f'<nav class="hx-toc anim-uni-in-up" aria-label="Contents"><p>{ls("محتويات المقال", "In this article")}</p><ol>{toc}</ol></nav>'
            f'<div class="hx-prose">{"".join(prose)}</div>'
            f'<div class="hx-related">{ls("خدمات ذات صلة:", "Related services:")} {related}</div>'
            '</div>')
        + faq_section_from(faq)
        + promo_band("عندك مشروع في ذهنك؟", "Got a project in mind?",
                     "مرحباً، قرأت مقالكم وأرغب باستشارة حول مشروعي.")
    )
    return head + "\n" + main_open + "\n" + body + "\n    </main>\n" + suffix


def faq_section_from(rows_html: str) -> str:
    return section(
        section_title("أسئلة شائعة", "Frequently asked questions",
                      "إجابات سريعة", "Quick answers")
        + f'<div class="mxd-block"><div class="hx-faq">{rows_html}</div></div>'
    )
