#!/usr/bin/env python3
"""
_shell.py — shared renderer that builds landing pages and articles ON the
official Hawih template, using the template's NATIVE section patterns so
the pages look identical to the real service pages (e.g. service-brand).

It clones the real shell from a donor page (about.html) — head CSS chain,
loader, hamburger + mobile menu, mxd-header, mxd-footer, scripts — and
injects content into <main> built from the template's own components:

  - hero:        mxd-section-inner-headline, col-xl-7 H1 + col-xl-5 descr
  - section head: mxd-section-title (col-6 title + col-6 descr)
  - text block:  col-xl-5 h2 + col-xl-6 body (t-large t-bright)
  - process:     mxd-approach-list (image col-2 + title col-4 + descr col-6)
  - work grid:   mxd-project-item cards (as on work.html)
  - CTA band:    mxd-promo
  - lead form:   the native contact-form markup (project_type pre-filled)

Almost no custom CSS — the template's typography/spacing do the work, so
sizes and alignment match the rest of the site. Used by
build-landing-pages.py and build-articles.py.
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

LOGOS = [
    ("king-saud-university.webp", "King Saud University"),
    ("hoshan.png", "Hoshan"), ("makaseb.png", "Makaseb"),
    ("camel-club.png", "Camel Club"), ("awan-square.png", "Awan"),
    ("nab.png", "NAB"), ("riwaq.png", "Riwaq"), ("almasar.png", "Almasar"),
]


def e(s: str) -> str:
    return html.escape(s, quote=True)


def ls(ar: str, en: str, cls: str = "") -> str:
    klass = ("lang-string " + cls).strip()
    return (f'<span class="{klass}" data-ar="{e(ar)}" data-en="{e(en)}">'
            f'{e(ar)}</span>')


def wa_url(msg: str) -> str:
    return f"https://wa.me/{WA_NUMBER}?text={quote(msg)}"


ARROW = '<i class="ph-bold ph-arrow-up-right" aria-hidden="true"></i>'


# ---- shell load / head swap -------------------------------------------

_SHELL = None


def load_shell() -> tuple[str, str, str]:
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


# Minimal scoped CSS — ONLY for things the template doesn't already style.
HX_STYLE = """    <!-- hx: minimal scoped styles (layout helpers only, no type sizes) -->
    <style>
    .hx-cta{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}
    .hx-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:26px 46px}
    .hx-logos img{height:42px;width:auto;opacity:.5;filter:grayscale(1);transition:opacity .25s ease,filter .25s ease}
    .hx-logos img:hover{opacity:1;filter:grayscale(0)}
    .hx-deliver li{display:flex;align-items:flex-start;gap:.6em;margin:0 0 .85em}
    .hx-deliver i{color:var(--hawih-blue,#1F1FFE);font-size:1.4rem;line-height:1.4;flex:none}
    .hx-deliver ul{list-style:none;margin:0;padding:0}
    .hx-card{display:flex;flex-direction:column;gap:10px;height:100%;padding:30px;border:1px solid var(--hawih-paper-line,rgba(11,11,16,.12));border-radius:20px;background:var(--hawih-paper-2,#E9E4D7);text-decoration:none;color:inherit;transition:transform .2s ease}
    .hx-card:hover{transform:translateY(-4px)}
    .dark .hx-card{background:var(--hawih-ink-2,#14141C);border-color:var(--hawih-ink-line,rgba(255,255,255,.08))}
    .hx-card__more{color:var(--hawih-blue,#1F1FFE);font-weight:600;margin-top:auto}
    @media (max-width:575px){.hx-cta .btn{flex:1 1 100%;justify-content:center}}
    </style>"""


def swap_head(prefix: str, *, title: str, desc: str, keywords: str,
              og_title: str, og_desc: str, title_en: str, desc_en: str,
              og_title_en: str, og_desc_en: str) -> str:
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
    p = p.replace("</head>", HX_STYLE + "\n  </head>", 1)
    return p


# ---- native components ------------------------------------------------

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


def btn(href: str, label_ar: str, label_en: str, variant: str = "btn-default",
        blank: bool = False, icon: str = "ph-arrow-up-right",
        extra: str = "") -> str:
    tgt = ' target="_blank" rel="noopener"' if blank else ""
    ic = f'<i class="ph-bold {icon}"></i>' if icon else ""
    # caption = single span with both classes (nested span breaks btn-anim).
    return (f'<a class="btn btn-anim btn-default {variant} btn-large '
            f'slide-right-up" href="{href}"{tgt}{extra}>'
            f'{ls(label_ar, label_en, "btn-caption")}{ic}</a>')


def open_section(pad: str = "padding-default", extra: str = "") -> str:
    return (f'      <div class="mxd-section {extra} {pad}">'
            '<div class="mxd-container grid-container">')


CLOSE_SECTION = "</div></div>"


def section_title(t_ar: str, t_en: str, d_ar: str, d_en: str) -> str:
    return (
        '<div class="mxd-block"><div class="mxd-section-title">'
        '<div class="container-fluid p-0"><div class="row g-0">'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin">'
        f'<div class="mxd-section-title__hrtitle"><h2>{ls(t_ar, t_en)}</h2></div></div>'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin">'
        f'<div class="mxd-section-title__hrdescr"><p class="anim-uni-in-up">{ls(d_ar, d_en)}</p></div></div>'
        '</div></div></div></div>'
    )


def hero(eyebrow_ar, eyebrow_en, h1_ar, h1_en, descr_ar, descr_en,
         ctas_html) -> str:
    return (
        '      <div class="mxd-section mxd-section-inner-headline padding-headline-pre-block">'
        '<div class="mxd-container grid-container"><div class="mxd-block loading-wrap">'
        '<div class="container-fluid px-0"><div class="row gx-0">'
        '<div class="col-12"></div>'
        '<div class="col-12 col-xl-7 mxd-grid-item no-margin"><div class="mxd-block__content">'
        '<div class="mxd-block__inner-headline loading__item">'
        f'<p class="mxd-point-subtitle">{POINT_SVG} <span>{ls(eyebrow_ar, eyebrow_en)}</span></p>'
        f'<h1 class="inner-headline__title">{ls(h1_ar, h1_en)}</h1>'
        '</div></div></div>'
        '<div class="col-12 col-xl-5 mxd-grid-item no-margin"><div class="mxd-block__content">'
        '<div class="inner-headline__descr loading__item">'
        f'<p>{ls(descr_ar, descr_en)}</p>'
        f'<div class="hx-cta loading__item">{ctas_html}</div>'
        '</div></div></div>'
        '</div></div></div></div></div>'
    )


def text_block(title_ar, title_en, body_html, pad="padding-default") -> str:
    return (
        open_section(pad)
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row gx-0">'
        '<div class="col-12 col-xl-5 mxd-grid-item no-margin"><div class="mxd-block__name">'
        f'<h2 class="anim-uni-in-up">{ls(title_ar, title_en)}</h2></div></div>'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-block__content">'
        f'<div class="mxd-block__paragraph">{body_html}</div></div></div>'
        '</div></div></div>' + CLOSE_SECTION
    )


def lead_form(slug, pt, head_ar, head_en, wa_msg) -> str:
    return (
        open_section("padding-default", "mxd-section-inner-form overflow-hidden")
        + section_title(head_ar, head_en,
                        "نموذج موجز يصل فريقنا مباشرة، ونرد خلال يوم عمل.",
                        "A short brief reaches our team directly; we reply within one working day.")
        + '<div class="mxd-block"><div class="mxd-block__inner-form"><div class="form-container">'
        '<form class="form contact-form" id="leadForm" action="/api/lead.php" method="POST" novalidate>'
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
        '</div></div></div></form>'
        "<script>(function(){var f=document.getElementById('leadForm');if(!f)return;f.addEventListener('submit',function(){var b=document.getElementById('leadSubmitBtn');if(b){setTimeout(function(){b.disabled=true;},0);}});})();</script>"
        '</div></div></div>' + CLOSE_SECTION
    )


def trust_logos() -> str:
    imgs = "".join(
        f'<img class="anim-uni-in-up" src="/assets/img/clients/{f}" alt="{e(n)}" loading="lazy" decoding="async" height="42">'
        for f, n in LOGOS)
    return (
        open_section("padding-default")
        + '<div class="mxd-block"><p class="mxd-point-subtitle anim-uni-in-up" style="justify-content:center;text-align:center;margin-bottom:30px">'
        + POINT_SVG + " <span>" + ls("علامات وثقت بهوية", "Brands that have trusted Hawih") + "</span></p>"
        f'<div class="hx-logos">{imgs}</div></div>' + CLOSE_SECTION
    )


def work_grid(projects, tag_ar, tag_en) -> str:
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
    return (
        open_section("padding-default", "overflow-hidden")
        + section_title("أعمال نفخر بها", "Work we are proud of",
                        "نماذج حقيقية من مشاريعنا", "Real samples from our projects")
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row g-4 mxd-works-grid">'
        + "".join(cards) + "</div></div>"
        + '<div class="anim-uni-in-up" style="margin-top:30px;display:flex;gap:14px;flex-wrap:wrap">'
        + btn("/work", "استعرض كل الأعمال", "View all work", "btn-outline")
        + btn(PORTFOLIO_PDF, "حمّل ملف الأعمال (PDF)", "Download portfolio (PDF)", "btn-outline", blank=True, icon="ph-file-pdf")
        + "</div></div>" + CLOSE_SECTION
    )


def deliverables(items, kw_ar, kw_en) -> str:
    lis = "".join(
        f'<li class="anim-uni-in-up"><i class="ph-bold ph-check-circle"></i>'
        f'<span class="t-large">{ls(a, b)}</span></li>'
        for a, b in items)
    body = f'<ul>{lis}</ul>'
    return (
        open_section("padding-default", "hx-deliver")
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row gx-0">'
        '<div class="col-12 col-xl-5 mxd-grid-item no-margin"><div class="mxd-block__name">'
        f'<h2 class="anim-uni-in-up">{ls("ماذا تستلم", "What you get")}</h2>'
        f'<p class="anim-uni-in-up" style="margin-top:14px">{ls(kw_ar + " — كل ما تحتاجه.", kw_en + " — everything you need.")}</p></div></div>'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-block__content">'
        f'{body}</div></div>'
        '</div></div></div>' + CLOSE_SECTION
    )


def process(steps) -> str:
    items = []
    for i, (t_ar, t_en, d_ar, d_en) in enumerate(steps, 1):
        items.append(
            '<div class="mxd-approach-list__item">'
            + ('<div class="mxd-approach-list__border anim-uni-in-up"></div>' if i == 1 else '')
            + '<div class="mxd-approach-list__inner"><div class="container-fluid px-0"><div class="row gx-0">'
            f'<div class="col-12 col-xl-2 mxd-grid-item no-margin"><div class="mxd-approach-list__image anim-uni-in-up">'
            f'<img loading="lazy" decoding="async" alt="" src="/uc-assets/img/icons/h70_appr-0{i}.webp"></div></div>'
            f'<div class="col-12 col-xl-4 mxd-grid-item no-margin"><div class="mxd-approach-list__title anim-uni-in-up"><h6>{ls(t_ar, t_en)}</h6></div></div>'
            f'<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-approach-list__descr anim-uni-in-up"><p>{ls(d_ar, d_en)}</p></div></div>'
            '</div></div></div>'
            '<div class="mxd-approach-list__border anim-uni-in-up"></div></div>'
        )
    return (
        open_section("padding-default")
        + section_title("طريقة العمل", "How we work",
                        "أربع خطوات واضحة من الفكرة إلى التسليم",
                        "Four clear steps from idea to handover")
        + '<div class="mxd-block"><div class="mxd-approach-list">'
        + "".join(items) + "</div></div>" + CLOSE_SECTION
    )


def faq(items) -> str:
    rows = []
    for q_ar, q_en, a_ar, a_en in items:
        rows.append(
            '<div class="mxd-block" style="margin-top:8px"><div class="container-fluid px-0"><div class="row gx-0">'
            f'<div class="col-12 col-xl-5 mxd-grid-item no-margin"><div class="mxd-block__name"><h4 class="anim-uni-in-up">{ls(q_ar, q_en)}</h4></div></div>'
            f'<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-block__content"><div class="mxd-block__paragraph"><p class="anim-uni-in-up">{ls(a_ar, a_en)}</p></div></div></div>'
            '</div></div></div>'
        )
    return (
        open_section("padding-default")
        + section_title("أسئلة شائعة", "Common questions",
                        "إجابات سريعة عمّا قد يدور في ذهنك",
                        "Quick answers to what you might be wondering")
        + "".join(rows) + CLOSE_SECTION
    )


def promo_band(caption_ar, caption_en, wa_msg) -> str:
    return (
        open_section("padding-pre-footer", "overflow-hidden")
        + '<div class="mxd-block"><div class="mxd-promo"><div class="mxd-promo__inner anim-zoom-out-container">'
        '<div class="mxd-promo__bg"></div><div class="mxd-promo__content">'
        '<p class="mxd-promo__title anim-uni-in-up"><span class="mxd-promo__icon">'
        '<img width="300" height="300" loading="lazy" decoding="async" alt="" src="/uc-assets/img/icons/300x300_obj-cta-01.webp"></span>'
        f'<span class="mxd-promo__caption">{ls(caption_ar, caption_en)}</span></p>'
        '<div class="mxd-promo__controls anim-uni-in-up">'
        f'<a class="btn btn-default btn-large btn-additional slide-right-up" href="{wa_url(wa_msg)}" target="_blank" rel="noopener">{ls("تواصل عبر واتساب", "Chat on WhatsApp", "btn-caption")}<i class="ph-bold ph-whatsapp-logo"></i></a>'
        f'<a class="btn btn-default btn-large btn-outline slide-right-up" href="tel:{PHONE}" dir="ltr">{ls("اتصل الآن", "Call now", "btn-caption")}<i class="ph-bold ph-phone"></i></a>'
        '</div></div>'
        '<div class="mxd-promo__images"><img loading="lazy" decoding="async" alt="" class="promo-image promo-image-1" src="/uc-assets/img/illustrations/cta-img-01.webp">'
        '<img loading="lazy" decoding="async" alt="" class="promo-image promo-image-2" src="/uc-assets/img/illustrations/cta-img-02.webp"></div>'
        '</div></div></div>' + CLOSE_SECTION
    )


# ---- page renderers ----------------------------------------------------

def render_landing(page: dict, process_steps: list) -> str:
    prefix, main_open, suffix = load_shell()
    head = swap_head(
        prefix, title=page["title"], desc=page["description"],
        keywords=page["keywords"], og_title=page["og_title"],
        og_desc=page["og_desc"], title_en=page["title_en"],
        desc_en=page["description_en"], og_title_en=page["og_title_en"],
        og_desc_en=page["og_desc_en"])
    wa = page["wa_msg"]
    h1_ar, h1_en = page["h1"]
    ctas = (
        btn(wa_url(wa), "تواصل عبر واتساب", "Chat on WhatsApp", "btn-opposite", blank=True, icon="ph-whatsapp-logo")
        + btn(f"tel:{PHONE}", "اتصل الآن", "Call now", "btn-outline", icon="ph-phone", extra=' dir="ltr"')
        + btn(PORTFOLIO_PDF, "ملف الأعمال (PDF)", "Portfolio (PDF)", "btn-outline", blank=True, icon="ph-file-pdf")
    )
    tag_ar = page["eyebrow"][0].split(" · ")[0]
    tag_en = page["eyebrow"][1].split(" · ")[0]
    body = (
        hero(page["eyebrow"][0], page["eyebrow"][1], h1_ar, h1_en,
             page["sub"][0], page["sub"][1], ctas)
        + lead_form(page["slug"], page["pt"], page["form_head"][0], page["form_head"][1], wa)
        + trust_logos()
        + work_grid(page["work"], tag_ar, tag_en)
        + deliverables(page["deliverables"], h1_ar, h1_en)
        + process(process_steps)
        + faq(page["faq"])
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
        og_desc_en=article["description_en"])
    first = article["related"][0]
    cta = btn(f"/{first}", link_targets[first][0], link_targets[first][1],
              "btn-opposite")
    body = [hero("مقال · دليل", "Article · Guide", article["kw"][0], article["kw"][1],
                 article["excerpt"][0], article["excerpt"][1], cta)]
    for h_ar, h_en, paras in article["sections"]:
        para_html = "".join(
            f'<p class="t-large t-bright anim-uni-in-up">{ls(p_ar, p_en)}</p>'
            for p_ar, p_en in paras)
        body.append(text_block(h_ar, h_en, para_html))
    # related services
    related_btns = "".join(
        btn(f"/{s}", link_targets[s][0], link_targets[s][1], "btn-outline")
        for s in article["related"])
    body.append(
        open_section("padding-default")
        + '<div class="mxd-block"><div class="container-fluid px-0"><div class="row gx-0">'
        f'<div class="col-12 col-xl-5 mxd-grid-item no-margin"><div class="mxd-block__name"><h2 class="anim-uni-in-up">{ls("خدمات ذات صلة", "Related services")}</h2></div></div>'
        '<div class="col-12 col-xl-6 mxd-grid-item no-margin"><div class="mxd-block__content">'
        f'<div class="hx-cta">{related_btns}</div></div></div>'
        '</div></div></div>' + CLOSE_SECTION)
    body.append(faq(article["faq"]))
    body.append(promo_band("عندك مشروع في ذهنك؟", "Got a project in mind?",
                           "مرحباً، قرأت مقالكم وأرغب باستشارة حول مشروعي."))
    return head + "\n" + main_open + "\n" + "".join(body) + "\n    </main>\n" + suffix
