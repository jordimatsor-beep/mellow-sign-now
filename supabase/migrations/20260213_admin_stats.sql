-- ============================================================
-- MIGRATION: Admin Dashboard Statistics
-- Date: 2026-02-13
-- Purpose: Aggregate business metrics (Revenue, Usage, Charts)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats(p_period text DEFAULT '30d')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_prev_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ := NOW();
    
    -- Current Period Metrics
    v_revenue NUMERIC := 0;
    v_active_users INTEGER := 0;
    v_credits_sold INTEGER := 0;
    v_docs_signed INTEGER := 0;
    
    -- Previous Period Metrics (for growth calc)
    v_prev_revenue NUMERIC := 0;
    v_revenue_growth NUMERIC := 0;

    -- Chart Data
    v_chart_data JSONB;
    v_top_customers JSONB;
BEGIN
    -- 1. Determine Time Range
    CASE p_period
        WHEN 'today' THEN
            v_start_date := DATE_TRUNC('day', NOW());
            v_prev_start_date := v_start_date - INTERVAL '1 day';
        WHEN 'year' THEN
            v_start_date := DATE_TRUNC('year', NOW());
            v_prev_start_date := v_start_date - INTERVAL '1 year';
        ELSE -- Default '30d'
            v_start_date := NOW() - INTERVAL '30 days';
            v_prev_start_date := v_start_date - INTERVAL '30 days';
    END CASE;

    -- 2. Calculate Revenue & Growth
    -- Current Revenue
    SELECT COALESCE(SUM(price_paid), 0), COALESCE(SUM(credits_total), 0)
    INTO v_revenue, v_credits_sold
    FROM user_credit_purchases
    WHERE created_at >= v_start_date AND created_at <= v_end_date;

    -- Previous Revenue
    SELECT COALESCE(SUM(price_paid), 0)
    INTO v_prev_revenue
    FROM user_credit_purchases
    WHERE created_at >= v_prev_start_date AND created_at < v_start_date;

    -- Growth Calculation
    IF v_prev_revenue > 0 THEN
        v_revenue_growth := ROUND(((v_revenue - v_prev_revenue) / v_prev_revenue) * 100, 1);
    ELSE
        v_revenue_growth := 0; -- No growth if prev was 0
    END IF;

    -- 3. Active Users (Users who logged an event in period)
    SELECT COUNT(DISTINCT user_id)
    INTO v_active_users
    FROM event_logs
    WHERE created_at >= v_start_date AND created_at <= v_end_date;

    -- 4. Documents Signed
    SELECT COUNT(*)
    INTO v_docs_signed
    FROM documents
    WHERE status = 'signed' AND signed_at >= v_start_date AND signed_at <= v_end_date;

    -- 5. Chart Data (Daily aggregation for period)
    -- Group by day/month depending on period size
    WITH time_series AS (
        SELECT 
            date_trunc(CASE WHEN p_period = 'today' THEN 'hour' ELSE 'day' END, series) as date
        FROM generate_series(v_start_date, v_end_date, CASE WHEN p_period = 'today' THEN '1 hour'::interval ELSE '1 day'::interval END) as series
    ),
    revenue_data AS (
        SELECT 
            date_trunc(CASE WHEN p_period = 'today' THEN 'hour' ELSE 'day' END, created_at) as date,
            SUM(price_paid) as revenue,
            SUM(credits_total) as credits
        FROM user_credit_purchases
        WHERE created_at >= v_start_date
        GROUP BY 1
    )
    SELECT jsonb_agg(jsonb_build_object(
        'date', ts.date,
        'revenue', COALESCE(rd.revenue, 0),
        'credits', COALESCE(rd.credits, 0)
    ))
    INTO v_chart_data
    FROM time_series ts
    LEFT JOIN revenue_data rd ON ts.date = rd.date
    ORDER BY ts.date;

    -- 6. Top Customers (By spend in period)
    SELECT jsonb_agg(t)
    INTO v_top_customers
    FROM (
        SELECT 
            u.email,
            u.company_name,
            SUM(p.price_paid) as total_spend,
            SUM(p.credits_total) as total_credits
        FROM user_credit_purchases p
        JOIN users u ON p.user_id = u.id
        WHERE p.created_at >= v_start_date
        GROUP BY u.id, u.email, u.company_name
        ORDER BY total_spend DESC
        LIMIT 5
    ) t;

    -- 7. Return Result
    RETURN jsonb_build_object(
        'revenue', v_revenue,
        'revenue_growth', v_revenue_growth,
        'active_users', v_active_users,
        'credits_sold', v_credits_sold,
        'docs_signed', v_docs_signed,
        'chart_data', COALESCE(v_chart_data, '[]'::jsonb),
        'top_customers', COALESCE(v_top_customers, '[]'::jsonb)
    );
END;
$$;

-- Grant access (Internal admin only via RLS/App Logic check, but function is public for auth users)
-- Frontend must ensure only admins call this.
GRANT EXECUTE ON FUNCTION public.get_admin_stats(text) TO authenticated;
