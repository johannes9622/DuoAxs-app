#!/usr/bin/env bash
# Register local webhook forwarding with Stripe CLI (dev)
# Usage: ./scripts/register-webhook.sh
set -euo pipefail
PORT="${1:-4000}"
echo "Starting Stripe CLI forwarding to http://localhost:${PORT}/webhooks/stripe"
stripe listen --forward-to "localhost:${PORT}/webhooks/stripe"
