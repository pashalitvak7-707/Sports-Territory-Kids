/* ===== Territория Спорта КИДС — сквозная аналитика (Яндекс Метрика) =====
 *
 * Что делает этот модуль:
 *  1. При первом визите сохраняет атрибуцию (localStorage): первую посадочную
 *     страницу, реферер и дату первого визита; UTM-метки и yclid обновляются
 *     при каждом новом рекламном переходе (last non-direct click).
 *  2. Получает ClientID Метрики и вместе с атрибуцией подставляет всё
 *     скрытыми полями в каждую форму заявки — эти поля уходят в базу заявок
 *     (payload сообщения в админке) и НЕ попадают в текст для мессенджера.
 *  3. Отправляет JS-цели в Метрику (их идентификаторы нужно завести в
 *     настройках счётчика, тип «JavaScript-событие»):
 *       form_submit     — заявка отправлена и подтверждена записью в базу
 *       review_submit   — отправлен отзыв
 *       phone_click     — клик по телефону
 *       messenger_click — клик по мессенджеру (параметр messenger)
 *       vk_click        — переход в группу ВКонтакте
 *       book_click      — клик «Записаться» в расписании
 *       repeat_visit    — значимый повторный визит идентифицированного клиента
 *  4. Advanced Matching: после заявки передаёт телефон через firstPartyParams
 *     (Метрика хэширует данные на своей стороне).
 *
 * Не реализуемо на статичном сайте без сервера/CRM (нужен amoCRM + бэкенд):
 * этапы сделки, сумма оплаты, webhook, подтверждение создания сделки в CRM.
 * Ближайший аналог здесь: цель формы срабатывает после успешной записи
 * заявки в базу данных сайта.
 */
(function () {
  'use strict';

  var YM_ID = 110643212;
  var LS_ATTR = 'tsk_attr';
  var LS_VISITS = 'tsk_visits';
  var LS_IDENT = 'tsk_identified';
  var SESSION_GAP_MS = 30 * 60 * 1000; // новый «визит» после 30 минут тишины

  function lsGet(key) {
    try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- 1. Атрибуция ---------- */
  function queryParams() {
    var out = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      var k = decodeURIComponent(i === -1 ? pair : pair.slice(0, i));
      var v = i === -1 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      out[k] = v;
    });
    return out;
  }

  var qp = queryParams();
  var attr = lsGet(LS_ATTR) || {};
  if (!attr.first_visit) {
    attr.first_visit = new Date().toISOString();
    attr.landing = location.href.split('#')[0];
    attr.referrer = document.referrer || '';
  }
  // новые рекламные метки перезаписывают старые (последний рекламный переход)
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var hasFreshUtm = UTM_KEYS.some(function (k) { return qp[k]; }) || qp.yclid;
  if (hasFreshUtm) {
    UTM_KEYS.forEach(function (k) { attr[k] = qp[k] || ''; });
    if (qp.yclid) attr.yclid = qp.yclid;
    attr.last_ad_visit = new Date().toISOString();
  }
  lsSet(LS_ATTR, attr);

  /* ---------- ClientID Метрики ---------- */
  var clientId = '';
  try {
    // вызов встаёт в очередь заглушки ym и выполнится, когда tag.js загрузится
    window.ym(YM_ID, 'getClientID', function (id) {
      clientId = id || '';
      fillHiddenFields();
    });
  } catch (e) {}

  /* ---------- 2. Скрытые поля в формах ----------
     Имена начинаются с «_»: script.js не включает такие поля в текст
     сообщения для мессенджера, но cms.saveMessage кладёт их в payload. */
  function hiddenValues() {
    return {
      _ym_cid: clientId,
      _yclid: attr.yclid || '',
      _utm_source: attr.utm_source || '',
      _utm_medium: attr.utm_medium || '',
      _utm_campaign: attr.utm_campaign || '',
      _utm_term: attr.utm_term || '',
      _utm_content: attr.utm_content || '',
      _referrer: attr.referrer || '',
      _landing: attr.landing || '',
      _first_visit: attr.first_visit || ''
    };
  }
  function fillHiddenFields() {
    var vals = hiddenValues();
    document.querySelectorAll('form[data-whatsapp-form]').forEach(function (form) {
      Object.keys(vals).forEach(function (name) {
        var inp = form.querySelector('input[name="' + name + '"]');
        if (!inp) {
          inp = document.createElement('input');
          inp.type = 'hidden';
          inp.name = name;
          inp.className = 'ym-disable-keys';
          form.appendChild(inp);
        }
        inp.value = vals[name];
      });
    });
  }

  /* ---------- 3. Цели ---------- */
  function goal(name, params) {
    try { window.ym(YM_ID, 'reachGoal', name, params || {}); } catch (e) {}
  }

  /* ---------- 4. Advanced Matching + отметка «клиент идентифицирован» ---------- */
  function identify(phone) {
    var digits = (phone || '').replace(/\D/g, '');
    if (digits) {
      try { window.ym(YM_ID, 'firstPartyParams', { phone_number: digits }); } catch (e) {}
    }
    lsSet(LS_IDENT, { at: new Date().toISOString() });
  }

  /* ---------- Отправка заявки в amoCRM через серверный amo.php (Beget) ----------
     amo.php лежит на том же домене. На хостинге без PHP (например, GitHub Pages)
     запрос вернёт 404 — ошибка гасится, сайт продолжает работать как обычно. */
  function sendLead(context, form) {
    try {
      if (!form || !window.fetch) return;
      var payload = { _context: context || '', _page: location.pathname };
      new FormData(form).forEach(function (v, k) { payload[k] = (v == null ? '' : v.toString()); });
      var a = hiddenValues();
      Object.keys(a).forEach(function (k) { if (!payload[k]) payload[k] = a[k]; });
      fetch('amo.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'omit'
      }).catch(function () {});
    } catch (e) {}
  }

  /* публичный API для script.js */
  window.TSKAnalytics = {
    goal: goal,
    identify: identify,
    sendLead: sendLead,
    refreshHiddenFields: fillHiddenFields,
    attribution: function () { return attr; }
  };

  /* ---------- Клики: телефон, мессенджеры, VK, «Записаться» ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var el;
    if ((el = t.closest('a[href^="tel:"]'))) {
      goal('phone_click', { number: el.getAttribute('href').slice(4) });
    } else if ((el = t.closest('.msg-opt'))) {
      var label = (el.textContent || '').trim();
      goal(/vk\.com/.test(el.href) ? 'vk_click' : 'messenger_click', { messenger: label });
    } else if ((el = t.closest('a[href*="vk.com"]'))) {
      goal('vk_click', { place: el.closest('.footer-socials') ? 'footer' : 'header' });
    } else if ((el = t.closest('.sch-book'))) {
      goal('book_click', { lesson: (el.dataset.dir || '') + ' ' + (el.dataset.day || '') + ' ' + (el.dataset.time || '') });
    }
  }, true);

  /* ---------- Значимые повторные визиты идентифицированного клиента ---------- */
  var visits = lsGet(LS_VISITS) || { count: 0, last: 0 };
  var now = Date.now();
  if (now - visits.last > SESSION_GAP_MS) {
    visits.count += 1;
    if (visits.count > 1 && lsGet(LS_IDENT)) {
      goal('repeat_visit', { visit_number: visits.count });
    }
  }
  visits.last = now;
  lsSet(LS_VISITS, visits);

  document.addEventListener('DOMContentLoaded', fillHiddenFields);
})();
