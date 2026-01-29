import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

// Security: Read webhook URL from environment instead of hardcoding
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') || ''

serve(async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    // 0. Check if n8n webhook is configured
    if (!N8N_WEBHOOK_URL) {
        console.error("N8N_WEBHOOK_URL environment variable not set");
        return new Response(
            JSON.stringify({ error: 'Servicio de IA no configurado' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // 1. CORS Preflight
    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

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

        // 3. Parse Frontend Payload
        const body = await req.json()
        const { messages, documentId } = body

        // 4. Forward to n8n
        // We inject the user_id so n8n knows who is talking (for memory/context)
        const n8nPayload = {
            userId: user.id,
            userEmail: user.email,
            messages: messages, // Full history or last message, n8n handles it
            documentId: documentId || null,
            timestamp: new Date().toISOString()
        }

        console.log("Forwarding to n8n:", N8N_WEBHOOK_URL, "User:", user.id);

        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload)
        })

        if (!n8nResponse.ok) {
            const errText = await n8nResponse.text();
            console.error("n8n Error:", errText);
            throw new Error(`Error en el asistente inteligente (n8n status: ${n8nResponse.status})`);
        }

        let data;
        const responseText = await n8nResponse.text();

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // response was not JSON (e.g. "Workflow got started")
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
        console.error('Clara Chat Proxy Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Error processing request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
