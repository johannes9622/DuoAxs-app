# DuoAxs – Email + Stripe Seed + One‑Click Deploy

This overlay adds:
- **Email sending** for magic links (Postmark preferred, SES fallback).
- **Stripe seeding** script to create products/prices for 12/20/36 credits.
- **Webhook helper** to forward events in dev via Stripe CLI.
- **One‑click deploy configs**: Fly.io (`fly.toml`), Render (`render.yaml`), Dokku helper script.

## 1) Enable email
- Pick a provider via `EMAIL_PROVIDER=postmark|ses|console` in `apps/api/backend/.env`.
- Postmark: set `POSTMARK_TOKEN` + `EMAIL_FROM`.
- SES: set `SES_REGION`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY`, `EMAIL_FROM` (verified).

The magic-link route now sends an email and still returns the link for dev.

## 2) Seed Stripe products/prices
```bash
cd apps/api/backend
STRIPE_SECRET_KEY=sk_test_... node scripts/seed.stripe.mjs
# copy the printed PRICE_*/CREDITS_* into .env
```

## 3) Dev webhook
```bash
cd apps/api/backend
./scripts/register-webhook.sh
```

## 4) Deploy
- **Fly.io** (API only here; host Admin/Member on Vercel/Netlify or add separate apps):
  - Install flyctl → `fly launch --no-deploy` (use existing `fly.toml`) → `fly deploy`.
- **Render**: click “New + From repo” and Render will read `render.yaml` to provision API, Admin, Member, and Postgres.
- **Dokku**:
  ```bash
  scp -r deploy/dokku your@server:
  ssh your@server 'bash deploy/dokku/setup.sh'
  # then push your repo: git remote add dokku dokku@your.server:duoaxs-api ; git push dokku main
  ```
