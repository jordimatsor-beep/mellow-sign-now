import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

export const redirectToCheckout = async (priceId: string, userEmail: string) => {
    const stripe = await stripePromise;
    if (!stripe) throw new Error("Stripe failed to initialize");

    const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        successUrl: `${window.location.origin}/credits?success=true`,
        cancelUrl: `${window.location.origin}/credits?canceled=true`,
        customerEmail: userEmail,
    });

    if (error) {
        console.error("Stripe checkout error:", error);
        throw error;
    }
};
