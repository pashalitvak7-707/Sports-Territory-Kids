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

  var TEXT_FIELDS = [
    { g: 'Первый экран', key: 'hero.title', label: 'Заголовок (первая строка — жирная)', def: 'Гимнастика,\nчтобы влюбиться\nв движение' },
    { g: 'Первый экран', key: 'hero.sub', label: 'Подзаголовок', def: 'Развитие координации, гибкости и\nуверенности в безопасной среде' },
    { g: 'Программы', key: 'programs.title', label: 'Заголовок раздела', def: 'Чем будем заниматься?' },
    { g: 'Программы', key: 'programs.lead', label: 'Описание раздела', def: 'Наши программы отличаются по возрасту, уровню\nсамостоятельности и нагрузке — от мягкой адаптации до уверенных\nгимнастических элементов.' },
    { g: 'Разделы', key: 'develop.title', label: '«Что будем развивать»', def: 'Что будем развивать' },
    { g: 'Разделы', key: 'how.title', label: '«Как проходит первое занятие»', def: 'Как проходит первое занятие' },
    { g: 'Разделы', key: 'gallery.title', label: 'Галерея', def: 'Познакомьтесь с залом!' },
    { g: 'Разделы', key: 'equip.title', label: 'Оборудование', def: 'Что есть у нас в зале?' },
    { g: 'Разделы', key: 'faq.title', label: 'Частые вопросы', def: 'Частые вопросы' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i1.title', label: 'Объект 1 — название', def: '1. Шведская стенка' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i1.text', label: 'Объект 1 — описание', def: 'Развивает силу, координацию и уверенность в движении.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i2.title', label: 'Объект 2 — название', def: '2. Перекладина' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i2.text', label: 'Объект 2 — описание', def: 'Укрепляет руки и спину, формирует правильный хват и осанку.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i3.title', label: 'Объект 3 — название', def: '3. Брусья' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i3.text', label: 'Объект 3 — описание', def: 'Помогают освоить опорные элементы и уверенно держать вес тела.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i4.title', label: 'Объект 4 — название', def: '4. Батутная зона' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i4.text', label: 'Объект 4 — описание', def: 'Учит группироваться, чувствовать тело в воздухе и приземляться мягко.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i5.title', label: 'Объект 5 — название', def: '5. Акробатическая дорожка' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i5.text', label: 'Объект 5 — описание', def: 'Безопасная поверхность для кувырков, перекатов и первых акробатических элементов.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i6.title', label: 'Объект 6 — название', def: '6. Кольца' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i6.text', label: 'Объект 6 — описание', def: 'Развивают силу рук, баланс и контроль над телом в висе.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i7.title', label: 'Объект 7 — название', def: '7. Полоса препятствий' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i7.text', label: 'Объект 7 — описание', def: 'Игровой формат для развития ловкости, координации и выносливости.' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i8.title', label: 'Объект 8 — название', def: '8. Бревно и малое бревно' },
    { g: 'Раздел «Что есть у нас в зале?»', key: 'equip.i8.text', label: 'Объект 8 — описание', def: 'Развивают равновесие, координацию и уверенность в каждом шаге.' },
    { g: 'Запись (оранжевый блок)', key: 'signup.title', label: 'Заголовок', def: 'Запишитесь на пробное занятие' },
    { g: 'Запись (оранжевый блок)', key: 'signup.sub', label: 'Текст', def: 'Оставьте заявку — мы подберём удобное\nвремя и ответим на ваши вопросы' },
    { g: 'Тренеры', key: 'coaches.title', label: 'Заголовок', def: 'Наши тренеры' },
    { g: 'Тренеры', key: 'coaches.lead', label: 'Описание', def: 'Для нас важно не только образование и опыт. Тренер должен видеть ребёнка, слышать его и уметь поддержать в нужный момент.' },
    { g: 'Блок «Расписание» на главной', key: 'home_sched.eyebrow', label: 'Надпись сверху', def: 'всегда актуально' },
    { g: 'Блок «Расписание» на главной', key: 'home_sched.title', label: 'Заголовок', def: 'Расписание\nзанятий' },
    { g: 'Блок «Расписание» на главной', key: 'home_sched.text', label: 'Текст', def: 'Актуальные группы, время занятий и\nсвободные места собраны в расписании.\nОткройте таблицу и выберите удобный\nвариант — мы поможем с записью.' },
    { g: 'Отзывы', key: 'reviews.title', label: 'Заголовок', def: 'Отзывы\nродителей' },
    { g: 'Отзывы', key: 'reviews.form_title', label: 'Заголовок формы', def: 'Оставить\nотзыв' },
    { g: 'Страница расписания', key: 'sched.eyebrow', label: 'Надпись сверху', def: '● Всегда актуально' },
    { g: 'Страница расписания', key: 'sched.title', label: 'Заголовок', def: 'Расписание занятий' },
    { g: 'Страница расписания', key: 'sched.sub', label: 'Подзаголовок', def: 'Выберите направление, возраст и удобное время — и запишитесь на занятие за пару минут.\nМы свяжемся с вами в WhatsApp и подтвердим место в группе.' },
    { g: 'Страница расписания', key: 'book.title', label: 'Заголовок формы записи', def: 'Запись на занятие' },
    { g: 'Страница расписания', key: 'book.sub', label: 'Текст формы записи', def: 'Выберите занятие в расписании или заполните заявку — мы свяжемся с вами в WhatsApp и подтвердим место в группе.' },
    { g: 'Подвал', key: 'footer.copyright', label: 'Копирайт', def: '©2026 Все права защищены' }
  ];

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
  var loaders = { messages: loadMessages, reviews: loadReviews, schedule: loadSchedule, coaches: loadCoaches, texts: renderTexts, design: renderDesign, contacts: renderContacts };
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
    var groups = {};
    TEXT_FIELDS.forEach(function (f) { (groups[f.g] = groups[f.g] || []).push(f); });
    $('textsForm').innerHTML = Object.keys(groups).map(function (g, gi) {
      return '<details class="adm-textgroup"' + (gi === 0 ? ' open' : '') + '><summary>' + esc(g) + '</summary><div class="adm-card">' +
        groups[g].map(function (f) {
          var rows = f.def.split('\n').length;
          return '<label>' + esc(f.label) +
            '<textarea data-key="' + f.key + '" rows="' + Math.min(rows + 1, 5) + '" placeholder="' + esc(f.def) + '">' + esc(settings[f.key] || '') + '</textarea></label>';
        }).join('') + '</div></details>';
    }).join('');
  }
  $('textsSaveBtn').addEventListener('click', function () {
    var map = {};
    document.querySelectorAll('#textsForm textarea[data-key]').forEach(function (t) { map[t.dataset.key] = t.value; });
    saveSettings(map).then(function () { flash('textsSaved'); }).catch(fail);
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
    $('imgLogoState').textContent = settings['image.logo'] ? 'загружен свой логотип' : 'используется стандартный';
    $('imgHeroState').textContent = settings['image.hero'] ? 'загружено своё фото' : 'используется стандартное';
    renderTextSizes();
  }

  /* Размер текста: поле на каждый текстовый блок сайта (реестр в textsizes.js) */
  function sizeInput(key, label) {
    return '<label>' + esc(label) +
      '<input type="number" min="50" max="250" step="5" data-key="' + key + '" placeholder="100" value="' + esc(settings[key] || '') + '" /></label>';
  }
  function renderTextSizes() {
    var box = $('sizesForm');
    if (!box) return;
    var groups = {};
    (window.TSK_TEXT_SIZES || []).forEach(function (f) { (groups[f.g] = groups[f.g] || []).push(f); });
    box.innerHTML =
      '<div class="adm-grid">' + sizeInput('tsize.global', 'Весь сайт сразу (%)') + '</div>' +
      Object.keys(groups).map(function (g) {
        return '<details class="adm-textgroup"><summary>' + esc(g) + '</summary><div class="adm-card"><div class="adm-grid">' +
          groups[g].map(function (f) { return sizeInput('tsize.' + f.key, f.label + ' (%)'); }).join('') +
          '</div></div></details>';
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
    document.querySelectorAll('#sizesForm input[data-key]').forEach(function (inp) {
      var v = inp.value.trim();
      // 100% = стандартный размер, хранить не нужно
      map[inp.dataset.key] = (v === '' || v === '100') ? '' : v;
    });
    var logoFile = $('imgLogo').files[0];
    var heroFile = $('imgHero').files[0];
    Promise.all([
      logoFile ? uploadImage(logoFile, 'site') : null,
      heroFile ? uploadImage(heroFile, 'site') : null
    ]).then(function (urls) {
      if (urls[0]) map['image.logo'] = urls[0];
      if (urls[1]) map['image.hero'] = urls[1];
      return saveSettings(map);
    }).then(function () {
      $('imgLogo').value = ''; $('imgHero').value = '';
      renderDesign();
      flash('designSaved');
    }).catch(fail).then(function () { btn.disabled = false; });
  });
  $('designResetBtn').addEventListener('click', function () {
    if (!confirm('Вернуть фирменные цвета, шрифт, размеры текста и стандартные изображения?')) return;
    var map = {};
    COLOR_FIELDS.forEach(function (f) { map[f.key] = ''; });
    map['theme.font_body'] = '';
    map['image.logo'] = '';
    map['image.hero'] = '';
    map['tsize.global'] = '';
    (window.TSK_TEXT_SIZES || []).forEach(function (f) { map['tsize.' + f.key] = ''; });
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
  });
})();
