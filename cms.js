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
        note.textContent = api.settings['ui.review_thanks'] || 'Спасибо! Отзыв появится на сайте после проверки.';
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

    // Изображения: каждый <img> несёт свой ключ в data-cms-img
    document.querySelectorAll('[data-cms-img]').forEach(function (img) {
      var val = s[img.getAttribute('data-cms-img')];
      if (val) img.src = val;
    });

    // Подсказки в полях форм
    document.querySelectorAll('[data-cms-ph]').forEach(function (inp) {
      var val = s[inp.getAttribute('data-cms-ph')];
      if (val !== undefined) inp.placeholder = val;
    });

    // Цвет отдельного текста (tcolor.<ключ>)
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var c = s['tcolor.' + el.getAttribute('data-cms')];
      if (c) el.style.color = c;
    });

    applyTextSizes();
    applySectionSpacing();
  }

  /* ---------- Размер текста (настройки tsize.* в процентах) ---------- */
  function applyTextSizes() {
    var reg = window.TSK_TEXT_SIZES || [];
    var s = api.settings;
    // телефон = экраны до 620px; пустая настройка телефона наследует компьютерную
    var mob = window.matchMedia('(max-width: 620px)').matches;
    function pctOf(key) {
      var v = mob ? (parseFloat(s['tsize.' + key + '.mob']) || parseFloat(s['tsize.' + key])) : parseFloat(s['tsize.' + key]);
      return v || 100;
    }
    var global = pctOf('global');
    // 1) сбрасываем прежние инлайновые размеры, чтобы измерить «родные» —
    //    так настройка остаётся отзывчивой (проценты от текущего адаптивного размера)
    reg.forEach(function (e) {
      document.querySelectorAll(e.sel).forEach(function (el) { el.style.fontSize = ''; });
    });
    // 2) измеряем базовые размеры ДО применения, чтобы вложенные
    //    элементы не масштабировались дважды
    var jobs = [];
    reg.forEach(function (e) {
      var pct = pctOf(e.key) * global / 100;
      if (Math.abs(pct - 100) < 0.5) return;
      document.querySelectorAll(e.sel).forEach(function (el) {
        jobs.push([el, parseFloat(getComputedStyle(el).fontSize) * pct / 100]);
      });
    });
    jobs.forEach(function (j) { j[0].style.fontSize = j[1].toFixed(2) + 'px'; });
  }
  api.applyTextSizes = applyTextSizes;

  /* ---------- Отступы между блоками (sspace.* в процентах) ---------- */
  function applySectionSpacing() {
    var reg = window.TSK_SECTION_SPACING || [];
    var s = api.settings;
    var mob = window.matchMedia('(max-width: 620px)').matches;
    function num(x) { var v = parseFloat(x); return isNaN(v) ? null : v; }
    function pctOf(key) {
      // 0% — допустимое значение (блоки вплотную), поэтому нельзя использовать «|| 100»
      var v = mob ? (num(s['sspace.' + key + '.mob']) !== null ? num(s['sspace.' + key + '.mob']) : num(s['sspace.' + key]))
                  : num(s['sspace.' + key]);
      return v === null ? 100 : v;
    }
    reg.forEach(function (e) {
      document.querySelectorAll(e.sel).forEach(function (el) { el.style.paddingTop = ''; el.style.paddingBottom = ''; });
    });
    var g = pctOf('global');
    var jobs = [];
    reg.forEach(function (e) {
      var pct = pctOf(e.key) * g / 100;
      if (Math.abs(pct - 100) < 0.5) return;
      document.querySelectorAll(e.sel).forEach(function (el) {
        var cs = getComputedStyle(el);
        jobs.push([el, parseFloat(cs.paddingTop) * pct / 100, parseFloat(cs.paddingBottom) * pct / 100]);
      });
    });
    jobs.forEach(function (j) {
      j[0].style.paddingTop = j[1].toFixed(1) + 'px';
      j[0].style.paddingBottom = j[2].toFixed(1) + 'px';
    });
  }
  api.applySectionSpacing = applySectionSpacing;

  var tsResize;
  window.addEventListener('resize', function () {
    clearTimeout(tsResize);
    tsResize = setTimeout(function () { applyTextSizes(); applySectionSpacing(); }, 200);
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
    if (n === 0) return api.settings['ui.no_spots'] || 'Нет мест';
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
    // подписи колонок и значения фильтров берём из DOM — так работают правки текстов из админки
    var hc = head ? head.children : [];
    function colLabel(i, def) { return hc[i] ? hc[i].textContent.trim() || def : def; }
    function optLabel(selId, value, def) {
      var o = document.querySelector('#' + selId + ' option[value="' + value + '"]');
      return o ? o.textContent.trim() : def;
    }
    var bookText = api.settings['ui.book_btn'] || 'Записаться';
    var html = rows.map(function (r) {
      var dir = optLabel('fDir', r.dir, DIR_LABELS[r.dir] || r.dir);
      var age = optLabel('fAge', r.age, AGE_LABELS[r.age] || r.age);
      var day = optLabel('fDay', r.day, DAY_LABELS[r.day] || r.day);
      var n = parseInt(r.spots, 10) || 0;
      var spotCls = 'sch-v sch-spots' + (n === 0 ? ' sch-none' : (n <= 2 ? ' sch-few' : ''));
      function cell(k, v) {
        return '<div class="sch-cell"><span class="sch-k">' + k + '</span><span class="sch-v">' + v + '</span></div>';
      }
      return '<div class="sch-row" data-age="' + esc(r.age) + '" data-dir="' + esc(r.dir) + '" data-day="' + esc(r.day) + '" data-free="' + n + '">' +
        '<div class="sch-cell sch-dir"><span class="sch-k">' + esc(colLabel(0, 'Направление')) + '</span><span class="sch-v">' + esc(dir) + '</span></div>' +
        cell(esc(colLabel(1, 'Возраст')), '<span class="sch-badge">' + esc(age) + '</span>') +
        cell(esc(colLabel(2, 'День')), esc(day)) +
        cell(esc(colLabel(3, 'Время')), esc(r.time)) +
        cell(esc(colLabel(4, 'Тренер')), esc(r.coach || '')) +
        '<div class="sch-cell"><span class="sch-k">' + esc(colLabel(5, 'Места')) + '</span><span class="' + spotCls + '">' + spotsText(n) + '</span></div>' +
        '<div class="sch-cell sch-act"><button type="button" class="sch-book" data-dir="' + esc(dir) + '" data-age="' + esc(age) + '" data-day="' + esc(day) + '" data-time="' + esc(r.time) + '" data-coach="' + esc(r.coach || '') + '">' + esc(bookText) + '</button></div>' +
        '</div>';
    }).join('');
    table.innerHTML = '';
    if (head) table.appendChild(head);
    table.insertAdjacentHTML('beforeend', html);
    if (window.TSKSchedule) window.TSKSchedule.refresh();
  }

  /* ---------- Загрузка ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    // Сначала настройки (тексты/цвета/подписи), затем зависящие от них блоки.
    // После каждой перерисовки заново применяем размеры текста — рендер заменяет узлы.
    quiet(rest('settings?select=key,value')).then(applySettings).then(function () {
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
  });
})();
