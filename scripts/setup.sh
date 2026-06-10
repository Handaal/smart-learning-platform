#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────────────
# STEP Platform — First-run setup script
# Run from the project root: bash scripts/setup.sh
# ────────────────────────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
AI="$ROOT/ai-services"
TESTS="$ROOT/tests"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   STEP Platform — setup                         ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Backend install ──────────────────────────────────────────
echo "▶ Installing backend dependencies..."
cd "$BACKEND"
npm install

# ── 2. Frontend install ─────────────────────────────────────────
echo "▶ Installing frontend dependencies..."
cd "$FRONTEND"
npm install

# ── 3. Tests install ────────────────────────────────────────────
echo "▶ Installing test @types/jest..."
cd "$TESTS"
npm install

# ── 4. Python AI services ───────────────────────────────────────
echo "▶ Setting up Python AI services..."
cd "$AI"
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
source .venv/Scripts/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null || true
pip install -q -r requirements.txt

# ── 5. Environment files ────────────────────────────────────────
echo "▶ Checking .env files..."
if [ ! -f "$BACKEND/.env" ]; then
  cp "$BACKEND/.env.example" "$BACKEND/.env"
  echo "  ✓ Created backend/.env from .env.example — please edit before running."
else
  echo "  ✓ backend/.env exists."
fi

# ── 6. Generate Prisma client ───────────────────────────────────
echo "▶ Generating Prisma client..."
cd "$BACKEND"
npx prisma generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your DATABASE_URL and JWT_SECRET"
echo "  2. docker compose up db redis -d"
echo "  3. cd backend && npx prisma migrate dev"
echo "  4. npm run db:seed"
echo "  5. docker compose up -d"
echo ""
