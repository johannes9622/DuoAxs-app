# TLS Setup for DuoAxs

This repo ships with `deploy/nginx/nginx.conf` that supports HTTPS.

## Steps
1. Install certbot on the host:
   ```bash
   sudo apt install certbot
   ```

2. Issue certs for your domains:
   ```bash
   sudo certbot certonly --nginx -d api.duoaxs.com -d admin.duoaxs.com -d app.duoaxs.com
   ```

3. Reload nginx:
   ```bash
   docker-compose restart nginx
   ```

Certs live at `/etc/letsencrypt/live/<domain>/` and auto-renew with certbot timer.
