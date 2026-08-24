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

/* ------------------------------------------------------- проверка ключа */
/* Диагностика и выгрузка журнала закрыты тем же секретом, что и amo.php
   (AMO_SELFTEST_KEY в amo-config.php). Ключ не хранится в коде сайта:
   в админке его вводят вручную. */
function tsk_secret_key() {
    $cfg = __DIR__ . '/amo-config.php';
    if (file_exists($cfg)) {
        require_once $cfg;
        if (defined('AMO_SELFTEST_KEY')) return (string)AMO_SELFTEST_KEY;
    }
    return '';
}
function tsk_require_key($given) {
    $key = tsk_secret_key();
    if ($key === '' || !hash_equals($key, (string)$given)) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'error' => 'bad_key'));
        exit;
    }
}

/* --------------------------------------------- выгрузка журнала (проверка) */
/* Требование юристов: «обеспечить возможность выгрузки сведений при проверке
   со всеми вышеуказанными данными». Отдаём весь журнал за месяц одним файлом
   — CSV для Excel или JSON. */

function tsk_months($dir) {
    $out = array();
    foreach (glob($dir . '/consent-*.jsonl') as $path) {
        if (preg_match('/consent-(\d{4}-\d{2})\.jsonl$/', $path, $m)) {
            $out[$m[1]] = count(file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES));
        }
    }
    krsort($out);
    return $out;
}
function tsk_read_month($dir, $month) {
    $path = $dir . '/consent-' . $month . '.jsonl';
    if (!preg_match('/^\d{4}-\d{2}$/', $month) || !file_exists($path)) return array();
    $rows = array();
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $r = json_decode($line, true);
        if (is_array($r)) $rows[] = $r;
    }
    return $rows;
}

/* Подписи полей — те же, что в карточке заявки в админке */
function tsk_labels() {
    return array(
        'name' => 'Имя', 'parent' => 'Имя родителя', 'child' => 'Имя ребёнка',
        'childage' => 'Возраст ребёнка', 'phone' => 'Телефон', 'contact' => 'Контакты',
        'lesson' => 'Занятие', 'text' => 'Сообщение', 'rating' => 'Оценка',
        '_consent_privacy' => 'Ознакомлен с политикой конфиденциальности',
        '_consent_privacy_at' => 'Время отметки о политике конфиденциальности',
        '_consent_pd_policy' => 'Ознакомлен с политикой обработки ПД',
        '_consent_pd_policy_at' => 'Время отметки о политике обработки ПД',
        '_consent_pd' => 'Согласие на обработку ПД',
        '_consent_pd_at' => 'Время согласия на обработку ПД',
        '_consent_cookie' => 'Согласие на куки и Яндекс.Метрику',
        '_consent_cookie_at' => 'Время согласия на куки',
        '_consent_docs' => 'Редакции документов на момент согласия',
    );
}

/* Excel считает формулой всё, что начинается с = + - @, поэтому такие
   значения экранируем — иначе выгрузку можно было бы использовать для атаки. */
function tsk_csv_safe($v) {
    $v = (string)$v;
    if ($v === '') return $v;
    $c = $v[0];
    if ($c === '=' || $c === '@') return "'" . $v;
    // «+» и «-» экранируем только если это не телефон и не число,
    // иначе +7 931 … превратилось бы в '+7 931 … и портило вид выгрузки
    if (($c === '+' || $c === '-') && !preg_match('/^[+\-][0-9 ()\-]+$/', $v)) return "'" . $v;
    return $v;
}

if (isset($_GET['months'])) {
    tsk_require_key($_GET['months']);
    $dir = tsk_log_dir();
    echo json_encode(array('ok' => (bool)$dir, 'months' => $dir ? tsk_months($dir) : array()),
        JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if (isset($_GET['export'])) {
    tsk_require_key($_GET['export']);
    $dir = tsk_log_dir();
    if (!$dir) {
        http_response_code(500);
        echo json_encode(array('ok' => false, 'error' => 'log_dir_unavailable'));
        exit;
    }
    $month  = isset($_GET['month']) ? (string)$_GET['month'] : gmdate('Y-m');
    $format = (isset($_GET['format']) && $_GET['format'] === 'json') ? 'json' : 'csv';
    $rows   = tsk_read_month($dir, $month);

    if ($format === 'json') {
        header('Content-Disposition: attachment; filename="soglasiya-' . $month . '.json"');
        echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }

    /* Колонки: сначала обязательные по требованию юристов, затем все
       остальные поля, которые встретились в записях за месяц. */
    $labels = tsk_labels();
    $extra = array();
    foreach ($rows as $r) {
        foreach (array_keys(isset($r['fields']) ? $r['fields'] : array()) as $k) {
            if (!isset($extra[$k])) $extra[$k] = true;
        }
    }
    $ordered = array();
    foreach (array_keys($labels) as $k) if (isset($extra[$k])) { $ordered[] = $k; unset($extra[$k]); }
    $rest = array_keys($extra); sort($rest);
    $ordered = array_merge($ordered, $rest);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="soglasiya-' . $month . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");                 // BOM — чтобы Excel понял кириллицу
    $head = array('Дата и время (сервер, UTC)', 'IP-адрес', 'Тип', 'Форма', 'Страница');
    foreach ($ordered as $k) $head[] = isset($labels[$k]) ? $labels[$k] : $k;
    $head[] = 'Браузер';
    fputcsv($out, $head, ';');

    foreach ($rows as $r) {
        $f = isset($r['fields']) ? $r['fields'] : array();
        $line = array(
            tsk_csv_safe(isset($r['at']) ? $r['at'] : ''),
            tsk_csv_safe(isset($r['ip']) ? $r['ip'] : ''),
            tsk_csv_safe(isset($r['type']) ? $r['type'] : ''),
            tsk_csv_safe(isset($r['context']) ? $r['context'] : ''),
            tsk_csv_safe(isset($r['page']) ? $r['page'] : ''),
        );
        foreach ($ordered as $k) $line[] = tsk_csv_safe(isset($f[$k]) ? $f[$k] : '');
        $line[] = tsk_csv_safe(isset($r['user_agent']) ? $r['user_agent'] : '');
        fputcsv($out, $line, ';');
    }
    fclose($out);
    exit;
}

if (isset($_GET['recent'])) {
    tsk_require_key($_GET['recent']);
    $dir = tsk_log_dir();
    $n = isset($_GET['n']) ? max(1, min(50, (int)$_GET['n'])) : 20;
    $rows = $dir ? tsk_read_month($dir, gmdate('Y-m')) : array();
    echo json_encode(array('ok' => (bool)$dir, 'total' => count($rows),
        'rows' => array_slice(array_reverse($rows), 0, $n)),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* ------------------------------------------------- диагностика (self-test) */
if (isset($_GET['selftest'])) {
    tsk_require_key($_GET['selftest']);

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
