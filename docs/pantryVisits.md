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

Pantry visits support bulk importing from an `.xlsx` spreadsheet. Include a header row and use the following column order:

1. Date (`YYYY-MM-DD`)
2. Client ID
3. Weight With Cart
4. Weight Without Cart
5. Adults
6. Children
7. Pet Item (`0` or `1`)
8. Note (optional)

Save the file as `.xlsx` and upload it using the **Bulk Import** button on the Pantry Visits page.
