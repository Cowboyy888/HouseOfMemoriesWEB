#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Missing .env file. Copy .env.example to .env before deploying." >&2
  exit 1
fi

docker-compose up -d --build

echo "Deployment stack started."
echo "Open http://localhost:8080 to reach the application."
