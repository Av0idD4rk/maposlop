# syntax=docker/dockerfile:1
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=false \
    DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1 \
    SQLITE_PATH=/app/data/db.sqlite3

WORKDIR /app
RUN addgroup --system ctfmap && adduser --system --ingroup ctfmap ctfmap

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /build/backend/static/dist/ ./backend/static/dist/
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN mkdir -p /app/data /app/backend/staticfiles \
    && chmod +x /app/docker/entrypoint.sh \
    && chown -R ctfmap:ctfmap /app

USER ctfmap
WORKDIR /app/backend
RUN python manage.py collectstatic --noinput

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/', timeout=3)" || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["gunicorn", "ctfmap.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", "--access-logfile", "-"]
