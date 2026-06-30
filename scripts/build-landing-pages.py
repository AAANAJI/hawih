#!/usr/bin/env python3
"""
build-landing-pages.py — Hawih PPC / SEO service landing pages.

Generates a small set of lean, conversion-focused, bilingual landing
pages — one per Google Ads ad group — at the repo root:

  logo-design.html      brand-identity.html   company-profile.html
  website-design.html   content-writing.html

Why these are NOT cloned from service-*.html:
  The marketing pages load the full uc-assets template (plugins.min.css,
  main.min.css, libs.min.js, app.min.js) plus a ~1,200-line inline
  <style> block — great for the site, far too heavy for a paid-traffic
  landing page where load time directly drives Quality Score and
  conversion rate. These pages are self-contained: brand tokens + all
  component CSS inline, the shared brand fonts, and assets/js/hawih.js
  for the conversion plumbing (UTM/gclid capture, lead-form recovery,
  the floating WhatsApp button, and the GTM dataLayer events
  whatsapp_click / phone_call_click / email_click / lead_form_submit).

Each page:
  - leads with the EXACT ad-group keyword in the H1 (Arabic primary,
    English in the /en mirror),
  - puts one clear action (WhatsApp) above the fold, with the short lead
    form alongside it,
  - is mobile-first and RTL-correct,
  - posts to /api/lead.php with project_type pre-filled so the lead is
    auto-tagged in the CRM (see api/lead.php $PT_MAP).

These files are the SOURCE (pre-pipeline). After running this script,
run the normal SEO pipeline to decorate them and build the /en mirror:

    python3 scripts/build-landing-pages.py
    python3 scripts/build-en-mirror.py
    python3 scripts/inject-head.py
    python3 scripts/inject-jsonld.py
    python3 scripts/generate-sitemap.py
    python3 scripts/version-assets.py

Idempotent: re-running overwrites the AR root files in place.
"""
from __future__ import annotations

import html
import json
from pathlib import Path
from urllib.parse import quote

REPO_ROOT = Path(__file__).resolve().parent.parent

PHONE = "+966502185471"
PHONE_DISPLAY = "+966 50 218 5471"
WA_NUMBER = "966502185471"
EMAIL = "admin@hawih.com.sa"
PORTFOLIO_PDF = "/assets/files/Hawih-Profile.pdf"
DOC_SVG = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
           'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
           'stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 '
           '0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>'
           '<path d="M14 2v6h6"/></svg>')

# Client logos shown in the trust strip (files live in assets/img/clients/).
LOGOS = [
    ("king-saud-university.webp", "King Saud University"),
    ("hoshan.png", "Hoshan"),
    ("makaseb.png", "Makaseb"),
    ("camel-club.png", "Camel Club"),
    ("awan-square.png", "Awan"),
    ("nab.png", "NAB"),
    ("riwaq.png", "Riwaq"),
    ("almasar.png", "Almasar"),
]

# Shared trust chips (AR, EN).
CHIPS = [
    ("خبرة منذ ٢٠٠٧", "Experience since 2007"),
    ("أكثر من ٢٤ مشروع علامة", "24+ brand projects"),
    ("ردّ خلال يوم عمل", "Reply within one working day"),
]

# Shared process steps (AR title, EN title, AR desc, EN desc).
PROCESS = [
    ("الاكتشاف", "Discovery",
     "نفهم نشاطك وجمهورك وأهدافك في جلسة قصيرة.",
     "We learn your business, audience, and goals in a short session."),
    ("التوجّه", "Direction",
     "نتّفق على الاتجاه والمراجع قبل أي تنفيذ.",
     "We agree on direction and references before any execution."),
    ("التصميم", "Design",
     "ننفّذ ونعرض مقترحات واضحة مع جولات مراجعة.",
     "We design and present clear options with review rounds."),
    ("التسليم", "Delivery",
     "نسلّم الملفات المفتوحة ودليل الاستخدام جاهزة للعمل.",
     "We hand off open files and a usage guide, ready to use."),
]

# ---- per-page content -------------------------------------------------

