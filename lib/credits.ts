import { supabase } from './supabase';

export interface CreditResult {
    success: boolean;
    remaining: number;
    message?: string;
}

/**
 * Gets the total available credits for a user.
 */
export async function getAvailableCredits(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('credit_packs')
        .select('credits_total, credits_used')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching credits:', error);
        return 0;
    }

    // Sum (total - used) for all packs
    return data.reduce((acc, pack) => acc + (pack.credits_total - pack.credits_used), 0);
}

/**
 * Consumes one credit for the user using FIFO strategy.
 * Deducts from the oldest pack that has credits remaining.
 */
export async function consumeCredit(userId: string): Promise<CreditResult> {
    try {
        // userId is handled securely by the RPC via auth.uid()
        // we just need to pass the amount
        const { error } = await supabase
            .rpc('consume_credit', { amount: 1 });

        if (error) {
            console.error('Error executing consume_credit RPC:', error);
            // Check for specific error messages
            if (error.message.includes('Insufficient credits')) {
                return { success: false, remaining: 0, message: 'No tienes suficientes créditos' };
            }
            return { success: false, remaining: 0, message: error.message };
        }

        // If no error, it was successful.
        // We can fetch the remaining credits to display
        const remaining = await getAvailableCredits(userId);
        return { success: true, remaining };

    } catch (e: any) {
        console.error('Exception in consumeCredit:', e);
        return { success: false, remaining: 0, message: e.message };
    }
}
