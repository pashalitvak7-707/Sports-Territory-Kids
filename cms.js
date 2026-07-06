/* ===== Territory Sport Kids — public site CMS loader =====
 * Загружает контент (тексты, цвета, тренеров, расписание, отзывы)
 * из Supabase и подставляет его в страницу. Если Supabase не настроен
 * (cms-config.js пустой) или запрос не удался — сайт показывает
 * контент, зашитый в HTML, без каких-либо изменений.
 */
(function () {
  'use strict';

  // Запасная копия ключей на случай устаревшего кеша cms-config.js
  var FALLBACK_CONFIG = {
    url: 'https://zuntxqtceskpcdwwwrnh.supabase.co',
    anonKey: 'sb_publishable_z1f4A_NisVriQ3hDSlNIUg_w4szVbuN'
  };
  var cfg = window.CMS_CONFIG || {};
  if (!cfg.url || !cfg.anonKey) cfg = FALLBACK_CONFIG;
  var configured = !!(cfg.url && cfg.anonKey);

  /* ---------- Справочники (совпадают с фильтрами на schedule.html) ---------- */
  var DIR_LABELS = {
    gym: 'Гимнастика', acro: 'Акробатика', rhythmic: 'Художественная гимнастика',
    tramp: 'Батут', ofp: 'ОФП'
  };
  var AGE_LABELS = {
    '1.5-3': '1,5–3 года', '3-5': '3–5 лет', '5-7': '5–7 лет',
    '7-10': '7–10 лет', '10-14': '10–14 лет'
  };
  var DAY_LABELS = {
    mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг',
    fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье'
  };
  /* Ключи изображений и куда они подставляются (совпадают с admin.js) */
  var IMAGE_SELECTORS = {
    'image.logo': 'img.logo, img.footer-logo',
    'image.hero': '.hero-media img',
    'image.feat_1': '.features-band .feat:nth-child(1) .feat-icon',
    'image.feat_2': '.features-band .feat:nth-child(2) .feat-icon',
    'image.feat_3': '.features-band .feat:nth-child(3) .feat-icon',
    'image.prog_1': '.prog-track .prog-card:nth-child(1) .pc-photo img',
    'image.prog_2': '.prog-track .prog-card:nth-child(2) .pc-photo img',
    'image.prog_3': '.prog-track .prog-card:nth-child(3) .pc-photo img',
    'image.prog_4': '.prog-track .prog-card:nth-child(4) .pc-photo img',
    'image.prog_5': '.prog-track .prog-card:nth-child(5) .pc-photo img',
    'image.dev_1': '.develop-band .dev-item:nth-child(1) .dev-ic',
    'image.dev_2': '.develop-band .dev-item:nth-child(2) .dev-ic',
    'image.dev_3': '.develop-band .dev-item:nth-child(3) .dev-ic',
    'image.dev_4': '.develop-band .dev-item:nth-child(4) .dev-ic',
    'image.dev_5': '.develop-band .dev-item:nth-child(5) .dev-ic',
    'image.how_1': '.how-step.st1 .how-photo img',
    'image.how_2': '.how-step.st2 .how-photo img',
    'image.how_3': '.how-step.st3 .how-photo img',
    'image.how_4': '.how-step.st4 .how-photo img',
    'image.how_5': '.how-step.st5 .how-photo img',
    'image.space': '.space-photo img',
    'image.gal_1': '.gallery-grid .gal-item:nth-child(1) img',
    'image.gal_2': '.gallery-grid .gal-item:nth-child(2) img',
    'image.gal_3': '.gallery-grid .gal-item:nth-child(3) img',
    'image.gal_4': '.gallery-grid .gal-item:nth-child(4) img',
    'image.gal_5': '.gallery-grid .gal-item:nth-child(5) img',
    'image.gal_6': '.gallery-grid .gal-item:nth-child(6) img',
    'image.gal_7': '.gallery-grid .gal-item:nth-child(7) img',
    'image.gal_8': '.gallery-grid .gal-item:nth-child(8) img',
    'image.plan': 'img.equip-plan',
    'image.sched_cal': '.sched-cal',
    'image.mascot_coaches': '.coaches-mascot .mascot-roo',
    'image.mascot_sched': '.sched-mascot',
    'image.mascot_faq': '.faq-mascot'
  };

  var THEME_VARS = {
    'theme.green': '--green', 'theme.green_d': '--green-d', 'theme.orange': '--orange',
    'theme.coral': '--coral', 'theme.blue': '--blue', 'theme.yellow': '--yellow',
    'theme.ink': '--ink', 'theme.muted': '--muted', 'theme.bg_soft': '--bg-soft',
    'theme.font_body': '--font-body'
  };

  /* ---------- Мини-клиент Supabase REST ---------- */
  function rest(path, method, body) {
    var headers = {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json'
    };
    // Старые (JWT) ключи требуют Authorization; новым sb_publishable_ хватает apikey
    if (cfg.anonKey.indexOf('sb_') !== 0) headers.Authorization = 'Bearer ' + cfg.anonKey;
    if (method === 'POST') headers.Prefer = 'return=minimal';
    return fetch(cfg.url + '/rest/v1/' + path, {
      method: method || 'GET',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error('CMS: ' + path + ' -> ' + r.status);
      return method === 'POST' ? null : r.json();
    });
  }
  function quiet(p) { return p.catch(function (e) { console.warn(e); return null; }); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toHtml(text) { return esc(text).replace(/\n/g, '<br />'); }

  /* ---------- Публичный API (используется script.js) ---------- */
  var api = {
    configured: configured,
    settings: {},
    saveMessage: function (context, formData) {
      if (!configured) return Promise.resolve();
      var payload = {};
      formData.forEach(function (val, key) {
        val = (val || '').toString().trim();
        if (val) payload[key] = val;
      });
      return quiet(rest('messages', 'POST', { context: context, payload: payload }));
    },
    submitReview: function (form) {
      var data = new FormData(form);
      var body = {
        name: (data.get('name') || '').toString().trim(),
        contact: (data.get('contact') || '').toString().trim(),
        text: (data.get('text') || '').toString().trim()
      };
      if (!body.name || !body.text) return;
      rest('reviews', 'POST', body).then(function () {
        form.reset();
        var note = form.parentElement.querySelector('.review-thanks');
        if (!note) {
          note = document.createElement('p');
          note.className = 'review-thanks';
          form.parentElement.appendChild(note);
        }
        note.textContent = 'Спасибо! Отзыв появится на сайте после проверки.';
      }).catch(function (e) {
        console.warn(e);
        alert('Не удалось отправить отзыв. Попробуйте позже.');
      });
    }
  };
  window.TSKCMS = api;

  if (!configured) return;

  /* ---------- Применение настроек ---------- */
  function applySettings(rows) {
    if (!rows) return;
    var s = api.settings;
    rows.forEach(function (r) { if (r.value !== '') s[r.key] = r.value; });

    // Цвета и шрифт → CSS-переменные
    Object.keys(THEME_VARS).forEach(function (key) {
      if (s[key]) document.documentElement.style.setProperty(THEME_VARS[key], s[key]);
    });

    // Тексты
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var val = s[el.getAttribute('data-cms')];
      if (val === undefined) return;
      if (el.getAttribute('data-cms-mode') === 'bold-first') {
        var lines = val.split('\n').map(esc);
        lines[0] = '<span class="h1-bold">' + lines[0] + '</span>';
        el.innerHTML = lines.join('<br />');
      } else {
        el.innerHTML = toHtml(val);
      }
    });

    // Телефон и WhatsApp
    if (s['contact.phone_tel']) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.href = 'tel:' + s['contact.phone_tel'];
      });
    }
    if (s['contact.phone_display']) {
      document.querySelectorAll('.topbar-phone, .footer-phone').forEach(function (a) {
        a.textContent = s['contact.phone_display'];
      });
    }
    if (s['contact.whatsapp']) {
      document.querySelectorAll('a[href*="wa.me/"]').forEach(function (a) {
        a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + s['contact.whatsapp']);
      });
    }

    // Изображения
    Object.keys(IMAGE_SELECTORS).forEach(function (key) {
      if (!s[key]) return;
      document.querySelectorAll(IMAGE_SELECTORS[key]).forEach(function (img) { img.src = s[key]; });
    });

    applyTextSizes();
  }

  /* ---------- Размер текста (настройки tsize.* в процентах) ---------- */
  function applyTextSizes() {
    var reg = window.TSK_TEXT_SIZES || [];
    var s = api.settings;
    var global = parseFloat(s['tsize.global']) || 100;
    // 1) сбрасываем прежние инлайновые размеры, чтобы измерить «родные» —
    //    так настройка остаётся отзывчивой (проценты от текущего адаптивного размера)
    reg.forEach(function (e) {
      document.querySelectorAll(e.sel).forEach(function (el) { el.style.fontSize = ''; });
    });
    // 2) измеряем базовые размеры ДО применения, чтобы вложенные
    //    элементы не масштабировались дважды
    var jobs = [];
    reg.forEach(function (e) {
      var pct = (parseFloat(s['tsize.' + e.key]) || 100) * global / 100;
      if (Math.abs(pct - 100) < 0.5) return;
      document.querySelectorAll(e.sel).forEach(function (el) {
        jobs.push([el, parseFloat(getComputedStyle(el).fontSize) * pct / 100]);
      });
    });
    jobs.forEach(function (j) { j[0].style.fontSize = j[1].toFixed(2) + 'px'; });
  }
  api.applyTextSizes = applyTextSizes;

  var tsResize;
  window.addEventListener('resize', function () {
    clearTimeout(tsResize);
    tsResize = setTimeout(applyTextSizes, 200);
  });

  /* ---------- Тренеры ---------- */
  function renderCoaches(coaches) {
    if (!coaches || !coaches.length) return;
    var stage = document.querySelector('.coaches-stage');
    if (!stage) return;
    var html = coaches.map(function (c) {
      var name = esc(c.name).replace(' ', '<br />');
      return '<article class="coach-card">' +
        '<div class="coach-tags"><span class="tag-pos">' + esc(c.tag_pos || '') + '</span>' +
        '<span class="tag-exp">' + esc(c.tag_exp || '') + '</span></div>' +
        '<div class="coach-photo"><img src="' + esc(c.photo_url || 'assets/img/coach-1.png') + '" alt="' + esc(c.name) + '" /></div>' +
        '<h3>' + name + '</h3>' +
        '<p>' + toHtml(c.bio || '') + '</p>' +
        '</article>';
    }).join('');
    // Клонируем сцену, чтобы сбросить старые обработчики карусели, и инициализируем заново
    var clone = stage.cloneNode(true);
    clone.querySelector('.cstage-track').innerHTML = html;
    // Клон — новый узел, за которым НЕ следит IntersectionObserver из script.js,
    // поэтому reveal-класс никогда не получит «.in» и карточки остались бы
    // скрытыми (opacity:0). Снимаем reveal-гейт, чтобы сцена была видима сразу.
    clone.classList.remove('reveal');
    clone.classList.add('in');
    stage.parentNode.replaceChild(clone, stage);
    if (window.TSK && window.TSK.initCoachStage) window.TSK.initCoachStage(clone);
  }

  /* ---------- Отзывы ---------- */
  function renderReviews(reviews) {
    if (!reviews || !reviews.length) return;
    var grid = document.querySelector('.reviews-grid');
    if (!grid) return;
    grid.innerHTML = reviews.map(function (r) {
      return '<article class="review-card">' +
        '<div class="stars">★★★★★</div>' +
        '<p>' + toHtml(r.text) + '</p>' +
        '<span class="review-author">' + esc(r.name) + '</span>' +
        '</article>';
    }).join('');
  }

  /* ---------- Расписание ---------- */
  function spotsText(n) {
    n = parseInt(n, 10) || 0;
    if (n === 0) return 'Нет мест';
    var d10 = n % 10, d100 = n % 100;
    var word = (d10 === 1 && d100 !== 11) ? 'место'
      : (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) ? 'места' : 'мест';
    return n + ' ' + word;
  }

  function renderSchedule(rows) {
    if (!rows || !rows.length) return;
    var table = document.querySelector('.sched-table');
    if (!table) return;
    var head = table.querySelector('.sch-head');
    var html = rows.map(function (r) {
      var dir = DIR_LABELS[r.dir] || r.dir;
      var age = AGE_LABELS[r.age] || r.age;
      var day = DAY_LABELS[r.day] || r.day;
      var n = parseInt(r.spots, 10) || 0;
      var spotCls = 'sch-v sch-spots' + (n === 0 ? ' sch-none' : (n <= 2 ? ' sch-few' : ''));
      function cell(k, v) {
        return '<div class="sch-cell"><span class="sch-k">' + k + '</span><span class="sch-v">' + v + '</span></div>';
      }
      return '<div class="sch-row" data-age="' + esc(r.age) + '" data-dir="' + esc(r.dir) + '" data-day="' + esc(r.day) + '" data-free="' + n + '">' +
        '<div class="sch-cell sch-dir"><span class="sch-k">Направление</span><span class="sch-v">' + esc(dir) + '</span></div>' +
        cell('Возраст', '<span class="sch-badge">' + esc(age) + '</span>') +
        cell('День', esc(day)) +
        cell('Время', esc(r.time)) +
        cell('Тренер', esc(r.coach || '')) +
        '<div class="sch-cell"><span class="sch-k">Места</span><span class="' + spotCls + '">' + spotsText(n) + '</span></div>' +
        '<div class="sch-cell sch-act"><button type="button" class="sch-book" data-dir="' + esc(dir) + '" data-age="' + esc(age) + '" data-day="' + esc(day) + '" data-time="' + esc(r.time) + '" data-coach="' + esc(r.coach || '') + '">Записаться</button></div>' +
        '</div>';
    }).join('');
    table.innerHTML = '';
    if (head) table.appendChild(head);
    table.insertAdjacentHTML('beforeend', html);
    if (window.TSKSchedule) window.TSKSchedule.refresh();
  }

  /* ---------- Загрузка ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    quiet(rest('settings?select=key,value')).then(applySettings);
    // после каждой перерисовки заново применяем настроенные размеры текста,
    // т.к. рендер заменяет узлы новыми
    if (document.querySelector('.coaches-stage')) {
      quiet(rest('coaches?select=*&order=sort.asc,id.asc')).then(function (rows) { renderCoaches(rows); applyTextSizes(); });
    }
    if (document.querySelector('.reviews-grid')) {
      quiet(rest('reviews?select=name,text&approved=is.true&order=created_at.desc&limit=4')).then(function (rows) { renderReviews(rows); applyTextSizes(); });
    }
    if (document.querySelector('.sched-table')) {
      quiet(rest('schedule?select=*&order=sort.asc,id.asc')).then(function (rows) { renderSchedule(rows); applyTextSizes(); });
    }
  });
})();