PAGES = [
    {
        "slug": "logo-design",
        "pt": "logo-design",
        "title": "تصميم شعار احترافي في الرياض | هوية Hawih",
        "description": "تصميم شعار احترافي يعبّر عن علامتك بهوية بصرية مدروسة. "
                       "استوديو هوية في الرياض — خبرة منذ ٢٠٠٧. اطلب شعارك "
                       "الآن ونرد خلال يوم عمل.",
        "keywords": "تصميم شعار, تصميم لوقو, شعار احترافي, تصميم شعارات الرياض, "
                    "logo design riyadh, hawih",
        "og_title": "تصميم شعار احترافي | هوية Hawih",
        "og_desc": "شعار يعبّر عن علامتك — من استوديو هوية، خبرة منذ ٢٠٠٧.",
        "title_en": "Professional Logo Design in Riyadh | Hawih",
        "description_en": "Professional logo design that captures your brand "
                          "— crafted with care, delivered in every format. "
                          "Hawih, a Saudi studio since 2007. Request your "
                          "logo; we reply within one working day.",
        "og_title_en": "Professional Logo Design | Hawih",
        "og_desc_en": "A logo that captures your brand — from Hawih studio, "
                      "since 2007.",
        "eyebrow": ("تصميم الشعارات · الرياض", "Logo design · Riyadh"),
        "h1": ("تصميم شعار", "Logo Design"),
        "sub": ("شعار يعبّر عن شخصية علامتك ويبقى راسخاً في ذهن عميلك — "
                "مصمَّم بعناية، بصيغ جاهزة لكل استخدام.",
                "A logo that captures your brand's character and stays in "
                "your customer's mind — crafted with care, delivered in "
                "every format you need."),
        "wa_msg": "مرحباً، أرغب بتصميم شعار لعلامتي.",
        "form_head": ("اطلب تصميم شعارك", "Request your logo"),
        "deliverables": [
            ("مفهوم شعار أساسي + نسخ بديلة",
             "A primary logo concept + alternatives"),
            ("نسخ أفقية وعمودية وأيقونة",
             "Horizontal, vertical & icon versions"),
            ("ملفات متجهة (AI / SVG / PDF)",
             "Vector files (AI / SVG / PDF)"),
            ("نسخ ملوّنة وأحادية للطباعة والشاشة",
             "Colour & mono versions for print and screen"),
            ("دليل استخدام مختصر للشعار",
             "A short logo usage guide"),
            ("ملكية كاملة للملفات المصدرية",
             "Full ownership of the source files"),
        ],
        "faq": [
            ("كم يستغرق تصميم الشعار؟",
             "How long does a logo take?",
             "يعتمد على نطاق العمل، لكن معظم مشاريع الشعار تكتمل خلال أيام "
             "إلى أسبوعين بعد اعتماد الاتجاه.",
             "It depends on scope, but most logo projects finish within a "
             "few days to two weeks after the direction is approved."),
            ("هل أحصل على الملفات المفتوحة؟",
             "Do I get the open files?",
             "نعم، نسلّمك الملفات المتجهة المفتوحة وحقوق الاستخدام كاملة "
             "دون رسوم إضافية.",
             "Yes — you receive the open vector files and full usage rights "
             "with no extra fees."),
            ("كم عدد المقترحات وجولات التعديل؟",
             "How many concepts and revisions?",
             "نتّفق على عدد المقترحات وجولات المراجعة في بداية المشروع حتى "
             "تكون الصورة واضحة من البداية.",
             "We agree on the number of concepts and review rounds at the "
             "start so expectations are clear from day one."),
            ("هل تعملون خارج الرياض؟",
             "Do you work outside Riyadh?",
             "نعم، نخدم عملاء في كل أنحاء السعودية ودول الخليج — والعمل يتم "
             "عن بُعد بسلاسة.",
             "Yes — we serve clients across Saudi Arabia and the GCC; "
             "everything runs smoothly remotely."),
        ],
        "work": [("jazl", "Jazl"), ("nab", "NAB"), ("karmello", "Karmello")],
    },
    {
        "slug": "brand-identity",
        "pt": "brand-identity",
        "title": "تصميم هوية بصرية متكاملة في الرياض | هوية Hawih",
        "description": "هوية بصرية متكاملة: شعار، ألوان، خطوط، ونظام تطبيق "
                       "واضح. استوديو هوية في الرياض — خبرة منذ ٢٠٠٧. ابدأ "
                       "هويتك ونرد خلال يوم عمل.",
        "keywords": "تصميم هوية بصرية, هوية تجارية, تصميم براند, "
                    "brand identity riyadh, هوية الرياض, hawih",
        "og_title": "تصميم هوية بصرية متكاملة | هوية Hawih",
        "og_desc": "نظام هوية متكامل يميّز علامتك — استوديو هوية، منذ ٢٠٠٧.",
        "title_en": "Full Brand Identity Design in Riyadh | Hawih",
        "description_en": "Complete brand identity: logo, colours, type, and "
                          "a clear application system. Hawih, a Saudi studio "
                          "since 2007. Start your identity; we reply within "
                          "one working day.",
        "og_title_en": "Full Brand Identity Design | Hawih",
        "og_desc_en": "A complete identity system that sets your brand apart "
                      "— Hawih, since 2007.",
        "eyebrow": ("الهوية البصرية · الرياض", "Brand identity · Riyadh"),
        "h1": ("الهوية البصرية", "Brand Identity"),
        "sub": ("نظام بصري متكامل — من الشعار إلى الألوان والخطوط وقواعد "
                "التطبيق — يجعل علامتك متّسقة ومميّزة عبر كل نقطة تواصل.",
                "A complete visual system — from logo to colour, type, and "
                "application rules — that keeps your brand consistent and "
                "distinct across every touchpoint."),
        "wa_msg": "مرحباً، أرغب بتصميم هوية بصرية متكاملة لعلامتي.",
        "form_head": ("ابدأ هويتك البصرية", "Start your brand identity"),
        "deliverables": [
            ("شعار متكامل بكل نسخه", "A complete logo in all its versions"),
            ("لوحة ألوان وخطوط معتمدة",
             "An approved colour & typography palette"),
            ("عناصر بصرية ونمط أيقونات", "Visual elements and an icon style"),
            ("تطبيقات (مطبوعات، سوشيال، أوراق رسمية)",
             "Applications (print, social, stationery)"),
            ("دليل هوية يوضّح قواعد الاستخدام",
             "A brand guideline covering usage rules"),
            ("ملفات مفتوحة جاهزة للفريق والمطبعة",
             "Open files ready for your team and printers"),
        ],
        "faq": [
            ("ما الفرق بين الشعار والهوية البصرية؟",
             "What's the difference between a logo and a brand identity?",
             "الشعار جزء من الهوية. الهوية البصرية نظام كامل يشمل الشعار "
             "والألوان والخطوط والعناصر وقواعد تطبيقها على كل وسائطك.",
             "A logo is one part of an identity. A brand identity is the "
             "full system — logo, colours, type, elements, and the rules "
             "for applying them across all your media."),
            ("كم يستغرق مشروع الهوية؟",
             "How long does an identity project take?",
             "مشاريع الهوية المتكاملة تستغرق عادةً عدة أسابيع حسب النطاق "
             "وعدد التطبيقات المطلوبة.",
             "Full identity projects usually take several weeks depending "
             "on scope and the number of applications required."),
            ("هل أحصل على دليل الهوية والملفات المصدرية؟",
             "Do I get the brand guide and source files?",
             "نعم، تستلم دليل الهوية وكل الملفات المفتوحة وحقوق استخدامها "
             "كاملة.",
             "Yes — you receive the brand guideline, all open files, and "
             "full rights to use them."),
            ("لديّ هوية قديمة، هل تطوّرونها؟",
             "I have an old identity — can you refresh it?",
             "نعم، نوازن بين تطوير علامتك والحفاظ على ما يعرفه جمهورك عنها "
             "دون فقدان الرصيد المتراكم.",
             "Yes — we evolve your brand while keeping what your audience "
             "already recognises, without losing its equity."),
        ],
        "work": [("riwaq", "Riwaq"), ("almasar", "Almasar"),
                 ("athr", "Athr")],
    },
    {
        "slug": "company-profile",
        "pt": "company-profile",
        "title": "تصميم بروفايل شركة احترافي (ملف تعريفي) | هوية Hawih",
        "description": "تصميم بروفايل شركة وملف تعريفي احترافي يعرض خدماتك "
                       "بثقة — تصميم وتنسيق ثنائي اللغة. استوديو هوية، "
                       "خبرة منذ ٢٠٠٧.",
        "keywords": "بروفايل شركة, ملف تعريفي, تصميم بروفايل, "
                    "company profile design, ملف الشركة, hawih",
        "og_title": "تصميم بروفايل شركة احترافي | هوية Hawih",
        "og_desc": "ملف تعريفي يعرض شركتك بثقة — ثنائي اللغة، من استوديو هوية.",
        "title_en": "Professional Company Profile Design | Hawih",
        "description_en": "Professional, bilingual company profile design that "
                          "presents your services with confidence. Hawih "
                          "studio, since 2007. Request your profile; we reply "
                          "within one working day.",
        "og_title_en": "Professional Company Profile Design | Hawih",
        "og_desc_en": "A profile that presents your company with confidence "
                      "— bilingual, from Hawih studio.",
        "eyebrow": ("البروفايل والملف التعريفي · الرياض",
                    "Company profile · Riyadh"),
        "h1": ("بروفايل شركة", "Company Profile"),
        "sub": ("ملف تعريفي مصمَّم بعناية يقدّم شركتك وخدماتك بثقة — بتنسيق "
                "واضح وثنائي اللغة، جاهز للطباعة والعرض الرقمي.",
                "A carefully designed profile that presents your company and "
                "services with confidence — clear, bilingual layout, ready "
                "for print and digital."),
        "wa_msg": "مرحباً، أرغب بتصميم بروفايل/ملف تعريفي لشركتي.",
        "form_head": ("اطلب بروفايل شركتك", "Request your company profile"),
        "deliverables": [
            ("تصميم غلاف وصفحات داخلية متّسقة",
             "Cover and consistent inner-page design"),
            ("تنسيق المحتوى والصور باحترافية",
             "Professional content and image layout"),
            ("نسخة عربية وإنجليزية", "Arabic and English versions"),
            ("ملف PDF تفاعلي + نسخة للطباعة",
             "An interactive PDF + a print-ready version"),
            ("إنفوجرافيك ورسوم لعرض الأرقام",
             "Infographics to present key numbers"),
            ("ملفات مفتوحة قابلة للتحديث", "Open, updatable source files"),
        ],
        "faq": [
            ("هل تكتبون المحتوى أم أوفّره أنا؟",
             "Do you write the content or do I provide it?",
             "يمكننا التنسيق على محتواك الجاهز، أو نساعدك في صياغته وترتيبه "
             "— أخبرنا بما يناسبك.",
             "We can lay out your ready content, or help you write and "
             "structure it — tell us what suits you."),
            ("كم صفحة يتضمّن البروفايل؟",
             "How many pages does a profile include?",
             "يعتمد على نشاطك ومحتواك؛ نتّفق على عدد الصفحات والأقسام في "
             "بداية المشروع.",
             "It depends on your business and content; we agree on page "
             "count and sections at the start."),
            ("هل التصميم ثنائي اللغة فعلاً؟",
             "Is the design truly bilingual?",
             "نعم، نصمّم العربية والإنجليزية معاً منذ البداية — وليست ترجمة "
             "لاحقة مقحَمة على التصميم.",
             "Yes — we design Arabic and English together from the start, "
             "not a translation bolted on afterward."),
            ("هل أستطيع تحديث البروفايل لاحقاً؟",
             "Can I update the profile later?",
             "نعم، نسلّمك الملفات المفتوحة لتحدّث الأرقام والمحتوى عند الحاجة.",
             "Yes — we hand off the open files so you can update numbers and "
             "content whenever you need."),
        ],
        "work": [("oversight", "Oversight"), ("leader", "Leader"),
                 ("direct", "Direct")],
    },
    {
        "slug": "website-design",
        "pt": "website-design",
        "title": "تصميم مواقع إلكترونية احترافية في الرياض | هوية Hawih",
        "description": "تصميم موقع إلكتروني احترافي وسريع وثنائي اللغة، "
                       "متوافق مع الجوال ويحوّل الزوّار إلى عملاء. استوديو "
                       "هوية في الرياض — منذ ٢٠٠٧.",
        "keywords": "تصميم موقع, تصميم مواقع, تصميم موقع الكتروني, "
                    "website design riyadh, تصميم متجر, hawih",
        "og_title": "تصميم مواقع إلكترونية احترافية | هوية Hawih",
        "og_desc": "موقع سريع ثنائي اللغة يحوّل الزوّار إلى عملاء — استوديو هوية.",
        "title_en": "Professional Website Design in Riyadh | Hawih",
        "description_en": "Fast, bilingual, mobile-friendly website design "
                          "that turns visitors into customers. Hawih, a Saudi "
                          "studio in Riyadh since 2007.",
        "og_title_en": "Professional Website Design | Hawih",
        "og_desc_en": "A fast, bilingual website that turns visitors into "
                      "customers — from Hawih.",
        "eyebrow": ("تصميم المواقع · الرياض", "Website design · Riyadh"),
        "h1": ("تصميم موقع إلكتروني", "Website Design"),
        "sub": ("موقع سريع ومتوافق مع الجوال وثنائي اللغة — مصمَّم حول رحلة "
                "عميلك ليحوّل الزيارة إلى تواصل فعلي.",
                "A fast, mobile-friendly, bilingual website — designed "
                "around your customer's journey to turn a visit into a real "
                "enquiry."),
        "wa_msg": "مرحباً، أرغب بتصميم موقع إلكتروني.",
        "form_head": ("ابدأ تصميم موقعك", "Start your website"),
        "deliverables": [
            ("تصميم واجهات حديثة (UI) لكل الصفحات",
             "Modern UI design for every page"),
            ("تجربة استخدام مدروسة (UX)",
             "A considered user experience (UX)"),
            ("تصميم متجاوب مع الجوال أولاً",
             "Mobile-first responsive design"),
            ("دعم العربية والإنجليزية (RTL / LTR)",
             "Arabic & English support (RTL / LTR)"),
            ("بنية واضحة تركّز على التحويل",
             "A clear structure focused on conversion"),
            ("ملفات تصميم جاهزة للتطوير",
             "Design files ready for development"),
        ],
        "faq": [
            ("هل تبرمجون الموقع أم التصميم فقط؟",
             "Do you build the site or just design it?",
             "نركّز على التصميم والتجربة (UI/UX). أمّا التطوير والبرمجة "
             "فيتولّاها فريق شفرة الشقيق المتخصّص — ونصلك بالفريق المناسب.",
             "We focus on design and experience (UI/UX). Development is "
             "handled by our specialised sister studio, Shfrah, and we "
             "connect you to the right team."),
            ("هل الموقع متوافق مع الجوال؟",
             "Is the site mobile-friendly?",
             "نعم، نصمّم بمنهجية الجوال أولاً لأن معظم الزيارات في السعودية "
             "تأتي من الجوال.",
             "Yes — we design mobile-first, since most traffic in Saudi "
             "Arabia comes from mobile."),
            ("هل يدعم الموقع العربية والإنجليزية؟",
             "Does the site support Arabic and English?",
             "نعم، نصمّم الاتجاهين (RTL وLTR) معاً مع خطوط مناسبة لكل لغة.",
             "Yes — we design both directions (RTL and LTR) together, with "
             "type suited to each language."),
            ("كم يستغرق تصميم الموقع؟",
             "How long does website design take?",
             "يعتمد على عدد الصفحات والنطاق؛ نتّفق على جدول واضح بعد جلسة "
             "الاكتشاف.",
             "It depends on page count and scope; we agree on a clear "
             "timeline after the discovery session."),
        ],
        "work": [("dlvri", "Dlvri"), ("blink", "Blink"), ("toma", "Toma")],
    },
    {
        "slug": "content-writing",
        "pt": "content-writing",
        "title": "كتابة محتوى احترافي وتسويقي بالعربية والإنجليزية | هوية Hawih",
        "description": "كتابة محتوى احترافي بالعربية والإنجليزية: محتوى "
                       "مواقع، سوشيال ميديا، ونصوص تسويقية بنبرة علامتك. "
                       "استوديو هوية — منذ ٢٠٠٧.",
        "keywords": "كتابة محتوى, كتابة محتوى تسويقي, محتوى سوشيال ميديا, "
                    "content writing arabic, كاتب محتوى, hawih",
        "og_title": "كتابة محتوى احترافي وتسويقي | هوية Hawih",
        "og_desc": "محتوى عربي وإنجليزي بنبرة علامتك — من استوديو هوية.",
        "title_en": "Professional Marketing Content Writing (AR & EN) | Hawih",
        "description_en": "Professional content writing in Arabic and English: "
                          "website copy, social content, and marketing copy in "
                          "your brand's voice. Hawih studio, since 2007.",
        "og_title_en": "Professional Content Writing | Hawih",
        "og_desc_en": "Arabic & English content in your brand's voice — from "
                      "Hawih studio.",
        "eyebrow": ("كتابة المحتوى · عربي وإنجليزي",
                    "Content writing · Arabic & English"),
        "h1": ("كتابة المحتوى", "Content Writing"),
        "sub": ("محتوى يحمل صوت علامتك ويُقنع جمهورك — لموقعك ومنصّاتك "
                "وحملاتك، بالعربية والإنجليزية.",
                "Content that carries your brand's voice and persuades your "
                "audience — for your website, channels, and campaigns, in "
                "Arabic and English."),
        "wa_msg": "مرحباً، أرغب بخدمة كتابة محتوى.",
        "form_head": ("اطلب كتابة محتواك", "Request your content"),
        "deliverables": [
            ("محتوى مواقع وصفحات هبوط",
             "Website and landing-page copy"),
            ("محتوى سوشيال ميديا منتظم",
             "Consistent social media content"),
            ("نصوص إعلانية وتسويقية",
             "Advertising and marketing copy"),
            ("صياغة بالعربية والإنجليزية",
             "Writing in Arabic and English"),
            ("ضبط نبرة الصوت لعلامتك",
             "A defined tone of voice for your brand"),
            ("مراجعة لغوية وتدقيق احترافي",
             "Professional language review and proofing"),
        ],
        "faq": [
            ("هل تكتبون بالعربية والإنجليزية؟",
             "Do you write in Arabic and English?",
             "نعم، نكتب باللغتين بنبرة طبيعية لكل لغة — وليست ترجمة حرفية.",
             "Yes — we write in both languages with a natural tone for "
             "each, not a literal translation."),
            ("هل تكتبون لمجال نشاطي تحديداً؟",
             "Can you write for my specific industry?",
             "نبدأ بفهم مجالك وجمهورك ونبرة علامتك قبل الكتابة حتى يكون "
             "المحتوى دقيقاً وملائماً.",
             "We start by understanding your field, audience, and brand "
             "voice before writing, so the content is accurate and "
             "relevant."),
            ("هل تشمل الخدمة إدارة الحسابات؟",
             "Does this include account management?",
             "نوفّر المحتوى والصياغة؛ ويمكن التنسيق على خطة نشر منتظمة حسب "
             "احتياجك.",
             "We provide the content and copy; we can also arrange a "
             "regular publishing plan to fit your needs."),
            ("كيف نبدأ؟",
             "How do we start?",
             "أرسل لنا نبذة عن نشاطك ونوع المحتوى المطلوب، ونرد عليك خلال "
             "يوم عمل بخطة واضحة.",
             "Send us a note about your business and the content you need; "
             "we'll reply within one working day with a clear plan."),
        ],
        "work": [("jazl", "Jazl"), ("talga", "Talga"), ("bnoon", "Bnoon")],
    },
]


