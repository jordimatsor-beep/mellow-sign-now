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
        const { token, channel = 'whatsapp' } = body

        if (!token) throw new Error('Token is required')

        // 1. Get Document
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('id, signer_phone, security_level')
            .eq('sign_token', token)
            .single()

        if (docError || !doc) throw new Error('Documento no encontrado')
        // Allow SMS fallback even if security level says whatsapp_otp? Yes, it's just the channel.
        if (doc.security_level === 'standard') throw new Error('Este documento no requiere verificación por OTP')

        // Clean phone number (remove spaces, ensure + prefix if needed)
        if (!doc.signer_phone) throw new Error('El teléfono del firmante no está registrado')

        const phone = doc.signer_phone.replace(/[\s\-\(\)]/g, '')

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
                whatsapp_verification_status: 'sent' // We keep this name for legacy compatibility
            })
            .eq('id', doc.id)

        if (updateError) throw updateError

        // 5. Send Message (Twilio)
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        let fromNumber = Deno.env.get('TWILIO_FROM_NUMBER')
        // Fallbacks if env var behaves differently for SMS/WhatsApp
        if (channel === 'whatsapp' && !fromNumber) {
            fromNumber = 'whatsapp:+14155238886'; // Default sandbox only if missing
        }

        // Construct To/From based on channel
        let to = phone;
        let from = fromNumber;
        console.log(`[OTP Request] Channel: ${channel} | To: ${to} | FromEnv: ${fromNumber}`);

        if (channel === 'whatsapp') {
            if (!to.startsWith('whatsapp:')) to = `whatsapp:${to}`;
            if (from && !from.startsWith('whatsapp:')) from = `whatsapp:${from}`;
        } else {
            // SMS
            // Remove whatsapp: prefix if present in env var to reuse same number
            if (from && from.startsWith('whatsapp:')) from = from.replace('whatsapp:', '');
        }

        if (accountSid && authToken) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

            const params = new URLSearchParams()
            params.append('To', to)
            if (from) params.append('From', from)

            // Customize body slightly
            const bodyText = channel === 'whatsapp'
                ? `Tu código de verificación para la firma digital de Multicentros es: ${otp}. No lo compartas.`
                : `FirmaClara: Tu código de seguridad es ${otp}.`;

            params.append('Body', bodyText)

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
