/**
 * FirmaClara · Anuncio del nuevo modelo de precios a usuarios existentes (PRD §8.4)
 * ------------------------------------------------------------------------
 * Mensaje clave: los créditos actuales NO se pierden.
 *
 * SEGURIDAD: por defecto NO envía (dry-run). Solo envía con --confirm.
 *
 * USO (PowerShell):
 *   $env:SUPABASE_URL = "https://<project-ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "..."
 *   $env:RESEND_API_KEY = "re_..."
 *
 *   node scripts/send_pricing_announcement.mjs --test tu@email.com   # 1 correo de prueba
 *   node scripts/send_pricing_announcement.mjs                       # dry-run (cuenta)
 *   node scripts/send_pricing_announcement.mjs --confirm             # envío real
 *   node scripts/send_pricing_announcement.mjs --confirm --limit 50  # primeros 50
 * ------------------------------------------------------------------------
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync, writeFileSync } from "node:fs";

// Node no carga .env.local solo (a diferencia de Vite). Lo leemos nosotros.
function fromEnvLocal(key) {
  if (process.env[key]) return process.env[key];
  if (existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(key + "="));
    if (line) return line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

const SUPABASE_URL = fromEnvLocal("SUPABASE_URL");
const SERVICE_KEY = fromEnvLocal("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_DB_URL = fromEnvLocal("SUPABASE_DB_URL");
const RESEND_API_KEY = fromEnvLocal("RESEND_API_KEY");
const FROM = "FirmaClara <noreply@firmaclara.es>";
const SUBJECT = "Cambiamos cómo funcionan los créditos en FirmaClara (y no pierdes nada)";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const resetLedger = args.includes("--reset-ledger");
const testIdx = args.indexOf("--test");
const testEmail = testIdx !== -1 ? args[testIdx + 1] : null;
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

// Registro local anti-duplicados: guarda a quién ya se le envió, para que
// reejecutar --confirm NO vuelva a mandar el correo a los mismos.
const LEDGER_PATH = "scripts/.announcement_sent.json";
function loadSent() {
  if (resetLedger || !existsSync(LEDGER_PATH)) return new Set();
  try { return new Set(JSON.parse(readFileSync(LEDGER_PATH, "utf8")).map((e) => e.toLowerCase())); }
  catch { return new Set(); }
}
function saveSent(set) {
  writeFileSync(LEDGER_PATH, JSON.stringify([...set], null, 0));
}

function escapeHtml(t) {
  return String(t || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])
  );
}

function buildHtml(nombre) {
  const name = escapeHtml(nombre || "");
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.5;">
<div style="width:100%;background:#f3f4f6;padding:40px 0;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">
<div style="padding:30px 40px;text-align:center;border-bottom:1px solid #f3f4f6;"><span style="font-size:24px;font-weight:800;color:#111827;letter-spacing:-.5px;">Firma<span style="color:#2563eb;">Clara</span></span></div>
<div style="padding:40px;">
<h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;">Cambiamos cómo funcionan los créditos</h1>
<p style="margin:0 0 16px;color:#4b5563;font-size:16px;">Hola <strong>${name}</strong>,</p>
<p style="margin:0 0 16px;color:#4b5563;font-size:16px;">Hasta ahora FirmaClara funcionaba con créditos de pago único. A partir de ahora tienes <strong>planes mensuales más claros</strong> y, si lo prefieres, packs sueltos cuando los necesites.</p>
<div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;margin:20px 0;border-radius:4px;"><p style="margin:0;color:#065f46;font-weight:600;">Tus créditos actuales no se pierden.</p><p style="margin:8px 0 0;color:#047857;">Siguen en tu cuenta como saldo y se gastan antes que nada.</p></div>
<table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 24px;">
<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Gratis</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">0 € · 2 firmas/mes</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Básico</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">9 €/mes · 10 firmas/mes</td></tr>
<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Profesional</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">19 €/mes · 50 firmas/mes</td></tr>
<tr><td style="padding:8px 0;color:#111827;"><strong>Pack puntual</strong></td><td style="padding:8px 0;text-align:right;color:#4b5563;">15 € · 15 firmas (no caducan)</td></tr>
</table>
<p style="margin:0 0 24px;color:#4b5563;font-size:16px;">No tienes que hacer nada: si no quieres cambiar, sigues en el plan <strong>Gratis con 2 firmas al mes</strong>, sin coste.</p>
<div style="text-align:center;margin:8px 0;"><a href="https://www.firmaclara.es/precios" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Ver los planes</a></div>
</div>
<div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;"><p style="font-size:12px;color:#9ca3af;margin:0;">&copy; 2026 FirmaClara · Si tienes dudas, responde a este correo.</p></div>
</div></div></body></html>`;
}

async function sendEmail(to, nombre) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject: SUBJECT, html: buildHtml(nombre) }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Lista los usuarios (email, name). Usa la service key si está; si no, cae a
// la conexión directa SUPABASE_DB_URL (Session pooler).
async function listUsers() {
  if (SUPABASE_URL && SERVICE_KEY) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let q = supabase.from("users").select("email, name").not("email", "is", null);
    if (limit) q = q.limit(limit);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  }
  if (SUPABASE_DB_URL) {
    const { default: pg } = await import("pg");
    const body = SUPABASE_DB_URL.replace(/^postgres(?:ql)?:\/\//, "");
    const lastAt = body.lastIndexOf("@");
    const ui = body.slice(0, lastAt), hp = body.slice(lastAt + 1);
    const fc = ui.indexOf(":");
    let user = ui.slice(0, fc); const password = ui.slice(fc + 1);
    const host = (hp.match(/^([^:/]+)/) || [])[1];
    const ref = (host.match(/^db\.([a-z0-9]+)\.supabase\.co$/) || [])[1];
    let h = host, p = 5432;
    if (ref) { h = "aws-1-eu-west-1.pooler.supabase.com"; if (user === "postgres") user = `postgres.${ref}`; }
    else { p = parseInt((hp.match(/:(\d+)/) || [])[1] || "5432", 10); }
    const c = new pg.Client({ host: h, port: p, user, password, database: "postgres", ssl: { rejectUnauthorized: false } });
    await c.connect();
    const r = await c.query(`SELECT email, name FROM public.users WHERE email IS NOT NULL${limit ? ` LIMIT ${parseInt(limit, 10)}` : ""}`);
    await c.end();
    return r.rows;
  }
  throw new Error("Faltan credenciales: define SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_URL en .env.local");
}

async function main() {
  if (!RESEND_API_KEY) {
    console.error("✖ Falta RESEND_API_KEY.");
    process.exit(1);
  }

  // Modo prueba: un único correo.
  if (testEmail) {
    console.log(`✉  Enviando correo de PRUEBA a ${testEmail}…`);
    await sendEmail(testEmail, "Jordi");
    console.log("✓ Enviado. Revisa tu bandeja.");
    return;
  }

  const users = await listUsers();
  const sent = loadSent();
  if (resetLedger) console.log("↺ Registro anti-duplicados reiniciado (--reset-ledger).");

  // Deduplica destinatarios por email y omite los que ya recibieron el correo.
  const seen = new Set();
  const recipients = (users || []).filter((u) => {
    const e = (u.email || "").toLowerCase();
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
  const pendientes = recipients.filter((u) => !sent.has(u.email.toLowerCase()));

  console.log(`Destinatarios únicos: ${recipients.length} · Ya enviados antes: ${recipients.length - pendientes.length} · Pendientes: ${pendientes.length}`);

  if (!confirm) {
    console.log("\n⚠  DRY-RUN: no se ha enviado nada. Añade --confirm para enviar de verdad.");
    if (pendientes.length) console.log("   Muestra pendientes:", pendientes.slice(0, 3).map((u) => u.email).join(", "));
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const u of pendientes) {
    try {
      await sendEmail(u.email, u.name);
      sent.add(u.email.toLowerCase());
      saveSent(sent); // persiste tras cada envío: si se corta, no reenvía a los ya hechos
      ok++;
      if (ok % 25 === 0) console.log(`  …${ok} enviados`);
    } catch (e) {
      fail++;
      console.error(`  ✖ ${u.email}: ${e.message}`);
    }
    await sleep(120); // respeta el rate limit de Resend (~10/s)
  }
  console.log(`\n✓ Hecho. Enviados ahora: ${ok} · Fallos: ${fail} · Omitidos (ya enviados): ${recipients.length - pendientes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