# ---- helpers ----------------------------------------------------------

def e(s: str) -> str:
    """Escape for use in both HTML text and double-quoted attributes."""
    return html.escape(s, quote=True)


def ls(ar: str, en: str, cls: str = "") -> str:
    """A bilingual lang-string span (AR shown by default; the /en mirror
    swaps the inner text to data-en)."""
    klass = ("lang-string " + cls).strip()
    return (f'<span class="{klass}" data-ar="{e(ar)}" data-en="{e(en)}">'
            f'{e(ar)}</span>')


CHECK_SVG = ('<svg viewBox="0 0 20 20" width="18" height="18" '
             'fill="none" stroke="currentColor" stroke-width="2.2" '
             'stroke-linecap="round" stroke-linejoin="round" '
             'aria-hidden="true"><path d="M4 10.5 8.5 15 16 5.5"/></svg>')

WA_SVG = ('<svg viewBox="0 0 24 24" width="20" height="20" '
          'fill="currentColor" aria-hidden="true"><path d="M17.472 '
          '14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.'
          '15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-'
          '.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-'
          '.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.'
          '298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-'
          '2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.'
          '372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 '
          '3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.'
          '712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.'
          '694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 '
          '7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-'
          '3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 '
          '9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 '
          '6.994c-.003 5.45-4.437 9.885-9.886 9.885M20.52 3.449C18.24 1.245 '
          '15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 '
          '1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c'
          '6.582 0 11.94-5.335 11.944-11.893a11.821 11.821 0 0 0-3.487-8.45"/>'
          '</svg>')

