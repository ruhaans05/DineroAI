#!/usr/bin/env bash
set -euo pipefail

if docker compose version >/dev/null 2>&1; then
  docker compose "$@"
else
  docker-compose "$@"
fi
