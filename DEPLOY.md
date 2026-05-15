# Hawih → Rise CRM — Deployment Guide

Step-by-step to take the contents of `/staging/` and deploy under `https://hawih.com.sa` so the contact form lands leads in `https://crm.hawih.com.sa`.

Based on the `CRM Integration Playbook` (Shfrah → Rise CRM template).

> **Assumption: marketing site (`hawih.com.sa`) and CRM (`crm.hawih.com.sa`) live on the same server.**
> If they don't, see §6 — the change is small (replace `CURLOPT_RESOLVE` with IP allowlist).

---

## 0 · What's already in this folder

| Path | What it is | Edit? |
| --- | --- | --- |
| `api/lead.php` | Server endpoint — receives form, logs, posts to CRM | **Yes — update CONFIG block (§1)** |
| `assets/js/hawih.js` | Sitewide JS — includes UTM capture + form recovery | No |
| `assets/css/hawih.css` | Sitewide CSS — includes error-state styles | No |
| `contact.html` | The form, POSTs to `/api/lead.php` | No |
| `thank-you.html` | Where visitors land after submit | No |
| `*.html` (28 other pages) | Static pages | No |

---

## 1 · CRM setup (Rise CRM admin)

Log into `https://crm.hawih.com.sa` as admin.

### 1.1 — Enable the public lead-capture endpoint

**Settings → Leads → "Allow create lead from public form" → ON.**

Or via DB:
```sql
UPDATE rise_settings SET setting_value = '1'
WHERE setting_name IN ('can_create_lead_from_public_form',
                       'enable_embedded_form_to_get_leads');
```

### 1.2 — Lead sources (create 5)

**Settings → Lead Sources → Add**. Create these in this order — the IDs they get **must match** `$SOURCE_MAP` in `api/lead.php`:

| ID | Title |
| --- | --- |
| 6  | Website — Home |
| 7  | Website — Work |
| 8  | Website — Services |
| 9  | Website — About |
| 10 | Website — Contact form |

> If the IDs you get are different (e.g. you already had lead sources 1–5), copy them into `$SOURCE_MAP` and `$DEFAULT_SOURCE_ID` in `api/lead.php`. Look them up:
> ```sql
> SELECT id, title FROM rise_lead_source WHERE deleted = 0 ORDER BY id;
> ```

### 1.3 — Custom fields (create 11)

**Settings → Custom Fields → Add new**. Create each one **with "Show in embedded form" ON** and **"Related to: Leads"** — without "show in embedded form" Rise CRM silently ignores them.

Create in this order so IDs match `custom_field_1` through `custom_field_11` in `api/lead.php`:

| ID | Title | Field type | Dropdown options (if applicable) |
| --- | --- | --- | --- |
| 1 | `project_type` | Dropdown | `Brand Identity` · `Brand Refresh` · `Social — Wasil` · `Personal Branding — Hawih Pro` · `UI / UX` · `Project — Other` · `Other` |
| 2 | `budget` | Dropdown | `1–5K SAR` · `5–25K SAR` · `25–100K SAR` · `100K+ SAR` |
| 3 | `brief` | Textarea | — |
| 4 | `source_page` | Text | — |
| 5 | `gclid` | Text | — |
| 6 | `utm_source` | Text | — |
| 7 | `utm_medium` | Text | — |
| 8 | `utm_campaign` | Text | — |
| 9 | `utm_term` | Text | — |
| 10 | `utm_content` | Text | — |
| 11 | `language` | Text | — |

Verify they all got IDs 1–11 (or note the actual IDs and update `api/lead.php` accordingly):
```sql
SELECT id, title, field_type, show_in_embedded_form
FROM rise_custom_fields
WHERE related_to = 'leads' AND deleted = 0
ORDER BY id;
```

### 1.4 — Note the admin user + new-status IDs

```sql
SELECT id, first_name, last_name, email FROM rise_users
WHERE user_type='staff' AND deleted=0 AND is_admin=1;

SELECT id, title FROM rise_lead_status WHERE deleted=0 ORDER BY sort;
```

Plug the admin's `id` into `$CRM_OWNER_ID` in `api/lead.php` (probably `1`) and the "New" status ID into `$CRM_STATUS_ID` (also usually `1`).

### 1.5 — Quick raw-curl probe (confirms the CRM accepts leads)

From the server (or your machine, while the lockdown in §5 is NOT yet in place):

