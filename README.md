# MJ FoodBank Booking

This repository uses Git submodules for the backend and frontend components. After cloning, make sure to pull in the submodules and install their dependencies.

Individuals who use the food bank are referred to as clients throughout the application.

## Clone and initialize submodules

```bash
git clone <repository-url>
cd MJ_FoodBank_Booking
git submodule update --init --recursive
```

## Backend setup (`MJ_FB_Backend`)

Prerequisites:
- Node.js and npm

Install and run:
```bash
cd MJ_FB_Backend
npm install
npm run migrate up   # Run pending database migrations
npm start   # or npm run dev
```

### Environment variables

Create a `.env` file in `MJ_FB_Backend` with the following variables. The server fails to start if any required variable is missing.

| Variable | Description |
| --- | --- |
| `PG_HOST` | PostgreSQL host |
| `PG_PORT` | PostgreSQL port |
| `PG_USER` | PostgreSQL username |
| `PG_PASSWORD` | PostgreSQL password |
| `PG_DATABASE` | PostgreSQL database name |
| `JWT_SECRET` | Secret used to sign JWT tokens. Generate a strong random value, e.g., `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh JWT tokens. Use a different strong value from `JWT_SECRET`. |
| `FRONTEND_ORIGIN` | Allowed origins for CORS (comma separated) |
| `PORT` | Port for the backend server (defaults to 4000) |
| `SMTP_HOST` | SMTP server host (e.g., `smtp.office365.com`) |
| `SMTP_PORT` | SMTP server port (e.g., `587`) |
| `SMTP_USER` | Username for SMTP authentication |
| `SMTP_PASS` | Password for SMTP authentication |
| `SMTP_FROM_EMAIL` | Email address used as the sender |
| `SMTP_FROM_NAME` | Optional sender name displayed in emails |

You can generate a secure `JWT_SECRET` with:

```bash
openssl rand -hex 32
```

**Production note:** The backend issues cookies with the `secure` flag when `NODE_ENV` is not `development`. Ensure that your production deployment uses HTTPS so these cookies are transmitted to clients.

## Frontend setup (`MJ_FB_Frontend`)

Prerequisites:
- Node.js and npm

Install and run:
```bash
cd MJ_FB_Frontend
npm install
npm start   # or npm run dev
```

Refer to the submodule repositories for detailed configuration and environment variables.

The backend surplus tracking feature uses two optional environment variables to
control weight calculations:

- `BREAD_WEIGHT_MULTIPLIER` (default `10`)
- `CANS_WEIGHT_MULTIPLIER` (default `20`)

### Frontend features

- Includes a reusable `FeedbackSnackbar` component for concise user notifications.

## Deploying to Azure

The repository includes Dockerfiles for both the backend and frontend so the application can be containerized and run in Azure services such as Azure Web App for Containers or Azure Container Apps.

1. Build and push the images to an Azure Container Registry:

```bash
# Backend
cd MJ_FB_Backend
docker build -t <registry>.azurecr.io/mjfb-backend .
docker push <registry>.azurecr.io/mjfb-backend

# Frontend
cd ../MJ_FB_Frontend
docker build -t <registry>.azurecr.io/mjfb-frontend .
docker push <registry>.azurecr.io/mjfb-frontend
```

2. Create Azure resources (Web App or Container App) pointing to the images.

3. Configure the environment variables in the Azure portal using the provided `.env.example` files. Ensure `JWT_SECRET` is set to a strong value.

This setup prepares the project so it can be hosted on Azure with containerized services.