PHONE_SVG = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
             'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
             'stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a'
             '2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6'
             ' 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 '
             '1.72c.127.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 '
             '0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.573 2.81.7A2 2 '
             '0 0 1 22 16.92z"/></svg>')

ARROW_SVG = ('<svg viewBox="0 0 24 24" width="16" height="16" fill="none" '
             'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
             'stroke-linejoin="round" aria-hidden="true" class="lp-arrow">'
             '<path d="M7 17 17 7M9 7h8v8"/></svg>')


def wa_url(msg: str) -> str:
    return f"https://wa.me/{WA_NUMBER}?text={quote(msg)}"


def build_logos() -> str:
    items = "\n".join(
        f'        <img class="lp-logos__img" src="/assets/img/clients/{f}" '
        f'alt="{e(name)}" loading="lazy" decoding="async" height="38">'
        for f, name in LOGOS
    )
    return (
        '    <section class="lp-logos" aria-label="Clients">\n'
        '      <div class="lp-wrap">\n'
        f'        <p class="lp-logos__label">{ls("علامات وثقت بهوية", "Brands that have trusted Hawih")}</p>\n'
        '        <div class="lp-logos__row">\n'
        f'{items}\n'
        '        </div>\n'
        '      </div>\n'
        '    </section>'
    )


def build_chips() -> str:
    items = "\n".join(
        f'          <li class="lp-chip">{CHECK_SVG}{ls(ar, en)}</li>'
        for ar, en in CHIPS
    )
    return f'        <ul class="lp-chips">\n{items}\n        </ul>'


def build_deliverables(page: dict) -> str:
    tiles = "\n".join(
        f'          <li class="lp-tile"><span class="lp-tile__ic">{CHECK_SVG}'
        f'</span>{ls(ar, en)}</li>'
        for ar, en in page["deliverables"]
    )
    return (
        '    <section class="lp-section">\n'
        '      <div class="lp-wrap">\n'
        f'        <p class="lp-eyebrow lp-center">{ls("ماذا تستلم", "What you get")}</p>\n'
        f'        <h2 class="lp-h2 lp-center">{ls(page["h1"][0] + " — كل ما تحتاجه", page["h1"][1] + " — everything you need")}</h2>\n'
        f'        <ul class="lp-grid">\n{tiles}\n        </ul>\n'
        '      </div>\n'
        '    </section>'
    )


