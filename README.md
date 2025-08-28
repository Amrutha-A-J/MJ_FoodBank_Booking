# MJ FoodBank Booking

This repository uses Git submodules for the backend and frontend components. After cloning, make sure to pull in the submodules and install their dependencies.

Individuals who use the food bank are referred to as clients throughout the application.

## Contribution Guidelines

- Run the relevant backend and frontend test suites (`npm test`) after making changes.
- Update `AGENTS.md` with new repository instructions.
- Reflect user-facing or setup changes in this `README.md`.

## Features

- Appointment booking workflow for clients with staff approval and rescheduling.
- Volunteer role management and scheduling restricted to trained areas.
- Walk-in visit tracking (`clientVisits`) via [clientVisitController](MJ_FB_Backend/src/controllers/clientVisitController.ts).
- Staff can record visits directly from booking management using the `ManageBookingDialog`,
  capturing cart weights and marking bookings as visited.
- Recurring volunteer bookings and recurring blocked slots handled by [volunteerBookingController](MJ_FB_Backend/src/controllers/volunteer/volunteerBookingController.ts) and [recurringBlockedSlots routes](MJ_FB_Backend/src/routes/recurringBlockedSlots.ts).
- Donor and event management modules ([donorController](MJ_FB_Backend/src/controllers/donorController.ts), [eventController](MJ_FB_Backend/src/controllers/eventController.ts)).
- Self-service client registration with email OTP verification ([userController](MJ_FB_Backend/src/controllers/userController.ts)).
- Warehouse management pages for donations, surplus, pig pound, and exports using `write-excel-file`.
- Configurable cart tare and surplus weight multipliers managed through Admin → App Configurations.

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

The latest migrations add support for agency logins (`agencies`, `agency_clients`),
recurring volunteer bookings (`volunteer_recurring_bookings`) and email OTP verification
(`client_email_verifications`). Run the migrate command after pulling updates so these
tables exist in your database.

### Environment variables

Create a `.env` file in `MJ_FB_Backend` with the following variables. The server fails to start if any required variable is missing.

| Variable | Description |
| --- | --- |
| `PG_HOST` | PostgreSQL host |
| `PG_PORT` | PostgreSQL port |
| `PG_USER` | PostgreSQL username |
| `PG_PASSWORD` | PostgreSQL password |
| `PG_DATABASE` | PostgreSQL database name |
| `JWT_SECRET` | Secret used to sign JWT tokens for clients, staff, volunteers, and agencies. Generate a strong random value, e.g., `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh JWT tokens for all roles. Use a different strong value from `JWT_SECRET`. |
| `FRONTEND_ORIGIN` | Allowed origins for CORS (comma separated) |
| `PORT` | Port for the backend server (defaults to 4000) |
| `SMTP_HOST` | SMTP server host (e.g., `smtp.office365.com`) |
| `SMTP_PORT` | SMTP server port (e.g., `587`) |
| `SMTP_USER` | Username for SMTP authentication |
| `SMTP_PASS` | Password for SMTP authentication |
| `SMTP_FROM_EMAIL` | Email address used as the sender |
| `SMTP_FROM_NAME` | Optional sender name displayed in emails |

### Agency setup

1. **Create an agency** – hash a password and insert a row into the
   `agencies` table. For example:

   ```bash
   node -e "console.log(require('bcrypt').hashSync('secret123', 10))"
   psql -U $PG_USER -d $PG_DATABASE \
     -c "INSERT INTO agencies (name,email,password) VALUES ('Sample Agency','agency@example.com','<hashed-password>');"
   ```

2. **Assign clients to the agency** – authenticate as staff or the
   agency and call the API:

   ```bash
   # As staff assigning client 42 to agency 1
   curl -X POST http://localhost:4000/agencies/1/clients \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"clientId":42}'

   # As the agency itself
   curl -X POST http://localhost:4000/agencies/me/clients \
     -H "Authorization: Bearer <agency-token>" \
     -H "Content-Type: application/json" \
     -d '{"clientId":42}'
   ```

   Remove a client with
   `DELETE /agencies/:id/clients/:clientId` (use `me` for the authenticated agency).

### Password Requirements

All API endpoints that create or change passwords enforce the following rules:
- Minimum length of 8 characters
- Must include uppercase, lowercase, numeric, and special characters
Requests with passwords that do not meet these requirements are rejected before hashing.

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

- Pages are organized into feature-based directories (e.g., booking, staff, volunteer-management, warehouse-management).
- A shared dashboard component lives in `src/components/dashboard`.
- Includes a reusable `FeedbackSnackbar` component for concise user notifications.
- Admin staff creation page provides a link back to the staff list for easier navigation.

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
