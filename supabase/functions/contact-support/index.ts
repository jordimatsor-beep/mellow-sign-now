import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('Missing RESEND_API_KEY')
        }

        const { email, message, subject, user_email } = await req.json()

        // Email to Support Team
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'FirmaClara Support <noreply@firmaclara.es>',
                to: ['soporte@operiatech.es'],
                reply_to: email, // Allow replying directly to the user
                subject: `[Soporte] ${subject || 'Nueva consulta'} - ${user_email || email}`,
                html: `
          <h3>Nueva consulta de soporte</h3>
          <p><strong>Usuario:</strong> ${user_email || 'No registrado'} (${email})</p>
          <p><strong>Mensaje:</strong></p>
          <blockquote style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">
            ${message.replace(/\n/g, '<br>')}
          </blockquote>
        `
            })
        })

        const data = await res.json()

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
