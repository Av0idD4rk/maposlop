#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -x "$repo_root/.venv/bin/python" ]; then
  python_bin="$repo_root/.venv/bin/python"
else
  python_bin=${PYTHON_BIN:-python3}
fi

cd "$repo_root/backend"
"$python_bin" manage.py migrate --noinput
"$python_bin" manage.py seed_demo
exec "$python_bin" manage.py runserver 127.0.0.1:8010 --noreload
