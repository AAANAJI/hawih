<?php
/* ============================================================
   Hawih lead-intake endpoint
   ------------------------------------------------------------
   Receives form POST → saves to local JSONL log → routes to
   the right CRM endpoint based on `source`:

     /careers   → https://crm.hawih.com.sa/index.php/job_applications/public_save
     /affiliate → https://crm.hawih.com.sa/index.php/affiliates/public_save
     anything else (/, /contact, /services, /work, …)
                → https://crm.hawih.com.sa/index.php/collect_leads/save
                  (the generic Leads module — current behaviour)

   File-log FIRST, CRM SECOND. If the CRM is down we never
   lose a lead — replay from the .jsonl later.

   Architecture / rationale: see /CRM_INTEGRATION_PLAYBOOK.md
   (or http://127.0.0.1:8080/playbook.html on the staging server).
   ============================================================ */

declare(strict_types=1);

/* ============================================================
   CONFIG
   ============================================================ */

$LEAD_LOG_DIR   = '/var/log/hawih-leads';
$THANK_YOU_URL  = '/thank-you?ok=1';
$FALLBACK_BACK  = '/contact';

/* CRM endpoints (all served from the same host; CURLOPT_RESOLVE
   below forces traffic to localhost so we bypass the shared-server
   SSL lockdown that blocks public-IP loopback). */
$CRM_LEADS_URL        = 'https://crm.hawih.com.sa/index.php/collect_leads/save';
$CRM_CAREERS_URL      = 'https://crm.hawih.com.sa/index.php/job_applications/public_save';
$CRM_AFFILIATES_URL   = 'https://crm.hawih.com.sa/index.php/affiliates/public_save';
$CRM_RESOLVE          = 'crm.hawih.com.sa:443:127.0.0.1';

$CRM_OWNER_ID   = 1;     /* default lead owner = admin */
$CRM_STATUS_ID  = 1;     /* "New" */

/* ----- LEGACY (collect_leads/save) mappings ----------------- */

/* Source page → CRM lead_source_id
   IDs MUST match rise_lead_source rows in the CRM (see DEPLOY.md §1).
   Note: /careers and /affiliate are listed here for legacy reasons
   but they're routed to dedicated modules now — these IDs only
   apply if the dedicated path is ever disabled. */
$SOURCE_MAP = [
    '/'              =>  6,   /* Website — Home */
    '/index'         =>  6,
    '/index.html'    =>  6,
    '/work'          =>  7,   /* Website — Work */
    '/work.html'     =>  7,
    '/services'      =>  8,   /* Website — Services */
    '/services.html' =>  8,
    '/about'         =>  9,   /* Website — About */
    '/about.html'    =>  9,
    '/contact'       => 10,   /* Website — Contact form */
    '/contact.html'  => 10,
    '/affiliate'     => 11,
    '/careers'       => 12,
];
$DEFAULT_SOURCE_ID = 10;

