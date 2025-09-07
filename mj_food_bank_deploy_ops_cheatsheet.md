# 🚀 MJ_FoodBank_Booking – Final Deploy & Ops Cheatsheet

**Conventions**
- **Root**: `~/apps/MJ_FoodBank_Booking`
- **Backend**: `MJ_FB_Backend` (PM2 app: `mjfb-api`)
- **Frontend**: `MJ_FB_Frontend` → deployed to `/var/www/mjfb-frontend`
- **Domain**: `https://app.mjfoodbank.org`
- **Rule**: After any `.env` change, use `pm2 restart mjfb-api --update-env`

---

## 1) Local → Push
```bash
git status
git add .
git commit -m "frontend: <change>; backend: <change>"
git push origin main
```

---

## 2) Server Pull & Build (SSH into Lightsail instance)
```bash
cd ~/apps/MJ_FoodBank_Booking
git pull origin master
```

### 2A) Backend (API)
```bash
cd MJ_FB_Backend
npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run build   # if TS → dist
pm2 restart mjfb-api --update-env
pm2 logs mjfb-api --lines 80
```

### 2B) Frontend (React/Vite)
```bash
cd ../MJ_FB_Frontend
npm install
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Deploy to Nginx web root
sudo rm -rf /var/www/mjfb-frontend/*
sudo cp -r dist/* /var/www/mjfb-frontend/
sudo systemctl reload nginx
```

### 2C) Quick Verify
```bash
curl -I https://app.mjfoodbank.org/api/health
sudo journalctl -u nginx -n 50
```

---

## 3) PM2 Essentials
```bash
pm2 list
pm2 describe mjfb-api | egrep "script|cwd|pid"
pm2 logs mjfb-api --lines 100
pm2 restart mjfb-api --update-env
pm2 save
```

**See runtime env actually in use:**
```bash
PID=$(pm2 pid mjfb-api)
cat /proc/$PID/environ | tr '\0' '\n' | egrep 'NODE_ENV|BREVO_|PG|PASSWORD_SETUP_TEMPLATE_ID|EMAIL_ENABLED'
```

---

## 4) Build OOM (“JavaScript heap out of memory”) Fix
**One-off:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Make permanent (`package.json`):**
```json
"scripts": {
  "build": "cross-env NODE_OPTIONS=--max-old-space-size=4096 vite build"
}
```
Install once:
```bash
npm i -D cross-env
```

**If still failing:**
```bash
# Disable source maps (Vite/TS), free RAM, clear caches
rm -rf node_modules dist .vite .turbo && npm ci
pm2 stop mjfb-api   # free memory; start after build
```

---

## 5) Connect to PostgreSQL (Browser SSH Terminal)

### Option A — Connection string
```bash
PGPASSWORD='<DB_PASSWORD>' psql  "host=<DB_HOST> port=5432 dbname=mj_fb_db user=postgres   sslmode=verify-full   sslrootcert=/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem"
```

### Option B — Env vars then `psql`
```bash
export PGHOST=<DB_HOST>
export PGPORT=5432
export PGDATABASE=mj_fb_db
export PGUSER=postgres
export PGPASSWORD='<DB_PASSWORD>'
export PGSSLMODE=verify-full
export PGSSLROOTCERT=/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem

psql
```

**psql tips**
```sql
\dt       -- tables
\du       -- roles
\conninfo -- connection + SSL
\q        -- quit
```

---

## 6) Brevo Email – Fast Diagnostics

**Is key present in live env?**
```bash
PID=$(pm2 pid mjfb-api)
cat /proc/$PID/environ | tr '\0' '\n' | grep BREVO_API_KEY | sed 's/.\{10\}$/**********/'
```

**Server-side test (no code):**
```bash
# (Optional) source env:  source ~/apps/MJ_FoodBank_Booking/MJ_FB_Backend/.env
curl -sS -X POST https://api.brevo.com/v3/smtp/email   -H "accept: application/json"   -H "api-key: $BREVO_API_KEY"   -H "content-type: application/json"   -d '{
    "to":[{"email":"YOUR_TEST_EMAIL@example.com"}],
    "sender":{"email":"'"$BREVO_FROM_EMAIL"'","name":"'"$BREVO_FROM_NAME"'"},
    "subject":"Server test",
    "textContent":"Hello from Lightsail"
  }'
```

**Template send (password setup) – correct payload shape:**
```ts
await axios.post('https://api.brevo.com/v3/smtp/email', {
  to: [{ email }],
  sender: { email: process.env.BREVO_FROM_EMAIL, name: process.env.BREVO_FROM_NAME },
  templateId: Number(process.env.PASSWORD_SETUP_TEMPLATE_ID),  // 6
  params: { token }  // REQUIRED
}, { headers: { 'api-key': process.env.BREVO_API_KEY!, 'content-type': 'application/json', 'accept': 'application/json' }, proxy: false });
```

