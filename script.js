/* ===== Territory Sport Kids — interactions ===== */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '77054290000'; // +7 705 429 0000

  /* ---------- 1. Scroll reveal (fade in from bottom) ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
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

  /* ---------- 4. WhatsApp form submission ---------- */
  function initForms() {
    document.querySelectorAll('[data-whatsapp-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ctx = form.getAttribute('data-context') || 'Заявка';
        var data = new FormData(form);
        var lines = ['Здравствуйте! ' + ctx + ' с сайта «Территория Спорта КИДС».'];
        var labels = { name: 'Имя', phone: 'Телефон', contact: 'Контакты', text: 'Сообщение',
          parent: 'Имя родителя', child: 'Имя ребёнка', childage: 'Возраст ребёнка', lesson: 'Занятие' };
        data.forEach(function (val, key) {
          val = (val || '').toString().trim();
          if (val) lines.push((labels[key] || key) + ': ' + val);
        });
        var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
        window.open(url, '_blank', 'noopener');
        form.reset();
      });
    });
  }

  /* ---------- init ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    document.querySelectorAll('[data-carousel]').forEach(initCarousel);
    document.querySelectorAll('.coaches-stage').forEach(initCoachStage);
    initAccordions();
    initForms();
  });
})();
