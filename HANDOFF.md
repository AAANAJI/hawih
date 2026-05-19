# Hawih — Project Handoff & Deploy Guide

**Branch:** `claude/hawih-optimal-design-ozqG9`  ·  **HEAD:** `b672adf`
**Repo:** `https://github.com/aaanaji/hawih`
**Status:** All site work is committed & pushed. **Not yet deployed to production.**

This file is internal — it is excluded from deployment (`*.md` is not synced to the server).

---

## 0. ⚠️ DEPLOY IS THE BLOCKER (read first)

All header / language / logo / footer fixes from the recent rounds are
committed on this branch (HEAD `b672adf`) and verified (0 HTML errors,
all pages 200). The LIVE site at https://hawih.com.sa is running an
OLDER build — confirmed from the page's computed CSS, which still lacks
`.mxd-nav__wrap{pointer-events:none}`, `.mxd-header.uc-scrolled`, and the
header scroll script. Symptoms still seen live (nothing clickable but the
burger, mode switch hidden, burger overlap, English default, glass always
on) are ALL already fixed in this branch. **Nothing more needs coding —
the branch must be deployed.** Deploy per §5, then hard-refresh.

## 1. Start here (new chat)

Everything is on the branch above. To deploy you only need to do **one** of:

- **Manual (from a Mac/box where SSH works):** `git pull` then `./deploy.sh`
- **Automatic (recommended):** add 4 GitHub Actions secrets → every push auto‑deploys

Details in §5. The Claude sandbox **cannot** deploy directly (its network policy blocks
outbound port 22 — confirmed; 80/443 only). Deployment must run from the user's Mac
or from GitHub Actions runners.

---

## 2. Server facts (do not lose these)

| Item | Value |
|---|---|
| Host / IP | `108.61.89.48` |
| SSH user | `root` |
| SSH password | `8Pq_]](RwT#5hs6(`  *(shared in chat — rotating it was declined by the owner)* |
| Hawih site docroot | `/var/www/hawih-site`  *(owner's note; `DEPLOY.md` said `/var/www/hawih` — the diagnostic step prints the real nginx root, trust that)* |
| Web server | nginx (vhosts in `/etc/nginx/sites-enabled/`) |
| Site runtime | static HTML + PHP endpoint `api/lead.php` (PHP‑FPM) |
| Lead log dir | `/var/log/hawih-leads` (owner `www-data`, mode `750`) |

### ⚠️ The CRM shares this server — never touch it
`crm.hawih.com.sa` (Rise CRM, CodeIgniter) runs on the **same box**, its own nginx
vhost/docroot. Both `deploy.sh` and the GitHub workflow:
- only ever write to `HAWIH_DOCROOT`
- **abort** if the target contains CodeIgniter (`application/` or
  `system/core/CodeIgniter.php`) — i.e. they refuse to overwrite the CRM
- back up the live docroot to `/root/hawih-backup-<timestamp>.tgz` before every deploy

---

## 3. What was built/changed (this branch)

Site rebuilt on the reference template ("optimal design"), bilingual (AR/EN via
`lang-string`), with the use‑cases shell. Highlights:

- **Home (`index.html`)** — built on the optimal design; hero "Creative services,
  end to end."; manifest, stats, stacking services, approach, marquees, blog/work, CTA.
- **Work** — `work.html` 4‑col grid; 24 `work-*.html` project pages rebuilt; factual
  content corrected for 14 projects.
- **About (`about.html`)** — faithful 1:1 reference lift, then the owner's exact Arabic
  content; Team section removed; real Hawih marquee images; **Founder's Note** rebuilt
  on the reference contact layout (portrait left, letter right) with a clear size
  hierarchy (lead = section‑title size, "رسالة المؤسّس" = name size, body enlarged).
- **Services (`services.html`)** — totally redesigned on `index.html`'s visual
  components; distinct **Inner‑Headline hero** (not the index sphere); WebGL divider &
  3‑products section removed; **8 disciplines** as plain‑colour stacking cards
  (`uc-dark`/`uc-light` deterministic contrast, no photos); 4‑phase Approach; About
  section removed; enlarged eyebrow.
- **Contact (`contact.html`)** — FAQ and Soft‑Close CTA sections removed; Phone /
  Email / WhatsApp channels made clickable; phone shown as Latin `+966 50 218 5471`
  with `dir="ltr"`; **form dropdowns** rewritten to the real services + clear budget
  ranges.
- **Footer (all 30 pages)** — phone wrapped `dir="ltr"` so it no longer renders
  reversed under RTL.
- **Favicon** — replaced sitewide with the brand icon → `assets/img/favicon.png`.
- **Floating WhatsApp button** — was an empty green circle (used `<iconify-icon>` but
  Iconify was never loaded); replaced with an inline SVG in `assets/js/hawih.js`
  (sitewide). Link: `https://wa.me/966502185471` + prefilled Arabic greeting.
- **Mobile fixes (sitewide, 31 pages)** — RTL font: the inline
  `[dir="rtl"] *` rule forced `Segoe UI/Tahoma/Arial` over IBM Plex Sans
  Arabic; now prefers `IBM Plex Sans Arabic`, plus a real `<link
  preconnect>` + Google Fonts stylesheet in `<head>` (was only the nested
  `@import` in `hawih.css`). Header/menu: decorative menu video replaced
  with a Contact + language‑toggle block inside the popup menu; on
  `≤991px` the header's lang toggle + contact button are hidden (now in
  the menu); header keeps logo + theme switch + hamburger.
