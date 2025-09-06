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
- `pantry_visits.bulk_import`
- `pantry_visits.bulk_import_success`
- `pantry_visits.bulk_import_error`

## Bulk import format
 
Pantry visits support bulk importing from an `.xlsx` spreadsheet. Each sheet represents visits for a single day and must be named using the visit date in `YYYY-MM-DD` format. Because the sheet name holds the date, rows omit a `date` column.

Include a header row on every sheet and use the following column order:

1. Client ID
2. Weight With Cart
3. Weight Without Cart
4. Adults
5. Children
6. Pet Item (`0` or `1`)
7. Note (optional)

### Duplicate handling

The importer checks for an existing visit for the same client on a given date. Control how duplicates are processed with the `duplicateStrategy` query parameter:

- `skip` (default) – keep the existing visit and ignore the row.
- `overwrite` – replace the existing visit with the new data.

### Dry run

Append `dryRun=true` to validate the spreadsheet and preview counts without creating any visits. After reviewing the response, rerun the request without `dryRun` to perform the import.

Save the file as `.xlsx` and upload it using the **Bulk Import** button on the Pantry Visits page.
