import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
  }

  console.log("STD SERVE STUB HIT");

  return new Response(
    JSON.stringify({ success: true, message: "STD SERVE SUCCESS: The runtime supports this legacy import." }),
    { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
  )
})
