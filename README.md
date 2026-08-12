# CTF Карта России

Интерактивная Three.js-карта ближайших CTF с Django-бэкендом. События отображаются флажками; чем меньше времени до старта, тем чаще пульсирует маркер. Клик по региону показывает все ближайшие CTF, клик по флажку — детали выбранного события.

## Структура репозитория

- `backend/` — Django-проект (`ctfmap/`, `events/`, `manage.py`, `requirements.txt`, `templates/`).
- `frontend/` — Vite/TypeScript-приложение (`src/`, `public/`, `package.json`).

Сборка фронтенда (`npm run build`) кладёт бандл в `backend/static/dist/`, откуда его раздаёт Django.

## Локальный запуск

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
(cd frontend && npm ci && npm run build)
(cd backend && python manage.py migrate)
(cd backend && python manage.py createsuperuser)
(cd backend && python manage.py seed_demo)  # необязательно: три события для демонстрации
(cd backend && python manage.py runserver)
```

Откройте `http://127.0.0.1:8000/`. Админка находится на `http://127.0.0.1:8000/admin/`.

## Работа с событиями

- Администратор создаёт CTF в разделе «CTF-мероприятия»: регион выбирается из списка, даты проверяются автоматически.
- Посетитель нажимает «Предложить CTF» и заполняет короткую форму.
- Предложение появляется в разделе «Предложения мероприятий» со статусом «Новое».
- Администратор может отметить одно или несколько предложений и выбрать действие «Создать CTF из выбранных предложений» — записи публикуются на карте, а предложения получают статус «Добавлено».

## Проверки

```bash
(cd backend && python manage.py test)
(cd frontend && npm run build)
```

Docker намеренно не используется. Для обновления фронтенда после изменений в `frontend/src/` снова выполните `npm run build` в каталоге `frontend/`.
