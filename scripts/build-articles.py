#!/usr/bin/env python3
"""
build-articles.py — Hawih bilingual SEO article engine.

Generates an Arabic-first (with English mirror) content section that
captures informational / long-tail search and funnels readers to the
service + landing pages — the gap the audit found vs competitors who
rank for head terms via long-form Arabic guides.

Emits at the repo root:
  articles.html            ← the hub (lists every article)
  article-<slug>.html      ← one page per guide

Design notes:
  - Every piece of copy is a lang-string span (data-ar/data-en) so the
    standard /en mirror is built automatically by build-en-mirror.py —
    NO change to that script is required. To keep the lang-string model
    intact, prose paragraphs contain no inline links; internal links to
    the money pages live in dedicated "related" + CTA blocks instead
    (which also convert better than buried inline links).
  - Self-contained + lean (inline CSS, brand tokens, hawih.js for the
    floating WhatsApp button + GTM events) — same fast profile as the
    landing pages.
  - inject-jsonld.py emits Article + FAQPage + BreadcrumbList for each
    article (and Blog for the hub) from the seo/jsonld/article-meta.json
    sidecar this script writes, so schema always matches the page.

Run order (same pipeline as the landing pages):
    python3 scripts/build-articles.py
    python3 scripts/build-en-mirror.py
    python3 scripts/inject-head.py
    python3 scripts/inject-jsonld.py
    python3 scripts/generate-sitemap.py
    python3 scripts/version-assets.py
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
PUBLISH_DATE = "2026-06-29"   # stable; bump per-article in ARTICLES if needed

# Landing/service pages an article can link to (slug → bilingual label).
LINK_TARGETS = {
    "logo-design": ("خدمة تصميم الشعار", "Logo design service"),
    "brand-identity": ("خدمة الهوية البصرية", "Brand identity service"),
    "company-profile": ("خدمة بروفايل الشركة", "Company profile service"),
    "website-design": ("خدمة تصميم المواقع", "Website design service"),
    "content-writing": ("خدمة كتابة المحتوى", "Content writing service"),
}

# ---- articles (first batch) -------------------------------------------
# Each section: (h2_ar, h2_en, [(p_ar, p_en), ...]).
# Prose paragraphs hold NO inline links (lang-string constraint).

ARTICLES = [
    {
        "slug": "logo-brand-identity-cost",
        "kw": ("كم تكلفة تصميم شعار وهوية بصرية في السعودية؟",
               "How Much Does a Logo & Brand Identity Cost in Saudi Arabia?"),
        "title": "كم تكلفة تصميم شعار وهوية بصرية في السعودية؟ دليل ٢٠٢٦ | هوية",
        "description": "دليل تكلفة تصميم الشعار والهوية البصرية في السعودية "
                       "٢٠٢٦ — ما الذي يحدّد السعر، وما الفرق بين الباقات، "
                       "وكيف تختار الأنسب لميزانيتك. من استوديو هوية.",
        "title_en": "How Much Does a Logo & Brand Identity Cost in Saudi "
                    "Arabia? 2026 Guide | Hawih",
        "description_en": "A 2026 guide to logo and brand-identity pricing in "
                          "Saudi Arabia — what drives the price, how packages "
                          "differ, and how to choose for your budget.",
        "keywords": "تكلفة تصميم شعار, سعر تصميم هوية بصرية, اسعار تصميم "
                    "الشعارات السعودية, logo design cost saudi",
        "excerpt": ("ما الذي يحدّد سعر الشعار والهوية البصرية في السوق "
                    "السعودي، وكيف تقرأ عرض الأسعار بثقة.",
                    "What sets the price of a logo and brand identity in the "
                    "Saudi market, and how to read a quote with confidence."),
        "related": ["logo-design", "brand-identity"],
        "sections": [
            ("لماذا تتفاوت أسعار تصميم الشعار؟",
             "Why do logo prices vary so much?",
             [("سعر الشعار لا يعكس «رسمة» فقط، بل العمل الذي يسبقها: فهم "
               "نشاطك، ودراسة جمهورك ومنافسيك، وبناء فكرة تميّزك. لهذا قد "
               "تجد شعاراً بمئات الريالات وآخر بآلاف — الفرق في العمق "
               "والخبرة والنتيجة طويلة المدى.",
               "A logo's price doesn't reflect a drawing alone — it reflects "
               "the work behind it: understanding your business, studying "
               "your audience and competitors, and building an idea that "
               "sets you apart. That's why one logo costs hundreds and "
               "another costs thousands — the difference is depth, "
               "experience, and long-term result."),
              ("في السوق السعودي يتراوح تصميم الهوية البصرية المتكاملة "
               "غالباً بين بضعة آلاف وعشرات الآلاف من الريالات، حسب نطاق "
               "العمل وعدد العناصر والتطبيقات المطلوبة. الأرقام تقريبية، "
               "والأهم أن تفهم ما يحدّدها.",
               "In the Saudi market a full brand identity typically ranges "
               "from a few thousand to tens of thousands of riyals, "
               "depending on scope and the number of elements and "
               "applications required. The figures are approximate — what "
               "matters is understanding what drives them.")]),
            ("ما الذي يحدّد السعر فعلاً؟",
             "What actually determines the price?",
             [("أربعة عوامل رئيسية: نطاق العمل (شعار فقط أم نظام هوية "
               "كامل)، وعدد المقترحات وجولات التعديل، وحجم التطبيقات "
               "(مطبوعات، سوشيال، أوراق رسمية)، وخبرة الفريق الذي ينفّذ. "
               "كلما اتّسع النطاق ووضحت المخرجات، اطمأننت لقيمة ما تدفعه.",
               "Four main factors: scope (a logo alone vs a full identity "
               "system), the number of concepts and revision rounds, the "
               "range of applications (print, social, stationery), and the "
               "experience of the team delivering it. The clearer the scope "
               "and deliverables, the more confident you are in the value.")]),
            ("كيف تقرأ عرض السعر بثقة؟",
             "How to read a quote with confidence",
             [("اطلب دائماً قائمة مخرجات واضحة: ما الملفات التي ستستلمها، "
               "وبأي صيغ، ومن يملك الحقوق، وكم جولة تعديل متاحة. عرض "
               "السعر الجيّد يشرح ما ستحصل عليه، لا رقماً مجرّداً. هذا "
               "وحده يحميك من المفاجآت لاحقاً.",
               "Always ask for a clear deliverables list: which files you "
               "receive, in what formats, who owns the rights, and how many "
               "revision rounds are included. A good quote explains what you "
               "get, not just a number — and that alone protects you from "
               "surprises later.")]),
        ],
        "faq": [
            ("هل الشعار الأرخص خيار سيّئ؟",
             "Is the cheapest logo a bad choice?",
             "ليس بالضرورة، لكن السعر المنخفض جداً غالباً يعني عملاً أقل "
             "في الاستراتيجية والتميّز. وازن بين ميزانيتك وأهمية العلامة "
             "لنشاطك على المدى الطويل.",
             "Not necessarily, but a very low price often means less work on "
             "strategy and differentiation. Balance your budget against how "
             "important the brand is to your business long-term."),
            ("هل أبدأ بشعار أم بهوية كاملة؟",
             "Should I start with a logo or a full identity?",
             "إن كنت في البداية وميزانيتك محدودة، شعار قوي مع أساس لوني "
             "وخطّي يكفي للانطلاق، ثم توسّع لاحقاً إلى هوية متكاملة.",
             "If you're starting out with a limited budget, a strong logo "
             "with a basic colour and type foundation is enough to launch — "
             "then expand to a full identity later."),
            ("كم يستغرق المشروع؟",
             "How long does it take?",
             "الشعار يستغرق عادةً أياماً إلى أسبوعين، والهوية المتكاملة "
             "عدة أسابيع حسب النطاق وعدد التطبيقات.",
             "A logo usually takes a few days to two weeks; a full identity "
             "takes several weeks depending on scope and applications."),
            ("هل أملك الملفات بعد التسليم؟",
             "Do I own the files after delivery?",
             "مع استوديو محترف، نعم — تستلم الملفات المفتوحة وحقوق "
             "الاستخدام كاملة. تأكّد من ذكر هذا في الاتفاق.",
             "With a professional studio, yes — you receive the open files "
             "and full usage rights. Make sure it's stated in the "
             "agreement."),
        ],
    },
    {
        "slug": "logo-vs-brand-identity",
        "kw": ("الفرق بين الشعار والهوية البصرية وبروفايل الشركة",
               "Logo vs Brand Identity vs Company Profile: What's the "
               "Difference?"),
        "title": "الفرق بين الشعار والهوية البصرية وبروفايل الشركة | هوية",
        "description": "اشرحٌ واضح للفرق بين الشعار والهوية البصرية وبروفايل "
                       "الشركة، ومتى تحتاج كلاً منها لعلامتك التجارية. دليل "
                       "من استوديو هوية.",
        "title_en": "Logo vs Brand Identity vs Company Profile: What's the "
                    "Difference? | Hawih",
        "description_en": "A clear explanation of the difference between a "
                          "logo, a brand identity, and a company profile — "
                          "and when your business needs each.",
        "keywords": "الفرق بين الشعار والهوية البصرية, ما هي الهوية البصرية, "
                    "بروفايل الشركة, logo vs brand identity",
        "excerpt": ("ثلاثة مصطلحات تختلط كثيراً — إليك الفرق بينها ومتى "
                    "تحتاج كلاً منها.",
                    "Three terms that often get confused — here's the "
                    "difference and when you need each."),
        "related": ["logo-design", "brand-identity", "company-profile"],
        "sections": [
            ("الشعار: وجه العلامة",
             "The logo: your brand's face",
             [("الشعار هو العلامة المرئية التي يتعرّف بها الناس على "
               "نشاطك — رمز أو اسم مصمَّم بعناية. إنه أهم عنصر، لكنه ليس "
               "الهوية كلها؛ هو نقطة البداية لا النهاية.",
               "The logo is the visual mark people recognise your business "
               "by — a symbol or name designed with care. It's the most "
               "important element, but it isn't the whole identity; it's the "
               "starting point, not the end.")]),
            ("الهوية البصرية: النظام الكامل",
             "Brand identity: the full system",
             [("الهوية البصرية نظام متكامل يضمّ الشعار والألوان والخطوط "
               "والعناصر وقواعد استخدامها عبر كل وسائطك. هي ما يجعل علامتك "
               "متّسقة ومميّزة سواء على موقعك أو حساباتك أو مطبوعاتك.",
               "A brand identity is a complete system: the logo plus "
               "colours, type, elements, and the rules for using them across "
               "all your media. It's what keeps your brand consistent and "
               "distinct — on your site, your channels, and your print.")]),
            ("بروفايل الشركة: قصتك المنظّمة",
             "Company profile: your organised story",
             [("بروفايل الشركة (الملف التعريفي) مستند مصمَّم يعرض نشاطك "
               "وخدماتك وإنجازاتك بثقة، للعملاء والشركاء والمناقصات. يبني "
               "على هويتك البصرية ليقدّم شركتك باحترافية.",
               "A company profile is a designed document that presents your "
               "business, services, and achievements with confidence — for "
               "clients, partners, and tenders. It builds on your brand "
               "identity to present your company professionally.")]),
            ("أيّها تحتاج؟",
             "Which one do you need?",
             [("إن كنت تبدأ: ابدأ بشعار. إن أردت حضوراً متّسقاً ومميّزاً: "
               "انتقل إلى هوية بصرية متكاملة. إن كنت تتقدّم لعملاء كبار أو "
               "مناقصات: أضف بروفايل شركة احترافي. الثلاثة تكمّل بعضها.",
               "If you're starting: begin with a logo. If you want a "
               "consistent, distinctive presence: move to a full brand "
               "identity. If you're pitching big clients or tenders: add a "
               "professional company profile. The three complement each "
               "other.")]),
        ],
        "faq": [
            ("هل أحتاج هوية بصرية إذا كان لديّ شعار؟",
             "Do I need a brand identity if I already have a logo?",
             "إذا كنت تظهر في أكثر من قناة (موقع، سوشيال، مطبوعات) فنعم — "
             "الهوية تضمن أن تبدو متّسقاً ومحترفاً في كل مكان.",
             "If you appear across more than one channel (site, social, "
             "print) then yes — an identity keeps you consistent and "
             "professional everywhere."),
            ("هل بروفايل الشركة جزء من الهوية البصرية؟",
             "Is a company profile part of the brand identity?",
             "البروفايل تطبيق من تطبيقات الهوية؛ يستخدم نفس الألوان "
             "والخطوط والأسلوب، لكنه مستند قائم بذاته بمحتوى وتصميم خاص.",
             "A profile is one application of the identity; it uses the same "
             "colours, type, and style, but it's a standalone document with "
             "its own content and design."),
            ("ما الذي أبدأ به بأقل ميزانية؟",
             "What do I start with on a minimal budget?",
             "ابدأ بشعار قوي مع أساس لوني وخطّي، ثم وسّع تدريجياً إلى هوية "
             "كاملة فبروفايل عند الحاجة.",
             "Start with a strong logo plus a colour and type foundation, "
             "then expand gradually to a full identity and a profile when "
             "needed."),
            ("هل تقدّمون الثلاثة معاً؟",
             "Do you offer all three together?",
             "نعم، يمكننا البدء بأي منها أو تنفيذها كمسار متكامل — أخبرنا "
             "بمرحلتك وسنقترح الأنسب.",
             "Yes — we can start with any one or deliver them as one "
             "integrated track. Tell us your stage and we'll suggest what "
             "fits."),
        ],
    },
    {
        "slug": "website-content-guide",
        "kw": ("دليل تصميم موقع إلكتروني وكتابة محتوى يحقّق نتائج",
               "A Guide to a Website & Content That Actually Convert"),
        "title": "دليل تصميم موقع إلكتروني وكتابة محتوى يحقّق نتائج | هوية",
        "description": "كيف تبني موقعاً إلكترونياً سريعاً يحوّل الزوّار إلى "
                       "عملاء، ومحتوى يحمل صوت علامتك — دليل عملي من استوديو "
                       "هوية في الرياض.",
        "title_en": "A Guide to a Website & Content That Actually Convert | "
                    "Hawih",
        "description_en": "How to build a fast website that turns visitors "
                          "into customers, and content that carries your "
                          "brand voice — a practical guide from Hawih.",
        "keywords": "تصميم موقع الكتروني, كتابة محتوى الموقع, تحسين تحويل "
                    "الموقع, website conversion content",
        "excerpt": ("الموقع الجميل وحده لا يكفي — إليك ما يحوّل الزيارة إلى "
                    "عميل فعلي.",
                    "A pretty website alone isn't enough — here's what turns "
                    "a visit into a real customer."),
        "related": ["website-design", "content-writing"],
        "sections": [
            ("ابدأ من رحلة العميل لا من الصفحات",
             "Start from the customer journey, not the pages",
             [("الموقع الناجح يُبنى حول سؤال واحد: ماذا يريد زائرك أن يفعل، "
               "وكيف نسهّل عليه ذلك؟ صمّم البنية حول هذا الهدف — وضوح، "
               "خطوات قليلة، ودعوة واضحة للتواصل في كل صفحة.",
               "A successful website is built around one question: what does "
               "your visitor want to do, and how do we make it easy? Design "
               "the structure around that goal — clarity, few steps, and a "
               "clear call to contact on every page.")]),
            ("السرعة والجوال أولاً",
             "Speed and mobile first",
             [("معظم الزيارات في السعودية تأتي من الجوال، والموقع البطيء "
               "يفقد العملاء قبل أن يقرأوا سطراً. الموقع السريع المتوافق مع "
               "الجوال يرفع التحويل وترتيبك في البحث معاً.",
               "Most traffic in Saudi Arabia comes from mobile, and a slow "
               "site loses customers before they read a line. A fast, "
               "mobile-friendly site raises both conversion and your search "
               "ranking.")]),
            ("المحتوى الذي يُقنع",
             "Content that persuades",
             [("التصميم يلفت الانتباه، لكن المحتوى يُقنع. اكتب بلغة عميلك، "
               "وركّز على المنفعة لا الميزات، وادعم كلامك بأمثلة وأعمال "
               "حقيقية. المحتوى الجيّد بالعربية والإنجليزية يوسّع وصولك.",
               "Design grabs attention, but content persuades. Write in your "
               "customer's language, focus on benefit over features, and "
               "back your claims with real examples and work. Good content "
               "in Arabic and English widens your reach.")]),
        ],
        "faq": [
            ("هل أحتاج موقعاً إذا كان لديّ حسابات سوشيال؟",
             "Do I need a website if I have social accounts?",
             "نعم — الموقع مِلكك أنت، يبني مصداقيتك ويظهر في بحث غوغل، "
             "بينما حسابات السوشيال مستأجرة وخوارزمياتها تتغيّر.",
             "Yes — a website is yours, builds credibility, and shows up in "
             "Google search, while social accounts are rented and their "
             "algorithms change."),
            ("هل تكتبون المحتوى أم أوفّره أنا؟",
             "Do you write the content or do I provide it?",
             "كلاهما ممكن: نكتب لك المحتوى بنبرة علامتك، أو ننسّق محتواك "
             "الجاهز باحترافية.",
             "Both are possible: we write content in your brand voice, or we "
             "professionally lay out content you provide."),
            ("هل الموقع يدعم العربية والإنجليزية؟",
             "Does the site support Arabic and English?",
             "نعم، نصمّم الاتجاهين معاً (RTL وLTR) مع محتوى طبيعي لكل لغة.",
             "Yes — we design both directions together (RTL and LTR) with "
             "natural content for each language."),
            ("كيف نبدأ؟",
             "How do we start?",
             "أرسل لنا نبذة عن نشاطك وأهدافك، ونرد خلال يوم عمل بخطة واضحة.",
             "Send us a note about your business and goals; we'll reply "
             "within one working day with a clear plan."),
        ],
    },
    {
        "slug": "choose-branding-agency",
        "kw": ("كيف تختار شركة تصميم هوية بصرية في الرياض؟",
               "How to Choose a Brand Identity Agency in Riyadh"),
        "title": "كيف تختار شركة تصميم هوية بصرية في الرياض؟ دليل ٢٠٢٦ | هوية",
        "description": "دليل عملي لاختيار شركة تصميم هوية بصرية في الرياض — "
                       "معايير المقارنة، الأسئلة التي تطرحها، والأخطاء التي "
                       "تتجنّبها قبل التوقيع. من استوديو هوية.",
        "title_en": "How to Choose a Brand Identity Agency in Riyadh (2026) "
                    "| Hawih",
        "description_en": "A practical guide to choosing a brand identity "
                          "agency in Riyadh — comparison criteria, the "
                          "questions to ask, and the mistakes to avoid.",
        "keywords": "اختيار شركة تصميم هوية, افضل شركة هوية بصرية الرياض, "
                    "شركة تصميم شعار, branding agency riyadh",
        "excerpt": ("معايير واضحة تساعدك على اختيار الشريك الصحيح لعلامتك "
                    "قبل أن تدفع.",
                    "Clear criteria to help you pick the right partner for "
                    "your brand before you pay."),
        "related": ["brand-identity", "logo-design"],
        "sections": [
            ("انظر إلى الأعمال لا إلى الوعود",
             "Look at the work, not the promises",
             [("أصدق دليل على قدرة أي شركة هو أعمالها السابقة. اطلب نماذج "
               "حقيقية في مجالك أو قريبة منه، وانظر إلى التنوّع والاتّساق "
               "والنتائج — لا إلى عدد المتابعين أو الشعارات اللامعة على "
               "الموقع.",
               "The truest proof of any studio is its past work. Ask for "
               "real samples in or near your field, and look at range, "
               "consistency, and results — not follower counts or shiny "
               "logos on the homepage.")]),
            ("اسأل عن العملية والملكية",
             "Ask about process and ownership",
             [("الشركة الجادة لديها عملية واضحة: اكتشاف، اتجاه، تنفيذ، "
               "تسليم. اسأل: كم جولة تعديل؟ ما الملفات التي أستلمها؟ هل "
               "أملك الحقوق كاملة؟ الإجابات الواضحة مؤشّر احترافية.",
               "A serious studio has a clear process: discovery, direction, "
               "execution, handover. Ask: how many revision rounds? which "
               "files do I receive? do I own full rights? Clear answers are "
               "a sign of professionalism.")]),
            ("تجنّب هذه الأخطاء الشائعة",
             "Avoid these common mistakes",
             [("لا تختر على أساس السعر الأرخص وحده، ولا تتجاهل التواصل في "
               "المرحلة الأولى — سرعة الرد ووضوحه ينبئان بتجربة العمل "
               "كلها. واحذر من غياب أي عقد أو نطاق عمل مكتوب.",
               "Don't choose on lowest price alone, and don't ignore "
               "communication early on — reply speed and clarity preview the "
               "whole engagement. And beware the absence of any written "
               "contract or scope.")]),
        ],
        "faq": [
            ("كيف أعرف أن الأعمال المعروضة حقيقية؟",
             "How do I know the portfolio is real?",
             "اطلب اسم العميل أو رابط المشروع المنشور، أو اسأل عن دور "
             "الشركة تحديداً في كل عمل.",
             "Ask for the client name or a link to the published project, or "
             "ask what the studio's specific role was in each piece."),
            ("هل الأغلى دائماً أفضل؟",
             "Is more expensive always better?",
             "ليس دائماً؛ الأهم توافق الخبرة والعملية مع احتياجك وميزانيتك. "
             "السعر وحده ليس مقياس الجودة.",
             "Not always; what matters is the fit of experience and process "
             "with your need and budget. Price alone isn't a quality "
             "measure."),
            ("ما أهم سؤال أطرحه قبل التوقيع؟",
             "What's the most important question before signing?",
             "«ماذا أستلم بالضبط، ومن يملك الحقوق؟» — الوضوح هنا يحميك "
             "لاحقاً.",
             "“Exactly what do I receive, and who owns the rights?” — clarity "
             "here protects you later."),
            ("هل تقدّمون استشارة قبل البدء؟",
             "Do you offer a consultation first?",
             "نعم، نبدأ بجلسة قصيرة نفهم فيها نشاطك قبل أي التزام.",
             "Yes — we start with a short session to understand your business "
             "before any commitment."),
        ],
    },
    {
        "slug": "brand-identity-elements",
        "kw": ("ما هي عناصر الهوية البصرية المتكاملة؟",
               "What Are the Elements of a Complete Brand Identity?"),
        "title": "ما هي عناصر الهوية البصرية المتكاملة؟ | هوية",
        "description": "تعرّف على عناصر الهوية البصرية — الشعار، الألوان، "
                       "الخطوط، العناصر، ودليل الاستخدام — وكيف تعمل معاً "
                       "لعلامة متّسقة ومميّزة.",
        "title_en": "What Are the Elements of a Complete Brand Identity? | "
                    "Hawih",
        "description_en": "The elements of a brand identity — logo, colour, "
                          "type, graphic elements, and a usage guide — and "
                          "how they work together for a consistent brand.",
        "keywords": "عناصر الهوية البصرية, مكونات الهوية التجارية, دليل "
                    "الهوية, brand identity elements",
        "excerpt": ("الهوية أكثر من شعار — إليك مكوّناتها وكيف تتكامل.",
                    "An identity is more than a logo — here are its parts "
                    "and how they fit together."),
        "related": ["brand-identity", "logo-design"],
        "sections": [
            ("الشعار ونظامه",
             "The logo and its system",
             [("الشعار هو حجر الأساس، لكنه يأتي بنسخ متعددة: أفقية "
               "وعمودية وأيقونة، بألوان كاملة وأحادية، لتناسب كل سياق من "
               "اللافتة إلى أيقونة التطبيق.",
               "The logo is the cornerstone, but it comes in several "
               "versions: horizontal, vertical, and icon, in full colour and "
               "mono — to fit every context from a signboard to an app "
               "icon.")]),
            ("الألوان والخطوط",
             "Colour and typography",
             [("لوحة الألوان والخطوط تمنح علامتك صوتها البصري. تُختار بعناية "
               "لتعبّر عن شخصيتك وتبقى واضحة على الشاشة والورق وبالعربية "
               "والإنجليزية معاً.",
               "Your colour palette and type give the brand its visual "
               "voice. They're chosen to express your personality and stay "
               "legible on screen and print, in Arabic and English alike.")]),
            ("العناصر والأنماط",
             "Graphic elements and patterns",
             [("إلى جانب الشعار، تحتاج علامتك إلى عناصر داعمة: أنماط، "
               "أيقونات، أسلوب صور، وتخطيطات. هذه العناصر تجعل تصاميمك "
               "تبدو منتمية لعلامة واحدة حتى دون ظهور الشعار.",
               "Beyond the logo, your brand needs supporting elements: "
               "patterns, icons, a photography style, and layouts. These "
               "make your designs feel like one brand even when the logo "
               "isn't shown.")]),
            ("دليل الاستخدام",
             "The usage guide",
             [("دليل الهوية يجمع القواعد: كيف ومتى تُستخدم العناصر، "
               "والمسافات، والأخطاء الممنوعة. هو ما يضمن بقاء علامتك "
               "متّسقة مهما تعدّد من يعمل عليها.",
               "The brand guide gathers the rules: how and when elements are "
               "used, spacing, and what to avoid. It's what keeps your brand "
               "consistent no matter how many people work on it.")]),
        ],
        "faq": [
            ("هل أحتاج كل هذه العناصر دفعةً واحدة؟",
             "Do I need all these elements at once?",
             "لا؛ يمكن البدء بالأساسيات (شعار، ألوان، خطوط) ثم التوسّع حسب "
             "نموّك واحتياجك.",
             "No; you can start with the essentials (logo, colours, type) "
             "and expand as you grow and need more."),
            ("ما الفرق بين الهوية ودليل الهوية؟",
             "What's the difference between an identity and a brand guide?",
             "الهوية هي العناصر نفسها؛ ودليل الهوية هو المستند الذي يشرح "
             "قواعد استخدامها.",
             "The identity is the elements themselves; the brand guide is "
             "the document that explains the rules for using them."),
            ("هل تصلح الهوية للعربية والإنجليزية؟",
             "Does the identity work for Arabic and English?",
             "نعم، نصمّم نظام الخطوط والعناصر ليعمل باللغتين منذ البداية.",
             "Yes — we design the type system and elements to work in both "
             "languages from the start."),
            ("كم يستغرق بناء هوية متكاملة؟",
             "How long does a full identity take?",
             "عادةً عدة أسابيع حسب النطاق وعدد التطبيقات المطلوبة.",
             "Usually several weeks, depending on scope and the number of "
             "applications required."),
        ],
    },
    {
        "slug": "company-profile-guide",
        "kw": ("كيف تكتب بروفايل شركة احترافي؟",
               "How to Write a Professional Company Profile"),
        "title": "كيف تكتب بروفايل شركة احترافي؟ خطوات ونصائح | هوية",
        "description": "دليل كتابة بروفايل شركة احترافي — الأقسام الأساسية، "
                       "نصائح المحتوى، وكيف يبرز ملفك التعريفي أمام العملاء "
                       "والمناقصات. من استوديو هوية.",
        "title_en": "How to Write a Professional Company Profile | Hawih",
        "description_en": "A guide to writing a professional company profile "
                          "— the essential sections, content tips, and how "
                          "to stand out to clients and tenders.",
        "keywords": "كيف تكتب بروفايل شركة, ملف تعريفي للشركة, محتوى بروفايل "
                    "الشركة, company profile writing",
        "excerpt": ("ما الذي يجعل الملف التعريفي مقنعاً — المحتوى قبل "
                    "التصميم.",
                    "What makes a profile persuasive — content before "
                    "design."),
        "related": ["company-profile", "content-writing"],
        "sections": [
            ("ابدأ بالأقسام الأساسية",
             "Start with the essential sections",
             [("البروفايل القوي يجيب على أسئلة العميل بترتيب منطقي: من "
               "نحن، ماذا نقدّم، لماذا نحن، أعمالنا، وكيف نتواصل. ابدأ من "
               "هذا الهيكل ثم خصّصه لنشاطك.",
               "A strong profile answers the client's questions in a logical "
               "order: who we are, what we offer, why us, our work, and how "
               "to reach us. Start from this skeleton, then tailor it to "
               "your business.")]),
            ("اكتب للقارئ لا عن نفسك",
             "Write for the reader, not about yourself",
             [("بدّل التركيز من «نحن نقدّم» إلى «أنت تحصل على». تحدّث عن "
               "المنفعة التي يجنيها العميل، وادعم كلامك بأرقام وأمثلة "
               "حقيقية بدل العبارات العامة.",
               "Shift the focus from “we provide” to “you get.” Talk about "
               "the benefit the client gains, and back it with real numbers "
               "and examples instead of generic phrases.")]),
            ("اجعل التصميم يخدم المحتوى",
             "Let design serve the content",
             [("التصميم الجيّد يسهّل القراءة لا يزحمها: تسلسل واضح، مساحات "
               "مريحة، وإنفوجرافيك للأرقام المهمة. وبنسخة ثنائية اللغة "
               "تصل إلى جمهور أوسع.",
               "Good design makes reading easier, not busier: a clear "
               "hierarchy, comfortable spacing, and infographics for key "
               "numbers. A bilingual version reaches a wider audience.")]),
        ],
        "faq": [
            ("كم صفحة يجب أن يكون البروفايل؟",
             "How many pages should a profile be?",
             "لا يوجد رقم ثابت؛ المهم أن يغطّي ما يحتاجه القارئ دون حشو. "
             "الوضوح أهم من الطول.",
             "There's no fixed number; what matters is covering what the "
             "reader needs without padding. Clarity beats length."),
            ("هل أكتب المحتوى أم أوكله لمختص؟",
             "Should I write it myself or hire a specialist?",
             "إن كان لديك وضوح حول رسالتك يمكنك البدء؛ ومختص المحتوى "
             "يصقلها ويرتّبها لتقنع أكثر.",
             "If you're clear on your message you can start; a content "
             "specialist then refines and structures it to be more "
             "persuasive."),
            ("هل أحتاج نسخة عربية وإنجليزية؟",
             "Do I need Arabic and English versions?",
             "إن كان جمهورك أو شركاؤك ثنائيي اللغة، فنعم — وهذا شائع في "
             "السوق السعودي.",
             "If your audience or partners are bilingual, yes — and that's "
             "common in the Saudi market."),
            ("هل تساعدون في الكتابة والتصميم معاً؟",
             "Do you help with both writing and design?",
             "نعم، يمكننا صياغة المحتوى وتصميم البروفايل كاملاً، أو تنسيق "
             "محتواك الجاهز.",
             "Yes — we can write the content and design the full profile, or "
             "lay out content you already have."),
        ],
    },
]


# ---- helpers ----------------------------------------------------------

def e(s: str) -> str:
    return html.escape(s, quote=True)


def ls(ar: str, en: str, cls: str = "") -> str:
    klass = ("lang-string " + cls).strip()
    return (f'<span class="{klass}" data-ar="{e(ar)}" data-en="{e(en)}">'
            f'{e(ar)}</span>')


WA_SVG = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" '
          'aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-'
          '2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-'
          '.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.'
          '788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.'
          '298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-'
          '.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.'
          '57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 '
          '1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.'
          '306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-'
          '.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-'
          '.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-'
          '3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 '
          '4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 '
          '0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.886 9.885M20.52 3.449C18.'
          '24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.'
          '549 4.14 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 '
          '1.448h.005c6.582 0 11.94-5.335 11.944-11.893a11.821 11.821 0 0 0-3.'
          '487-8.45"/></svg>')

ARROW = ('<svg viewBox="0 0 24 24" width="15" height="15" fill="none" '
         'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true" class="a-arrow">'
         '<path d="M7 17 17 7M9 7h8v8"/></svg>')


def wa_url(msg: str) -> str:
    return f"https://wa.me/{WA_NUMBER}?text={quote(msg)}"


WA_MSG = "مرحباً، قرأت مقالكم وأرغب باستشارة حول مشروعي."


CSS = r""":root{
  --blue:#1F1FFE;--blue-hover:#1414D6;--blue-soft:rgba(31,31,254,.10);
  --ink:#0B0B10;--ink-2:#14141C;--ink-line:rgba(255,255,255,.12);
  --paper:#F4F1EB;--paper-2:#E9E4D7;--line:rgba(11,11,16,.12);
  --muted:rgba(11,11,16,.70);--white:#fff;--wa:#25D366;--r:16px;
  --font-ar:"IBM Plex Sans Arabic","Inter",system-ui,Segoe UI,Tahoma,sans-serif;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--font-ar);
  font-size:18px;line-height:1.85;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:inherit;text-decoration:none}
