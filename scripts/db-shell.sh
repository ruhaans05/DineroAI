#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/db-compose.sh" exec postgres psql \
  -U "${POSTGRES_USER:-dinero}" \
  -d "${POSTGRES_DB:-dinero}"
