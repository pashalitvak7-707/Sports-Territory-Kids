<?php
/* ==========================================================================
 *  Журнал фиксации согласий на обработку персональных данных
 *  --------------------------------------------------------------------------
 *  Требование юристов (152-ФЗ): при заполнении форм сбора должны сохраняться
 *    1) имя пользователя;
 *    2) точные дата и время простановки галочки;
 *    3) IP-адрес пользователя;
 *    4) редакция документа, с которым человек согласился.
 *
 *  IP-адрес нельзя узнать из браузера — его видит только сервер, поэтому
 *  запись согласия отправляется сюда, а IP проставляется здесь же. Так его
 *  нельзя подделать со стороны посетителя.
 *
 *  Журнал — текстовый файл в формате JSON Lines (одна запись на строку),
 *  по файлу на месяц. Лежит ВЫШЕ корня сайта: не открывается из интернета
 *  и не затрагивается при обновлении сайта (git pull не трогает файлы,
 *  которых нет в репозитории).
 *
 *  Проверка после установки:  https://ts-kids.ru/consent-log.php?selftest=КЛЮЧ
 *  (тот же ключ AMO_SELFTEST_KEY, что и в amo-config.php)
 * ========================================================================== */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const TSK_LOG_DIR_NAME = 'tsk-consent-log';
const TSK_MAX_BODY     = 64 * 1024;   // защита от мусорных запросов

/* ------------------------------------------------------------ хранилище */
/* Пытаемся положить журнал на уровень выше корня сайта. Если не выходит —
   кладём внутрь сайта, но закрываем от веба через .htaccess. */
function tsk_log_dir(&$how = null) {
    $above = dirname(__DIR__) . '/' . TSK_LOG_DIR_NAME;
    if (is_dir($above) || @mkdir($above, 0755, true)) {
        if (is_writable($above)) { $how = 'над корнем сайта'; return $above; }
    }
    $inside = __DIR__ . '/' . TSK_LOG_DIR_NAME;
    if (is_dir($inside) || @mkdir($inside, 0755, true)) {
        $ht = $inside . '/.htaccess';
        if (!file_exists($ht)) {
            @file_put_contents($ht, "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
        }
        if (is_writable($inside)) { $how = 'внутри сайта, закрыт .htaccess'; return $inside; }
    }
    $how = 'НЕ УДАЛОСЬ СОЗДАТЬ';
    return null;
}

function tsk_log_file($dir) {
    return $dir . '/consent-' . gmdate('Y-m') . '.jsonl';
}

/* ------------------------------------------------------------------- IP */
/* На хостинге сайт обычно стоит за внутренним прокси: в REMOTE_ADDR тогда
   адрес самого сервера, а настоящий адрес посетителя — в заголовке прокси.
   Заголовкам доверяем ТОЛЬКО если REMOTE_ADDR внутренний, иначе их можно
   было бы подделать. */
function tsk_client_ip() {
    $remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
    $public = $remote && filter_var(
        $remote, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    );
    if ($public) return $remote;

    foreach (array('HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR') as $h) {
        if (empty($_SERVER[$h])) continue;
        $parts = explode(',', $_SERVER[$h]);
        $first = trim($parts[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) return $first;
    }
    return $remote;
}

/* ------------------------------------------------- диагностика (self-test) */
if (isset($_GET['selftest'])) {
    $key = '';
    $cfg = __DIR__ . '/amo-config.php';
    if (file_exists($cfg)) {
        require_once $cfg;
        if (defined('AMO_SELFTEST_KEY')) $key = AMO_SELFTEST_KEY;
    }
    if ($key === '' || !hash_equals((string)$key, (string)$_GET['selftest'])) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'error' => 'bad_key'));
        exit;
    }

    $how = null;
    $dir = tsk_log_dir($how);
    $file = $dir ? tsk_log_file($dir) : null;
    $lines = ($file && file_exists($file))
        ? count(file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES)) : 0;

    echo json_encode(array(
        'ok'              => (bool)$dir,
        'php'             => PHP_VERSION,
        'site_root'       => __DIR__,
        'log_dir'         => $dir,
        'log_placement'   => $how,
        'log_writable'    => $dir ? is_writable($dir) : false,
        'log_inside_site' => $dir ? (strpos($dir, __DIR__) === 0) : null,
        'log_file'        => $file,
        'records_this_month' => $lines,
        'your_ip_as_server_sees_it' => tsk_client_ip(),
        'remote_addr'     => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
        'x_real_ip'       => isset($_SERVER['HTTP_X_REAL_IP']) ? $_SERVER['HTTP_X_REAL_IP'] : null,
        'x_forwarded_for' => isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? $_SERVER['HTTP_X_FORWARDED_FOR'] : null,
    ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/* --------------------------------------------------------- приём записи */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'error' => 'post_only'));
    exit;
}

$raw = file_get_contents('php://input', false, null, 0, TSK_MAX_BODY + 1);
if (strlen($raw) > TSK_MAX_BODY) {
    http_response_code(413);
    echo json_encode(array('ok' => false, 'error' => 'too_large'));
    exit;
}
$in = json_decode($raw, true);
if (!is_array($in)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'error' => 'bad_json'));
    exit;
}

/* ловушка для ботов — то же скрытое поле, что и в amo.php */
if (!empty($in['_hp'])) {
    echo json_encode(array('ok' => true, 'skipped' => 'bot'));
    exit;
}

$dir = tsk_log_dir();
if (!$dir) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => 'log_dir_unavailable'));
    exit;
}

/* Собираем запись. Всё, что прислал сайт, кладём как есть, а время приёма
   и IP проставляем сами — им можно доверять. */
$record = array(
    'at'         => gmdate('c'),                       // время сервера, UTC
    'ip'         => tsk_client_ip(),
    'type'       => isset($in['_type']) ? (string)$in['_type'] : 'form',
    'context'    => isset($in['_context']) ? (string)$in['_context'] : '',
    'page'       => isset($in['_page']) ? (string)$in['_page'] : '',
    'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 300) : '',
    'fields'     => array(),
);
foreach ($in as $k => $v) {
    if ($k === '_hp' || $k === '_type' || $k === '_context' || $k === '_page') continue;
    if (is_array($v) || is_object($v)) $v = json_encode($v, JSON_UNESCAPED_UNICODE);
    $v = trim((string)$v);
    if ($v !== '') $record['fields'][(string)$k] = mb_substr($v, 0, 1000);
}

$line = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
$ok = @file_put_contents(tsk_log_file($dir), $line, FILE_APPEND | LOCK_EX);

if ($ok === false) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'error' => 'write_failed'));
    exit;
}
echo json_encode(array('ok' => true));
