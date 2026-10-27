#!/usr/bin/env bash
# Write backend & frontend .env files for AI Planner.
# Reads values from argv/stdin — never stores keys in this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE="$ROOT/backend/.env"
FE="$ROOT/frontend/.env"

if [ $# -lt 3 ]; then
  echo "Usage: $0 <SUPABASE_URL> <ANON_KEY> <SERVICE_ROLE_KEY> [AI_BASE_URL] [AI_API_KEY] [AI_MODEL]"
  echo "Keys are never printed."
  exit 1
fi

SUPABASE_URL="$1"
ANON_KEY="$2"
SERVICE_KEY="$3"
AI_BASE_URL="${4:-http://localhost:11434/v1}"
AI_API_KEY="${5:-}"
AI_MODEL="${6:-llama3.1}"

cat > "$BE" <<EOF
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
AI_BASE_URL=$AI_BASE_URL
AI_API_KEY=$AI_API_KEY
AI_MODEL=$AI_MODEL
AI_TIMEOUT_MS=60000
EOF

# Frontend: disable preview mode, use the real Supabase project.
cat > "$FE" <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_API_BASE_URL=/api
EOF

chmod 600 "$BE" "$FE"
echo "backend/.env + frontend/.env written (preview mode OFF)"
echo "permission 600 (owner only)"
