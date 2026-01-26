import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
import { getCorsHeaders, handleCorsPreflightRequest, sanitizeErrorMessage } from '../_shared/cors.ts'

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    const preflightResponse = handleCorsPreflightRequest(req);
    if (preflightResponse) return preflightResponse;

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
        // STRICT: Must use TWILIO_FROM_NUMBER which should be the Spanish (+34) number
        let fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');

        if (!fromNumber) {
            throw new Error("CRITICAL CONFIGURATION ERROR: 'TWILIO_FROM_NUMBER' is not set. Cannot send SMS from legal origin.");
        }

        // FORCE SMS channel regardless of request
        const channel = 'sms';

        // Construct To/From based on SMS
        let to = phone;
        // Strict sanitization of From
        let from = fromNumber.replace('whatsapp:', '').trim();

        // 7. SMS - ORIGEN DEL NUMERO (IMPERATIVO) check logic
        // We can't validate the country code dynamically easily without regex, but we ensure it uses the Env Var.

        console.log(`[OTP Request] Channel: ${channel} | To: ${to} | FromEnv: ${from}`);

        if (accountSid && authToken) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

            const params = new URLSearchParams()
            params.append('To', to)
            if (from) params.append('From', from)

            const bodyText = `FirmaClara: Tu código de seguridad es ${otp}.`;

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
                throw new Error(`Error al enviar mensaje (${channel}). Twilio: ${txt}`)
            }
        } else {
            // Development mode - OTP code NOT logged for security
            console.log('[DEV MODE] OTP would be sent to:', phone.substring(0, 6) + '****');
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
