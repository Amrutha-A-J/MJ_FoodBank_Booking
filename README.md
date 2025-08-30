# MJ FoodBank Booking

This repository uses Git submodules for the backend and frontend components. After cloning, make sure to pull in the submodules and install their dependencies.

Individuals who use the food bank are referred to as clients throughout the application.

The `clients` table uses `client_id` as its primary key. Do not reference an `id` column for clients; always use `client_id` in database queries and API responses.

## Contribution Guidelines

- Use Node.js 18 or later for development; the backend relies on the native `fetch` API.
- The frontend requires a live internet connection; offline caching or offline-first optimizations must not be added.
- Run the relevant backend and frontend test suites (`npm test`) after making changes.
- Update `AGENTS.md` with new repository instructions.
- Reflect user-facing or setup changes in this `README.md`.

## Features

 - Appointment booking workflow for clients with automatic approval and rescheduling.
- Staff or agency users can create bookings for unregistered clients via `/bookings/new-client`; the email field is optional, so bookings can be created without an email address. Staff can list or delete these pending clients through `/new-clients` routes and the Client Management **New Clients** tab.
- Volunteer role management and scheduling restricted to trained areas.
- Staff can review past volunteer shifts from the **Pending Reviews** tab and mark them completed or no_show.
- Only staff can update volunteer trained roles; volunteers may view but not modify their assigned roles from the dashboard.
- Daily reminder jobs queue emails for next-day bookings and volunteer shifts using the backend email queue. Each job now runs via `node-cron` at `0 9 * * *` Regina time and exposes start/stop functions.
- A nightly cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved bookings as `no_show`.
- A nightly volunteer no-show cleanup job runs via `node-cron` at `0 20 * * *` Regina time to mark past approved volunteer bookings as `no_show` after `VOLUNTEER_NO_SHOW_HOURS` (default `24`) hours and emails coordinators about the changes.
- Coordinator notification emails for volunteer booking changes are configured via `MJ_FB_Backend/src/config/coordinatorEmails.json`.
- Milestone badge awards send a template-based thank-you card via email and expose the card link through the stats endpoint.
- Reusable Brevo email utility allows sending templated emails with custom properties and template IDs.
- Backend email queue retries failed sends with exponential backoff and persists jobs in an `email_queue` table so retries survive restarts. The maximum retries and initial delay are configurable.
- Accounts for clients, volunteers, staff, and agencies are created without passwords; a one-time setup link directs them to `/set-password` for initial password creation.
- After setting a password, users are redirected to the login page for their role.
- `POST /auth/resend-password-setup` reissues this link when the original token expires. Requests are rate limited by email or client ID.
- Volunteers see a random appreciation message on each login with a link to download their card when available.
- Volunteers also see rotating encouragement messages on the dashboard when no milestone is reached.
- Volunteer dashboard hides shifts already booked by the volunteer and shows detailed error messages from the server when requests fail.
- Conflicting volunteer shift requests return a 409 with both the attempted and existing shift details; resolve conflicts via `POST /volunteer-bookings/resolve-conflict`.
- Volunteer schedule prevents navigating to past dates and hides shifts that have already started.
- Volunteer badges are calculated from activity and manually awardable. Manual awards are issued via `POST /volunteers/me/badges`. `GET /volunteers/me/stats` returns earned badges along with lifetime hours, this month's hours, total completed shifts, and current streak. Only shifts marked as `completed` contribute to hours and shift totals; `approved` or `no_show` shifts are ignored. The endpoint also flags milestones at 5, 10, and 25 shifts so the dashboard can show a celebration banner.
- The stats endpoint now provides a milestone message and contribution totals (`familiesServed`, `poundsHandled`) along with current-month figures (`monthFamiliesServed`, `monthPoundsHandled`) so the dashboard can display appreciation.
- Volunteer leaderboard endpoint `GET /volunteer-stats/leaderboard` returns your rank and percentile.
  The volunteer dashboard shows “You're in the top X%!” based on this data.
- Staff can retrieve a no-show ranking via `GET /volunteer-stats/no-show-ranking` to highlight
  volunteers who frequently miss booked shifts. The volunteer management dashboard displays this ranking.
- Group volunteer stats endpoint `GET /volunteer-stats/group` aggregates total hours,
  weekly and monthly pounds handled, and distinct families served this month, returning
  current-month hours alongside a configurable goal for dashboard progress.
- Volunteer dashboard now highlights weekly pounds distributed, a progress gauge
  toward the monthly hours goal, a highlight of the month, and rotating
  appreciation quotes.
