#!/usr/bin/env bash
set -euo pipefail

"$(dirname "$0")/db-compose.sh" up -d postgres
