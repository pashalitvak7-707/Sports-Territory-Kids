/* ===== Территория Спорта КИДС — логика админ-панели ===== */
(function () {
  'use strict';

  // Запасная копия ключей: страница работает, даже если cms-config.js
  // не загрузился или пришёл из устаревшего кеша
  var FALLBACK_CONFIG = {
    url: 'https://zuntxqtceskpcdwwwrnh.supabase.co',
    anonKey: 'sb_publishable_z1f4A_NisVriQ3hDSlNIUg_w4szVbuN'
  };
  var cfg = window.CMS_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) cfg = FALLBACK_CONFIG;
  var $ = function (id) { return document.getElementById(id); };

  if (!cfg.url || !cfg.anonKey) {
    $('viewNoConfig').hidden = false;
    return;
  }
  /* Библиотека Supabase подключается отдельным файлом. Если он не загрузился
     (нет интернета, заблокирован CDN, устаревший кеш), страница раньше просто
     оставалась пустой — теперь честно об этом сообщаем. */
  if (!window.supabase || !window.supabase.createClient) {
    var nc = $('viewNoConfig');
    nc.hidden = false;
    nc.querySelector('h1').textContent = 'Не загрузилась библиотека для входа';
    nc.querySelector('p').innerHTML = 'Страница не смогла подключить библиотеку Supabase. ' +
      'Обновите страницу (Ctrl+F5). Если не поможет — проверьте интернет и не блокирует ли ' +
      'запросы расширение браузера или антивирус.';
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  /* ---------- Справочники ---------- */
  var DIRS = { gym: 'Гимнастика', acro: 'Акробатика', rhythmic: 'Художественная гимнастика', tramp: 'Батут', ofp: 'ОФП' };
  var AGES = { '1.5-3': '1,5–3 года', '3-4': '3–4 года', '4-5': '4–5 лет', '5-7': '5–7 лет', '7-9': '7–9 лет', '9+': '9+ лет' };
  var DAYS = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
  var DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var FIELD_LABELS = { name: 'Имя', phone: 'Телефон', contact: 'Контакты', text: 'Сообщение',
    parent: 'Имя родителя', child: 'Имя ребёнка', childage: 'Возраст ребёнка', lesson: 'Занятие',
    // журнал согласий (видно в карточке заявки и попадает в выгрузку)
    _consent_privacy: 'Ознакомлен с политикой конфиденциальности',
    _consent_privacy_at: 'Отметка о политике поставлена',
    _consent_pd_policy: 'Ознакомлен с политикой обработки персональных данных',
    _consent_pd_policy_at: 'Отметка о политике обработки ПД поставлена',
    _consent_pd: 'Согласие на обработку персональных данных',
    _consent_pd_at: 'Отметка о согласии поставлена',
    _consent_cookie: 'Согласие на куки и Яндекс.Метрику',
    _consent_cookie_at: 'Отметка о согласии на куки поставлена',
    _consent_docs: 'Редакция документов на момент согласия' };

  /* ---------- Сканер страниц сайта: находит все редактируемые тексты и картинки ---------- */
  var PAGES = [
    { url: 'index.html', label: 'Главная' },
    { url: 'schedule.html', label: 'Расписание' },
    { url: 'documents.html', label: 'Документы' }
  ];
  var SECTION_LABELS = {
    header: 'Шапка сайта', hero: 'Первый экран', features: 'Преимущества', programs: 'Программы',
    develop: 'Что будем развивать', how: 'Первое занятие', signup: 'Блок «Запишитесь»',
    method: 'Наша методика', space: 'Пространство для движения', coaches: 'Тренеры',
    gallery: 'Галерея', equip: 'Что есть у нас в зале', schedule: 'Блок «Расписание»',
    reviews: 'Отзывы', faq: 'FAQ', footer: 'Подвал',
    'sched-hero': 'Заголовок страницы', 'sched-page': 'Таблица и запись',
    'docs-page': 'Раздел «Документы»'
  };
  var EXTRA_TEXTS = [
    { key: 'ui.book_btn', label: 'Кнопка «Записаться» в таблице расписания', def: 'Записаться' },
    { key: 'ui.review_thanks', label: 'Сообщение после отправки отзыва', def: 'Спасибо! Отзыв появится на сайте после проверки.' }
  ];
  var textsSubtab = 'desktop';
  var pageDocs = null;
  function fetchPages() {
    if (pageDocs) return Promise.resolve(pageDocs);
    return Promise.all(PAGES.map(function (p) {
      return fetch(p.url + '?cms=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error(p.url + ': ' + r.status);
        return r.text();
      }).then(function (t) {
        return { label: p.label, doc: new DOMParser().parseFromString(t, 'text/html') };
      });
    })).then(function (docs) { pageDocs = docs; return docs; });
  }
  function groupOf(el, pageLabel) {
    var custom = el.closest('[data-cms-group]');
    if (custom) return pageLabel + ' — ' + custom.getAttribute('data-cms-group');
    var sec = el.closest('section, header, footer');
    var cls = sec && sec.classList[0];
    return pageLabel + ' — ' + (SECTION_LABELS[cls] || 'Прочее');
  }
  function defaultTextOf(el) {
    var clone = el.cloneNode(true);
    clone.querySelectorAll('br').forEach(function (b) { b.replaceWith('\n'); });
    return clone.textContent.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
  }

  var COLOR_FIELDS = [
    { key: 'theme.green', label: 'Основной зелёный', def: '#16BF41' },
    { key: 'theme.green_d', label: 'Тёмно-зелёный', def: '#0C5C46' },
    { key: 'theme.orange', label: 'Оранжевый (кнопки)', def: '#FF6A2B' },
    { key: 'theme.coral', label: 'Коралловый', def: '#FF6F61' },
    { key: 'theme.blue', label: 'Голубой', def: '#3FA9F5' },
    { key: 'theme.yellow', label: 'Жёлтый', def: '#FFC23C' },
    { key: 'theme.ink', label: 'Цвет текста', def: '#2C2F33' },
    { key: 'theme.muted', label: 'Приглушённый текст', def: '#7C8088' },
    { key: 'theme.bg_soft', label: 'Мягкий фон', def: '#FAF7F5' }
  ];

  var FONT_OPTIONS = [
    { value: '', label: 'Фирменный (Akzidenz-Grotesk Pro)' },
    { value: 'system-ui, sans-serif', label: 'Системный (современный)' },
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
    { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (с засечками)' },
    { value: '"Comic Sans MS", "Comic Sans", cursive', label: 'Comic Sans (игровой)' }
  ];

  // Часто используемые цвета сайта — быстрые образцы под палитрой
  var TEXT_COLORS = [
    { c: '#0C5C46', label: 'Тёмно-зелёный' },
    { c: '#16BF41', label: 'Зелёный' },
    { c: '#FF6A2B', label: 'Оранжевый' },
    { c: '#FF6F61', label: 'Коралловый' },
    { c: '#3FA9F5', label: 'Голубой' },
    { c: '#FFC23C', label: 'Жёлтый' },
    { c: '#2C2F33', label: 'Тёмный текст' },
    { c: '#7C8088', label: 'Серый' },
    { c: '#FFFFFF', label: 'Белый' }
  ];

  // пароль к служебным скриптам на сервере (журнал согласий, документы)
  var CL_KEY = 'tsk_consent_key';
  function clKey() {
    try { return window.sessionStorage.getItem(CL_KEY) || ''; } catch (e) { return ''; }
  }
  function clSaveKey(v) {
    try { window.sessionStorage.setItem(CL_KEY, v); } catch (e) {}
  }

  /* Журнал согласий и хранилище документов — это скрипты на сервере сайта
     (PHP на Beget). Если админку открыли не с боевого адреса — например, с
     копии на GitHub Pages или с файла на диске, — относительная ссылка ведёт
     в пустоту: PHP там не выполняется. В этом случае обращаемся к боевому
     сайту напрямую, чтобы журнал открывался из любой копии админки. */
  var TSK_SITE = 'https://ts-kids.ru/';
  function phpBase() {
    var h = (location.hostname || '').toLowerCase();
    var own = /(^|\.)ts-kids\.ru$/.test(h) || h === 'localhost' || h === '127.0.0.1';
    return own ? location.pathname.replace(/[^/]*$/, '') : TSK_SITE;
  }
  function phpUrl(script) { return phpBase() + script; }
  function phpRemote() { return phpBase() === TSK_SITE; }

  /* Запрос к служебному скрипту с понятным объяснением, если ответ пришёл
     не тот. Чаще всего причина одна из двух: сайт на сервере ещё не обновлён
     или страницу открыли там, где PHP не работает. */
  function phpJson(url, opts) {
    return fetch(url, opts || {}).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = JSON.parse(t); } catch (e) {}
        if (data) return data;
        var why;
        if (r.status === 404) {
          why = 'скрипт не найден по адресу ' + url +
            '. Похоже, сайт на сервере ещё не обновлён — сделайте на Beget git pull.';
        } else if (/^\s*<(?:!|[a-zA-Z?])/.test(t)) {
          why = 'по адресу ' + url + ' сервер вернул страницу, а не данные: PHP там не выполняется.';
        } else {
          why = 'непонятный ответ сервера (код ' + r.status + ').';
        }
        throw new Error(why);
      });
    }, function (e) {
      var what = e && e.message ? e.message : 'запрос не прошёл';
      throw new Error(phpRemote()
        ? 'админка открыта не с боевого адреса, поэтому запрос ушёл на ' + TSK_SITE +
          ' — и не прошёл (' + what + '). Возможные причины: сайт на сервере ещё не обновлён ' +
          '(нужен git pull на Beget) или браузер не пустил запрос на другой сайт. ' +
          'Надёжнее всего открыть админку по адресу ' + TSK_SITE + 'admin.html.'
        : 'нет ответа от сервера (' + what + ').');
    });
  }

  var settings = {};   // key -> value (текущие из базы)
  var coachesCache = [];

  /* ---------- Утилиты ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  function fail(e) {
    console.error(e);
    alert('Ошибка: ' + (e && (e.message || e.error_description) || 'не удалось выполнить действие') +
      '\n\nЕсли ошибка повторяется — проверьте, что вы вошли с email администратора.');
  }
  function flash(id) {
    var el = $(id);
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 2500);
  }

  /* Сохранение настроек: непустые — upsert, пустые — удаляем (возврат к стандартному) */
  function saveSettings(map) {
    var up = [], del = [];
    Object.keys(map).forEach(function (k) {
      var v = (map[k] == null ? '' : String(map[k])).trim();
      if (v) up.push({ key: k, value: v }); else del.push(k);
    });
    var ops = [];
    if (up.length) ops.push(sb.from('settings').upsert(up, { onConflict: 'key' }));
    if (del.length) ops.push(sb.from('settings').delete().in('key', del));
    return Promise.all(ops).then(function (results) {
      results.forEach(function (r) { if (r.error) throw r.error; });
      up.forEach(function (r) { settings[r.key] = r.value; });
      del.forEach(function (k) { delete settings[k]; });
    });
  }

  /* Документы (политики и согласия) хранятся на сервере сайта, а не в
     Supabase: это доказательство на случай проверки, и оно должно быть под
     нашим контролем, рядом с журналом согласий. Загрузка закрыта паролем —
     тем же, что и журнал. Контрольную сумму считает сервер. */
  function uploadDocFile(file, docKey) {
    var pass = clKey();
    if (!pass) return Promise.reject(new Error('Не задан пароль для загрузки документов на сервер.'));
    var fd = new FormData();
    fd.append('file', file);
    fd.append('key', docKey || 'doc');
    return phpJson(phpUrl('docs.php') + '?upload=' + encodeURIComponent(pass), { method: 'POST', body: fd })
      .then(function (j) {
        if (!j || !j.ok) {
          var msg = j && j.error === 'bad_key' ? 'пароль не подошёл'
            : j && j.error === 'bad_type' ? 'такой тип файла не разрешён'
            : j && j.error === 'mime_mismatch' ? 'содержимое файла не совпадает с расширением'
            : j && j.error === 'too_large' ? 'файл слишком большой'
            : (j && j.error) || 'неизвестная ошибка';
          throw new Error('Не удалось загрузить документ на сервер: ' + msg);
        }
        // абсолютная ссылка — она попадёт в журнал согласий как доказательство
        return { url: new URL(phpUrl(j.url), location.href).href, sha256: j.sha256 };
      });
  }

  /* Контрольная сумма файла (SHA-256). По ней всегда можно доказать, что
     предъявленный документ — ровно тот, с которым согласился посетитель,
     даже если ссылка со временем поменяется. */
  function sha256Hex(file) {
    if (!window.crypto || !window.crypto.subtle || !file.arrayBuffer) return Promise.resolve('');
    return file.arrayBuffer()
      .then(function (buf) { return window.crypto.subtle.digest('SHA-256', buf); })
      .then(function (d) {
        return Array.prototype.map.call(new Uint8Array(d), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      })
      .catch(function () { return ''; });
  }

  function uploadImage(file, folder) {
    var safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    var path = folder + '/' + Date.now() + '-' + safe;
    return sb.storage.from('images').upload(path, file, { upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      return sb.storage.from('images').getPublicUrl(path).data.publicUrl;
    });
  }

  /* Дополнительные фото галереи: JSON-массив ссылок в настройке gallery.extra */
  function galExtra() {
    try { var arr = JSON.parse(settings['gallery.extra'] || '[]'); return Array.isArray(arr) ? arr : []; }
    catch (e) { return []; }
  }
  function saveGalExtra(arr) {
    return saveSettings({ 'gallery.extra': arr.length ? JSON.stringify(arr) : '' });
  }

  /* ---------- Документы ----------
     Список карточек редактируется прямо в админке: можно добавить новый
     документ, переименовать, заменить файл, поменять порядок и удалить.
     Значения по умолчанию — в textsizes.js (window.TSK_DOCS_DEFAULT).
     Сам список хранится в настройке docs.items (JSON), ссылка на файл —
     в отдельной настройке с ключом карточки. */
  var DOC_ACCEPT = '.pdf,.doc,.docx,.rtf,.txt,image/*';

  function docsDefault() {
    return (window.TSK_DOCS_DEFAULT || []).map(function (d) {
      return { key: d.key, name: d.name };
    });
  }
  function docsItems() {
    try {
      var arr = JSON.parse(settings['docs.items'] || 'null');
      if (Array.isArray(arr) && arr.length) {
        return arr.filter(function (x) { return x && x.key; });
      }
    } catch (e) { console.warn('docs.items:', e); }
    return docsDefault();
  }
  /* ---------- История версий документов (требование юристов) ----------
     При каждой загрузке файла запоминаем ссылку и дату. Старые файлы в
     хранилище не удаляются, поэтому по записи в журнале согласий всегда
     видно, с какой именно редакцией согласился человек. */
  function docVersions() {
    try {
      var v = JSON.parse(settings['docs.versions'] || '{}');
      return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
    } catch (e) { console.warn('docs.versions:', e); return {}; }
  }
  function addDocVersion(key, url, fileName, sha256) {
    var all = docVersions();
    var list = all[key] || [];
    list.push({ url: url, at: new Date().toISOString(), name: fileName || '', sha256: sha256 || '' });
    if (list.length > 30) list = list.slice(-30);     // настройка не должна разрастаться
    all[key] = list;
    return saveSettings({ 'docs.versions': JSON.stringify(all) });
  }
  function versionsHtml(key, currentUrl) {
    var list = (docVersions()[key] || []).slice().reverse();
    var known = list.some(function (v) { return v.url === currentUrl; });
    if (!list.length && !currentUrl) return '';
    var total = list.length;
    var rows = list.map(function (v, i) {
      var cur = v.url === currentUrl;
      var num = total - i;                    // список развёрнут: первая строка — последняя редакция
      return '<div class="adm-ver">' +
        '<span class="adm-ver-when">ред. ' + num + ' от ' + esc(fmtDate(v.at)) +
        (v.name ? ' · ' + esc(v.name) : '') +
        (v.sha256 ? ' · sha256:' + esc(v.sha256.slice(0, 12)) + '…' : '') +
        (cur ? ' · <b>текущая</b>' : '') + '</span>' +
        '<a class="adm-btn adm-btn-sm adm-btn-ghost" href="' + esc(v.url) + '" target="_blank" rel="noopener">Открыть</a>' +
        (cur ? '' : '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="doc-restore" data-key="' +
          esc(key) + '" data-url="' + esc(v.url) + '">Сделать текущей</button>') +
        '</div>';
    }).join('');
    if (currentUrl && !known) {
      rows = '<div class="adm-ver"><span class="adm-ver-when">Текущий файл загружен до того, как появилась история версий</span></div>' + rows;
    }
    return '<details class="adm-vers"><summary>История версий: ' + list.length + '</summary>' + rows + '</details>';
  }

  function saveDocsItems(arr) {
    return saveSettings({ 'docs.items': JSON.stringify(arr) });
  }
  /* Подсказка «где ещё используется» — только у документов из списка по
     умолчанию: на них ссылаются галочки под формами и окно о куки. */
  function docSysNote(key) {
    var d = (window.TSK_DOCS_DEFAULT || []).filter(function (x) { return x.key === key; })[0];
    return d ? d.sys : '';
  }

  function renderDocs() {
    var items = docsItems();
    var withFile = items.filter(function (f) { return !!settings[f.key]; }).length;
    var missing = items.length - withFile;

    /* Сразу показываем, сколько документов реально видно на сайте: карточка
       без загруженного файла в раздел «Документы» не попадает, и без этой
       строки непонятно, почему на сайте документов меньше, чем здесь. */
    var summary = '<p class="adm-docs-note' + (missing ? ' warn' : '') + '">' +
      'В разделе «Документы» на сайте показываются <b>' + withFile + '</b> из <b>' + items.length + '</b>.' +
      (missing
        ? ' У остальных ' + missing + ' не загружен файл — такие карточки на сайте не видны. Загрузите файлы, и они появятся.'
        : ' У всех карточек загружены файлы.') + '</p>';

    /* Загрузка документов идёт на сервер сайта и закрыта паролем. Если он
       ещё не введён в этой сессии — просим ввести прямо здесь. */
    var needPass = !clKey();
    var passBox = needPass
      ? '<div class="adm-docs-note warn"><b>Чтобы загружать документы, введите пароль.</b> ' +
        'Тот же, что и для журнала согласий — документы хранятся на сервере сайта.' +
        '<div class="adm-docs-bar" style="margin-top:10px">' +
        '<input type="password" id="docsPass" autocomplete="off" placeholder="пароль" ' +
        'style="padding:9px 12px;border:1.5px solid var(--a-border);border-radius:9px;font-family:inherit" />' +
        '<button class="adm-btn adm-btn-primary" data-act="doc-pass" type="button">Сохранить пароль</button>' +
        '</div></div>'
      : '';

    var head = summary + passBox + '<div class="adm-docs-bar">' +
      '<button class="adm-btn adm-btn-primary" data-act="doc-add" type="button">+ Добавить документ</button>' +
      '<button class="adm-btn adm-btn-ghost" data-act="doc-reset" type="button">Восстановить стандартные</button>' +
      '<span class="adm-saved" id="docsSaved" hidden>Сохранено ✓</span></div>';

    var body = items.map(function (f, i) {
      var url = settings[f.key];
      var note = docSysNote(f.key);
      return '<div class="adm-item">' +
        '<div class="adm-item-body">' +
        '<label class="adm-docname">Название на сайте' +
        '<input type="text" data-docname="' + i + '" value="' + esc(f.name || '') + '" placeholder="Название документа" /></label>' +
        (note ? '<p class="adm-item-meta">Используется не только в разделе «Документы»: ' + esc(note) + '</p>' : '') +
        versionsHtml(f.key, url) +
        (url
          ? '<p class="adm-item-meta">файл загружен — ссылка на сайте открывает его</p>'
          : '<p class="adm-nofile">Файл не загружен — на сайте не показывается</p>') +
        '</div>' +
        '<div class="adm-item-actions">' +
        '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="doc-up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="doc-down" data-i="' + i + '"' + (i === items.length - 1 ? ' disabled' : '') + '>↓</button>' +
        (url ? '<a class="adm-btn adm-btn-sm adm-btn-ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Открыть</a>' : '') +
        '<label class="adm-btn adm-btn-sm adm-btn-primary adm-upload">' + (url ? 'Заменить файл' : 'Загрузить файл') +
        '<input type="file" data-dockey="' + esc(f.key) + '" accept="' + DOC_ACCEPT + '" hidden /></label>' +
        (url ? '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="doc-file-del" data-key="' + esc(f.key) + '">Удалить файл</button>' : '') +
        '<button class="adm-btn adm-btn-sm adm-btn-danger" data-act="doc-del" data-i="' + i + '">Удалить</button>' +
        '</div></div>';
    }).join('');

    $('docsList').innerHTML = head + (items.length ? body : '<p class="adm-empty">Документов пока нет — добавьте первый.</p>');
  }

  /* ---------- Авторизация ---------- */
  function showLogin() { $('viewLogin').hidden = false; $('viewPanel').hidden = true; }
  function showPanel() {
    $('viewLogin').hidden = true; $('viewPanel').hidden = false;
    sb.from('settings').select('key,value').then(function (r) {
      (r.data || []).forEach(function (row) { settings[row.key] = row.value; });
      openTab('messages');
    });
  }

  /* Причина отказа во входе бывает разной, и лечится она по-разному: одно
     дело — опечатка в пароле, другое — приостановленный проект в базе. Раньше
     во всех случаях писали одно и то же «проверьте email и пароль», а если
     запрос вовсе не проходил, сообщения не было совсем и кнопка оставалась
     нажатой. Теперь называем причину и подсказываем, что делать. */
  function loginShow(msg) {
    $('loginError').innerHTML = msg;
    $('loginError').hidden = false;
  }

  /* Отвечает ли вообще база — это отличает «неверный пароль» от «база лежит» */
  function dbAlive() {
    return fetch(cfg.url + '/auth/v1/health', { headers: { apikey: cfg.anonKey } })
      .then(function (r) { return r.ok ? 'ok' : 'code:' + r.status; }, function () { return 'no'; });
  }
  var DB_PAUSED = 'Похоже, база данных сейчас не принимает запросы. Зайдите на supabase.com ' +
    'под своей учётной записью и посмотрите на проект: если наверху висит предупреждение ' +
    'об исчерпанном лимите (Services restricted / Exceeding usage limits), дело в тарифе — ' +
    'проверьте раздел Usage у организации; если проект стоит на паузе — нажмите Restore / Resume project.';

  function loginFail(err) {
    var msg = (err && (err.message || err.error_description || err.error)) || '';
    var code = (err && (err.code || err.status)) || '';
    if (/invalid login credentials|invalid_credentials/i.test(msg)) {
      loginShow('Email или пароль не подходят. Проверьте раскладку и регистр. ' +
        'Если пароль забыт, его можно задать заново на supabase.com: Authentication → Users → нужный пользователь.');
      return;
    }
    if (/email not confirmed|email_not_confirmed/i.test(msg)) {
      loginShow('Почта пользователя не подтверждена. Подтвердите её по письму от Supabase ' +
        'или отметьте пользователя подтверждённым на supabase.com: Authentication → Users.');
      return;
    }
    if (/rate limit|too many/i.test(msg) || code === 429) {
      loginShow('Слишком много попыток входа подряд — база временно их не принимает. Подождите 10–15 минут и попробуйте снова.');
      return;
    }
    if (/user not found|user_not_found/i.test(msg)) {
      loginShow('Пользователь с таким email в базе не найден. Проверьте адрес или заведите пользователя на supabase.com: Authentication → Users → Add user.');
      return;
    }
    // остальное: сначала выясняем, отвечает ли база вообще
    loginShow('Проверяем связь с базой…');
    dbAlive().then(function (state) {
      if (state === 'ok') {
        loginShow('Не удалось войти: ' + (msg || 'база ответила ошибкой') +
          (code ? ' (код ' + code + ')' : '') + '. База при этом отвечает — дело не в связи.');
      } else if (state === 'no') {
        loginShow('Нет связи с базой (' + esc(cfg.url) + '). ' + DB_PAUSED +
          '<br>Если проект работает — проверьте интернет и не блокирует ли запросы расширение браузера или антивирус.');
      } else {
        loginShow('База отвечает ошибкой (' + esc(state.replace('code:', 'код ')) + '). ' + DB_PAUSED);
      }
    });
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('loginBtn').disabled = true;
    $('loginError').hidden = true;
    sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPass').value })
      .then(function (r) {
        $('loginBtn').disabled = false;
        if (r.error) { loginFail(r.error); return; }
        showPanel();
      })
      // запрос может не пройти вовсе — без этого кнопка навсегда оставалась нажатой
      .catch(function (err) {
        $('loginBtn').disabled = false;
        loginFail(err);
      });
  });
  $('logoutBtn').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });
  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) showPanel(); else showLogin();
  }).catch(function () {
    // не смогли проверить прежний вход — показываем форму, а не пустой экран
    showLogin();
    loginShow('Не удалось проверить прежний вход — база не ответила. Попробуйте войти заново.');
  });

  /* ---------- Вкладки ---------- */
  var loaders = { messages: loadMessages, reviews: loadReviews, schedule: loadSchedule, coaches: loadCoaches, texts: renderTexts, images: renderImages, design: renderDesign, docs: renderDocs, consents: renderConsents, contacts: renderContacts };
  function openTab(name) {
    document.querySelectorAll('.adm-tabpane').forEach(function (p) { p.hidden = true; });
    document.querySelectorAll('.adm-tabs button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === name); });
    $('tab-' + name).hidden = false;
    loaders[name]();
  }
  $('tabs').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-tab]');
    if (btn) openTab(btn.dataset.tab);
  });

  /* ---------- Заявки ---------- */
  function loadMessages() {
    sb.from('messages').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return fail(r.error);
      var list = $('messagesList');
      var unread = 0;
      if (!r.data.length) { list.innerHTML = '<p class="adm-empty">Заявок пока нет.</p>'; updateBadge('badgeMessages', 0); return; }
      list.innerHTML = r.data.map(function (m) {
        if (!m.read) unread++;
        var fields = Object.keys(m.payload || {}).map(function (k) {
          return '<p class="adm-kv"><b>' + esc(FIELD_LABELS[k] || k) + ':</b> ' + esc(m.payload[k]) + '</p>';
        }).join('');
        return '<div class="adm-item' + (m.read ? '' : ' unread') + '">' +
          '<div class="adm-item-body">' +
          '<p class="adm-item-meta">' + fmtDate(m.created_at) + '</p>' +
          '<p class="adm-item-title"><span class="adm-pill">' + esc(m.context || 'Заявка') + '</span></p>' +
          fields + '</div>' +
          '<div class="adm-item-actions">' +
          '<button class="adm-btn adm-btn-sm adm-btn-ok" data-act="toggle-read" data-id="' + m.id + '" data-read="' + m.read + '">' + (m.read ? 'Отметить непрочитанной' : 'Прочитано') + '</button>' +
          '<button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del-message" data-id="' + m.id + '">Удалить</button>' +
          '</div></div>';
      }).join('');
      updateBadge('badgeMessages', unread);
    });
  }
  function updateBadge(id, n) {
    var b = $(id);
    b.hidden = !n;
    b.textContent = n;
  }

  /* ---------- Отзывы ---------- */
  function loadReviews() {
    sb.from('reviews').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return fail(r.error);
      var pending = r.data.filter(function (x) { return !x.approved; });
      var approved = r.data.filter(function (x) { return x.approved; });
      updateBadge('badgeReviews', pending.length);
      function card(x) {
        var n = parseInt(x.rating, 10);
        if (!(n >= 1 && n <= 5)) n = 5;
        return '<div class="adm-item' + (x.approved ? '' : ' unread') + '">' +
          '<div class="adm-item-body">' +
          '<p class="adm-item-meta">' + fmtDate(x.created_at) + (x.contact ? ' · ' + esc(x.contact) : '') + '</p>' +
          '<p class="adm-item-title">' + esc(x.name) + ' <span class="adm-stars">' + '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n) + '</span></p>' +
          '<p>' + esc(x.text) + '</p></div>' +
          '<div class="adm-item-actions">' +
          (x.approved
            ? '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="unapprove" data-id="' + x.id + '">Скрыть с сайта</button>'
            : '<button class="adm-btn adm-btn-sm adm-btn-ok" data-act="approve" data-id="' + x.id + '">Опубликовать</button>') +
          '<button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del-review" data-id="' + x.id + '">Удалить</button>' +
          '</div></div>';
      }
      $('reviewsPending').innerHTML = pending.length ? pending.map(card).join('') : '<p class="adm-empty">Новых отзывов нет.</p>';
      $('reviewsApproved').innerHTML = approved.length ? approved.map(card).join('') : '<p class="adm-empty">Опубликованных отзывов пока нет.</p>';
    });
  }

  /* ---------- Расписание ---------- */
  function fillSelect(sel, map, extra) {
    sel.innerHTML = Object.keys(map).map(function (k) {
      return '<option value="' + k + '">' + esc(map[k]) + '</option>';
    }).join('');
    if (extra) sel.insertAdjacentHTML('afterbegin', extra);
  }
  fillSelect($('schDir'), DIRS);
  fillSelect($('schAge'), AGES);
  fillSelect($('schDay'), DAYS);

  var schEditId = null;
  function schSort(day, time) {
    // автосортировка: день недели, затем время начала
    var d = DAY_ORDER.indexOf(day);
    var m = /(\d{1,2})[:.](\d{2})/.exec(time || '');
    return (d < 0 ? 7 : d) * 10000 + (m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 9999);
  }
  function resetSchForm() {
    schEditId = null;
    $('schForm').reset();
    $('schFormTitle').textContent = 'Добавить занятие';
    $('schSaveBtn').textContent = 'Добавить';
    $('schCancelBtn').hidden = true;
  }
  $('schCancelBtn').addEventListener('click', resetSchForm);
  $('schForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var row = {
      dir: $('schDir').value, age: $('schAge').value, day: $('schDay').value,
      time: $('schTime').value.trim(), coach: $('schCoach').value.trim()
    };
    row.sort = schSort(row.day, row.time);
    var q = schEditId
      ? sb.from('schedule').update(row).eq('id', schEditId)
      : sb.from('schedule').insert(row);
    q.then(function (r) {
      if (r.error) return fail(r.error);
      resetSchForm();
      loadSchedule();
    });
  });

  function loadSchedule() {
    Promise.all([
      sb.from('schedule').select('*').order('sort').order('id'),
      sb.from('coaches').select('name').order('sort')
    ]).then(function (rs) {
      if (rs[0].error) return fail(rs[0].error);
      $('coachNames').innerHTML = (rs[1].data || []).map(function (c) { return '<option value="' + esc(c.name) + '">'; }).join('');
      var list = $('scheduleList');
      if (!rs[0].data.length) { list.innerHTML = '<p class="adm-empty">Занятий пока нет — добавьте первое.</p>'; return; }
      list.innerHTML = rs[0].data.map(function (s) {
        return '<div class="adm-item" data-json="' + esc(JSON.stringify(s)) + '">' +
          '<div class="adm-item-body">' +
          '<p class="adm-item-title"><span class="adm-pill">' + esc(DAYS[s.day] || s.day) + '</span> ' + esc(s.time) + ' — ' + esc(DIRS[s.dir] || s.dir) + '</p>' +
          '<p class="adm-item-meta">' + esc(AGES[s.age] || s.age) + (s.coach ? ' · ' + esc(s.coach) : '') + '</p>' +
          '</div>' +
          '<div class="adm-item-actions">' +
          '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="edit-sch" data-id="' + s.id + '">Изменить</button>' +
          '<button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del-sch" data-id="' + s.id + '">Удалить</button>' +
          '</div></div>';
      }).join('');
    });
  }

  /* ---------- Тренеры ---------- */
  var coachEditId = null;
  function resetCoachForm() {
    coachEditId = null;
    $('coachForm').reset();
    $('coachFormTitle').textContent = 'Добавить тренера';
    $('coachSaveBtn').textContent = 'Добавить';
    $('coachCancelBtn').hidden = true;
  }
  $('coachCancelBtn').addEventListener('click', resetCoachForm);
  $('coachForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('coachSaveBtn').disabled = true;
    var file = $('coachPhoto').files[0];
    (file ? uploadImage(file, 'coaches') : Promise.resolve(null)).then(function (url) {
      var row = {
        name: $('coachName').value.trim(),
        tag_pos: $('coachPos').value.trim(),
        tag_exp: $('coachExp').value.trim(),
        bio: $('coachBio').value.trim()
      };
      if (url) row.photo_url = url;
      if (!coachEditId) {
        var maxSort = coachesCache.reduce(function (m, c) { return Math.max(m, c.sort || 0); }, 0);
        row.sort = maxSort + 1;
      }
      var q = coachEditId
        ? sb.from('coaches').update(row).eq('id', coachEditId)
        : sb.from('coaches').insert(row);
      return q.then(function (r) {
        if (r.error) throw r.error;
        resetCoachForm();
        loadCoaches();
      });
    }).catch(fail).then(function () { $('coachSaveBtn').disabled = false; });
  });

  function loadCoaches() {
    sb.from('coaches').select('*').order('sort').order('id').then(function (r) {
      if (r.error) return fail(r.error);
      coachesCache = r.data;
      var list = $('coachesList');
      if (!r.data.length) { list.innerHTML = '<p class="adm-empty">Тренеров пока нет — добавьте первого.</p>'; return; }
      list.innerHTML = r.data.map(function (c, i) {
        return '<div class="adm-item">' +
          '<img class="adm-thumb" src="' + esc(c.photo_url || 'assets/img/coach-1.png') + '" alt="" />' +
          '<div class="adm-item-body">' +
          '<p class="adm-item-title">' + esc(c.name) + '</p>' +
          '<p class="adm-item-meta">' + esc(c.tag_pos) + (c.tag_exp ? ' · ' + esc(c.tag_exp) : '') + '</p>' +
          '<p>' + esc(c.bio) + '</p></div>' +
          '<div class="adm-item-actions">' +
          '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="coach-up" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="coach-down" data-i="' + i + '"' + (i === r.data.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="edit-coach" data-i="' + i + '">Изменить</button>' +
          '<button class="adm-btn adm-btn-sm adm-btn-danger" data-act="del-coach" data-id="' + c.id + '">Удалить</button>' +
          '</div></div>';
      }).join('');
    });
  }
  function swapCoaches(i, j) {
    var a = coachesCache[i], b = coachesCache[j];
    // при равных sort (например, 0 и 0) обмен ничего бы не менял — нормализуем на позиции
    var sa = a.sort === b.sort ? j + 1 : b.sort;
    var sbv = a.sort === b.sort ? i + 1 : a.sort;
    Promise.all([
      sb.from('coaches').update({ sort: sa }).eq('id', a.id),
      sb.from('coaches').update({ sort: sbv }).eq('id', b.id)
    ]).then(function (rs) {
      if (rs[0].error || rs[1].error) return fail(rs[0].error || rs[1].error);
      loadCoaches();
    });
  }

  /* ---------- Тексты ---------- */
  function renderTexts() {
    $('textsForm').innerHTML = '<p class="adm-empty">Загрузка текстов сайта…</p>';
    fetchPages().then(function (docs) {
      var seen = {}, order = [], byGroup = {};
      function add(g, f) {
        if (seen[f.key]) return;
        seen[f.key] = 1;
        if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
        byGroup[g].push(f);
      }
      docs.forEach(function (d) {
        d.doc.querySelectorAll('[data-cms], [data-cms-ph]').forEach(function (el) {
          var g = groupOf(el, d.label);
          // variant: 'd' только на компьютере, 'm' только на телефоне, '' общий
          var variant = el.closest('.ft-m, .lead-m, .cta-m') ? 'm'
            : el.closest('.ft-d, .lead-d, .cta-d') ? 'd' : '';
          var suffix = el.closest('.t-short') ? ' (короткая надпись)'
            : el.closest('.t-long') ? ' (полная надпись)' : '';
          if (el.hasAttribute('data-cms')) {
            var def = defaultTextOf(el);
            if (def) add(g, { key: el.getAttribute('data-cms'), def: def, suffix: suffix, variant: variant });
          }
          if (el.hasAttribute('data-cms-ph')) add(g, { key: el.getAttribute('data-cms-ph'), def: el.getAttribute('placeholder') || '', ph: true, variant: variant });
        });
      });
      EXTRA_TEXTS.forEach(function (f) { add('Служебные тексты', f); });

      function colorHtml(key) {
        var ckey = 'tcolor.' + key;
        var cur = settings[ckey] || '';
        var swatches = TEXT_COLORS.map(function (c) {
          var on = cur.toUpperCase() === c.c.toUpperCase();
          return '<button type="button" class="adm-swatch' + (on ? ' active' : '') + '" data-c="' + c.c + '" title="' + esc(c.label) + '" style="background:' + c.c + '"></button>';
        }).join('');
        return '<div class="adm-color" data-key="' + esc(ckey) + '" data-value="' + esc(cur) + '">' +
          '<span class="adm-color-label">Цвет:</span>' +
          '<button type="button" class="adm-swatch adm-swatch-def' + (cur ? '' : ' active') + '" data-c="" title="По умолчанию">A</button>' +
          swatches +
          '<label class="adm-swatch-custom" title="Выбрать любой цвет"><input type="color" value="' + esc(cur || '#000000') + '" /><span>+</span></label>' +
          '</div>';
      }
      function fieldHtml(f) {
        var label = f.label || ((f.def.split('\n')[0] || f.key).slice(0, 60) + (f.suffix || '') + (f.ph ? ' — подсказка в поле' : ''));
        var rows = Math.min(f.def.split('\n').length + 1, 5);
        var ta = '<label>' + esc(label) +
          '<textarea data-key="' + esc(f.key) + '" rows="' + rows + '" placeholder="' + esc(f.def) + '">' + esc(settings[f.key] || '') + '</textarea></label>';
        // цвет только для реальных текстов (не для подсказок в полях форм)
        return '<div class="adm-field">' + ta + (f.ph ? '' : colorHtml(f.key)) + '</div>';
      }
      function groupsHtml(tab) {
        var html = '', first = true;
        order.forEach(function (g) {
          var fields = byGroup[g].filter(function (f) {
            var v = f.variant || '';
            return tab === 'desktop' ? v !== 'm' : v !== 'd';
          });
          if (!fields.length) return;
          html += '<details class="adm-textgroup"' + (first ? ' open' : '') + '><summary>' + esc(g) + '</summary><div class="adm-card">' +
            fields.map(fieldHtml).join('') + '</div></details>';
          first = false;
        });
        return html;
      }
      $('textsForm').innerHTML =
        '<div id="textsDesktop"' + (textsSubtab === 'desktop' ? '' : ' hidden') + '>' +
        '<p class="adm-hint">Все тексты сайта в компьютерной версии. Общие тексты применяются и на телефоне.</p>' +
        groupsHtml('desktop') + '</div>' +
        '<div id="textsMobile"' + (textsSubtab === 'mobile' ? '' : ' hidden') + '>' +
        '<p class="adm-hint">Все тексты сайта в версии для телефона. Общие тексты меняются вместе с компьютерной версией; у некоторых блоков на телефоне свой отдельный текст.</p>' +
        groupsHtml('mobile') + '</div>';
    }).catch(function (e) {
      $('textsForm').innerHTML = '<p class="adm-empty">Не удалось загрузить страницы сайта (' + esc(e.message) + '). Обновите страницу.</p>';
    });
  }
  $('textsSubtabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-subtab]');
    if (!b) return;
    textsSubtab = b.dataset.subtab;
    document.querySelectorAll('#textsSubtabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
    if ($('textsDesktop')) $('textsDesktop').hidden = textsSubtab !== 'desktop';
    if ($('textsMobile')) $('textsMobile').hidden = textsSubtab !== 'mobile';
  });

  // Общие тексты показаны в обеих подвкладках — держим их значения синхронными
  $('textsForm').addEventListener('input', function (e) {
    var ta = e.target.closest('textarea[data-key]');
    if (ta) {
      document.querySelectorAll('#textsForm textarea[data-key="' + (window.CSS && CSS.escape ? CSS.escape(ta.dataset.key) : ta.dataset.key) + '"]').forEach(function (o) {
        if (o !== ta) o.value = ta.value;
      });
      return;
    }
    var ci = e.target.closest('.adm-swatch-custom input[type="color"]');
    if (ci) setColor(ci.closest('.adm-color').dataset.key, ci.value);
  });
  // Клик по образцу цвета
  $('textsForm').addEventListener('click', function (e) {
    var sw = e.target.closest('.adm-swatch[data-c]');
    if (!sw) return;
    setColor(sw.closest('.adm-color').dataset.key, sw.dataset.c);
  });
  function setColor(ckey, val) {
    document.querySelectorAll('.adm-color[data-key="' + (window.CSS && CSS.escape ? CSS.escape(ckey) : ckey) + '"]').forEach(function (box) {
      box.dataset.value = val || '';
      box.querySelectorAll('.adm-swatch').forEach(function (s) {
        s.classList.toggle('active', (s.dataset.c || '').toUpperCase() === (val || '').toUpperCase());
      });
      var custom = box.querySelector('.adm-swatch-custom input');
      if (val) custom.value = val;
    });
  }

  $('textsSaveBtn').addEventListener('click', function () {
    var map = {};
    document.querySelectorAll('#textsForm textarea[data-key]').forEach(function (t) { map[t.dataset.key] = t.value; });
    document.querySelectorAll('#textsForm .adm-color[data-key]').forEach(function (b) { map[b.dataset.key] = b.dataset.value || ''; });
    saveSettings(map).then(function () { flash('textsSaved'); }).catch(fail);
  });

  /* ---------- Изображения ---------- */
  function renderImages() {
    $('imagesList').innerHTML = '<p class="adm-empty">Загрузка изображений…</p>';
    fetchPages().then(function (docs) {
      var seen = {}, order = [], byGroup = {};
      docs.forEach(function (d) {
        d.doc.querySelectorAll('img[data-cms-img]').forEach(function (img) {
          var key = img.getAttribute('data-cms-img');
          if (seen[key]) return;
          seen[key] = 1;
          var g = groupOf(img, d.label);
          if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
          var src = img.getAttribute('src') || '';
          byGroup[g].push({ key: key, def: src, label: img.getAttribute('alt') || src.split('/').pop() });
        });
      });
      function galleryExtraHtml() {
        var arr = galExtra();
        return '<div class="adm-item"><div class="adm-item-body">' +
          '<p class="adm-item-title">Дополнительные фото</p>' +
          '<p class="adm-item-meta">Добавляются после восьми стандартных и листаются вместе с ними. Сейчас добавлено: ' + arr.length + '</p></div>' +
          '<div class="adm-item-actions"><label class="adm-btn adm-btn-sm adm-btn-primary adm-upload">+ Добавить фото<input type="file" accept="image/*" data-galadd hidden /></label></div></div>' +
          arr.map(function (u, i) {
            return '<div class="adm-item"><img class="adm-thumb" src="' + esc(u) + '" loading="lazy" alt="" />' +
              '<div class="adm-item-body"><p class="adm-item-title">Дополнительное фото ' + (i + 1) + '</p></div>' +
              '<div class="adm-item-actions"><button class="adm-btn adm-btn-sm adm-btn-danger" data-act="gal-del" data-i="' + i + '">Удалить</button></div></div>';
          }).join('');
      }
      $('imagesList').innerHTML = order.map(function (g, gi) {
        var isGallery = byGroup[g].some(function (f) { return f.key === 'image.gal_1'; });
        return '<details class="adm-textgroup"' + (gi === 0 ? ' open' : '') + '><summary>' + esc(g) + (isGallery ? ' ➕' : '') + '</summary><div class="adm-list">' +
          (isGallery ? galleryExtraHtml() : '') +
          byGroup[g].map(function (f) {
            var custom = !!settings[f.key];
            return '<div class="adm-item">' +
              '<img class="adm-thumb" src="' + esc(settings[f.key] || f.def) + '" alt="" loading="lazy" />' +
              '<div class="adm-item-body">' +
              '<p class="adm-item-title">' + esc(f.label) + '</p>' +
              '<p class="adm-item-meta">' + (custom ? 'загружена своя картинка' : 'стандартная картинка') + '</p>' +
              '</div>' +
              '<div class="adm-item-actions">' +
              '<label class="adm-btn adm-btn-sm adm-btn-ok adm-upload">Заменить<input type="file" accept="image/*" data-imgkey="' + esc(f.key) + '" hidden /></label>' +
              (custom ? '<button class="adm-btn adm-btn-sm adm-btn-ghost" data-act="img-reset" data-key="' + esc(f.key) + '">Вернуть стандартное</button>' : '') +
              '</div></div>';
          }).join('') + '</div></details>';
      }).join('');
    }).catch(function (e) {
      $('imagesList').innerHTML = '<p class="adm-empty">Не удалось загрузить страницы сайта (' + esc(e.message) + '). Обновите страницу.</p>';
    });
  }

  document.addEventListener('change', function (e) {
    // переименование карточки документа — сохраняем по уходу из поля
    var nameInp = e.target.closest('input[data-docname]');
    if (nameInp) {
      var arr = docsItems();
      var ni = parseInt(nameInp.dataset.docname, 10);
      if (arr[ni]) {
        arr[ni].name = nameInp.value.trim() || arr[ni].name;
        saveDocsItems(arr).then(function () { flash('docsSaved'); }).catch(fail);
      }
      return;
    }
    var doc = e.target.closest('input[data-dockey]');
    if (doc && doc.files[0]) {
      doc.disabled = true;
      var docKey = doc.dataset.dockey, theFile = doc.files[0], fileName = theFile.name;
      uploadDocFile(theFile, docKey)
        .then(function (res) {
          var m = {}; m[docKey] = res.url;
          // сначала ссылка на текущий файл, затем запись в историю версий
          return saveSettings(m).then(function () {
            return addDocVersion(docKey, res.url, fileName, res.sha256);
          });
        })
        .then(renderDocs)
        .catch(function (e) { fail(e); renderDocs(); });
      return;
    }
    var add = e.target.closest('input[data-galadd]');
    if (add && add.files[0]) {
      add.disabled = true;
      uploadImage(add.files[0], 'gallery')
        .then(function (url) { return saveGalExtra(galExtra().concat([url])); })
        .then(renderImages)
        .catch(fail);
      return;
    }
    var inp = e.target.closest('input[data-imgkey]');
    if (!inp || !inp.files[0]) return;
    var key = inp.dataset.imgkey;
    inp.disabled = true;
    uploadImage(inp.files[0], 'site')
      .then(function (url) { var m = {}; m[key] = url; return saveSettings(m); })
      .then(renderImages)
      .catch(fail);
  });

  /* ---------- Оформление ---------- */
  function renderDesign() {
    $('colorsGrid').innerHTML = COLOR_FIELDS.map(function (f) {
      var val = settings[f.key] || f.def;
      return '<label>' + esc(f.label) + '<input type="color" data-key="' + f.key + '" data-def="' + f.def + '" value="' + esc(val) + '" /></label>';
    }).join('');
    $('fontSelect').innerHTML = FONT_OPTIONS.map(function (o) {
      return '<option value="' + esc(o.value) + '"' + ((settings['theme.font_body'] || '') === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }).join('');
    renderTextSizes();
    renderSpacing();
  }

  /* Размер текста: поле на каждый текстовый блок сайта (реестр в textsizes.js) */
  function sizeInput(key, label, min, max, step) {
    min = min == null ? 50 : min; max = max == null ? 250 : max; step = step == null ? 5 : step;
    var lim = ' min="' + min + '" max="' + max + '" step="' + step + '"';
    return '<div class="adm-sizerow"><span class="adm-sizelabel">' + esc(label) + '</span>' +
      '<label class="adm-sizefield">Компьютер, %<input type="number"' + lim + ' data-key="' + key + '" placeholder="100" value="' + esc(settings[key] || '') + '" /></label>' +
      '<label class="adm-sizefield">Телефон, %<input type="number"' + lim + ' data-key="' + key + '.mob" placeholder="как на комп." value="' + esc(settings[key + '.mob'] || '') + '" /></label></div>';
  }
  function renderSpacing() {
    var box = $('spacingForm');
    if (!box) return;
    box.innerHTML =
      sizeInput('sspace.global', 'Все блоки сразу', 0, 300, 10) +
      // отдельные промежутки в футере: один отступ на строку, без пары «сверху/снизу»
      (window.TSK_GAP_SPACING || []).map(function (e) {
        return sizeInput('sspace.' + e.key, e.label, 0, 300, 10);
      }).join('') +
      (window.TSK_SECTION_SPACING || []).map(function (e) {
        return sizeInput('sspace.' + e.key + '.top', e.label + ' — отступ сверху', 0, 300, 10) +
          sizeInput('sspace.' + e.key + '.bot', e.label + ' — отступ снизу', 0, 300, 10);
      }).join('');
  }
  function renderTextSizes() {
    var box = $('sizesForm');
    if (!box) return;
    var groups = {};
    (window.TSK_TEXT_SIZES || []).forEach(function (f) { (groups[f.g] = groups[f.g] || []).push(f); });
    box.innerHTML =
      sizeInput('tsize.global', 'Весь сайт сразу') +
      Object.keys(groups).map(function (g) {
        return '<details class="adm-textgroup"><summary>' + esc(g) + '</summary><div class="adm-card">' +
          groups[g].map(function (f) { return sizeInput('tsize.' + f.key, f.label); }).join('') +
          '</div></details>';
      }).join('');
  }
  $('designSaveBtn').addEventListener('click', function () {
    var btn = $('designSaveBtn');
    btn.disabled = true;
    var map = {};
    document.querySelectorAll('#colorsGrid input[data-key]').forEach(function (inp) {
      // стандартный цвет не сохраняем, чтобы поле «вернулось к умолчанию»
      map[inp.dataset.key] = inp.value.toUpperCase() === inp.dataset.def.toUpperCase() ? '' : inp.value;
    });
    map['theme.font_body'] = $('fontSelect').value;
    document.querySelectorAll('#sizesForm input[data-key], #spacingForm input[data-key]').forEach(function (inp) {
      var v = inp.value.trim();
      var mob = inp.dataset.key.slice(-4) === '.mob';
      // 100% на компьютере = стандарт (не храним); на телефоне пустое поле = «как на компьютере»
      map[inp.dataset.key] = (v === '' || (v === '100' && !mob)) ? '' : v;
    });
    saveSettings(map).then(function () {
      renderDesign();
      flash('designSaved');
    }).catch(fail).then(function () { btn.disabled = false; });
  });
  $('designResetBtn').addEventListener('click', function () {
    if (!confirm('Вернуть фирменные цвета, шрифт и размеры текста?')) return;
    var map = {};
    COLOR_FIELDS.forEach(function (f) { map[f.key] = ''; });
    map['theme.font_body'] = '';
    map['tsize.global'] = '';
    map['tsize.global.mob'] = '';
    (window.TSK_TEXT_SIZES || []).forEach(function (f) { map['tsize.' + f.key] = ''; map['tsize.' + f.key + '.mob'] = ''; });
    map['sspace.global'] = '';
    map['sspace.global.mob'] = '';
    (window.TSK_SECTION_SPACING || []).forEach(function (f) {
      ['', '.mob', '.top', '.top.mob', '.bot', '.bot.mob'].forEach(function (sfx) { map['sspace.' + f.key + sfx] = ''; });
    });
    saveSettings(map).then(function () { renderDesign(); flash('designSaved'); }).catch(fail);
  });

  /* ---------- Журнал согласий (выгрузка для проверки) ----------
     Журнал ведёт consent-log.php на сервере сайта, а не эта база: IP-адрес
     виден только серверу. Здесь — просмотр последних записей и выгрузка
     всех сведений за месяц в CSV или JSON.
     Пароль в коде не хранится: его вводит администратор, и он живёт только
     до конца сессии в браузере. */
  function clUrl(params) {
    return phpUrl('consent-log.php') + '?' + params;
  }
  function clError(msg) {
    var el = $('clError');
    el.textContent = msg;
    el.hidden = !msg;
  }

  /* Реестр документов и их редакций — чтобы по записи в журнале можно было
     найти, с каким именно текстом человек согласился (требование юристов:
     «важно фиксировать, с какой редакцией пользователь соглашался»). */
  function registerHtml() {
    var vs = docVersions();
    var items = docsItems();
    var rows = [];
    items.forEach(function (it) {
      var list = vs[it.key] || [];
      if (!list.length) {
        if (settings[it.key]) {
          rows.push('<div class="adm-ver"><span class="adm-ver-when">' + esc(it.name) +
            ' — редакция не зарегистрирована (файл загружен до появления истории версий)</span>' +
            '<a class="adm-btn adm-btn-sm adm-btn-ghost" href="' + esc(settings[it.key]) +
            '" target="_blank" rel="noopener">Открыть</a></div>');
        }
        return;
      }
      list.slice().reverse().forEach(function (v, i) {
        var num = list.length - i;
        rows.push('<div class="adm-ver"><span class="adm-ver-when"><b>' + esc(it.name) + '</b>, ред. ' + num +
          ' от ' + esc(fmtDate(v.at)) + (v.sha256 ? ' · sha256:' + esc(v.sha256) : '') +
          (v.url === settings[it.key] ? ' · <b>текущая</b>' : '') + '</span>' +
          '<a class="adm-btn adm-btn-sm adm-btn-ghost" href="' + esc(v.url) +
          '" target="_blank" rel="noopener">Открыть</a></div>');
      });
    });
    return '<div class="adm-card adm-form"><h3>Реестр документов и их редакций</h3>' +
      '<p class="adm-hint">В каждой записи журнала указано название документа, номер редакции, дата и контрольная сумма файла (sha256). По ней можно доказать, что предъявленный документ — ровно тот, с которым согласился посетитель.</p>' +
      (rows.length ? rows.join('') : '<p class="adm-empty">Документы ещё не загружены.</p>') + '</div>';
  }

  function renderConsents() {
    $('clKey').value = clKey();
    $('clResult').innerHTML = '';
    clError('');
    if (clKey()) loadConsents();
  }

  function loadConsents() {
    var key = $('clKey').value.trim();
    if (!key) { clError('Введите пароль доступа.'); return; }
    clError('');
    $('clResult').innerHTML = '<p class="adm-empty">Загрузка журнала…</p>';

    Promise.all([
      phpJson(clUrl('months=' + encodeURIComponent(key))),
      phpJson(clUrl('recent=' + encodeURIComponent(key) + '&n=20'))
    ]).then(function (res) {
      var months = res[0], recent = res[1];
      if (!months || months.error === 'bad_key') {
        $('clResult').innerHTML = '';
        clError('Пароль не подошёл. Проверьте раскладку и регистр — пароль вводится точно так, как задан.');
        return;
      }
      clSaveKey(key);
      var ms = months.months || {};
      var keys = Object.keys(ms);

      var head = '<div class="adm-card adm-form"><h3>Выгрузка за месяц</h3>' +
        (keys.length
          ? '<div class="adm-list">' + keys.map(function (m) {
              return '<div class="adm-item"><div class="adm-item-body">' +
                '<p class="adm-item-title">' + esc(m) + '</p>' +
                '<p class="adm-item-meta">записей: ' + ms[m] + '</p></div>' +
                '<div class="adm-item-actions">' +
                '<a class="adm-btn adm-btn-sm adm-btn-primary" href="' +
                  esc(clUrl('export=' + encodeURIComponent(key) + '&month=' + encodeURIComponent(m) + '&format=csv')) +
                  '">Скачать CSV</a>' +
                '<a class="adm-btn adm-btn-sm adm-btn-ghost" href="' +
                  esc(clUrl('export=' + encodeURIComponent(key) + '&month=' + encodeURIComponent(m) + '&format=json')) +
                  '">Скачать JSON</a>' +
                '</div></div>';
            }).join('') + '</div>'
          : '<p class="adm-empty">Записей пока нет — журнал заполнится, когда посетители начнут отправлять формы.</p>') +
        '</div>';

      var rows = (recent && recent.rows) || [];
      var list = '<div class="adm-card adm-form"><h3>Последние записи (' + rows.length + ' из ' +
        ((recent && recent.total) || 0) + ' за текущий месяц)</h3>' +
        (rows.length
          ? '<div class="adm-list">' + rows.map(function (r) {
              var f = r.fields || {};
              var fields = Object.keys(f).map(function (k) {
                return '<p class="adm-kv"><b>' + esc(FIELD_LABELS[k] || k) + ':</b> ' + esc(f[k]) + '</p>';
              }).join('');
              return '<div class="adm-item"><div class="adm-item-body">' +
                '<p class="adm-item-meta">' + esc(fmtDate(r.at)) + ' · IP ' + esc(r.ip || '—') + ' · ' + esc(r.page || '') + '</p>' +
                '<p class="adm-item-title"><span class="adm-pill">' + esc(r.context || r.type || '') + '</span></p>' +
                fields + '</div></div>';
            }).join('') + '</div>'
          : '<p class="adm-empty">За текущий месяц записей нет.</p>') +
        '</div>';

      $('clResult').innerHTML = registerHtml() + head + list;
    }).catch(function (e) {
      $('clResult').innerHTML = '';
      clError('Не удалось получить журнал: ' + (e && e.message ? e.message : 'нет ответа от сервера'));
    });
  }
  $('clLoad').addEventListener('click', loadConsents);

  /* ---------- Контакты ---------- */
  function renderContacts() {
    $('cPhoneDisplay').value = settings['contact.phone_display'] || '';
    $('cPhoneTel').value = settings['contact.phone_tel'] || '';
    $('cWhatsapp').value = settings['contact.whatsapp'] || '';
    $('cAddress').value = settings['contact.address'] || '';
    $('cLegalName').value = settings['contact.legal_name'] || '';
    $('cInn').value = settings['contact.inn'] || '';
    $('cOgrn').value = settings['contact.ogrn'] || '';
    $('cLegalAddress').value = settings['contact.legal_address'] || '';
    $('cEmail').value = settings['contact.email'] || '';
  }
  $('contactsSaveBtn').addEventListener('click', function () {
    saveSettings({
      'contact.phone_display': $('cPhoneDisplay').value,
      'contact.phone_tel': $('cPhoneTel').value,
      'contact.address': $('cAddress').value.trim(),
      'contact.legal_name': $('cLegalName').value.trim(),
      'contact.inn': $('cInn').value.trim(),
      'contact.ogrn': $('cOgrn').value.trim(),
      'contact.legal_address': $('cLegalAddress').value.trim(),
      'contact.email': $('cEmail').value.trim(),
      'contact.whatsapp': $('cWhatsapp').value.replace(/\D/g, '')
    }).then(function () { flash('contactsSaved'); }).catch(fail);
  });

  /* ---------- Общий обработчик кнопок в списках ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.dataset.id, act = btn.dataset.act;
    function run(q, reload) {
      q.then(function (r) { if (r.error) return fail(r.error); reload(); });
    }
    if (act === 'toggle-read') run(sb.from('messages').update({ read: btn.dataset.read !== 'true' }).eq('id', id), loadMessages);
    if (act === 'del-message' && confirm('Удалить заявку?')) run(sb.from('messages').delete().eq('id', id), loadMessages);
    if (act === 'approve') run(sb.from('reviews').update({ approved: true }).eq('id', id), loadReviews);
    if (act === 'unapprove') run(sb.from('reviews').update({ approved: false }).eq('id', id), loadReviews);
    if (act === 'del-review' && confirm('Удалить отзыв безвозвратно?')) run(sb.from('reviews').delete().eq('id', id), loadReviews);
    if (act === 'del-sch' && confirm('Удалить занятие из расписания?')) run(sb.from('schedule').delete().eq('id', id), loadSchedule);
    if (act === 'edit-sch') {
      var s = JSON.parse(btn.closest('.adm-item').dataset.json);
      schEditId = s.id;
      $('schDir').value = s.dir; $('schAge').value = s.age; $('schDay').value = s.day;
      $('schTime').value = s.time; $('schCoach').value = s.coach;
      $('schFormTitle').textContent = 'Изменить занятие';
      $('schSaveBtn').textContent = 'Сохранить';
      $('schCancelBtn').hidden = false;
      $('schForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (act === 'del-coach' && confirm('Удалить тренера?')) run(sb.from('coaches').delete().eq('id', id), loadCoaches);
    if (act === 'edit-coach') {
      var c = coachesCache[parseInt(btn.dataset.i, 10)];
      coachEditId = c.id;
      $('coachName').value = c.name; $('coachPos').value = c.tag_pos;
      $('coachExp').value = c.tag_exp; $('coachBio').value = c.bio;
      $('coachFormTitle').textContent = 'Изменить тренера';
      $('coachSaveBtn').textContent = 'Сохранить';
      $('coachCancelBtn').hidden = false;
      $('coachForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (act === 'coach-up') swapCoaches(parseInt(btn.dataset.i, 10), parseInt(btn.dataset.i, 10) - 1);
    if (act === 'coach-down') swapCoaches(parseInt(btn.dataset.i, 10), parseInt(btn.dataset.i, 10) + 1);
    if (act === 'img-reset') {
      var m = {}; m[btn.dataset.key] = '';
      saveSettings(m).then(renderImages).catch(fail);
    }
    // очистить загруженный файл, карточка остаётся
    if (act === 'doc-file-del' && confirm('Удалить файл? Ссылки на сайте перестанут его открывать.')) {
      var dm = {}; dm[btn.dataset.key] = '';
      saveSettings(dm).then(renderDocs).catch(fail);
    }
    // новая карточка документа: ключ уникальный, имя правится на месте
    if (act === 'doc-pass') {
      var pv = ($('docsPass') && $('docsPass').value || '').trim();
      if (!pv) return;
      clSaveKey(pv);
      renderDocs();
    }
    if (act === 'doc-restore') {
      var rm = {}; rm[btn.dataset.key] = btn.dataset.url;
      saveSettings(rm).then(function () { renderDocs(); flash('docsSaved'); }).catch(fail);
    }
    /* Возвращает шесть стандартных документов юротдела, если их случайно
       удалили из списка. Свои добавленные документы при этом сохраняются. */
    if (act === 'doc-reset') {
      var cur = docsItems();
      var defs = docsDefault();
      var defKeys = defs.map(function (d) { return d.key; });
      var mine = cur.filter(function (x) { return defKeys.indexOf(x.key) === -1; });
      // у стандартных документов сохраняем названия, если их уже меняли
      var merged = defs.map(function (d) {
        var was = cur.filter(function (x) { return x.key === d.key; })[0];
        return { key: d.key, name: was ? was.name : d.name };
      }).concat(mine);
      if (confirm('Вернуть в список все стандартные документы?\n\nДобавленные вами документы и уже загруженные файлы останутся на месте.')) {
        saveDocsItems(merged).then(function () { renderDocs(); flash('docsSaved'); }).catch(fail);
      }
    }
    if (act === 'doc-add') {
      var added = docsItems().concat([{ key: 'doc.custom_' + Date.now(), name: 'Новый документ' }]);
      saveDocsItems(added).then(function () { renderDocs(); flash('docsSaved'); }).catch(fail);
    }
    if (act === 'doc-up' || act === 'doc-down') {
      var list = docsItems();
      var from = parseInt(btn.dataset.i, 10);
      var to = from + (act === 'doc-up' ? -1 : 1);
      if (list[from] && list[to]) {
        var tmp = list[from]; list[from] = list[to]; list[to] = tmp;
        saveDocsItems(list).then(function () { renderDocs(); flash('docsSaved'); }).catch(fail);
      }
    }
    if (act === 'doc-del') {
      var all = docsItems();
      var di = parseInt(btn.dataset.i, 10);
      var item = all[di];
      if (item) {
        var note = docSysNote(item.key);
        var msg = note
          ? 'Убрать «' + item.name + '» из раздела «Документы»?\n\nЗагруженный файл останется на месте, и ссылки в других местах (' +
            note + ') продолжат его открывать.'
          : 'Удалить «' + item.name + '»? Карточка и загруженный файл будут отвязаны от сайта.';
        if (confirm(msg)) {
          all.splice(di, 1);
          // у своих документов ключ больше нигде не используется — убираем и ссылку на файл
          var after = note ? saveDocsItems(all)
            : saveDocsItems(all).then(function () { var m = {}; m[item.key] = ''; return saveSettings(m); });
          after.then(function () { renderDocs(); flash('docsSaved'); }).catch(fail);
        }
      }
    }
    if (act === 'gal-del' && confirm('Удалить это фото из галереи?')) {
      var arr = galExtra();
      arr.splice(parseInt(btn.dataset.i, 10), 1);
      saveGalExtra(arr).then(renderImages).catch(fail);
    }
  });
})();
