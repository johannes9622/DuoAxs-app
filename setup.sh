#!/usr/bin/env bash
# Dokku quick setup (run these on your Dokku server with a git push deploy workflow)
set -euo pipefail
APP_API=duoaxs-api
dokku apps:create $APP_API || true
dokku config:set $APP_API NODE_ENV=production PORT=4000
dokku postgres:create duoaxs-db || true
dokku postgres:link duoaxs-db $APP_API || true
echo "Now set STRIPE_* keys and JWT_SECRET: dokku config:set $APP_API STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... JWT_SECRET=..."
echo "Deploy with: git push dokku main"
