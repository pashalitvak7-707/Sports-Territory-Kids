# Tilda migration — ready-to-paste sections

This folder splits `index.html` into one file per Tilda block, in page order.
Your live `index.html` was **not** changed — these are copy-paste helpers.

## Order of blocks on the new Tilda page

| Order | File | What to do in Tilda |
|------|------|---------------------|
| HEAD | `HEAD-styles-and-meta.html` | Paste into **Page Settings → More → HTML code for HEAD** (once) |
| 1 | `00-menu--REBUILD-AS-TILDA-MENU.html` | **Standard Tilda menu block** (Меню). File = reference only |
| 2 | `01-hero.html` | T123 (HTML code) block |
| 3 | `02-features.html` | T123 |
| 4 | `03-programs.html` | T123 |
| 5 | `04-develop.html` | T123 |
| 6 | `05-how.html` | T123 |
| 7 | `06-signup-top--REPLACE-WITH-TILDA-FORM.html` | **Standard Tilda form block** (Формы). File = reference only |
| 8 | `07-method.html` | T123 |
| 9 | `08-space.html` | T123 |
| 10 | `09-coaches.html` | T123 |
| 11 | `10-gallery.html` | T123 |
| 12 | `11-equip.html` | T123 |
| 13 | `12-schedule.html` | T123 |
| 14 | `13-reviews.html` | T123 (has an optional review form inside) |
| 15 | `14-faq.html` | T123 |
| 16 | `15-signup--REPLACE-WITH-TILDA-FORM.html` | **Standard Tilda form block** (Формы). File = reference only |
| 17 | `16-footer--REBUILD-AS-TILDA-FOOTER.html` | **Standard Tilda footer block** (Подвал). File = reference only |
| 18 | `17-floating-button-and-scripts--BOTTOM-BLOCK.html` | **One T123 block at the very bottom** (scripts) |

## How to add a T123 block
1. Click **"+"** where you want the block.
2. Search **"T123"** (category "Другое" → block "HTML-код").
3. Click **Content (Контент)** on the block, paste the whole file, save.

## Important: file paths
The section files reference images, styles, fonts and scripts by relative paths like
`assets/img/hero.png`, `styles.css`, `script.js`. In Tilda those relative paths will
NOT resolve on their own. Two options:
- **Easiest:** keep these files hosted on your Beget server and change the paths to
  full URLs, e.g. `https://ts-kids.ru/assets/img/hero.png`, `https://ts-kids.ru/styles.css`.
- **Or:** upload the images/fonts to Tilda's File Manager and update the paths to the
  Tilda URLs it gives you.
A quick find-and-replace of `assets/` → `https://ts-kids.ru/assets/` (and the same for
`styles.css`, `script.js`, etc.) is usually enough.

## Notes
- The **iframe auto-height script** from the old page (the bottom `<script>` that posts
  `tsHeight` to the parent) is intentionally **left out** — it was only needed while the
  site lived inside an iframe. You don't need it in the real migration.
- **Yandex.Metrika** counter (id 110643212) was in the old HEAD. In Tilda, add it under
  **Site Settings → Analytics**, or paste it back into the HEAD block if you prefer.
- The **top form** and **bottom form** are the same form — recreate both as Tilda form
  blocks and point them to the same destination (email / amoCRM) under
  **Site Settings → Forms (Приём данных)**.
- Keep your current **iframe page as a backup** — don't delete it until the new page
  is fully checked and published.
