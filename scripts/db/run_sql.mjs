/**
 * Ejecuta un fichero SQL contra la BD remota (Session pooler), reutilizando
 * SUPABASE_DB_URL de .env.local. USO:  node scripts/db/run_sql.mjs <ruta.sql>
 */
import { readFileSync, existsSync } from "node:fs";

function loadDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith("SUPABASE_DB_URL="));
    if (line) return line.slice("SUPABASE_DB_URL=".length).replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

function buildConfig(rawUrl) {
  const body = rawUrl.replace(/^postgres(?:ql)?:\/\//, "");
  const lastAt = body.lastIndexOf("@");
  const userinfo = body.slice(0, lastAt);
  const hostpart = body.slice(lastAt + 1);
  const fc = userinfo.indexOf(":");
  let user = fc === -1 ? userinfo : userinfo.slice(0, fc);
  const password = fc === -1 ? "" : userinfo.slice(fc + 1);
  const host = (hostpart.match(/^([^:/]+)/) || [])[1] || "";
  const ref = (host.match(/^db\.([a-z0-9]+)\.supabase\.co$/) || [])[1];
  let finalHost = host, finalPort = 5432;
  if (ref) {
    finalHost = process.env.SUPABASE_POOLER_HOST || "aws-1-eu-west-1.pooler.supabase.com";
    if (user === "postgres") user = `postgres.${ref}`;
  } else {
    finalPort = parseInt((hostpart.match(/:(\d+)/) || [])[1] || "5432", 10);
  }
  return { host: finalHost, port: finalPort, user, password, database: "postgres", ssl: { rejectUnauthorized: false } };
}

const file = process.argv[2];
if (!file) { console.error("Uso: node scripts/db/run_sql.mjs <ruta.sql>"); process.exit(1); }
const raw = loadDbUrl();
if (!raw) { console.error("✖ Falta SUPABASE_DB_URL en .env.local"); process.exit(1); }

const { default: pg } = await import("pg");
const client = new pg.Client(buildConfig(raw));
await client.connect();
console.log(`✓ Conectado. Ejecutando ${file}…`);
await client.query(readFileSync(file, "utf8"));
console.log("✓ SQL ejecutado.");
await client.end();
