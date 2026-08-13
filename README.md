# CTF Карта России

Интерактивная карта ближайших CTF с Django-бэкендом и SvelteKit-SPA. Точные
координаты городов отображаются на детальных границах Natural Earth 1:10m;
события также доступны в HTML-каталоге с поиском, поэтому WebGL не является
единственным способом пользоваться сервисом.

## Структура репозитория

- `backend/` — Django-проект, модели, admin, API, миграции и команды управления.
- `frontend/` — SvelteKit-приложение, Three.js-карта, каталог и unit/e2e-тесты.
- `scripts/` — воспроизводимая сборка геоданных и локальный запуск Playwright.
- `.github/workflows/ci.yml` — проверки backend, frontend, production settings и Chromium.

Frontend собирается как serverless SPA (`fallback: 'index.html'`, `ssr = false`)
без Node-рантайма. `npm run build` помещает HTML/JS/CSS в
`backend/static/dist/`, а Django отдаёт сборку с того же origin и устанавливает
CSRF-cookie. `backend/static/dist/` является generated-каталогом и не хранится в
Git.

## Локальный запуск

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
(cd frontend && npm ci && npm run build)
(cd backend && python manage.py migrate)
(cd backend && python manage.py createsuperuser)
(cd backend && python manage.py seed_demo)  # необязательно: пять демо-событий
(cd backend && python manage.py runserver)
```

Приложение будет доступно на `http://127.0.0.1:8000/`, admin — на
`http://127.0.0.1:8000/admin/`. Локальный режим без переменных окружения
использует SQLite и memory cache. Сборку frontend нужно повторять после изменений
в `frontend/src/`.

## Production-конфигурация

Django не загружает `.env` автоматически. Перед запуском production-процесса
передайте переменные из секрет-хранилища окружения; безопасный перечень без
реальных значений находится в `.env.example`.

Обязательные переменные при `DJANGO_DEBUG=false`:

- `DJANGO_SECRET_KEY` — уникальное случайное значение;
- `DJANGO_ALLOWED_HOSTS` и `DJANGO_CSRF_TRUSTED_ORIGINS`;
- `DATABASE_URL` — только PostgreSQL;
- `CACHE_URL` — Redis для общего rate limit и readiness;
- `DJANGO_TRUST_PROXY_HEADERS=true`, только если заголовки задаёт доверенный proxy.

SSL redirect, secure cookies и начальный HSTS включаются автоматически в
production. `DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS` и
`DJANGO_SECURE_HSTS_PRELOAD` включайте только после проверки всех поддоменов.
Reverse proxy должен ограничивать тело запроса как минимум тем же значением, что
`CTFMAP_SUBMISSION_MAX_BODY_BYTES` (по умолчанию 32 KiB).

Проверки оркестратора:

- `GET /health/` — процесс отвечает;
- `GET /ready/` — доступны БД и cache;
- `GET /api/v1/events/` — versioned API событий;
- старый `/api/` временно оставлен совместимым.

## Работа с событиями

- В admin выберите субъект и введите название любого города. При первом
  сохранении backend геокодирует его через Nominatim, проверяет принадлежность
  субъекту и сохраняет координаты с источником. Список городов и ручные координаты
  не нужны.
- Для onsite/hybrid город обязателен; online-событие может быть без города.
- Флаги строятся из широты/долготы той же D3-проекцией, что и границы карты.
- Отдельный режим Heat map окрашивает регионы по числу CTF, начавшихся за
  выбранные пользователем последние 1–24 месяца; обычный режим по-прежнему
  показывает актуальные события и маркеры.
- Карточка onsite/hybrid CTF открывает отели, маршрут и еду рядом в Яндекс Картах.
- Публичные предложения защищены CSRF, лимитом тела, honeypot и rate limit.
- В публичной форме выбирается формат участия: очно (по умолчанию), гибрид или
  удалённо. Выбор сохраняется при модерации и используется фильтром каталога.
- Предложения попадают в Django Admin и публикуются только после модерации.

## Проверки

Для полного локального набора установите dev-зависимости backend:

```bash
python -m pip install -r backend/requirements-dev.txt
(cd backend && python -m pip check && pip-audit -r requirements.txt)
(cd backend && ruff check . && python manage.py check)
(cd backend && python manage.py makemigrations --check --dry-run && python manage.py test)
(cd frontend && npm ci && npm test && npm run check && npm run build && npm audit)
(cd frontend && npx playwright install chromium && npm run test:e2e)
```

Production settings отдельно проверяются командой `python manage.py check --deploy
--fail-level WARNING` с заполненными production-переменными. Те же проверки
автоматически запускает GitHub Actions.

## Геоданные

Геокодирование выполняется только при явном сохранении нового города, не чаще
одного запроса в секунду, с timeout, ограниченным retry и локальным кешированием в
`City`. Для production задайте идентифицирующий User-Agent:

```bash
export CTFMAP_GEOCODER_USER_AGENT='CTFMap/1.0 (+https://example.org/contact)'
```

Провайдера и timeout можно настроить через `CTFMAP_GEOCODER_URL` и
`CTFMAP_GEOCODER_TIMEOUT`. Геометрия карты воспроизводимо пересобирается из
Natural Earth 1:10m; скрипт убирает только неразличимые микрополигоны и сохраняет
атрибуцию:

```bash
python3 scripts/build_map_data.py
```
