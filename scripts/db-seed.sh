#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/db-compose.sh" exec -T postgres psql \
  -U "${POSTGRES_USER:-dinero}" \
  -d "${POSTGRES_DB:-dinero}" \
  -v ON_ERROR_STOP=1 \
  -f /database/seeds/001_development_seed.sql
