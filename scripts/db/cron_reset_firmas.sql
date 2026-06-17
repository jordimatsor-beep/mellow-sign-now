-- Reset mensual de la cuota de firmas del plan GRATIS.
-- Los planes de pago se resetean en su ciclo real de Stripe
-- (invoice.payment_succeeded), no aquí (ver migración 20260612130000_pricing_plans.sql).
--
-- Se ejecuta el día 1 de cada mes a las 00:05 (hora del servidor / UTC).
--
-- Nota: se usan tags de dollar-quote distintos ($do$ / $job$) para evitar la
-- colisión de $$ anidados (el comando de cron.schedule lleva su propio cuerpo).

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'reset_firmas_mensuales'
  ) THEN
    PERFORM cron.schedule(
      'reset_firmas_mensuales',
      '5 0 1 * *',
      $job$ SELECT public.reset_firmas_mensuales(); $job$
    );
  END IF;
END
$do$;
