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
curl -I https://app.mjfoodbank.org/api/v1/health
sudo journalctl -u nginx -n 50
```

### 2D) Post-deploy smoke checklist (production)
> Use the Ops test accounts in 1Password (Ops Test Staff, Ops Test Client, Ops Test Volunteer). Replace placeholder IDs in the examples before running them.

1. **Confirm client booking create/reschedule/cancel APIs**
   ```bash
   # Sign in as Ops Test Client to capture session cookies
   curl -c client.cookies -X POST https://app.mjfoodbank.org/api/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"clientId":"<CLIENT_ID>","password":"<CLIENT_PASSWORD>"}'

   # Create a pantry booking for the next available slot
   curl -b client.cookies -X POST https://app.mjfoodbank.org/api/v1/bookings \
     -H 'content-type: application/json' \
     -d '{"slotId":<SLOT_ID>,"date":"<YYYY-MM-DD>","note":"post-deploy check"}'
   # ✅ Expect 201 with JSON containing `id`, `slot_id`, and status `approved`.

   # Fetch booking history to confirm it lists the new visit
   curl -b client.cookies 'https://app.mjfoodbank.org/api/v1/bookings/history?past=false'
   # ✅ Expect 200 with a JSON array including the booking ID created above.

   # Use the token from the booking confirmation email (or `/bookings/history` payload) to test reschedule and cancel
   curl -X POST https://app.mjfoodbank.org/api/v1/bookings/reschedule/<RESCHEDULE_TOKEN> \
     -H 'content-type: application/json' \
     -d '{"slotId":<NEW_SLOT_ID>,"date":"<YYYY-MM-DD>"}'
   # ✅ Expect 200 with `message: "Booking rescheduled"`, refreshed `rescheduleToken`, and new slot times.

   curl -X POST https://app.mjfoodbank.org/api/v1/bookings/cancel/<CANCEL_TOKEN>
   # ✅ Expect 200 with `{ "message": "Booking cancelled" }`; confirm the booking disappears from the upcoming list.
   ```

2. **Validate volunteer booking endpoints**
   ```bash
   # Sign in as Ops Test Volunteer
   curl -c volunteer.cookies -X POST https://app.mjfoodbank.org/api/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"ops.volunteer@example.com","password":"<VOLUNTEER_PASSWORD>"}'

   # Book the next available volunteer shift
   curl -b volunteer.cookies -X POST https://app.mjfoodbank.org/api/v1/volunteer-bookings \
     -H 'content-type: application/json' \
     -d '{"roleId":<VOLUNTEER_SLOT_ID>,"date":"<YYYY-MM-DD>","note":"post-deploy check"}'
   # ✅ Expect 201 with a `booking` payload showing status `approved`.

   # Exercise reschedule and cancel via tokenized routes
   curl -X POST https://app.mjfoodbank.org/api/v1/volunteer-bookings/reschedule/<VOL_RESCHEDULE_TOKEN> \
     -H 'content-type: application/json' \
     -d '{"roleId":<NEW_VOLUNTEER_SLOT_ID>,"date":"<YYYY-MM-DD>"}'
   # ✅ Expect 200 with `{ "message": "Booking rescheduled", "rescheduleToken": "..." }` and updated slot times.

   curl -X PATCH https://app.mjfoodbank.org/api/v1/volunteer-bookings/<BOOKING_ID>/cancel
   # ✅ Expect 200 with `{ "message": "Booking cancelled" }` and the booking is removed from `/volunteer-bookings/mine`.
   ```

3. **Verify pantry schedule availability APIs**
   ```bash
   # Staff token from Ops Test Staff account
   curl -c staff.cookies -X POST https://app.mjfoodbank.org/api/v1/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"ops.staff@example.com","password":"<STAFF_PASSWORD>"}'

   curl -b staff.cookies 'https://app.mjfoodbank.org/api/v1/slots/range?start=<YYYY-MM-DD>&end=<YYYY-MM-DD>'
   # ✅ Expect 200 with `slots` array covering the requested date range.
   ```

4. **Exercise pantry visit CRUD**
   ```bash
   # Create visit
   curl -b staff.cookies -X POST https://app.mjfoodbank.org/api/v1/client-visits \
     -H 'content-type: application/json' \
     -d '{"date":"<YYYY-MM-DD>","clientId":<CLIENT_ID>,"adults":2,"children":1,"weightWithCart":0,"weightWithoutCart":0}'
   # ✅ Expect 201 with the new visit object (including `id` and `clientName`).

   # Update visit
   curl -b staff.cookies -X PUT https://app.mjfoodbank.org/api/v1/client-visits/<VISIT_ID> \
     -H 'content-type: application/json' \
     -d '{"date":"<YYYY-MM-DD>","clientId":<CLIENT_ID>,"adults":3,"children":0,"weightWithCart":0,"weightWithoutCart":0}'
   # ✅ Expect 200 with the updated visit payload.

   # Verify toggle and delete
   curl -b staff.cookies -X PATCH https://app.mjfoodbank.org/api/v1/client-visits/<VISIT_ID>/verify
   # ✅ Expect 200 with the visit payload showing `verified: true`.

   curl -b staff.cookies -X DELETE https://app.mjfoodbank.org/api/v1/client-visits/<VISIT_ID>
   # ✅ Expect 200 with `{ "message": "Deleted" }` and the visit removed from `/client-visits` listing.
   ```

5. **Record a warehouse donation log entry**
   ```bash
   curl -b staff.cookies -X POST https://app.mjfoodbank.org/api/v1/warehouse/donations \
     -H 'content-type: application/json' \
     -d '{"date":"<YYYY-MM-DD>","donorId":<DONOR_ID>,"weight":25}'
   # ✅ Expect 201 with donation `id`, donor details, and weight.

   curl -b staff.cookies 'https://app.mjfoodbank.org/api/v1/warehouse/donations?month=<YYYY-MM>'
   # ✅ Expect 200 with the new donation present; remove it when finished:
   curl -b staff.cookies -X DELETE https://app.mjfoodbank.org/api/v1/warehouse/donations/<DONATION_ID>
   ```

6. **UI spot checks (optional but fast)**
   - `/client/book` → create/reschedule/cancel workflow completes without console errors.
   - `/volunteer/schedule` → booking cards render the shift created above.
   - `/staff/pantry/schedule` → reflects slot updates and cleared bookings.
   - `/staff/warehouse/donation-log` → shows the QA donation entry and supports delete after verification.

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

---

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

## 11) Nightly Jobs

- `cleanupNoShows` and `cleanupVolunteerNoShows` run nightly at **20:00** Regina time.
- Verify last run via logs:
  ```bash
  pm2 logs mjfb-api --lines 100 | egrep 'clean up no-shows|volunteer no-shows'
  ```
- `vacuumJob` runs `VACUUM (ANALYZE)` on `bookings`, `volunteer_bookings`, and `email_queue` nightly at **01:00** Regina time. Check logs with:
  ```bash
  pm2 logs mjfb-api --lines 100 | grep 'VACUUM ANALYZE'
  ```

## 12) Database Maintenance

- **Set autovacuum thresholds** so vacuum runs before tables bloat:
  ```bash
  psql -c "ALTER DATABASE mj_fb_db \
    SET autovacuum_vacuum_scale_factor = 0.05, \
        autovacuum_analyze_scale_factor = 0.05, \
        autovacuum_vacuum_threshold = 50, \
        autovacuum_analyze_threshold = 50;"
  ```
- **Nightly vacuum job** runs automatically; run a full-database `VACUUM (ANALYZE, VERBOSE)` manually only if needed:
  ```bash
  PGPASSWORD='<DB_PASSWORD>' psql "host=<DB_HOST> port=5432 dbname=mj_fb_db user=postgres sslmode=verify-full sslrootcert=/home/ubuntu/apps/MJ_FoodBank_Booking/MJ_FB_Backend/certs/rds-ca-central-1-bundle.pem" -c 'VACUUM (ANALYZE, VERBOSE);'
  ```
- **Quarterly `REINDEX` or `pg_repack`** for heavy tables (run first day of each quarter at 3 AM):
  ```cron
  0 3 1 */3 * pg_repack --table bookings --dbname=mj_fb_db --host <DB_HOST> --username postgres --no-superuser-check >> /var/log/mjfb_repack.log 2>&1
  ```
- **Monitor table bloat**:
  ```bash
  psql -c "SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE n_dead_tup > 0 ORDER BY n_dead_tup DESC LIMIT 20;"
  ```
  Review results monthly and record actions in ops notes.

