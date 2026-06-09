-- ============================================================
-- Alta / rotación de un cliente API (ej. Nexo) — NO COMMITEAR CON VALORES REALES
--
-- Uso:
--   1. Genera una API key nueva:        openssl rand -hex 32   -> fc_live_<hex>
--   2. Genera un webhook secret nuevo:  openssl rand -hex 32
--   3. Sustituye los placeholders y ejecuta en el SQL Editor de Supabase.
--   4. Entrega la API key RAW al integrador por canal seguro. En BD solo
--      se guarda su SHA-256.
--   5. Vincula el user_id de la cuenta FirmaClara cuyos créditos se
--      consumirán con cada solicitud (obligatorio para POST).
-- ============================================================

INSERT INTO api_clients (name, api_key_hash, webhook_url, webhook_secret, user_id, active)
VALUES (
  'nexo',
  encode(digest('PEGAR_AQUI_API_KEY_RAW', 'sha256'), 'hex'),
  'https://nexoconecta.es/api/webhooks/firmaclara',
  'PEGAR_AQUI_WEBHOOK_SECRET',
  (SELECT id FROM users WHERE email = 'PEGAR_EMAIL_CUENTA_CREDITOS'),
  TRUE
)
ON CONFLICT (name) DO UPDATE
  SET api_key_hash   = EXCLUDED.api_key_hash,
      webhook_secret = EXCLUDED.webhook_secret,
      webhook_url    = EXCLUDED.webhook_url,
      user_id        = EXCLUDED.user_id,
      active         = TRUE;

-- Verificación (no muestra secretos):
SELECT name, active, user_id IS NOT NULL AS linked, last_used_at FROM api_clients;
