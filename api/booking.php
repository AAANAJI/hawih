<?php
/* ============================================================
   api/booking.php — website proxy for the Meeting Booking module.

   Browser → hawih.com.sa/api/booking.php → crm.hawih.com.sa/meetings_api/*

   Mirrors the discipline of api/lead.php:
     - LOG-FIRST, CRM SECOND. A booking is appended to a local .jsonl
       BEFORE the CRM is called, so a CRM outage loses nothing and can
       be replayed from the log.
     - CURLOPT_RESOLVE pins the CRM host to 127.0.0.1 to bypass the
       shared-server SSL lockdown that blocks public-IP loopback.

   Unlike lead.php (a native form → 303 redirect) this returns JSON,
   because the /book-meeting page is a fetch()-driven app that needs the
   slot grid, the booking result, and the 409 slot-taken race.

   Operations (same-origin; the page never talks to the CRM directly):
     GET  ?op=config                         → CRM GET  /meetings_api/config   (optional; graceful 404)
     GET  ?op=slots&from&to&type             → CRM GET  /meetings_api/slots
     POST  (op=book)                         → CRM POST /meetings_api/book

   The CRM 404s these endpoints while meetings_enabled is off, and this
   proxy passes that through — so the module is inert until the CRM turns
   it on. See the Meeting Booking Module spec §7, §10.
   ============================================================ */

/* ---------- CONFIG ---------- */
$BOOK_LOG_DIR   = '/var/log/hawih-bookings';
$CRM_BASE       = 'https://crm.hawih.com.sa/meetings_api';
$CRM_CONFIG_URL = $CRM_BASE . '/config';
$CRM_SLOTS_URL  = $CRM_BASE . '/slots';
$CRM_BOOK_URL   = $CRM_BASE . '/book';
$CRM_RESOLVE    = 'crm.hawih.com.sa:443:127.0.0.1';   /* same-server lockdown bypass */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

/* ---------- helpers ---------- */
function out(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* Forward a request to the CRM. Returns [http_code, raw_body, curl_err]. */
function crm_call(string $url, ?array $post, string $resolve, string $ip): array {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_RESOLVE        => [$resolve],
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'X-Forwarded-For: ' . $ip,
        ],
    ];
    if ($post !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = http_build_query($post);
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/x-www-form-urlencoded';
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$code, (string) $body, $err];
}

function client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

$ip = client_ip();
$op = $_GET['op'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'book' : 'slots');

/* ============================================================
   GET config  (optional CRM endpoint — the page degrades if absent)
   ============================================================ */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $op === 'config') {
    [$code, $body, $err] = crm_call($CRM_CONFIG_URL, null, $CRM_RESOLVE, $ip);
    if ($code === 0) out(502, ['error' => 'crm_unreachable']);
    http_response_code($code === 404 ? 404 : ($code >= 200 && $code < 500 ? $code : 502));
    echo $body !== '' ? $body : json_encode(['error' => 'empty']);
    exit;
}

/* ============================================================
   GET slots
   ============================================================ */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $op === 'slots') {
    $q = http_build_query([
        'from' => (string) ($_GET['from'] ?? ''),
        'to'   => (string) ($_GET['to'] ?? ''),
        'type' => (string) ($_GET['type'] ?? 'online'),
    ]);
    [$code, $body, $err] = crm_call($CRM_SLOTS_URL . '?' . $q, null, $CRM_RESOLVE, $ip);
    if ($code === 0) out(502, ['error' => 'crm_unreachable']);
    http_response_code($code >= 200 && $code < 500 ? $code : 502);
    echo $body !== '' ? $body : json_encode(['error' => 'empty']);
    exit;
}

/* ============================================================
   POST book
   ============================================================ */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(405, ['error' => 'method_not_allowed']);
}

/* Honeypot: a bot filling the hidden field is accepted-and-discarded.
   Return a plausible pending response so the bot sees "success". */
if (!empty($_POST['company_website'] ?? '')) {
    out(200, ['success' => true, 'status' => 'pending', 'discarded' => true]);
}

$field = static function (string $k, int $max = 500): string {
    return trim(mb_substr((string) ($_POST[$k] ?? ''), 0, $max));
};

$payload = [
    'name'         => $field('name', 120),
    'email'        => $field('email', 200),
    'phone'        => $field('phone', 40),
    'company'      => $field('company', 200),
    'meeting_type' => $field('meeting_type', 16),
    'date'         => $field('date', 10),
    'start'        => $field('start', 5),
    'topic'        => $field('topic', 4000),
    'language'     => (($_POST['language'] ?? 'ar') === 'en') ? 'en' : 'ar',
    /* same tracking fields the contact form captures */
    'source_page'  => $field('source_page', 190),
    'utm_source'   => $field('utm_source', 190),
    'utm_medium'   => $field('utm_medium', 190),
    'utm_campaign' => $field('utm_campaign', 190),
    'gclid'        => $field('gclid', 190),
];

/* minimal server-side validation (the CRM re-validates authoritatively) */
$errors = [];
if ($payload['name'] === '')  $errors[] = 'name';
if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if (!in_array($payload['meeting_type'], ['online', 'office'], true)) $errors[] = 'meeting_type';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $payload['date'])) $errors[] = 'date';
if (!preg_match('/^\d{2}:\d{2}$/', $payload['start'])) $errors[] = 'start';
if ($errors) out(422, ['error' => 'invalid', 'fields' => $errors]);

/* LOG-FIRST — never lose a booking, even if the CRM is down. */
@mkdir($BOOK_LOG_DIR, 0770, true);
@file_put_contents(
    $BOOK_LOG_DIR . '/bookings-' . date('Y-m') . '.jsonl',
    json_encode(['ts' => date('c'), 'ip' => $ip] + $payload,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    FILE_APPEND | LOCK_EX
);

/* CRM SECOND */
[$code, $body, $err] = crm_call($CRM_BOOK_URL, $payload, $CRM_RESOLVE, $ip);

@file_put_contents(
    $BOOK_LOG_DIR . '/_crm.log',
    json_encode(['ts' => date('c'), 'http' => $code, 'email' => $payload['email'],
        'date' => $payload['date'], 'start' => $payload['start'], 'err' => $err],
        JSON_UNESCAPED_UNICODE) . "\n",
    FILE_APPEND | LOCK_EX
);

if ($code === 0) {
    /* CRM unreachable — the booking is safely in the log for replay. */
    out(502, ['error' => 'crm_unreachable',
              'message' => 'received_pending_manual']);
}

/* Pass the CRM response through verbatim, preserving its status code so
   the page can react to 409 slot_taken / 422 / 429 exactly as sent. */
http_response_code($code >= 200 && $code < 600 ? $code : 502);
echo $body !== '' ? $body : json_encode(['error' => 'empty']);
exit;
