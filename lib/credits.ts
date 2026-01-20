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
    // 1. Find the oldest available pack (FIFO)
    // We need to fetch packs where credits_used < credits_total
    // Note: Supabase JS filter `.lt('credits_used', 'credits_total')` doesn't work directly comparing two columns easily in simple query.
    // We might need to fetch all active packs or use a stored procedure if performance is critical.
    // For now, simpler approach: fetch all non-fully-used packs for user.
    // Actually, we can't easily do "column A < column B" in standard Postgrest filter without RPC or raw, 
    // but we can fetch all and filter in app or rely on 'credits_used' being updated correctly.

    // Alternative: Use the RPC function `consume_credit` if we created it in schema.sql.
    // Checking schema.sql provided earlier... YES, `consume_credit` RPC exists!
    // It handles locking and logic atomically.

    try {
        const { data, error } = await supabase
            .rpc('consume_credit', { p_user_id: userId });

        if (error) {
            console.error('Error executing consume_credit RPC:', error);
            return { success: false, remaining: 0, message: error.message };
        }

        // RPC returns a table/row signature on setof... checking signature in schema.
        // RETURNS TABLE(success BOOLEAN, remaining INTEGER)
        // So data should be an array with 1 object or similar.

        // If RPC returned rows
        if (data && data.length > 0) {
            const result = data[0]; // { success: true, remaining: 5 }
            if (result.success) {
                return { success: true, remaining: result.remaining };
            }
        }

        // If we're here, it means success false or no data
        return { success: false, remaining: 0, message: 'No credits available' };

    } catch (e: any) {
        console.error('Exception in consumeCredit:', e);
        return { success: false, remaining: 0, message: e.message };
    }
}
