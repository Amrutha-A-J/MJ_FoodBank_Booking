# Frontend Development Guide

## Help Page Maintenance
- Update `src/pages/help/content.ts` whenever user-facing features or routes change so the Help page remains accurate.
- Before merging a pull request, ensure new routes and UI elements are reflected in the Help page:
  - [ ] Added or modified a user-facing route or UI element?
  - [ ] Updated `src/pages/help/content.ts` accordingly?
  - [ ] Verified that the Help page renders the change?
- Admins can view all help sections, including client and volunteer topics.

## Testing
- Run `npm test` from the `MJ_FB_Frontend` directory for frontend changes.
- Always run tests through `npm test` so `jest.setup.ts` applies required polyfills and sets a default `VITE_API_BASE`; invoking Jest directly can skip this setup.
- Tests polyfill `global.fetch` with `undici` via top-level assignments in `tests/setupFetch.ts`. Ensure this file remains configured in Jest's setup files.
- Tests load required environment variables from `tests/setupEnv.ts`, which is listed in Jest's `setupFilesAfterEnv`. When running a test file directly, import `'../setupEnv'` so these variables are set, or run the test through Jest.

## Project Layout
- React app built with Vite.
- Build requires `VITE_API_BASE` to be set in `MJ_FB_Frontend/.env`.
- `pages/` define top-level views and are organized into feature-based directories (booking, staff, volunteer-management, warehouse-management, etc.).
- `components/` provide reusable UI elements; use `FeedbackSnackbar` for notifications. The dashboard UI lives in `components/dashboard`.
- `api/` wraps server requests.
- `utils/`, `types.ts`, and theming files manage helpers, typings, and Material UI themes.
- Administrative pages enable staff to manage volunteer master roles and edit volunteer role slots.
- Volunteer Settings provides separate dialogs for creating sub-roles (with an initial shift) and for adding or editing shifts.
- Deleting sub-roles and shifts prompts confirmation dialogs to prevent accidental removal.
- Users complete initial password creation at `/set-password` using a token from the setup email.
- A language selector is available on the login, forgot password, set password, client dashboard, book appointment, booking history, profile, and help pages; avoid adding page-specific selectors elsewhere.
- After setting a password, users are redirected to the login page for their role.
- Volunteer role start and end times use a native time picker; `saveRole` expects `HH:MM:SS` strings.
- Staff can assign clients to agencies from the Harvest Pantry → Agency Management page via the **Add Client to Agency** tab, which includes agency search, client listing, and removal confirmations. Initially, the page shows only agency search; selecting an agency reveals a two-column layout with client search on the left and the agency's client list on the right.
- Agencies can book appointments for their associated clients from the Agency → Book Appointment page. Clients load once and display only after entering a search term, with filtering performed client-side to avoid long lists.
- Agency navigation provides Dashboard, Book Appointment, and Booking History pages, all protected by `AgencyGuard`.
- Agencies can view pantry slot availability and manage bookings—including creating, cancelling, and rescheduling—for their linked clients.
- Volunteer navigation includes a **Recurring Bookings** submenu for managing repeating shifts; keep related documentation up to date.
- Staff access timesheets and leave requests from the profile menu; admins review them under Admin → Timesheets and Admin → Leave Requests.
- The pantry schedule's **Assign User** modal includes a **New client** option; selecting it lets staff enter a name (with optional email and phone) and books the slot via `POST /bookings/new-client`. These bookings appear on the schedule as `[NEW CLIENT] Name`.

## Development Guidelines
- In the frontend, favor composition of reusable components and keep pages focused on layout and data flow.
- Use `FeedbackSnackbar` for user feedback instead of custom alert implementations.
- Admin settings: use Admin → Settings for configuration—Pantry tab manages cart tare and pantry slot capacity, Warehouse tab handles bread/can weight multipliers, and Volunteer tab manages volunteer roles. Fetch these values from the backend rather than hard-coding or using environment variables.
- The frontend requires a live internet connection; offline caching or offline-first optimizations must not be added.

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
- Buttons: `size="small"`, `variant="contained"` for primary actions, outlined/text for secondary/tertiary. No ALL CAPS; `textTransform: 'none'`.
- Lists: `List` + `ListItem` for short, actionable sets.
- Tables: Use dense row height; keep actions in a trailing column; keep columns ≤ 7 on desktop.
- Forms: Use `TextField`, `Select`, `Checkbox`, `Radio` from MUI. Label every field; show helper text for constraints. Validate on blur and on submit; show inline errors and a top summary only if multiple errors exist.
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
