/* ===== Territory Sport Kids — schedule page ===== */
(function () {
  'use strict';

  var fAge, fDir, fDay, fFree, fReset, countEl, emptyEl;

  function rows() {
    return Array.prototype.slice.call(document.querySelectorAll('.sched-table .sch-row:not(.sch-head)'));
  }

  /* ---------- Filtering ---------- */
  function applyFilters() {
    if (!fAge) return;
    var age = fAge.value, dir = fDir.value, day = fDay.value, freeOnly = fFree.checked;
    var visible = 0;
    rows().forEach(function (row) {
      var ok = (age === 'all' || row.dataset.age === age) &&
               (dir === 'all' || row.dataset.dir === dir) &&
               (day === 'all' || row.dataset.day === day) &&
               (!freeOnly || parseInt(row.dataset.free, 10) > 0);
      row.hidden = !ok;
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
    applyFilters();
  }
  window.TSKSchedule = { refresh: refresh };

  document.addEventListener('DOMContentLoaded', function () {
    fAge = document.getElementById('fAge');
    fDir = document.getElementById('fDir');
    fDay = document.getElementById('fDay');
    fFree = document.getElementById('fFree');
    fReset = document.getElementById('fReset');
    countEl = document.getElementById('schCount');
    emptyEl = document.getElementById('schEmpty');
    if (!fAge || !rows().length) return;

    [fAge, fDir, fDay].forEach(function (sel) { if (sel) sel.addEventListener('change', applyFilters); });
    if (fFree) fFree.addEventListener('change', applyFilters);
    if (fReset) fReset.addEventListener('click', function () {
      fAge.value = 'all'; fDir.value = 'all'; fDay.value = 'all'; fFree.checked = false;
      applyFilters();
    });

    refresh();
  });
})();
