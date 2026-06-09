import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const N8N_WEBHOOK_URL = Deno.env.get('N8N_SUPPORT_WEBHOOK_URL') ?? '';

// In-memory rate limiter: max 20 requests per minute per user (mirrors clara-chat)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    // 0. CORS Preflight
    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

    if (!N8N_WEBHOOK_URL) {
        console.error("N8N_SUPPORT_WEBHOOK_URL not set");
        return new Response(
            JSON.stringify({ error: 'Servicio de IA de soporte no configurado' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // 2. Auth Check (Supabase)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Rate limiting: max 20 requests/minute per user
        if (!checkRateLimit(user.id)) {
            return new Response(
                JSON.stringify({ error: 'Demasiadas solicitudes. Espera un momento antes de continuar.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
            );
        }

        // 3. Parse Frontend Payload
        const body = await req.json()
        const { messages, documentId } = body

        // 4. Forward to n8n (Support Workflow)
        const n8nPayload = {
            userId: user.id,
            userEmail: user.email,
            messages: messages,
            documentId: documentId || null,
            timestamp: new Date().toISOString(),
            type: 'support_chat'
        }

        // n8n URL and user ID not logged

        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload)
        })

        if (!n8nResponse.ok) {
            const errText = await n8nResponse.text();
            console.error("n8n Support Error:", errText);
            throw new Error(`Error en el soporte inteligente (n8n status: ${n8nResponse.status})`);
        }

        let data;
        const responseText = await n8nResponse.text();

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.log("n8n returned non-JSON:", responseText);
            data = { content: responseText };
        }

        // 5. Return n8n Response to Frontend
        const responseContent = data.output || data.content || data.text || (typeof data === 'string' ? data : JSON.stringify(data));

        return new Response(
            JSON.stringify({ role: 'clara', content: responseContent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Support Chat Proxy Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Error processing request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
