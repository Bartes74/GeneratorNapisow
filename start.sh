#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (this script's directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "[start] Project root: $PROJECT_ROOT"

# Prepare runtime directories
mkdir -p logs run backend/uploads backend/uploads/audio backend/temp backend/output

# Load environment variables if .env exists
if [ -f .env ]; then
  echo "[start] Loading environment from .env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "[start] No .env found. Using defaults."
fi

# --- Start backend (FastAPI / Uvicorn) ---
echo "[start] Ensuring Python virtualenv and dependencies (backend)"
if [ ! -d backend/venv ]; then
  python3 -m venv backend/venv
fi
# shellcheck disable=SC1091
source backend/venv/bin/activate
pip install --upgrade pip >/dev/null 2>&1 || true
pip install -r backend/requirements.txt

echo "[start] Starting backend (Uvicorn) on :8000"
(
  cd backend
  nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 \
    > "${PROJECT_ROOT}/logs/backend.log" 2>&1 &
  echo $! > "${PROJECT_ROOT}/run/backend.pid"
)

# --- Start frontend (Vite dev server) ---
echo "[start] Ensuring frontend dependencies (npm)"
(
  cd frontend
  if [ ! -d node_modules ]; then
    npm ci
  fi
  echo "[start] Starting frontend (Vite) on :5173"
  nohup npm run dev \
    > "${PROJECT_ROOT}/logs/frontend.log" 2>&1 &
  echo $! > "${PROJECT_ROOT}/run/frontend.pid"
)

echo "[start] All components started."
echo "[start] Backend: http://localhost:8000"
echo "[start] Frontend: http://localhost:5173"
echo "[start] Logs: ${PROJECT_ROOT}/logs (backend.log, frontend.log)"
echo "[start] To stop: ./stop.sh"


