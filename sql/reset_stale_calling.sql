-- =============================================================
-- Reset Stale "calling" Leads
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- =============================================================

-- 1. Create the function that resets stale calling leads
CREATE OR REPLACE FUNCTION reset_stale_calling()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE cs_leads
  SET status = 'no_answer',
      updated_at = now()
  WHERE status = 'calling'
    AND last_called_at < now() - interval '10 minutes';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 2. Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Schedule the job to run every 5 minutes
SELECT cron.schedule(
  'reset-stale-calling',       -- job name
  '*/5 * * * *',               -- every 5 minutes
  'SELECT reset_stale_calling()'
);

-- To verify the job is scheduled:
-- SELECT * FROM cron.job;

-- To remove the job later if needed:
-- SELECT cron.unschedule('reset-stale-calling');
