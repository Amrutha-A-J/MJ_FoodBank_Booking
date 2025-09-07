# Data Retention

Expired password setup tokens and client email verification records are automatically removed. A nightly job deletes any rows whose `expires_at` is more than 10 days in the past, keeping these tables compact without affecting active tokens.