- Volunteer dashboard includes a line chart showing monthly shift counts and top role contributions to illustrate the contribution trend.
- Volunteer dashboard groups badges, lifetime hours, this month's hours, total shifts, and current streak into a single stats card.
- Volunteer search results display profile details, role editor, and booking history side by side in a card layout.
- Volunteer role assignment uses a simple dropdown without search capability.
- Volunteer bookings are auto-approved with no submitted state and appear immediately on schedules.
- Volunteer booking statuses include `completed`, and cancelling a booking now requires a reason.
- Admins can manage volunteer master roles, sub-roles, and their shifts from the Volunteer Settings page. Deleting a master role also removes its sub-roles and shifts. Deleting sub-roles and shifts now requires confirmation to avoid accidental removal. Sub-roles are created via a dedicated dialog that captures the sub-role name and initial shift, while additional shifts use a separate dialog.
- Staff can restore volunteer roles and shifts to their original defaults via `POST /volunteer-roles/restore` or the Volunteer Settings page's **Restore Original Roles & Shifts** button.
- Walk-in visit tracking (`clientVisits`) via [clientVisitController](MJ_FB_Backend/src/controllers/clientVisitController.ts).
- Staff can mark bookings as no-show or visited through `/bookings/:id/no-show` and `/bookings/:id/visited` endpoints.
- Walk-in bookings created via `/bookings/preapproved` are saved with status `approved` (the `preapproved` status has been removed).
- Staff can record visits directly from a booking in the pantry schedule. Selecting **Visited** in the booking dialog captures cart weights and creates the visit record before marking the booking visited.
- Adding a client visit automatically updates any approved booking for that client on the same date to `visited`.
- The Manage Booking dialog now displays the client's name, a link to their profile, and their visit count for the current month to assist staff decisions.
- Client booking history tables can filter bookings by `visited` and `no_show` statuses.
 - Booking requests are automatically approved; the submitted state has been removed.
 - Booking confirmations display "Shift booked"; the volunteer dashboard shows only approved bookings.
- Booking history endpoint `/bookings/history` accepts `includeVisits=true` to include walk-in visits in results.
- Agencies can supply `clientIds`, `limit`, and `offset` to `/bookings/history` for multi-client, paginated booking history.
- Agencies can list bookings for their linked clients via `/bookings?clientIds=1,2`.
 - **Volunteer Recurring Bookings** let volunteers schedule repeating shifts with start and end dates, choose daily, weekly, or weekday patterns, and cancel individual occurrences or the remaining series.
 - Recurring volunteer bookings and recurring blocked slots handled by [volunteerBookingController](MJ_FB_Backend/src/controllers/volunteer/volunteerBookingController.ts) and [recurringBlockedSlots routes](MJ_FB_Backend/src/routes/recurringBlockedSlots.ts). Volunteers can create new series and manage existing ones from separate tabs on the **Recurring Bookings** page.
- Donor and event management modules ([donorController](MJ_FB_Backend/src/controllers/donorController.ts), [eventController](MJ_FB_Backend/src/controllers/eventController.ts)).
- Self-service client registration with email OTP verification (currently disabled pending further testing).
- Warehouse management pages for donations, surplus, pig pound, and exports using `write-excel-file`.
- Staff can set a cart tare value and a single maximum booking capacity applied to all pantry time slots through the Admin → Pantry Settings page or `PUT /slots/capacity`.
- Bread and can surplus weight multipliers are configurable via the Admin → Warehouse Settings page.
- Volunteer roles and shifts are managed through the Admin → Volunteer Settings page.
- `/volunteer-roles` now returns each role with `id` representing the role ID (the `role_id` field has been removed).
- Creating volunteer role slots (`POST /volunteer-roles`) accepts either an existing `roleId` or a new `name` with `categoryId`.
- Volunteer role start and end times are selected via a native time picker and stored as `HH:MM:SS`.
- Listing volunteer roles (`GET /volunteer-roles`) accepts `includeInactive=true` to return inactive shifts.
- Slot listing endpoint `/slots` returns an empty array and 200 status on holidays. Each slot includes an `overbooked` flag when approved bookings exceed `max_capacity`, and the `available` count never goes below zero.
- Staff can add or remove holidays from the Manage Availability page, which persists changes to the backend.
- Holiday listings via `GET /holidays` are available to agencies so booking interfaces can disable those dates.

## Clone and initialize submodules

```bash
git clone <repository-url>
cd MJ_FoodBank_Booking
git submodule update --init --recursive
```

## Backend setup (`MJ_FB_Backend`)

Prerequisites:
- Node.js 18 or later and npm (uses the built-in `fetch`; earlier versions are not supported)

Install and run:
```bash
cd MJ_FB_Backend
npm install
npm start   # or npm run dev
```

The database schema is managed via TypeScript migrations in `src/migrations`; run `npm run migrate` to apply them. The command logs each executed migration or any failures to the console so you can track what ran.

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
| `FRONTEND_ORIGIN` | Allowed origins for CORS and base URL for password setup links (comma separated; empty entries are ignored) |
| `PORT` | Port for the backend server (defaults to 4000) |
| `BREVO_API_KEY` | Brevo API key for transactional emails |
| `BREVO_FROM_EMAIL` | Email address used as the sender |
| `BREVO_FROM_NAME` | Optional sender name displayed in emails |
| `EMAIL_QUEUE_MAX_RETRIES` | Max retry attempts for failed email jobs (default 5) |
| `EMAIL_QUEUE_BACKOFF_MS` | Initial backoff delay in ms for email retries (default 1000) |
| `PASSWORD_SETUP_TEMPLATE_ID` | Brevo template ID for invitation and password reset emails |
| `PASSWORD_SETUP_TOKEN_TTL_HOURS` | Hours until password setup tokens expire (default 24) |

