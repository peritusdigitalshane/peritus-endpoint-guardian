-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule cleanup-old-data to run daily at 03:00 UTC
SELECT cron.schedule(
  'daily-cleanup-old-data',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://njdcyjxgtckgtzgzoctw.supabase.co/functions/v1/cleanup-old-data',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZGN5anhndGNrZ3R6Z3pvY3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDc0NzgsImV4cCI6MjA4NDU4MzQ3OH0.Dgzlv9Wk_Mxb8I8OYttjspVimEGSWswBnWBFhlt-jBw"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
