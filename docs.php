<?php
/* ==========================================================================
 *  Хранилище документов сайта на сервере
 *  --------------------------------------------------------------------------
 *  Политики и согласия — доказательство в случае проверки, поэтому они лежат
 *  на нашем сервере, рядом с журналом согласий, а не у стороннего сервиса.
 *
 *  Файлы хранятся ВЫШЕ корня сайта и отдаются только через этот скрипт.
 *  Поэтому даже если в хранилище каким-то образом попадёт исполняемый файл,
 *  запустить его через веб не получится: сервер его просто не видит.
 *
 *  Что умеет:
 *    GET  docs.php?f=ИМЯ                — отдать документ посетителю
 *    POST docs.php?upload=ПАРОЛЬ        — загрузить файл (multipart, поле file)
 *    GET  docs.php?list=ПАРОЛЬ          — что лежит в хранилище
 *    GET  docs.php?selftest=ПАРОЛЬ      — проверка настроек и лимитов
 *
 *  Загрузка и просмотр списка закрыты паролем (см. tsk-auth.php); отдача
 *  документа — открыта, иначе посетитель не смог бы их прочитать.
 * ========================================================================== */

require_once __DIR__ . '/tsk-auth.php';

const TSK_DOCS_DIR_NAME = 'tsk-docs';
const TSK_DOCS_MAX      = 25 * 1024 * 1024;   // 25 МБ на файл

/* Разрешённые типы. Всё остальное отклоняем — список именно белый, а не
   чёрный: перечислять опасные расширения бессмысленно, их слишком много. */
function tsk_doc_types() {
    return array(
        'pdf'  => 'application/pdf',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'odt'  => 'application/vnd.oasis.opendocument.text',
        'rtf'  => 'application/rtf',
        'txt'  => 'text/plain; charset=utf-8',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
    );
}

/* Хранилище: пробуем уровень выше корня сайта, иначе — внутрь, но закрываем
   от веба через .htaccess (та же логика, что у журнала согласий). */