### Invitation flow

New clients, volunteers, staff, and agencies are created without passwords. The backend generates a one-time token and emails a setup link using the Brevo template defined by `PASSWORD_SETUP_TEMPLATE_ID`. The link points to `/set-password` on the first origin listed in `FRONTEND_ORIGIN`.
After setting a password, users are redirected to the login page for their role.

### Agency setup

1. **Create an agency** – as staff, call `POST /agencies` with the agency details:

   ```bash
   curl -X POST http://localhost:4000/agencies \
     -H "Authorization: Bearer <staff-token>" \
    -H "Content-Type: application/json" \
    -d '{"name":"Sample Agency","email":"agency@example.com","contactInfo":"123-4567"}'
  ```

   The endpoint emails a password setup link and returns the new agency ID. You can also create one directly in SQL if needed:

   ```bash
   node -e "console.log(require('bcrypt').hashSync('secret123', 10))"
   psql -U $PG_USER -d $PG_DATABASE \
     -c "INSERT INTO agencies (name,email,password) VALUES ('Sample Agency','agency@example.com','<hashed-password>');"
   ```

2. **Assign clients to the agency** – authenticate as staff or the
   agency and call the API:

   ```bash
  # As staff assigning client 42 to agency 1
  curl -X POST http://localhost:4000/agencies/add-client \
    -H "Authorization: Bearer <token>" \
   -H "Content-Type: application/json" \
   -d '{"agencyId":1,"clientId":42}'

   # As the agency itself
   curl -X POST http://localhost:4000/agencies/add-client \
     -H "Authorization: Bearer <agency-token>" \
    -H "Content-Type: application/json" \
    -d '{"agencyId":1,"clientId":42}'
  ```

   In these examples, `clientId` is the public identifier from the `clients`
   table (`clients.client_id`), which also serves as the table's primary key.

  A client may be linked to only one agency at a time. If the client is
  already associated with another agency, the request returns a `409 Conflict`
  response containing that agency's name. Supplying a `clientId` that doesn't
  exist results in a `404 Not Found` error.

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
- Node.js 18 or later and npm

Install and run:
```bash
cd MJ_FB_Frontend
npm install
npm start   # or npm run dev
```

### Environment variables

The frontend requires `VITE_API_BASE` to point to the backend API. Create a `.env` file in `MJ_FB_Frontend` with:

```
VITE_API_BASE=http://localhost:4000
```

The build will fail if this variable is missing.

Refer to the submodule repositories for detailed configuration and environment variables.

The backend surplus tracking feature uses two optional environment variables to
set default multipliers; values are editable in the Admin → Warehouse Settings
page and cached on the server:

- `BREAD_WEIGHT_MULTIPLIER` (default `10`)
- `CANS_WEIGHT_MULTIPLIER` (default `20`)

### Frontend features

- Pages are organized into feature-based directories (e.g., booking, staff, volunteer-management, warehouse-management).
- A shared dashboard component lives in `src/components/dashboard`.
- Includes a reusable `FeedbackSnackbar` component for concise user notifications.
- Warehouse dashboard aggregates donations and shipments in real time, so manual rebuilds are no longer needed.
- Page and form titles render in uppercase with a lighter font weight for clarity.
- Admin staff creation page provides a link back to the staff list for easier navigation.
- Admin navigation includes Pantry Settings and Volunteer Settings pages.
- Pantry Settings page lets staff configure a cart tare value and one max booking capacity used for all pantry times.
- Pantry schedule cells use color coding: rgb(228,241,228) for approved, rgb(255, 200, 200) for no-show, rgb(111,146,113) for visited, and the theme's warning light for capacity exceeded.
- Filled pantry schedule slots display the client's ID in parentheses, or show `[NEW CLIENT] Name` when booked for an unregistered individual.
- Staff can book new clients directly from the pantry schedule's **Assign User** modal by checking **New client** and entering a name (email and phone optional).
- Agencies can book appointments for their associated clients via the Agency → Book Appointment page. Clients load once and appear only after entering a search term, avoiding long lists. The page hides the client list after a selection and uses a single “Book Appointment” heading for clarity.
- Agencies can view slot availability and cancel or reschedule bookings for their clients using the standard booking APIs.
- Agency navigation offers Dashboard, Book Appointment, Booking History, Clients, and Schedule pages, all behind an `AgencyGuard`.
- Agency profile page shows the agency's name, email, and contact info with editable fields and password reset support.
- Agency navigation offers Dashboard, Book Appointment, and Booking History pages, all behind an `AgencyGuard`.
- Staff can add agencies and assign clients to them through the Harvest Pantry → Agency Management page. The **Add Client to Agency** tab initially shows only agency search; selecting an agency reveals a client search column and the agency's client list for managing associations.
- Pantry Visits page includes a search field to filter visits by client name or ID.

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
