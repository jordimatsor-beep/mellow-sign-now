import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Simple CORS for debugging
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log("MOCK FUNCTION HIT");

  return new Response(
    JSON.stringify({
      success: true,
      message: "MOCK SUCCESS: Function is reachable. The crash is in the original business logic."
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  )
})
