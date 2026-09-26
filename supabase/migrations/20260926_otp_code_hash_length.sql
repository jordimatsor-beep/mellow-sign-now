-- OTP roto desde el 21/05/2026: la columna no admitía el hash con salt
--
-- `documents.otp_code_hash` quedó en producción como VARCHAR(64), suficiente
-- para un SHA-256 en hexadecimal (64 caracteres). El 21/05/2026 send-otp pasó
-- a guardar "salt:hash" (32 + 1 + 64 = 97 caracteres) para evitar rainbow
-- tables, y desde entonces CADA envío de OTP falla al guardarlo:
--
--   Database Error: value too long for type character varying(64)
--
-- El error ocurre antes de enviar el código y antes de registrar el intento,
-- así que el firmante solo veía "No se pudo enviar el código" y otp_logs
-- llevaba cinco meses sin una sola fila. Ningún documento con verificación
-- por SMS se ha podido firmar desde esa fecha.
--
-- TEXT en lugar de un VARCHAR mayor: en PostgreSQL no hay diferencia de
-- rendimiento y así el largo del hash nunca vuelve a ser un límite.
-- Ampliar el tipo no reescribe la tabla.

ALTER TABLE public.documents
  ALTER COLUMN otp_code_hash TYPE text;

COMMENT ON COLUMN public.documents.otp_code_hash IS
  'OTP hash as "salt:sha256" (97 chars) — legacy rows may hold a bare SHA-256 (64 chars); sign-complete-v2 accepts both.';
