import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// --- INLINED CORS LOGIC ---
const ALLOWED_ORIGINS = [
    'https://firmaclara.com',
    'https://firmaclara.es',
    'https://www.firmaclara.com',
    'https://www.firmaclara.es',
    'https://mellow-sign-now.lovable.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
];

function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('Origin');
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

    return {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Vary': 'Origin',
    };
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Parse body
        let body;
        try {
            body = await req.json()
        } catch (e) {
            throw new Error('Invalid JSON body');
        }

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

        if (updateError) throw new Error('Database Error: ' + updateError.message)

        // 5. Send Message (Twilio)
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
        let fromNumber = Deno.env.get('TWILIO_FROM_NUMBER') || Deno.env.get('TWILIO_PHONE_NUMBER');

        if (!fromNumber) {
            console.error("Missing/Invalid TWILIO_FROM_NUMBER");
            throw new Error("Configuration Error: Missing Twilio Number");
        }

        const channel = 'sms';
        let to = phone;
        let from = fromNumber.replace('whatsapp:', '').trim();

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
                throw new Error(`Error al enviar mensaje SMS: ${txt.substring(0, 100)}`)
            }
        } else {
            console.log('[DEV MODE] OTP would be sent to:', phone.substring(0, 6) + '****', 'Code:', otp);
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Código enviado correctamente' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error("Send-OTP Error:", error)
        const message = error instanceof Error ? error.message : 'Error desconocido';
        return new Response(
            JSON.stringify({
                success: false,
                error: message,
                details: JSON.stringify(error)
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
