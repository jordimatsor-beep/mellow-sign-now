import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ZERO DEPENDENCY TEST
// If this fails, the issue is infrastructure/config.
// If this works, the issue was one of the imports (pdf-lib likely).

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    return new Response(
        JSON.stringify({
            success: true,
            message: "BARE METAL SUCCESS",
            document_id: "debug-id",
            signed_at: new Date().toISOString()
        }),
        {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        }
    )
})