h1,h2,h3,p,ul{margin:0}button{font-family:inherit}
.a-wrap{width:100%;max-width:760px;margin-inline:auto;padding-inline:22px}
.a-wide{max-width:1100px}
.skip{position:absolute;inset-inline-start:-9999px;top:0;z-index:100;background:var(--ink);
  color:#fff;padding:.7em 1.1em;border-radius:0 0 10px 10px;font-weight:600}
.skip:focus{inset-inline-start:0}
:focus-visible{outline:2px solid var(--blue);outline-offset:2px;border-radius:3px}
/* header */
.a-header{position:sticky;top:0;z-index:40;background:rgba(244,241,235,.85);
  backdrop-filter:saturate(140%) blur(12px);border-bottom:1px solid var(--line)}
.a-header__in{max-width:1100px;margin-inline:auto;padding:0 22px;height:64px;
  display:flex;align-items:center;justify-content:space-between;gap:12px}
.a-logo img{height:32px;width:auto}
.a-acts{display:flex;align-items:center;gap:10px}
.a-lang{background:transparent;border:1.5px solid var(--line);color:var(--ink);
  width:38px;height:38px;border-radius:50%;font-weight:600;cursor:pointer;font-size:.85rem}
.a-lang:hover{border-color:var(--ink)}
.a-wa{display:inline-flex;align-items:center;gap:.45em;background:var(--wa);color:#fff;
  padding:.55em 1em;border-radius:999px;font-weight:600;font-size:.9rem}
/* article */
.a-main{padding:42px 0 10px}
.a-eyebrow{display:inline-block;font-size:.82rem;font-weight:600;color:var(--blue);
  background:var(--blue-soft);padding:.4em .9em;border-radius:999px;margin-bottom:16px}
.a-h1{font-size:clamp(1.9rem,4.6vw,2.8rem);line-height:1.2;font-weight:700;letter-spacing:-.01em}
.a-meta{margin-top:14px;color:var(--muted);font-size:.92rem}
.a-lead{margin-top:20px;font-size:1.2rem;color:var(--muted)}
.a-toc{margin:30px 0;padding:20px 22px;background:var(--white);border:1px solid var(--line);
  border-radius:var(--r)}
.a-toc__t{font-weight:700;font-size:.95rem;margin-bottom:10px}
.a-toc ol{margin:0;padding-inline-start:1.2em;display:flex;flex-direction:column;gap:6px}
.a-toc a{color:var(--blue);font-weight:500}
.a-toc a:hover{text-decoration:underline}
.a-body h2{font-size:clamp(1.4rem,3vw,1.8rem);font-weight:700;margin:42px 0 14px;
  scroll-margin-top:80px;line-height:1.3}
.a-body p{margin:0 0 18px}
.a-related{margin:24px 0;padding:22px;background:var(--ink);color:var(--paper);border-radius:var(--r)}
.a-related__t{font-weight:700;margin-bottom:14px;font-size:1.05rem}
.a-related__links{display:flex;flex-wrap:wrap;gap:10px}
.a-chip{display:inline-flex;align-items:center;gap:.4em;background:rgba(244,241,235,.08);
  border:1px solid var(--ink-line);color:var(--paper);padding:.5em 1em;border-radius:999px;
  font-weight:600;font-size:.92rem}
.a-chip:hover{background:var(--blue);border-color:var(--blue)}
.a-chip .a-arrow{opacity:.8}
[dir="rtl"] .a-arrow{transform:scaleX(-1)}
/* faq */
.a-faq{margin:36px 0}
.a-faq h2{font-size:clamp(1.4rem,3vw,1.8rem);font-weight:700;margin-bottom:16px}
.a-faq__item{background:var(--white);border:1px solid var(--line);border-radius:var(--r);
  margin-bottom:10px;overflow:hidden}
.a-faq__q{display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:16px 20px;font-weight:600;cursor:pointer;list-style:none}
.a-faq__q::-webkit-details-marker{display:none}
.a-sign{flex:none;position:relative;width:16px;height:16px}
.a-sign::before,.a-sign::after{content:"";position:absolute;background:var(--blue);
  inset-block-start:50%;inset-inline-start:0;width:16px;height:2px;transform:translateY(-50%);
  transition:transform .2s ease}
.a-sign::after{transform:translateY(-50%) rotate(90deg)}
.a-faq__item[open] .a-sign::after{transform:translateY(-50%) rotate(0)}
.a-faq__a{padding:0 20px 18px;color:var(--muted)}
/* cta */
.a-cta{margin:40px 0;padding:34px 26px;background:var(--white);border:1px solid var(--line);
  border-radius:var(--r);text-align:center}
.a-cta h2{font-size:1.45rem;font-weight:700;margin-bottom:8px}
.a-cta p{color:var(--muted);margin-bottom:20px}
.a-cta__btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.a-btn{display:inline-flex;align-items:center;gap:.5em;padding:.85em 1.5em;border-radius:999px;
  font-weight:600;border:1.5px solid transparent;transition:transform .18s ease,background .18s ease}
.a-btn:hover{transform:translateY(-2px)}
.a-btn--wa{background:var(--wa);color:#fff}
.a-btn--out{border-color:var(--line);color:var(--ink)}
.a-btn--out:hover{border-color:var(--ink)}
/* hub */
.a-hero{padding:50px 0 14px;text-align:center}
.a-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;padding:24px 0 10px}
.a-card{display:flex;flex-direction:column;gap:10px;background:var(--white);
  border:1px solid var(--line);border-radius:var(--r);padding:24px;transition:transform .2s ease,box-shadow .2s ease}
.a-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(11,11,16,.08)}
.a-card__t{font-size:1.2rem;font-weight:700;line-height:1.35}
.a-card__x{color:var(--muted);font-size:.98rem}
.a-card__more{color:var(--blue);font-weight:600;font-size:.92rem;display:inline-flex;align-items:center;gap:.4em}
/* footer */
.a-footer{background:var(--ink-2);color:rgba(244,241,235,.8);padding:36px 0 26px;margin-top:30px}
.a-footer__in{max-width:1100px;margin-inline:auto;padding:0 22px;display:flex;flex-wrap:wrap;
  gap:20px;justify-content:space-between;align-items:center}
