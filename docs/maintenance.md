# Maintenance Mode

Admin users can schedule downtime and toggle maintenance mode from **Admin → Maintenance**.
When active, maintenance mode prevents normal access and shows a message to clients. Staff can still sign in to disable maintenance, but all other logins and API requests return a 503 response.
A scheduled window displays an upcoming maintenance banner to clients.

## Translation keys

| Key | Description |
| --- | --- |
| `maintenance_mode_title` | Title shown when the site is in maintenance mode. |
| `maintenance_mode_message` | Message displayed to users during maintenance. |
| `upcoming_maintenance_title` | Title for the scheduled maintenance notice. |
| `upcoming_maintenance_notice` | Text describing the upcoming maintenance window. |

Clients see the upcoming notice if a maintenance window is scheduled and the maintenance
message if maintenance mode is currently enabled.

## Historical data purge

Admins can trigger a manual cleanup of legacy records from **Admin → Maintenance → Delete Older
Records**. Select one or more data sets, pick a cutoff date before the current year, and confirm the
deletion. The UI enforces the whitelist and cutoff rules, shows the affected tables in the
confirmation dialog, and reports success or failure in a snackbar.

The same cleanup is available directly through `POST /api/v1/maintenance/purge`. The request body
must include:

- `tables`: an array of whitelisted table names such as `bookings`, `client_visits`,
  `volunteer_bookings`, `donations`, `monetary_donations`, `pig_pound_log`,
  `outgoing_donation_log`, `surplus_log`, or `sunshine_bag_log`.
- `before`: a cutoff date (`YYYY-MM-DD`) that must fall before January 1 of the current year.

The purge endpoint refreshes pantry, warehouse, and sunshine bag aggregates for affected
months, archives volunteer totals, deletes rows older than the cutoff inside a transaction,
and VACUUMs each table. Requests using non-whitelisted tables or current-year dates are
rejected with a 400 response to prevent accidental data loss.