def build_process() -> str:
    steps = []
    for i, (t_ar, t_en, d_ar, d_en) in enumerate(PROCESS, start=1):
        steps.append(
            f'          <li class="lp-step"><span class="lp-step__n">'
            f'{i:02d}</span><div class="lp-step__body">'
            f'<h3 class="lp-step__title">{ls(t_ar, t_en)}</h3>'
            f'<p class="lp-step__txt">{ls(d_ar, d_en)}</p></div></li>'
        )
    body = "\n".join(steps)
    return (
        '    <section class="lp-section lp-section--alt">\n'
        '      <div class="lp-wrap">\n'
        f'        <p class="lp-eyebrow lp-center">{ls("طريقة العمل", "How we work")}</p>\n'
        f'        <h2 class="lp-h2 lp-center">{ls("أربع خطوات واضحة من الفكرة إلى التسليم", "Four clear steps from idea to handover")}</h2>\n'
        f'        <ol class="lp-steps">\n{body}\n        </ol>\n'
        '      </div>\n'
        '    </section>'
    )


def build_work(page: dict) -> str:
    cards = []
    for slug, name in page["work"]:
        cards.append(
            f'          <a class="lp-work__item" href="/work-{slug}">'
            f'<img class="lp-work__img" src="/assets/img/work/{slug}/01.jpeg" '
            f'alt="{e(name)} — Hawih" loading="lazy" decoding="async">'
            f'<span class="lp-work__name">{e(name)}</span></a>'
        )
    body = "\n".join(cards)
    return (
        '    <section class="lp-section">\n'
        '      <div class="lp-wrap">\n'
        f'        <p class="lp-eyebrow lp-center">{ls("من أعمالنا", "From our work")}</p>\n'
        f'        <h2 class="lp-h2 lp-center">{ls("مشاريع نفخر بها", "Projects we are proud of")}</h2>\n'
        f'        <div class="lp-work">\n{body}\n        </div>\n'
        f'        <div class="lp-center" style="display:flex;gap:18px;justify-content:center;flex-wrap:wrap;align-items:center">'
        f'<a class="lp-btn lp-btn--outline" href="{PORTFOLIO_PDF}" target="_blank" rel="noopener">{DOC_SVG}{ls("حمّل ملف الأعمال (PDF)", "Download portfolio (PDF)")}</a>'
        f'<a class="lp-textlink" href="/work">{ls("استعرض كل الأعمال", "View all work")}{ARROW_SVG}</a></div>\n'
        '      </div>\n'
        '    </section>'
    )


def build_faq(page: dict) -> str:
    items = []
    for q_ar, q_en, a_ar, a_en in page["faq"]:
        items.append(
            '          <details class="lp-faq__item">\n'
            f'            <summary class="lp-faq__q">{ls(q_ar, q_en)}'
            '<span class="lp-faq__sign" aria-hidden="true"></span></summary>\n'
            f'            <div class="lp-faq__a"><p>{ls(a_ar, a_en)}</p></div>\n'
            '          </details>'
        )
    body = "\n".join(items)
    return (
        '    <section class="lp-section lp-section--alt">\n'
        '      <div class="lp-wrap lp-wrap--narrow">\n'
        f'        <p class="lp-eyebrow lp-center">{ls("أسئلة شائعة", "Common questions")}</p>\n'
        f'        <h2 class="lp-h2 lp-center">{ls("ربما يدور في ذهنك", "You might be wondering")}</h2>\n'
        f'        <div class="lp-faq">\n{body}\n        </div>\n'
        '      </div>\n'
        '    </section>'
    )


def build_form(page: dict) -> str:
    wa = e(wa_url(page["wa_msg"]))
    return f'''        <form class="lp-form" id="leadForm" action="/api/lead.php" method="POST" novalidate>
          <input type="hidden" name="source" value="/{page['slug']}">
          <input type="hidden" name="lang" id="lang_input" value="ar">
          <input type="hidden" name="project_type" value="{page['pt']}">
          <div class="lp-hp" aria-hidden="true"><label>If you are human leave this empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>
          <div class="lp-field">
            <label class="lp-label" for="f-name">{ls("الاسم", "Full name")}</label>
            <input class="lp-input lang-input" id="f-name" name="name" type="text" required maxlength="120" autocomplete="name" data-placeholder-ar="اكتب اسمك" data-placeholder-en="Your name" placeholder="اكتب اسمك">
          </div>
          <div class="lp-field">
            <label class="lp-label" for="f-phone">{ls("رقم الجوّال", "Phone")}</label>
            <input class="lp-input" id="f-phone" name="phone" type="tel" dir="ltr" maxlength="40" autocomplete="tel" placeholder="+966 5x xxx xxxx">
          </div>
          <div class="lp-field">
            <label class="lp-label" for="f-email">{ls("البريد الإلكتروني", "Email")}</label>
            <input class="lp-input" id="f-email" name="email" type="email" required dir="ltr" maxlength="200" autocomplete="email" placeholder="you@brand.com">
          </div>
          <div class="lp-field">
            <label class="lp-label" for="f-brief">{ls("نبذة سريعة عن طلبك", "A quick note about your project")}</label>
            <textarea class="lp-input lp-textarea" id="f-brief" name="brief" required maxlength="4000" rows="3" placeholder="—"></textarea>
          </div>
          <button class="lp-btn lp-btn--primary lp-btn--block" type="submit" id="leadSubmitBtn">{ls("أرسل الطلب", "Send request")}{ARROW_SVG}</button>
          <p class="lp-form__note">{ls("بياناتك تصل فريقنا مباشرة، ونرد خلال يوم عمل.", "Your details reach our team directly; we reply within one working day.")}</p>
          <a class="lp-form__wa" href="{wa}" target="_blank" rel="noopener">{WA_SVG}{ls("أو تواصل عبر واتساب", "Or message us on WhatsApp")}</a>
        </form>
        <script>(function(){{var f=document.getElementById('leadForm');if(!f)return;f.addEventListener('submit',function(){{var b=document.getElementById('leadSubmitBtn');if(b){{setTimeout(function(){{b.disabled=true;}},0);}}}});}})();</script>'''


# ---- CSS (self-contained; brand tokens mirror assets/css/hawih.css) ----

