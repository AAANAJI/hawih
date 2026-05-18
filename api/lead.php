<?php
/* ============================================================
   Hawih lead-intake endpoint
   ------------------------------------------------------------
   Receives contact-form POST → saves to local JSONL log →
   pushes to Rise CRM (crm.hawih.com.sa) → redirects visitor
   to /thank-you.html.

   File-log FIRST, CRM SECOND. If the CRM is down we never
   lose a lead — replay from the .jsonl later.

   Architecture / rationale: see /CRM_INTEGRATION_PLAYBOOK.md
   (or http://127.0.0.1:8080/playbook.html on the staging server).
   ============================================================ */

declare(strict_types=1);

/* ============================================================
   CONFIG — edit when CRM IDs are confirmed (see DEPLOY.md §1)
   ============================================================ */

$LEAD_LOG_DIR   = '/var/log/hawih-leads';
$THANK_YOU_URL  = '/thank-you.html?ok=1';
$FALLBACK_BACK  = '/contact.html';

/* CRM endpoint (Rise CRM) */
$CRM_URL        = 'https://crm.hawih.com.sa/index.php/collect_leads/save';
$CRM_RESOLVE    = 'crm.hawih.com.sa:443:127.0.0.1';   /* same-server: force traffic to localhost */
$CRM_OWNER_ID   = 1;     /* default lead owner = admin */
$CRM_STATUS_ID  = 1;     /* "New" */

/* Source page → CRM lead_source_id
   IDs MUST match rise_lead_source rows in the CRM (see DEPLOY.md §1) */
$SOURCE_MAP = [
    '/'              =>  6,   /* Website — Home */
    '/index.html'    =>  6,
    '/work.html'     =>  7,   /* Website — Work */
    '/services.html' =>  8,   /* Website — Services */
    '/about.html'    =>  9,   /* Website — About */
    '/contact.html'  => 10,   /* Website — Contact form */
];
$DEFAULT_SOURCE_ID = 10;

/* Form value → CRM project_type dropdown value
   Form ships explicit English short codes; AR strings kept as fallback
   in case markup is changed later. */
$PT_MAP = [
    /* English short codes (preferred — what the form posts) */
    'brand-identity' => 'Brand Identity',
    'brand-refresh'  => 'Brand Refresh',
    'social-wasil'   => 'Social — Wasil',
    'hawih-pro'      => 'Personal Branding — Hawih Pro',
    'ui-ux'          => 'UI / UX',
    'brand'          => 'Brand Strategy',
    'programming'    => 'Programming & Development',
    'marketing'      => 'Marketing Visuals',
    'consulting'     => 'Creative Consulting',
    'events'         => 'Events & Activations',
    'content-jazl'   => 'Content — Jazl',
    'project'        => 'Project — Other',
    'other'          => 'Other',

    /* Arabic fallbacks (in case someone edits the form HTML directly) */
    'هوية بصرية كاملة'           => 'Brand Identity',
    'إحياء علامة قائمة'          => 'Brand Refresh',
    'إدارة سوشيال — واصِل'      => 'Social — Wasil',
    'هوية شخصية — هوية برو'    => 'Personal Branding — Hawih Pro',
    'UI / UX'                     => 'UI / UX',
    'آخر'                         => 'Other',
];

/* Form value → CRM budget dropdown value
   Same approach: English short codes + AR fallbacks. */
$BUDGET_MAP = [
    /* Preferred — what the form posts */
    '1-5K SAR'     => '1–5K SAR',
    '5-25K SAR'    => '5–25K SAR',
    '25-100K SAR'  => '25–100K SAR',
    '100K+ SAR'    => '100K+ SAR',

    /* AR-indic numerals fallbacks */
    '١ – ٥ آلاف ر.س'      => '1–5K SAR',
    '٥ – ٢٥ ألف ر.س'      => '5–25K SAR',
    '٢٥ – ١٠٠ ألف ر.س'    => '25–100K SAR',
    '١٠٠ ألف ر.س +'       => '100K+ SAR',
];

/* ============================================================
   METHOD GATE
   ============================================================ */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . $FALLBACK_BACK, true, 303);
    exit;
}

/* ============================================================
   HONEYPOT — bots fill every field, humans never see this one
   ============================================================ */

if (!empty($_POST['company_website'] ?? '')) {
    /* Silent success: bot sees thank-you, no lead created */
    header('Location: ' . $THANK_YOU_URL, true, 303);
    exit;
}

/* ============================================================
   INPUT CLEANING
   ============================================================ */

function clean(string $key, int $max = 2000): string {
    $v = trim((string)($_POST[$key] ?? ''));
    /* Strip control chars (keeps newlines/tabs in brief) */
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v);
    return mb_substr($v, 0, $max);
}

$name        = clean('name',        120);
$company     = clean('company',     200);
$email       = clean('email',       200);
$phone       = clean('phone',        40);
$projectType = clean('project_type', 80);
$budget      = clean('budget',       60);
$brief       = clean('brief',      4000);
$lang        = clean('lang',          4) ?: 'ar';
$source      = clean('source',      120);
$gclid       = clean('gclid',       400);
$utmS        = clean('utm_source',   80);
$utmM        = clean('utm_medium',   80);
$utmC        = clean('utm_campaign',120);
$utmT        = clean('utm_term',    120);
$utmCt       = clean('utm_content', 120);

/* ============================================================
   VALIDATION — lenient. Don't reject "نريد هوية" type briefs.
   ============================================================ */

$errors = [];
if (mb_strlen($name) < 2)                       $errors[] = 'name';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($brief === '')                              $errors[] = 'brief';

