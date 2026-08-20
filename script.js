/* ===== Territory Sport Kids — interactions ===== */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '77054290000'; // +7 705 429 0000

  /* ---------- 1. Scroll reveal (fade in from bottom) ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      window.__revealReady = true;
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.02, rootMargin: '0px 0px -4% 0px' });
    els.forEach(function (el) { io.observe(el); });
    window.__revealReady = true;
  }

  /* ---------- 2. Carousels with working arrows ---------- */
  function initCarousel(root) {
    var track = root.querySelector('.car-track');
    var slides = Array.prototype.slice.call(track.children);
    var prev = root.querySelector('.car-prev');
    var next = root.querySelector('.car-next');
    var dotsWrap = root.querySelector('.car-dots');
    var index = 0;

    function perView() {
      // derive from actual rendered widths (respects CSS breakpoints)
      var vw = root.querySelector('.car-viewport').clientWidth;
      var first = slides[0];
      var style = getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      var sw = first.getBoundingClientRect().width + gap;
      // count fully-visible cards (floor, with a small tolerance for sub-pixel rounding)
      return Math.max(1, Math.floor((vw + 2) / sw));
    }

    function maxIndex() { return Math.max(0, slides.length - perView()); }

    function step() {
      var first = slides[0];
      var style = getComputedStyle(track);
      var gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      var pages = maxIndex() + 1;
      for (var i = 0; i < pages; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Слайд ' + (i + 1));
        (function (i) { b.addEventListener('click', function () { go(i); }); })(i);
        dotsWrap.appendChild(b);
      }
    }

    function update() {
      track.style.transform = 'translateX(' + (-index * step()) + 'px)';
      if (prev) prev.disabled = index <= 0;
      if (next) next.disabled = index >= maxIndex();
      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
          d.classList.toggle('active', i === index);
        });
      }
    }

    function go(i) {
      index = Math.min(Math.max(i, 0), maxIndex());
      update();
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });

    // Touch / swipe support
    var startX = 0, dragging = false;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; dragging = true; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!dragging) return; dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { buildDots(); go(index); }, 150);
    });

    buildDots();
    update();
  }

  /* ---------- 2b. Coaches stage (centered active card) ---------- */
  function initCoachStage(root) {
    var viewport = root.querySelector('.cstage-viewport');
    var track = root.querySelector('.cstage-track');
    var cards = Array.prototype.slice.call(track.children);
    var prev = root.querySelector('.cstage-prev');
    var next = root.querySelector('.cstage-next');
    var index = Math.min(1, cards.length - 1);

    function layout() {
      var vp = viewport.clientWidth;
      var cw = cards[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
      var offset = (vp - cw) / 2 - index * (cw + gap);
      track.style.transform = 'translateX(' + offset + 'px)';
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === index); });
      if (prev) prev.disabled = index <= 0;
      if (next) next.disabled = index >= cards.length - 1;
    }
    function go(i) { index = Math.min(Math.max(i, 0), cards.length - 1); layout(); }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    cards.forEach(function (c, i) { c.addEventListener('click', function () { if (i !== index) go(i); }); });

    /* expose "advance to next coach (wrapping)" so the «СМОТРЕТЬ ВСЕХ» button
       can drive whichever stage is live (the CMS may swap this element out). */
    root.__coachNext = function () { go(index >= cards.length - 1 ? 0 : index + 1); };

    var startX = 0, dragging = false;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; dragging = true; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!dragging) return; dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    });

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
    window.addEventListener('load', layout);
    layout();
  }

  /* ---------- 3. Accordions (FAQ + equipment) ---------- */
  function initAccordions() {
    document.querySelectorAll('.acc-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var item = head.parentElement;
        var body = item.querySelector('.acc-body');
        var open = item.classList.contains('open');
        // close siblings in same list
        var list = item.parentElement;
        list.querySelectorAll('.acc.open').forEach(function (o) {
          o.classList.remove('open');
          o.querySelector('.acc-body').style.maxHeight = null;
        });
        if (!open) {
          item.classList.add('open');
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    });
    // expand any item marked open by default
    document.querySelectorAll('.acc.open .acc-body').forEach(function (body) {
      body.style.maxHeight = body.scrollHeight + 'px';
    });
  }

  /* ---------- 4. Form submission → messenger ---------- */
  var MSG_NUMBER = '79313443000'; // +7 931 344 3 000 — единый номер для сообщений

  // Подтверждение «Заявка отправлена» прямо в форме (для amoCRM-заявок без мессенджера)
  function showSent(form) {
    var note = form.querySelector('.form-sent');
    if (!note) {
      note = document.createElement('div');
      note.className = 'form-sent';
      note.setAttribute('role', 'status');
      note.innerHTML = '<span class="form-sent-ic" aria-hidden="true">✓</span><span class="form-sent-tx"></span>';
      // ставим подтверждение сразу под кнопкой отправки (перед мелким текстом-примечанием)
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && submitBtn.nextSibling) form.insertBefore(note, submitBtn.nextSibling);
      else form.appendChild(note);
    }
    var msg = form.getAttribute('data-sent-msg') ||
      'Заявка отправлена! Мы свяжемся с вами в ближайшее время.';
    note.querySelector('.form-sent-tx').textContent = msg;
    note.hidden = false;
    form.reset();
    clearTimeout(form.__sentTimer);
    form.__sentTimer = setTimeout(function () { note.hidden = true; }, 9000);
  }

  function initForms() {
    document.querySelectorAll('[data-whatsapp-form]').forEach(function (form) {
      // формы с выбором мессенджера: запоминаем, какую кнопку нажали
      form.querySelectorAll('.book-msgr').forEach(function (b) {
        b.addEventListener('click', function () { form.__msgr = b.getAttribute('data-msgr'); });
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var cms = window.TSKCMS;
        var ctx = form.getAttribute('data-context') || 'Заявка';
        var data = new FormData(form);
        var an = window.TSKAnalytics;
        if (an) an.refreshHiddenFields(); // свежие ClientID/UTM перед чтением FormData
        stampConsentDocs(form);           // редакция документов на момент согласия
        data = new FormData(form);
        // Отзывы уходят на модерацию в админку (если она подключена), а не в WhatsApp
        if (form.hasAttribute('data-review-form') && cms && cms.configured) {
          cms.submitReview(form);
          if (an) an.goal('review_submit');
          return;
        }
        // копия заявки в админку; цель формы — только после подтверждённой записи
        var saved = (cms && cms.configured) ? cms.saveMessage(ctx, data) : null;
        if (an) {
          an.identify(data.get('phone'));
          var fire = function () { an.goal('form_submit', { form: ctx }); };
          if (saved && saved.then) saved.then(fire); else fire();
          // заявка → amoCRM (через amo.php на Beget); Promise<boolean> с подтверждением
          var lead = an.sendLead ? an.sendLead(ctx, form) : null;
          /* Цель «Заявка КИДС — форма успешно отправлена» (kids_lead).
             Срабатывает ровно один раз и только когда приём заявки подтвердил
             сервер: amo.php ответил {"ok":true} либо заявка записана в базу
             сайта. Если оба канала не ответили — цель не засчитывается. */
          var counted = false;
          var confirm = function (source) {
            return function (ok) {
              if (!ok || counted) return;
              counted = true;
              an.goal('kids_lead', { form: ctx, source: source });
            };
          };
          if (lead && lead.then) lead.then(confirm('amo'), function () {});
          if (saved && saved.then) saved.then(confirm('db'), function () {});
        }
        // Заявки только в amoCRM/админку: без мессенджера — показываем подтверждение
        if (form.hasAttribute('data-amo-only')) {
          showSent(form);
          return;
        }
        var lines = ['Здравствуйте! ' + ctx + ' с сайта «Территория Спорта КИДС».'];
        var labels = { name: 'Имя', phone: 'Телефон', contact: 'Контакты', text: 'Сообщение', rating: 'Оценка',
          parent: 'Имя родителя', child: 'Имя ребёнка', childage: 'Возраст ребёнка', lesson: 'Занятие' };
        data.forEach(function (val, key) {
          if (key.charAt(0) === '_') return; // служебные поля аналитики — не для текста сообщения
          val = (val || '').toString().trim();
          if (val) lines.push((labels[key] || key) + ': ' + val);
        });
        var text = lines.join('\n');

        if (form.hasAttribute('data-msgr-form')) {
          var choice = form.__msgr || 'wa';
          if (choice === 'wa') {
            window.open('https://wa.me/' + MSG_NUMBER + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
          } else {
            // Telegram/MAX/VK не принимают текст в ссылке — кладём заявку в буфер,
            // чтобы её можно было просто вставить в открывшийся чат
            var url = choice === 'tg' ? 'https://t.me/+' + MSG_NUMBER
              : choice === 'max' ? 'https://max.ru/u/+' + MSG_NUMBER
              : (cms && cms.settings['contact.vk']) || 'https://vk.com/kidstersport';
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).catch(function () {});
            }
            var note = form.querySelector('.book-copied');
            if (!note) {
              note = document.createElement('p');
              note.className = 'book-copied';
              form.appendChild(note);
            }
            note.textContent = 'Текст заявки скопирован — просто вставьте его в чат.';
            window.open(url, '_blank', 'noopener');
          }
          form.reset();
          return;
        }

        var wa = (cms && cms.settings['contact.whatsapp']) || WHATSAPP_NUMBER;
        window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
        form.reset();
      });
    });
  }

  /* ---------- 5. Program cards: carousel + expand/collapse ---------- */
  function initProgramCards() {
    var root = document.querySelector('.prog-carousel');
    if (!root) return;
    // ≤620px the strip is a native horizontal scroller (no expand-on-tap);
    // above that it is the desktop transform carousel. The mode is checked
    // at event time so resizing across the breakpoint keeps working.
    var mqMobile = window.matchMedia('(max-width: 620px)');
    var track = root.querySelector('.prog-track');
    var viewport = root.querySelector('.car-viewport');
    var cards = Array.prototype.slice.call(track.querySelectorAll('.prog-card'));
    var prev = root.querySelector('.car-prev');
    var next = root.querySelector('.car-next');
    var index = 0;
    if (!cards.length) return;

    function gap() {
      var s = getComputedStyle(track);
      return parseFloat(s.columnGap || s.gap || '0') || 0;
    }
    function step() {
      // width of a resting (non-open) card + gap
      var c = null;
      for (var i = 0; i < cards.length; i++) { if (!cards[i].classList.contains('is-open')) { c = cards[i]; break; } }
      if (!c) c = cards[0];
      return c.getBoundingClientRect().width + gap();
    }
    function perView() { return Math.max(1, Math.floor((viewport.clientWidth + 2) / step())); }
    function maxIndex() { return Math.max(0, cards.length - perView()); }
    function moveTo(px) { track.style.transform = 'translateX(' + px + 'px)'; }
    function update() {
      moveTo(-index * step());
      if (prev) prev.disabled = index <= 0;
      if (next) next.disabled = index >= maxIndex();
    }
    function closeAll() {
      cards.forEach(function (c) {
        c.classList.remove('is-open');
        var t = c.querySelector('[data-prog-toggle]');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
      track.classList.remove('has-open');
    }
    function go(i) { index = Math.min(Math.max(i, 0), maxIndex()); update(); }

    /* mobile strip: native scroll one card per click, arrows disable at the ends */
    function mUpdate() {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 1;
      if (next) next.disabled = track.scrollLeft >= max - 1;
    }
    function refresh() { if (mqMobile.matches) { mUpdate(); } else { update(); } }

    if (prev) prev.addEventListener('click', function () {
      if (mqMobile.matches) { track.scrollBy({ left: -step(), behavior: 'smooth' }); return; }
      var open = track.classList.contains('has-open'); closeAll(); if (open) update(); else go(index - 1);
    });
    if (next) next.addEventListener('click', function () {
      if (mqMobile.matches) { track.scrollBy({ left: step(), behavior: 'smooth' }); return; }
      var open = track.classList.contains('has-open'); closeAll(); if (open) update(); else go(index + 1);
    });
    track.addEventListener('scroll', function () { if (mqMobile.matches) mUpdate(); }, { passive: true });
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', function () {
      closeAll(); index = 0;
      if (mqMobile.matches) { track.style.transform = ''; mUpdate(); } else { update(); }
    });

    /* mobile: auto-advance the strip every 5 seconds; wraps to the first card.
       Skips ticks while the user is (or just was) swiping, when the tab is
       hidden, or when the carousel is out of the viewport. */
    var lastTouch = 0;
    track.addEventListener('touchstart', function () { lastTouch = Date.now(); }, { passive: true });
    track.addEventListener('touchmove', function () { lastTouch = Date.now(); }, { passive: true });
    setInterval(function () {
      if (!mqMobile.matches || document.hidden) return;
      if (Date.now() - lastTouch < 6000) return;
      var r = root.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return;
      var max = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: step(), behavior: 'smooth' });
    }, 5000);

    cards.forEach(function (card, i) {
      var toggle = card.querySelector('[data-prog-toggle]');
      if (!toggle) return;
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        var willOpen = !card.classList.contains('is-open');
        closeAll();
        if (willOpen) {
          card.classList.add('is-open');
          toggle.setAttribute('aria-expanded', 'true');
          track.classList.add('has-open');
          index = i;
          // slide the opened card to the left so it has room to expand
          moveTo(-i * step());
        } else {
          update();
        }
      });
    });

    // Touch swipe (desktop/tablet carousel only — mobile scrolls natively)
    var startX = 0, dragging = false;
    root.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; dragging = true; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (!dragging) return; dragging = false;
      if (mqMobile.matches) return;
      if (track.classList.contains('has-open')) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (mqMobile.matches) { mUpdate(); return; }
        if (!track.classList.contains('has-open')) go(index);
      }, 150);
    });

    refresh();
  }

  /* ---------- init ---------- */
  // cms.js пере-инициализирует карусель тренеров после загрузки данных
  /* ---------- Gallery strip (mobile): prev/next arrows scroll the row ---------- */
  function initGalleryStrip() {
    var strip = document.querySelector('.gallery-strip');
    if (!strip) return;
    var scroller = strip.querySelector('.gallery-grid');
    var prev = strip.querySelector('.gal-prev');
    var next = strip.querySelector('.gal-next');
    if (!scroller || !prev || !next) return;

    function step() {
      var item = scroller.querySelector('.gal-item');
      if (!item) return scroller.clientWidth;
      var s = getComputedStyle(scroller);
      var gap = parseFloat(s.columnGap || s.gap || '0') || 0;
      return item.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      prev.disabled = scroller.scrollLeft <= 1;
      next.disabled = scroller.scrollLeft >= max - 1;
    }
    prev.addEventListener('click', function () { scroller.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { scroller.scrollBy({ left: step(), behavior: 'smooth' }); });
    scroller.addEventListener('scroll', function () { update(); }, { passive: true });
    window.addEventListener('resize', function () { update(); });
    update();

    /* mobile: the strip drifts through the photos on its own; the first
       touch/scroll by the visitor stops the auto-scroll for good.
       Scroll-snap would yank each fractional step back, so it is off while
       the drift runs and restored once the visitor takes over. */
    var mqM = window.matchMedia('(max-width: 620px)');
    var autoStopped = false;
    if (mqM.matches) scroller.style.scrollSnapType = 'none';
    ['touchstart', 'wheel', 'pointerdown'].forEach(function (ev) {
      scroller.addEventListener(ev, function () {
        autoStopped = true;
        scroller.style.scrollSnapType = '';
      }, { passive: true });
    });

    /* «БОЛЬШЕ ФОТО» pages to the next screen of photos (wrapping at the end),
       just like the reviews button. With the current photos there is only one
       page, so it stays put until more are added. */
    var moreBtn = document.querySelector('.gallery-more');
    if (moreBtn) moreBtn.addEventListener('click', function (e) {
      e.preventDefault();
      autoStopped = true;                    // stop the drift so it doesn't fight the paging
      scroller.style.scrollSnapType = '';
      var max = scroller.scrollWidth - scroller.clientWidth;
      if (max <= 1) return;                  // only one page for now
      if (scroller.scrollLeft >= max - 4) scroller.scrollTo({ left: 0, behavior: 'smooth' });
      else scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' });
    });

    var driftPos = 0;   // fractional position — scrollLeft itself is rounded to whole pixels
    function drift() {
      if (!autoStopped && mqM.matches && !document.hidden) {
        var r = strip.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          var max = scroller.scrollWidth - scroller.clientWidth;
          if (driftPos >= max - 1) driftPos = 0;   // loop back to the start
          else driftPos += 0.4;
          scroller.scrollLeft = driftPos;
        }
      }
      requestAnimationFrame(drift);
    }
    requestAnimationFrame(drift);
  }

  /* ---------- Star rating input in the review form ---------- */
  function initReviewRating() {
    document.querySelectorAll('[data-rating-input]').forEach(function (group) {
      var stars = Array.prototype.slice.call(group.querySelectorAll('.rating-star'));
      var field = group.querySelector('input[name="rating"]');
      if (!stars.length) return;
      var value = 0;
      function paint(n) { stars.forEach(function (s, i) { s.classList.toggle('on', i < n); }); }
      function set(n) { value = n; if (field) field.value = n ? String(n) : ''; paint(n); }
      stars.forEach(function (s, i) {
        s.addEventListener('mouseenter', function () { paint(i + 1); });
        s.addEventListener('focus', function () { paint(i + 1); });
        s.addEventListener('click', function () {
          set(i + 1);
          s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
        });
      });
      group.addEventListener('mouseleave', function () { paint(value); });
      group.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(Math.min(5, value + 1));
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(Math.max(1, value - 1));
        else return;
        e.preventDefault(); stars[value - 1].focus();
      });
      // reset the stars when the form is cleared after a successful submit
      var form = group.closest('form');
      if (form) form.addEventListener('reset', function () { set(0); });
    });
  }

  /* ---------- «СМОТРЕТЬ ВСЕХ» → next coach (wrapping); bound once, drives the live stage ---------- */
  function initCoachesSeeAll() {
    var btn = document.querySelector('.coaches-all');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var stage = document.querySelector('.coaches-stage');
      if (stage && stage.__coachNext) stage.__coachNext();
    });
  }

  /* ---------- Reviews carousel: «БОЛЬШЕ ОТЗЫВОВ» pages by two, free-scroll too.
       Each page holds two stacked (mobile) / side-by-side (desktop) reviews. ---------- */
  function initReviewsCarousel() {
    var scroller = document.querySelector('.reviews-grid');
    var btn = document.querySelector('.reviews-more');
    if (!scroller) return;

    // Group any bare .review-card children (e.g. rendered by the CMS) into
    // pages of two, so the layout is the same whether cards come from the
    // static markup or from the database.
    function ensurePages() {
      var bare = [];
      for (var i = 0; i < scroller.children.length; i++) {
        var ch = scroller.children[i];
        if (ch.classList && ch.classList.contains('review-card')) bare.push(ch);
      }
      if (!bare.length) return;
      var page = null;
      bare.forEach(function (card, idx) {
        if (idx % 2 === 0) {
          page = document.createElement('div');
          page.className = 'review-page';
          scroller.insertBefore(page, card);
        }
        page.appendChild(card);
      });
    }

    var mo = new MutationObserver(function () {
      mo.disconnect();
      ensurePages();
      mo.observe(scroller, { childList: true });
    });
    ensurePages();
    mo.observe(scroller, { childList: true });

    if (btn) btn.addEventListener('click', function (e) {
      e.preventDefault();
      var max = scroller.scrollWidth - scroller.clientWidth;
      if (max <= 1) return;                         // nothing to page through
      if (scroller.scrollLeft >= max - 4) {
        scroller.scrollTo({ left: 0, behavior: 'smooth' });          // wrap back to the start
      } else {
        scroller.scrollBy({ left: scroller.clientWidth, behavior: 'smooth' }); // next page
      }
    });
  }

  function initNavToggle() {
    var header = document.querySelector('.header');
    var toggle = header && header.querySelector('.nav-toggle');
    var nav = header && header.querySelector('.topnav');
    if (!header || !toggle || !nav) return;
    function setOpen(open) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!header.classList.contains('nav-open'));
    });
    // close when a menu link is chosen
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    // close when tapping outside the menu, or on Escape
    document.addEventListener('click', function (e) {
      if (header.classList.contains('nav-open') && !header.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  window.TSK = { initCarousel: initCarousel, initCoachStage: initCoachStage };


  /* ---------- Floating messenger button: logo carousel + chooser ---------- */
  function initMessengerFloat() {
    var root = document.getElementById('msgFloat');
    if (!root) return;
    var btn = root.querySelector('.msg-toggle');
    var icons = Array.prototype.slice.call(root.querySelectorAll('.mf-ic'));
    var cur = 0;

    // the button's logo rolls WhatsApp → Telegram → MAX → VK and back
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && icons.length > 1) {
      setInterval(function () {
        if (document.hidden) return;
        var prev = icons[cur];
        cur = (cur + 1) % icons.length;
        var next = icons[cur];
        prev.classList.remove('is-on');
        prev.classList.add('is-out');
        setTimeout(function () { prev.classList.remove('is-out'); }, 520);
        next.classList.add('is-on');
      }, 2600);
    }

    function setOpen(open) {
      root.classList.toggle('open', open);
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    // Мессенджеры с deep link (Telegram, VK): открываем сразу приложение,
    // а если оно не установлено — откатываемся на веб-версию по обычной ссылке.
    root.querySelectorAll('.msg-opt[data-app]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var app = a.getAttribute('data-app');
        var web = a.getAttribute('href');
        if (!app || !web) return; // без схемы — обычный переход по ссылке
        e.preventDefault();
        setOpen(false);
        // Если приложение перехватило переход, вкладка теряет фокус —
        // тогда отменяем откат на веб-версию.
        var timer = setTimeout(function () { window.location.href = web; }, 900);
        var cancel = function () { clearTimeout(timer); };
        window.addEventListener('pagehide', cancel, { once: true });
        window.addEventListener('blur', cancel, { once: true });
        document.addEventListener('visibilitychange', function vh() {
          if (document.hidden) { cancel(); document.removeEventListener('visibilitychange', vh); }
        });
        window.location.href = app; // пробуем открыть приложение
      });
    });
    if (btn) btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!root.classList.contains('open'));
    });
    // the VK button in the header opens the same chooser
    document.querySelectorAll('[data-open-messengers]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      });
    });
    document.addEventListener('click', function (e) {
      if (root.classList.contains('open') && !root.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- Журнал согласий на обработку персональных данных ----------
     Фиксируем точное время простановки каждой галочки и редакцию документов,
     которые человек видел в этот момент. Поля начинаются с «_», поэтому в
     текст сообщения не попадают, но сохраняются в карточке заявки. */
  function setHidden(form, name, value) {
    var inp = form.querySelector('input[name="' + name + '"]');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = name;
      form.appendChild(inp);
    }
    inp.value = value;
  }
  function initConsent() {
    document.querySelectorAll('form .consent-list').forEach(function (list) {
      var form = list.closest('form');
      if (!form) return;
      list.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          setHidden(form, cb.name + '_at', cb.checked ? new Date().toISOString() : '');
        });
      });
    });
  }
  // редакция документов на момент отправки (ссылка на конкретный файл)
  function stampConsentDocs(form) {
    var list = form.querySelector('.consent-list');
    if (!list) return;
    var docs = [];
    list.querySelectorAll('a[data-doc]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      docs.push(a.getAttribute('data-doc') + '=' + (href && href !== '#' ? href : 'не загружен'));
    });
    setHidden(form, '_consent_docs', docs.join(' | '));
  }

  /* ---------- Кнопка «Наверх» ---------- */
  function initToTop() {
    var btn = document.getElementById('toTop');
    if (!btn) return;
    // Кнопка нужна только там, где страница длиннее экрана
    function longPage() {
      return document.documentElement.scrollHeight > window.innerHeight * 1.5;
    }
    btn.hidden = false;
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle('is-on', longPage() && y > window.innerHeight * 0.8);
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    btn.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
      catch (e) { window.scrollTo(0, 0); }   // старые браузеры
    });
    update();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initToTop();
    initConsent();
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);
    document.querySelectorAll('.coaches-stage').forEach(initCoachStage);
    initAccordions();
    initForms();
    initProgramCards();
    initGalleryStrip();
    initNavToggle();
    initReviewsCarousel();
    initCoachesSeeAll();
    initReviewRating();
    initMessengerFloat();
  });
})();