.a-footer__nav{display:flex;flex-wrap:wrap;gap:16px;font-size:.92rem;font-weight:500}
.a-footer__nav a:hover{color:#fff}
.a-footer__legal{max-width:1100px;margin:24px auto 0;padding:16px 22px 0;
  border-top:1px solid var(--ink-line);font-size:.8rem;color:rgba(244,241,235,.5);text-align:center}
/* floating whatsapp (hawih.js) */
.hawih-whatsapp{position:fixed;bottom:1.5rem;inset-inline-end:1.5rem;z-index:50;width:56px;height:56px;
  border-radius:50%;background:#25D366;color:#fff;display:inline-flex;align-items:center;justify-content:center;
  box-shadow:0 8px 24px rgba(37,211,102,.4),0 4px 12px rgba(0,0,0,.15);transition:transform .25s ease}
.hawih-whatsapp:hover{transform:scale(1.08) translateY(-2px);color:#fff}
.hawih-whatsapp:focus-visible{outline:2px solid #fff;outline-offset:3px}
@media (max-width:760px){.a-grid{grid-template-columns:1fr}}
@media (max-width:560px){body{font-size:17px}.a-cta__btns .a-btn{flex:1 1 100%}}
@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}html{scroll-behavior:auto}}
"""


def head(title: str, desc: str, keywords: str, slug: str, og_t: str,
         t_en: str, d_en: str, og_t_en: str) -> str:
    canon = "/articles" if slug == "articles" else f"/{slug}"
    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">

  <head>
    <script>(function(){{try{{var e=document.documentElement;e.setAttribute("data-theme","light");e.classList.add("light-mode");e.style.colorScheme="light";}}catch(_){{}}}})();</script>
    <meta charset="UTF-8">
    <title>{e(title)}</title>
    <meta name="description" content="{e(desc)}">
    <meta name="keywords" content="{e(keywords)}">
    <meta name="author" content="Hawih">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <script>
      (function () {{ try {{ var p = location.pathname;
        var lang = (p === '/en' || p.indexOf('/en/') === 0) ? 'en' : 'ar';
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl'; }} catch (e) {{}} }})();
    </script>
    <link rel="icon" type="image/png" href="/assets/img/favicon.png" sizes="any">
    <link rel="apple-touch-icon" href="/assets/img/favicon.png">

    <!-- Facebook Metadata Start -->
    <meta property="og:image:height" content="1200">
    <meta property="og:image:width" content="1200">
    <meta property="og:title" content="{e(og_t)}">
    <meta property="og:description" content="{e(desc)}">
    <meta property="og:url" content="https://hawih.com.sa{canon}">
    <meta property="og:image" content="https://hawih.com.sa/assets/img/hawih-og.jpg">
    <!-- Facebook Metadata End -->

    <!-- EN locale metadata (consumed by scripts/build-en-mirror.py) -->
    <meta name="hawih:title-en" content="{e(t_en)}">
    <meta name="hawih:description-en" content="{e(d_en)}">
    <meta name="hawih:og-title-en" content="{e(og_t_en)}">
    <meta name="hawih:og-description-en" content="{e(d_en)}">

    <!-- Template Styles Start -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap">
    <!-- Template Styles End -->

    <style>
{CSS}    </style>
  </head>

  <body>
    <a class="skip" href="#content">{ls("تخطَّ إلى المحتوى", "Skip to main content")}</a>
    <header class="a-header">
      <div class="a-header__in">
        <a class="a-logo" href="/" aria-label="Hawih · هوية"><img src="/assets/img/hawih-logo-black.png" alt="Hawih · هوية" width="115" height="32"></a>
        <div class="a-acts">
          <button class="a-lang langToggle" type="button" aria-label="Switch language">{ls("EN", "ع")}</button>
          <a class="a-wa" href="{e(wa_url(WA_MSG))}" target="_blank" rel="noopener">{WA_SVG}{ls("واتساب", "WhatsApp")}</a>
        </div>
      </div>
    </header>
'''


def footer() -> str:
    return f'''    <footer class="a-footer">
      <div class="a-footer__in">
        <nav class="a-footer__nav" aria-label="Footer">
          <a href="/">{ls("الرئيسية", "Home")}</a>
          <a href="/articles">{ls("المقالات", "Articles")}</a>
          <a href="/work">{ls("أعمالنا", "Work")}</a>
          <a href="/services">{ls("خدماتنا", "Services")}</a>
          <a href="/contact">{ls("تواصل معنا", "Contact")}</a>
        </nav>
        <a class="a-wa" href="tel:{PHONE}" dir="ltr">{PHONE_DISPLAY}</a>
      </div>
      <div class="a-footer__legal">{ls("© ٢٠٠٧–٢٠٢٦ هوية · Hawih. جميع الحقوق محفوظة.", "© 2007–2026 Hawih · هوية. All rights reserved.")}</div>
    </footer>
    <script src="/assets/js/hawih.js"></script>
  </body>
</html>
'''


def related_block(slugs: list) -> str:
    chips = "\n".join(
        f'          <a class="a-chip" href="/{s}">{ls(*LINK_TARGETS[s])}{ARROW}</a>'
        for s in slugs
    )
    return (
        '      <aside class="a-related">\n'
        f'        <p class="a-related__t">{ls("خدمات ذات صلة", "Related services")}</p>\n'
        f'        <div class="a-related__links">\n{chips}\n        </div>\n'
        '      </aside>'
    )


def cta_block() -> str:
    return (
        '      <section class="a-cta">\n'
        f'        <h2>{ls("عندك مشروع في ذهنك؟", "Got a project in mind?")}</h2>\n'
        f'        <p>{ls("أرسل لنا رسالة قصيرة ونرد خلال يوم عمل بخطوات واضحة.", "Send us a short message and we will reply within one working day with clear next steps.")}</p>\n'
        '        <div class="a-cta__btns">\n'
        f'          <a class="a-btn a-btn--wa" href="{e(wa_url(WA_MSG))}" target="_blank" rel="noopener">{WA_SVG}{ls("تواصل عبر واتساب", "Chat on WhatsApp")}</a>\n'
        f'          <a class="a-btn a-btn--out" href="/contact">{ls("صفحة التواصل", "Contact page")}</a>\n'
        '        </div>\n'
        '      </section>'
    )


def slugify_anchor(i: int) -> str:
    return f"s{i}"


def render_article(a: dict) -> str:
    secs = a["sections"]
    toc = "\n".join(
        f'          <li><a href="#{slugify_anchor(i)}">{ls(s[0], s[1])}</a></li>'
        for i, s in enumerate(secs)
    )
    body_parts = []
    for i, (h_ar, h_en, paras) in enumerate(secs):
        body_parts.append(f'        <h2 id="{slugify_anchor(i)}">{ls(h_ar, h_en)}</h2>')
        for p_ar, p_en in paras:
            body_parts.append(f'        <p>{ls(p_ar, p_en)}</p>')
    body = "\n".join(body_parts)
    faq_items = "\n".join(
        '        <details class="a-faq__item">\n'
        f'          <summary class="a-faq__q">{ls(q_ar, q_en)}<span class="a-sign" aria-hidden="true"></span></summary>\n'
        f'          <div class="a-faq__a"><p>{ls(a_ar, a_en)}</p></div>\n'
        '        </details>'
        for (q_ar, q_en, a_ar, a_en) in a["faq"]
    )
    h = head(a["title"], a["description"], a["keywords"], a["slug"],
             a["kw"][0], a["title_en"], a["description_en"], a["kw"][1])
    return h + f'''
    <main id="content" class="a-main">
      <article class="a-wrap">
        <p class="a-eyebrow">{ls("مقال · دليل", "Article · Guide")}</p>
        <h1 class="a-h1">{ls(*a["kw"])}</h1>
        <p class="a-meta">{ls("استوديو هوية · الرياض", "Hawih studio · Riyadh")} · <time datetime="{PUBLISH_DATE}">{ls("يونيو ٢٠٢٦", "June 2026")}</time></p>
        <p class="a-lead">{ls(*a["excerpt"])}</p>

        <nav class="a-toc" aria-label="{e('Contents')}">
          <p class="a-toc__t">{ls("محتويات المقال", "In this article")}</p>
          <ol>
{toc}
          </ol>
        </nav>

        <div class="a-body">
{body}
        </div>

{related_block(a["related"])}

        <section class="a-faq">
          <h2>{ls("أسئلة شائعة", "Frequently asked questions")}</h2>
{faq_items}
        </section>

{cta_block()}
      </article>
    </main>

''' + footer()


def render_hub() -> str:
    title = "مقالات ودلائل في التصميم والهوية البصرية | هوية Hawih"
    desc = ("دلائل عملية في تصميم الشعارات والهوية البصرية وبروفايل الشركات "
            "والمواقع والمحتوى — من استوديو هوية في الرياض.")
    title_en = "Design & Branding Articles and Guides | Hawih"
    desc_en = ("Practical guides on logo design, brand identity, company "
               "profiles, websites, and content — from Hawih studio, Riyadh.")
    cards = []
    for a in ARTICLES:
        cards.append(
            f'        <a class="a-card" href="/article-{a["slug"]}">\n'
            f'          <span class="a-card__t">{ls(*a["kw"])}</span>\n'
            f'          <span class="a-card__x">{ls(*a["excerpt"])}</span>\n'
            f'          <span class="a-card__more">{ls("اقرأ الدليل", "Read the guide")}{ARROW}</span>\n'
            '        </a>'
        )
    cards_html = "\n".join(cards)
    h = head(title, desc, "مقالات تصميم, دلائل الهوية البصرية, مدونة هوية, "
             "design articles arabic", "articles",
             "مقالات ودلائل التصميم | هوية", title_en, desc_en,
             "Design & Branding Guides | Hawih")
    return h + f'''
    <main id="content" class="a-wide a-wrap">
      <section class="a-hero">
        <p class="a-eyebrow">{ls("المقالات والدلائل", "Articles & guides")}</p>
        <h1 class="a-h1">{ls("دلائل عملية في التصميم والهوية البصرية", "Practical guides on design & brand identity")}</h1>
        <p class="a-lead">{ls("مقالات تساعدك على اتخاذ قرارات أوضح حول علامتك التجارية — من فريق هوية.", "Articles to help you make clearer decisions about your brand — from the Hawih team.")}</p>
      </section>
      <div class="a-grid">
{cards_html}
      </div>
{cta_block()}
    </main>

''' + footer()


def main() -> int:
    meta_sidecar: dict = {}
    for a in ARTICLES:
        (REPO_ROOT / f"article-{a['slug']}.html").write_text(
            render_article(a), encoding="utf-8")
        meta_sidecar[f"article-{a['slug']}"] = {
            "headline_ar": a["kw"][0], "headline_en": a["kw"][1],
            "desc_ar": a["description"], "desc_en": a["description_en"],
            "date": PUBLISH_DATE,
            "faq": [
                {"q_ar": q_ar, "q_en": q_en, "a_ar": a_ar, "a_en": a_en}
                for (q_ar, q_en, a_ar, a_en) in a["faq"]
            ],
        }
        print(f"  ~ article-{a['slug']}.html")
    (REPO_ROOT / "articles.html").write_text(render_hub(), encoding="utf-8")
    print("  ~ articles.html")
    sidecar = REPO_ROOT / "seo" / "jsonld" / "article-meta.json"
    sidecar.write_text(json.dumps(meta_sidecar, ensure_ascii=False, indent=2)
                       + "\n", encoding="utf-8")
    print(f"  ~ {sidecar.relative_to(REPO_ROOT)}")
    print(f"\n{len(ARTICLES)} articles + hub written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
