# Maintenance Mode

Admin users can schedule downtime and toggle maintenance mode from **Admin → Maintenance**.
When active, maintenance mode prevents normal access and shows a message to clients. Staff can still sign in to disable maintenance.
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
