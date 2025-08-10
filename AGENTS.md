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

## Basic Requirements
- Preserve the separation between controllers, routes, models, and middleware in the backend.
- Use Zod schemas for validation and keep TypeScript types in sync.
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Document new environment variables in the repository README and `.env.example` files.
