# Pantry visits

## Localization

Add the following translation strings to locale files:

- `adults_label`
- `children_label`
- `sunshine_bag_label`
- `sunshine_bag_weight_label`
- `sunshine_bag_clients_label`
- `pantry_visits.summary.sunshine_bag_weight`
- `pantry_visits.summary.adults`
- `pantry_visits.summary.children`

## Visit limits

Staff can record only one visit per client per day. Attempts to add a second visit for the same client and date are rejected as duplicates.

## Anonymous visits

Anonymous visits display `(ANONYMOUS)` after the client ID in the Pantry Visits table, and their adults and children counts are excluded from summary totals.

## UI

The selected date appears above the quick stats summary as `Summary of {date}`, and the visit table numbers each row sequentially starting at 1 instead of repeating the date for every entry.

