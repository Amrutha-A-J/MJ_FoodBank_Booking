# Repository Instructions

- For changes in `MJ_FB_Backend`, run `npm test` from the `MJ_FB_Backend` directory.
- For changes in `MJ_FB_Frontend`, run `npm test` from the `MJ_FB_Frontend` directory.

## Application Structure
- `MJ_FB_Backend`: Node.js + Express API written in TypeScript.
  - `controllers/` contain business logic for each resource.
  - `routes/` expose REST endpoints and connect to controllers.
  - `models/` and `db.ts` manage PostgreSQL access.
  - `middleware/` holds reusable Express middleware (authentication, validation, etc.).
  - `schemas/`, `types/`, and `utils/` centralize validation, shared types, and helpers.
- `MJ_FB_Frontend`: React app built with Vite.
  - `pages/` define top-level views.
  - `components/` provide reusable UI elements like `FeedbackSnackbar` for user notifications.
  - `api/` wraps server requests.
  - `utils/`, `types.ts`, and theming files manage helpers, typings, and Material UI themes.

## Functional Overview
### Backend
- The Express server configures CORS, initializes default slots, and mounts route modules for users, slots, bookings, holidays, blocked slots, breaks, staff, volunteer roles and bookings, and authentication before starting the service
- Booking logic checks slot capacity, enforces monthly visit limits, and sends confirmation emails when a booking is created
- JWT-based middleware extracts tokens from headers or cookies, verifies them, and loads the matching staff, user, or volunteer record from PostgreSQL
- A setup script provisions PostgreSQL tables for slots, users, staff, volunteer roles, bookings, breaks, and related data when the server starts

### Frontend
- The React app manages authentication for shoppers, staff, and volunteers, switching between login components and role-specific navigation/routes such as slot booking, schedule management, and volunteer coordination
- `SlotBooking` provides a calendar view that excludes weekends and holidays, fetches available slots, and submits bookings via the API
- Staff manage holidays, blocked slots, and staff breaks through `ManageAvailability`, which pulls data from and sends updates to the backend API
- Volunteers view role-specific schedules and request, cancel, or reschedule bookings through `VolunteerSchedule`
- Reusable Material UI components include a responsive `Navbar` and a `FeedbackSnackbar` for consistent UI and notifications

## Basic Requirements
- Preserve the separation between controllers, routes, models, and middleware in the backend.
- Use Zod schemas for validation and keep TypeScript types in sync.
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Document new environment variables in the repository README and `.env.example` files.