```bash
curl -k -X POST "https://crm.hawih.com.sa/index.php/collect_leads/save" \
  -d "first_name=Probe" \
  -d "last_name=Test" \
  -d "email=probe-$(date +%s)@test.com" \
  -d "lead_source_id=10" \
  -d "owner_id=1" \
  -d "lead_status_id=1" \
  -d "is_embedded_form=1" \
  -d "custom_field_1=Brand Identity" \
  -d "custom_field_2=5–25K SAR" \
  -d "custom_field_3=Probe brief from playbook"
```

Expected response: `{"success":true,"message":"Lead created"}`.

Verify it landed:
```sql
SELECT id, company_name, email, lead_source_id, created_date
FROM rise_clients WHERE is_lead=1 ORDER BY id DESC LIMIT 1;

SELECT cf.id, cf.title, cfv.value
FROM rise_custom_field_values cfv
JOIN rise_custom_fields cf ON cf.id = cfv.custom_field_id
WHERE cfv.related_to_type = 'leads'
  AND cfv.related_to_id = (SELECT MAX(id) FROM rise_clients WHERE is_lead=1);
```

All three custom fields you set should have values. **If they don't, custom-field IDs in `api/lead.php` don't match the CRM — fix the IDs first, before moving on.**

---

## 2 · Server prerequisites

```bash
# PHP-FPM (if not already there)
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y php8.1-fpm

# Required extensions — easy to forget, fatal if missing
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    php8.1-curl \
    php8.1-mbstring

sudo systemctl restart php8.1-fpm
```

> Substitute `php8.1` with whatever version is already running on the server. Check with `php -v`.

**Sanity check** — both extensions loaded:
```bash
php -m | grep -Ei 'curl|mbstring'
# Should print:  curl  mbstring
```

---

## 3 · Upload + create the log dir

### 3.1 — Upload `/staging/` contents

```
/var/www/hawih/
├── api/
│   └── lead.php
├── assets/                       (css, js, img, etc.)
├── about.html
├── contact.html
├── index.html
├── services.html
├── thank-you.html
├── work.html
└── work-*.html  (24 project pages)
```