**Template button URL in Brevo:**
```
https://app.mjfoodbank.org/set-password?token={{params.token}}
```
If landing on `?token=` → your code didn’t send `params.token`.

---

## 7) Nginx Quick Commands
```bash
sudo nginx -t
sudo systemctl reload nginx
sudo journalctl -u nginx -n 100 --no-pager
```

---

## 8) Rollback
```bash
cd ~/apps/MJ_FoodBank_Booking
git reset --hard HEAD~1
git pull origin main
cd MJ_FB_Backend && pm2 restart mjfb-api --update-env
sudo systemctl reload nginx
```

---

## 9) Common Env Gotchas
- Ensure `dotenv` runs **in production** at the **top** of backend entry:
  ```js
  // ESM
  import path from 'path';
  import dotenv from 'dotenv';
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  ```
- Confirm PM2 `cwd` matches `.env` location:
  ```bash
  pm2 describe mjfb-api | egrep "script path|cwd"
  ```
- Always restart with `--update-env` after changes:
  ```bash
  pm2 restart mjfb-api --update-env
  ```

---

## 10) CA Bundle / SSL Fixes

**Symptom:**  
`SELF_SIGNED_CERT_IN_CHAIN` or  
`[PG TLS] CA bundle not found at .../certs/rds-ca-central-1-bundle.pem`

**Fix – 60 seconds:**
```bash
cd ~/apps/MJ_FoodBank_Booking/MJ_FB_Backend
mkdir -p certs
curl -fL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-central-1-bundle.pem" \
  -o certs/rds-ca-central-1-bundle.pem

ls -l certs/rds-ca-central-1-bundle.pem
head -n3 certs/rds-ca-central-1-bundle.pem   # should start with -----BEGIN CERTIFICATE-----

pm2 restart mjfb-api --update-env
pm2 logs mjfb-api --lines 80 | egrep "\\[PG TLS\\]|SELF_SIGNED|Error"
```

**If regional URL fails (403):**
```bash
curl -fL "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" \
  -o certs/rds-global-bundle.pem

export PG_CA_CERT=/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-global-bundle.pem
pm2 restart mjfb-api --update-env
```

**Permissions (ensure readable by PM2 user):**
```bash
sudo chown ubuntu:ubuntu certs/*.pem
sudo chmod 644 certs/*.pem
```

**Verify DB certificate chain:**
```bash
openssl s_client -starttls postgres \
  -connect <DB_HOST>:5432 -servername <DB_HOST> -showcerts </dev/null 2>/dev/null \
  | openssl verify -CAfile certs/rds-ca-central-1-bundle.pem
# Expect: OK
```

**Tip:** Add a `scripts/prestart_fetch_rds_ca.sh` to auto-fetch the bundle before each deploy.
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
CA_LOCAL="certs/rds-ca-central-1-bundle.pem"
if ! [ -s "$CA_LOCAL" ]; then
  curl -fL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-central-1-bundle.pem" -o "$CA_LOCAL"
fi
```
Run before restart:
```bash
bash scripts/prestart_fetch_rds_ca.sh && pm2 restart mjfb-api --update-env
```

---

## 11) Database Maintenance

- **Autovacuum thresholds:** tune database defaults so heavily updated tables
  vacuum sooner:

  ```sql
  ALTER DATABASE mj_fb_db
    SET autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_vacuum_threshold = 50,
        autovacuum_analyze_scale_factor = 0.05,
        autovacuum_analyze_threshold = 50;
  ```

- **Manual `VACUUM ANALYZE`:** run during low traffic (e.g. nightly at 2 AM) to
  keep planner stats fresh:

  ```bash
  VACUUM (ANALYZE);
  ```

  Cron example:

  ```cron
  0 2 * * * psql mj_fb_db -c "VACUUM (ANALYZE);"
  ```

- **Quarterly cleanup:** `REINDEX` or use `pg_repack` on tables with heavy
  churn to trim dead tuples without exclusive locks:

  ```bash
  REINDEX TABLE bookings;
  # or
  pg_repack -h <DB_HOST> -d mj_fb_db -t bookings
  ```

- **Monitor bloat:** log `pg_stat_user_tables` metrics and watch
  `n_dead_tup`/`vacuum_count` for growth. Example check:

  ```sql
  SELECT relname, n_live_tup, n_dead_tup, vacuum_count
  FROM pg_stat_user_tables
  ORDER BY n_dead_tup DESC
  LIMIT 20;
  ```

Record findings in ops notes so trends are visible over time.

