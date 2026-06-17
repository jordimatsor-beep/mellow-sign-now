/**
 * Aplica la migración del modelo de precios a la BD remota de forma controlada.
 * Equivale a pegar el SQL en el SQL Editor, pero con verificación de saldos
 * antes/después. La migración es idempotente y transaccional (BEGIN/COMMIT).
 *
 * Requiere la cadena de conexión (Session pooler) en SUPABASE_DB_URL.
 * Léela de .env.local automáticamente si está ahí.
 *
 * USO:
 *   node scripts/db/apply_pricing_migration.mjs            # dry-run (solo pre-check)
 *   node scripts/db/apply_pricing_migration.mjs --apply    # aplica la migración
 */

import { readFileSync, existsSync } from "node:fs";

// Carga SUPABASE_DB_URL desde .env.local si no está en el entorno.
function loadDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("SUPABASE_DB_URL="));
    if (line) return line.slice("SUPABASE_DB_URL=".length).replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

// Construye la config de conexión de forma robusta frente a contraseñas con
// caracteres especiales (parsea sin depender de codificación de URL) y fuerza
// el Session pooler IPv4 (la conexión directa db.<ref>.supabase.co es IPv6).
function buildConfig(rawUrl) {
  const body = rawUrl.replace(/^postgres(?:ql)?:\/\//, "");
  const lastAt = body.lastIndexOf("@");
  if (lastAt === -1) throw new Error("SUPABASE_DB_URL sin '@' (formato inválido)");
  const userinfo = body.slice(0, lastAt);
  const hostpart = body.slice(lastAt + 1); // host:port/db
  const firstColon = userinfo.indexOf(":");
  let user = firstColon === -1 ? userinfo : userinfo.slice(0, firstColon);
  const password = firstColon === -1 ? "" : userinfo.slice(firstColon + 1);

  const hostMatch = hostpart.match(/^([^:/]+)/);
  const host = hostMatch ? hostMatch[1] : "";
  const refMatch = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);

  let finalHost = host;
  let finalPort = 5432;
  if (refMatch) {
    const ref = refMatch[1];
    finalHost = process.env.SUPABASE_POOLER_HOST || "aws-1-eu-west-1.pooler.supabase.com";
    if (user === "postgres") user = `postgres.${ref}`;
    console.log(`ℹ Usando Session pooler: ${finalHost} (usuario ${user})`);
  } else {
    const portMatch = hostpart.match(/:(\d+)/);
    if (portMatch) finalPort = parseInt(portMatch[1], 10);
    console.log(`ℹ Usando host: ${finalHost}:${finalPort} (usuario ${user})`);
  }

  return { host: finalHost, port: finalPort, user, password, database: "postgres", ssl: { rejectUnauthorized: false } };
}

const RAW_URL = loadDbUrl();
const APPLY = process.argv.includes("--apply");
const MIGRATION_PATH = "supabase/migrations/20260612130000_pricing_plans.sql";

if (!RAW_URL) {
  console.error(
    "\n✖ Falta SUPABASE_DB_URL.\n" +
    "  Dashboard → Connect → 'Session pooler' (URI), con tu contraseña, en .env.local:\n" +
    "    SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres\n"
  );
  process.exit(1);
}

const CONFIG = buildConfig(RAW_URL);

let pg;
try {
  ({ default: pg } = await import("pg"));
} catch {
  console.error('✖ Falta "pg". Instálalo: npm i pg --no-save');
  process.exit(1);
}

const client = new pg.Client(CONFIG);

async function scalar(sql) {
  const r = await client.query(sql);
  return r.rows[0] ? Object.values(r.rows[0])[0] : null;
}

async function main() {
  await client.connect();
  console.log("✓ Conectado a la BD remota.\n");

  console.log("── PRE-CHECK ──────────────────────────────────────────");
  const usuarios = await scalar("SELECT count(*) FROM public.users");
  const saldoFifo = await scalar(
    "SELECT COALESCE(SUM(GREATEST(credits_total - credits_used,0)),0) FROM public.user_credit_purchases WHERE (expires_at IS NULL OR expires_at > now())"
  );
  const yaMigrada = await scalar(
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firmas_creditos')"
  );
  console.log(`  Usuarios:                      ${usuarios}`);
  console.log(`  Saldo FIFO vigente (créditos): ${saldoFifo}`);
  console.log(`  ¿Columnas de plan ya existen?: ${yaMigrada}`);

  if (!APPLY) {
    console.log("\n⚠  DRY-RUN. No se ha aplicado nada. Añade --apply para ejecutar la migración.");
    await client.end();
    return;
  }

  console.log("\n── APLICANDO MIGRACIÓN ────────────────────────────────");
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  await client.query(sql); // el fichero trae su propio BEGIN/COMMIT
  console.log("  ✓ Migración ejecutada.");

  console.log("\n── POST-CHECK ─────────────────────────────────────────");
  const saldoCreditos = await scalar("SELECT COALESCE(SUM(firmas_creditos),0) FROM public.users");
  const enGratis = await scalar("SELECT count(*) FROM public.users WHERE plan_id='gratis'");
  const funcOk = await scalar(
    "SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname='consumir_firma')"
  );
  console.log(`  Saldo migrado a firmas_creditos: ${saldoCreditos}  (antes FIFO: ${saldoFifo})`);
  console.log(`  Usuarios en plan Gratis:         ${enGratis}`);
  console.log(`  ¿Existe consumir_firma?:         ${funcOk}`);
  console.log(
    saldoCreditos == saldoFifo
      ? "\n✓ Saldos cuadran. Migración correcta."
      : "\n⚠ Revisa: el saldo migrado no coincide exactamente con el FIFO previo (puede deberse a créditos caducados; revísalo)."
  );

  await client.end();
}

main().catch(async (e) => {
  console.error("\n✖ Error:", e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});
