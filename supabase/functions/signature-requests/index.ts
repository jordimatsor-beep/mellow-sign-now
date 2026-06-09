/**
 * Edge Function: signature-requests
 * Public REST endpoint consumed by external API clients (e.g. Nexo).
 *
 * POST /signature-requests
 *   Auth: Authorization: Bearer <api_key>
 *   Body: { signer_email, signer_name, document_url, metadata? }
 *   Returns: { signature_request_id, signing_url }
 *
 * GET /signature-requests/:id
 *   Auth: Authorization: Bearer <api_key>
 *   Returns: { signature_request_id, status, signed_at?, signed_document_url? }
 *
 * Security model (2026-06-09):
 *  - Each api_client MUST be linked to a FirmaClara user (api_clients.user_id).
 *    Documents are created under that user and consume 1 credit per request
 *    via the service-role RPC consume_credit_for_user().
 *  - GET only returns documents created by the SAME api_client (ownership).
 *  - document_url restricted to https.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateApiKey } from "../_shared/webhook-dispatch.ts";

const ALLOWED_ORIGINS = [
  "https://nexoconecta.es",
  "https://www.nexoconecta.es",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const client = await validateApiKey(apiKey);
    if (!client) {
      return json(req, 401, { error: "Unauthorized" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The api_client must be linked to a FirmaClara account that owns credits.
    const { data: clientRow, error: clientErr } = await supabase
      .from("api_clients")
      .select("id, name, user_id")
      .eq("id", client.id)
      .single();

    if (clientErr || !clientRow) {
      return json(req, 401, { error: "Unauthorized" });
    }

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const resourceId = parts[parts.length - 1] !== "signature-requests" ? parts[parts.length - 1] : null;

    // ── GET /signature-requests/:id ───────────────────────────────────────
    if (req.method === "GET" && resourceId) {
      if (!UUID_RE.test(resourceId)) {
        return json(req, 404, { error: "Not found" });
      }

      // Ownership: only documents created by THIS api_client are visible.
      const { data: doc, error } = await supabase
        .from("documents")
        .select("id, status, signed_at, signed_file_url")
        .eq("id", resourceId)
        .eq("api_client_id", clientRow.id)
        .single();

      if (error || !doc) {
        return json(req, 404, { error: "Not found" });
      }

      const statusMap: Record<string, string> = {
        signed: "signed",
        expired: "expired",
        cancelled: "declined",
      };

      // signed_file_url stores a storage path — convert to a temporary signed URL.
      let signedDocumentUrl: string | undefined;
      if (doc.status === "signed" && doc.signed_file_url) {
        let path = doc.signed_file_url as string;
        if (path.includes("/documents/")) {
          path = decodeURIComponent(path.split("/documents/")[1].split("?")[0]);
        }
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(path, 3600);
        signedDocumentUrl = signed?.signedUrl ?? undefined;
      }

      return json(req, 200, {
        signature_request_id: doc.id,
        status: statusMap[doc.status] ?? "pending",
        signed_at: doc.signed_at ?? undefined,
        signed_document_url: signedDocumentUrl,
      });
    }

    // ── POST /signature-requests ──────────────────────────────────────────
    if (req.method === "POST") {
      if (!clientRow.user_id) {
        // Misconfigured integration: no account linked → no credits to consume.
        console.error(`api_client '${clientRow.name}' has no linked user_id`);
        return json(req, 503, {
          error: "Integración no configurada: contacta con FirmaClara para activar tu cuenta de créditos",
        });
      }

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return json(req, 400, { error: "Invalid JSON body" });
      }

      const signer_email = typeof body.signer_email === "string" ? body.signer_email.trim() : "";
      const signer_name = typeof body.signer_name === "string" ? body.signer_name.trim() : "";
      const document_url = typeof body.document_url === "string" ? body.document_url.trim() : null;
      const metadata = (body.metadata ?? {}) as Record<string, unknown>;

      if (!signer_email || !signer_name) {
        return json(req, 400, { error: "signer_email y signer_name son obligatorios" });
      }
      if (!EMAIL_RE.test(signer_email) || signer_email.length > 320) {
        return json(req, 400, { error: "signer_email no es válido" });
      }
      if (signer_name.length > 200) {
        return json(req, 400, { error: "signer_name demasiado largo" });
      }
      if (document_url) {
        try {
          const parsed = new URL(document_url);
          if (parsed.protocol !== "https:") {
            return json(req, 400, { error: "document_url debe ser https" });
          }
        } catch {
          return json(req, 400, { error: "document_url no es una URL válida" });
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const title = typeof metadata.title === "string" && metadata.title.trim()
        ? metadata.title.trim().slice(0, 200)
        : `Documento — ${signer_name}`;

      // 1. Create the document under the linked user.
      const { data: doc, error: insertErr } = await supabase
        .from("documents")
        .insert({
          user_id: clientRow.user_id,
          api_client_id: clientRow.id,
          title,
          signer_email,
          signer_name,
          file_url: document_url,
          status: "sent",
          sign_token: crypto.randomUUID(),
          // Annex page keeps the historical API behaviour; integrations can
          // be migrated to positioned signatures when they send coordinates.
          signature_page: 0,
          expires_at: expiresAt.toISOString(),
        })
        .select("id, sign_token")
        .single();

      if (insertErr || !doc) {
        console.error("Insert error:", insertErr);
        return json(req, 500, { error: "Error al crear la solicitud de firma" });
      }

      // 2. Consume 1 credit from the linked account. If it fails, roll back the doc.
      const { error: creditErr } = await supabase.rpc("consume_credit_for_user", {
        p_user_id: clientRow.user_id,
        p_description: `Solicitud de firma vía API (${clientRow.name})`,
      });

      if (creditErr) {
        await supabase.from("documents").delete().eq("id", doc.id);
        const insufficient = creditErr.message?.includes("Insufficient credits");
        console.error("Credit error:", creditErr.message);
        return json(req, insufficient ? 402 : 500, {
          error: insufficient
            ? "Créditos insuficientes en la cuenta vinculada"
            : "Error al procesar la solicitud de firma",
        });
      }

      const appUrl = Deno.env.get("APP_URL") ?? "https://firmaclara.es";
      const signingUrl = `${appUrl}/sign/${doc.sign_token}`;

      return json(req, 201, {
        signature_request_id: doc.id,
        signing_url: signingUrl,
      });
    }

    return json(req, 405, { error: "Method not allowed" });
  } catch (err) {
    console.error("signature-requests error:", err);
    return json(req, 500, { error: "Internal server error" });
  }
});
