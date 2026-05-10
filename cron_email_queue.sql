-- ============================================
-- PG_CRON SETUP FOR EMAIL QUEUE PROCESSING
-- ============================================

-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to service_role
GRANT USAGE ON SCHEMA cron TO service_role;

-- Schedule email queue processing every 2 minutes
-- This will call the process-email-queue edge function
SELECT cron.schedule(
  'process-email-queue',
  '*/2 * * * *',  -- Every 2 minutes
  $$
  SELECT
    net.http_post(
      url := (SELECT 'https://' || split_part(current_setting('app.settings.supabase_url'), 'https://', 2) || '/functions/v1/process-email-queue'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('trigger', 'cron')
    ) as request_id;
  $$
);

-- Alternative: If you prefer to call the function directly via pg_net
-- (uncomment if the above doesn't work in your Supabase setup)

-- SELECT cron.schedule(
--   'process-email-queue-direct',
--   '*/2 * * * *',
--   'SELECT net.http_post(url := ''YOUR_SUPABASE_URL/functions/v1/process-email-queue'', headers := ''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb) as request_id;'
-- );

-- View scheduled jobs
-- SELECT * FROM cron.job;

-- View job run history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Unschedule if needed
-- SELECT cron.unschedule('process-email-queue');