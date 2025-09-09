#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "[stop] Stopping local processes"

stop_pid() {
  local name="$1"
  local pidfile="run/${name}.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile" || true)"
    if [ -n "$pid" ] && ps -p "$pid" >/dev/null 2>&1; then
      echo "[stop] Killing $name (PID: $pid)"
      kill "$pid" || true
      sleep 1
      if ps -p "$pid" >/dev/null 2>&1; then
        echo "[stop] Force killing $name (PID: $pid)"
        kill -9 "$pid" || true
      fi
    else
      echo "[stop] $name not running"
    fi
    rm -f "$pidfile"
  else
    echo "[stop] No pidfile for $name"
  fi
}

stop_pid backend
stop_pid frontend

echo "[stop] Done."


