# MJ Food Bank Frontend

This project is the React + Vite front end for the MJ Food Bank booking system. Volunteers can manage recurring bookings from `/volunteer/recurring`.
Staff volunteer management pages include quick links for searching volunteers, viewing the volunteer schedule, and reviewing daily bookings.

Volunteers are prompted to install the app on their first visit to volunteer pages. A modal explains offline benefits and installation events are tracked.

Client bookings include a confirmation step that lists the selected date, time, and current-month visit count on separate lines, with an optional client note field for staff.

## Donor Dashboard

Staff with **donor_management** permission can review donor revenue, retention, and trend visualizations from **Donor Management → Dashboard**. The dashboard reuses the trends chart component introduced for donor insights so future analytics can plug into the same visualization pattern.

## Node Version

Use **Node.js 22+**. Run `nvm use` to switch to the version pinned in the repository’s `.nvmrc`.

## Development

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Run the test suite:

```bash
npm test
```

Run tests with `npm test` so `.env.test` and `jest.setup.ts` execute, providing required environment variables and polyfills.
`jest.setup.ts` provides global test configuration and remains referenced in `jest.config.cjs` via `setupFilesAfterEnv`.

## Service Worker

The frontend registers a Workbox-powered service worker that precaches built assets, caches schedule, booking history, and profile API responses, and serves an offline fallback page when navigation fails. Booking actions made while offline are queued and retried in the background once connectivity returns. A network connection is still recommended for full functionality.

Each production build stamps the service worker with a unique cache version so clients automatically discard old runtime caches when a deployment goes live. You can override the generated version by setting a `BUILD_VERSION` environment variable before running `npm run build`.

## Environment Variables

The frontend requires `VITE_API_BASE` to be defined. Create a `.env` file in this directory with either an absolute or relative URL:

```
VITE_API_BASE=/api/v1
```

or

```
VITE_API_BASE=http://localhost:4000/api/v1
```

The build will fail if this variable is missing.

## Mobile Responsiveness

Layouts are built with Material UI and include CSS adjustments for small screens. Review changes on screens below 600px to ensure components remain usable.
Pantry and volunteer schedules switch to a card-based layout on phones for easier viewing.
