import { loadStripe } from '@stripe/stripe-js';
import { supabase } from "@/lib/supabase";
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
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
            body: { priceId, returnUrl: window.location.origin }
        });

        if (error) throw error;

        if (!data || !data.sessionId) {
            throw new Error("Invalid session data returned");
        }

        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result.error) {
            console.error(result.error.message);
            toast.error(result.error.message);
        }
    } catch (e: any) {
        console.error("Payment Error:", e);
        toast.error(e.message || "No se pudo conectar con la pasarela de pago.");
    }
}
