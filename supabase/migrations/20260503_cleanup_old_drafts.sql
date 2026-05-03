-- Cleanup function for orphaned drafts older than 30 days
-- Call manually or via a scheduled job: SELECT cleanup_old_drafts();

CREATE OR REPLACE FUNCTION public.cleanup_old_drafts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.documents
  WHERE status = 'draft'
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log the cleanup
  INSERT INTO public.event_logs (event_type, event_data)
  VALUES (
    'system.cleanup_drafts',
    jsonb_build_object('deleted_count', deleted_count, 'ran_at', NOW())
  );

  RETURN deleted_count;
END;
$$;

-- Grant exec only to service role
REVOKE ALL ON FUNCTION public.cleanup_old_drafts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_drafts() TO service_role;
