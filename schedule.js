/* ===== Territory Sport Kids — schedule page ===== */
(function () {
  'use strict';

  var fAge, fDay, fTime, fCoach, fReset, countEl, emptyEl;

  function rows() {
    return Array.prototype.slice.call(document.querySelectorAll('.sched-table .sch-row:not(.sch-head)'));
  }

  /* time and coach live on each row's «Записаться» button */
  function rowTime(row) { var b = row.querySelector('.sch-book'); return b ? (b.dataset.time || '') : ''; }
  function rowCoach(row) { var b = row.querySelector('.sch-book'); return b ? (b.dataset.coach || '') : ''; }

  /* ---------- Время / Тренер options are built from the actual rows,
       so they always match whatever the admin panel publishes ---------- */
  function fillOptions(select, values) {
    if (!select) return;
    var current = select.value;
    while (select.options.length > 1) select.remove(1);
    values.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      select.appendChild(o);
    });
    // keep the user's pick if it still exists after a re-render
    select.value = values.indexOf(current) !== -1 ? current : 'all';
  }
  function rebuildOptions() {
    var times = [], coaches = [];
    rows().forEach(function (row) {
      var t = rowTime(row), c = rowCoach(row);
      if (t && times.indexOf(t) === -1) times.push(t);
      if (c && coaches.indexOf(c) === -1) coaches.push(c);
    });
    times.sort();
    coaches.sort(function (a, b) { return a.localeCompare(b, 'ru'); });
    fillOptions(fTime, times);
    fillOptions(fCoach, coaches);
  }

  /* ---------- Filtering ---------- */
  function applyFilters() {
    if (!fAge) return;
    var age = fAge.value, day = fDay ? fDay.value : 'all';
    var time = fTime ? fTime.value : 'all', coach = fCoach ? fCoach.value : 'all';
    var visible = 0;
    rows().forEach(function (row) {
      var ok = (age === 'all' || row.dataset.age === age) &&
               (day === 'all' || row.dataset.day === day) &&
               (time === 'all' || rowTime(row) === time) &&
               (coach === 'all' || rowCoach(row) === coach);
      row.hidden = !ok;
      /* inline style too, so hiding works even with a stale cached stylesheet */
      row.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });
    if (countEl) countEl.textContent = visible;
    if (emptyEl) emptyEl.hidden = visible !== 0;
  }

  /* ---------- Booking: fill the selected class ---------- */
  function bindBookButtons() {
    var lessonInput = document.getElementById('bookLesson');
    var bookCard = document.getElementById('book');
    var parentInput = document.querySelector('.book-form input[name="parent"]');

    document.querySelectorAll('.sch-book').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var d = btn.dataset;
        var summary = d.dir + ' · ' + d.age + ' · ' + d.day + ' ' + d.time + ' · ' + d.coach;
        if (lessonInput) lessonInput.value = summary;
        if (bookCard) {
          bookCard.classList.remove('book-flash');
          // force reflow so the animation can replay
          void bookCard.offsetWidth;
          bookCard.classList.add('book-flash');
          bookCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (parentInput) {
          setTimeout(function () { parentInput.focus({ preventScroll: true }); }, 450);
        }
      });
    });
  }

  /* Re-run after cms.js re-renders the table rows */
  function refresh() {
    bindBookButtons();
    rebuildOptions();
    applyFilters();
  }
  window.TSKSchedule = { refresh: refresh };

  document.addEventListener('DOMContentLoaded', function () {
    fAge = document.getElementById('fAge');
    fDay = document.getElementById('fDay');
    fTime = document.getElementById('fTime');
    fCoach = document.getElementById('fCoach');
    fReset = document.getElementById('fReset');
    countEl = document.getElementById('schCount');
    emptyEl = document.getElementById('schEmpty');
    if (!fAge || !rows().length) return;

    [fAge, fDay, fTime, fCoach].forEach(function (sel) { if (sel) sel.addEventListener('change', applyFilters); });
    if (fReset) fReset.addEventListener('click', function () {
      [fAge, fDay, fTime, fCoach].forEach(function (sel) { if (sel) sel.value = 'all'; });
      applyFilters();
    });

    refresh();
  });
})();
