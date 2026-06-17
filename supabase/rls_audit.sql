-- ============================================================================
-- FirmaClara · Script de verificación de Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- Ejecutar en Supabase Dashboard → SQL Editor con el rol por defecto (postgres).
-- Es solo de LECTURA: no modifica nada. Acompaña a supabase/rls_audit.md.
--
-- Uso: ejecutar cada bloque y contrastar el resultado con el checklist del .md.
-- ============================================================================

-- 1) ¿Está RLS habilitado en todas las tablas de public?
--    rowsecurity DEBE ser true en toda tabla con datos de usuario.
SELECT
  c.relname              AS tabla,
  c.relrowsecurity       AS rls_habilitada,
  c.relforcerowsecurity  AS rls_forzada
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname;  -- las que estén en false salen primero

-- 2) Inventario completo de políticas por tabla.
SELECT
  tablename,
  policyname,
  cmd                        AS operacion,   -- SELECT / INSERT / UPDATE / DELETE / ALL
  roles,
  qual                       AS using_expr,  -- condición de lectura/visibilidad
  with_check                 AS check_expr   -- condición de escritura
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- 3) Tablas SIN ninguna política (con RLS activo = acceso totalmente bloqueado;
--    con RLS inactivo = acceso totalmente abierto). Revisar ambos casos.
SELECT c.relname AS tabla, c.relrowsecurity AS rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY c.relname;

-- 4) Políticas que conceden lectura a anon / public sin filtrar por usuario.
--    Cualquier fila aquí merece justificación (catálogo público) o corrección.
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('SELECT', 'ALL')
  AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
ORDER BY tablename;

-- 5) HALLAZGO ESPECÍFICO — credit_packs.
--    Confirmar qué esquema está vivo (packs del usuario vs catálogo público) y
--    si existe la política "Allow public read access to active packs".
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'credit_packs'
ORDER BY ordinal_position;

SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'credit_packs';

-- Si credit_packs tiene 'user_id' (packs del usuario) Y alguna política de
-- lectura pública/anon, ES UNA FUGA: cualquiera podría leer el saldo y los
-- pagos de todos los usuarios. Debe quedar solo "auth.uid() = user_id".

-- 6) Políticas en Storage (bucket 'documents'). El firmante NO autenticado debe
--    poder leer el PDF por su URL, así que una lectura pública del bucket es
--    esperada — pero conviene confirmar que la escritura sí está restringida.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY cmd, policyname;
