import { loadStripe } from '@stripe/stripe-js';

import { toast } from 'sonner';

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

export async function buyCredits(priceId: string) {
    if (!stripePromise) {
        console.warn("Stripe key is missing");
        toast.error("El sistema de pagos no está configurado (Falta Key de Stripe).");
        return;
    }

    const stripe = await stripePromise;
    if (!stripe) {
        toast.error("Error al inicializar sistema de pagos.");
        return;
    }

    try {
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId }),
        });

        if (!response.ok) {
            throw new Error('Error creating checkout session');
        }

        const session = await response.json();
        const result = await stripe.redirectToCheckout({ sessionId: session.id });
        if (result.error) {
            console.error(result.error.message);
            toast.error(result.error.message);
        }
    } catch (e) {
        console.error(e);
        toast.error("No se pudo conectar con la pasarela de pago.");
    }
}
