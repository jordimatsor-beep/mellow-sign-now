import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// ME-01 · Test de aislamiento RLS entre usuarios.
//
// Intenta leer datos de un usuario con el JWT de OTRO usuario y exige resultado
// vacío (no un 403: Supabase RLS filtra filas, no lanza error). Cubre la
// preocupación del PRD sobre `GET /documents` sin `user_id=eq.{uid}` en la URL.
//
// Es OPT-IN: requiere dos usuarios reales confirmados. Sin credenciales en el
// entorno, todo el bloque se SALTA, de modo que `npm test` sigue en verde en CI
// sin secretos. Para ejecutarlo, crear un `.env.test.local` (no commitear) con:
//
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_PUBLISHABLE_KEY=...
//   RLS_TEST_USER_A_EMAIL / RLS_TEST_USER_A_PASSWORD
//   RLS_TEST_USER_B_EMAIL / RLS_TEST_USER_B_PASSWORD
//
//   npx vitest run src/test/rls-isolation.test.ts
// ─────────────────────────────────────────────────────────────────────────────

const env = (k: string): string | undefined =>
  (import.meta as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const URL = env("VITE_SUPABASE_URL");
const ANON = env("VITE_SUPABASE_PUBLISHABLE_KEY");
const A_EMAIL = env("RLS_TEST_USER_A_EMAIL");
const A_PASS = env("RLS_TEST_USER_A_PASSWORD");
const B_EMAIL = env("RLS_TEST_USER_B_EMAIL");
const B_PASS = env("RLS_TEST_USER_B_PASSWORD");

const configured = Boolean(URL && ANON && A_EMAIL && A_PASS && B_EMAIL && B_PASS);

// persistSession:false → cada cliente mantiene su sesión solo en memoria, así dos
// clientes pueden estar logueados como usuarios distintos sin pisarse.
function freshClient(): SupabaseClient {
  return createClient(URL as string, ANON as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const suite = configured ? describe : describe.skip;

suite("RLS · aislamiento entre usuarios (ME-01)", () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    clientA = freshClient();
    clientB = freshClient();

    const { data: a, error: ea } = await clientA.auth.signInWithPassword({
      email: A_EMAIL as string,
      password: A_PASS as string,
    });
    if (ea) throw ea;
    userAId = a.user!.id;

    const { data: b, error: eb } = await clientB.auth.signInWithPassword({
      email: B_EMAIL as string,
      password: B_PASS as string,
    });
    if (eb) throw eb;
    userBId = b.user!.id;

    expect(userAId).not.toBe(userBId);
  });

  it("documents: una lectura sin filtro solo devuelve filas del propio usuario", async () => {
    const { data, error } = await clientA.from("documents").select("id,user_id");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).every((r) => r.user_id === userAId)).toBe(true);
    expect((data ?? []).some((r) => r.user_id === userBId)).toBe(false);
  });

  it("documents: filtrar explícitamente por el id de B devuelve vacío para A", async () => {
    const { data, error } = await clientA
      .from("documents")
      .select("id")
      .eq("user_id", userBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("contacts: A no ve contactos de B", async () => {
    const { data, error } = await clientA.from("contacts").select("id,user_id");
    expect(error).toBeNull();
    expect((data ?? []).every((r) => r.user_id === userAId)).toBe(true);
  });

  it("credit_transactions: A no ve transacciones de B", async () => {
    const { data, error } = await clientA
      .from("credit_transactions")
      .select("id,user_id");
    expect(error).toBeNull();
    expect((data ?? []).every((r) => r.user_id === userAId)).toBe(true);
  });
});
