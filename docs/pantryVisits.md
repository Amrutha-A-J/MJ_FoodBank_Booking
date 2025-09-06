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
- `pantry_visits.duplicate_strategy`
- `pantry_visits.skip`
- `pantry_visits.update`
- `pantry_visits.sheet_date`
- `pantry_visits.sheet_rows`
- `pantry_visits.sheet_errors`

## Bulk import format

Pantry visits support bulk importing from an `.xlsx` spreadsheet. Include a header row and use the following column order:

1. Date (`YYYY-MM-DD`)
2. Client ID
3. Weight With Cart
4. Weight Without Cart
5. Adults
6. Children
7. Pet Item (`0` or `1`)
8. Note (optional)

Save the file as `.xlsx` and upload it using the **Import Visits** button on the Pantry Visits page. Use **Dry-run** to preview sheets and choose how to handle duplicates before finalizing the import.
