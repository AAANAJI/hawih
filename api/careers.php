<?php
/* ============================================================
   api/careers.php — website proxy for the Careers module.

   Browser -> hawih.com.sa/api/careers.php -> crm.hawih.com.sa/*

   Same discipline as api/lead.php / api/booking.php:
     - LOG-FIRST (metadata) then CRM. A CRM outage still records the
       applicant so you can follow up; the CV binary is not replayed.
     - CURLOPT_RESOLVE pins the CRM host to 127.0.0.1 (shared-server SSL).

   Returns JSON (the /careers page is a fetch()-driven app).

     GET  ?op=list              -> CRM job_openings/public_list
     GET  ?op=get&slug=SLUG     -> CRM job_openings/public_get/SLUG
     POST  (apply, multipart)   -> CRM job_applications/public_save
                                   (forwards the uploaded CV as multipart)
   ============================================================ */

$CARE_LOG_DIR = '/var/log/hawih-careers';
$CRM_BASE     = 'https://crm.hawih.com.sa';
$CRM_LIST_URL = $CRM_BASE . '/job_openings/public_list';
$CRM_GET_URL  = $CRM_BASE . '/job_openings/public_get/';
$CRM_APPLY_URL = $CRM_BASE . '/job_applications/public_save';
$CRM_RESOLVE  = 'crm.hawih.com.sa:443:127.0.0.1';
$MAX_CV_BYTES = 50 * 1024 * 1024;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function out($code, $body) {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function crm_call($url, $post, $resolve, $ip) {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,   // allow a large CV upload
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_RESOLVE        => [$resolve],
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'X-Forwarded-For: ' . $ip],
    ];
    if ($post !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = $post;   // array (may hold a CURLFile) => multipart
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$code, (string) $body, $err];
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$op = $_GET['op'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'apply' : 'list');

/* ---------- GET list ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $op === 'list') {
    [$code, $body, $err] = crm_call($CRM_LIST_URL, null, $CRM_RESOLVE, $ip);
    if ($code === 0) out(502, ['success' => false, 'error' => 'crm_unreachable']);
    http_response_code($code >= 200 && $code < 500 ? $code : 502);
    echo $body !== '' ? $body : json_encode(['success' => false, 'error' => 'empty']);
    exit;
}

/* ---------- GET one ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $op === 'get') {
    $slug = preg_replace('/[^A-Za-z0-9._-]+/', '', (string) ($_GET['slug'] ?? ''));
    if ($slug === '') out(400, ['success' => false, 'error' => 'bad_slug']);
    [$code, $body, $err] = crm_call($CRM_GET_URL . rawurlencode($slug), null, $CRM_RESOLVE, $ip);
    if ($code === 0) out(502, ['success' => false, 'error' => 'crm_unreachable']);
    http_response_code($code >= 200 && $code < 500 ? $code : 502);
    echo $body !== '' ? $body : json_encode(['success' => false, 'error' => 'empty']);
    exit;
}

/* ---------- POST apply ---------- */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(405, ['success' => false, 'error' => 'method_not_allowed']);
}

/* Honeypot — accept-and-discard bots. */
if (!empty($_POST['company_website'] ?? '')) {
    out(200, ['success' => true, 'discarded' => true]);
}

$field = static function ($k, $max = 500) {
    return trim(mb_substr((string) ($_POST[$k] ?? ''), 0, $max));
};

$post = [
    'first_name'       => $field('first_name', 100),
    'last_name'        => $field('last_name', 100),
    'email'            => $field('email', 191),
    'phone'            => $field('phone', 50),
    'job_opening_id'   => (string) (int) ($_POST['job_opening_id'] ?? 0),
    'position'         => $field('position', 191),
    'years_experience' => $field('years_experience', 20),
    'linkedin_url'     => $field('linkedin_url', 255),
    'city'             => $field('city', 100),
    'country'          => $field('country', 100),
    'notes'            => $field('notes', 4000),
    'source'           => 'careers',
];

if ($post['first_name'] === '' || !filter_var($post['email'], FILTER_VALIDATE_EMAIL)) {
    out(422, ['success' => false, 'error' => 'invalid', 'fields' => ['first_name', 'email']]);
}

/* CV file (optional but expected) — validate type + size, attach as multipart. */
$cv_meta = null;
if (!empty($_FILES['cv']) && is_uploaded_file($_FILES['cv']['tmp_name']) && (int) $_FILES['cv']['error'] === 0) {
    $name = (string) $_FILES['cv']['name'];
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $size = (int) $_FILES['cv']['size'];
    if (!in_array($ext, ['pdf', 'doc', 'docx'], true)) {
        out(422, ['success' => false, 'error' => 'cv_type']);
    }
    if ($size > $MAX_CV_BYTES) {
        out(413, ['success' => false, 'error' => 'cv_too_large']);
    }
    $post['cv'] = new CURLFile($_FILES['cv']['tmp_name'], (string) $_FILES['cv']['type'], $name);
    $cv_meta = ['name' => $name, 'size' => $size];
}

/* LOG-FIRST (metadata only; CV binary not stored here). */
@mkdir($CARE_LOG_DIR, 0770, true);
@file_put_contents(
    $CARE_LOG_DIR . '/careers-' . date('Y-m') . '.jsonl',
    json_encode([
        'ts' => date('c'), 'ip' => $ip,
        'name' => $post['first_name'] . ' ' . $post['last_name'],
        'email' => $post['email'], 'phone' => $post['phone'],
        'job_opening_id' => $post['job_opening_id'], 'position' => $post['position'],
        'cv' => $cv_meta,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    FILE_APPEND | LOCK_EX
);

/* CRM SECOND. */
[$code, $body, $err] = crm_call($CRM_APPLY_URL, $post, $CRM_RESOLVE, $ip);

@file_put_contents(
    $CARE_LOG_DIR . '/_crm.log',
    json_encode(['ts' => date('c'), 'http' => $code, 'email' => $post['email'], 'err' => $err],
        JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

if ($code === 0) {
    out(502, ['success' => false, 'error' => 'crm_unreachable', 'message' => 'received_manual']);
}
http_response_code($code >= 200 && $code < 600 ? $code : 502);
echo $body !== '' ? $body : json_encode(['success' => false, 'error' => 'empty']);
exit;
