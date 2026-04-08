#!/bin/bash

# ─────────────────────────────────────────────
#  Asset Management Locker — Setup Script
# ─────────────────────────────────────────────

set -e

echo ""
echo "======================================"
echo "  Asset Management Locker — Setup"
echo "======================================"
echo ""

# ── 1. Check Node.js ──────────────────────
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Install it from https://nodejs.org (LTS recommended)"
  exit 1
fi
echo "✅  Node.js $(node -v) found"

# ── 2. Check MySQL ────────────────────────
if ! command -v mysql &> /dev/null; then
  echo "❌  MySQL not found. Install it: brew install mysql  (Mac) or via https://dev.mysql.com/downloads/"
  exit 1
fi
echo "✅  MySQL found"

# ── 3. Install npm packages ───────────────
echo ""
echo "📦  Installing dependencies..."
npm install
echo "✅  Dependencies installed"

# ── 4. Set up .env ────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️   .env file created from .env.example"
  echo "    👉  Open .env and fill in your values before continuing."
  echo ""
  read -p "Press Enter once you've updated .env to continue..."
else
  echo "✅  .env already exists"
fi

# ── 5. Set up MySQL database ──────────────
echo ""
echo "🗄️   Setting up MySQL database..."
echo "    (You may be prompted for your MySQL root password)"
echo ""

DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)

mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" < database/setup.sql
echo "✅  Database ready"

# ── 6. Done ───────────────────────────────
echo ""
echo "======================================"
echo "  Setup complete! 🎉"
echo ""
echo "  Run the app:"
echo "    npm start          (production)"
echo "    npm run dev        (development, auto-reload)"
echo ""
echo "  Default admin login:"
echo "    Email:    admin@yourdomain.com"
echo "    Password: Admin@123"
echo "    ⚠️  Change this after first login!"
echo "======================================"
echo ""
