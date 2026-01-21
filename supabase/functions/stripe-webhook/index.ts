import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
        const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

        if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
            throw new Error('Missing Stripe Environment Variables')
        }

        const signature = req.headers.get('Stripe-Signature')
        if (!signature) {
            return new Response('No signature', { status: 400 })
        }

        const body = await req.text()

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
        } catch (err) {
            return new Response(`Webhook Error: ${err.message}`, { status: 400 })
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const { user_id, pack_id, credits } = session.metadata || {};

            if (user_id && pack_id && credits) {
                // Fulfill the order
                const supabaseAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )

                const { error } = await supabaseAdmin.from('credit_packs').insert({
                    user_id: user_id,
                    pack_type: pack_id, // assuming pack_id matches the enum or string used in table
                    credits_total: parseInt(credits),
                    credits_used: 0,
                    price_paid: session.amount_total ? session.amount_total / 100 : 0,
                    stripe_payment_id: session.payment_intent as string,
                    stripe_session_id: session.id,
                    purchased_at: new Date().toISOString()
                })

                if (error) {
                    console.error('Error inserting credit pack:', error)
                    return new Response('Database Error', { status: 500 })
                }
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
