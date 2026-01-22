/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
    'https://firmaclara.com',
    'http://localhost:8080',
    'http://localhost:3000'
];

serve(async (req: Request) => {
    // CORS Hardening
    const origin = req.headers.get('Origin');
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
    const corsHeaders = {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
        'Vary': 'Origin'
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
        const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

        if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
            throw new Error('Missing Stripe Environment Variables')
        }

        const signature = req.headers.get('Stripe-Signature')
        if (!signature) {
            return new Response('No signature', { status: 400, headers: corsHeaders })
        }

        const body = await req.text()

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            return new Response(`Webhook Error: ${message}`, { status: 400, headers: corsHeaders })
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { user_id, pack_id, credits } = session.metadata || {};

            if (user_id && pack_id && credits && session.payment_intent) {
                // Fulfill the order (Idempotent)
                const supabaseAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                // Try Insert. If conflict (duplicate payment_id), Ignore.
                const { error } = await supabaseAdmin.from('credit_packs').upsert({
                    user_id: user_id,
                    pack_type: pack_id,
                    credits_total: parseInt(credits),
                    credits_used: 0,
                    price_paid: session.amount_total ? session.amount_total / 100 : 0,
                    stripe_payment_id: session.payment_intent as string,
                    stripe_session_id: session.id,
                    purchased_at: new Date().toISOString()
                }, {
                    onConflict: 'stripe_payment_id', // Requires UNIQUE constraint
                    ignoreDuplicates: true
                })

                if (error) {
                    // Check if it's strictly a constraint error we didn't catch 
                    // (though ignoreDuplicates should handle it).
                    console.error('Error inserting credit pack:', error)
                    return new Response('Database Error', { status: 500, headers: corsHeaders })
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })

    } catch (error: unknown) {
        console.error('Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            {
                status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
    }
})
