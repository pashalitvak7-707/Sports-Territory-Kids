/* ===== Территория Спорта КИДС — реестр текстов для настройки размера =====
 * Общий список для сайта (cms.js) и админки (admin.js).
 * key      -> настройка «tsize.<key>» в таблице settings (значение в %)
 * label/g  -> подпись и группа в админ-панели
 * sel      -> какие элементы сайта масштабируются
 */
window.TSK_TEXT_SIZES = [
  /* Шапка и меню */
  { g: 'Шапка и меню', key: 'nav_menu', label: 'Верхнее меню', sel: '.topnav a' },
  { g: 'Шапка и меню', key: 'topbar_phone', label: 'Телефон в шапке', sel: '.topbar-phone' },
  { g: 'Шапка и меню', key: 'header_button', label: 'Кнопка «Пробное занятие»', sel: '.brandbar .btn' },

  /* Первый экран */
  { g: 'Первый экран', key: 'hero_title', label: 'Заголовок', sel: '.hero-text h1' },
  { g: 'Первый экран', key: 'hero_sub', label: 'Подзаголовок', sel: '.hero-sub' },
  { g: 'Первый экран', key: 'hero_buttons', label: 'Кнопки', sel: '.hero-buttons .btn' },

  /* Зелёная плашка преимуществ */
  { g: 'Плашка преимуществ', key: 'features', label: 'Текст на зелёной плашке', sel: '.feat p' },

  /* Программы */
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_title', label: 'Заголовок раздела', sel: '.programs .section-title' },
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_lead', label: 'Описание раздела', sel: '.programs .section-lead' },
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_card_title', label: 'Названия программ', sel: '.pc-title' },
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_card_text', label: 'Текст карточек', sel: '.pc-desc, .pc-desc-long, .pc-benefits li' },
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_card_meta', label: 'Возраст и длительность', sel: '.pc-age, .pc-time' },
  { g: 'Программы («Чем будем заниматься?»)', key: 'prog_card_buttons', label: 'Кнопки карточек', sel: '.pc-primary, .pc-secondary' },

  /* Что будем развивать */
  { g: '«Что будем развивать»', key: 'develop_title', label: 'Заголовок раздела', sel: '.develop .section-title' },
  { g: '«Что будем развивать»', key: 'develop_items', label: 'Подписи под иконками', sel: '.dev-item p' },

  /* Как проходит первое занятие */
  { g: '«Как проходит первое занятие»', key: 'how_title', label: 'Заголовок раздела', sel: '.how .section-title' },
  { g: '«Как проходит первое занятие»', key: 'how_steps', label: 'Подписи шагов', sel: '.how-step h4' },
  { g: '«Как проходит первое занятие»', key: 'how_cta', label: 'Кнопка раздела', sel: '.how-cta' },

  /* Наша методика */
  { g: '«Наша методика»', key: 'method_title', label: 'Заголовок раздела', sel: '.method .section-title' },
  { g: '«Наша методика»', key: 'method_card_title', label: 'Заголовки карточек', sel: '.method-card h3' },
  { g: '«Наша методика»', key: 'method_card_text', label: 'Текст карточек', sel: '.method-card p' },

  /* Оранжевый блок записи */
  { g: 'Запись (оранжевый блок)', key: 'signup_title', label: 'Заголовок', sel: '.signup h2' },
  { g: 'Запись (оранжевый блок)', key: 'signup_text', label: 'Текст', sel: '.signup-inner > p' },
  { g: 'Запись (оранжевый блок)', key: 'signup_form', label: 'Поля и кнопка формы', sel: '.signup-form input, .signup-form .btn' },
  { g: 'Запись (оранжевый блок)', key: 'signup_small', label: 'Мелкий текст под формой', sel: '.signup-inner small' },

  /* Зелёный блок «Пространство» */
  { g: 'Блок «Пространство»', key: 'space_title', label: 'Заголовок', sel: '.space-text h2' },
  { g: 'Блок «Пространство»', key: 'space_list', label: 'Список преимуществ', sel: '.space-list li' },

  /* Галерея */
  { g: 'Галерея', key: 'gallery_title', label: 'Заголовок раздела', sel: '.gallery-card .section-title' },

  /* Что есть у нас в зале */
  { g: '«Что есть у нас в зале?»', key: 'equip_title', label: 'Заголовок раздела', sel: '.equip .section-title' },
  { g: '«Что есть у нас в зале?»', key: 'equip_item_title', label: 'Названия объектов', sel: '.equip-list .acc-title' },
  { g: '«Что есть у нас в зале?»', key: 'equip_item_text', label: 'Описания объектов', sel: '.equip-list .acc-body p' },

  /* Тренеры */
  { g: 'Тренеры', key: 'coaches_title', label: 'Заголовок раздела', sel: '.coaches-title' },
  { g: 'Тренеры', key: 'coaches_lead', label: 'Описание раздела', sel: '.coaches-lead' },
  { g: 'Тренеры', key: 'coaches_link', label: 'Ссылка «Смотреть всех»', sel: '.coaches-all' },
  { g: 'Тренеры', key: 'coach_names', label: 'Имена тренеров', sel: '.coach-card h3' },
  { g: 'Тренеры', key: 'coach_text', label: 'Описания тренеров', sel: '.coach-card p' },
  { g: 'Тренеры', key: 'coach_tags', label: 'Плашки (должность, опыт)', sel: '.coach-tags span' },

  /* Блок «Расписание» на главной */
  { g: 'Блок «Расписание» на главной', key: 'home_sched_eyebrow', label: 'Надпись сверху', sel: '.sched-eyebrow' },
  { g: 'Блок «Расписание» на главной', key: 'home_sched_title', label: 'Заголовок', sel: '.sched-text h2' },
  { g: 'Блок «Расписание» на главной', key: 'home_sched_text', label: 'Текст', sel: '.sched-text p' },
  { g: 'Блок «Расписание» на главной', key: 'home_sched_buttons', label: 'Кнопка и ссылка', sel: '.sched-btn, .sched-link' },

  /* Отзывы */
  { g: 'Отзывы', key: 'reviews_title', label: 'Заголовок раздела', sel: '.reviews-heading' },
  { g: 'Отзывы', key: 'reviews_text', label: 'Текст отзывов', sel: '.review-card p' },
  { g: 'Отзывы', key: 'reviews_author', label: 'Подписи авторов', sel: '.review-author' },
  { g: 'Отзывы', key: 'reviews_more', label: 'Ссылка «Больше отзывов»', sel: '.reviews-more' },
  { g: 'Отзывы', key: 'reviews_form_title', label: 'Заголовок формы отзыва', sel: '.review-form-card h3' },
  { g: 'Отзывы', key: 'reviews_form', label: 'Поля и кнопка формы', sel: '.review-form input, .review-form textarea, .review-submit' },

  /* FAQ */
  { g: 'Частые вопросы (FAQ)', key: 'faq_title', label: 'Заголовок раздела', sel: '.faq .section-title' },
  { g: 'Частые вопросы (FAQ)', key: 'faq_q', label: 'Вопросы', sel: '.faq-list .acc-title' },
  { g: 'Частые вопросы (FAQ)', key: 'faq_a', label: 'Ответы', sel: '.faq-list .acc-body p' },

  /* Подвал */
  { g: 'Подвал', key: 'footer_phone', label: 'Телефон', sel: '.footer-phone' },
  { g: 'Подвал', key: 'footer_links', label: 'Меню и ссылки', sel: '.footer-nav a, .footer-links a' },
  { g: 'Подвал', key: 'footer_copyright', label: 'Копирайт', sel: '.copyright' },

  /* Страница расписания */
  { g: 'Страница расписания', key: 'schedpage_eyebrow', label: 'Надпись сверху', sel: '.sched-hero-eyebrow' },
  { g: 'Страница расписания', key: 'schedpage_title', label: 'Заголовок страницы', sel: '.sched-hero h1' },
  { g: 'Страница расписания', key: 'schedpage_sub', label: 'Подзаголовок', sel: '.sched-hero p' },
  { g: 'Страница расписания', key: 'schedpage_filters', label: 'Фильтры', sel: '.filter-field label, .filter-select, .filter-check span, .filter-reset' },
  { g: 'Страница расписания', key: 'schedpage_count', label: 'Счётчик занятий', sel: '.sched-count' },
  { g: 'Страница расписания', key: 'schedpage_table', label: 'Таблица расписания', sel: '.sch-k, .sch-v, .sch-badge, .sch-row.sch-head div, .sch-book, .sched-empty' },
  { g: 'Страница расписания', key: 'book_title', label: 'Заголовок формы записи', sel: '.book-title' },
  { g: 'Страница расписания', key: 'book_text', label: 'Текст формы записи', sel: '.book-sub, .book-note' },
  { g: 'Страница расписания', key: 'book_form', label: 'Поля и кнопка формы', sel: '.book-form input, .book-form select, .book-form textarea, .book-form button, .book-field label' }
];

