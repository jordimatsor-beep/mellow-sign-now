import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse body
        const body = await req.json()
        const { token } = body

        if (!token) throw new Error('Token is required')

        // 1. Get Document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('id, signer_phone, security_level')
            .eq('sign_token', token)
            .single()

        if (docError || !doc) throw new Error('Documento no encontrado')
        if (doc.security_level === 'standard') throw new Error('Este documento no requiere verificación por WhatsApp')

        // Clean phone number (remove spaces, ensure + prefix if needed)
        // Assuming signer_phone might come in various formats, rigorous cleaning needed for Twilio
        // For now, strip non-digits and ensure + if missing? 
        // Just minimal cleanup: remove spaces/dashes.
        if (!doc.signer_phone) throw new Error('El teléfono del firmante no está registrado')

        const phone = doc.signer_phone.replace(/[\s\-\(\)]/g, '')
        // Assuming intl format is provided or defaulting to +34? Let's leave as is for now but prepend whatsapp:

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        // 3. Hash OTP
        const msgUint8 = new TextEncoder().encode(otp);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const otpHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 4. Update DB
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

        const { error: updateError } = await supabase
            .from('documents')
            .update({
                otp_code_hash: otpHash,
                otp_expires_at: expiresAt.toISOString(),
                whatsapp_verification_status: 'sent'
            })
            .eq('id', doc.id)

        if (updateError) throw updateError

        // 5. Send WhatsApp
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || 'whatsapp:+14155238886'

        if (accountSid && authToken) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

            const params = new URLSearchParams()
            params.append('To', `whatsapp:${phone}`)
            params.append('From', fromNumber)
            params.append('Body', `Tu código de verificación para la firma digital de Multicentros es: ${otp}. No lo compartas.`)

            const res = await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            })

            if (!res.ok) {
                const txt = await res.text()
                console.error('Twilio Error:', txt)
                throw new Error('Error al enviar mensaje de WhatsApp. Verifica el número.')
            }
        } else {
            console.log('---------------------------------------------------')
            console.log(`[MOCK WhatsApp] To: ${phone} | Code: ${otp}`)
            console.log('---------------------------------------------------')
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Código enviado correctamente' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
