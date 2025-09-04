# Timesheets

Staff can record daily hours and submit pay periods.

Staff access timesheets at `/timesheet` and leave management at `/leave-requests`
from the **Hello** menu in the top-right corner. Admins can review periods at
`/admin/timesheet` and vacation requests at `/admin/leave-requests` from the
Admin menu. Admins select a staff member before viewing their periods.

## Setup

1. Start the backend once so `setupDatabase` creates the pay period, timesheet, and leave tables. All future schema changes must be implemented via migrations instead of editing `setupDatabase`:

```bash
cd MJ_FB_Backend
npm run migrate
```

2. Pay periods are seeded automatically on backend startup via the
   `seedPayPeriods` utility. A cron job runs every **Nov 30** to generate
   pay periods for the upcoming year. Seed a custom range manually if you
   need additional periods:

```bash
node src/utils/payPeriodSeeder.ts START_DATE END_DATE
```

3. Timesheets for staff are created on startup and refreshed daily by a cron
   job. If the `staff` table includes an `active` column, only active staff are
   processed. You can seed them manually for the current pay period if
   necessary:

```bash
node src/utils/timesheetSeeder.ts
```

## Pay periods

Each timesheet belongs to a `pay_periods` row. Pay periods typically span two
weeks and the seeder ensures every active staff member has a timesheet covering
the current period.

## Stat holidays and OT banking

A database trigger auto-fills stat holidays with the day's expected hours.
Staff can adjust these hours if needed. The same trigger validates that paid
hours do not exceed eight per day.

Overtime is banked via the `ot_hours` field. When a period is submitted, any
shortfall is covered by available OT bank and the remaining balance is reported
in `summary.ot_bank_remaining`.

## Leave approval workflow

Staff can request vacation or sick leave by posting to
`/timesheets/:id/leave-requests` with a leave `type`. Pending requests appear
under the same path and globally via `/api/leave/requests` for admins.
Approving a request applies the chosen leave hours to that day and locks it
from editing; rejection simply removes the request.

## Email settings

Timesheet submissions and leave approvals send notifications through the Brevo
email queue. Configure the following backend environment variables:

```bash
BREVO_API_KEY=your_api_key
BREVO_FROM_EMAIL=noreply@example.com
BREVO_FROM_NAME="MJ Food Bank"
TIMESHEET_APPROVER_EMAILS=admin1@example.com,admin2@example.com # optional
```

## API usage

- `GET /timesheets/mine` – list pay periods for the logged in staff member.
- `GET /timesheets` – admins can list pay periods for all staff and may filter with `?staffId=`.
- `GET /timesheets/:id/days` – list daily entries for a timesheet. Admins may retrieve any staff timesheet.
- `PATCH /timesheets/:id/days/:date` – update hours for a day. Body accepts `regHours`, `otHours`, `statHours`, `sickHours`, `vacHours`, and optional `note`.
- `POST /timesheets/:id/submit` – submit a pay period.
- `POST /timesheets/:id/reject` – reject a submitted timesheet (admin only).
- `POST /timesheets/:id/process` – mark a timesheet as processed and exportable (admin only).
- `POST /timesheets/:id/leave-requests` – request leave for a day with `date`,
  `hours`, and `type` (`vacation` or `sick`).
- `GET /timesheets/:id/leave-requests` – list leave requests awaiting review.
- `POST /timesheets/leave-requests/:requestId/approve` – approve a leave request, applying vacation hours and locking the day.
- `GET /api/leave/requests` – list all leave requests (admin only).
- `POST /api/leave/requests` – submit a leave request for the logged in staff
  member with `startDate`, `endDate`, `type`, and optional `reason`.

## UI walkthrough

![Timesheet entry form](https://via.placeholder.com/600x400?text=Timesheet+Entry+Form)

![Timesheet summary](https://via.placeholder.com/600x400?text=Timesheet+Summary)

## Payroll export

After a timesheet is processed, staff can download the period as a CSV using the **Export CSV** action. The file lists one row per day with the following columns:

| Column       | Description                  |
| ------------ | ---------------------------- |
| `date`       | Work date                    |
| `reg`        | Regular hours                |
| `ot`         | Overtime hours               |
| `stat`       | Stat holiday hours           |
| `sick`       | Sick hours                   |
| `vac`        | Vacation hours               |
| `note`       | Free-form note               |
| `paid_total` | Total paid hours for the day |

Stat holidays are auto-filled with the day's expected hours. Days may also be locked when leave is approved.

## Localization

Add the following translation strings to locale files:

- `timesheets.title`
- `timesheets.date`
- `timesheets.reg`
- `timesheets.ot`
- `timesheets.stat`
- `timesheets.sick`
- `timesheets.vac`
- `timesheets.note`
- `timesheets.paid_total`
- `timesheets.lock_leave_tooltip`
- `timesheets.submit`
- `timesheets.reject`
- `timesheets.process`
- `timesheets.approve_leave`
- `timesheets.summary.totals`
- `timesheets.summary.expected`
- `timesheets.summary.shortfall`
- `timesheets.summary.ot_bank_remaining`
- `timesheets.add_row`
- `timesheets.remove_row`
- `timesheets.export_csv`
- `timesheets.payroll_export`
- `timesheets.staff`
- `timesheets.select_staff`
- `help.pantry.timesheets.title`
- `help.pantry.timesheets.description`
- `help.pantry.timesheets.steps.0`
- `help.pantry.timesheets.steps.1`
- `help.pantry.timesheets.steps.2`
- `help.pantry.timesheets.steps.3`
- `leave.title`
- `leave.start_date`
- `leave.end_date`
- `leave.hours`
- `leave.reason`
- `leave.status.pending`
- `leave.status.approved`
- `leave.status.rejected`