/* ===== Реестр блоков для настройки отступов (sspace.<key> в процентах) ===== */
window.TSK_SECTION_SPACING = [
  { key: 'hero', label: 'Первый экран', sel: '.hero .hero-inner' },
  { key: 'features', label: 'Преимущества (зелёная плашка)', sel: 'section.features' },
  { key: 'programs', label: 'Программы', sel: 'section.programs' },
  { key: 'develop', label: '«Что будем развивать»', sel: 'section.develop' },
  { key: 'how', label: '«Как проходит первое занятие»', sel: 'section.how' },
  { key: 'signup', label: 'Блоки «Запишитесь» (оба)', sel: 'section.signup' },
  { key: 'method', label: '«Наша методика»', sel: 'section.method' },
  { key: 'space', label: '«Пространство для движения»', sel: 'section.space' },
  { key: 'coaches', label: 'Тренеры', sel: 'section.coaches' },
  { key: 'gallery', label: 'Галерея', sel: 'section.gallery' },
  { key: 'equip', label: '«Что есть у нас в зале»', sel: 'section.equip' },
  { key: 'schedule', label: 'Блок «Расписание» (главная)', sel: 'section.schedule' },
  { key: 'reviews', label: 'Отзывы', sel: 'section.reviews' },
  { key: 'faq', label: 'FAQ', sel: 'section.faq' },
  { key: 'sched_hero', label: 'Страница расписания: заголовок', sel: 'section.sched-hero' },
  { key: 'sched_page', label: 'Страница расписания: таблица', sel: 'section.sched-page' }
];

/* Отдельные промежутки в футере (телефон — адрес — карта — меню).
   В отличие от блоков выше, здесь настраивается один отступ, а не пара
   «сверху/снизу»: prop — какое свойство масштабировать у найденных элементов.
   Значение в процентах от обычного отступа: 100 — как сейчас, 0 — вплотную. */
window.TSK_GAP_SPACING = [
  { key: 'footer_top',   label: 'Футер: от зелёного блока до телефона', sel: '.footer',       prop: 'paddingTop' },
  { key: 'footer_place', label: 'Футер: от телефона до адреса и карты',  sel: '.footer-place', prop: 'marginTop' },
  { key: 'footer_below', label: 'Футер: от карты до меню и логотипа',
    sel: '.footer-main, .footer-nav, .footer-logo', prop: 'marginTop' }
];
