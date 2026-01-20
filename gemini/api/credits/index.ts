import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAvailableCredits } from '../../lib/credits';
import { supabase } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Mock Authentication for now (Get user from headers or query if token not ready)
    // Real implementation: verify JWT from header
    // const token = req.headers.authorization?.split(' ')[1];
    // const { data: { user }, error } = await supabase.auth.getUser(token);

    // For this step, assuming we pass userId in query for testing or stick to the specific user we've been using implicitly.
    // Or simpler: Require 'user_id' in query param.
    const { user_id } = req.query;
    const userId = Array.isArray(user_id) ? user_id[0] : user_id;

    // Default mock user if not provided (for quick testing)
    const effectiveUserId = userId || '00000000-0000-0000-0000-000000000000';

    if (!effectiveUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const credits = await getAvailableCredits(effectiveUserId);
        return res.status(200).json({ credits });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch credits' });
    }
}
