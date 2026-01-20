import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

// Map pack types to credit amounts (Hardcoded source of truth or fetch from DB types)
const PACK_CREDITS: Record<string, number> = {
    'basic': 10,
    'professional': 30,
    'business': 100
    // 'trial' usually handled internally via onboarding, not stripe
};

const PACK_PRICES: Record<string, number> = {
    'basic': 12.00,
    'professional': 29.00,
    'business': 69.00
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // In a real implementation:
        // 1. Verify Stripe signature header using raw body
        // const sig = req.headers['stripe-signature'];
        // const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

        // For this phase, we assume the body is the event JSON directly (Mock/Test mode)
        const event = req.body;

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // Extract metadata
            // Metadata must be passed during checkout session creation
            const userId = session.metadata?.userId;
            const packType = session.metadata?.packType;

            if (!userId || !packType) {
                console.error('Missing userId or packType in metadata');
                return res.status(400).json({ error: 'Invalid metadata' });
            }

            const creditsToAdd = PACK_CREDITS[packType];
            if (!creditsToAdd) {
                return res.status(400).json({ error: 'Invalid pack type' });
            }

            // Insert new Credit Pack
            const { error } = await supabase
                .from('credit_packs')
                .insert({
                    user_id: userId,
                    pack_type: packType,
                    credits_total: creditsToAdd,
                    credits_used: 0,
                    price_paid: PACK_PRICES[packType] || 0,
                    stripe_payment_id: session.payment_intent || session.id,
                    stripe_session_id: session.id,
                    // purchased_at defaults to NOW()
                });

            if (error) {
                console.error('Failed to insert credit pack:', error);
                return res.status(500).json({ error: 'Database insert failed' });
            }

            // Log event (Optional)
            await supabase.from('event_logs').insert({
                user_id: userId,
                event_type: 'credits.purchased',
                event_data: { packType, amount: creditsToAdd, price: PACK_PRICES[packType] }
            });

            return res.status(200).json({ received: true });
        }

        // Handle other events or just acknowledge
        return res.status(200).json({ received: true });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
