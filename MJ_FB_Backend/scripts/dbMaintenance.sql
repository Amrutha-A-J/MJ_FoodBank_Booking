-- Database maintenance tasks

-- Configure autovacuum thresholds
ALTER DATABASE mj_fb_db
  SET autovacuum_vacuum_scale_factor = 0.05,
      autovacuum_analyze_scale_factor = 0.05,
      autovacuum_vacuum_threshold = 50,
      autovacuum_analyze_threshold = 50;

-- Run a full VACUUM and ANALYZE
VACUUM (ANALYZE, VERBOSE);

-- Example REINDEX (use pg_repack for zero-downtime reindex)
-- REINDEX TABLE bookings;
