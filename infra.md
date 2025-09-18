# DuoAxs Infra Deployment Guide

This doc shows how to quickly bootstrap DuoAxs on **Render**, **Fly.io**, or **Dokku**.

---

## Render
1. Create a new **Postgres** instance on Render.
2. Deploy API as a Web Service from `apps/api/backend`.
   - Env vars: `JWT_SECRET`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, etc.
3. Deploy Admin and Member as **Static Sites** with build command:
   ```bash
   npm install && npm run build
   ```

## Fly.io
1. Install Fly CLI and run `fly launch` inside `apps/api/backend`.
2. Set envs with `fly secrets set JWT_SECRET=...`.
3. Do the same for `apps/admin` and `apps/member`.

## Dokku
1. On a Dokku host:
   ```bash
   dokku apps:create duoaxs-api
   dokku postgres:create duoaxs-db
   dokku postgres:link duoaxs-db duoaxs-api
   ```
2. Push your API repo to Dokku remote.
3. Repeat for admin/member apps.

---
Tip: always set `NEXT_PUBLIC_API_BASE=https://api.duoaxs.com` for Admin and Member builds.
