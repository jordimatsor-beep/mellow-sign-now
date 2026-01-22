import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://esm.sh/zod@3.22.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MessageSchema = z.object({
    role: z.enum(["clara", "user", "model", "assistant"]),
    content: z.string().min(1).max(2000),
    id: z.string().optional()
});

const RequestSchema = z.object({
    messages: z.array(MessageSchema).min(1).max(20)
});

const N8N_WEBHOOK_URL = "https://automatiajordi.app.n8n.cloud/webhook/f6ae1f5f-ee36-4a5b-92e7-e8eb0157b099";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth & Supabase Client
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            console.error('Auth Error:', userError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: userError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 2. Validation
        const body = await req.json();
        const parseResult = RequestSchema.safeParse(body);

        if (!parseResult.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid request format', details: parseResult.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { messages } = parseResult.data;

        // Get last user message
        const lastUserMessage = messages[messages.length - 1];
        if (!lastUserMessage || lastUserMessage.role !== 'user') {
            return new Response(JSON.stringify({ role: 'clara', content: '???' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. Call n8n Webhook
        console.log("Forwarding to n8n:", lastUserMessage.content);

        // Ensure we handle potential Fetch errors
        let n8nResponse;
        try {
            n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatInput: lastUserMessage.content,
                    sessionId: user.id
                })
            });
        } catch (fetchError) {
            console.error("n8n Fetch Error:", fetchError);
            throw new Error("Failed to connect to AI service (n8n).");
        }

        if (!n8nResponse.ok) {
            throw new Error(`n8n Error: ${n8nResponse.status} ${n8nResponse.statusText}`);
        }

        const rawText = await n8nResponse.text();
        console.log("n8n Raw Response:", rawText);

        let responseText = "";
        let n8nData;

        try {
            n8nData = JSON.parse(rawText);
            // Handle various n8n response formats
            if (Array.isArray(n8nData) && n8nData.length > 0 && n8nData[0].output) {
                responseText = n8nData[0].output;
            } else if (n8nData.output) {
                responseText = n8nData.output;
            } else if (n8nData.text) {
                responseText = n8nData.text;
            } else if (typeof n8nData === 'string') {
                responseText = n8nData;
            } else {
                // Return the raw JSON structure for debugging if we can't find the text
                responseText = "Debug (JSON structure): " + JSON.stringify(n8nData).substring(0, 500);
            }
        } catch (e) {
            // Response is likely plain text
            responseText = rawText;
        }

        if (!responseText || !responseText.trim()) {
            responseText = "Error: Recibida respuesta vacía de n8n.";
        }

        // 4. Audit Logging (Optional)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        try {
            await supabaseAdmin.from('event_logs').insert({
                user_id: user.id,
                event_type: 'ai_chat_completion_n8n',
                event_data: {
                    prompt_length: lastUserMessage.content.length,
                    response_length: responseText.length,
                    n8n_status: n8nResponse.status
                }
            })
        } catch (logErr) {
            console.error("Logging error:", logErr);
        }

        return new Response(
            JSON.stringify({ role: 'clara', content: responseText }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
