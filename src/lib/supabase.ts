import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Env Variables: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

// Ensure we always export a client, even if keys are missing (to prevent null access errors)
// If keys are missing, auth calls will fail with a clear API error instead of crashing the UI
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
