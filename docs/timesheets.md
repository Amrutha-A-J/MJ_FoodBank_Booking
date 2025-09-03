# Timesheets

Staff can record daily hours and submit pay periods.

Staff access timesheets at `/timesheet` and leave management at `/leave-requests`
from the **Hello** menu in the top-right corner. Admins can review periods at
`/admin/timesheet` and vacation requests at `/admin/leave-requests` from the
Admin menu. The admin view lets reviewers select a staff member and pay period
to approve or reject submissions.

## Setup

1. Start the backend once so `setupDatabase` creates the pay period, timesheet, and leave tables.
   Future schema updates can still be applied via migrations:

```bash
cd MJ_FB_Backend
npm run migrate
```

2. Insert biweekly records into the `pay_periods` table so each period has a
   `start_date` and `end_date`.

3. Seed current pay periods for active staff (optional):

```bash
node src/utils/timesheetSeeder.ts
```

## Pay periods

Each timesheet belongs to a `pay_periods` row. Pay periods typically span two
weeks and the seeder ensures every active staff member has a timesheet covering
the current period.

## Stat holidays and OT banking

A database trigger auto-fills stat holidays with the day's expected hours and
locks them from editing. The same trigger validates that paid hours do not
exceed eight per day.

Overtime is banked via the `ot_hours` field. When a period is submitted, any
shortfall is covered by available OT bank and the remaining balance is reported
in `summary.ot_bank_remaining`.

## Leave approval workflow

Staff can request vacation leave by posting to
`/timesheets/:id/leave-requests`. Pending requests appear under the same path
and globally via `/api/leave/requests` for admins. Approving a request applies
vacation hours to that day and locks it from editing; rejection simply removes
the request.

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

- `GET /timesheets` – list pay periods for all staff (admin only).
- `GET /timesheets/mine` – list pay periods for the logged in staff member.
- `GET /timesheets/:id/days` – list daily entries for a timesheet.
- `PATCH /timesheets/:id/days/:date` – update hours for a day. Body accepts `regHours`, `otHours`, `statHours`, `sickHours`, `vacHours`, and optional `note`.
- `POST /timesheets/:id/submit` – submit a pay period.
- `POST /timesheets/:id/reject` – reject a submitted timesheet (admin only).
- `POST /timesheets/:id/process` – mark a timesheet as processed and exportable (admin only).
- `POST /timesheets/:id/leave-requests` – request vacation leave for a day.
- `GET /timesheets/:id/leave-requests` – list leave requests awaiting review.
- `POST /timesheets/leave-requests/:requestId/approve` – approve a leave request, applying vacation hours and locking the day.
- `GET /api/leave/requests` – list all leave requests (admin only).
- `POST /api/leave/requests` – submit a leave request for the logged in staff member.

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

Stat holidays are auto-filled with the day's expected hours and locked from editing. Days may also be locked when leave is approved.

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
- `timesheets.lock_stat_tooltip`
- `timesheets.lock_leave_tooltip`
- `timesheets.submit`
- `timesheets.reject`
- `timesheets.process`
- `timesheets.request_leave`
- `timesheets.review_leave`
- `timesheets.approve_leave`
- `timesheets.summary.totals`
- `timesheets.summary.expected`
- `timesheets.summary.shortfall`
- `timesheets.summary.ot_bank_remaining`
- `timesheets.add_row`
- `timesheets.remove_row`
- `timesheets.export_csv`
- `timesheets.payroll_export`
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
