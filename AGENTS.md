# Development Guide

## Pull Request Guidelines

- Ensure tests are added or updated for any code changes and run the relevant test suites after each task.
- Use Node.js 22+; run `nvm use` to switch to the pinned version in `.nvmrc`.
- Keep recurring-booking tests current in both the backend and frontend whenever this feature changes.
- Update this `AGENTS.md` file and the repository `README.md` to reflect any new instructions or user-facing changes.
- Provide translations only for client-visible pages (e.g., client dashboard, navbar and submenus, profile, booking, booking history). Internal or staff-only features should remain untranslated unless explicitly requested. Document these translation strings in `docs/` and update `MJ_FB_Frontend/src/locales` when client-visible text is added.
- Pantry visits track daily sunshine bag weights and client counts via the `sunshine_bag_log` table.
- Anonymous pantry visits display "(ANONYMOUS)" after the client ID and their family size is excluded from the summary counts.
- Bulk pantry visit imports use the `POST /client-visits/import` endpoint (also available at `/visits/import`) and overwrite existing visits when client/date duplicates are found; see `docs/pantryVisits.md` for sheet naming and dry-run options.
- Client visits enforce a unique client/date combination; attempts to record a second visit for the same client and day return a 409 error.
- Booking notes consist of **client notes** (entered when booking) and **staff notes** (recorded during visits). Staff users automatically receive staff notes in booking history responses, while agency users can include them with `includeStaffNotes=true`.
- Keep `docs/timesheets.md` current with setup steps, API usage, payroll CSV export details, UI screenshots, and translation keys whenever the timesheet feature changes.
- A cron job seeds pay periods for the upcoming year every **Nov 30** using `seedPayPeriods`.
- Deployments are performed manually; follow the steps in the repository `README.md` under "Deploying to Azure".
- Always document new environment variables in the repository README and `.env.example` files.
- Implement all database schema changes via migrations in `MJ_FB_Backend/src/migrations`; do not modify `src/setupDatabase.ts` for schema updates.
- Use `write-excel-file` for spreadsheet exports instead of `sheetjs` or `exceljs`.
- Use the shared `PasswordField` component for any password input so users can toggle visibility.

See `MJ_FB_Backend/AGENTS.md` for backend-specific guidance and `MJ_FB_Frontend/AGENTS.md` for frontend-specific guidance.