CSS = r""":root{
  --blue:#1F1FFE; --blue-hover:#1414D6; --blue-soft:rgba(31,31,254,.10);
  --ink:#0B0B10; --ink-2:#14141C; --ink-line:rgba(255,255,255,.12);
  --paper:#F4F1EB; --paper-2:#E9E4D7; --line:rgba(11,11,16,.12);
  --muted:rgba(11,11,16,.68); --white:#fff; --wa:#25D366;
  --r:16px; --r-lg:22px; --maxw:1160px;
  --shadow:0 1px 2px rgba(11,11,16,.04),0 10px 30px rgba(11,11,16,.07);
  --font-ar:"IBM Plex Sans Arabic","Inter",system-ui,Segoe UI,Tahoma,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;overflow-x:clip}
body{overflow-x:clip;max-width:100%}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--font-ar);font-size:17px;line-height:1.7;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3,p{margin:0}
button{font-family:inherit}
.lp-wrap{width:100%;max-width:var(--maxw);margin-inline:auto;padding-inline:22px}
.lp-wrap--narrow{max-width:820px}
.lp-center{text-align:center}

/* a11y: skip link + keyboard focus */
.lp-skip{position:absolute;inset-inline-start:-9999px;top:0;z-index:100;
  background:var(--ink);color:#fff;padding:.7em 1.1em;
  border-radius:0 0 10px 10px;font-weight:600;text-decoration:none}
.lp-skip:focus{inset-inline-start:0}
:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:3px}
.lp-btn--primary:focus-visible,.lp-btn--wa:focus-visible{outline-color:var(--ink)}
.lp-input:focus-visible{outline:none}
.lp-cta :focus-visible{outline-color:var(--paper)}

/* buttons */
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:.55em;
  padding:.78em 1.4em;border-radius:999px;border:1.5px solid transparent;
  font-weight:600;font-size:.98rem;cursor:pointer;line-height:1;
  transition:transform .18s ease,background .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease}
.lp-btn:hover{transform:translateY(-2px)}
.lp-btn--primary{background:var(--blue);color:#fff}
.lp-btn--primary:hover{background:var(--blue-hover)}
.lp-btn--wa{background:var(--wa);color:#fff}
.lp-btn--wa:hover{box-shadow:0 10px 26px rgba(37,211,102,.4);color:#fff}
.lp-btn--outline{background:transparent;color:var(--ink);border-color:var(--line)}
.lp-btn--outline:hover{border-color:var(--ink)}
.lp-btn--ghost{background:transparent;color:inherit;border-color:currentColor;opacity:.85}
.lp-btn--ghost:hover{opacity:1}
.lp-btn--lg{padding:1em 1.7em;font-size:1.05rem}
.lp-btn--block{width:100%}
.lp-arrow{transition:transform .18s ease}
[dir="rtl"] .lp-arrow{transform:scaleX(-1)}
[dir="rtl"] .lp-btn:hover .lp-arrow{transform:scaleX(-1) translate(-2px,-2px)}
[dir="ltr"] .lp-btn:hover .lp-arrow{transform:translate(2px,-2px)}

/* header */
.lp-header{position:sticky;top:0;z-index:40;
  background:rgba(244,241,235,.82);backdrop-filter:saturate(140%) blur(12px);
  border-bottom:1px solid var(--line)}
.lp-header__inner{display:flex;align-items:center;justify-content:space-between;
  gap:14px;height:66px}
.lp-logo img{height:34px;width:auto}
.lp-header__actions{display:flex;align-items:center;gap:10px}
.lp-langtoggle{background:transparent;border:1.5px solid var(--line);
  color:var(--ink);width:40px;height:40px;border-radius:50%;font-weight:600;
  cursor:pointer;font-size:.85rem;transition:border-color .18s ease}
.lp-langtoggle:hover{border-color:var(--ink)}
.lp-header__actions .lp-btn{padding:.6em 1.05em;font-size:.9rem}
.lp-header__call{display:inline-flex}

/* hero */
.lp-hero{padding:54px 0 38px}
.lp-hero__grid{display:grid;grid-template-columns:1.05fr .95fr;gap:46px;
  align-items:start}
.lp-eyebrow{display:inline-block;font-size:.82rem;font-weight:600;
  letter-spacing:.02em;color:var(--blue);background:var(--blue-soft);
  padding:.4em .9em;border-radius:999px;margin-bottom:18px}
.lp-h1{font-size:clamp(2.3rem,6vw,3.7rem);line-height:1.12;font-weight:700;
  letter-spacing:-.01em}
.lp-sub{margin-top:18px;font-size:1.16rem;color:var(--muted);max-width:34ch}
.lp-chips{list-style:none;margin:24px 0 0;padding:0;display:flex;
  flex-wrap:wrap;gap:10px 18px}
.lp-chip{display:inline-flex;align-items:center;gap:.5em;font-size:.95rem;
  font-weight:500}
.lp-chip svg{color:var(--blue);flex:none}
.lp-hero__cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.lp-hero__cta.lp-center{justify-content:center}
.lp-hero__note{margin-top:14px;font-size:.9rem;color:var(--muted)}

/* form card */
.lp-card{background:var(--white);border:1px solid var(--line);
  border-radius:var(--r-lg);padding:26px;box-shadow:var(--shadow)}
.lp-card__title{font-size:1.4rem;font-weight:700}
.lp-card__sub{margin-top:6px;color:var(--muted);font-size:.96rem;
  margin-bottom:18px}
.lp-form{display:flex;flex-direction:column;gap:13px}
.lp-field{display:flex;flex-direction:column;gap:6px}
.lp-label{font-size:.88rem;font-weight:600}
.lp-input{width:100%;padding:.72em .9em;border:1.5px solid var(--line);
  border-radius:12px;background:#fdfcfa;font-family:inherit;font-size:1rem;
  color:var(--ink);transition:border-color .15s ease,box-shadow .15s ease}
.lp-input::placeholder{color:rgba(11,11,16,.4)}
.lp-input:focus{outline:none;border-color:var(--blue);
  box-shadow:0 0 0 3px var(--blue-soft)}
.lp-textarea{resize:vertical;min-height:84px;line-height:1.6}
.field--error{border-color:#d33!important;box-shadow:0 0 0 3px rgba(221,51,51,.12)!important}
.lp-form__note{font-size:.82rem;color:var(--muted);margin-top:2px}
.lp-form__wa{display:inline-flex;align-items:center;justify-content:center;
  gap:.5em;color:var(--wa);font-weight:600;font-size:.95rem;margin-top:2px}
.lp-hp{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* logos */
.lp-logos{padding:22px 0 6px}
.lp-logos__label{text-align:center;font-size:.84rem;color:var(--muted);
  margin-bottom:16px}
.lp-logos__row{display:flex;flex-wrap:wrap;align-items:center;
  justify-content:center;gap:26px 38px}
.lp-logos__img{height:34px;width:auto;opacity:.55;filter:grayscale(1);
  transition:opacity .2s ease,filter .2s ease}
.lp-logos__img:hover{opacity:1;filter:grayscale(0)}

/* sections */
.lp-section{padding:56px 0}
.lp-section--alt{background:var(--paper-2)}
.lp-h2{font-size:clamp(1.6rem,3.4vw,2.3rem);font-weight:700;line-height:1.2;
  letter-spacing:-.01em}
.lp-section .lp-eyebrow{margin-bottom:12px}
.lp-section .lp-h2.lp-center{margin-bottom:34px}

/* deliverables */
.lp-grid{list-style:none;margin:0;padding:0;display:grid;
  grid-template-columns:repeat(3,1fr);gap:14px}
.lp-tile{display:flex;align-items:flex-start;gap:.7em;background:var(--white);
  border:1px solid var(--line);border-radius:var(--r);padding:18px 18px;
  font-weight:500;font-size:1rem;box-shadow:var(--shadow)}
.lp-tile__ic{flex:none;display:inline-flex;align-items:center;
  justify-content:center;width:30px;height:30px;border-radius:9px;
  background:var(--blue-soft);color:var(--blue);margin-top:1px}

/* process */
.lp-steps{list-style:none;margin:0;padding:0;display:grid;
  grid-template-columns:repeat(4,1fr);gap:16px;counter-reset:none}
.lp-step{background:var(--white);border:1px solid var(--line);
  border-radius:var(--r);padding:22px 20px}
.lp-step__n{display:inline-block;font-size:1.05rem;font-weight:700;
  color:var(--blue);background:var(--blue-soft);border-radius:9px;
  padding:.15em .55em;margin-bottom:12px}
.lp-step__title{font-size:1.12rem;font-weight:700;margin-bottom:6px}
.lp-step__txt{color:var(--muted);font-size:.96rem}

/* work */
.lp-work{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;
  margin-bottom:26px}
.lp-work__item{position:relative;border-radius:var(--r);overflow:hidden;
  border:1px solid var(--line);aspect-ratio:4/3;background:var(--paper-2);
  box-shadow:var(--shadow)}
.lp-work__img{width:100%;height:100%;object-fit:cover;
  transition:transform .35s ease}
.lp-work__item:hover .lp-work__img{transform:scale(1.05)}
.lp-work__name{position:absolute;inset-block-end:12px;inset-inline-start:12px;
  background:rgba(11,11,16,.72);color:#fff;font-size:.82rem;font-weight:600;
  padding:.3em .8em;border-radius:999px;backdrop-filter:blur(4px)}
.lp-textlink{display:inline-flex;align-items:center;gap:.4em;color:var(--blue);
  font-weight:600}
.lp-textlink:hover{text-decoration:underline}

/* faq */
.lp-faq{display:flex;flex-direction:column;gap:10px}
.lp-faq__item{background:var(--white);border:1px solid var(--line);
  border-radius:var(--r);overflow:hidden}
.lp-faq__q{display:flex;align-items:center;justify-content:space-between;
  gap:14px;padding:17px 20px;font-weight:600;cursor:pointer;list-style:none}
.lp-faq__q::-webkit-details-marker{display:none}
.lp-faq__sign{flex:none;position:relative;width:16px;height:16px}
.lp-faq__sign::before,.lp-faq__sign::after{content:"";position:absolute;
  background:var(--blue);inset-block-start:50%;inset-inline-start:0;
  width:16px;height:2px;transform:translateY(-50%);transition:transform .2s ease}
.lp-faq__sign::after{transform:translateY(-50%) rotate(90deg)}
.lp-faq__item[open] .lp-faq__sign::after{transform:translateY(-50%) rotate(0)}
.lp-faq__a{padding:0 20px 18px;color:var(--muted)}

/* final cta */
.lp-cta{background:var(--ink);color:var(--paper);padding:64px 0;text-align:center}
.lp-cta__title{font-size:clamp(1.7rem,3.6vw,2.5rem);font-weight:700;
  line-height:1.18}
.lp-cta__sub{margin:14px auto 0;color:rgba(244,241,235,.72);max-width:48ch}
.lp-cta .lp-hero__cta{margin-top:28px}
.lp-cta .lp-btn--outline{color:var(--paper);border-color:var(--ink-line)}
.lp-cta .lp-btn--outline:hover{border-color:var(--paper)}

/* footer */
.lp-footer{background:var(--ink-2);color:rgba(244,241,235,.8);padding:40px 0 28px}
.lp-footer__inner{display:flex;flex-wrap:wrap;gap:24px;align-items:center;
  justify-content:space-between}
.lp-footer__brand{display:flex;align-items:center;gap:14px}
.lp-footer__brand img{height:30px;width:auto}
.lp-footer__brand p{font-size:.86rem;color:rgba(244,241,235,.6)}
.lp-footer__nav{display:flex;flex-wrap:wrap;gap:18px;font-size:.92rem;
  font-weight:500}
.lp-footer__nav a:hover{color:#fff}
.lp-footer__contact{display:flex;flex-direction:column;gap:4px;font-size:.9rem}
.lp-footer__contact a{color:rgba(244,241,235,.8)}
.lp-footer__contact a:hover{color:#fff}
.lp-footer__legal{margin-top:26px;padding-top:18px;
  border-top:1px solid var(--ink-line);font-size:.8rem;
  color:rgba(244,241,235,.5);text-align:center}

/* floating whatsapp button (assets/js/hawih.js injects .hawih-whatsapp) */
.hawih-whatsapp{position:fixed;bottom:1.5rem;inset-inline-end:1.5rem;z-index:50;
  width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;
  display:inline-flex;align-items:center;justify-content:center;
  text-decoration:none;box-shadow:0 8px 24px rgba(37,211,102,.4),0 4px 12px rgba(0,0,0,.15);
  transition:transform .25s ease,box-shadow .25s ease}
.hawih-whatsapp::before{content:"";position:absolute;inset:-4px;border-radius:50%;
  background:#25D366;opacity:.3;z-index:-1;animation:hawih-wa-pulse 2.4s ease-out infinite}
.hawih-whatsapp:hover{transform:scale(1.08) translateY(-2px);color:#fff;
  box-shadow:0 12px 32px rgba(37,211,102,.5),0 6px 16px rgba(0,0,0,.2)}
.hawih-whatsapp:focus-visible{outline:2px solid #fff;outline-offset:3px}
@keyframes hawih-wa-pulse{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.25);opacity:0}}

/* responsive */
@media (max-width:860px){
  .lp-hero__grid{grid-template-columns:1fr;gap:30px}
  .lp-sub{max-width:none}
  .lp-grid,.lp-steps,.lp-work{grid-template-columns:repeat(2,1fr)}
  .lp-header__call{display:none}
}
@media (max-width:560px){
  body{font-size:16px}
  .lp-hero{padding:34px 0 26px}
  .lp-grid,.lp-steps,.lp-work{grid-template-columns:1fr}
  .lp-hero__cta .lp-btn{flex:1 1 100%}
  .lp-footer__inner{flex-direction:column;align-items:flex-start}
  .hawih-whatsapp{width:50px;height:50px;bottom:1rem;inset-inline-end:1rem}
}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.001ms!important;transition-duration:.001ms!important}
  html{scroll-behavior:auto}
}
"""


