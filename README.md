# СаулеФарм — лендинг (статичный макет RU/KZ)

Статичная версия лендинга ТОО «Саулефарм» для согласования с клиентом. После одобрения переносится на Next.js по [SPEC.md](SPEC.md).

**Превью:** https://farik9797.github.io/saule/ · казахская версия: https://farik9797.github.io/saule/kk/

## Сборка

```bash
npm install
pip install jinja2
python3 build.py          # → dist/ (index.html, kk/index.html, assets/)
npm run dev               # сборка + сервер на http://localhost:8080
```

Пуш в `main` автоматически собирает и публикует сайт на GitHub Pages (`.github/workflows/pages.yml`).

## Структура

| Путь | Что это |
| --- | --- |
| `src/template.html` | Разметка всех 14 блоков (Jinja2), общая для RU и KZ |
| `src/legal.html`, `src/_legal.html` | Страницы и попапы «Политика конфиденциальности» и «Пользовательское соглашение» |
| `messages/ru.json`, `messages/kk.json` | Все тексты; набор ключей обязан совпадать — иначе сборка падает |
| `content/branches.json` | Аптеки: адреса, телефоны, часы, рейтинги и координаты из 2ГИС |
| `src/styles.css` | Tailwind 4: токены дизайн-системы из ТЗ (`@theme`) и компоненты |
| `src/main.js` | Меню, плавный скролл (Lenis), анимации (GSAP ScrollTrigger), маска телефона, валидация формы |
| `assets/img/` | Фото (WebP) |
| `build.py` | Сборщик: шаблон + словари → `dist/`, иконки Lucide и Simple Icons инлайном, JSON-LD |

## Важно для превью

- Стоит `noindex, nofollow` — убрать на боевом домене.
- Форма без бэкенда: после валидации открывает WhatsApp с текстом заявки. На проде — Telegram-бот + e-mail.
- Фото — кадры из дизайн-макета и сток Pexels (лаборатория); заменить реальными фото клиента.
