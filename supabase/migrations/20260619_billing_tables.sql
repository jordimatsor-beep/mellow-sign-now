-- ============================================================
-- 2026-06-19 · Sistema de facturación: billing_profiles e invoices
-- PRD §3.1 y §3.2
-- ============================================================

BEGIN;

-- ── billing_profiles: datos fiscales del cliente para Holded ──────────
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razon_social      TEXT NOT NULL,
  nif_cif           TEXT NOT NULL,
  direccion_fiscal  TEXT NOT NULL,
  ciudad            TEXT NOT NULL,
  codigo_postal     TEXT NOT NULL,
  pais              TEXT NOT NULL DEFAULT 'ES',
  -- Calculado al guardar: 'IVA_ES' (península+Baleares) | 'IGIC_IC' (Canarias) | 'EXENTO_EU'
  regimen_fiscal    TEXT NOT NULL DEFAULT 'IVA_ES'
    CHECK (regimen_fiscal IN ('IVA_ES', 'IGIC_IC', 'EXENTO_EU')),
  email_facturacion TEXT,         -- NULL = usar email de la cuenta
  holded_contact_id TEXT,         -- Rellenado tras crear/encontrar contacto en Holded
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_profiles_user ON public.billing_profiles(user_id);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own billing profile" ON public.billing_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "User manages own billing profile" ON public.billing_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own billing profile" ON public.billing_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access billing_profiles" ON public.billing_profiles
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_billing_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_profile_updated_at();

-- ── invoices: registro de facturas Holded (idempotencia via UNIQUE) ───
CREATE TABLE IF NOT EXISTS public.invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id),
  -- UNIQUE garantiza idempotencia: si el webhook llega dos veces falla el INSERT
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  holded_invoice_id        TEXT,
  numero_fc                TEXT,
  concepto                 TEXT NOT NULL,
  base_imponible           NUMERIC(10,2) NOT NULL,
  regimen_fiscal           TEXT NOT NULL,
  iva_pct                  NUMERIC(5,2) NOT NULL,
  importe_impuesto         NUMERIC(10,2) NOT NULL,
  total                    NUMERIC(10,2) NOT NULL,
  product_type             TEXT NOT NULL,
  holded_status            TEXT DEFAULT 'pending'
    CHECK (holded_status IN ('pending', 'created', 'sent', 'error')),
  error_detail             TEXT,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user       ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_pi  ON public.invoices(stripe_payment_intent_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sees own invoices" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access invoices" ON public.invoices
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMIT;
