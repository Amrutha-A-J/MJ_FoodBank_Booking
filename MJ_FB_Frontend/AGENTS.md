# Frontend Development Guide

## Testing
- Run `npm test` from the `MJ_FB_Frontend` directory for frontend changes.
- Always run tests through `npm test` so `jest.setup.ts` applies required polyfills and sets a default `VITE_API_BASE`; invoking Jest directly can skip this setup.
- Tests polyfill `global.fetch` with `undici` via top-level assignments in `tests/setupFetch.ts`. Ensure this file remains configured in Jest's setup files.
- Environment variables for tests reside in `.env.test`, which Jest loads via `loadEnv.ts`. Run tests with `npm test` so these variables are applied.

## Environment
- Requires Node.js 22+; run `nvm use` to match the version in `.nvmrc`.
- `VITE_API_BASE` defaults to the versioned API at `/api/v1`.

## Project Layout
- React app built with Vite.
- Build requires `VITE_API_BASE` to be set in `MJ_FB_Frontend/.env`.
- `pages/` define top-level views and are organized into feature-based directories (booking, staff, volunteer-management, warehouse-management, etc.).
- Client pages include `<ClientBottomNav />`, and volunteer pages include `<VolunteerBottomNav />` for consistent navigation.
- Delivery clients see **Book Delivery** and **Delivery History** routes. The booking form fetches categories from `/delivery/categories`, enforces each category's `maxItems` limit, requires address/phone/email details, and submits to `/delivery/orders`.
- The Pantry tab under Admin → Settings lets staff manage delivery categories and items; these settings shape the options shown on Book Delivery.
- `components/` provide reusable UI elements; use `FeedbackSnackbar` for notifications. The dashboard UI lives in `components/dashboard`.
- `api/` wraps server requests.
- `utils/`, `types.ts`, and theming files manage helpers, typings, and Material UI themes.
- Administrative pages enable staff to manage volunteer master roles and edit volunteer role slots.
- Volunteer Settings provides separate dialogs for creating sub-roles (with an initial shift) and for adding or editing shifts.
- Deleting sub-roles and shifts prompts confirmation dialogs to prevent accidental removal.
- Users complete initial password creation at `/set-password` using a token from the setup email.
- After setting a password, users are redirected to `/login`.
- The password setup page shows a role-specific login reminder and a button linking to the login page.
- Volunteer role start and end times use a native time picker; `saveRole` expects `HH:MM:SS` strings.
- Staff coordinate partner-managed clients from the Harvest Pantry booking tools. The staff-only Add Client tab includes partner search, a client list with removal confirmations, and keeps results hidden until a partner is selected.
- Partner-assisted appointments are created, cancelled, and rescheduled by staff on behalf of the client; partner logins no longer expose booking or history pages.
- Volunteer navigation includes a **Recurring Bookings** submenu for managing repeating shifts; keep related documentation up to date.
- Volunteer management pages include quick links for Search Volunteer, Volunteer Schedule, Daily Bookings, and Ranking.
- Staff access timesheets and leave requests from the profile menu; admins review them under Admin → Timesheets and Admin → Leave Requests.
- The pantry schedule's **Assign User** modal lets staff add an existing client to the app when search returns no match. Click **Add existing client to the app** to create a shopper by client ID with online access disabled and assign the slot. Bookings for unregistered individuals still appear as `[NEW CLIENT] Name`.

## Development Guidelines
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Admin settings: use Admin → Settings for configuration—Pantry tab manages cart tare and pantry slot capacity, Warehouse tab handles bread/can weight multipliers, and Volunteer tab manages volunteer roles. Fetch these values from the backend rather than hard-coding or using environment variables.
- A service worker caches static assets and schedule-related API responses for performance, but a live internet connection is still required; full offline use is not supported.

## UI Rules & Design System
### Tech & Theme
- Library: Material UI v5 only (no Tailwind).
- Theme: Use the app’s `ThemeProvider` theme (primary `#941818`, Golos font, rounded corners). Never hard-code colors, spacing, or fonts—pull from the theme.
- Typography: Default to theme typography. Section titles use `subtitle1`/`h5` with bold as defined in theme.
- Typography: Default to theme typography. Page and form titles use uppercase `h4`/`h5` variants with a slightly lighter font weight.

### Layout
- Grid: Use `Grid` with `spacing={2}` for page layout; prefer 12-column responsive layouts.
- Cards: Group related content in `Card` (or `Paper`) with the themed light border and subtle shadow. Avoid “floating” elements.
- Responsive: Ensure components work on xs→xl. Hide non-critical details on small screens, not critical actions.

### Components & Patterns
 - Buttons: default to `size="medium"`; use `size="small"` only when space is limited. Primary actions use `variant="contained"`; outlined/text for secondary/tertiary. No ALL CAPS; `textTransform: 'none'`.
- Lists: `List` + `ListItem` for short, actionable sets.
- Tables: Use dense row height; keep actions in a trailing column; keep columns ≤ 7 on desktop.
- Forms: Use `TextField`, `Select`, `Checkbox`, `Radio` from MUI. For password inputs, use the shared `PasswordField` component so users can toggle visibility. Label every field; show helper text for constraints. Validate on blur and on submit; show inline errors and a top summary only if multiple errors exist.
  - Text inputs default to `size="medium"` to provide comfortable tap targets on mobile; override to `small` only when space is limited.
- Form containers: Wrap forms in a container centered horizontally and vertically within the viewport.
- Feedback: Use the shared `FeedbackSnackbar` for success/info/error; avoid custom alerts. Keep messages short and specific.
- Loading: Prefer skeletons for cards/lists; use `CircularProgress` inline for button-level waits; never block entire pages without a reason.
- Empty States: Show a short explainer + primary action (e.g., “No bookings yet — Book an appointment”).
- Icons: Use `@mui/icons-material`. Pair icons with labels (accessibility + clarity).

### Status & Colors
- Status chips:
  - success = approved/ok,
  - warning = needs attention,
  - error = failed,
  - default/info = neutral.
- Never hard-code hex values; use theme palette (`success`, `warning`, `error`, `info`).
- Links & Emphasis: Use the theme’s primary color for emphasis and links; do not introduce new accent colors.
- Pantry schedule cells use the following colors:
  - approved → rgb(228,241,228),
  - no_show → rgb(255, 200, 200),
  - visited → rgb(111,146,113),
  - capacity exceeded → theme warning light.

### Interactions
- Affordance: Primary action visible and enabled when valid; disabled state must include a reason (helper text or tooltip).
- Confirmation: Only confirm destructive actions (e.g., Cancel, Reject). Use dialogs with clear verb-first buttons (“Cancel booking”, “Keep booking”).
- Undo: Prefer “Undo” in `FeedbackSnackbar` where safe (e.g., client-side remove before API commit).

### Content Style
- Copy: Plain, concise, second person (“You”).
- Dates/Times: Show local time with clear format (e.g., Tue, Aug 12 · 9:30–10:00). Avoid ambiguity.
