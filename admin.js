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
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  /* ---------- Справочники ---------- */
  var DIRS = { gym: 'Гимнастика', acro: 'Акробатика', rhythmic: 'Художественная гимнастика', tramp: 'Батут', ofp: 'ОФП' };
  var AGES = { '1.5-3': '1,5–3 года', '3-5': '3–5 лет', '5-7': '5–7 лет', '7-10': '7–10 лет', '10-14': '10–14 лет' };
  var DAYS = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье' };
  var DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var FIELD_LABELS = { name: 'Имя', phone: 'Телефон', contact: 'Контакты', text: 'Сообщение',
    parent: 'Имя родителя', child: 'Имя ребёнка', childage: 'Возраст ребёнка', lesson: 'Занятие' };

  /* ---------- Сканер страниц сайта: находит все редактируемые тексты и картинки ---------- */
  var PAGES = [
    { url: 'index.html', label: 'Главная' },
    { url: 'schedule.html', label: 'Расписание' }
  ];
  var SECTION_LABELS = {
    header: 'Шапка сайта', hero: 'Первый экран', features: 'Преимущества', programs: 'Программы',
    develop: 'Что будем развивать', how: 'Первое занятие', signup: 'Блок «Запишитесь»',
    method: 'Наша методика', space: 'Пространство для движения', coaches: 'Тренеры',
    gallery: 'Галерея', equip: 'Что есть у нас в зале', schedule: 'Блок «Расписание»',
    reviews: 'Отзывы', faq: 'FAQ', footer: 'Подвал',
    'sched-hero': 'Заголовок страницы', 'sched-page': 'Таблица и запись'
  };
  var EXTRA_TEXTS = [
    { key: 'ui.book_btn', label: 'Кнопка «Записаться» в таблице расписания', def: 'Записаться' },
    { key: 'ui.no_spots', label: 'Надпись «Нет мест» в расписании', def: 'Нет мест' },
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

  /* ---------- Авторизация ---------- */
  function showLogin() { $('viewLogin').hidden = false; $('viewPanel').hidden = true; }
  function showPanel() {
    $('viewLogin').hidden = true; $('viewPanel').hidden = false;
    sb.from('settings').select('key,value').then(function (r) {
      (r.data || []).forEach(function (row) { settings[row.key] = row.value; });
      openTab('messages');
    });
  }

  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('loginBtn').disabled = true;
    $('loginError').hidden = true;
    sb.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPass').value })
      .then(function (r) {
        $('loginBtn').disabled = false;
        if (r.error) {
          $('loginError').textContent = 'Не удалось войти: проверьте email и пароль.';
          $('loginError').hidden = false;
          return;
        }
        showPanel();
      });
  });
  $('logoutBtn').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });
  sb.auth.getSession().then(function (r) {
    if (r.data && r.data.session) showPanel(); else showLogin();
  });

  /* ---------- Вкладки ---------- */
  var loaders = { messages: loadMessages, reviews: loadReviews, schedule: loadSchedule, coaches: loadCoaches, texts: renderTexts, images: renderImages, design: renderDesign, contacts: renderContacts };
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
        return '<div class="adm-item' + (x.approved ? '' : ' unread') + '">' +
          '<div class="adm-item-body">' +
          '<p class="adm-item-meta">' + fmtDate(x.created_at) + (x.contact ? ' · ' + esc(x.contact) : '') + '</p>' +
          '<p class="adm-item-title">' + esc(x.name) + '</p>' +
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
      time: $('schTime').value.trim(), coach: $('schCoach').value.trim(),
      spots: parseInt($('schSpots').value, 10) || 0
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
          '<p class="adm-item-meta">' + esc(AGES[s.age] || s.age) + (s.coach ? ' · ' + esc(s.coach) : '') + ' · мест: ' + s.spots + '</p>' +
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

  /* ---------- Контакты ---------- */
  function renderContacts() {
    $('cPhoneDisplay').value = settings['contact.phone_display'] || '';
    $('cPhoneTel').value = settings['contact.phone_tel'] || '';
    $('cWhatsapp').value = settings['contact.whatsapp'] || '';
  }
  $('contactsSaveBtn').addEventListener('click', function () {
    saveSettings({
      'contact.phone_display': $('cPhoneDisplay').value,
      'contact.phone_tel': $('cPhoneTel').value,
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
      $('schTime').value = s.time; $('schCoach').value = s.coach; $('schSpots').value = s.spots;
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
    if (act === 'gal-del' && confirm('Удалить это фото из галереи?')) {
      var arr = galExtra();
      arr.splice(parseInt(btn.dataset.i, 10), 1);
      saveGalExtra(arr).then(renderImages).catch(fail);
    }
  });
})();
