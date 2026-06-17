/**
 * Configura el webhook y el Portal de Cliente de Stripe vía API.
 *  - Webhook: asegura que el endpoint de stripe-webhook escucha los 5 eventos.
 *  - Portal: crea/actualiza la configuración por defecto (cambiar plan, cancelar,
 *    método de pago, historial).
 *
 * Lee STRIPE_SECRET_KEY de .env.local. USO:  node scripts/stripe/configure_stripe.mjs
 */
import { readFileSync, existsSync } from "node:fs";

function fromEnvLocal(key) {
  if (process.env[key]) return process.env[key];
  if (existsSync(".env.local")) {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(key + "="));
    if (line) return line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

const SECRET = fromEnvLocal("STRIPE_SECRET_KEY");
if (!/^sk_(live|test)_/.test(SECRET)) {
  console.error("✖ STRIPE_SECRET_KEY no encontrada en .env.local");
  process.exit(1);
}

let Stripe;
try { ({ default: Stripe } = await import("stripe")); }
catch { console.error('✖ Falta "stripe": npm i stripe --no-save'); process.exit(1); }

const stripe = new Stripe(SECRET, { apiVersion: "2024-04-10" });

const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || "https://<project-ref>.supabase.co/functions/v1/stripe-webhook";
const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];
const PRICE_BASICO = "price_1ThRAQRyJKXUcMC9qatjlrdv";
const PRICE_PROFESIONAL = "price_1ThRAQRyJKXUcMC9iXeJ7vNN";

// ── Webhook ─────────────────────────────────────────────────────────────
async function configureWebhook() {
  console.log("── Webhook ──────────────────────────────────────────");
  const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.find((e) => (e.url || "").includes("/stripe-webhook"));

  if (existing) {
    const merged = Array.from(new Set([...(existing.enabled_events || []), ...EVENTS]))
      .filter((e) => e !== "*"); // si tenía '*', lo dejamos explícito
    const finalEvents = (existing.enabled_events || []).includes("*") ? existing.enabled_events : merged;
    await stripe.webhookEndpoints.update(existing.id, { enabled_events: finalEvents, disabled: false });
    console.log(`  ↺ Endpoint existente actualizado: ${existing.id}`);
    console.log(`     URL: ${existing.url}`);
    console.log(`     Eventos: ${finalEvents.join(", ")}`);
    console.log("  ✓ El signing secret NO cambia (no hay que tocar STRIPE_WEBHOOK_SECRET).");
    return { created: false };
  }

  const created = await stripe.webhookEndpoints.create({ url: WEBHOOK_URL, enabled_events: EVENTS });
  console.log(`  ✓ Endpoint creado: ${created.id}`);
  console.log(`     URL: ${created.url}`);
  console.log("\n  ⚠ NUEVO signing secret — hay que fijarlo como secret de Supabase:");
  console.log(`     STRIPE_WEBHOOK_SECRET=${created.secret}`);
  return { created: true, secret: created.secret };
}

// ── Portal de Cliente ───────────────────────────────────────────────────
async function configurePortal() {
  console.log("\n── Portal de Cliente ────────────────────────────────");
  const [pB, pP] = await Promise.all([
    stripe.prices.retrieve(PRICE_BASICO),
    stripe.prices.retrieve(PRICE_PROFESIONAL),
  ]);

  const features = {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "name", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end" },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ["price"],
      proration_behavior: "create_prorations",
      products: [
        { product: pB.product, prices: [PRICE_BASICO] },
        { product: pP.product, prices: [PRICE_PROFESIONAL] },
      ],
    },
  };
  const business_profile = {
    headline: "Gestiona tu suscripción de FirmaClara",
    privacy_policy_url: "https://www.firmaclara.es/privacy",
    terms_of_service_url: "https://www.firmaclara.es/terms",
  };

  const { data: configs } = await stripe.billingPortal.configurations.list({ limit: 100, active: true });
  const def = configs.find((c) => c.is_default) || configs[0];

  if (def) {
    const updated = await stripe.billingPortal.configurations.update(def.id, { features, business_profile });
    console.log(`  ↺ Configuración actualizada: ${updated.id} (default: ${updated.is_default})`);
  } else {
    const createdCfg = await stripe.billingPortal.configurations.create({ features, business_profile });
    console.log(`  ✓ Configuración creada: ${createdCfg.id} (default: ${createdCfg.is_default})`);
    if (!createdCfg.is_default) {
      console.log("  ⚠ No quedó como default. Actívala 1 vez en el dashboard (Settings → Billing → Customer portal).");
    }
  }
  console.log("  ✓ Portal listo: cambiar plan (Básico↔Profesional), cancelar, método de pago, historial.");
}

async function main() {
  const wh = await configureWebhook();
  await configurePortal();
  console.log("\n✓ Configuración de Stripe completada.");
  if (wh.created) {
    console.log("\n⚠ ACCIÓN: fija el STRIPE_WEBHOOK_SECRET mostrado arriba como secret de Supabase.");
  }
}

main().catch((e) => { console.error("\n✖ Error:", e.message); process.exit(1); });
