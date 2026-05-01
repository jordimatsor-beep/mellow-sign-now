/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.10.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://esm.sh/zod@3.22.4"

// Validation Schema for checkout request
const CheckoutSchema = z.object({
    priceId: z.enum(['test', 'basic', 'pro', 'business']),
    returnUrl: z.string().url().optional()
});

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

const ALLOWED_RETURN_URLS = [
    'https://firmaclara.com',
    'https://firmaclara.es',
    'https://www.firmaclara.com',
    'https://www.firmaclara.es',
    'https://mellow-sign-now.lovable.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
];

serve(async (req) => {
    // CORS Hardening
    const origin = req.headers.get('Origin');
    const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
    const corsHeaders = {
        'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Vary': 'Origin'
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
        if (!STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY is not set')
        }

        const stripe = new Stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing Authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Validation
        const body = await req.json()
        const parseResult = CheckoutSchema.safeParse(body);

        if (!parseResult.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid pack or parameters', details: parseResult.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { priceId, returnUrl } = parseResult.data;

        // Fetch pack details from database
        const { data: pack, error: packError } = await supabaseClient
            .from('credit_packs')
            .select('*')
            .eq('slug', priceId)
            .single();

        if (packError || !pack) {
            console.error('Error fetching pack:', packError);
            return new Response(
                JSON.stringify({ error: 'Invalid pack selected' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!pack.is_active) {
            return new Response(
                JSON.stringify({ error: 'This pack is no longer available' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Return URL Security Check
        let finalReturnUrl = req.headers.get('origin');
        if (returnUrl) {
            const isReturnUrlAllowed = ALLOWED_RETURN_URLS.some(url => returnUrl.startsWith(url));
            if (!isReturnUrlAllowed) {
                return new Response(
                    JSON.stringify({ error: 'Invalid returnUrl domain' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
            finalReturnUrl = returnUrl;
        }

        // 3. Create Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur',
                        product_data: {
                            name: pack.name,
                            description: pack.description || `Recarga de ${pack.credits} créditos`,
                        },
                        unit_amount: pack.price, // Database uses cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${finalReturnUrl}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${finalReturnUrl}/credits?canceled=true`,
            metadata: {
                user_id: user.id,
                pack_id: priceId,
                credits: pack.credits.toString()
            }
        })

        // 4. Audit Logging
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Note: Using pack.price (which is amount in cents) for event_log
        await supabaseAdmin.from('event_logs').insert({
            user_id: user.id,
            event_type: 'checkout_started',
            event_data: {
                pack: priceId,
                amount: pack.price
            }
        })

        return new Response(
            JSON.stringify({ sessionId: session.id, url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        console.error('Error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
