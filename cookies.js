/* ===== Территория Спорта КИДС — согласие на куки и Яндекс.Метрику =====
 *
 * Требование юристов и Роскомнадзора (ч. 1 ст. 6 и ч. 1 ст. 9 152-ФЗ):
 * обработка персональных данных через Яндекс.Метрику допускается только
 * ПОСЛЕ получения согласия посетителя.
 *
 * Поэтому здесь Метрика не запускается сама по себе: скрипт tag.js
 * подключается только после нажатия «Я согласен/согласна». До этого
 * момента к mc.yandex.ru не уходит ни одного запроса — ни счётчика,
 * ни пикселя, ни Вебвизора.
 *
 * Ответ посетителя хранится в localStorage: при следующих визитах
 * окно больше не показывается, а Метрика подключается сразу.
 */
(function () {
  'use strict';

  var YM_ID = 110643212;
  var LS_KEY = 'tsk_cookie_consent';

  /* Очередь вызовов ym() существует всегда, чтобы analytics.js и другие
     скрипты могли вызывать ym(...) без ошибок ещё до согласия. Это только
     массив в памяти — никакой отправки данных он не выполняет. */
  window.ym = window.ym || function () {
    (window.ym.a = window.ym.a || []).push(arguments);
  };

  function readConsent() {
    try { return JSON.parse(window.localStorage.getItem(LS_KEY)); } catch (e) { return null; }
  }
  function writeConsent(rec) {
    try { window.localStorage.setItem(LS_KEY, JSON.stringify(rec)); } catch (e) {}
  }
  function isGranted() {
    var r = readConsent();
    return !!(r && r.granted);
  }

  /* ---------- Подключение Метрики (только после согласия) ---------- */
  var started = false;
  function startMetrika() {
    if (started) return;
    started = true;

    /* Всё, что успело накопиться в очереди до согласия, отбрасываем:
       эти события не должны уйти в Метрику задним числом. */
    window.ym.a = [];
    window.ym.l = 1 * new Date();
    window.ym(YM_ID, 'init', {
      ssr: true, webvisor: true, clickmap: true, ecommerce: 'dataLayer',
      referrer: document.referrer, url: location.href,
      accurateTrackBounce: true, trackLinks: true
    });

    var s = document.createElement('script');
    s.async = 1;
    s.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + YM_ID;
    s.onload = function () {
      // analytics.js по этому событию заново запрашивает ClientID
      // и обновляет скрытые поля в формах заявок
      try { document.dispatchEvent(new CustomEvent('tsk:metrika-ready')); } catch (e) {}
    };
    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) first.parentNode.insertBefore(s, first);
    else document.head.appendChild(s);
  }

  // Согласие уже дано в прошлый раз — подключаем Метрику сразу
  if (isGranted()) startMetrika();

  /* ---------- Окно согласия ---------- */
  /* Высота окна передаётся в CSS, чтобы плавающие кнопки («Наверх» и
     мессенджер) поднимались над ним и ничего не перекрывали. */
  function setBarHeight(bar) {
    var h = bar && !bar.hidden ? Math.ceil(bar.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--cookie-h', h + 'px');
  }

  function initBar() {
    var bar = document.getElementById('cookieBar');
    if (!bar) return;
    if (isGranted()) return;               // согласие уже есть — окно не нужно

    var btn = document.getElementById('cookieAccept');
    bar.hidden = false;
    document.documentElement.classList.add('cookie-on');
    setBarHeight(bar);

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { setBarHeight(bar); }, 150);
    });

    if (btn) btn.addEventListener('click', function () {
      /* Фиксируем факт согласия: время и редакции документов, которые
         посетителю показывались в этот момент (ссылки на конкретные файлы).
         IP-адрес добавляется на стороне сервера — см. рекомендации юристов. */
      var docs = {};
      bar.querySelectorAll('a[data-doc]').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        docs[a.getAttribute('data-doc')] = (href && href !== '#') ? href : 'не загружен';
      });
      writeConsent({
        granted: true,
        at: new Date().toISOString(),
        page: location.pathname,
        docs: docs
      });

      logConsent({
        _type: 'cookie',
        _context: 'Согласие на куки и Яндекс.Метрику',
        _page: location.pathname,
        _consent_cookie: 'да',
        _consent_cookie_at: new Date().toISOString(),
        _consent_docs: Object.keys(docs).map(function (k) { return k + '=' + docs[k]; }).join(' | ')
      });

      bar.hidden = true;
      document.documentElement.classList.remove('cookie-on');
      setBarHeight(bar);
      startMetrika();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBar);
  } else {
    initBar();
  }

  /* ---------- Журнал согласий на сервере ----------
     IP-адрес виден только серверу, поэтому запись отправляется на
     consent-log.php, а IP там проставляется сам. На хостинге без PHP
     запрос вернёт 404 — ошибка гасится, сайт работает как обычно. */
  function logConsent(payload) {
    try {
      if (!window.fetch) return Promise.resolve(false);
      return fetch('consent-log.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
        keepalive: true,
        credentials: 'omit'
      }).then(function (r) { return r.ok; }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  /* Публичный API */
  window.TSKCookies = {
    granted: isGranted,
    record: readConsent,
    start: startMetrika,
    logConsent: logConsent
  };
})();
