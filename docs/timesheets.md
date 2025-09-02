# Timesheets

Staff can record daily hours and submit pay periods.

## Setup

1. Run database migrations to create the `timesheets` tables:

```bash
cd MJ_FB_Backend
npm run migrate
```

2. Seed current pay periods for active staff (optional):

```bash
node src/utils/timesheetSeeder.ts
```

## API usage

- `GET /timesheets/mine` – list pay periods for the logged in staff member.
- `GET /timesheets/:id/days` – list daily entries for a timesheet.
- `PATCH /timesheets/:id/days/:date` – update hours for a day. Body accepts `regHours`, `otHours`, `statHours`, `sickHours`, `vacHours`, and optional `note`.
- `POST /timesheets/:id/submit` – submit a pay period.
- `POST /timesheets/:id/reject` – reject a submitted timesheet.
- `POST /timesheets/:id/process` – mark a timesheet as processed and exportable.
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