- **Deploy tooling** — `.github/workflows/deploy.yml` + `deploy.sh` (see §5).

Full commit list: `git log --oneline` on the branch (40+ commits, `9e3559f` →
`c21e67d`).

---

## 4. CRM / lead form (`api/lead.php`)

- The contact form `#leadForm` POSTs to `/api/lead.php`.
- The **HTTP 501** seen locally is **expected**: the preview server
  (`python3 -m http.server`) is static and can't run PHP. On the real PHP host it runs.
- `lead.php` is complete and `php -l`‑clean. Flow: validate → **file‑log** the lead to
  `/var/log/hawih-leads/leads-YYYY-MM.jsonl` (safety net) → POST to Rise CRM at
  `https://crm.hawih.com.sa/index.php/collect_leads/save` (pinned to localhost via
  `CURLOPT_RESOLVE`) → redirect to `/thank-you.html`.
- `$PT_MAP` was extended to the new dropdown values (`brand`, `marketing`,
  `consulting`, `events`, `content-jazl`); `$BUDGET_MAP` unchanged (budget option
  `value`s were intentionally kept stable).
- **Open item:** the CRM IDs in `lead.php` CONFIG (`lead_source_id`,
  `owner_id`/`lead_status_id`, `custom_field_1..11`) must match the live Rise CRM
  (the file flags this as deploy‑time confirmation, ref `DEPLOY.md §1`). After first
  real submit, check the CRM + `/var/log/hawih-leads/_crm.log`.

---

## 5. Deployment

### Option A — Manual, from the owner's Mac (`deploy.sh`)

`deploy.sh` is in the repo root and replicates the proven manual process.

One‑time (zsh — **do not paste `#` comment lines**, owner's zsh runs them as commands):
```zsh
mv /Users/Anaji/Documents/Hawih "/Users/Anaji/Documents/Hawih-old-$(date +%s)"
git clone https://github.com/aaanaji/hawih.git /Users/Anaji/Documents/Hawih
cd /Users/Anaji/Documents/Hawih
git checkout claude/hawih-optimal-design-ozqG9
brew install hudochenkov/sshpass/sshpass
```
Each deploy:
```zsh
cd /Users/Anaji/Documents/Hawih
git pull
SSHPASS='8Pq_]](RwT#5hs6(' ./deploy.sh
```
`deploy.sh` does: print nginx vhost roots → CRM safety gate → remote backup →
`rsync -az --delete` (excludes `.git`,`.github`,`reference/`,`*.md`,`deploy.sh`,docs) →
`chown -R www-data:www-data` → `chmod 644` files / `755` dirs → ensure
`/var/log/hawih-leads` (www-data, 750) → `nginx -t && systemctl reload nginx` →
verify `https://hawih.com.sa/ -> 200`.
Overrides: `HAWIH_DOCROOT=… HAWIH_HOST=… HAWIH_USER=… HAWIH_PORT=… ./deploy.sh`
(default docroot `/var/www/hawih-site`).

### Option B — Automatic on every GitHub update (`.github/workflows/deploy.yml`)

Runs the **same steps** on GitHub‑hosted runners (port 22 reachable there) on push to
`main` / `claude/hawih-optimal-design-ozqG9`, and via "Run workflow". Until secrets
exist it skips cleanly (green, no‑op).

Add repo secrets — GitHub → **aaanaji/hawih** → Settings → Secrets and variables →
Actions:

| Secret | Value |
|---|---|
| `SSH_HOST` | `108.61.89.48` |
| `SSH_USER` | `root` |
| `SSH_PASSWORD` | `8Pq_]](RwT#5hs6(` |
| `HAWIH_DOCROOT` | `/var/www/hawih-site` |
| `SSH_PORT` | *(optional; only if SSH ≠ 22)* |

Then: GitHub → **Actions** → "Deploy Hawih site" → **Run workflow** (pick the branch).
The first run's "Show Hawih vhost root" step prints the real nginx roots — confirm
`HAWIH_DOCROOT` matches before relying on auto‑deploy.

---

## 6. Open decisions / TODO

- [ ] Choose deploy path (A and/or B) and run it.
- [ ] Confirm `HAWIH_DOCROOT` from the workflow/deploy.sh nginx diagnostic
      (`/var/www/hawih-site` vs `/var/www/hawih`).
- [ ] Optional: open a **PR to `main`** so merges become the auto‑deploy trigger.
- [ ] Optional: switch SSH auth to a **deploy key** (`SSH_KEY` secret) instead of the
      password; consider a dedicated deploy user instead of `root`.
- [ ] Security: root password was shared in chat history (rotation declined — revisit).
- [ ] After first live form submit: verify CRM mapping + `/var/log/hawih-leads/_crm.log`.
- [ ] Verify the live site visually (RTL/EN toggle, WhatsApp button, favicon cache).

---

## 7. Quick reference

- Branch: `claude/hawih-optimal-design-ozqG9` · HEAD `b672adf`
- Deploy now (Mac): `cd /Users/Anaji/Documents/Hawih && git pull && SSHPASS='…' ./deploy.sh`
- Deploy artifacts: `deploy.sh`, `.github/workflows/deploy.yml`
- Never write to the CRM (`crm.hawih.com.sa`, separate vhost; gated off).
- Backups land in `/root/hawih-backup-<timestamp>.tgz` before each deploy.