# ---- page template ----------------------------------------------------

def render(page: dict) -> str:
    wa_hero = e(wa_url(page["wa_msg"]))
    wa_header = e(wa_url(page["wa_msg"]))
    eyebrow = ls(*page["eyebrow"])
    h1 = ls(*page["h1"])
    sub = ls(*page["sub"])
    form_head = ls(*page["form_head"])

    head = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">

  <head>
    <script>(function(){{try{{var e=document.documentElement;e.setAttribute("data-theme","light");e.classList.add("light-mode");e.style.colorScheme="light";}}catch(_){{}}}})();</script>
    <meta charset="UTF-8">

    <!-- Page Title -->
    <title>{e(page['title'])}</title>

    <!-- Meta Tags -->
    <meta name="description" content="{e(page['description'])}">
    <meta name="keywords" content="{e(page['keywords'])}">
    <meta name="author" content="Hawih">

    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

    <!-- FOUC guard: pick lang before paint -->
    <script>
      (function () {{
        try {{
          var p = location.pathname;
          var lang = (p === '/en' || p.indexOf('/en/') === 0) ? 'en' : 'ar';
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        }} catch (e) {{}}
      }})();
    </script>

    <!-- Template Favicon & Icons Start -->
    <link rel="icon" type="image/png" href="/assets/img/favicon.png" sizes="any">
    <link rel="apple-touch-icon" href="/assets/img/favicon.png">
    <!-- Template Favicon & Icons End -->

    <!-- Facebook Metadata Start -->
    <meta property="og:image:height" content="1200">
    <meta property="og:image:width" content="1200">
    <meta property="og:title" content="{e(page['og_title'])}">
    <meta property="og:description" content="{e(page['og_desc'])}">
    <meta property="og:url" content="https://hawih.com.sa/{page['slug']}">
    <meta property="og:image" content="https://hawih.com.sa/assets/img/hawih-og.jpg">
    <!-- Facebook Metadata End -->

    <!-- EN locale metadata (consumed by scripts/build-en-mirror.py to localise
         title / description / og:* on the /en mirror; ignored by crawlers) -->
    <meta name="hawih:title-en" content="{e(page['title_en'])}">
    <meta name="hawih:description-en" content="{e(page['description_en'])}">
    <meta name="hawih:og-title-en" content="{e(page['og_title_en'])}">
    <meta name="hawih:og-description-en" content="{e(page['og_desc_en'])}">

    <!-- Template Styles Start -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap">
    <!-- Template Styles End -->

    <style>
{CSS}    </style>
  </head>

  <body>
    <a class="lp-skip" href="#content">{ls("تخطَّ إلى المحتوى", "Skip to main content")}</a>
    <header class="lp-header">
      <div class="lp-wrap lp-header__inner">
        <a class="lp-logo" href="/" aria-label="Hawih · هوية"><img src="/assets/img/hawih-logo-black.png" alt="Hawih · هوية" width="120" height="34"></a>
        <div class="lp-header__actions">
          <button class="lp-langtoggle langToggle" type="button" aria-label="Switch language">{ls("EN", "ع")}</button>
          <a class="lp-btn lp-btn--outline lp-header__call" href="tel:{PHONE}" dir="ltr">{PHONE_SVG}<span class="lang-string" data-ar="اتصل" data-en="Call">اتصل</span></a>
          <a class="lp-btn lp-btn--wa" href="{wa_header}" target="_blank" rel="noopener">{WA_SVG}{ls("واتساب", "WhatsApp")}</a>
        </div>
      </div>
    </header>

    <main id="content">
      <!-- Hero -->
      <section class="lp-hero">
        <div class="lp-wrap lp-hero__grid">
          <div class="lp-hero__copy">
            <p class="lp-eyebrow">{eyebrow}</p>
            <h1 class="lp-h1">{h1}</h1>
            <p class="lp-sub">{sub}</p>
{build_chips()}
            <div class="lp-hero__cta">
              <a class="lp-btn lp-btn--wa lp-btn--lg" href="{wa_hero}" target="_blank" rel="noopener">{WA_SVG}{ls("تواصل عبر واتساب", "Chat on WhatsApp")}</a>
              <a class="lp-btn lp-btn--outline lp-btn--lg" href="tel:{PHONE}" dir="ltr">{PHONE_SVG}<span class="lang-string" data-ar="اتصل الآن" data-en="Call now">اتصل الآن</span></a>
              <a class="lp-btn lp-btn--outline lp-btn--lg" href="{PORTFOLIO_PDF}" target="_blank" rel="noopener">{DOC_SVG}{ls("ملف الأعمال (PDF)", "Portfolio (PDF)")}</a>
            </div>
            <p class="lp-hero__note">{ls("استشارة أولية مجانية · بدون التزام", "Free first consultation · no obligation")}</p>
          </div>
          <div class="lp-hero__form">
            <div class="lp-card">
              <h2 class="lp-card__title">{form_head}</h2>
              <p class="lp-card__sub">{ls("نموذج موجز يصل فريقنا مباشرة.", "A short brief that reaches our team directly.")}</p>
{build_form(page)}
            </div>
          </div>
        </div>
      </section>

