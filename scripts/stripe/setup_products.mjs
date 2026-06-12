/**
 * FirmaClara · Alta de productos de Stripe para la política de precios
 * ------------------------------------------------------------------------
 * Crea (de forma IDEMPOTENTE) los productos y precios del nuevo modelo:
 *
 *   • FirmaClara Básico       → 9 €/mes  recurrente   (10 firmas/mes)
 *   • FirmaClara Profesional  → 19 €/mes recurrente   (50 firmas/mes + overage)
 *   • Pack FirmaClara 15      → 15 € pago único       (15 firmas, no caducan)
 *   • Overage FirmaClara      → 0,40 € por firma extra (se factura vía invoice items)
 *
 * Reutiliza precios ya existentes buscándolos por `lookup_key`, así que es
 * seguro ejecutarlo varias veces: no duplica nada.
 *
 * USO (PowerShell, Windows):
 *   1) npm i stripe          # dependencia solo para este script (puedes quitarla luego)
 *   2) $env:STRIPE_SECRET_KEY = "sk_live_o_sk_test_..."
 *   3) node scripts/stripe/setup_products.mjs
 *
 * USO (bash):
 *   STRIPE_SECRET_KEY=sk_... node scripts/stripe/setup_products.mjs
 *
 * También admite la clave por argumento:  node scripts/stripe/setup_products.mjs --key sk_...
 *
 * Al terminar imprime el bloque de variables de entorno listo para pegar.
 * ------------------------------------------------------------------------
 */

// --- Carga de la librería de Stripe (servidor) ---------------------------
let Stripe;
try {
  ({ default: Stripe } = await import('stripe'));
} catch {
  console.error(
    '\n✖ Falta la librería "stripe". Instálala solo para este script:\n' +
    '    npm i stripe\n' +
    '  (puedes desinstalarla después con: npm rm stripe)\n'
  );
  process.exit(1);
}

// --- Clave secreta -------------------------------------------------------
function readKey() {
  const argIdx = process.argv.indexOf('--key');
  if (argIdx !== -1 && process.argv[argIdx + 1]) return process.argv[argIdx + 1];
  return process.env.STRIPE_SECRET_KEY || '';
}

const secretKey = readKey();
if (!secretKey || !/^sk_(live|test)_/.test(secretKey)) {
  console.error(
    '\n✖ No se encontró una STRIPE_SECRET_KEY válida.\n' +
    '  PowerShell:  $env:STRIPE_SECRET_KEY = "sk_test_..."\n' +
    '  bash:        export STRIPE_SECRET_KEY=sk_test_...\n' +
    '  o pásala con --key sk_test_...\n'
  );
  process.exit(1);
}

const isLive = secretKey.startsWith('sk_live_');
const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' });

// --- Definición de los precios a garantizar ------------------------------
// `lookup_key` es la clave de idempotencia: si ya existe un precio con esa
// clave, lo reutilizamos en vez de crear uno nuevo.
const PRICES = [
  {
    envVar: 'STRIPE_PRICE_BASICO',
    productName: 'FirmaClara Básico',
    lookupKey: 'firmaclara_basico_mensual',
    unitAmount: 900, // 9,00 €
    currency: 'eur',
    recurring: { interval: 'month' },
    productMetadata: { plan_id: 'basico', firmas_mes: '10' },
  },
  {
    envVar: 'STRIPE_PRICE_PROFESIONAL',
    productName: 'FirmaClara Profesional',
    lookupKey: 'firmaclara_profesional_mensual',
    unitAmount: 1900, // 19,00 €
    currency: 'eur',
    recurring: { interval: 'month' },
    productMetadata: { plan_id: 'profesional', firmas_mes: '50' },
  },
  {
    envVar: 'STRIPE_PRICE_PACK',
    productName: 'Pack FirmaClara 15 firmas',
    lookupKey: 'firmaclara_pack15',
    unitAmount: 1500, // 15,00 €
    currency: 'eur',
    recurring: null, // pago único
    productMetadata: { plan_id: 'pack_puntual', firmas_creditos: '15' },
  },
  {
    envVar: 'STRIPE_PRICE_OVERAGE',
    productName: 'Overage FirmaClara (firma extra)',
    lookupKey: 'firmaclara_overage',
    unitAmount: 40, // 0,40 € por firma
    currency: 'eur',
    recurring: null,
    productMetadata: { plan_id: 'overage' },
  },
];

// --- Helpers -------------------------------------------------------------

/** Devuelve un precio existente por lookup_key, o null. */
async function findPriceByLookupKey(lookupKey) {
  const res = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return res.data[0] || null;
}

/** Busca un producto por nombre + metadata.plan_id (para reutilizarlo). */
async function findProduct(name, planId) {
  // Stripe no permite filtrar productos por metadata vía list, así que
  // recorremos los activos (suelen ser pocos) y comparamos.
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.metadata?.plan_id === planId || product.name === name) {
      return product;
    }
  }
  return null;
}

async function ensureProduct(name, metadata) {
  const existing = await findProduct(name, metadata.plan_id);
  if (existing) {
    // Mantén la metadata al día por si cambió.
    await stripe.products.update(existing.id, { name, metadata });
    return existing;
  }
  return stripe.products.create({ name, metadata });
}

async function ensurePrice(def) {
  const existing = await findPriceByLookupKey(def.lookupKey);
  if (existing) {
    return { price: existing, reused: true };
  }

  const product = await ensureProduct(def.productName, def.productMetadata);

  const params = {
    product: product.id,
    currency: def.currency,
    unit_amount: def.unitAmount,
    lookup_key: def.lookupKey,
    metadata: def.productMetadata,
    nickname: def.productName,
  };
  if (def.recurring) params.recurring = def.recurring;

  const price = await stripe.prices.create(params);
  return { price, reused: false };
}

// --- Ejecución -----------------------------------------------------------
console.log(`\n🔧 Configurando productos de Stripe en modo ${isLive ? 'LIVE ⚠️' : 'TEST'}…\n`);

const envOut = {};
for (const def of PRICES) {
  try {
    const { price, reused } = await ensurePrice(def);
    envOut[def.envVar] = price.id;
    const eur = (def.unitAmount / 100).toFixed(2);
    const cadence = def.recurring ? `${eur} €/${def.recurring.interval}` : `${eur} € único`;
    console.log(`  ${reused ? '↺ reutilizado' : '✓ creado    '}  ${def.productName.padEnd(36)} ${cadence.padStart(14)}  → ${price.id}`);
  } catch (err) {
    console.error(`  ✖ Error con ${def.productName}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n──────────────────────────────────────────────────────────────');
console.log('Pega estas variables en los Secrets de las Edge Functions de Supabase');
console.log('(Dashboard → Edge Functions → Manage secrets) y/o en tu .env de backend:');
console.log('──────────────────────────────────────────────────────────────\n');
for (const def of PRICES) {
  if (envOut[def.envVar]) console.log(`${def.envVar}=${envOut[def.envVar]}`);
}
console.log(`APP_URL=https://www.firmaclara.es`);

console.log('\nRecuerda además:');
console.log('  • Activar el Portal de Cliente de Stripe:');
console.log('      https://dashboard.stripe.com/' + (isLive ? '' : 'test/') + 'settings/billing/portal');
console.log('  • Registrar el webhook → función Edge "stripe-webhook" con los eventos:');
console.log('      checkout.session.completed, customer.subscription.updated,');
console.log('      customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed');
console.log('  • Configurar Smart Retries (3 intentos) en Settings → Billing → Subscriptions.\n');
