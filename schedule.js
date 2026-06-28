/* ===== Territory Sport Kids — schedule page ===== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.sched-table .sch-row:not(.sch-head)'));
    var fAge = document.getElementById('fAge');
    var fDir = document.getElementById('fDir');
    var fDay = document.getElementById('fDay');
    var fFree = document.getElementById('fFree');
    var fReset = document.getElementById('fReset');
    var countEl = document.getElementById('schCount');
    var emptyEl = document.getElementById('schEmpty');
    if (!rows.length) return;

    /* ---------- Filtering ---------- */
    function applyFilters() {
      var age = fAge.value, dir = fDir.value, day = fDay.value, freeOnly = fFree.checked;
      var visible = 0;
      rows.forEach(function (row) {
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

    [fAge, fDir, fDay].forEach(function (sel) { if (sel) sel.addEventListener('change', applyFilters); });
    if (fFree) fFree.addEventListener('change', applyFilters);
    if (fReset) fReset.addEventListener('click', function () {
      fAge.value = 'all'; fDir.value = 'all'; fDay.value = 'all'; fFree.checked = false;
      applyFilters();
    });

    /* ---------- Booking: fill the selected class ---------- */
    var lessonInput = document.getElementById('bookLesson');
    var bookCard = document.getElementById('book');
    var parentInput = document.querySelector('.book-form input[name="parent"]');

    document.querySelectorAll('.sch-book').forEach(function (btn) {
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

    applyFilters();
  });
})();
