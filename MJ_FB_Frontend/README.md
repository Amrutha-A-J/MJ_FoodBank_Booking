# MJ Food Bank Frontend

This project is the React + Vite front end for the MJ Food Bank booking system. Volunteers can manage recurring bookings from `/volunteer/recurring`.
Authenticated users can access a role-based help page at `/help`. Admins can view all help topics, including client and volunteer guidance.

Volunteers are prompted to install the app on their first visit to volunteer pages. A modal explains offline benefits and installation events are tracked.

Client bookings include a confirmation step that lists the selected date, time, and current-month visit count on separate lines, with an optional client note field for staff.

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

The frontend registers a Workbox-powered service worker that precaches built assets and caches schedule-related API responses. Offline use is not supported; a network connection is still required.

Push notifications use Firebase Cloud Messaging. Define `VITE_FIREBASE_*` variables in `.env` and ensure the service worker handles FCM messages.

## Environment Variables

The frontend requires `VITE_API_BASE` to be defined. Create a `.env` file in this directory with either an absolute or relative URL:

```
VITE_API_BASE=/api
```

or

```
VITE_API_BASE=http://localhost:4000/api
```

The build will fail if this variable is missing.

## Mobile Responsiveness

Layouts are built with Material UI and include CSS adjustments for small screens. Review changes on screens below 600px to ensure components remain usable.
Pantry and volunteer schedules switch to a card-based layout on phones for easier viewing.
