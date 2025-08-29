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
- Volunteer search results display profile details, role editor, and booking history side by side in a card layout.
- Volunteer role assignment uses a simple dropdown without search capability.
- Admins can manage volunteer master roles, sub-roles, and their shifts from the Volunteer Settings page. Deleting a master role also removes its sub-roles and shifts. Deleting sub-roles and shifts now requires confirmation to avoid accidental removal. Sub-roles are created via a dedicated dialog that captures the sub-role name and initial shift, while additional shifts use a separate dialog.
- Staff can restore volunteer roles and shifts to their original defaults via `POST /volunteer-roles/restore` or the Volunteer Settings page's **Restore Original Roles & Shifts** button.
- Walk-in visit tracking (`clientVisits`) via [clientVisitController](MJ_FB_Backend/src/controllers/clientVisitController.ts).
- Staff can mark bookings as no-show or visited through `/bookings/:id/no-show` and `/bookings/:id/visited` endpoints.
- Walk-in bookings created via `/bookings/preapproved` are saved with status `approved` (the `preapproved` status has been removed).
- Staff can record visits directly from a booking in the pantry schedule. Selecting **Visited** in the booking dialog captures cart weights and creates the visit record before marking the booking visited.
- Adding a client visit automatically updates any approved booking for that client on the same date to `visited`.
- The Manage Booking dialog now displays the client's name, a link to their profile, and their visit count for the current month to assist staff decisions.
- Client booking history tables can filter bookings by `visited` and `no_show` statuses.
- Agencies can view booking histories for all their clients with status filters and lazy-loaded pagination.
- Booking requests are automatically approved or rejected; the pending approval workflow has been removed.
- Booking history endpoint `/bookings/history` accepts `includeVisits=true` to include walk-in visits in results.
- Recurring volunteer bookings and recurring blocked slots handled by [volunteerBookingController](MJ_FB_Backend/src/controllers/volunteer/volunteerBookingController.ts) and [recurringBlockedSlots routes](MJ_FB_Backend/src/routes/recurringBlockedSlots.ts).
- Donor and event management modules ([donorController](MJ_FB_Backend/src/controllers/donorController.ts), [eventController](MJ_FB_Backend/src/controllers/eventController.ts)).
- Self-service client registration with email OTP verification ([userController](MJ_FB_Backend/src/controllers/userController.ts)).
- Warehouse management pages for donations, surplus, pig pound, and exports using `write-excel-file`.
- Configurable cart tare and surplus weight multipliers managed through the Admin → App Configurations page, accessible via the Admin menu.
- Staff can set a single maximum booking capacity applied to all pantry time slots through the Admin → Pantry Settings page or `PUT /slots/capacity`.
- `/volunteer-roles` now returns each role with `id` representing the role ID (the `role_id` field has been removed).
- Creating volunteer role slots (`POST /volunteer-roles`) accepts either an existing `roleId` or a new `name` with `categoryId`.
- Volunteer role start and end times are selected via a native time picker and stored as `HH:MM:SS`.
- Listing volunteer roles (`GET /volunteer-roles`) accepts `includeInactive=true` to return inactive shifts.
- Slot listing endpoint `/slots` returns an empty array and 200 status on holidays. Each slot includes an `overbooked` flag when approved bookings exceed `max_capacity`, and the `available` count never goes below zero.

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
npm start   # or npm run dev
```

The database schema is managed via TypeScript migrations in `src/migrations`; run `npm run migrate` to apply them.

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

1. **Create an agency** – as staff, call `POST /agencies` with the agency details:

   ```bash
   curl -X POST http://localhost:4000/agencies \
     -H "Authorization: Bearer <staff-token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Sample Agency","email":"agency@example.com","password":"Secret123!","contactInfo":"123-4567"}'
   ```

   The endpoint hashes the password and returns the new agency ID. You can also create one directly in SQL if needed:

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

   A client may be linked to only one agency at a time. If the client is
   already associated with another agency, the request returns a `409 Conflict`
   response containing that agency's name.

   Remove a client with
   `DELETE /agencies/:id/clients/:clientId` (use `me` for the authenticated agency).

   List clients for an agency with
   `GET /agencies/:id/clients` (use `me` for the authenticated agency).

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
- Admin navigation includes Pantry Settings and Volunteer Settings pages.
- Pantry Settings page lets staff configure one max booking capacity used for all pantry times.
- Pantry schedule cells use color coding: rgb(228,241,228) for approved, rgb(255, 200, 200) for no-show, rgb(111,146,113) for visited, and the theme's warning light for capacity exceeded.
- Filled pantry schedule slots display the client's ID in parentheses next to their name.
- Staff can add agencies and assign clients to them through the Harvest Pantry → Agency Management page. The **Add Client to Agency** tab initially shows only agency search; selecting an agency reveals a client search column and the agency's client list for managing associations.

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
