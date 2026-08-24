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
    '1.5-3': '1,5–3 года', '3-4': '3–4 года', '4-5': '4–5 лет',
    '5-7': '5–7 лет', '7-9': '7–9 лет', '9+': '9+ лет'
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

  /* Иконки карточек в разделе «Документы» (лист и стрелка «открыть») */
  var DOC_ICON = '<svg aria-hidden="true" class="docs-ic" fill="none" stroke="currentColor" stroke-linecap="round" ' +
    'stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z">' +
    '</path><path d="M14 3v5h5"></path></svg>';
  var DOC_ARROW = '<svg aria-hidden="true" class="docs-go" fill="none" stroke="currentColor" stroke-linecap="round" ' +
    'stroke-linejoin="round" stroke-width="2.2" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"></path></svg>';

  /* ---------- Публичный API (используется script.js) ---------- */
  var api = {
    configured: configured,
    settings: {},
    // Promise<boolean>: true — заявка действительно записана в базу сайта
    // (по этому подтверждению срабатывает цель «Заявка КИДС» в Метрике)
    saveMessage: function (context, formData) {
      if (!configured) return Promise.resolve(false);
      var payload = {};
      formData.forEach(function (val, key) {
        val = (val || '').toString().trim();
        if (val) payload[key] = val;
      });
      return rest('messages', 'POST', { context: context, payload: payload })
        .then(function () { return true; }, function (e) { console.warn(e); return false; });
    },
    submitReview: function (form) {
      var data = new FormData(form);
      var rating = parseInt(data.get('rating'), 10);
      var body = {
        name: (data.get('name') || '').toString().trim(),
        contact: (data.get('contact') || '').toString().trim(),
        text: (data.get('text') || '').toString().trim(),
        rating: (rating >= 1 && rating <= 5) ? rating : 5
      };
      if (!body.name || !body.text) return;
      rest('reviews', 'POST', body).catch(function () {
        // если колонки rating в базе ещё нет — отправляем отзыв без неё
        var noRating = { name: body.name, contact: body.contact, text: body.text };
        return rest('reviews', 'POST', noRating);
      }).then(function () {
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
      document.querySelectorAll('a[href^="tel:"]:not([data-keep-tel])').forEach(function (a) {
        a.href = 'tel:' + s['contact.phone_tel'];
      });
    }
    if (s['contact.phone_display']) {
      document.querySelectorAll('.topbar-phone, .footer-phone').forEach(function (a) {
        a.textContent = s['contact.phone_display'];
      });
    }
    if (s['contact.address']) {
      document.querySelectorAll('.footer-address .fa-tx').forEach(function (el) {
        el.textContent = s['contact.address'];
      });
    }

    // Реквизиты владельца сайта в подвале (вкладка «Контакты» в админке)
    var LEGAL = {
      'contact.legal_name': '.fl-name',
      'contact.inn': '.fl-inn',
      'contact.ogrn': '.fl-ogrn',
      'contact.legal_address': '.fl-addr'
    };
    Object.keys(LEGAL).forEach(function (key) {
      if (!s[key]) return;
      document.querySelectorAll(LEGAL[key]).forEach(function (el) { el.textContent = s[key]; });
    });
    if (s['contact.email']) {
      document.querySelectorAll('.fl-email').forEach(function (a) {
        a.textContent = s['contact.email'];
        a.href = 'mailto:' + s['contact.email'];
      });
    }
    if (s['contact.whatsapp']) {
      document.querySelectorAll('a[href*="wa.me/"]:not([data-keep-link])').forEach(function (a) {
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

    // Дополнительные фото галереи (gallery.extra — JSON-массив ссылок)
    var galGrid = document.querySelector('.gallery-grid');
    if (galGrid && s['gallery.extra']) {
      try {
        var extra = JSON.parse(s['gallery.extra']);
        galGrid.querySelectorAll('.gal-extra').forEach(function (n) { n.remove(); });
        (Array.isArray(extra) ? extra : []).forEach(function (url) {
          if (!url) return;
          var d = document.createElement('div');
          d.className = 'gal-item gal-extra';
          var img = document.createElement('img');
          img.loading = 'lazy';
          img.alt = 'Фото зала';
          img.src = url;
          d.appendChild(img);
          galGrid.appendChild(d);
        });
        // лента галереи пересчитывает стрелки по событию resize
        window.dispatchEvent(new Event('resize'));
      } catch (e) { console.warn('gallery.extra:', e); }
    }

    // Документы (политики, согласия, оферта): если файл загружен в админке —
    // ссылка открывает его в новой вкладке
    document.querySelectorAll('[data-doc]').forEach(function (a) {
      var url = s[a.getAttribute('data-doc')];
      // Согласие для формы отзыва: пока свой файл не загружен, используем
      // общее согласие, чтобы ссылка под формой не осталась пустой
      if (!url && a.getAttribute('data-doc') === 'doc.consent_review') url = s['doc.consent'];
      if (url) {
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
      }
    });

    // Раздел «Документы»: карточки и их порядок задаются в админке
    // (настройка docs.items), значения по умолчанию — в textsizes.js.
    // Документ без загруженного файла не показываем, чтобы на странице
    // не было ссылок, которые никуда не ведут.
    var docsBox = document.getElementById('docsList');
    if (docsBox) {
      var items = [];
      try {
        var parsed = JSON.parse(s['docs.items'] || 'null');
        if (Array.isArray(parsed)) items = parsed.filter(function (x) { return x && x.key; });
      } catch (e) { console.warn('docs.items:', e); }
      if (!items.length) items = window.TSK_DOCS_DEFAULT || [];

      var html = items.map(function (it) {
        var url = s[it.key];
        // пока своё согласие для отзыва не загружено — открываем общее
        if (!url && it.key === 'doc.consent_review') url = s['doc.consent'];
        if (!url) return '';
        return '<li class="docs-item"><a class="docs-link" href="' + esc(url) + '" rel="noopener" target="_blank">' +
          DOC_ICON + '<span class="docs-name">' + esc(it.name || '') + '</span>' + DOC_ARROW + '</a></li>';
      }).join('');

      docsBox.innerHTML = html;
      var empty = document.getElementById('docsEmpty');
      if (empty) empty.hidden = !!html;
    }

    // Цвет отдельного текста (tcolor.<ключ>)
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var c = s['tcolor.' + el.getAttribute('data-cms')];
      if (c) el.style.color = c;
    });

    applyTextSizes();
    applySectionSpacing();
    applyGapSpacing();
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
    // 0% — допустимое значение (блоки вплотную), поэтому нельзя использовать «|| 100»
    function pick(k) {
      return mob ? (num(s[k + '.mob']) !== null ? num(s[k + '.mob']) : num(s[k])) : num(s[k]);
    }
    // отступ сверху/снизу настраиваются отдельно; старый общий ключ — запасной вариант
    function sidePct(key, side) {
      var v = pick('sspace.' + key + '.' + side);
      if (v === null) v = pick('sspace.' + key);
      return v === null ? 100 : v;
    }
    reg.forEach(function (e) {
      document.querySelectorAll(e.sel).forEach(function (el) { el.style.paddingTop = ''; el.style.paddingBottom = ''; });
    });
    var g = pick('sspace.global');
    if (g === null) g = 100;
    var jobs = [];
    reg.forEach(function (e) {
      var top = sidePct(e.key, 'top') * g / 100;
      var bot = sidePct(e.key, 'bot') * g / 100;
      if (Math.abs(top - 100) < 0.5 && Math.abs(bot - 100) < 0.5) return;
      document.querySelectorAll(e.sel).forEach(function (el) {
        var cs = getComputedStyle(el);
        jobs.push([el, parseFloat(cs.paddingTop) * top / 100, parseFloat(cs.paddingBottom) * bot / 100]);
      });
    });
    jobs.forEach(function (j) {
      j[0].style.paddingTop = j[1].toFixed(1) + 'px';
      j[0].style.paddingBottom = j[2].toFixed(1) + 'px';
    });
  }
  api.applySectionSpacing = applySectionSpacing;

  /* ---------- Отдельные промежутки в футере (sspace.footer_* в процентах) ---------- */
  function applyGapSpacing() {
    var reg = window.TSK_GAP_SPACING || [];
    var s = api.settings;
    var mob = window.matchMedia('(max-width: 620px)').matches;
    function num(x) { var v = parseFloat(x); return isNaN(v) ? null : v; }
    function pick(k) {
      return mob ? (num(s[k + '.mob']) !== null ? num(s[k + '.mob']) : num(s[k])) : num(s[k]);
    }
    // сначала снимаем прошлые значения, чтобы прочитать обычный отступ из CSS
    reg.forEach(function (e) {
      document.querySelectorAll(e.sel).forEach(function (el) { el.style[e.prop] = ''; });
    });
    var g = pick('sspace.global');
    if (g === null) g = 100;
    var jobs = [];
    reg.forEach(function (e) {
      var p = pick('sspace.' + e.key);
      if (p === null) p = 100;
      p = p * g / 100;
      if (Math.abs(p - 100) < 0.5) return;              // 100% — оставляем как в CSS
      document.querySelectorAll(e.sel).forEach(function (el) {
        jobs.push([el, e.prop, parseFloat(getComputedStyle(el)[e.prop]) * p / 100]);
      });
    });
    jobs.forEach(function (j) { j[0].style[j[1]] = j[2].toFixed(1) + 'px'; });
  }
  api.applyGapSpacing = applyGapSpacing;

  var tsResize;
  window.addEventListener('resize', function () {
    clearTimeout(tsResize);
    tsResize = setTimeout(function () { applyTextSizes(); applySectionSpacing(); applyGapSpacing(); }, 200);
  });

  /* ---------- Тренеры ---------- */
  /* Отметка рядом с фотографией тренера — формулировка согласована юристами.
     Такая же строка продублирована в запасных карточках в index.html. */
  var PD_NOTE = '*Субъектом персональных данных разрешена обработка персональных ' +
    'данных неограниченным кругом лиц, запретов не установлено.';

  /* Пока тренеры не пришли из базы, запасные карточки в HTML скрыты —
     иначе при каждой загрузке на секунду видны прежние тренеры. */
  function revealCoaches() {
    var s = document.querySelector('.coaches-stage');
    if (s) s.classList.remove('cms-pending');
  }
  api.revealCoaches = revealCoaches;

  function renderCoaches(coaches) {
    if (!coaches || !coaches.length) return;
    var stage = document.querySelector('.coaches-stage');
    if (!stage) return;
    var html = coaches.map(function (c) {
      var name = esc(c.name).replace(' ', '<br />');
      return '<article class="coach-card">' +
        '<div class="coach-tags"><span class="tag-pos">' + esc(c.tag_pos || '') + '</span>' +
        '<span class="tag-exp">' + esc(c.tag_exp || '') + '</span></div>' +
        // отметка о согласии субъекта ПД лежит поверх фото и видна при наведении
        '<div class="coach-photo"><img src="' + esc(c.photo_url || 'assets/img/coach-1.png') + '" alt="' + esc(c.name) + '" />' +
        '<p class="coach-pd">' + PD_NOTE + '</p></div>' +
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
    clone.classList.remove('cms-pending');   // данные пришли — показываем
    stage.parentNode.replaceChild(clone, stage);
    if (window.TSK && window.TSK.initCoachStage) window.TSK.initCoachStage(clone);
  }

  /* ---------- Отзывы ---------- */
  function renderReviews(reviews) {
    if (!reviews || !reviews.length) return;
    var grid = document.querySelector('.reviews-grid');
    if (!grid) return;
    grid.innerHTML = reviews.map(function (r) {
      var n = parseInt(r.rating, 10);
      if (!(n >= 1 && n <= 5)) n = 5;
      return '<article class="review-card">' +
        '<div class="stars">' + '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n) + '</div>' +
        '<p>' + toHtml(r.text) + '</p>' +
        '<span class="review-author">' + esc(r.name) + '</span>' +
        '</article>';
    }).join('');
  }

  /* ---------- Расписание ---------- */
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
      function cell(k, v) {
        return '<div class="sch-cell"><span class="sch-k">' + k + '</span><span class="sch-v">' + v + '</span></div>';
      }
      return '<div class="sch-row" data-age="' + esc(r.age) + '" data-dir="' + esc(r.dir) + '" data-day="' + esc(r.day) + '">' +
        cell(esc(colLabel(0, 'Возраст')), '<span class="sch-badge">' + esc(age) + '</span>') +
        cell(esc(colLabel(1, 'День')), esc(day)) +
        cell(esc(colLabel(2, 'Время')), esc(r.time)) +
        cell(esc(colLabel(3, 'Тренер')), esc(r.coach || '')) +
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
    // Прячем запасных тренеров из HTML до ответа базы, чтобы прежние карточки
    // не мелькали при загрузке. Страховка: если база молчит — всё равно покажем.
    var stage0 = document.querySelector('.coaches-stage');
    if (stage0) {
      stage0.classList.add('cms-pending');
      setTimeout(revealCoaches, 4000);
    }
    // Сначала настройки (тексты/цвета/подписи), затем зависящие от них блоки.
    // После каждой перерисовки заново применяем размеры текста — рендер заменяет узлы.
    quiet(rest('settings?select=key,value')).then(applySettings).then(function () {
      if (document.querySelector('.coaches-stage')) {
        quiet(rest('coaches?select=*&order=sort.asc,id.asc')).then(function (rows) {
          renderCoaches(rows); revealCoaches(); applyTextSizes();
        });
      }
      if (document.querySelector('.reviews-grid')) {
        quiet(rest('reviews?select=*&approved=is.true&order=created_at.desc')).then(function (rows) { renderReviews(rows); applyTextSizes(); });
      }
      if (document.querySelector('.sched-table')) {
        quiet(rest('schedule?select=*&order=sort.asc,id.asc')).then(function (rows) { renderSchedule(rows); applyTextSizes(); });
      }
    });
  });
})();
