<?php
/* ==========================================================================
 *  amoCRM — приём заявок с сайта «Территория Спорта КИДС»
 *  --------------------------------------------------------------------------
 *  Сайт присылает сюда заявку (JSON, POST). Скрипт создаёт в amoCRM сделку
 *  и контакт, а всю аналитику (ClientID, yclid, UTM, страница входа и т.д.)
 *  прикладывает примечанием к сделке.
 *
 *  Токен и адрес аккаунта берутся из amo-config.php (в git не попадает).
 *  Работает только на сервере с PHP (Beget). На GitHub Pages PHP не исполняется —
 *  там запрос просто вернёт 404, и сайт это молча проигнорирует.
 *
 *  Проверка после установки:   https://ts-kids.ru/amo.php?selftest=ВАШ-СЕКРЕТ
 * ========================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$cfg = __DIR__ . '/amo-config.php';
if (!file_exists($cfg)) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'no_config']);
  exit;
}
require $cfg;

if (!defined('AMO_BASE') || !defined('AMO_TOKEN') || AMO_TOKEN === '' || strpos(AMO_TOKEN, 'ВСТАВЬТЕ') === 0) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'config_incomplete']);
  exit;
}

/* ------------------------------------------------------------------ helpers */
function amo_request($method, $path, $body = null) {
  $ch = curl_init(rtrim(AMO_BASE, '/') . $path);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_HTTPHEADER     => [
      'Authorization: Bearer ' . AMO_TOKEN,
      'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_CONNECTTIMEOUT => 10,
  ]);
  if ($body !== null) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
  }
  $resp = curl_exec($ch);
  $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  return ['code' => (int)$code, 'body' => $resp, 'err' => $err];
}

/* ------------------------------------------------- диагностика (self-test) */
/* GET amo.php?selftest=КЛЮЧ  — проверяет токен и показывает поля сделок,
   чтобы можно было настроить сопоставление кастомных полей (этап 2). */
if (isset($_GET['selftest'])) {
  $key = defined('AMO_SELFTEST_KEY') ? AMO_SELFTEST_KEY : '';
  if ($key === '' || !hash_equals((string)$key, (string)$_GET['selftest'])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'bad_key']);
    exit;
  }
  $acc    = amo_request('GET', '/api/v4/account');
  $fields = amo_request('GET', '/api/v4/leads/custom_fields');
  $pipes  = amo_request('GET', '/api/v4/leads/pipelines');
  echo json_encode([
    'ok'           => $acc['code'] === 200,
    'token_valid'  => $acc['code'] === 200,
    'account_http' => $acc['code'],
    'account'      => json_decode($acc['body'], true),
    'lead_fields'  => json_decode($fields['body'], true),
    'pipelines'    => json_decode($pipes['body'], true),
    'curl_error'   => $acc['err'] ?: null,
  ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  exit;
}

/* --------------------------------------------------------- приём заявки */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'post_only']);
  exit;
}

$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'bad_json']);
  exit;
}

/* ловушка для ботов: скрытое поле _hp должно быть пустым */
if (!empty($in['_hp'])) {
  echo json_encode(['ok' => true, 'skipped' => 'bot']);
  exit;
}

$name  = trim((string)($in['name'] ?? $in['parent'] ?? ''));
$phone = trim((string)($in['phone'] ?? ''));
if ($name === '' && $phone === '') {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'empty_lead']);
  exit;
}

$context  = trim((string)($in['_context'] ?? 'Заявка с сайта'));
$leadName = $context . ($name !== '' ? ' — ' . $name : '');

/* контакт с телефоном */
$contact = ['name' => $name !== '' ? $name : 'Клиент с сайта'];
if ($phone !== '') {
  $contact['custom_fields_values'] = [[
    'field_code' => 'PHONE',
    'values'     => [['value' => $phone, 'enum_code' => 'WORK']],
  ]];
}

/* теги: «сайт» + название формы */
$tags = [['name' => 'сайт']];
if ($context !== '') $tags[] = ['name' => $context];

$lead = [[
  'name'      => $leadName,
  '_embedded' => ['contacts' => [$contact], 'tags' => $tags],
]];
if (defined('AMO_PIPELINE_ID')    && AMO_PIPELINE_ID)    $lead[0]['pipeline_id']         = (int)AMO_PIPELINE_ID;
if (defined('AMO_RESPONSIBLE_ID') && AMO_RESPONSIBLE_ID) $lead[0]['responsible_user_id'] = (int)AMO_RESPONSIBLE_ID;

$res = amo_request('POST', '/api/v4/leads/complex', $lead);
if ($res['code'] < 200 || $res['code'] >= 300) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'amo_error', 'http' => $res['code'], 'detail' => $res['body']]);
  exit;
}

$created = json_decode($res['body'], true);
$leadId  = $created[0]['id'] ?? null;

/* примечание со всей аналитикой и данными заявки */
if ($leadId) {
  $labels = [
    'child'        => 'Имя ребёнка',
    'childage'     => 'Возраст ребёнка',
    'lesson'       => 'Занятие',
    'contact'      => 'Способ связи',
    'text'         => 'Комментарий',
    '_page'        => 'Страница заявки',
    '_utm_source'  => 'utm_source',
    '_utm_medium'  => 'utm_medium',
    '_utm_campaign'=> 'utm_campaign',
    '_utm_term'    => 'utm_term',
    '_utm_content' => 'utm_content',
    '_yclid'       => 'yclid',
    '_ym_cid'      => 'ClientID Метрики',
    '_referrer'    => 'Реферер',
    '_landing'     => 'Первая страница входа',
    '_first_visit' => 'Дата первого визита',
  ];
  $lines = [];
  if ($phone !== '') $lines[] = 'Телефон: ' . $phone;
  /* IP виден только серверу — берём его здесь, а не из данных формы */
  $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  if ($ip !== '' && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
    foreach (['HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR'] as $h) {
      if (empty($_SERVER[$h])) continue;
      $first = trim(explode(',', $_SERVER[$h])[0]);
      if (filter_var($first, FILTER_VALIDATE_IP)) { $ip = $first; break; }
    }
  }
  if ($ip !== '') $lines[] = 'IP-адрес: ' . $ip;
  foreach ($labels as $k => $label) {
    $v = trim((string)($in[$k] ?? ''));
    if ($v !== '') $lines[] = $label . ': ' . $v;
  }
  if ($lines) {
    amo_request('POST', '/api/v4/leads/' . $leadId . '/notes', [[
      'note_type' => 'common',
      'params'    => ['text' => implode("\n", $lines)],
    ]]);
  }
}

echo json_encode(['ok' => true, 'lead_id' => $leadId]);
