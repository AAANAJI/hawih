# Hawih · هوية

A Saudi design studio website — bilingual (Arabic / English), light + dark theme, integrated with a Rise CRM lead pipeline.

**Live:** [hawih.com.sa](https://hawih.com.sa)

---

## Stack

- **Static HTML + Tailwind (CDN)** — every page is a standalone .html file
- **PHP 8.x** endpoint (`/api/lead.php`) for the contact form
- **Three.js shader** for the homepage hero animation
- **Iconify** for icons
- **IBM Plex Sans Arabic + Inter** as the type pair

## Layout

```
/
├── index.html              ← homepage
├── about.html              ← studio story
├── services.html           ← 8 disciplines + 3 sub-products
├── work.html               ← 24-project grid (with filter chips)
├── contact.html            ← lead form
├── thank-you.html          ← post-submit landing
├── work-<slug>.html        ← 24 project pages (taglines from briefs MD)
├── api/lead.php            ← form intake → file log → Rise CRM
├── assets/
│   ├── css/hawih.css       ← brand tokens, components
│   ├── js/hawih.js         ← language toggle, mobile nav, scroll reveals
│   ├── js/webgl-hero.js    ← hero shader (homepage only)
│   ├── img/logo/           ← Hawih wordmark variants
│   ├── img/work/<slug>/    ← project imagery (01–04.jpeg per project)
│   └── img/work/client-*.png ← client logos
└── DEPLOY.md               ← full deployment playbook
```

## Brand

- **Cobalt:** `#0001fc`
- **Paper:** `#F4F1EB`
- **Ink:** `#0B0B10`
- **Type:** IBM Plex Sans Arabic (primary) · Inter (Latin support)

## CRM integration

Contact form → `/api/lead.php` → writes a JSONL safety log to `/var/log/hawih-leads/` → POSTs to Rise CRM at `crm.hawih.com.sa` via `CURLOPT_RESOLVE` (same-server, localhost lockdown). Honeypot, validation, error-recovery cookie. Full details in `DEPLOY.md`.

## Deploy

See `DEPLOY.md` for the full server-side playbook — CRM admin setup (lead sources + custom fields), PHP-FPM requirements, nginx vhost config, leadguard lockdown, smoke tests.

Files live on the server at `/var/www/hawih-site/`, served by nginx with PHP-FPM for `/api/lead.php`.

## License

© 2007–2026 Hawih · هوية. All rights reserved.
