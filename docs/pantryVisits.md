# Pantry visits

## Localization

Add the following translation strings to locale files:

- `adults_label`
- `children_label`
- `sunshine_bag_label`
- `sunshine_bag_weight_label`
- `pantry_visits.summary.sunshine_bag_weight`
- `pantry_visits.summary.adults`
- `pantry_visits.summary.children`
- `pantry_visits.import_visits`
- `pantry_visits.import`
- `pantry_visits.import_success`
- `pantry_visits.import_error`
- `pantry_visits.dry_run`
- `pantry_visits.sheet_date`
- `pantry_visits.sheet_rows`
- `pantry_visits.sheet_errors`

## Bulk import format
 
Pantry visits support bulk importing from an `.xlsx` spreadsheet. Upload the file via `POST /client-visits/import` (also available at `/visits/import`). Each sheet represents visits for a single day and must be named using the visit date in `YYYY-MM-DD` format. Because the sheet name holds the date, rows omit a `date` column.

Include a header row on every sheet and use the following column order:

1. Client ID
2. Weight With Cart
3. Weight Without Cart
4. Adults
5. Children
6. Pet Item (`0` or `1`)
7. Note (optional)

### Duplicate handling

If a visit already exists for the same client on a given date, the importer overwrites it with the new data.

### Dry run

Append `dryRun=true` to validate the spreadsheet and preview counts without creating any visits. After reviewing the response, rerun the request without `dryRun` to perform the import.

Save the file as `.xlsx` and upload it using the **Import Visits** button on the Pantry Visits page. Use **Dry-run** to preview sheets before finalizing the import.
