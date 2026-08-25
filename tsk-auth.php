<?php
/* ==========================================================================
 *  Общая проверка пароля для служебных скриптов сайта
 *  --------------------------------------------------------------------------
 *  Используется журналом согласий (consent-log.php) и хранилищем документов
 *  (docs.php). Сам пароль здесь НЕ хранится — только его хеш: эти файлы лежат
 *  в публичном репозитории, и по хешу пароль восстановить нельзя.
 *
 *  Сменить пароль:
 *    1) попросить разработчика — он пересчитает хеш и обновит строку ниже; либо
 *    2) задать секрет прямо на сервере, в amo-config.php:
 *         define('AMO_SELFTEST_KEY', 'длинная-случайная-строка');
 *       Этот вариант надёжнее: файл не попадает в репозиторий и не
 *       перезаписывается при обновлении сайта. Если ключ задан, он работает
 *       наравне с паролем ниже.
 * ========================================================================== */

const TSK_PASSWORD_HASH = '$2y$12$UnDikUvFpAI/Go6yI1XZwuxHImMtHR2A7YNRJsPjPWpfgwkWKolFW';

/* Секрет с сервера (если задан) — работает наравне с паролем */
function tsk_secret_key() {
    $cfg = __DIR__ . '/amo-config.php';
    if (file_exists($cfg)) {
        require_once $cfg;
        if (defined('AMO_SELFTEST_KEY')) return (string)AMO_SELFTEST_KEY;
    }
    return '';
}

function tsk_key_ok($given) {
    $given = (string)$given;
    if ($given === '') return false;
    if (TSK_PASSWORD_HASH !== '' && password_verify($given, TSK_PASSWORD_HASH)) return true;
    $key = tsk_secret_key();
    return $key !== '' && hash_equals($key, $given);
}

/* Не подошёл пароль — отвечаем 403 и прекращаем работу */
function tsk_require_key($given) {
    if (!tsk_key_ok($given)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array('ok' => false, 'error' => 'bad_key'));
        exit;
    }
}