if ($errors) {
    /* Save submitted values in a short cookie so JS can re-fill the form
       on the redirect-back to /contact.html?err=1 */
    $payload = base64_encode(json_encode([
        'name'    => $name,
        'company' => $company,
        'email'   => $email,
        'phone'   => $phone,
        'project_type' => $projectType,
        'budget'  => $budget,
        'brief'   => $brief,
        'errors'  => $errors,
    ], JSON_UNESCAPED_UNICODE));
    setcookie('lead_form', $payload, [
        'expires'  => time() + 300,
        'path'     => '/',
        'secure'   => true,
        'httponly' => false,         /* JS reads it */
        'samesite' => 'Lax',
    ]);
    $back = $source ?: ($_SERVER['HTTP_REFERER'] ?? $FALLBACK_BACK);
    $back = strtok($back, '?'); $back = strtok($back, '#');
    $sep  = (strpos($back, '?') === false) ? '?' : '&';
    header('Location: ' . $back . $sep . 'err=1&fields=' . implode(',', $errors), true, 303);
    exit;
}

/* ============================================================
   BUILD RECORD + FILE LOG (the safety net, never lose a lead)
   ============================================================ */

$ip      = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR'] ?? '';
$ua      = $_SERVER['HTTP_USER_AGENT'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

$record = [
    'ts'           => date('c'),
    'name'         => $name,
    'company'      => $company,
    'email'        => $email,
    'phone'        => $phone,
    'project_type' => $projectType,
    'budget'       => $budget,
    'brief'        => $brief,
    'lang'         => $lang,
    'source'       => $source ?: $referer,
    'gclid'        => $gclid,
    'utm'          => array_filter([
        'source'   => $utmS,
        'medium'   => $utmM,
        'campaign' => $utmC,
        'term'     => $utmT,
        'content'  => $utmCt,
    ]),
    'ip'           => $ip,
    'ua'           => $ua,
    'referer'      => $referer,
];

if (!is_dir($LEAD_LOG_DIR)) @mkdir($LEAD_LOG_DIR, 0750, true);
@file_put_contents(
    $LEAD_LOG_DIR . '/leads-' . date('Y-m') . '.jsonl',
    json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    FILE_APPEND | LOCK_EX
);

/* Clear any leftover error cookie from a previous attempt */
setcookie('lead_form', '', ['expires' => time() - 3600, 'path' => '/']);

/* ============================================================
   BUILD CRM PAYLOAD
   ============================================================ */

$parts      = preg_split('/\s+/', $name, 2);
$first_name = (string)($parts[0] ?? $name);
$last_name  = (string)($parts[1] ?? '-');

$source_id = $SOURCE_MAP[$source] ?? $DEFAULT_SOURCE_ID;

/* Lookup is case-insensitive on the English short codes */
$pt_key    = strtolower($projectType);
$pt_value  = $PT_MAP[$pt_key] ?? ($PT_MAP[$projectType] ?? $projectType);
$bg_value  = $BUDGET_MAP[$budget] ?? $budget;

$crm_payload = [
    'first_name'       => $first_name,
    'last_name'        => $last_name,
    'email'            => $email,
    'phone'            => $phone,
    'company_name'     => $company,
    'lead_source_id'   => $source_id,
    'owner_id'         => $CRM_OWNER_ID,
    'lead_status_id'   => $CRM_STATUS_ID,
    'is_embedded_form' => 1,

    /* Custom fields — IDs must match rise_custom_fields rows
       (see DEPLOY.md §1.5 for the create-order) */
    'custom_field_1'   => $pt_value,    /* project_type */
    'custom_field_2'   => $bg_value,    /* budget       */
    'custom_field_3'   => $brief,       /* brief        */
    'custom_field_4'   => $source,      /* source_page  */
    'custom_field_5'   => $gclid,       /* gclid        */
    'custom_field_6'   => $utmS,        /* utm_source   */
    'custom_field_7'   => $utmM,        /* utm_medium   */
    'custom_field_8'   => $utmC,        /* utm_campaign */
    'custom_field_9'   => $utmT,        /* utm_term     */
    'custom_field_10'  => $utmCt,       /* utm_content  */
    'custom_field_11'  => $lang,        /* language     */
];

/* ============================================================
   POST TO CRM (synchronous, ~80–150 ms on localhost)
   ============================================================ */

$ch = curl_init($CRM_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => http_build_query($crm_payload),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/x-www-form-urlencoded',
        'X-Forwarded-For: ' . $ip,
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 8,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_RESOLVE        => [$CRM_RESOLVE],   /* same-server lockdown bypass */
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$crm_resp = curl_exec($ch);
$crm_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$crm_err  = curl_error($ch);
curl_close($ch);

$crm_json   = json_decode((string)$crm_resp, true);
$crm_ok     = is_array($crm_json) && !empty($crm_json['success']);
$crm_msg    = is_array($crm_json) ? (string)($crm_json['message'] ?? '') : '';
$crm_status = $crm_ok ? 'ok'
            : ((is_array($crm_json) && str_contains(strtolower($crm_msg), 'already registered'))
                ? 'duplicate' : 'error');

@file_put_contents(
    $LEAD_LOG_DIR . '/_crm.log',
    json_encode([
        'ts'      => date('c'),
        'status'  => $crm_status,
        'http'    => $crm_code,
        'message' => $crm_msg,
        'err'     => $crm_err,
        'email'   => $email,
        'source'  => $source,
    ], JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

/* ============================================================
   ALWAYS REDIRECT — visitor never sees CRM internals
   ============================================================ */

header('Location: ' . $THANK_YOU_URL, true, 303);
exit;
