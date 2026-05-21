-- Schedule Supabase cron to invoke the webhook retry worker every 5 minutes

CREATE EXTENSION IF NOT EXISTS cron;
CREATE EXTENSION IF NOT EXISTS supabase_functions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'process_webhook_retries'
  ) THEN
    PERFORM cron.schedule(
      'process_webhook_retries',
      '*/5 * * * *',
      $$
        SELECT supabase_functions.http_request('process-webhook-retries', 'POST');
      $$
    );
  END IF;
END
$$;