(Do **not** upload `DEPLOY.md` — it's reference only.)

### 3.2 — Log directory

```bash
sudo mkdir -p /var/log/hawih-leads
sudo chown www-data:www-data /var/log/hawih-leads
sudo chmod 750 /var/log/hawih-leads
```

> `www-data` is the user PHP-FPM runs as on Debian/Ubuntu. If your distro is different, match the FPM user (`ps -ef | grep fpm`).

### 3.3 — Confirm the config matches the CRM IDs from §1

Edit `/var/www/hawih/api/lead.php` and re-check the CONFIG block at the top:
```php
$CRM_URL        = 'https://crm.hawih.com.sa/index.php/collect_leads/save';
$CRM_RESOLVE    = 'crm.hawih.com.sa:443:127.0.0.1';
$CRM_OWNER_ID   = 1;     // from §1.4
$CRM_STATUS_ID  = 1;     // from §1.4

$SOURCE_MAP = [
    '/'              =>  6,   // §1.2
    '/index.html'    =>  6,
    '/work.html'     =>  7,
    '/services.html' =>  8,
    '/about.html'    =>  9,
    '/contact.html'  => 10,
];
```

Custom field IDs are `1`–`11` by default. If yours differ, change `custom_field_N` → `custom_field_<your_id>` in the `$crm_payload` block.

---

## 4 · nginx — marketing-site vhost

The marketing site is static HTML + one PHP file. Standard nginx vhost:

`/etc/nginx/sites-enabled/hawih.com.sa`:
```nginx
server {
    listen 443 ssl http2;
    server_name hawih.com.sa www.hawih.com.sa;

    root  /var/www/hawih;
    index index.html;

    # SSL — your existing certificate config
    ssl_certificate     /etc/letsencrypt/live/hawih.com.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hawih.com.sa/privkey.pem;

    # Static + clean URLs (so /thank-you also resolves to /thank-you.html)
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # PHP — only /api/lead.php uses it
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|webp|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Long-cache the JS/CSS once you version their URLs (optional)
    location ~* \.(css|js)$ {
        expires 1d;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;
}

# Redirect http → https (and www → apex)
server {
    listen 80;
    server_name hawih.com.sa www.hawih.com.sa;
    return 301 https://hawih.com.sa$request_uri;
}
server {
    listen 443 ssl http2;
    server_name www.hawih.com.sa;
    ssl_certificate     /etc/letsencrypt/live/hawih.com.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hawih.com.sa/privkey.pem;
    return 301 https://hawih.com.sa$request_uri;
}
```

Reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5 · Lockdown — CRM lead endpoint = localhost-only

**Without this, anyone who finds the CRM endpoint URL can flood the CRM with junk leads.** With it, only the marketing site's PHP can post.

### 5.1 — Global guard map

`/etc/nginx/conf.d/leadguard.conf`:
```nginx
# Block external POSTs to the Rise CRM lead-capture endpoint.
# Localhost (marketing site's PHP via CURLOPT_RESOLVE) stays allowed.
map "$remote_addr:$request_uri" $deny_lead_save {
    default                                  0;
    "~^127\.0\.0\.1:.*"                      0;
    "~:/collect_leads/save"                  1;
    "~:/index\.php/collect_leads/save"       1;
}
```

### 5.2 — Enforce in the CRM vhost

Open `/etc/nginx/sites-enabled/crm.hawih.com.sa` and add the `if` line near the top of the `server { ... }` block:
```nginx
server {
    server_name crm.hawih.com.sa;
    root /var/www/crm;

    # Lock the public lead-capture endpoint — only localhost may POST
    if ($deny_lead_save) { return 403; }

    # ... rest of CRM config ...
}
```

Reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 5.3 — Verify lockdown

```bash
# External POST should return 403
curl -sI -X POST "https://crm.hawih.com.sa/index.php/collect_leads/save" \
    -d "first_name=hack" -d "email=h@h.com" \
    -o /dev/null -w "%{http_code}\n"
# Expected: 403
```

The marketing site's `/api/lead.php` will still succeed because it uses `CURLOPT_RESOLVE → 127.0.0.1`, which makes the request originate from localhost.

---

## 6 · If marketing site and CRM are on DIFFERENT servers

`CURLOPT_RESOLVE` won't help — calls go over the public internet.

1. In `api/lead.php`, remove the `CURLOPT_RESOLVE` line:
   ```php
   // CURLOPT_RESOLVE         => [$CRM_RESOLVE],
   ```
2. In `leadguard.conf`, add the marketing-site server's public IP:
   ```nginx
   map "$remote_addr:$request_uri" $deny_lead_save {
       default                                  0;
       "~^203\.0\.113\.45:.*"                   0;   # marketing site's IP
       "~^127\.0\.0\.1:.*"                      0;
       "~:/collect_leads/save"                  1;
       "~:/index\.php/collect_leads/save"       1;
   }
   ```

---

## 7 · End-to-end smoke test

### 7.1 — Real form submission via curl

```bash
curl -sL -X POST "https://hawih.com.sa/api/lead.php" \
  --data-urlencode "name=Test User" \
  --data-urlencode "email=test-$(date +%s)@example.com" \
  --data-urlencode "phone=+966500000000" \
  --data-urlencode "project_type=brand-identity" \
  --data-urlencode "budget=5-25K SAR" \
  --data-urlencode "brief=Real-world smoke test from playbook" \
  --data-urlencode "source=/contact.html" \
  --data-urlencode "lang=ar" \
  --data-urlencode "gclid=test-gclid-1234" \
  --data-urlencode "utm_source=google" \
  --data-urlencode "utm_medium=cpc" \
  --data-urlencode "utm_campaign=hawih-launch-2026" \
  -o /dev/null -w "HTTP=%{http_code} time=%{time_total}s\n"
```

Expected: `HTTP=303 time<0.3s`.

### 7.2 — Confirm it reached the CRM

```sql
SELECT c.id, CONCAT(c.first_name,' ',c.last_name) AS name, c.email,
       s.title AS source, c.created_date
FROM rise_clients c LEFT JOIN rise_lead_source s ON s.id = c.lead_source_id
WHERE c.is_lead=1 ORDER BY c.id DESC LIMIT 1;

SELECT cf.title, cfv.value
FROM rise_custom_field_values cfv
JOIN rise_custom_fields cf ON cf.id = cfv.custom_field_id
WHERE cfv.related_to_type='leads'
  AND cfv.related_to_id=(SELECT MAX(id) FROM rise_clients WHERE is_lead=1)
ORDER BY cf.id;
```

All 11 custom fields should have values (some may be empty if you didn't pass `gclid`/`utm_*` in the test).

### 7.3 — Confirm the file-log safety net

```bash
sudo tail -1 /var/log/hawih-leads/leads-$(date +%Y-%m).jsonl | python3 -m json.tool
sudo tail -1 /var/log/hawih-leads/_crm.log               | python3 -m json.tool
```

`_crm.log` should show `"status": "ok"`.

### 7.4 — Real browser test

1. Open `https://hawih.com.sa/contact.html`
2. Fill the form
3. Submit → land on `/thank-you.html?ok=1`
4. New lead appears in the CRM (refresh the Leads list)

### 7.5 — Honeypot test (verify bots get silently dropped)

```bash
curl -sL -X POST "https://hawih.com.sa/api/lead.php" \
  --data-urlencode "name=Bot User" \
  --data-urlencode "email=bot@example.com" \
  --data-urlencode "brief=hi" \
  --data-urlencode "company_website=http://bot.example.com" \
  -o /dev/null -w "HTTP=%{http_code}\n"
```

Expected: `HTTP=303` (redirect), and **no new lead** appears in `rise_clients`.

### 7.6 — Validation test (empty brief)

```bash
curl -sL -X POST "https://hawih.com.sa/api/lead.php" \
  --data-urlencode "name=Test" \
  --data-urlencode "email=valid@example.com" \
  --data-urlencode "brief=" \
  -o /dev/null -w "HTTP=%{http_code} location=%{redirect_url}\n"
```

Expected: redirect back to `/contact.html?err=1&fields=brief`. Browser will pre-fill the form from the `lead_form` cookie and highlight the empty Brief field in red.

---

## 8 · CRM email notification (optional but recommended)

Out-of-the-box Rise CRM sends a notification email to the lead owner when a new lead is created — **but only if SMTP is configured in the CRM**.

Configure: **Settings → Email → SMTP**. Vultr/DigitalOcean block outbound port 25; use **port 587 with TLS** and a Gmail SMTP App Password (or Google Workspace SMTP relay).

If you want the admin's inbox to ping when a lead lands, this is the simplest way.

---

## 9 · Gotcha shortcut list (saves debugging)

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Form submits but no lead in CRM | `is_embedded_form` was off, or `can_create_lead_from_public_form` setting off | Verify §1.1 setting + `is_embedded_form=1` in payload |
| Custom fields blank in CRM | Field IDs in `api/lead.php` don't match CRM IDs | Re-check §1.3 query, update lead.php |
| External curl to CRM returns 200 (not 403) | `leadguard.conf` not picked up | `nginx -t`, confirm file exists in `/etc/nginx/conf.d/`, reload |
| Submission returns blank 500 | `php-curl` or `php-mbstring` missing | `apt-get install`, restart fpm |
| Visitor stuck on a "page not found" on `/thank-you/` | Tried to use `/thank-you/` trailing slash; we use `/thank-you.html` | `$THANK_YOU_URL = '/thank-you.html?ok=1'` in lead.php is correct — confirm vhost rewrites support the `try_files $uri $uri.html` pattern |
| Lead appears once but every retry → "already registered" | Rise CRM rejects exact-email duplicates | Expected. Admin merges manually in CRM UI. Visitor still sees `/thank-you.html`. |
| Form recovery (cookie pre-fill) doesn't work | Cookie blocked or wrong domain | Confirm `secure=true` is fine (you're on HTTPS), and that `samesite=Lax` survived the redirect |
| Mail from CRM lands in spam | SPF/DKIM not set up for `hawih.com.sa` | Add SPF/DKIM records, or use Gmail SMTP relay (App Password) |

---

## 10 · What lives where (final cheat-sheet)

```
Marketing site:    /var/www/hawih/
  Static pages:    /var/www/hawih/*.html
  PHP endpoint:    /var/www/hawih/api/lead.php
  Lead log:        /var/log/hawih-leads/leads-YYYY-MM.jsonl
  CRM-call log:    /var/log/hawih-leads/_crm.log

CRM:               /var/www/crm/  (Rise CRM)
  Endpoint:        https://crm.hawih.com.sa/index.php/collect_leads/save
                   (locked to 127.0.0.1 in nginx)
  Lead sources:    IDs 6–10 → SOURCE_MAP in lead.php
  Custom fields:   IDs 1–11 → custom_field_N in lead.php
  Admin user:      owner_id=1 → CRM_OWNER_ID in lead.php
  New status:      lead_status_id=1 → CRM_STATUS_ID in lead.php
```

End-to-end latency on same-server: **~100–150 ms** from visitor click → `/thank-you.html`.

---

_Last updated: 2026-05-14. Source playbook: `CRM_INTEGRATION_PLAYBOOK.md` / `http://127.0.0.1:8080/playbook.html`._
