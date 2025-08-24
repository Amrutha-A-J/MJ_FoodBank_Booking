# Project Overview
Frontend: https://github.com/Amrutha-A-J/MJ_FB_Frontend
Backend: https://github.com/Amrutha-A-J/MJ_FB_Backend


## Environment Variables

`PG_HOST` – PostgreSQL host.

`PG_PORT` – PostgreSQL port.

`PG_USER` – PostgreSQL username.

`PG_PASSWORD` – PostgreSQL password.

`PG_DATABASE` – PostgreSQL database name.

`FRONTEND_ORIGIN` – Comma-separated list of frontend origin URLs allowed for CORS. Defaults to `http://localhost:5173,http://127.0.0.1:5173` if unset.

`JWT_SECRET` – Secret key used to sign and verify JSON Web Tokens. **Required**. Generate a strong random value (e.g., `openssl rand -hex 32`).

`JWT_REFRESH_SECRET` – Secret key used to sign refresh JSON Web Tokens. **Required**. Use a value different from `JWT_SECRET`.

`PORT` – Port for the backend server.

`SMTP_HOST` – SMTP server host (e.g., `smtp.office365.com`).

`SMTP_PORT` – SMTP server port (e.g., `587`).

`SMTP_USER` – Username for SMTP authentication.

`SMTP_PASS` – Password for SMTP authentication.

`SMTP_FROM_EMAIL` – Email address used as the sender.

`SMTP_FROM_NAME` – Optional display name for the sender.

## Authentication Tokens

Login responses now return a JSON Web Token (JWT) instead of a simple `type:id` string. Clients must send this token in the `Authorization` header using the standard Bearer format:

```
Authorization: Bearer <token>
```

The token payload includes the user's `id`, `role`, and `type` and expires after one hour.