{build_logos()}

{build_deliverables(page)}

{build_process()}

{build_work(page)}

{build_faq(page)}

      <!-- Final CTA -->
      <section class="lp-cta">
        <div class="lp-wrap">
          <h2 class="lp-cta__title">{ls("جاهز نبدأ مشروعك؟", "Ready to start your project?")}</h2>
          <p class="lp-cta__sub">{ls("أرسل لنا رسالة قصيرة الآن، وسنرد عليك خلال يوم عمل بخطوات واضحة.", "Send us a short message now and we'll reply within one working day with clear next steps.")}</p>
          <div class="lp-hero__cta lp-center">
            <a class="lp-btn lp-btn--wa lp-btn--lg" href="{wa_hero}" target="_blank" rel="noopener">{WA_SVG}{ls("تواصل عبر واتساب", "Chat on WhatsApp")}</a>
            <a class="lp-btn lp-btn--outline lp-btn--lg" href="tel:{PHONE}" dir="ltr">{PHONE_SVG}<span class="lang-string" data-ar="اتصل الآن" data-en="Call now">اتصل الآن</span></a>
            <a class="lp-btn lp-btn--ghost lp-btn--lg" href="#leadForm">{ls("أو املأ النموذج", "Or fill the form")}</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="lp-footer">
      <div class="lp-wrap lp-footer__inner">
        <div class="lp-footer__brand">
          <img src="/assets/img/logo/hawih-logo-white.png" alt="Hawih · هوية">
          <p>{ls("استوديو تصميم سعودي · منذ ٢٠٠٧", "Saudi design studio · since 2007")}</p>
        </div>
        <nav class="lp-footer__nav" aria-label="Footer">
          <a href="/">{ls("الرئيسية", "Home")}</a>
          <a href="/work">{ls("أعمالنا", "Work")}</a>
          <a href="/services">{ls("خدماتنا", "Services")}</a>
          <a href="/contact">{ls("تواصل معنا", "Contact")}</a>
        </nav>
        <div class="lp-footer__contact">
          <a href="tel:{PHONE}" dir="ltr">{PHONE_DISPLAY}</a>
          <a href="mailto:{EMAIL}" dir="ltr">{EMAIL}</a>
        </div>
      </div>
      <div class="lp-wrap lp-footer__legal">{ls("© ٢٠٠٧–٢٠٢٦ هوية · Hawih. جميع الحقوق محفوظة.", "© 2007–2026 Hawih · هوية. All rights reserved.")}</div>
    </footer>

    <script src="/assets/js/hawih.js"></script>
  </body>
</html>
'''
    return head


def main() -> int:
    faq_sidecar: dict[str, list] = {}
    for page in PAGES:
        out = REPO_ROOT / f"{page['slug']}.html"
        out.write_text(render(page), encoding="utf-8")
        faq_sidecar[page["slug"]] = [
            {"q_ar": q_ar, "q_en": q_en, "a_ar": a_ar, "a_en": a_en}
            for (q_ar, q_en, a_ar, a_en) in page["faq"]
        ]
        print(f"  ~ {out.name}")
    # FAQ sidecar — single source of truth shared with inject-jsonld.py so the
    # FAQPage schema always matches the visible <details> FAQ on each page.
    sidecar = REPO_ROOT / "seo" / "jsonld" / "landing-faq.json"
    sidecar.write_text(
        json.dumps(faq_sidecar, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    print(f"  ~ {sidecar.relative_to(REPO_ROOT)}")
    print(f"\n{len(PAGES)} landing pages written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
