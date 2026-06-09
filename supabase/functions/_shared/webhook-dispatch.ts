import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Dispatches a signed webhook to all active api_clients that have a webhook_url.
 *
 * The `payload` object becomes the entire JSON body — callers must shape it
 * to match whatever the receiver expects (e.g. Nexo expects flat fields).
 *
 * Signature: HMAC-SHA256 of the raw JSON body, sent as the hex digest in
 * the X-FirmaClara-Signature header (no prefix — Nexo verifies it directly).
 */
export async function dispatchWebhook(
  payload: Record<string, unknown>,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: clients } = await supabase
    .from("api_clients")
    .select("id, name, webhook_url, webhook_secret")
    .eq("active", true)
    .not("webhook_url", "is", null);

  if (!clients?.length) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    clients.map(async (client) => {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(client.webhook_secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
      const signature = Array.from(new Uint8Array(sigBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const res = await fetch(client.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FirmaClara-Signature": signature,   // plain hex, no sha256= prefix
          "X-FirmaClara-Event": String(payload.event ?? ""),
        },
        body,
      });

      if (!res.ok) {
        console.error(`[webhook-dispatch] ${client.name} → ${res.status}`);
      } else {
        await supabase
          .from("api_clients")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", client.id);
      }
    }),
  );
}

/**
 * Validates an incoming X-API-Key header against the api_clients table.
 * Returns the client row or null if not found / inactive.
 */
export async function validateApiKey(apiKey: string | null): Promise<{ id: string; name: string } | null> {
  if (!apiKey) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey));
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data } = await supabase
    .from("api_clients")
    .select("id, name")
    .eq("api_key_hash", hash)
    .eq("active", true)
    .single();

  return data ?? null;
}
