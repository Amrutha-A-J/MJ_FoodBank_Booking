# Project Overview

Frontend: https://github.com/Amrutha-A-J/MJ_FB_Frontend
Backend: https://github.com/Amrutha-A-J/MJ_FB_Backend
Run `npm run migrate` to apply TypeScript database migrations from `src/migrations`.


## Requirements

- Node.js 22 or later is required for native `fetch` support; earlier versions are not supported.

## Environment Variables

`PG_HOST` – PostgreSQL host.

`PG_PORT` – PostgreSQL port.

`PG_USER` – PostgreSQL username.

`PG_PASSWORD` – PostgreSQL password.

`PG_DATABASE` – PostgreSQL database name.

`FRONTEND_ORIGIN` – Comma-separated list of frontend origin URLs allowed for CORS. Empty entries are ignored. Defaults to `http://localhost:5173,http://127.0.0.1:5173` if unset.

`JWT_SECRET` – Secret key used to sign and verify JSON Web Tokens. **Required**. Generate a strong random value (e.g., `openssl rand -hex 32`).

`JWT_REFRESH_SECRET` – Secret key used to sign refresh JSON Web Tokens. **Required**. Use a value different from `JWT_SECRET`.

`COOKIE_DOMAIN` – Optional domain attribute for authentication cookies. Set when cookies should be shared across subdomains.

Authentication cookies are scoped to the `/` path and use the same options when cleared.

`PORT` – Port for the backend server.

`BREVO_API_KEY` – Brevo API key for sending transactional emails.

`BREVO_FROM_EMAIL` – Email address used as the sender.

`BREVO_FROM_NAME` – Optional display name for the sender.

`PASSWORD_SETUP_TOKEN_TTL_HOURS` – Hours until password setup tokens expire (default 24).

`PASSWORD_SETUP_TEMPLATE_ID` – Brevo template ID used for password setup emails.

`VOLUNTEER_NO_SHOW_HOURS` – Hours to wait before marking a volunteer shift as no-show (default 24).

Tests mock these variables via `tests/setupEnv.ts`. Update that file when adding new required environment settings.

## Password Policy

Passwords must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character. Requests with weak passwords are rejected before hashing.

## Authentication Tokens

Login responses now return a JSON Web Token (JWT) instead of a simple `type:id` string. Clients must send this token in the `Authorization` header using the standard Bearer format:

```
Authorization: Bearer <token>
```

The token payload includes the user's `id`, `role`, and `type` and expires after one hour.

## Donation Aggregations Endpoint

`GET /donations/aggregations?year=YYYY`

Returns a list of donors with their total donated weight for each month of the specified year.
Every donor in the system is included even if they have no donations in that year; months
without records report `0`.



## Warehouse Overall Available Years Endpoint

`GET /warehouse-overall/years`

Returns an array of years for which warehouse summary data exists, ordered from most recent to oldest.