function tsk_docs_dir(&$how = null) {
    $above = dirname(__DIR__) . '/' . TSK_DOCS_DIR_NAME;
    if (is_dir($above) || @mkdir($above, 0755, true)) {
        if (is_writable($above)) { $how = 'над корнем сайта'; return $above; }
    }
    $inside = __DIR__ . '/' . TSK_DOCS_DIR_NAME;
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

function tsk_json($data, $code = 200) {
    tsk_cors();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/* ----------------------------------------------------- отдача документа */
/* Открыта всем: ссылки на политики и согласия должны работать у посетителей. */
if (isset($_GET['f'])) {
    $name = (string)$_GET['f'];
    // строгая проверка имени: никаких путей, слэшей и «..»
    if (!preg_match('/^[A-Za-z0-9._-]{1,120}$/', $name) || strpos($name, '..') !== false) {
        tsk_json(array('ok' => false, 'error' => 'bad_name'), 400);
    }
    $dir = tsk_docs_dir();
    if (!$dir) tsk_json(array('ok' => false, 'error' => 'no_storage'), 500);

    $path = $dir . '/' . $name;
    // на всякий случай проверяем, что файл действительно внутри хранилища
    $real = realpath($path);
    $rdir = realpath($dir);
    if ($real === false || $rdir === false || strpos($real, $rdir . DIRECTORY_SEPARATOR) !== 0) {
        tsk_json(array('ok' => false, 'error' => 'not_found'), 404);
    }
    $ext = strtolower(pathinfo($real, PATHINFO_EXTENSION));
    $types = tsk_doc_types();
    if (!isset($types[$ext])) tsk_json(array('ok' => false, 'error' => 'not_found'), 404);

    // Content-Type берём из своего списка, а не от пользователя, и запрещаем
    // браузеру угадывать тип — иначе файл можно было бы подсунуть как скрипт.
    header('Content-Type: ' . $types[$ext]);
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline; filename="' . $name . '"');
    header('Content-Length: ' . filesize($real));
    header('Cache-Control: public, max-age=300');
    readfile($real);
    exit;
}

/* ------------------------------------------------------------- загрузка */
if (isset($_GET['upload'])) {
    tsk_require_key($_GET['upload']);

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') tsk_json(array('ok' => false, 'error' => 'post_only'), 405);
    if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
        // при превышении post_max_size PHP присылает пустой $_FILES
        tsk_json(array('ok' => false, 'error' => 'no_file',
            'hint' => 'Возможно, файл больше, чем разрешает сервер (post_max_size).'), 400);
    }
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) tsk_json(array('ok' => false, 'error' => 'upload_error', 'code' => $f['error']), 400);
    if ($f['size'] <= 0 || $f['size'] > TSK_DOCS_MAX) tsk_json(array('ok' => false, 'error' => 'too_large'), 413);

    $ext = strtolower(pathinfo((string)$f['name'], PATHINFO_EXTENSION));
    $types = tsk_doc_types();
    if (!isset($types[$ext])) tsk_json(array('ok' => false, 'error' => 'bad_type', 'ext' => $ext), 415);

    // сверяем и фактическое содержимое файла, а не только расширение
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        $real_mime = $fi ? finfo_file($fi, $f['tmp_name']) : '';
        if ($fi) finfo_close($fi);
        $expect = explode(';', $types[$ext])[0];
        $ok_mime = array($expect);
        // office-форматы и txt определяются по-разному в разных системах
        if ($ext === 'docx') $ok_mime[] = 'application/zip';
        if ($ext === 'doc')  $ok_mime[] = 'application/vnd.ms-office';
        if ($ext === 'odt')  $ok_mime[] = 'application/zip';
        if ($ext === 'txt')  { $ok_mime[] = 'text/plain'; }
        if ($ext === 'rtf')  { $ok_mime[] = 'text/rtf'; $ok_mime[] = 'application/rtf'; }
        if ($real_mime && !in_array($real_mime, $ok_mime, true)) {
            tsk_json(array('ok' => false, 'error' => 'mime_mismatch',
                'ext' => $ext, 'detected' => $real_mime), 415);
        }
    }

    $dir = tsk_docs_dir($how);
    if (!$dir) tsk_json(array('ok' => false, 'error' => 'no_storage'), 500);

    // имя формируем сами: ключ документа + дата + случайный хвост
    $key = isset($_POST['key']) ? strtolower((string)$_POST['key']) : 'doc';
    $key = preg_replace('/[^a-z0-9]+/', '-', $key);
    $key = trim($key, '-');
    if ($key === '') $key = 'doc';
    $stored = $key . '-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.' . $ext;

    if (!@move_uploaded_file($f['tmp_name'], $dir . '/' . $stored)) {
        tsk_json(array('ok' => false, 'error' => 'write_failed'), 500);
    }
    @chmod($dir . '/' . $stored, 0644);

    /* Контрольную сумму считает сервер — ей можно доверять больше, чем
       присланной браузером: она снимается с того файла, что реально лёг. */
    tsk_json(array(
        'ok'       => true,
        'file'     => $stored,
        'url'      => 'docs.php?f=' . rawurlencode($stored),
        'sha256'   => hash_file('sha256', $dir . '/' . $stored),
        'size'     => filesize($dir . '/' . $stored),
        'orig'     => (string)$f['name'],
        'storage'  => $how,
    ));
}

/* --------------------------------------------------------------- список */
if (isset($_GET['list'])) {
    tsk_require_key($_GET['list']);
    $dir = tsk_docs_dir($how);
    $out = array();
    if ($dir) {
        foreach (glob($dir . '/*') as $p) {
            if (!is_file($p) || basename($p) === '.htaccess') continue;
            $out[] = array(
                'file' => basename($p),
                'size' => filesize($p),
                'at'   => gmdate('c', filemtime($p)),
                'sha256' => hash_file('sha256', $p),
            );
        }
    }
    tsk_json(array('ok' => (bool)$dir, 'storage' => $how, 'files' => $out));
}

/* ---------------------------------------------------------- диагностика */
if (isset($_GET['selftest'])) {
    tsk_require_key($_GET['selftest']);
    $dir = tsk_docs_dir($how);
    tsk_json(array(
        'ok'                  => (bool)$dir,
        'php'                 => PHP_VERSION,
        'site_root'           => __DIR__,
        'docs_dir'            => $dir,
        'docs_placement'      => $how,
        'docs_writable'       => $dir ? is_writable($dir) : false,
        'docs_inside_site'    => $dir ? (strpos($dir, __DIR__) === 0) : null,
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size'       => ini_get('post_max_size'),
        'own_limit'           => TSK_DOCS_MAX,
        'allowed'             => array_keys(tsk_doc_types()),
        'finfo'               => function_exists('finfo_open'),
    ));
}

tsk_json(array('ok' => false, 'error' => 'nothing_to_do'), 400);
