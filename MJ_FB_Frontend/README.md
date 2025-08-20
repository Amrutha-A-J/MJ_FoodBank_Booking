# MJ Food Bank Frontend

This project is the React + Vite front end for the MJ Food Bank booking system.

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

## Progressive Web App

The app registers a service worker when running in a secure context. Use HTTPS when serving the built site.

- `npm run preview` serves the production build over HTTPS.
- The Docker image uses Nginx configured for HTTPS. Provide `tls.crt` and `tls.key` under `/etc/nginx/certs`.

## Mobile Responsiveness

Layouts are built with Material UI and include CSS adjustments for small screens. Review changes on screens below 600px to ensure components remain usable.