/* Form value → CRM project_type dropdown value (legacy Leads) */
$PT_MAP = [
    /* English short codes (preferred — what /contact posts) */
    'brand-identity' => 'Brand Identity',
    'brand-refresh'  => 'Brand Refresh',
    /* Landing-page ad groups (scripts/build-landing-pages.py). Values are
       display strings for the CRM project_type field only — no CRM IDs. */
    'logo-design'     => 'Logo Design',
    'company-profile' => 'Company Profile',
    'website-design'  => 'Website Design',
    'content-writing' => 'Content Writing',
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

$BUDGET_MAP = [
    '1-5K SAR'     => '1–5K SAR',
    '5-25K SAR'    => '5–25K SAR',
    '25-100K SAR'  => '25–100K SAR',
    '100K+ SAR'    => '100K+ SAR',
    '١ – ٥ آلاف ر.س'      => '1–5K SAR',
    '٥ – ٢٥ ألف ر.س'      => '5–25K SAR',
    '٢٥ – ١٠٠ ألف ر.س'    => '25–100K SAR',
    '١٠٠ ألف ر.س +'       => '100K+ SAR',
];

/* ----- CAREERS (job_applications/public_save) mappings ----- */

$CAREERS_POSITION_MAP = [
    'careers-design'      => 'التصميم البصري',
    'careers-development' => 'تطوير الواجهات والمنتجات',
    'careers-strategy'    => 'الاستراتيجية والمحتوى',
    'careers-pm'          => 'إدارة المشاريع الإبداعية',
    'careers-other'       => 'غير ذلك',
];

$CAREERS_EXP_MAP = [
    'exp-junior' => '0-1',
    'exp-mid'    => '1-3',
    'exp-senior' => '3-5',
    'exp-lead'   => '5-10',
];

/* ----- AFFILIATE (affiliates/public_save) mappings --------- */

$AFFILIATE_CHANNELS_MAP = [
    'affiliate-freelancer' => 'مستقل / فريلانسر',
    'affiliate-agency'     => 'وكالة أو استوديو',
    'affiliate-consultant' => 'مستشار تسويق أو علامة',
    'affiliate-creator'    => 'صانع محتوى أو مؤثر',
    'affiliate-other'      => 'غير ذلك',
];

$AFFILIATE_AUDIENCE_MAP = [
    'reach-personal'     => '<1k',
    'reach-professional' => '1k-10k',
    'reach-audience'     => '10k-100k',
    'reach-clients'      => '100k+',
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
   Same rule across all three endpoints: name + email + brief.
   ============================================================ */

$errors = [];
if (mb_strlen($name) < 2)                       $errors[] = 'name';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($brief === '')                              $errors[] = 'brief';

if ($errors) {
    /* Save submitted values in a short cookie so JS can re-fill the form
       on the redirect-back to /contact?err=1 */
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
   PAYLOAD BUILDERS — one per CRM endpoint
   ============================================================ */

/**
 * /job_applications/public_save — Careers module.
 * Splits `name` on the first whitespace into first_name + last_name.
 * Form's `company` field carries the portfolio URL, mapped to
 * `linkedin_url`. Brief goes into `notes`.
 */
function build_careers_payload(
    string $name, string $email, string $phone, string $company,
    string $projectType, string $budget, string $brief,
    array $position_map, array $exp_map
): array {
    $parts      = preg_split('/\s+/', $name, 2);
    $first_name = (string)($parts[0] ?? $name);
    $last_name  = (string)($parts[1] ?? '');

    $position = $position_map[$projectType] ?? $projectType;
    $years    = $exp_map[$budget]            ?? $budget;

    return [
        'first_name'       => $first_name,
        'last_name'        => $last_name,
        'email'            => $email,
        'phone'            => $phone,
        'linkedin_url'     => $company,
        'position'         => $position,
        'years_experience' => $years,
        'notes'            => $brief,
        'source'           => 'website /careers',
    ];
}

/**
 * /affiliates/public_save — Affiliates module.
 * Single `name` field (no split). Form's `company` → `company_name`.
 * project_type → channels, budget → audience_size.
 */
function build_affiliate_payload(
    string $name, string $email, string $phone, string $company,
    string $projectType, string $budget, string $brief,
    array $channels_map, array $audience_map
): array {
    $channels = $channels_map[$projectType] ?? $projectType;
    $audience = $audience_map[$budget]       ?? $budget;

    return [
        'name'          => $name,
        'company_name'  => $company,
        'email'         => $email,
        'phone'         => $phone,
        'website'       => '',
        'audience_size' => $audience,
        'channels'      => $channels,
        'notes'         => $brief,
    ];
}

/**
 * /collect_leads/save — Generic Leads module (legacy + all other
 * sources). Splits `name` on the first whitespace and remaps the
 * project_type / budget dropdowns into CRM custom-field values.
 */
function build_lead_payload(
    string $name, string $email, string $phone, string $company,
    string $projectType, string $budget, string $brief,
    string $source, string $lang,
    string $gclid, string $utmS, string $utmM, string $utmC,
    string $utmT, string $utmCt,
    int $source_id, int $owner_id, int $status_id,
    array $pt_map, array $bg_map
): array {
    $parts      = preg_split('/\s+/', $name, 2);
    $first_name = (string)($parts[0] ?? $name);
    $last_name  = (string)($parts[1] ?? '-');

    /* Lookup is case-insensitive on the English short codes */
    $pt_key   = strtolower($projectType);
    $pt_value = $pt_map[$pt_key] ?? ($pt_map[$projectType] ?? $projectType);
    $bg_value = $bg_map[$budget] ?? $budget;

    return [
        'first_name'       => $first_name,
        'last_name'        => $last_name,
        'email'            => $email,
        'phone'            => $phone,
        'company_name'     => $company,
        'lead_source_id'   => $source_id,
        'owner_id'         => $owner_id,
        'lead_status_id'   => $status_id,
        'is_embedded_form' => 1,
        /* Custom fields — IDs must match rise_custom_fields rows */
        'custom_field_1'   => $pt_value,
        'custom_field_2'   => $bg_value,
        'custom_field_3'   => $brief,
        'custom_field_4'   => $source,
        'custom_field_5'   => $gclid,
        'custom_field_6'   => $utmS,
        'custom_field_7'   => $utmM,
        'custom_field_8'   => $utmC,
        'custom_field_9'   => $utmT,
        'custom_field_10'  => $utmCt,
        'custom_field_11'  => $lang,
    ];
}

/* ============================================================
   ROUTE — pick endpoint + payload based on $source
   ============================================================ */

if ($source === '/careers') {
    $CRM_URL     = $CRM_CAREERS_URL;
    $crm_payload = build_careers_payload(
        $name, $email, $phone, $company,
        $projectType, $budget, $brief,
        $CAREERS_POSITION_MAP, $CAREERS_EXP_MAP
    );
} elseif ($source === '/affiliate') {
    $CRM_URL     = $CRM_AFFILIATES_URL;
    $crm_payload = build_affiliate_payload(
        $name, $email, $phone, $company,
        $projectType, $budget, $brief,
        $AFFILIATE_CHANNELS_MAP, $AFFILIATE_AUDIENCE_MAP
    );
} else {
    $CRM_URL     = $CRM_LEADS_URL;
    $source_id   = $SOURCE_MAP[$source] ?? $DEFAULT_SOURCE_ID;
    $crm_payload = build_lead_payload(
        $name, $email, $phone, $company,
        $projectType, $budget, $brief,
        $source, $lang,
        $gclid, $utmS, $utmM, $utmC, $utmT, $utmCt,
        $source_id, $CRM_OWNER_ID, $CRM_STATUS_ID,
        $PT_MAP, $BUDGET_MAP
    );
}

/* ============================================================
   POST TO CRM (synchronous, ~80–150 ms on localhost)
   Same curl block for all three endpoints — only URL + payload
   differ. CURLOPT_RESOLVE bypasses the shared-server SSL
   lockdown by forcing the host to resolve to 127.0.0.1.
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
$crm_id     = is_array($crm_json) ? ($crm_json['id'] ?? null) : null;
$crm_status = $crm_ok ? 'ok'
            : ((is_array($crm_json) && str_contains(strtolower($crm_msg), 'already registered'))
                ? 'duplicate' : 'error');

@file_put_contents(
    $LEAD_LOG_DIR . '/_crm.log',
    json_encode([
        'ts'       => date('c'),
        'status'   => $crm_status,
        'http'     => $crm_code,
        'endpoint' => parse_url($CRM_URL, PHP_URL_PATH) ?: $CRM_URL,
        'crm_id'   => $crm_id,
        'message'  => $crm_msg,
        'err'      => $crm_err,
        'email'    => $email,
        'source'   => $source,
    ], JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

/* ============================================================
   ALWAYS REDIRECT — visitor never sees CRM internals
   ============================================================ */

header('Location: ' . $THANK_YOU_URL, true, 303);
exit;
