# Development Guide

## Pull Request Guidelines

- Ensure tests are added or updated for any code changes and run the relevant test suites after each task.
- Keep recurring-booking tests current in both the backend and frontend whenever this feature changes.
- Update this `AGENTS.md` file and the repository `README.md` to reflect any new instructions or user-facing changes.
- Document translation strings for localization in `docs/` and update `MJ_FB_Frontend/src/locales` when user-facing text is added.
- Keep `docs/timesheets.md` current with setup steps, API usage, payroll CSV export details, UI screenshots, and translation keys whenever the timesheet feature changes.
- A cron job seeds pay periods for the upcoming year every **Nov 30** using `seedPayPeriods`.
- A GitHub Actions workflow in `.github/workflows/release.yml` builds, tests, and deploys container images to Azure Container Apps. Configure repository secrets `AZURE_CREDENTIALS`, `REGISTRY_LOGIN_SERVER`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD` and variables `AZURE_RESOURCE_GROUP`, `BACKEND_APP_NAME`, and `FRONTEND_APP_NAME`; see `docs/release.md` for details.
- Document new environment variables in the repository README and `.env.example` files.
- Use `write-excel-file` for spreadsheet exports instead of `sheetjs` or `exceljs`.

See `MJ_FB_Backend/AGENTS.md` for backend-specific guidance and `MJ_FB_Frontend/AGENTS.md` for frontend-specific guidance.
